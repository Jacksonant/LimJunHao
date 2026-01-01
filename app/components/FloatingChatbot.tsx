"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatMode = "basic" | "tools" | "rag";

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("basic");
  const [loading, setLoading] = useState(false);
  const [userId] = useState(() => `user_${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = input.trim();
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, message: messageToSend, mode }),
      });

      const data = await response.json();

      if (data.response) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);
      } else {
        throw new Error("Invalid response");
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Oops! Something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      await fetch("/api/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      setMessages([]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          display: "flex",
          alignItems: "flex-end",
          gap: "16px",
        }}
      >
        {/* Chat Window */}
        {isOpen && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              width: "380px",
              maxWidth: "90vw",
              height: "580px",
              borderRadius: "20px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              animation: "slideUp 0.3s ease-out",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #c40000 0%, #8b0000 100%)",
                padding: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                animation: "fadeIn 0.4s ease-out",
              }}
            >
              <h2
                style={{
                  color: "#ffffff",
                  fontSize: "18px",
                  fontWeight: "600",
                  margin: 0,
                  letterSpacing: "0.3px",
                }}
              >
                AI Assistant
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  transition: "all 0.3s ease",
                }}
                className="hover:opacity-80 hover:rotate-90 transition-all"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Mode Selector */}
            <div
              style={{
                background: "rgba(248, 249, 250, 0.8)",
                borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
                padding: "12px 16px",
                display: "flex",
                gap: "8px",
                alignItems: "center",
              }}
            >
              {(["basic", "tools", "rag"] as ChatMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    background:
                      mode === m
                        ? "linear-gradient(135deg, #c40000 0%, #8b0000 100%)"
                        : "rgba(255, 255, 255, 0.9)",
                    color: mode === m ? "#ffffff" : "#4a5568",
                    fontSize: "13px",
                    fontWeight: "600",
                    border:
                      mode === m ? "none" : "1px solid rgba(0, 0, 0, 0.1)",
                    padding: "8px 14px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    boxShadow:
                      mode === m ? "0 2px 8px rgba(196, 0, 0, 0.3)" : "none",
                    transition: "all 0.3s ease",
                    transform: mode === m ? "scale(1.05)" : "scale(1)",
                  }}
                  className="transition-all hover:scale-105"
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
              <button
                onClick={clearHistory}
                style={{
                  background: "rgba(255, 255, 255, 0.9)",
                  color: "#e53e3e",
                  fontSize: "13px",
                  fontWeight: "600",
                  border: "1px solid rgba(229, 62, 62, 0.2)",
                  padding: "8px 14px",
                  borderRadius: "20px",
                  marginLeft: "auto",
                  cursor: "pointer",
                }}
                className="transition-all hover:opacity-80"
              >
                Clear
              </button>
            </div>

            {/* Messages Area */}
            <div
              style={{
                background: "transparent",
                flex: 1,
                overflowY: "auto",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {messages.length === 0 && !loading && (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      background:
                        "linear-gradient(135deg, rgba(196, 0, 0, 0.1) 0%, rgba(139, 0, 0, 0.1) 100%)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "16px",
                      animation: "float 3s ease-in-out infinite",
                    }}
                  >
                    <svg
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#c40000"
                      strokeWidth="2"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  <p
                    style={{
                      color: "#718096",
                      fontSize: "15px",
                      textAlign: "center",
                      margin: 0,
                      fontWeight: "500",
                    }}
                  >
                    Start a conversation
                  </p>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent:
                      msg.role === "user" ? "flex-end" : "flex-start",
                    animation: "slideIn 0.3s ease-out",
                  }}
                >
                  <div
                    style={{
                      background:
                        msg.role === "user"
                          ? "linear-gradient(135deg, #c40000 0%, #8b0000 100%)"
                          : "rgba(255, 255, 255, 0.9)",
                      color: msg.role === "user" ? "#ffffff" : "#2d3748",
                      fontSize: "14px",
                      fontWeight: "400",
                      lineHeight: "1.5",
                      padding: "12px 16px",
                      borderRadius: "18px",
                      maxWidth: "75%",
                      wordWrap: "break-word",
                      boxShadow:
                        msg.role === "user"
                          ? "0 4px 12px rgba(196, 0, 0, 0.3)"
                          : "0 2px 8px rgba(0, 0, 0, 0.08)",
                      border:
                        msg.role === "assistant"
                          ? "1px solid rgba(0, 0, 0, 0.06)"
                          : "none",
                      animation: "messageAppear 0.3s ease-out",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.9)",
                      padding: "12px 16px",
                      borderRadius: "18px",
                      display: "flex",
                      gap: "4px",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                      border: "1px solid rgba(0, 0, 0, 0.06)",
                    }}
                  >
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        background: "#c40000",
                        borderRadius: "50%",
                        animation: "bounce 1.4s infinite ease-in-out",
                      }}
                    />
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        background: "#c40000",
                        borderRadius: "50%",
                        animation: "bounce 1.4s infinite ease-in-out 0.2s",
                      }}
                    />
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        background: "#c40000",
                        borderRadius: "50%",
                        animation: "bounce 1.4s infinite ease-in-out 0.4s",
                      }}
                    />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.9)",
                borderTop: "1px solid rgba(0, 0, 0, 0.08)",
                padding: "16px",
              }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  style={{
                    fontSize: "14px",
                    background: "rgba(255, 255, 255, 0.9)",
                    border: "1px solid rgba(0, 0, 0, 0.1)",
                    color: "#2d3748",
                    padding: "12px 18px",
                    borderRadius: "24px",
                    flex: 1,
                    outline: "none",
                  }}
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  style={{
                    background:
                      loading || !input.trim()
                        ? "rgba(0, 0, 0, 0.1)"
                        : "linear-gradient(135deg, #c40000 0%, #8b0000 100%)",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: "600",
                    padding: "12px 24px",
                    borderRadius: "24px",
                    border: "none",
                    cursor:
                      loading || !input.trim() ? "not-allowed" : "pointer",
                    boxShadow:
                      loading || !input.trim()
                        ? "none"
                        : "0 4px 12px rgba(196, 0, 0, 0.3)",
                    transition: "all 0.3s ease",
                  }}
                  className="transition-all hover:opacity-90 hover:scale-105"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Floating Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: "78px",
            height: "78px",
            background: "linear-gradient(135deg, #c40000 0%, #8b0000 100%)",
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            fontWeight: "600",
            color: "#ffffff",
            boxShadow: "0 8px 24px rgba(196, 0, 0, 0.4)",
            animation: "pulse 2s infinite",
          }}
          className="hover:scale-110 transition-transform"
        >
          AI
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            style={{ animation: "wiggle 1s ease-in-out infinite" }}
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      </div>
      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            box-shadow: 0 8px 24px rgba(196, 0, 0, 0.4);
          }
          50% {
            box-shadow: 0 8px 32px rgba(196, 0, 0, 0.6);
          }
        }
        @keyframes wiggle {
          0%,
          100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-10deg);
          }
          75% {
            transform: rotate(10deg);
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideIn {
          from {
            transform: translateX(-10px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes messageAppear {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}
