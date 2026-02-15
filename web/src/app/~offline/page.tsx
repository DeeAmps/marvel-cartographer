"use client";

import { WifiOff, RefreshCw, BookOpen, Map, Compass } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: "var(--bg-tertiary)" }}
          >
            <WifiOff size={36} style={{ color: "var(--text-secondary)" }} />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-bricolage), system-ui, sans-serif" }}
          >
            You&apos;re offline
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            The Marvel Universe is still out there — you just need a connection
            to reach it. Check your network and try again.
          </p>
        </div>

        {/* Retry button */}
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-opacity hover:opacity-90"
          style={{ background: "var(--accent-red)", color: "#fff" }}
        >
          <RefreshCw size={18} />
          Try again
        </button>

        {/* Cached content hints */}
        <div
          className="rounded-xl p-6 space-y-4"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-default)",
          }}
        >
          <p
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Pages you&apos;ve visited before may still be available:
          </p>
          <div className="grid grid-cols-3 gap-3">
            <a
              href="/timeline"
              className="flex flex-col items-center gap-2 p-3 rounded-lg transition-colors"
              style={{ background: "var(--bg-tertiary)" }}
            >
              <Map size={20} style={{ color: "var(--accent-gold)" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Timeline
              </span>
            </a>
            <a
              href="/paths"
              className="flex flex-col items-center gap-2 p-3 rounded-lg transition-colors"
              style={{ background: "var(--bg-tertiary)" }}
            >
              <Compass size={20} style={{ color: "var(--accent-blue)" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Paths
              </span>
            </a>
            <a
              href="/collection"
              className="flex flex-col items-center gap-2 p-3 rounded-lg transition-colors"
              style={{ background: "var(--bg-tertiary)" }}
            >
              <BookOpen size={20} style={{ color: "var(--accent-green)" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Collection
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
