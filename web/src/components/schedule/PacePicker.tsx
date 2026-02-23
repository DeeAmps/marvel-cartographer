"use client";

import { estimateEndDate } from "@/lib/schedule-engine";

interface Props {
  pace: number;
  onChange: (pace: number) => void;
  editionCount?: number;
  startDate?: Date;
}

const PACE_LABELS: Record<number, string> = {
  0.5: "Casual — 1 every 2 weeks",
  1.0: "Steady — 1 per week",
  1.5: "Focused — 3 every 2 weeks",
  2.0: "Dedicated — 2 per week",
  3.0: "Intensive — 3 per week",
  5.0: "Marathon — 5 per week",
};

export default function PacePicker({ pace, onChange, editionCount, startDate }: Props) {
  const label = PACE_LABELS[pace] ?? `${pace} editions/week`;
  const endDate =
    editionCount && editionCount > 0
      ? estimateEndDate(editionCount, pace, startDate)
      : null;

  return (
    <div>
      <label
        className="block text-sm font-medium mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        Reading Pace
      </label>
      <input
        type="range"
        min={0.5}
        max={5}
        step={0.5}
        value={pace}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--accent-red)]"
      />
      <div className="flex justify-between mt-1">
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          0.5/wk
        </span>
        <span className="text-sm font-medium" style={{ color: "var(--accent-gold)" }}>
          {label}
        </span>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          5/wk
        </span>
      </div>
      {endDate && editionCount && (
        <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
          {editionCount} editions — finishing around{" "}
          {new Date(endDate + "T12:00:00").toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}
