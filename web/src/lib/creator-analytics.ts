import type {
  CollectedEdition,
  Era,
  Creator,
  ImportanceLevel,
} from "./types";
import type { EditionCreatorRow } from "./data";

// ============================================================
// Types
// ============================================================

export interface CreatorDNA {
  impactScore: number;
  totalEditions: number;
  eraBreakdown: { era: string; eraSlug: string; count: number; color: string }[];
  formatBreakdown: { format: string; count: number }[];
  topCollaborators: { name: string; slug: string; sharedCount: number }[];
  signatureThemes: string[];
}

// ============================================================
// Computation
// ============================================================

// Words to exclude from theme extraction
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
  "be", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "shall", "can", "need", "dare",
  "that", "this", "these", "those", "i", "you", "he", "she", "it", "we",
  "they", "me", "him", "her", "us", "them", "my", "your", "his", "its",
  "our", "their", "what", "which", "who", "whom", "whose", "when",
  "where", "why", "how", "all", "each", "every", "both", "few", "more",
  "most", "other", "some", "such", "no", "nor", "not", "only", "own",
  "same", "so", "than", "too", "very", "just", "because", "if", "then",
  "about", "up", "out", "into", "through", "during", "before", "after",
  "above", "below", "between", "under", "again", "further", "once",
  "new", "first", "also", "one", "two", "three", "vol", "omnibus",
  "collection", "complete", "issue", "issues", "series", "story",
  "marvel", "comics", "comic", "annual", "#1", "#2", "#3", "#4", "#5",
]);

export function computeCreatorDNA(
  editions: CollectedEdition[],
  allEditionCreators: EditionCreatorRow[],
  creators: Creator[],
  eras: Era[],
  creatorId: string
): CreatorDNA {
  const eraMap = new Map(eras.map((e) => [e.slug, e]));
  const eraIdToSlug = new Map(eras.map((e) => [e.id, e.slug]));
  const creatorMap = new Map(creators.map((c) => [c.id, c]));

  // Impact Score: % essential editions
  const essentialCount = editions.filter(
    (e) => e.importance === "essential"
  ).length;
  const impactScore =
    editions.length > 0
      ? Math.round((essentialCount / editions.length) * 100)
      : 0;

  // Era Breakdown
  const eraCounts = new Map<string, number>();
  for (const edition of editions) {
    const eraSlug = edition.era_slug || eraIdToSlug.get(edition.era_id) || "unknown";
    eraCounts.set(eraSlug, (eraCounts.get(eraSlug) || 0) + 1);
  }
  const eraBreakdown = Array.from(eraCounts.entries())
    .map(([eraSlug, count]) => {
      const era = eraMap.get(eraSlug);
      return {
        era: era?.name || eraSlug.replace(/-/g, " "),
        eraSlug,
        count,
        color: era?.color || "#666",
      };
    })
    .sort((a, b) => b.count - a.count);

  // Format Breakdown
  const formatCounts = new Map<string, number>();
  for (const edition of editions) {
    const format = edition.format.replace(/_/g, " ");
    formatCounts.set(format, (formatCounts.get(format) || 0) + 1);
  }
  const formatBreakdown = Array.from(formatCounts.entries())
    .map(([format, count]) => ({ format, count }))
    .sort((a, b) => b.count - a.count);

  // Top Collaborators
  const editionIds = new Set(editions.map((e) => e.id));
  const collaboratorCounts = new Map<string, number>();

  for (const ec of allEditionCreators) {
    if (editionIds.has(ec.edition_id) && ec.creator_id !== creatorId) {
      collaboratorCounts.set(
        ec.creator_id,
        (collaboratorCounts.get(ec.creator_id) || 0) + 1
      );
    }
  }

  const topCollaborators = Array.from(collaboratorCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([collabId, sharedCount]) => {
      const collab = creatorMap.get(collabId);
      return {
        name: collab?.name || "Unknown",
        slug: collab?.slug || "",
        sharedCount,
      };
    })
    .filter((c) => c.slug);

  // Signature Themes: keyword extraction from synopses
  const wordFreq = new Map<string, number>();
  for (const edition of editions) {
    const text = `${edition.synopsis} ${edition.connection_notes || ""}`.toLowerCase();
    const words = text.match(/[a-z'-]+/g) || [];
    for (const word of words) {
      if (word.length < 3 || STOP_WORDS.has(word)) continue;
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }

  const signatureThemes = Array.from(wordFreq.entries())
    .filter(([, count]) => count >= 2) // Must appear at least twice
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);

  return {
    impactScore,
    totalEditions: editions.length,
    eraBreakdown,
    formatBreakdown,
    topCollaborators,
    signatureThemes,
  };
}
