import Link from "next/link";
import { Zap, Users, BookOpen } from "lucide-react";
import type { Event } from "@/lib/types";

interface Props {
  events: Event[];
  debutCharacters: { slug: string; name: string; first_appearance_issue: string }[];
  relatedPaths: { slug: string; name: string; category: string }[];
  eraColor: string;
}

export default function EraSidebar({ events, debutCharacters, relatedPaths, eraColor }: Props) {
  const hasContent = events.length > 0 || debutCharacters.length > 0 || relatedPaths.length > 0;
  if (!hasContent) return null;

  return (
    <div
      className="rounded-xl border p-4 space-y-5"
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border-default)",
      }}
    >
      {/* Events */}
      {events.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Zap size={12} style={{ color: eraColor }} />
            <h4
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Key Events
            </h4>
          </div>
          <div className="space-y-1.5">
            {events.slice(0, 8).map((event) => (
              <Link
                key={event.slug}
                href={`/event/${event.slug}`}
                className="block group"
              >
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-xs flex-shrink-0"
                    style={{
                      color: "var(--text-tertiary)",
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: "0.7rem",
                    }}
                  >
                    {event.year}
                  </span>
                  <span
                    className="text-xs font-medium group-hover:text-[var(--accent-red)] transition-colors truncate"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {event.name}
                  </span>
                  {event.importance === "essential" && (
                    <span
                      className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                      style={{ background: "var(--importance-essential)" }}
                    />
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Debut Characters */}
      {debutCharacters.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Users size={12} style={{ color: eraColor }} />
            <h4
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Character Debuts
            </h4>
          </div>
          <div className="flex flex-wrap gap-1">
            {debutCharacters.map((c) => (
              <Link
                key={c.slug}
                href={`/character/${c.slug}`}
                className="px-2 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-secondary)",
                  fontSize: "0.7rem",
                }}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Related Paths */}
      {relatedPaths.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <BookOpen size={12} style={{ color: eraColor }} />
            <h4
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              Reading Paths
            </h4>
          </div>
          <div className="space-y-1">
            {relatedPaths.map((p) => (
              <Link
                key={p.slug}
                href={`/path/${p.slug}`}
                className="block text-xs font-medium hover:text-[var(--accent-red)] transition-colors truncate"
                style={{ color: "var(--text-secondary)" }}
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
