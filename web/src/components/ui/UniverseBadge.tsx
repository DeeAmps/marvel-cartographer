import type { Universe } from "@/lib/types";

export default function UniverseBadge({
  universe,
  compact = false,
}: {
  universe: Universe;
  compact?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold tracking-wide"
      style={{
        color: universe.color,
        border: `1px solid ${universe.color}`,
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: "0.75rem",
      }}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: universe.color }}
      />
      {compact ? `E-${universe.designation}` : universe.name}
    </span>
  );
}
