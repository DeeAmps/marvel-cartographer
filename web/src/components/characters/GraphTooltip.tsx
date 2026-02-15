interface Props {
  x: number;
  y: number;
  name?: string;
  teams?: string[];
  editionCount?: number;
  relationshipType?: string;
  relationshipLabel?: string;
  strength?: number;
}

const RELATIONSHIP_COLORS: Record<string, string> = {
  ally: "#00e676",
  enemy: "#e94560",
  family: "#4fc3f7",
  romantic: "#f48fb1",
  mentor: "#f0a500",
  rival: "#f0a500",
  teammate: "#6e7681",
};

export default function GraphTooltip({
  x,
  y,
  name,
  teams,
  editionCount,
  relationshipType,
  relationshipLabel,
  strength,
}: Props) {
  return (
    <div
      className="absolute pointer-events-none z-20 rounded-lg border px-3 py-2 shadow-lg"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -100%)",
        background: "var(--bg-tertiary)",
        borderColor: "var(--border-default)",
        maxWidth: 260,
      }}
    >
      {name && (
        <p
          className="text-xs font-bold mb-0.5"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          {name}
        </p>
      )}
      {teams && teams.length > 0 && (
        <p className="text-xs" style={{ color: "var(--text-secondary)", fontSize: "0.7rem" }}>
          {teams.slice(0, 3).join(", ")}
        </p>
      )}
      {editionCount !== undefined && (
        <p
          className="text-xs"
          style={{
            color: "var(--accent-gold)",
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "0.7rem",
          }}
        >
          {editionCount} edition{editionCount !== 1 ? "s" : ""}
        </p>
      )}
      {relationshipType && (
        <p
          className="text-xs font-bold uppercase"
          style={{
            color: RELATIONSHIP_COLORS[relationshipType] || "var(--text-tertiary)",
            fontSize: "0.65rem",
          }}
        >
          {relationshipType.replace(/_/g, " ")}
        </p>
      )}
      {relationshipLabel && (
        <p className="text-xs" style={{ color: "var(--text-secondary)", fontSize: "0.7rem" }}>
          {relationshipLabel}
        </p>
      )}
      {strength !== undefined && (
        <div className="flex gap-0.5 mt-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="w-1 h-1.5 rounded-sm"
              style={{
                background: i < strength ? "var(--accent-gold)" : "var(--bg-secondary)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
