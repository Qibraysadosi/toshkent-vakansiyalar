import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble.jsx";
import "./ChatView.css";

export default function ChatView({ messages, isStreaming }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  return (
    <div className="fi-chat-view">
      <div className="fi-chat-scroll">
        <div className="fi-chat-inner">
          {messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              isError={m.isError}
              isStreaming={isStreaming && i === messages.length - 1 && m.role === "assistant"}
            />
          ))}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
}
