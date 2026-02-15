"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import type { HandbookEntry } from "@/lib/types";

export default function HandbookTooltip({
  entry,
  children,
}: {
  entry: HandbookEntry;
  children: React.ReactNode;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  function show() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(true);
  }

  function hide() {
    timeoutRef.current = setTimeout(() => setIsVisible(false), 200);
  }

  return (
    <span
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <span
        className="border-b border-dotted cursor-help"
        style={{ borderColor: "var(--accent-purple)" }}
      >
        {children}
      </span>

      {isVisible && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg border p-3 shadow-xl"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-default)",
          }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span
              className="text-xs font-bold uppercase"
              style={{ color: "var(--accent-purple)" }}
            >
              {entry.entry_type.replace(/_/g, " ")}
            </span>
            <span
              className="text-xs font-bold"
              style={{
                color:
                  entry.canon_confidence >= 80
                    ? "var(--accent-green)"
                    : entry.canon_confidence >= 50
                    ? "var(--accent-gold)"
                    : "var(--accent-red)",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              {entry.canon_confidence}%
            </span>
          </div>
          <p className="text-sm font-bold mb-1">{entry.name}</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {entry.core_concept}
          </p>
          <Link
            href={`/handbook/${entry.slug}`}
            className="inline-block mt-2 text-xs font-bold transition-colors hover:text-[var(--accent-red)]"
            style={{ color: "var(--accent-purple)" }}
          >
            View full entry →
          </Link>
          {/* Arrow */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 -mt-1"
            style={{
              background: "var(--bg-secondary)",
              borderRight: "1px solid var(--border-default)",
              borderBottom: "1px solid var(--border-default)",
            }}
          />
        </div>
      )}
    </span>
  );
}
