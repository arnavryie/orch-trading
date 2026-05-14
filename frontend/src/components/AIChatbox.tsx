// frontend/src/components/AIChatbox.tsx
import React, { useState, useRef, useEffect } from "react";

const API = "http://localhost:8765";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  action?: string;
}

const SUGGESTIONS = [
  "buy reliance 10 shares",
  "show me nifty price",
  "what is my portfolio?",
  "sell tcs 5 shares",
  "my balance",
  "analyze INFY",
];

export const AIChatbox: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 Hi! I'm your AI trading assistant.\n\nI can **buy/sell shares**, show **market data**, and **analyze stocks** for you.\n\nTry: **buy reliance 10** or **show me nifty**",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    setLoading(true);
    setExpanded(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: msg,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "Sorry, something went wrong.",
        timestamp: new Date(),
        action: data.action,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "⚠️ Cannot connect to backend. Make sure it's running on port 8765.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: "#1a1a1a",
        borderTop: "1px solid #2d2d2d",
        transition: "height 0.2s ease",
        height: expanded ? "380px" : "56px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Messages area */}
      {expanded && (
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "80%",
                background: m.role === "user" ? "#1d4ed8" : "#2d2d2d",
                color: "#f0f0f0",
                borderRadius: "12px",
                padding: "8px 12px",
                fontSize: "13px",
                lineHeight: "1.5",
                whiteSpace: "pre-wrap",
              }}
              dangerouslySetInnerHTML={{
                __html: m.content
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  .replace(/\n/g, "<br/>"),
              }}
            />
          ))}
          {loading && (
            <div style={{ alignSelf: "flex-start", color: "#888", fontSize: "13px", padding: "8px 12px" }}>
              ● thinking...
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 16px",
          gap: "8px",
          height: "56px",
          borderTop: expanded ? "1px solid #2d2d2d" : "none",
        }}
      >
        <span style={{ color: "#888", fontSize: "18px" }}>✦</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setExpanded(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
            if (e.key === "Escape") setExpanded(false);
          }}
          placeholder={expanded ? "Ask anything — buy reliance 10, show nifty, my portfolio..." : "Ask Gemini..."}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#f0f0f0",
            fontSize: "14px",
          }}
        />
        {/* Suggestion chips */}
        {!expanded && (
          <div style={{ display: "flex", gap: "6px", overflow: "hidden" }}>
            {SUGGESTIONS.slice(0, 3).map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                style={{
                  background: "#2d2d2d",
                  border: "1px solid #444",
                  borderRadius: "20px",
                  color: "#aaa",
                  padding: "4px 10px",
                  fontSize: "11px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {expanded && (
          <button
            onClick={() => setExpanded(false)}
            style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "16px" }}
          >
            ✕
          </button>
        )}
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{
            background: input.trim() ? "#1d4ed8" : "#2d2d2d",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            padding: "6px 12px",
            cursor: input.trim() ? "pointer" : "default",
            fontSize: "13px",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};
