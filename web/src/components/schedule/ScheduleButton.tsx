"use client";

import { useState } from "react";
import { CalendarPlus, Check } from "lucide-react";
import { useReadingSchedule } from "@/hooks/useReadingSchedule";
import { toast } from "sonner";

interface Props {
  editionSlug: string;
}

function defaultEndDate(start: string): string {
  const d = new Date(start);
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}

export default function ScheduleButton({ editionSlug }: Props) {
  const { authenticated, activeSchedule, isEditionScheduled, addItem } =
    useReadingSchedule();
  const [showPicker, setShowPicker] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultEndDate(today));

  if (!authenticated) return null;

  const scheduled = isEditionScheduled(editionSlug);

  if (scheduled) {
    return (
      <span
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
        style={{
          background: "rgba(0, 230, 118, 0.1)",
          color: "var(--accent-green)",
          border: "1px solid rgba(0, 230, 118, 0.2)",
        }}
      >
        <Check size={12} /> Scheduled
      </span>
    );
  }

  if (!activeSchedule) {
    return (
      <a
        href="/schedule"
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
        style={{
          background: "var(--bg-tertiary)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border-default)",
        }}
      >
        <CalendarPlus size={12} /> Schedule
      </a>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
        style={{
          background: "var(--bg-tertiary)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border-default)",
        }}
      >
        <CalendarPlus size={12} /> Schedule
      </button>

      {showPicker && (
        <div
          className="absolute top-full mt-2 right-0 z-50 rounded-lg p-3 shadow-lg"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-default)",
            minWidth: 220,
          }}
        >
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Start reading
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (e.target.value > endDate) {
                setEndDate(defaultEndDate(e.target.value));
              }
            }}
            className="w-full px-2 py-1.5 rounded text-sm mb-2"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Finish by
          </label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-2 py-1.5 rounded text-sm mb-2"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
          <button
            onClick={async () => {
              const ok = await addItem(editionSlug, startDate, endDate);
              if (ok) {
                toast.success("Added to schedule");
                setShowPicker(false);
              } else {
                toast.error("Failed to add to schedule");
              }
            }}
            className="w-full px-3 py-1.5 rounded text-xs font-medium"
            style={{ background: "var(--accent-red)", color: "#fff" }}
          >
            Add to Schedule
          </button>
        </div>
      )}
    </div>
  );
}
