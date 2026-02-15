"use client";

import { Trophy, Scale } from "lucide-react";

interface EditionData {
  slug: string;
  title: string;
  issue_count: number;
  page_count?: number;
  cover_price?: number;
  print_status: string;
  importance: string;
}

interface VerdictReason {
  text: string;
  winner: string;
}

export default function ComparisonVerdict({
  editions,
  uniqueIssueCounts,
  totalIssueCounts,
}: {
  editions: EditionData[];
  uniqueIssueCounts: Record<string, number>;
  totalIssueCounts: Record<string, number>;
}) {
  if (editions.length !== 2) return null;

  const [a, b] = editions;
  const scores: Record<string, number> = { [a.slug]: 0, [b.slug]: 0 };
  const reasons: VerdictReason[] = [];

  // Cost per issue (+3)
  const cpiA = a.cover_price && a.issue_count ? a.cover_price / a.issue_count : null;
  const cpiB = b.cover_price && b.issue_count ? b.cover_price / b.issue_count : null;
  if (cpiA !== null && cpiB !== null) {
    if (cpiA < cpiB) {
      scores[a.slug] += 3;
      reasons.push({ text: `Lower cost per issue ($${cpiA.toFixed(2)} vs $${cpiB.toFixed(2)})`, winner: a.slug });
    } else if (cpiB < cpiA) {
      scores[b.slug] += 3;
      reasons.push({ text: `Lower cost per issue ($${cpiB.toFixed(2)} vs $${cpiA.toFixed(2)})`, winner: b.slug });
    }
  }

  // More unique issues (+2)
  const uniqueA = uniqueIssueCounts[a.slug] || 0;
  const uniqueB = uniqueIssueCounts[b.slug] || 0;
  const totalA = totalIssueCounts[a.slug] || 1;
  const totalB = totalIssueCounts[b.slug] || 1;
  const uniquePctA = Math.round((uniqueA / totalA) * 100);
  const uniquePctB = Math.round((uniqueB / totalB) * 100);
  if (uniquePctA > uniquePctB) {
    scores[a.slug] += 2;
    reasons.push({ text: `More unique content (${uniquePctA}% vs ${uniquePctB}%)`, winner: a.slug });
  } else if (uniquePctB > uniquePctA) {
    scores[b.slug] += 2;
    reasons.push({ text: `More unique content (${uniquePctB}% vs ${uniquePctA}%)`, winner: b.slug });
  }

  // In print (+2)
  const aInPrint = a.print_status === "in_print" || a.print_status === "ongoing";
  const bInPrint = b.print_status === "in_print" || b.print_status === "ongoing";
  if (aInPrint && !bInPrint) {
    scores[a.slug] += 2;
    reasons.push({ text: "Currently in print", winner: a.slug });
  } else if (bInPrint && !aInPrint) {
    scores[b.slug] += 2;
    reasons.push({ text: "Currently in print", winner: b.slug });
  }

  // Higher importance (+1)
  const importanceRank: Record<string, number> = { essential: 4, recommended: 3, supplemental: 2, completionist: 1 };
  const impA = importanceRank[a.importance] || 0;
  const impB = importanceRank[b.importance] || 0;
  if (impA > impB) {
    scores[a.slug] += 1;
    reasons.push({ text: `Higher importance (${a.importance})`, winner: a.slug });
  } else if (impB > impA) {
    scores[b.slug] += 1;
    reasons.push({ text: `Higher importance (${b.importance})`, winner: b.slug });
  }

  // More pages (+1)
  if (a.page_count && b.page_count) {
    if (a.page_count > b.page_count) {
      scores[a.slug] += 1;
      reasons.push({ text: `More pages (${a.page_count} vs ${b.page_count})`, winner: a.slug });
    } else if (b.page_count > a.page_count) {
      scores[b.slug] += 1;
      reasons.push({ text: `More pages (${b.page_count} vs ${a.page_count})`, winner: b.slug });
    }
  }

  const diff = Math.abs(scores[a.slug] - scores[b.slug]);
  const isTossUp = diff <= 1;
  const winner = scores[a.slug] > scores[b.slug] ? a : b;
  const loser = winner.slug === a.slug ? b : a;

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        background: "var(--bg-secondary)",
        borderColor: isTossUp ? "var(--accent-gold)" : "var(--accent-green)",
        borderLeftWidth: "3px",
      }}
    >
      <h3
        className="text-sm font-bold tracking-tight mb-2 flex items-center gap-2"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        {isTossUp ? (
          <>
            <Scale size={16} style={{ color: "var(--accent-gold)" }} />
            <span style={{ color: "var(--accent-gold)" }}>Toss-Up</span>
          </>
        ) : (
          <>
            <Trophy size={16} style={{ color: "var(--accent-green)" }} />
            Which Should I Buy?
          </>
        )}
      </h3>

      {isTossUp ? (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          These are very close in value. Both are strong choices &mdash; pick based on which content interests you more.
        </p>
      ) : (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          <span className="font-bold" style={{ color: "var(--accent-green)" }}>
            {winner.title}
          </span>{" "}
          is the better buy.
        </p>
      )}

      {reasons.length > 0 && (
        <div className="mt-3 space-y-1">
          {reasons.map((r, i) => {
            const isWinnerReason = r.winner === winner.slug;
            return (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span
                  className="flex-shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: isWinnerReason ? "var(--accent-green)" : "var(--accent-red)" }}
                />
                <span style={{ color: "var(--text-tertiary)" }}>
                  <span className="font-bold" style={{ color: isWinnerReason ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                    {isWinnerReason ? winner.title.split(" ").slice(0, 3).join(" ") : loser.title.split(" ").slice(0, 3).join(" ")}:
                  </span>{" "}
                  {r.text}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
