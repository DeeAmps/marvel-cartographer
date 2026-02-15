import Link from "next/link";
import type { Creator } from "@/lib/types";

const roleColors: Record<string, string> = {
  writer: "var(--accent-gold)",
  artist: "var(--accent-blue)",
  editor: "var(--accent-purple)",
};

export default function CreatorCard({ creator }: { creator: Creator }) {
  return (
    <Link href={`/creator/${creator.slug}`} className="block group">
      <div
        className="rounded-lg border p-4 transition-all hover:border-[var(--border-accent)] hover:shadow-lg hover:shadow-[var(--accent-red)]/5 h-full"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
        }}
      >
        <h3
          className="text-sm font-bold leading-tight group-hover:text-[var(--accent-red)] transition-colors"
          style={{ color: "var(--text-primary)" }}
        >
          {creator.name}
        </h3>

        <div className="flex flex-wrap gap-1 mt-1.5">
          {creator.roles.map((role) => (
            <span
              key={role}
              className="px-1.5 py-0.5 rounded text-xs font-bold"
              style={{
                color: roleColors[role] || "var(--text-secondary)",
                border: `1px solid ${roleColors[role] || "var(--text-tertiary)"}`,
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.75rem",
              }}
            >
              {role.toUpperCase()}
            </span>
          ))}
        </div>

        {creator.active_years && (
          <p
            className="text-xs mt-2"
            style={{
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {creator.active_years}
          </p>
        )}

        {creator.bio && (
          <p
            className="text-xs mt-2 line-clamp-2 leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {creator.bio}
          </p>
        )}
      </div>
    </Link>
  );
}
