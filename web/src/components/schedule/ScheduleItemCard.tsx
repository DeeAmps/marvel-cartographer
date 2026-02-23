"use client";

import Link from "next/link";
import { Check, X, SkipForward, GripVertical } from "lucide-react";
import type { ScheduleItem } from "@/lib/types";

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  const sMonth = s.toLocaleDateString("en-US", { month: "short" });
  const eMonth = e.toLocaleDateString("en-US", { month: "short" });
  if (start === end) return `${sMonth} ${s.getDate()}`;
  if (sMonth === eMonth) return `${sMonth} ${s.getDate()}–${e.getDate()}`;
  return `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}`;
}

const STATUS_STYLES: Record<string, { bg: string; border: string; label: string }> = {
  scheduled: { bg: "transparent", border: "var(--border-default)", label: "Scheduled" },
  in_progress: { bg: "rgba(79, 195, 247, 0.1)", border: "var(--accent-blue)", label: "Reading" },
  completed: { bg: "rgba(0, 230, 118, 0.1)", border: "var(--accent-green)", label: "Done" },
  skipped: { bg: "transparent", border: "var(--text-tertiary)", label: "Skipped" },
  overdue: { bg: "rgba(233, 69, 96, 0.1)", border: "var(--accent-red)", label: "Overdue" },
};

interface Props {
  item: ScheduleItem;
  onComplete?: (id: string) => void;
  onSkip?: (id: string) => void;
  onRemove?: (id: string) => void;
  compact?: boolean;
  draggable?: boolean;
}

export default function ScheduleItemCard({
  item,
  onComplete,
  onSkip,
  onRemove,
  compact = false,
  draggable = false,
}: Props) {
  const style = STATUS_STYLES[item.status] ?? STATUS_STYLES.scheduled;
  const isFinished = item.status === "completed" || item.status === "skipped";

  return (
    <div
      className={`flex items-center gap-3 rounded-lg transition-colors ${compact ? "p-2" : "p-3"}`}
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        opacity: isFinished ? 0.6 : 1,
      }}
      draggable={draggable && !isFinished}
      onDragStart={(e) => {
        if (draggable) {
          e.dataTransfer.setData("text/plain", item.id);
          e.dataTransfer.effectAllowed = "move";
        }
      }}
    >
      {draggable && !isFinished && (
        <GripVertical size={14} style={{ color: "var(--text-tertiary)", cursor: "grab" }} />
      )}

      {/* Cover thumbnail */}
      {item.edition_cover_image_url && !compact ? (
        <img
          src={item.edition_cover_image_url}
          alt=""
          className="rounded flex-shrink-0 object-cover"
          style={{ width: 48, height: 72 }}
        />
      ) : (
        <div
          className="rounded flex-shrink-0"
          style={{
            width: compact ? 32 : 48,
            height: compact ? 48 : 72,
            background: item.edition_era_color ?? "var(--bg-tertiary)",
            opacity: 0.4,
          }}
        />
      )}

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/edition/${item.edition_slug}`}
          className="text-sm font-medium hover:underline line-clamp-2"
          style={{
            color: "var(--text-primary)",
            textDecoration: isFinished ? "line-through" : "none",
          }}
        >
          {item.edition_title ?? "Unknown Edition"}
        </Link>
        {!compact && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {item.scheduled_date && item.due_date && (
              <span
                className="text-xs"
                style={{
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "0.65rem",
                }}
              >
                {formatDateRange(item.scheduled_date, item.due_date)}
              </span>
            )}
            {item.edition_importance && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  background:
                    item.edition_importance === "essential"
                      ? "rgba(233, 69, 96, 0.2)"
                      : item.edition_importance === "recommended"
                      ? "rgba(240, 165, 0, 0.2)"
                      : "rgba(110, 118, 129, 0.2)",
                  color:
                    item.edition_importance === "essential"
                      ? "var(--accent-red)"
                      : item.edition_importance === "recommended"
                      ? "var(--accent-gold)"
                      : "var(--text-tertiary)",
                }}
              >
                {item.edition_importance}
              </span>
            )}
            {item.edition_era_name && (
              <span className="text-xs" style={{ color: item.edition_era_color ?? "var(--text-tertiary)" }}>
                {item.edition_era_name}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Status badge */}
      {item.status === "overdue" && (
        <span
          className="text-xs px-2 py-1 rounded-full font-medium animate-pulse"
          style={{ background: "rgba(233, 69, 96, 0.2)", color: "var(--accent-red)" }}
        >
          Overdue
        </span>
      )}

      {/* Action buttons */}
      {!isFinished && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {onComplete && (
            <button
              onClick={() => onComplete(item.id)}
              className="p-1.5 rounded-md transition-colors hover:bg-[var(--bg-tertiary)]"
              title="Mark completed"
            >
              <Check size={16} style={{ color: "var(--accent-green)" }} />
            </button>
          )}
          {onSkip && (
            <button
              onClick={() => onSkip(item.id)}
              className="p-1.5 rounded-md transition-colors hover:bg-[var(--bg-tertiary)]"
              title="Skip"
            >
              <SkipForward size={16} style={{ color: "var(--text-tertiary)" }} />
            </button>
          )}
          {onRemove && (
            <button
              onClick={() => onRemove(item.id)}
              className="p-1.5 rounded-md transition-colors hover:bg-[var(--bg-tertiary)]"
              title="Remove"
            >
              <X size={16} style={{ color: "var(--text-tertiary)" }} />
            </button>
          )}
        </div>
      )}

      {/* Completed checkmark */}
      {item.status === "completed" && (
        <Check size={18} style={{ color: "var(--accent-green)", flexShrink: 0 }} />
      )}
    </div>
  );
}
