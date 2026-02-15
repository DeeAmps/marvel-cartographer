import Link from "next/link";
import { ArrowRight } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  character: "var(--accent-red)",
  team: "var(--accent-blue)",
  location: "var(--accent-green)",
  artifact: "var(--accent-gold)",
  species: "var(--accent-purple)",
  editorial_concept: "var(--text-tertiary)",
};

interface RetconItem {
  entry_slug: string;
  entry_name: string;
  entry_type: string;
  retcon: {
    year: number;
    description: string;
    old_state: string;
    new_state: string;
    source: string;
  };
}

export default function RetconRiver({ retcons }: { retcons: RetconItem[] }) {
  if (retcons.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          No retcons match your filters.
        </p>
      </div>
    );
  }

  // Group by decade for separator lines
  let lastDecade = 0;

  return (
    <div className="relative">
      {retcons.map((item, i) => {
        const isLast = i === retcons.length - 1;
        const decade = Math.floor(item.retcon.year / 10) * 10;
        const showDecade = decade !== lastDecade;
        if (showDecade) lastDecade = decade;

        const typeColor = TYPE_COLORS[item.entry_type] || "var(--text-tertiary)";

        // Check if next retcon is same entry for grouped rail
        const nextSameEntry =
          !isLast && retcons[i + 1].entry_slug === item.entry_slug;

        return (
          <div key={`${item.entry_slug}-${item.retcon.year}-${i}`}>
            {/* Decade separator */}
            {showDecade && (
              <div className="flex items-center gap-3 mb-4 mt-2">
                <div className="flex-1 h-px" style={{ background: "var(--border-default)" }} />
                <span
                  className="text-xs font-bold px-3 py-1 rounded-full"
                  style={{
                    background: "var(--bg-tertiary)",
                    color: "var(--accent-gold)",
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                >
                  {decade}s
                </span>
                <div className="flex-1 h-px" style={{ background: "var(--border-default)" }} />
              </div>
            )}

            {/* Timeline entry */}
            <div className="flex gap-4">
              {/* Left rail with year dot */}
              <div className="flex flex-col items-center flex-shrink-0 w-16">
                <span
                  className="text-xs font-bold mb-1"
                  style={{
                    color: "var(--accent-gold)",
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "0.7rem",
                  }}
                >
                  {item.retcon.year}
                </span>
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    background: typeColor,
                    border: "2px solid var(--bg-primary)",
                    boxShadow: `0 0 0 2px ${typeColor}`,
                  }}
                />
                {!isLast && (
                  <div
                    className="w-0.5 flex-1 min-h-[24px]"
                    style={{
                      background: nextSameEntry ? typeColor : "var(--border-default)",
                      opacity: nextSameEntry ? 0.5 : 1,
                    }}
                  />
                )}
              </div>

              {/* Content card */}
              <div className="flex-1 min-w-0 pb-5 -mt-0.5">
                <div
                  className="rounded-lg border p-4"
                  style={{
                    background: "var(--bg-secondary)",
                    borderColor: "var(--border-default)",
                  }}
                >
                  {/* Entry name + type badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <Link
                      href={`/handbook/${item.entry_slug}`}
                      className="text-sm font-bold hover:text-[var(--accent-red)] transition-colors"
                      style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
                    >
                      {item.entry_name}
                    </Link>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-bold uppercase"
                      style={{
                        background: `${typeColor}20`,
                        color: typeColor,
                        fontSize: "0.6rem",
                      }}
                    >
                      {item.entry_type.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
                    {item.retcon.description}
                  </p>

                  {/* Before → After */}
                  <div
                    className="rounded-lg border p-3 flex items-center gap-3"
                    style={{
                      background: "var(--bg-tertiary)",
                      borderColor: "var(--border-default)",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-bold uppercase mb-0.5"
                        style={{ color: "var(--text-tertiary)", fontSize: "0.65rem" }}
                      >
                        Before
                      </p>
                      <p className="text-xs" style={{ color: "var(--status-out-of-print)" }}>
                        {item.retcon.old_state}
                      </p>
                    </div>
                    <ArrowRight
                      size={14}
                      className="flex-shrink-0"
                      style={{ color: "var(--accent-gold)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-bold uppercase mb-0.5"
                        style={{ color: "var(--text-tertiary)", fontSize: "0.65rem" }}
                      >
                        After
                      </p>
                      <p className="text-xs" style={{ color: "var(--status-in-print)" }}>
                        {item.retcon.new_state}
                      </p>
                    </div>
                  </div>

                  {/* Source */}
                  <p
                    className="text-xs mt-2"
                    style={{
                      color: "var(--text-tertiary)",
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: "0.65rem",
                    }}
                  >
                    Source: {item.retcon.source}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
