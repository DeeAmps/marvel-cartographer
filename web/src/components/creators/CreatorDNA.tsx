import Link from "next/link";
import { Dna, BarChart3, Layers, Users } from "lucide-react";
import type { CreatorDNA } from "@/lib/creator-analytics";

interface Props {
  dna: CreatorDNA;
  creatorName: string;
}

export default function CreatorDNAPanel({ dna, creatorName }: Props) {
  if (dna.totalEditions === 0) return null;

  const maxEraCount = Math.max(...dna.eraBreakdown.map((e) => e.count), 1);

  return (
    <section className="mb-8">
      <h2
        className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2"
        style={{
          fontFamily: "var(--font-bricolage), sans-serif",
          color: "var(--accent-blue)",
        }}
      >
        <Dna size={18} />
        Creator DNA
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Impact Score */}
        <div
          className="rounded-lg border p-4"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-default)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={14} style={{ color: "var(--text-tertiary)" }} />
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Impact Score
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Ring indicator */}
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="var(--bg-tertiary)"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={
                    dna.impactScore >= 70
                      ? "var(--accent-red)"
                      : dna.impactScore >= 40
                        ? "var(--accent-gold)"
                        : "var(--accent-blue)"
                  }
                  strokeWidth="3"
                  strokeDasharray={`${dna.impactScore}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div
                className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {dna.impactScore}%
              </div>
            </div>

            <div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                  {dna.totalEditions}
                </span>{" "}
                editions tracked
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                {dna.impactScore}% rated essential — {" "}
                {dna.impactScore >= 70
                  ? "industry legend"
                  : dna.impactScore >= 40
                    ? "major contributor"
                    : "reliable craftsperson"}
              </p>
            </div>
          </div>
        </div>

        {/* Era Fingerprint */}
        <div
          className="rounded-lg border p-4"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-default)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Layers size={14} style={{ color: "var(--text-tertiary)" }} />
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Era Fingerprint
            </span>
          </div>

          <div className="space-y-2">
            {dna.eraBreakdown.slice(0, 5).map((era) => (
              <div key={era.eraSlug} className="flex items-center gap-2">
                <span
                  className="text-xs w-24 truncate flex-shrink-0"
                  style={{ color: "var(--text-secondary)" }}
                  title={era.era}
                >
                  {era.era}
                </span>
                <div
                  className="flex-1 h-4 rounded-sm overflow-hidden"
                  style={{ background: "var(--bg-tertiary)" }}
                >
                  <div
                    className="h-full rounded-sm transition-all"
                    style={{
                      width: `${(era.count / maxEraCount) * 100}%`,
                      background: era.color,
                      minWidth: "4px",
                    }}
                  />
                </div>
                <span
                  className="text-xs w-6 text-right flex-shrink-0"
                  style={{
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                >
                  {era.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Format Mix */}
        <div
          className="rounded-lg border p-4"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-default)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Layers size={14} style={{ color: "var(--text-tertiary)" }} />
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Format Mix
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {dna.formatBreakdown.map((f) => (
              <span
                key={f.format}
                className="px-2 py-1 rounded text-xs"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {f.format} ({f.count})
              </span>
            ))}
          </div>

          {dna.signatureThemes.length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border-default)" }}>
              <span
                className="text-xs uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Themes:{" "}
              </span>
              {dna.signatureThemes.map((theme, i) => (
                <span key={theme}>
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--accent-gold)" }}
                  >
                    {theme}
                  </span>
                  {i < dna.signatureThemes.length - 1 && (
                    <span style={{ color: "var(--text-tertiary)" }}> · </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Top Collaborators */}
        <div
          className="rounded-lg border p-4"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-default)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} style={{ color: "var(--text-tertiary)" }} />
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Top Collaborators
            </span>
          </div>

          {dna.topCollaborators.length > 0 ? (
            <div className="space-y-2">
              {dna.topCollaborators.map((collab) => (
                <Link
                  key={collab.slug}
                  href={`/creator/${collab.slug}`}
                  className="flex items-center justify-between py-1 text-sm transition-colors hover:text-[var(--accent-blue)]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span>{collab.name}</span>
                  <span
                    className="text-xs"
                    style={{
                      color: "var(--text-tertiary)",
                      fontFamily: "var(--font-geist-mono), monospace",
                    }}
                  >
                    {collab.sharedCount} shared
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              No collaborator data available.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
