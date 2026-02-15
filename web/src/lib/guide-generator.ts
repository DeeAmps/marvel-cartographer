import type { CollectedEdition, GeneratedGuide, ImportanceLevel } from "./types";

interface GuideInput {
  query: string;
  editions: CollectedEdition[];
  characters: { slug: string; name: string; aliases: string[] }[];
  events: { slug: string; name: string; tags: string[] }[];
  arcs: { slug: string; name: string; tags: string[] }[];
  connections: { source_slug: string; target_slug: string; strength: number }[];
  editionCharacterMap: Map<string, string[]>; // edition_slug -> character_slugs
}

const IMPORTANCE_WEIGHT: Record<ImportanceLevel, number> = {
  essential: 4,
  recommended: 3,
  supplemental: 2,
  completionist: 1,
};

export function generateGuide(input: GuideInput): GeneratedGuide {
  const q = input.query.toLowerCase().trim();

  // Find matching characters
  const matchedCharacters = input.characters.filter((c) => {
    const terms = [c.name.toLowerCase(), ...c.aliases.map((a) => a.toLowerCase())];
    return terms.some((t) => t.includes(q) || q.includes(t));
  });

  // Find matching events
  const matchedEvents = input.events.filter((e) => {
    return (
      e.name.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  // Find matching arcs
  const matchedArcs = input.arcs.filter((a) => {
    return (
      a.name.toLowerCase().includes(q) ||
      a.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  // Score each edition
  const scores = new Map<string, number>();
  const matchedCharSlugs = new Set(matchedCharacters.map((c) => c.slug));
  const matchedEventNames = new Set(matchedEvents.map((e) => e.name.toLowerCase()));

  for (const edition of input.editions) {
    let score = 0;

    // Title match
    if (edition.title.toLowerCase().includes(q)) {
      score += 10;
    }

    // Synopsis match
    if (edition.synopsis.toLowerCase().includes(q)) {
      score += 5;
    }

    // Connection notes match
    if (edition.connection_notes?.toLowerCase().includes(q)) {
      score += 3;
    }

    // Character match via editionCharacterMap
    const edChars = input.editionCharacterMap.get(edition.slug) || [];
    const charMatchCount = edChars.filter((cs) => matchedCharSlugs.has(cs)).length;
    if (charMatchCount > 0) {
      score += charMatchCount * 4;
    }

    // Character name in synopsis
    for (const c of matchedCharacters) {
      const terms = [c.name, ...c.aliases];
      for (const term of terms) {
        if (term.length >= 4 && edition.synopsis.toLowerCase().includes(term.toLowerCase())) {
          score += 3;
        }
      }
    }

    // Event match in synopsis
    for (const eName of matchedEventNames) {
      if (edition.synopsis.toLowerCase().includes(eName)) {
        score += 4;
      }
    }

    // Importance weight
    score += (IMPORTANCE_WEIGHT[edition.importance] || 1) * 3;

    // Connection strength bonus
    const editionConnections = input.connections.filter(
      (c) => c.source_slug === edition.slug || c.target_slug === edition.slug
    );
    for (const conn of editionConnections) {
      const otherSlug = conn.source_slug === edition.slug ? conn.target_slug : conn.source_slug;
      if (scores.has(otherSlug)) {
        score += conn.strength * 0.5;
      }
    }

    if (score > 0) {
      scores.set(edition.slug, score);
    }
  }

  // Sort by score and tier
  const scored = Array.from(scores.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([slug]) => input.editions.find((e) => e.slug === slug)!)
    .filter(Boolean);

  const essential = scored.slice(0, 5);
  const recommended = scored.slice(5, 15);
  const completionist = scored.slice(15, 30);

  const allGuide = [...essential, ...recommended, ...completionist];
  const estimatedCost = allGuide
    .filter((e) => e.print_status === "in_print" && e.cover_price)
    .reduce((sum, e) => sum + (e.cover_price || 0), 0);

  // Generate a nice title
  const title = matchedCharacters.length > 0
    ? `The Complete ${matchedCharacters[0].name} Reading Guide`
    : matchedEvents.length > 0
    ? `${matchedEvents[0].name} Reading Guide`
    : `"${input.query}" Reading Guide`;

  const description = matchedCharacters.length > 0
    ? `Everything you need to read about ${matchedCharacters[0].name}, from essential stories to deep cuts.`
    : matchedEvents.length > 0
    ? `Complete reading guide for ${matchedEvents[0].name} and its tie-ins.`
    : `Collected editions matching "${input.query}", ranked by relevance.`;

  return {
    query: input.query,
    title,
    description,
    essential,
    recommended,
    completionist,
    total_editions: allGuide.length,
    estimated_cost: Math.round(estimatedCost * 100) / 100,
    matched_characters: matchedCharacters.map((c) => c.name),
    matched_events: matchedEvents.map((e) => e.name),
    matched_arcs: matchedArcs.map((a) => a.name),
  };
}
