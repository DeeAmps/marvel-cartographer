import type { PrintStatus } from "@/lib/types";

const statusConfig: Record<PrintStatus, { label: string; color: string }> = {
  in_print: { label: "In Print", color: "var(--status-in-print)" },
  out_of_print: { label: "Out of Print", color: "var(--status-out-of-print)" },
  upcoming: { label: "Upcoming", color: "var(--status-upcoming)" },
  digital_only: { label: "Digital Only", color: "var(--status-digital)" },
  ongoing: { label: "Ongoing", color: "var(--status-ongoing)" },
  check_availability: { label: "Check Availability", color: "var(--text-tertiary)" },
};

export default function StatusBadge({ status }: { status: PrintStatus }) {
  const config = statusConfig[status] || statusConfig.check_availability;

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
      style={{
        color: config.color,
        background: `color-mix(in srgb, ${config.color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${config.color} 25%, transparent)`,
        fontSize: "0.75rem",
      }}
    >
      {config.label}
    </span>
  );
}
