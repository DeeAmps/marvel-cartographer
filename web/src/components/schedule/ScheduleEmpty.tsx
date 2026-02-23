"use client";

import { CalendarDays, BookOpen, Library, Sparkles } from "lucide-react";

interface Props {
  onCreateSchedule: () => void;
}

export default function ScheduleEmpty({ onCreateSchedule }: Props) {
  return (
    <div
      className="rounded-lg p-12 text-center"
      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
    >
      <CalendarDays
        size={48}
        style={{ color: "var(--accent-gold)", margin: "0 auto 16px" }}
      />
      <h2
        className="text-xl font-bold mb-2"
        style={{ color: "var(--text-primary)", fontFamily: "var(--font-bricolage)" }}
      >
        Plan Your Reading
      </h2>
      <p
        className="text-sm mb-8 max-w-md mx-auto"
        style={{ color: "var(--text-secondary)" }}
      >
        Create a reading schedule to pace yourself through Marvel&apos;s history.
        Schedule from a reading path, your collection, or build one manually.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
        <div className="flex flex-col items-center gap-2 p-4 rounded-lg" style={{ background: "var(--bg-tertiary)" }}>
          <BookOpen size={20} style={{ color: "var(--accent-blue)" }} />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>From a Path</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-4 rounded-lg" style={{ background: "var(--bg-tertiary)" }}>
          <Library size={20} style={{ color: "var(--accent-purple)" }} />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>From Collection</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-4 rounded-lg" style={{ background: "var(--bg-tertiary)" }}>
          <Sparkles size={20} style={{ color: "var(--accent-gold)" }} />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Manual</span>
        </div>
      </div>

      <button
        onClick={onCreateSchedule}
        className="px-6 py-3 rounded-lg text-sm font-semibold transition-colors"
        style={{ background: "var(--accent-red)", color: "#fff" }}
      >
        Create Your Schedule
      </button>
    </div>
  );
}
