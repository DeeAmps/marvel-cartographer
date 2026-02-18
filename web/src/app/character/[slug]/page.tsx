import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCharacterBySlug,
  getCharacters,
  getEditionsByCharacter,
  getConnections,
  getHandbookEntryBySlug,
  getEras,
} from "@/lib/data";
import EditionCard from "@/components/editions/EditionCard";
import PowerGridRadar from "@/components/handbook/PowerGridRadar";
import StatusTimeline from "@/components/handbook/StatusTimeline";
import RetconTimeline from "@/components/handbook/RetconTimeline";
import ConfidenceScore from "@/components/ui/ConfidenceScore";
import { ArrowLeft, Users, BookOpen, BookMarked } from "lucide-react";
import type { CollectedEdition, CharacterHandbookData } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const character = await getCharacterBySlug(slug);
  if (!character) return { title: "Not Found" };
  return {
    title: character.name,
    description: character.description.slice(0, 160),
  };
}

/** Build a character-specific reading order from connections.json */
async function buildCharacterReadingOrder(
  editions: CollectedEdition[]
): Promise<CollectedEdition[]> {
  if (editions.length <= 1) return editions;

  const connections = await getConnections();
  const editionSlugs = new Set(editions.map((e) => e.slug));

  // Build adjacency list from connections within this character's editions
  const outgoing = new Map<string, string[]>();
  for (const conn of connections) {
    if (
      conn.source_type === "edition" &&
      conn.target_type === "edition" &&
      editionSlugs.has(conn.source_slug) &&
      editionSlugs.has(conn.target_slug) &&
      ["leads_to", "recommended_after", "prerequisite"].includes(conn.connection_type)
    ) {
      if (!outgoing.has(conn.source_slug)) outgoing.set(conn.source_slug, []);
      outgoing.get(conn.source_slug)!.push(conn.target_slug);
    }
  }

  // Topological sort (Kahn's algorithm)
  const inDegree = new Map<string, number>();
  for (const slug of editionSlugs) inDegree.set(slug, 0);
  for (const [, targets] of outgoing) {
    for (const t of targets) {
      inDegree.set(t, (inDegree.get(t) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [slug, deg] of inDegree) {
    if (deg === 0) queue.push(slug);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const next of outgoing.get(current) || []) {
      inDegree.set(next, (inDegree.get(next) || 0) - 1);
      if (inDegree.get(next) === 0) queue.push(next);
    }
  }

  // Add any remaining unsorted editions
  for (const slug of editionSlugs) {
    if (!sorted.includes(slug)) sorted.push(slug);
  }

  const editionMap = new Map(editions.map((e) => [e.slug, e]));
  return sorted.map((s) => editionMap.get(s)!).filter(Boolean);
}

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [character, allCharacters, handbookEntry, eras] = await Promise.all([
    getCharacterBySlug(slug),
    getCharacters(),
    getHandbookEntryBySlug(slug),
    getEras(),
  ]);
  if (!character) notFound();

  const editions = await getEditionsByCharacter(slug);
  const readingOrder = await buildCharacterReadingOrder(editions);

  const eraMap: Record<string, { slug: string; name: string; color: string }> = {};
  for (const e of eras) {
    eraMap[e.slug] = { slug: e.slug, name: e.name, color: e.color };
  }
  const isCharacterEntry = handbookEntry?.entry_type === "character";
  const characterData = isCharacterEntry ? (handbookEntry.data as CharacterHandbookData) : null;

  // Related characters: same team members
  const relatedCharacters = allCharacters
    .filter(
      (c) =>
        c.slug !== slug &&
        c.teams.some((t) => character.teams.includes(t))
    )
    .slice(0, 12);

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/characters"
        className="inline-flex items-center gap-1 text-sm mb-6 transition-colors hover:text-[var(--accent-red)]"
        style={{ color: "var(--text-tertiary)" }}
      >
        <ArrowLeft size={14} />
        Back to Characters
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-tight mb-2"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          {character.name}
        </h1>

        {character.aliases.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {character.aliases.map((alias) => (
              <span
                key={alias}
                className="px-2 py-0.5 rounded text-xs font-bold"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--accent-gold)",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {alias}
              </span>
            ))}
          </div>
        )}

        <p
          className="text-sm mb-3"
          style={{
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          First Appearance: {character.first_appearance_issue}
        </p>

        {character.teams.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <Users size={14} style={{ color: "var(--text-tertiary)" }} className="mt-0.5" />
            {character.teams.map((team) => (
              <Link
                key={team}
                href={`/characters?team=${encodeURIComponent(team)}`}
                className="px-2 py-0.5 rounded text-xs font-bold transition-colors hover:bg-[var(--bg-tertiary)]"
                style={{
                  color: "var(--accent-blue)",
                  border: "1px solid var(--accent-blue)",
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "0.75rem",
                }}
              >
                {team}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      <section
        className="rounded-lg border p-6 mb-8"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
        }}
      >
        <h2
          className="text-lg font-bold tracking-tight mb-3"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          About
        </h2>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {character.description}
        </p>
      </section>

      {/* Handbook Intelligence */}
      {handbookEntry && isCharacterEntry && characterData && (
        <section
          className="rounded-lg border p-6 mb-8"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-bold tracking-tight flex items-center gap-2"
              style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
            >
              <BookMarked size={18} style={{ color: "var(--accent-purple)" }} />
              Handbook Profile
            </h2>
            <div className="flex items-center gap-2">
              <ConfidenceScore score={handbookEntry.canon_confidence} />
              <Link
                href={`/handbook/${handbookEntry.slug}`}
                className="text-xs font-bold transition-colors hover:text-[var(--accent-red)]"
                style={{ color: "var(--accent-purple)" }}
              >
                Full Entry →
              </Link>
            </div>
          </div>

          <p className="text-sm mb-6" style={{ color: "var(--accent-gold)" }}>
            {handbookEntry.core_concept}
          </p>

          {/* Power Grid */}
          {characterData.power_grid && (
            <div className="mb-6">
              <h3
                className="text-xs font-bold uppercase mb-3"
                style={{ color: "var(--text-tertiary)" }}
              >
                Power Grid
              </h3>
              <PowerGridRadar grid={characterData.power_grid} />
            </div>
          )}

          {/* Abilities */}
          {characterData.abilities && characterData.abilities.length > 0 && (
            <div className="mb-6">
              <h3
                className="text-xs font-bold uppercase mb-2"
                style={{ color: "var(--text-tertiary)" }}
              >
                Abilities
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {characterData.abilities.map((ability) => (
                  <span
                    key={ability}
                    className="px-2 py-0.5 rounded text-xs font-bold"
                    style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                  >
                    {ability}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Status by Era */}
          {handbookEntry.status_by_era.length > 0 && (
            <div className="mb-6">
              <h3
                className="text-xs font-bold uppercase mb-3"
                style={{ color: "var(--text-tertiary)" }}
              >
                Status Through the Eras
              </h3>
              <StatusTimeline statuses={handbookEntry.status_by_era} eraMap={eraMap} />
            </div>
          )}

          {/* Retcon History */}
          {handbookEntry.retcon_history.length > 0 && (
            <div>
              <h3
                className="text-xs font-bold uppercase mb-3"
                style={{ color: "var(--text-tertiary)" }}
              >
                Retcon History
              </h3>
              <RetconTimeline retcons={handbookEntry.retcon_history} />
            </div>
          )}
        </section>
      )}

      {/* Character Reading Order */}
      {readingOrder.length > 0 && (
        <section className="mb-8">
          <h2
            className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            <BookOpen size={18} style={{ color: "var(--accent-gold)" }} />
            Reading Order ({readingOrder.length} Editions)
          </h2>
          <div className="space-y-2">
            {readingOrder.map((edition, idx) => (
              <Link
                key={edition.slug}
                href={`/edition/${edition.slug}`}
                className="block group"
              >
                <div
                  className="rounded-lg border p-3 sm:p-4 transition-all hover:border-[var(--accent-red)] hover:shadow-lg hover:shadow-[var(--accent-red)]/5 flex items-center gap-3"
                  style={{
                    background: "var(--bg-secondary)",
                    borderColor: "var(--border-default)",
                  }}
                >
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: "var(--bg-tertiary)",
                      color: "var(--text-tertiary)",
                      fontFamily: "var(--font-geist-mono), monospace",
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold group-hover:text-[var(--accent-red)] transition-colors truncate">
                      {edition.title}
                    </h4>
                    {edition.issues_collected && (
                      <p
                        className="text-xs truncate"
                        style={{
                          color: "var(--text-tertiary)",
                          fontFamily: "var(--font-geist-mono), monospace",
                        }}
                      >
                        {edition.issues_collected}
                      </p>
                    )}
                  </div>
                  <span
                    className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-bold"
                    style={{
                      color:
                        edition.importance === "essential"
                          ? "var(--importance-essential)"
                          : edition.importance === "recommended"
                          ? "var(--importance-recommended)"
                          : "var(--importance-supplemental)",
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: "0.75rem",
                    }}
                  >
                    {edition.importance.toUpperCase()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Related Characters */}
      {relatedCharacters.length > 0 && (
        <section className="mb-8">
          <h2
            className="text-lg font-bold tracking-tight mb-4"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            Related Characters
          </h2>
          <div className="flex flex-wrap gap-2">
            {relatedCharacters.map((rc) => (
              <Link
                key={rc.slug}
                href={`/character/${rc.slug}`}
                className="px-3 py-2 rounded-lg text-sm border transition-all hover:border-[var(--accent-blue)] hover:shadow-lg hover:shadow-[var(--accent-blue)]/5"
                style={{
                  background: "var(--bg-secondary)",
                  borderColor: "var(--border-default)",
                }}
              >
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                  {rc.name}
                </span>
                {rc.aliases.length > 0 && (
                  <span
                    className="ml-1 text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    ({rc.aliases[0]})
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
