import { useEffect, useRef, useState } from "react";
import "./ChatInput.css";

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="fi-input-wrap">
      <form className="fi-input-bar" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="fi-input-textarea"
          placeholder="Buxgalteriya yoki soliq bo'yicha savolingizni yozing..."
          value={value}
          rows={1}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button
          type="submit"
          className="fi-send-btn"
          disabled={disabled || !value.trim()}
          aria-label="Yuborish"
        >
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
            <path
              d="M17.5 2.5 2.5 8.7c-.6.25-.55 1.13.07 1.32L9 12l2 6.43c.2.62 1.07.66 1.32.07L17.5 2.5Z"
              fill="currentColor"
            />
            <path d="M17.5 2.5 9 12" stroke="currentColor" strokeWidth="0.6" />
          </svg>
        </button>
      </form>
      <p className="fi-input-hint">
        Fintellect xatolarga yo'l qo'yishi mumkin. Muhim qarorlar uchun mutaxassisga murojaat qiling.
      </p>
    </div>
  );
}
