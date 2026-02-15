import type { DebateEvidence } from "@/lib/types";

const positionColors: Record<string, string> = {
  agree: "var(--accent-green)",
  disagree: "var(--accent-red)",
  complicated: "var(--accent-gold)",
};

export default function EvidenceList({ evidence }: { evidence: DebateEvidence[] }) {
  if (evidence.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
        No evidence submitted yet. Be the first to cite an issue.
      </p>
    );
  }

  // Group by position
  const grouped = {
    agree: evidence.filter((e) => e.position === "agree"),
    disagree: evidence.filter((e) => e.position === "disagree"),
    complicated: evidence.filter((e) => e.position === "complicated"),
  };

  return (
    <div className="space-y-6">
      {(["agree", "disagree", "complicated"] as const).map((pos) => {
        const items = grouped[pos];
        if (items.length === 0) return null;
        const color = positionColors[pos];
        const label = pos === "agree" ? "Supporting" : pos === "disagree" ? "Opposing" : "It's Complicated";

        return (
          <div key={pos}>
            <h4
              className="text-xs font-bold uppercase mb-2"
              style={{ color }}
            >
              {label} Evidence ({items.length})
            </h4>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border p-3"
                  style={{
                    background: "var(--bg-tertiary)",
                    borderColor: `color-mix(in srgb, ${color} 20%, var(--border-default))`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {item.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="px-1.5 py-0.5 rounded text-xs font-bold"
                      style={{
                        background: `color-mix(in srgb, ${color} 12%, transparent)`,
                        color,
                        fontFamily: "var(--font-geist-mono), monospace",
                        fontSize: "0.6rem",
                      }}
                    >
                      {item.issue_citation}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
