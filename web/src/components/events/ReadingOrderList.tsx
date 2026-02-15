import Link from "next/link";
import type { ReadingOrderEntry } from "@/lib/types";

export default function ReadingOrderList({
  entries,
  editionTitleMap,
}: {
  entries: ReadingOrderEntry[];
  editionTitleMap?: Record<string, string>;
}) {
  if (entries.length === 0) return null;

  // Group entries by phase
  const phases = new Map<string, { name: string; number: number; entries: ReadingOrderEntry[] }>();
  const noPhase: ReadingOrderEntry[] = [];

  for (const entry of entries) {
    if (entry.phase_name && entry.phase_id) {
      if (!phases.has(entry.phase_id)) {
        phases.set(entry.phase_id, {
          name: entry.phase_name,
          number: entry.phase_number || 0,
          entries: [],
        });
      }
      phases.get(entry.phase_id)!.entries.push(entry);
    } else {
      noPhase.push(entry);
    }
  }

  const sortedPhases = Array.from(phases.values()).sort(
    (a, b) => a.number - b.number
  );

  return (
    <section>
      <h2
        className="text-lg font-bold tracking-tight mb-4"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        Issue-by-Issue Reading Order
      </h2>

      {sortedPhases.length > 0 ? (
        <div className="space-y-6">
          {sortedPhases.map((phase) => (
            <div key={phase.name}>
              {/* Phase header */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: "var(--accent-red)",
                    color: "#fff",
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "0.75rem",
                  }}
                >
                  {phase.number}
                </span>
                <h3
                  className="text-sm font-bold tracking-tight"
                  style={{
                    fontFamily: "var(--font-bricolage), sans-serif",
                    color: "var(--accent-gold)",
                  }}
                >
                  {phase.name}
                </h3>
              </div>
              {/* Entries */}
              <div className="space-y-1.5 ml-2">
                {phase.entries.map((entry) => (
                  <IssueEntry key={entry.id} entry={entry} editionTitleMap={editionTitleMap} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {noPhase.map((entry) => (
            <IssueEntry key={entry.id} entry={entry} editionTitleMap={editionTitleMap} />
          ))}
        </div>
      )}
    </section>
  );
}

function IssueEntry({ entry, editionTitleMap }: { entry: ReadingOrderEntry; editionTitleMap?: Record<string, string> }) {
  const content = (
    <div
      className="rounded-lg border p-3 transition-all flex items-start gap-3 hover:border-[var(--accent-red)] hover:shadow-lg hover:shadow-[var(--accent-red)]/5"
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border-default)",
        borderLeft: `3px solid ${entry.is_core ? "var(--accent-red)" : "var(--border-default)"}`,
      }}
    >
      {/* Position */}
      <span
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
        style={{
          background: entry.is_core ? "var(--accent-red)" : "var(--bg-tertiary)",
          color: entry.is_core ? "#fff" : "var(--text-tertiary)",
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: "0.75rem",
        }}
      >
        {entry.position}
      </span>
      <div className="flex-1 min-w-0">
        {/* Series + issue */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold">
            {entry.series_title}
          </span>
          <span
            className="text-xs"
            style={{
              color: "var(--accent-blue)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {entry.issue_number}
          </span>
          {entry.is_core && (
            <span
              className="px-1.5 py-0.5 rounded text-xs font-bold"
              style={{
                background: "var(--accent-red)",
                color: "#fff",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.5rem",
              }}
            >
              CORE
            </span>
          )}
          {!entry.is_core && (
            <span
              className="px-1.5 py-0.5 rounded text-xs"
              style={{
                background: "var(--bg-tertiary)",
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.5rem",
              }}
            >
              TIE-IN
            </span>
          )}
        </div>
        {/* Note */}
        {entry.note && (
          <p
            className="text-xs mt-1 leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {entry.note}
          </p>
        )}
        {/* Edition link */}
        {entry.edition_slug && (
          <p
            className="text-xs mt-1"
            style={{
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "0.75rem",
            }}
          >
            Collected in:{" "}
            <span style={{ color: "var(--accent-blue)" }}>
              {(editionTitleMap && entry.edition_slug && editionTitleMap[entry.edition_slug]) || entry.edition_slug?.replace(/-/g, " ")}
            </span>
          </p>
        )}
      </div>
    </div>
  );

  if (entry.edition_slug) {
    return (
      <Link href={`/edition/${entry.edition_slug}`} className="block group">
        {content}
      </Link>
    );
  }

  return content;
}
