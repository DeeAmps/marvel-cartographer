"use client";

interface EditionData {
  slug: string;
  title: string;
  issue_count: number;
  page_count?: number;
  cover_price?: number;
}

interface Metric {
  label: string;
  getValue: (e: EditionData) => number | null;
  format: (v: number) => string;
  lowerIsBetter?: boolean;
}

const METRICS: Metric[] = [
  {
    label: "Issue Count",
    getValue: (e) => e.issue_count || null,
    format: (v) => String(v),
  },
  {
    label: "Page Count",
    getValue: (e) => e.page_count || null,
    format: (v) => String(v),
  },
  {
    label: "Cover Price",
    getValue: (e) => e.cover_price || null,
    format: (v) => `$${v.toFixed(2)}`,
    lowerIsBetter: true,
  },
  {
    label: "Cost per Issue",
    getValue: (e) =>
      e.cover_price && e.issue_count ? e.cover_price / e.issue_count : null,
    format: (v) => `$${v.toFixed(2)}`,
    lowerIsBetter: true,
  },
  {
    label: "Cost per Page",
    getValue: (e) =>
      e.cover_price && e.page_count ? e.cover_price / e.page_count : null,
    format: (v) => `$${v.toFixed(3)}`,
    lowerIsBetter: true,
  },
];

const COLORS = ["var(--accent-red)", "var(--accent-blue)", "var(--accent-gold)", "var(--accent-purple)"];

export default function ComparisonChart({
  editions,
}: {
  editions: EditionData[];
}) {
  if (editions.length < 2) return null;

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
    >
      <h3
        className="text-sm font-bold tracking-tight mb-4"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        Visual Comparison
      </h3>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {editions.map((ed, i) => (
          <div key={ed.slug} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: COLORS[i] }}
            />
            <span className="text-xs truncate max-w-[160px]" style={{ color: "var(--text-secondary)" }}>
              {ed.title}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {METRICS.map((metric) => {
          const values = editions.map((e) => metric.getValue(e));
          const validValues = values.filter((v): v is number => v !== null);
          if (validValues.length < 2) return null;

          const max = Math.max(...validValues);
          const best = metric.lowerIsBetter
            ? Math.min(...validValues)
            : Math.max(...validValues);

          return (
            <div key={metric.label}>
              <p
                className="text-xs font-bold uppercase mb-1.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {metric.label}
              </p>
              <div className="space-y-1.5">
                {editions.map((ed, i) => {
                  const val = values[i];
                  if (val === null) return null;
                  const pct = max > 0 ? (val / max) * 100 : 0;
                  const isWinner = val === best;

                  return (
                    <div key={ed.slug} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div
                          className="h-5 rounded-sm flex items-center px-2 transition-all"
                          style={{
                            width: `${Math.max(pct, 8)}%`,
                            background: COLORS[i],
                            opacity: isWinner ? 1 : 0.5,
                          }}
                        >
                          <span
                            className="text-xs font-bold whitespace-nowrap"
                            style={{ color: "#fff", fontSize: "0.7rem" }}
                          >
                            {metric.format(val)}
                          </span>
                        </div>
                      </div>
                      {isWinner && (
                        <span
                          className="text-xs font-bold flex-shrink-0"
                          style={{ color: COLORS[i], fontSize: "0.7rem" }}
                        >
                          BEST
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
