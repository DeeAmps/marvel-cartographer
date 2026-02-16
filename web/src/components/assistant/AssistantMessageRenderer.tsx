"use client";

import { Eye } from "lucide-react";

export interface AssistantMessage {
  role: "user" | "watcher";
  content: string;
}

interface Props {
  messages: AssistantMessage[];
  isStreaming: boolean;
  compact?: boolean;
}

export default function AssistantMessageRenderer({ messages, isStreaming, compact }: Props) {
  return (
    <div className={`space-y-${compact ? "3" : "4"}`}>
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`rounded-lg ${compact ? "px-3 py-2" : "px-4 py-3"} max-w-[85%]`}
            style={{
              background:
                msg.role === "user"
                  ? "var(--accent-purple)"
                  : "var(--bg-secondary)",
              color: msg.role === "user" ? "#fff" : "var(--text-primary)",
              border:
                msg.role === "watcher"
                  ? "1px solid var(--border-default)"
                  : "none",
            }}
          >
            {msg.role === "watcher" && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <Eye size={compact ? 10 : 12} style={{ color: "var(--accent-purple)" }} />
                <span
                  className="font-bold uppercase tracking-wider"
                  style={{
                    color: "var(--accent-purple)",
                    fontSize: compact ? "0.625rem" : "0.75rem",
                  }}
                >
                  The Watcher
                </span>
              </div>
            )}
            <div
              className="leading-relaxed whitespace-pre-wrap"
              style={{
                color:
                  msg.role === "user" ? "#fff" : "var(--text-secondary)",
                fontSize: compact ? "0.8125rem" : "0.875rem",
              }}
            >
              {msg.content}
              {isStreaming &&
                idx === messages.length - 1 &&
                msg.role === "watcher" && (
                  <span
                    className="inline-block w-1.5 h-4 ml-0.5 animate-pulse"
                    style={{ background: "var(--accent-purple)" }}
                  />
                )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
