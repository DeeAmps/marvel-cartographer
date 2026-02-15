import type { HandbookStatusByEra } from "@/lib/types";

export default function StatusTimeline({
  statuses,
  eraMap,
}: {
  statuses: HandbookStatusByEra[];
  eraMap: Record<string, { slug: string; name: string; color: string }>;
}) {
  return (
    <div className="space-y-0">
      {statuses.map((s, i) => {
        const era = eraMap[s.era_slug];
        const isLast = i === statuses.length - 1;
        return (
          <div key={`${s.era_slug}-${i}`} className="flex gap-4">
            {/* Timeline rail */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  background: era?.color || "var(--border-default)",
                  border: "2px solid var(--bg-primary)",
                  boxShadow: `0 0 0 2px ${era?.color || "var(--border-default)"}`,
                }}
              />
              {!isLast && (
                <div
                  className="w-0.5 flex-1 min-h-[32px]"
                  style={{ background: "var(--border-default)" }}
                />
              )}
            </div>

            {/* Content */}
            <div className="pb-4 -mt-0.5 min-w-0">
              <p
                className="text-xs font-bold mb-0.5"
                style={{ color: era?.color || "var(--text-tertiary)" }}
              >
                {era?.name || s.era_slug}
              </p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {s.status}
              </p>
              {s.note && (
                <p className="text-xs mt-0.5 italic" style={{ color: "var(--text-tertiary)" }}>
                  {s.note}
                </p>
              )}
              {s.citation && (
                <p
                  className="text-xs mt-0.5"
                  style={{
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "0.7rem",
                  }}
                >
                  {s.citation}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
