"use client";

import { CONNECTION_TYPE_COLORS, IMPORTANCE_COLORS } from "@/lib/constants/colors";
import { CONNECTION_TYPE_LABELS } from "@/lib/constants/labels";

interface GraphLegendProps {
  activeTypes: string[];
}

const NODE_SIZES = [
  { label: "Essential", importance: "essential", size: 24 },
  { label: "Recommended", importance: "recommended", size: 18 },
  { label: "Supplemental", importance: "supplemental", size: 14 },
  { label: "Completionist", importance: "completionist", size: 10 },
] as const;

export default function GraphLegend({ activeTypes }: GraphLegendProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2 rounded-lg border"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
    >
      {/* Connection type lines */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {activeTypes.map((type) => (
          <div key={type} className="flex items-center gap-1">
            <span
              className="w-4 h-0.5 rounded"
              style={{ background: CONNECTION_TYPE_COLORS[type] || "#6e7681" }}
            />
            <span
              className="text-xs hidden sm:inline"
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.7rem",
              }}
            >
              {CONNECTION_TYPE_LABELS[type] || type.replace(/_/g, " ")}
            </span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <span
        className="hidden sm:inline w-px h-4"
        style={{ background: "var(--border-default)" }}
      />

      {/* Node sizes by importance */}
      <div className="flex items-center gap-2">
        {NODE_SIZES.map((item) => (
          <div key={item.importance} className="flex items-center gap-1">
            <span
              className="rounded-full inline-block"
              style={{
                width: item.size / 2,
                height: item.size / 2,
                background: IMPORTANCE_COLORS[item.importance],
              }}
            />
            <span
              className="text-xs hidden sm:inline"
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.7rem",
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Root indicator */}
      <div className="flex items-center gap-1">
        <span
          className="rounded-full inline-block"
          style={{
            width: 8,
            height: 8,
            background: "var(--accent-red)",
            boxShadow: "0 0 0 2px #fff",
          }}
        />
        <span
          className="text-xs hidden sm:inline"
          style={{
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "0.7rem",
          }}
        >
          Current
        </span>
      </div>
    </div>
  );
}
