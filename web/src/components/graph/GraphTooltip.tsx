"use client";

import type { ForceGraphNode, ForceGraphEdge } from "@/lib/graph/types";
import { IMPORTANCE_COLORS } from "@/lib/constants/colors";
import { CONNECTION_TYPE_COLORS } from "@/lib/constants/colors";
import { CONNECTION_TYPE_LABELS } from "@/lib/constants/labels";

interface GraphTooltipProps {
  x: number;
  y: number;
  node: ForceGraphNode;
  edge?: ForceGraphEdge;
}

export default function GraphTooltip({ x, y, node, edge }: GraphTooltipProps) {
  const importanceColor = IMPORTANCE_COLORS[node.importance] || "var(--text-tertiary)";
  const formatLabel = node.format
    ? node.format.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    : null;

  return (
    <div
      className="absolute pointer-events-none z-20 rounded-lg border px-3 py-2 shadow-xl"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -100%)",
        background: "var(--bg-tertiary)",
        borderColor: "var(--border-default)",
        maxWidth: 260,
      }}
    >
      <p
        className="text-xs font-bold leading-tight"
        style={{ color: "var(--text-primary)" }}
      >
        {node.title}
      </p>

      <div className="flex items-center gap-2 mt-1">
        <span
          className="text-xs font-bold"
          style={{
            color: importanceColor,
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "0.7rem",
          }}
        >
          {node.importance.toUpperCase()}
        </span>
        {formatLabel && (
          <span
            className="text-xs"
            style={{
              color: "var(--accent-blue)",
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "0.7rem",
            }}
          >
            {formatLabel}
          </span>
        )}
      </div>

      {node.issues_collected && (
        <p
          className="text-xs mt-1 truncate"
          style={{
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "0.7rem",
          }}
        >
          {node.issues_collected}
        </p>
      )}

      {edge && (
        <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t" style={{ borderColor: "var(--border-default)" }}>
          <span
            className="w-2 h-0.5 rounded"
            style={{ background: CONNECTION_TYPE_COLORS[edge.connection_type] || "#6e7681" }}
          />
          <span
            className="text-xs font-bold"
            style={{
              color: CONNECTION_TYPE_COLORS[edge.connection_type] || "var(--text-tertiary)",
              fontSize: "0.7rem",
            }}
          >
            {CONNECTION_TYPE_LABELS[edge.connection_type] || edge.connection_type.replace(/_/g, " ")}
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--text-tertiary)", fontSize: "0.65rem" }}
          >
            str:{edge.strength} conf:{edge.confidence}%
          </span>
        </div>
      )}

      <p
        className="text-xs mt-1"
        style={{ color: "var(--text-tertiary)", fontSize: "0.65rem" }}
      >
        Click to view
      </p>
    </div>
  );
}
