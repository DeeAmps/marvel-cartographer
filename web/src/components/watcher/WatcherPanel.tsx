"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Eye, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import WatcherMessageRenderer, { type WatcherMessage } from "./WatcherMessageRenderer";
import { getSuggestedQuestionsForPage, type WatcherPageContext } from "@/lib/watcher-context";

interface Props {
  pageContext: WatcherPageContext;
  onClose: () => void;
}

export default function WatcherPanel({ pageContext, onClose }: Props) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<WatcherMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = getSuggestedQuestionsForPage(pageContext);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Escape key to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isStreaming) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, isStreaming]);

  const askQuestion = useCallback(async (question: string) => {
    if (!question.trim() || isStreaming || !session) return;

    setError(null);
    const userMsg: WatcherMessage = { role: "user", content: question.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);

    // Add empty watcher message to stream into
    setMessages((prev) => [...prev, { role: "watcher", content: "" }]);

    try {
      const response = await fetch("/api/watcher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question: question.trim(),
          conversationHistory: messages,
          pageContext,
        }),
      });

      const remainingHeader = response.headers.get("X-Watcher-Remaining");
      if (remainingHeader) setRemaining(Number(remainingHeader));

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Something went wrong");
        setMessages((prev) => prev.slice(0, -1));
        setIsStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError("Failed to read response stream");
        setMessages((prev) => prev.slice(0, -1));
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg && lastMsg.role === "watcher") {
                    updated[updated.length - 1] = {
                      ...lastMsg,
                      content: lastMsg.content + parsed.text,
                    };
                  }
                  return updated;
                });
              }
            } catch {
              // Skip
            }
          }
        }
      }
    } catch {
      setError("Network error. Please try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, session, messages, pageContext]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[55]"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={() => { if (!isStreaming) onClose(); }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 bottom-0 z-[60] flex flex-col w-full sm:w-96 sm:max-w-[90vw]"
        style={{
          background: "var(--bg-primary)",
          borderLeft: "1px solid var(--border-default)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-default)" }}
        >
          <div className="flex items-center gap-2">
            <Eye size={16} style={{ color: "var(--accent-purple)" }} />
            <span
              className="text-sm font-bold"
              style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
            >
              Ask The Watcher
            </span>
            {remaining !== null && (
              <span
                className="text-xs ml-1"
                style={{
                  color: remaining <= 3 ? "var(--accent-red)" : "var(--text-tertiary)",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {remaining}/20
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: "var(--text-tertiary)" }}
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 && (
            <div>
              <p
                className="text-xs mb-3"
                style={{ color: "var(--text-tertiary)" }}
              >
                Suggested questions for this page:
              </p>
              <div className="space-y-1.5">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => askQuestion(q)}
                    disabled={isStreaming}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all"
                    style={{
                      background: "var(--bg-secondary)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-default)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent-purple)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-default)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <WatcherMessageRenderer
            messages={messages}
            isStreaming={isStreaming}
            compact
          />
          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {error && (
          <div
            className="mx-4 mb-2 px-3 py-2 rounded-lg text-xs"
            style={{
              background: "rgba(233, 69, 96, 0.1)",
              color: "var(--accent-red)",
              border: "1px solid var(--accent-red)",
            }}
          >
            {error}
          </div>
        )}

        {/* Input */}
        <div
          className="px-4 py-3 flex-shrink-0"
          style={{ borderTop: "1px solid var(--border-default)", paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              askQuestion(input);
            }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this page..."
              disabled={isStreaming}
              className="flex-1 px-3 py-3 rounded-lg text-sm"
              style={{
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-default)",
              }}
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="px-4 py-3 rounded-lg transition-all disabled:opacity-40"
              style={{
                background: "var(--accent-purple)",
                color: "#fff",
              }}
            >
              {isStreaming ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
