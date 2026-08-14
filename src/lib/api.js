const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function listConversations() {
  const res = await fetch(`${API_URL}/api/conversations/`);
  if (!res.ok) throw new Error("Failed to load conversations");
  return res.json();
}

export async function createConversation(title = "New chat") {
  const res = await fetch(`${API_URL}/api/conversations/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Failed to create conversation");
  return res.json();
}

export async function getConversation(id) {
  const res = await fetch(`${API_URL}/api/conversations/${id}/`);
  if (!res.ok) throw new Error("Failed to load conversation");
  return res.json();
}

export async function deleteConversation(id) {
  const res = await fetch(`${API_URL}/api/conversations/${id}/`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete conversation");
}

/**
 * Streams a chat reply from the Django backend using Server-Sent Events
 * delivered over a POST request (fetch + ReadableStream, since the native
 * EventSource API can't send a POST body).
 *
 * handlers: { onToken, onToolCall, onToolResult, onDone, onError }
 */
export async function streamChat(conversationId, message, handlers) {
  const res = await fetch(`${API_URL}/api/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_id: conversationId, message }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    handlers.onError?.(text || `Request failed with status ${res.status}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop(); // keep the incomplete tail for next read

    for (const chunk of chunks) {
      const lines = chunk.split("\n");
      let event = "message";
      let dataStr = "";
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) dataStr += line.slice(5).trim();
      }
      if (!dataStr) continue;

      let data;
      try {
        data = JSON.parse(dataStr);
      } catch {
        continue;
      }

      switch (event) {
        case "token":
          handlers.onToken?.(data.content);
          break;
        case "tool_call":
          handlers.onToolCall?.(data);
          break;
        case "tool_result":
          handlers.onToolResult?.(data);
          break;
        case "error":
          handlers.onError?.(data.message);
          break;
        case "done":
          handlers.onDone?.();
          break;
        default:
          break;
      }
    }
  }
}
