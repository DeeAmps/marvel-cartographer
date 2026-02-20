"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Eye, Send, LogIn, Loader2, Plus, Trash2, MessageSquare, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useWatcherConversations } from "@/hooks/useWatcherConversations";
import WatcherMessageRenderer, { type WatcherMessage } from "@/components/watcher/WatcherMessageRenderer";

const SUGGESTED_QUESTIONS = [
  "Where should I start with X-Men?",
  "What should I read after Civil War?",
  "Explain the sliding timescale",
  "What's the best Doom reading order?",
  "Is House of X essential?",
  "What's the difference between omnibus and Epic Collection?",
];

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function WatcherClient() {
  const { user, session, loading } = useAuth();
  const {
    conversations,
    activeConversationId,
    messages,
    setMessages,
    conversationsLoaded,
    loadConversation,
    deleteConversation,
    startNewConversation,
    saveUserMessage,
    saveWatcherMessage,
  } = useWatcherConversations();

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamedTextRef = useRef("");

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch remaining queries on mount
  useEffect(() => {
    if (!user) return;
    const fetchRemaining = async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("watcher_queries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", oneHourAgo);
      setRemaining(20 - (count ?? 0));
    };
    fetchRemaining();
  }, [user]);

  const askQuestion = async (question: string) => {
    if (!question.trim() || isStreaming || !session) return;

    setError(null);
    const userMsg: WatcherMessage = { role: "user", content: question.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);
    streamedTextRef.current = "";

    // Persist user message
    saveUserMessage(question.trim());

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
        }),
      });

      // Update remaining from header
      const remainingHeader = response.headers.get("X-Watcher-Remaining");
      if (remainingHeader) {
        setRemaining(Number(remainingHeader));
      }

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Something went wrong");
        // Remove the empty watcher message
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
                streamedTextRef.current += parsed.text;
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

      // Persist the completed watcher response
      if (streamedTextRef.current) {
        saveWatcherMessage(streamedTextRef.current);
      }

      if (remaining !== null && remaining > 0) {
        setRemaining((r) => (r !== null ? r - 1 : null));
      }
    } catch (err) {
      setError("Network error. Please try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2
          size={24}
          className="animate-spin"
          style={{ color: "var(--text-tertiary)" }}
        />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-20">
          <Eye
            size={64}
            className="mx-auto mb-6"
            style={{ color: "var(--accent-purple)" }}
          />
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight mb-4"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            Ask The Watcher
          </h1>
          <p
            className="text-lg mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            &ldquo;I have observed all that has transpired...&rdquo;
          </p>
          <p className="text-sm mb-8" style={{ color: "var(--text-tertiary)" }}>
            An AI-powered guide to Marvel continuity, reading orders, and
            recommendations. Sign in to begin your inquiry.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all hover:shadow-lg"
            style={{
              background: "var(--accent-purple)",
              color: "#fff",
            }}
          >
            <LogIn size={16} />
            Sign In to Ask The Watcher
          </Link>
        </div>
      </div>
    );
  }

  // Sidebar content (shared between desktop and mobile)
  const sidebarContent = (
    <>
      <button
        onClick={() => {
          startNewConversation();
          setMobileSidebarOpen(false);
        }}
        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
        style={{
          background: "var(--accent-purple)",
          color: "#fff",
        }}
      >
        <Plus size={14} />
        New Conversation
      </button>

      <div className="mt-3 space-y-1 overflow-y-auto flex-1" style={{ maxHeight: "calc(100vh - 320px)" }}>
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className="group flex items-start gap-1 rounded-lg transition-all cursor-pointer"
            style={{
              background: conv.id === activeConversationId ? "var(--bg-tertiary)" : "transparent",
              border: conv.id === activeConversationId ? "1px solid var(--border-default)" : "1px solid transparent",
            }}
          >
            <button
              onClick={() => {
                loadConversation(conv.id);
                setMobileSidebarOpen(false);
              }}
              className="flex-1 text-left px-3 py-2 min-w-0"
            >
              <div
                className="text-sm truncate"
                style={{
                  color: conv.id === activeConversationId ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                {conv.title}
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {timeAgo(conv.updated_at)}
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteConversation(conv.id);
              }}
              className="p-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              style={{ color: "var(--text-tertiary)" }}
              title="Delete conversation"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}

        {conversationsLoaded && conversations.length === 0 && (
          <p className="text-xs px-3 py-4" style={{ color: "var(--text-tertiary)" }}>
            No conversations yet. Ask a question to get started.
          </p>
        )}
      </div>
    </>
  );

  // Logged in — chat interface with sidebar
  return (
    <div className="max-w-5xl mx-auto flex gap-0 md:gap-6" style={{ minHeight: "calc(100vh - 200px)" }}>
      {/* Desktop sidebar */}
      <div
        className="hidden md:flex flex-col shrink-0"
        style={{ width: 240 }}
      >
        <div
          className="sticky top-4 rounded-xl p-3"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-3 px-1">
            <MessageSquare size={13} style={{ color: "var(--text-tertiary)" }} />
            <span
              className="text-xs uppercase tracking-widest font-medium"
              style={{ color: "var(--text-tertiary)" }}
            >
              History
            </span>
          </div>
          {sidebarContent}
        </div>
      </div>

      {/* Main chat column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={20} style={{ color: "var(--accent-purple)" }} />
            <span
              className="text-xs uppercase tracking-widest"
              style={{ color: "var(--accent-purple)" }}
            >
              Ask The Watcher
            </span>
            {remaining !== null && (
              <span
                className="ml-auto text-xs"
                style={{
                  color:
                    remaining <= 3
                      ? "var(--accent-red)"
                      : "var(--text-tertiary)",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {remaining}/20 remaining this hour
              </span>
            )}
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            What do you wish to know, mortal?
          </h1>
        </div>

        {/* Mobile conversation switcher */}
        <div className="md:hidden mb-4">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full"
            style={{
              background: "var(--bg-secondary)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
            }}
          >
            <MessageSquare size={14} />
            <span className="flex-1 text-left truncate">
              {activeConversationId
                ? conversations.find((c) => c.id === activeConversationId)?.title ?? "Conversation"
                : "New Conversation"}
            </span>
            <ChevronDown
              size={14}
              className="transition-transform"
              style={{ transform: mobileSidebarOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {mobileSidebarOpen && (
            <div
              className="mt-2 rounded-xl p-3"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-default)",
              }}
            >
              {sidebarContent}
            </div>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 mb-6">
          {messages.length === 0 && (
            <div>
              <p
                className="text-sm mb-4"
                style={{ color: "var(--text-tertiary)" }}
              >
                Suggested questions:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => askQuestion(q)}
                    disabled={isStreaming}
                    className="text-left px-4 py-3 rounded-lg text-sm transition-all hover:shadow-md"
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
          />
          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-4 px-4 py-2 rounded-lg text-sm"
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
          className="sticky bottom-0 py-4"
          style={{ background: "var(--bg-primary)" }}
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
              placeholder="Ask about reading orders, continuity, characters..."
              disabled={isStreaming}
              className="flex-1 px-4 py-3 rounded-lg text-sm"
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
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
