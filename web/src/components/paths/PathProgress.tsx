"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "marvel-cartographer-progress";

function getProgress(): Record<string, Record<number, boolean>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveProgress(data: Record<string, Record<number, boolean>>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function usePathProgress(pathSlug: string) {
  const [completed, setCompleted] = useState<Record<number, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const all = getProgress();
    setCompleted(all[pathSlug] || {});
    setHydrated(true);
  }, [pathSlug]);

  const toggle = (position: number) => {
    setCompleted((prev) => {
      const next = { ...prev };
      if (next[position]) {
        delete next[position];
      } else {
        next[position] = true;
      }
      const all = getProgress();
      all[pathSlug] = next;
      saveProgress(all);
      return next;
    });
  };

  return { completed, toggle, hydrated };
}

export default function PathProgress({
  pathSlug,
  totalEntries,
}: {
  pathSlug: string;
  totalEntries: number;
}) {
  const { completed, hydrated } = usePathProgress(pathSlug);
  const count = Object.keys(completed).length;
  const pct = totalEntries > 0 ? Math.round((count / totalEntries) * 100) : 0;

  if (!hydrated) return null;

  return (
    <div
      className="rounded-lg border p-4 mb-6"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-bold uppercase"
          style={{ color: "var(--text-tertiary)" }}
        >
          Your Progress
        </span>
        <span
          className="text-xs font-bold"
          style={{
            color: pct === 100 ? "var(--accent-green)" : "var(--accent-gold)",
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          {count}/{totalEntries} ({pct}%)
        </span>
      </div>
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ background: "var(--bg-tertiary)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background:
              pct === 100
                ? "var(--accent-green)"
                : pct > 50
                  ? "var(--accent-gold)"
                  : "var(--accent-red)",
          }}
        />
      </div>
      {pct === 100 && (
        <p
          className="text-xs mt-2 font-bold"
          style={{ color: "var(--accent-green)" }}
        >
          Path complete! You&apos;ve read all {totalEntries} editions.
        </p>
      )}
    </div>
  );
}

export function PathCheckbox({
  pathSlug,
  position,
}: {
  pathSlug: string;
  position: number;
}) {
  const { completed, toggle, hydrated } = usePathProgress(pathSlug);
  const isChecked = completed[position] || false;

  if (!hydrated) {
    return (
      <div
        className="w-10 h-10 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold"
        style={{
          background: "var(--bg-tertiary)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-geist-mono), monospace",
        }}
      >
        {position}
      </div>
    );
  }

  return (
    <button
      onClick={() => toggle(position)}
      className="w-10 h-10 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
      style={{
        background: isChecked ? "var(--accent-green)" : "var(--bg-tertiary)",
        color: isChecked ? "#000" : "var(--text-primary)",
        fontFamily: "var(--font-geist-mono), monospace",
        cursor: "pointer",
        touchAction: "manipulation",
      }}
      title={isChecked ? "Mark as unread" : "Mark as read"}
    >
      {isChecked ? "✓" : position}
    </button>
  );
}
