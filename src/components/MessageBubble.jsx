import TypingIndicator from "./TypingIndicator.jsx";

export default function MessageBubble({ role, content, isStreaming, isError }) {
  const isUser = role === "user";
  return (
    <div className={`fi-msg-row ${isUser ? "is-user" : "is-ai"}`}>
      {!isUser && (
        <div className="fi-msg-avatar">
          <span>F</span>
        </div>
      )}
      <div className={`fi-msg-bubble ${isUser ? "fi-msg-user" : "fi-msg-ai"} ${isError ? "is-error" : ""}`}>
        {content ? (
          <p className="fi-msg-text">{content}</p>
        ) : (
          isStreaming && <TypingIndicator />
        )}
        {content && isStreaming && <span className="fi-msg-caret" />}
      </div>
    </div>
  );
}
