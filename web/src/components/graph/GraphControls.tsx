"use client";

import { GitBranch, List } from "lucide-react";
import { CONNECTION_TYPE_COLORS } from "@/lib/constants/colors";
import { CONNECTION_TYPE_LABELS } from "@/lib/constants/labels";

export type ViewMode = "graph" | "list";

interface GraphControlsProps {
  depth: number;
  onDepthChange: (depth: number) => void;
  activeTypes: string[];
  availableTypes: string[];
  onToggleType: (type: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  nodeCount: number;
  edgeCount: number;
  showViewToggle: boolean;
}

export default function GraphControls({
  depth,
  onDepthChange,
  activeTypes,
  availableTypes,
  onToggleType,
  viewMode,
  onViewModeChange,
  nodeCount,
  edgeCount,
  showViewToggle,
}: GraphControlsProps) {
  return (
    <div className="space-y-3">
      {/* Top row: view toggle + depth + counts */}
      <div className="flex flex-wrap items-center gap-3">
        {showViewToggle && (
          <div
            className="inline-flex rounded-lg border overflow-hidden"
            style={{ borderColor: "var(--border-default)" }}
          >
            <button
              onClick={() => onViewModeChange("graph")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors"
              style={{
                background: viewMode === "graph" ? "var(--accent-red)" : "transparent",
                color: viewMode === "graph" ? "#fff" : "var(--text-tertiary)",
              }}
              aria-label="Graph view"
            >
              <GitBranch size={14} />
              Graph
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors"
              style={{
                background: viewMode === "list" ? "var(--accent-red)" : "transparent",
                color: viewMode === "list" ? "#fff" : "var(--text-tertiary)",
              }}
              aria-label="List view"
            >
              <List size={14} />
              List
            </button>
          </div>
        )}

        {/* Depth slider */}
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold uppercase"
            style={{ color: "var(--text-tertiary)" }}
          >
            Depth
          </span>
          <input
            type="range"
            min={1}
            max={3}
            value={depth}
            onChange={(e) => onDepthChange(Number(e.target.value))}
            className="w-20 accent-[var(--accent-red)]"
          />
          <span
            className="text-xs font-bold"
            style={{
              color: "var(--accent-gold)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {depth} hop{depth > 1 ? "s" : ""}
          </span>
        </div>

        {/* Node/edge count */}
        <span
          className="text-xs ml-auto"
          style={{
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          {nodeCount} nodes · {edgeCount} edges
        </span>
      </div>

      {/* Connection type filter pills */}
      {availableTypes.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {availableTypes.map((type) => {
            const isActive = activeTypes.includes(type);
            const color = CONNECTION_TYPE_COLORS[type] || "#6e7681";
            return (
              <button
                key={type}
                onClick={() => onToggleType(type)}
                className="px-2 py-0.5 rounded text-xs font-bold transition-all"
                style={{
                  background: isActive ? `color-mix(in srgb, ${color} 20%, transparent)` : "transparent",
                  color: isActive ? color : "var(--text-tertiary)",
                  border: `1px solid ${isActive ? color : "var(--border-default)"}`,
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {CONNECTION_TYPE_LABELS[type] || type.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
