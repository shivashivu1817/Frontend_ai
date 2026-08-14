import { useRef } from "react";

export default function InputBar({ value, onChange, onSend, disabled }) {
  const textareaRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSend();
    }
  };

  const handleInput = (e) => {
    onChange(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  };

  return (
    <div className="input-bar-wrap">
      <div className="input-bar">
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Message Relay…"
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
        />
        <button
          className="send-btn"
          disabled={disabled || !value.trim()}
          onClick={onSend}
          title="Send"
        >
          ↑
        </button>
      </div>
      <div className="input-hint">Enter to send · Shift+Enter for a new line</div>
    </div>
  );
}
