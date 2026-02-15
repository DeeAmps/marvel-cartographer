import Link from "next/link";
import type { Debate } from "@/lib/types";
import VoteSplitBar from "./VoteSplitBar";
import { MessageSquare, Star } from "lucide-react";

const categoryColors: Record<string, string> = {
  runs: "var(--accent-blue)",
  characters: "var(--accent-red)",
  events: "var(--accent-gold)",
  continuity: "var(--accent-purple)",
  creators: "var(--accent-green)",
  "what-if": "var(--accent-blue)",
  "hot-takes": "#ff1744",
};

export default function DebateCard({ debate }: { debate: Debate }) {
  const color = categoryColors[debate.category] || "var(--text-tertiary)";
  const total = debate.total_votes || 0;

  return (
    <Link href={`/debates/${debate.slug}`} className="block group">
      <div
        className="rounded-xl border p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 h-full"
        style={{
          background: "var(--bg-secondary)",
          borderColor: debate.is_featured
            ? `color-mix(in srgb, ${color} 40%, var(--border-default))`
            : "var(--border-default)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold uppercase"
            style={{
              background: `color-mix(in srgb, ${color} 12%, transparent)`,
              color,
              fontSize: "0.6rem",
            }}
          >
            {debate.category}
          </span>
          {debate.is_featured && (
            <Star size={12} style={{ color: "var(--accent-gold)" }} fill="var(--accent-gold)" />
          )}
        </div>

        <h3
          className="text-sm font-bold leading-tight mb-2 group-hover:text-[var(--accent-red)] transition-colors line-clamp-2"
          style={{ color: "var(--text-primary)" }}
        >
          {debate.title}
        </h3>

        <p className="text-xs line-clamp-2 mb-3" style={{ color: "var(--text-secondary)" }}>
          {debate.question}
        </p>

        <VoteSplitBar
          agree={debate.agree_count || 0}
          disagree={debate.disagree_count || 0}
          complicated={debate.complicated_count || 0}
          compact
        />

        <div className="flex items-center gap-2 mt-3">
          <MessageSquare size={12} style={{ color: "var(--text-tertiary)" }} />
          <span
            className="text-xs"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.65rem" }}
          >
            {total} vote{total !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
