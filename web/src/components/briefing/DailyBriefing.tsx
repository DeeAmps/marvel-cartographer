import { Calendar, Sparkles } from "lucide-react";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import type { DailyIssue, ImportanceLevel } from "@/lib/types";

export default function DailyBriefing({ issues, date }: { issues: DailyIssue[]; date: string }) {
  if (issues.length === 0) return null;

  const formatted = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: "color-mix(in srgb, var(--accent-gold) 12%, transparent)", color: "var(--accent-gold)" }}
        >
          <Calendar size={20} />
        </div>
        <div>
          <h2
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            On This Day in Marvel History
          </h2>
          <p
            className="text-xs"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
          >
            {formatted}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {issues.map((issue) => {
          const year = issue.publication_date
            ? new Date(issue.publication_date).getFullYear()
            : null;

          return (
            <div
              key={issue.slug}
              className="rounded-xl border p-4 transition-all hover:shadow-md"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p
                    className="text-sm font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {issue.series} #{issue.issue_number}
                  </p>
                  {issue.title && (
                    <p className="text-xs mt-0.5 italic" style={{ color: "var(--text-secondary)" }}>
                      &ldquo;{issue.title}&rdquo;
                    </p>
                  )}
                </div>
                {year && (
                  <span
                    className="text-xs font-bold flex-shrink-0 px-1.5 py-0.5 rounded"
                    style={{
                      color: "var(--accent-gold)",
                      background: "color-mix(in srgb, var(--accent-gold) 10%, transparent)",
                      fontFamily: "var(--font-geist-mono), monospace",
                    }}
                  >
                    {year}
                  </span>
                )}
              </div>

              {issue.first_appearances.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  <Sparkles size={12} style={{ color: "var(--accent-red)" }} className="mt-0.5" />
                  {issue.first_appearances.map((fa) => (
                    <span
                      key={fa}
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        color: "var(--accent-red)",
                        background: "color-mix(in srgb, var(--accent-red) 10%, transparent)",
                        fontSize: "0.75rem",
                      }}
                    >
                      {fa}
                    </span>
                  ))}
                </div>
              )}

              <ImportanceBadge level={issue.importance as ImportanceLevel} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
