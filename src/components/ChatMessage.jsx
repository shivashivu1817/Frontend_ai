import RelayTrace from "./RelayTrace";

// Very small, dependency-free markdown-ish renderer: handles fenced code
// blocks and inline code so responses look right without pulling in a
// full markdown library.
function renderContent(content) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const code = part.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "");
      return (
        <pre key={i}>
          <code>{code}</code>
        </pre>
      );
    }
    const inline = part.split(/(`[^`]+`)/g).map((seg, j) =>
      seg.startsWith("`") && seg.endsWith("`") ? (
        <code key={j}>{seg.slice(1, -1)}</code>
      ) : (
        <span key={j}>{seg}</span>
      )
    );
    return <span key={i}>{inline}</span>;
  });
}

export default function ChatMessage({ role, content, hops, isStreaming }) {
  const isUser = role === "user";
  return (
    <div className="message-row">
      <div className={`avatar ${isUser ? "user" : "assistant"}`}>
        {isUser ? "YOU" : "AI"}
      </div>
      <div className="message-body">
        <div className="message-role">{isUser ? "You" : "Relay agent"}</div>
        <RelayTrace hops={hops} />
        <div className="message-content">
          {content ? (
            renderContent(content)
          ) : isStreaming ? (
            <div className="typing-indicator">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
