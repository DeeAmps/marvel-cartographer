import Link from "next/link";

interface PossessionEntry {
  holder_slug: string;
  era_slug: string;
  how_obtained: string;
  citation: string;
}

export default function PossessionTimeline({
  history,
  eraMap,
  handbookMap,
}: {
  history: PossessionEntry[];
  eraMap: Record<string, { slug: string; name: string; color: string }>;
  handbookMap: Record<string, { slug: string; name: string }>;
}) {
  return (
    <div className="space-y-0">
      {history.map((h, i) => {
        const era = eraMap[h.era_slug];
        const holder = handbookMap[h.holder_slug];
        const isLast = i === history.length - 1;
        return (
          <div key={i} className="flex gap-4">
            {/* Timeline rail */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  background: "var(--accent-gold)",
                  border: "2px solid var(--bg-primary)",
                  boxShadow: "0 0 0 2px var(--accent-gold)",
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
            <div className="pb-5 -mt-0.5 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {holder ? (
                  <Link
                    href={`/handbook/${holder.slug}`}
                    className="text-sm font-bold hover:text-[var(--accent-red)] transition-colors"
                  >
                    {holder.name}
                  </Link>
                ) : (
                  <span className="text-sm font-bold">
                    {h.holder_slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                )}
                <span
                  className="text-xs"
                  style={{
                    color: era?.color || "var(--text-tertiary)",
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "0.7rem",
                  }}
                >
                  {era?.name || h.era_slug}
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {h.how_obtained}
              </p>
              <p
                className="text-xs mt-0.5"
                style={{
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "0.7rem",
                }}
              >
                {h.citation}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
