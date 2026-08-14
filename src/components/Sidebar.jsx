export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  loading,
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" />
        <span className="brand-name">Relay</span>
        <span className="brand-tag">/agent</span>
      </div>

      <button className="new-chat-btn" onClick={onNew}>
        <span>＋</span> New chat
      </button>

      <div className="conversation-list">
        {loading && (
          <div className="conversation-item" style={{ cursor: "default" }}>
            <span className="label">Loading…</span>
          </div>
        )}
        {!loading &&
          conversations.map((c) => (
            <div
              key={c.id}
              className={`conversation-item ${c.id === activeId ? "active" : ""}`}
              onClick={() => onSelect(c.id)}
            >
              <span className="label">{c.title}</span>
              <button
                className="delete-btn"
                title="Delete conversation"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c.id);
                }}
              >
                ✕
              </button>
            </div>
          ))}
      </div>

      <div className="sidebar-footer">Django + Groq · server-side history</div>
    </aside>
  );
}
