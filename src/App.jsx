import { useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatMessage from "./components/ChatMessage";
import InputBar from "./components/InputBar";
import {
  listConversations,
  createConversation,
  getConversation,
  deleteConversation,
  streamChat,
} from "./lib/api";

const SUGGESTIONS = [
  "Explain how tool-calling works in this agent",
  "What's 18% of 462, and why?",
  "What's today's date and day of the week?",
  "Write a haiku about relays and signals",
];

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]); // {role, content, hops?}
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  // Load the conversation list on first mount.
  useEffect(() => {
    (async () => {
      try {
        const list = await listConversations();
        setConversations(list);
      } catch (err) {
        setError("Could not reach the backend. Is Django running on :8000?");
      } finally {
        setConversationsLoading(false);
      }
    })();
  }, []);

  // Load messages whenever the active conversation changes.
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    (async () => {
      try {
        const convo = await getConversation(activeId);
        setMessages(convo.messages.map((m) => ({ role: m.role, content: m.content })));
      } catch {
        setError("Could not load that conversation.");
      }
    })();
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming]);

  async function refreshConversationList() {
    try {
      const list = await listConversations();
      setConversations(list);
    } catch {
      // non-fatal — sidebar just won't reorder/rename until next refresh
    }
  }

  async function handleNew() {
    try {
      const convo = await createConversation("New chat");
      setConversations((prev) => [convo, ...prev]);
      setActiveId(convo.id);
      setMessages([]);
      setInput("");
      setError(null);
    } catch {
      setError("Could not start a new chat.");
    }
  }

  async function handleDelete(id) {
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === activeId) {
        setActiveId(null);
        setMessages([]);
      }
    } catch {
      setError("Could not delete that conversation.");
    }
  }

  async function handleSend(overrideText) {
    const text = (overrideText ?? input).trim();
    if (!text || isStreaming) return;

    setInput("");
    setError(null);

    let conversationId = activeId;
    if (!conversationId) {
      try {
        const convo = await createConversation(text.slice(0, 42));
        conversationId = convo.id;
        setActiveId(convo.id);
        setConversations((prev) => [convo, ...prev]);
      } catch {
        setError("Could not start a new chat.");
        return;
      }
    }

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "", hops: [] },
    ]);
    const assistantIndex = messages.length + 1; // index within the array we just built

    setIsStreaming(true);
    let accumulated = "";

    await streamChat(conversationId, text, {
      onToolCall: ({ name }) => {
        setMessages((prev) => {
          const next = [...prev];
          const last = { ...next[next.length - 1] };
          last.hops = [...(last.hops || []), { name, status: "running" }];
          next[next.length - 1] = last;
          return next;
        });
      },
      onToolResult: ({ name }) => {
        setMessages((prev) => {
          const next = [...prev];
          const last = { ...next[next.length - 1] };
          const hops = [...(last.hops || [])];
          const idx = hops.map((h) => h.name).lastIndexOf(name);
          if (idx !== -1) hops[idx] = { ...hops[idx], status: "done" };
          last.hops = hops;
          next[next.length - 1] = last;
          return next;
        });
      },
      onToken: (token) => {
        accumulated += token;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], content: accumulated };
          return next;
        });
      },
      onError: (message) => {
        setError(message);
        setIsStreaming(false);
      },
      onDone: () => {
        setIsStreaming(false);
        refreshConversationList();
      },
    });

    setIsStreaming(false);
  }

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNew}
        onDelete={handleDelete}
        loading={conversationsLoading}
      />

      <main className="chat-main">
        <div className="chat-scroll" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="empty-state">
              <h1>Relay</h1>
              <p>
                An AI agent that can call tools — a calculator, a clock, and a
                search stub — before answering. Powered by Groq, built with
                Django + React. Ask it something.
              </p>
              <div className="suggestion-grid">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="suggestion-card"
                    onClick={() => handleSend(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="chat-inner">
              {messages.map((m, i) => (
                <ChatMessage
                  key={i}
                  role={m.role}
                  content={m.content}
                  hops={m.hops}
                  isStreaming={isStreaming && i === messages.length - 1}
                />
              ))}
            </div>
          )}
        </div>

        {error && <div className="error-banner">⚠ {error}</div>}

        <InputBar
          value={input}
          onChange={setInput}
          onSend={() => handleSend()}
          disabled={isStreaming}
        />
      </main>
    </div>
  );
}
