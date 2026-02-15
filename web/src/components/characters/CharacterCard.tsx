import Link from "next/link";
import type { Character } from "@/lib/types";

export default function CharacterCard({ character }: { character: Character }) {
  return (
    <Link href={`/character/${character.slug}`} className="block group">
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
          {character.name}
        </h3>

        {character.aliases.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {character.aliases.slice(0, 3).map((alias) => (
              <span
                key={alias}
                className="px-1.5 py-0.5 rounded text-xs"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "0.75rem",
                }}
              >
                {alias}
              </span>
            ))}
            {character.aliases.length > 3 && (
              <span
                className="px-1.5 py-0.5 text-xs"
                style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}
              >
                +{character.aliases.length - 3}
              </span>
            )}
          </div>
        )}

        {character.teams.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {character.teams.slice(0, 3).map((team) => (
              <span
                key={team}
                className="px-1.5 py-0.5 rounded text-xs font-bold"
                style={{
                  color: "var(--accent-blue)",
                  border: "1px solid var(--accent-blue)",
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "0.75rem",
                }}
              >
                {team}
              </span>
            ))}
          </div>
        )}

        <p
          className="text-xs mt-2 truncate"
          style={{
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          {character.first_appearance_issue}
        </p>

        {character.description && (
          <p
            className="text-xs mt-2 line-clamp-2 leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {character.description}
          </p>
        )}
      </div>
    </Link>
  );
}
