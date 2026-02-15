import type { GuideStatus } from "@/lib/types";

const statusConfig: Record<GuideStatus, { label: string; color: string; bg: string }> = {
  complete: {
    label: "COMPLETE",
    color: "var(--status-in-print)",
    bg: "var(--status-in-print)",
  },
  in_progress: {
    label: "IN PROGRESS",
    color: "var(--status-ongoing)",
    bg: "var(--status-ongoing)",
  },
  planned: {
    label: "PLANNED",
    color: "var(--text-tertiary)",
    bg: "var(--text-tertiary)",
  },
};

export default function GuideStatusBadge({ status }: { status: GuideStatus }) {
  const config = statusConfig[status] || statusConfig.planned;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold tracking-wide"
      style={{
        color: config.color,
        border: `1px solid ${config.color}`,
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: "0.75rem",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: config.bg }}
      />
      {config.label}
    </span>
  );
}
