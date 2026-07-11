import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import WelcomeScreen from "./components/WelcomeScreen.jsx";
import ChatView from "./components/ChatView.jsx";
import ChatInput from "./components/ChatInput.jsx";
import PricingModal from "./components/PricingModal.jsx";
import { streamChat } from "./lib/api.js";
import {
  loadChats,
  saveChats,
  loadActiveChatId,
  saveActiveChatId,
  loadTheme,
  saveTheme,
  makeId,
  titleFromMessage,
} from "./lib/storage.js";
import "./App.css";

export default function App() {
  const [chats, setChats] = useState(() => loadChats());
  const [activeChatId, setActiveChatId] = useState(() => loadActiveChatId());
  const [theme, setTheme] = useState(() => loadTheme());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    saveChats(chats);
  }, [chats]);

  useEffect(() => {
    saveActiveChatId(activeChatId);
  }, [activeChatId]);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) || null,
    [chats, activeChatId]
  );
  const messages = activeChat?.messages || [];

  function updateChat(id, updater) {
    setChats((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  }

  function handleNewChat() {
    if (activeChat && activeChat.messages.length === 0) {
      setSidebarOpen(false);
      return;
    }
    const chat = { id: makeId(), title: "Yangi suhbat", messages: [], createdAt: Date.now() };
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(chat.id);
    setSidebarOpen(false);
  }

  function handleSelectChat(id) {
    setActiveChatId(id);
    setSidebarOpen(false);
  }

  function handleDeleteChat(id) {
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) {
      setActiveChatId(null);
    }
  }

  async function handleSend(text) {
    if (isStreaming) return;

    let chatId = activeChatId;
    let baseMessages = messages;

    if (!chatId || !chats.some((c) => c.id === chatId)) {
      const chat = { id: makeId(), title: "Yangi suhbat", messages: [], createdAt: Date.now() };
      setChats((prev) => [chat, ...prev]);
      chatId = chat.id;
      baseMessages = [];
      setActiveChatId(chatId);
    }

    const userMsg = { id: makeId(), role: "user", content: text };
    const assistantMsg = { id: makeId(), role: "assistant", content: "" };
    const history = [...baseMessages, userMsg];

    updateChat(chatId, (c) => ({
      ...c,
      title: c.messages.length === 0 ? titleFromMessage(text) : c.title,
      messages: [...c.messages, userMsg, assistantMsg],
    }));

    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        history.map((m) => ({ role: m.role, content: m.content })),
        {
          signal: controller.signal,
          onDelta: (_delta, full) => {
            updateChat(chatId, (c) => ({
              ...c,
              messages: c.messages.map((m) => (m.id === assistantMsg.id ? { ...m, content: full } : m)),
            }));
          },
        }
      );
    } catch (err) {
      const message =
        err?.name === "AbortError" ? "" : err?.message || "AI bilan bog'lanishda xatolik yuz berdi.";
      updateChat(chatId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === assistantMsg.id ? { ...m, content: message, isError: true } : m
        ),
      }));
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="fi-app">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onOpenPricing={() => setPricingOpen(true)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="fi-main">
        <header className="fi-mobile-bar">
          <button className="fi-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Menyu">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <span className="fi-mobile-title">FINTELLECT</span>
          <button className="fi-mobile-pricing" onClick={() => setPricingOpen(true)} aria-label="Tariflar">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1.5 9.6 4.9l3.7.5-2.7 2.6.6 3.7L8 9.9l-3.2 1.7.6-3.7L2.7 5.4l3.7-.5L8 1.5Z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </header>

        {messages.length === 0 ? (
          <WelcomeScreen onPick={handleSend} />
        ) : (
          <ChatView messages={messages} isStreaming={isStreaming} />
        )}

        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </main>

      {pricingOpen && <PricingModal onClose={() => setPricingOpen(false)} />}
    </div>
  );
}
