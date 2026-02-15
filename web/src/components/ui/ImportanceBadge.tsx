import type { ImportanceLevel } from "@/lib/types";

const importanceConfig: Record<ImportanceLevel, { label: string; color: string; glow?: boolean }> = {
  essential: { label: "Essential", color: "var(--importance-essential)", glow: true },
  recommended: { label: "Recommended", color: "var(--importance-recommended)" },
  supplemental: { label: "Supplemental", color: "var(--importance-supplemental)" },
  completionist: { label: "Completionist", color: "var(--importance-completionist)" },
};

export default function ImportanceBadge({ level }: { level: ImportanceLevel }) {
  const config = importanceConfig[level] || importanceConfig.completionist;

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold"
      style={{
        color: "#fff",
        backgroundColor: config.color,
        fontSize: "0.75rem",
        boxShadow: config.glow
          ? `0 0 10px color-mix(in srgb, ${config.color} 40%, transparent), inset 0 1px 0 rgba(255,255,255,0.15)`
          : "inset 0 1px 0 rgba(255,255,255,0.1)",
      }}
    >
      {config.label}
    </span>
  );
}
