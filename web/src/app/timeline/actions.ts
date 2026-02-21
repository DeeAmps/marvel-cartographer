"use server";

import {
  getEditionsByEra,
  getEvents,
  getReadingPaths,
  getCharacters,
  getEraChapters,
} from "@/lib/data";
import type { CollectedEdition, Event, EraChapter } from "@/lib/types";

export interface EraData {
  editions: CollectedEdition[];
  events: Event[];
  chapters: EraChapter[];
  debutCharacters: { slug: string; name: string; first_appearance_issue: string }[];
  relatedPaths: { slug: string; name: string; category: string }[];
}

export async function getEraData(eraSlug: string): Promise<EraData> {
  const [editionsByEra, allEvents, allPaths, allCharacters, allChapters] =
    await Promise.all([
      getEditionsByEra(),
      getEvents(),
      getReadingPaths(),
      getCharacters(),
      getEraChapters(),
    ]);

  const editions = editionsByEra[eraSlug] || [];
  const events = allEvents.filter((e) => e.era_slug === eraSlug);
  const chapters = allChapters
    .filter((c) => c.era_id === eraSlug)
    .sort((a, b) => a.number - b.number);

  // Find characters who debuted in editions from this era
  const editionTitles = editions.map((e) => (e.title ?? "").toLowerCase());
  const editionSynopses = editions.map((e) => (e.synopsis ?? "").toLowerCase());
  const debutCharacters = allCharacters
    .filter((c) => {
      if (!c.first_appearance_issue) return false;
      const fa = c.first_appearance_issue.toLowerCase();
      return (
        editionTitles.some((t) => t.includes(fa.split("#")[0]?.trim() || "___")) ||
        editionSynopses.some((s) => s.includes(c.name.toLowerCase()) && s.includes("first appear"))
      );
    })
    .slice(0, 10)
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      first_appearance_issue: c.first_appearance_issue,
    }));

  // Find reading paths that include editions from this era
  const eraEditionSlugs = new Set(editions.map((e) => e.slug));
  const relatedPaths = allPaths
    .filter((p) =>
      p.entries.some((entry) => entry.edition?.slug && eraEditionSlugs.has(entry.edition.slug))
    )
    .slice(0, 8)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category || p.path_type || "",
    }));

  return { editions, events, chapters, debutCharacters, relatedPaths };
}

export async function getExpandedEraEditions(
  eraSlug: string,
  importance: string
): Promise<CollectedEdition[]> {
  const editionsByEra = await getEditionsByEra();
  const editions = editionsByEra[eraSlug] || [];
  return editions.filter((e) => e.importance === importance);
}
