import Logo from "./Logo.jsx";
import "./Sidebar.css";

export default function Sidebar({
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onOpenPricing,
  theme,
  onToggleTheme,
  isOpen,
  onClose,
}) {
  return (
    <>
      <div className={`fi-sidebar-backdrop ${isOpen ? "is-visible" : ""}`} onClick={onClose} />
      <aside className={`fi-sidebar ${isOpen ? "is-open" : ""}`}>
        <div className="fi-sidebar-brand">
          <Logo />
          <span className="fi-sidebar-brand-name">FINTELLECT</span>
        </div>

        <button className="fi-new-chat" onClick={onNewChat}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Yangi suhbat
        </button>

        <div className="fi-history-label">Suhbatlar tarixi</div>
        <nav className="fi-history">
          {chats.length === 0 && <div className="fi-history-empty">Hozircha suhbatlar yo'q</div>}
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`fi-history-item ${chat.id === activeChatId ? "is-active" : ""}`}
              onClick={() => onSelectChat(chat.id)}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="fi-history-icon">
                <path
                  d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v6A1.5 1.5 0 0 1 12.5 11H6l-3 3v-3H3.5A1.5 1.5 0 0 1 2 9.5v-6Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="fi-history-title">{chat.title}</span>
              <button
                className="fi-history-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
                aria-label="Suhbatni o'chirish"
                title="O'chirish"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3.5 4.5h9M6.5 4.5v-1a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M6.5 7.5v4M9.5 7.5v4M4.5 4.5l.6 8a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-8"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ))}
        </nav>

        <button className="fi-tariffs-btn" onClick={onOpenPricing}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 1.5 9.6 4.9l3.7.5-2.7 2.6.6 3.7L8 9.9l-3.2 1.7.6-3.7L2.7 5.4l3.7-.5L8 1.5Z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
          Tariflar
        </button>

        <div className="fi-user-row">
          <div className="fi-user-avatar">F</div>
          <div className="fi-user-info">
            <div className="fi-user-name">Foydalanuvchi</div>
            <div className="fi-user-plan">Bepul tarif</div>
          </div>
          <button
            className="fi-theme-toggle"
            onClick={onToggleTheme}
            aria-label="Mavzuni almashtirish"
            title="Mavzuni almashtirish"
          >
            {theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M13.5 9.5A6 6 0 1 1 6.5 2.5a5 5 0 0 0 7 7Z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.2" />
                <path
                  d="M8 1.5v1.4M8 13.1v1.4M14.5 8h-1.4M2.9 8H1.5M12.6 3.4l-1 1M4.4 11.6l-1 1M12.6 12.6l-1-1M4.4 4.4l-1-1"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
