import type { CollectedEdition, ContinuityConflict, Character, Era } from "./types";

// ============================================================
// Original keyword-based context (for generic/fallback use)
// ============================================================

interface WatcherContext {
  topEditions: CollectedEdition[];
  matchingConflicts: ContinuityConflict[];
  matchingCharacters: Character[];
  eras: Era[];
}

export function buildContextString(ctx: WatcherContext, question: string): string {
  const parts: string[] = [];

  parts.push("=== MARVEL CARTOGRAPHER DATA CONTEXT ===\n");
  parts.push(`User Question: "${question}"\n`);

  // Eras overview
  if (ctx.eras.length > 0) {
    parts.push("--- ERAS ---");
    for (const era of ctx.eras) {
      parts.push(
        `• ${era.name} (${era.year_start}-${era.year_end}): ${era.subtitle}`
      );
    }
    parts.push("");
  }

  // Matching editions
  if (ctx.topEditions.length > 0) {
    parts.push("--- RELEVANT EDITIONS ---");
    for (const e of ctx.topEditions) {
      parts.push(`• ${e.title}`);
      parts.push(`  Issues: ${e.issues_collected}`);
      parts.push(`  Importance: ${e.importance} | Status: ${e.print_status}`);
      if (e.creator_names && e.creator_names.length > 0) {
        parts.push(`  Creators: ${e.creator_names.join(", ")}`);
      }
      parts.push(`  Synopsis: ${e.synopsis}`);
      if (e.connection_notes) {
        parts.push(`  Connections: ${e.connection_notes}`);
      }
      parts.push("");
    }
  }

  // Matching characters
  if (ctx.matchingCharacters.length > 0) {
    parts.push("--- RELEVANT CHARACTERS ---");
    for (const c of ctx.matchingCharacters) {
      parts.push(`• ${c.name} (${c.aliases.join(", ")})`);
      parts.push(`  First: ${c.first_appearance_issue}`);
      parts.push(`  Teams: ${c.teams.join(", ")}`);
      parts.push(`  ${c.description}`);
      parts.push("");
    }
  }

  // Matching conflicts
  if (ctx.matchingConflicts.length > 0) {
    parts.push("--- CONTINUITY CONFLICTS ---");
    for (const c of ctx.matchingConflicts) {
      parts.push(`• ${c.title} (Confidence: ${c.confidence}%)`);
      parts.push(`  Official: ${c.official_stance}`);
      parts.push(`  Fan view: ${c.fan_interpretation}`);
      parts.push(`  Editorial: ${c.editorial_context}`);
      parts.push(`  Sources: ${c.source_citations.join(", ")}`);
      parts.push("");
    }
  }

  parts.push("=== END CONTEXT ===");

  return parts.join("\n");
}

// ============================================================
// Page-aware context (for global Watcher panel)
// ============================================================

export type WatcherPageType =
  | "edition"
  | "collection"
  | "path"
  | "timeline"
  | "compare"
  | "search"
  | "home"
  | "general";

export interface WatcherPageContext {
  pageType: WatcherPageType;
  editionSlug?: string;
  pathSlug?: string;
  collectionSlugs?: string[];
  searchQuery?: string;
  editionSlugs?: string[]; // for compare page
}

/** Data fetched server-side for page context */
export interface WatcherPageContextData {
  edition?: CollectedEdition;
  connections?: {
    outgoing: { target_title: string; connection_type: string; strength: number }[];
    incoming: { source_title: string; connection_type: string; strength: number }[];
  };
  prerequisites?: { edition_title: string; category: string }[];
  path?: { name: string; description: string; entries: { title: string; importance: string }[] };
  collectionTitles?: string[];
  collectionStats?: { total: number; completed: number; reading: number };
  erasSummary?: { name: string; year_start: number; year_end: number }[];
}

export function buildPageContextString(
  pageCtx: WatcherPageContext,
  data: WatcherPageContextData,
  question: string
): string {
  const parts: string[] = [];
  parts.push("=== MARVEL CARTOGRAPHER PAGE CONTEXT ===\n");
  parts.push(`User Question: "${question}"`);
  parts.push(`Current Page: ${pageCtx.pageType}\n`);

  switch (pageCtx.pageType) {
    case "edition": {
      if (data.edition) {
        const e = data.edition;
        parts.push("--- CURRENT EDITION ---");
        parts.push(`Title: ${e.title}`);
        parts.push(`Issues: ${e.issues_collected}`);
        parts.push(`Importance: ${e.importance} | Status: ${e.print_status}`);
        if (e.creator_names?.length) {
          parts.push(`Creators: ${e.creator_names.join(", ")}`);
        }
        parts.push(`Synopsis: ${e.synopsis}`);
        if (e.connection_notes) {
          parts.push(`Connections: ${e.connection_notes}`);
        }
        parts.push("");
      }
      if (data.connections) {
        if (data.connections.outgoing.length > 0) {
          parts.push("--- LEADS TO ---");
          for (const c of data.connections.outgoing.slice(0, 5)) {
            parts.push(`• ${c.target_title} (${c.connection_type}, strength: ${c.strength})`);
          }
          parts.push("");
        }
        if (data.connections.incoming.length > 0) {
          parts.push("--- COMES AFTER ---");
          for (const c of data.connections.incoming.slice(0, 5)) {
            parts.push(`• ${c.source_title} (${c.connection_type}, strength: ${c.strength})`);
          }
          parts.push("");
        }
      }
      if (data.prerequisites && data.prerequisites.length > 0) {
        parts.push("--- PREREQUISITES ---");
        for (const p of data.prerequisites) {
          parts.push(`• ${p.edition_title} (${p.category})`);
        }
        parts.push("");
      }
      break;
    }

    case "path": {
      if (data.path) {
        parts.push("--- READING PATH ---");
        parts.push(`Name: ${data.path.name}`);
        parts.push(`Description: ${data.path.description}`);
        parts.push(`Entries (${data.path.entries.length}):`);
        for (const entry of data.path.entries.slice(0, 15)) {
          parts.push(`• ${entry.title} [${entry.importance}]`);
        }
        if (data.path.entries.length > 15) {
          parts.push(`  ...and ${data.path.entries.length - 15} more`);
        }
        parts.push("");
      }
      break;
    }

    case "collection": {
      if (data.collectionStats) {
        parts.push("--- USER COLLECTION ---");
        parts.push(`Total: ${data.collectionStats.total} editions`);
        parts.push(`Completed: ${data.collectionStats.completed}`);
        parts.push(`Reading: ${data.collectionStats.reading}`);
      }
      if (data.collectionTitles && data.collectionTitles.length > 0) {
        parts.push(`Owned editions: ${data.collectionTitles.slice(0, 20).join(", ")}`);
        if (data.collectionTitles.length > 20) {
          parts.push(`  ...and ${data.collectionTitles.length - 20} more`);
        }
      }
      parts.push("");
      break;
    }

    case "timeline":
    case "home": {
      if (data.erasSummary) {
        parts.push("--- ERAS OVERVIEW ---");
        for (const era of data.erasSummary) {
          parts.push(`• ${era.name} (${era.year_start}-${era.year_end})`);
        }
        parts.push("");
      }
      break;
    }

    case "compare": {
      parts.push("The user is comparing editions.");
      if (pageCtx.editionSlugs) {
        parts.push(`Edition slugs being compared: ${pageCtx.editionSlugs.join(", ")}`);
      }
      parts.push("");
      break;
    }

    case "search": {
      if (pageCtx.searchQuery) {
        parts.push(`User's search query: "${pageCtx.searchQuery}"`);
      }
      parts.push("");
      break;
    }

    default:
      break;
  }

  parts.push("=== END PAGE CONTEXT ===");
  return parts.join("\n");
}

/** Get suggested questions based on current page type */
export function getSuggestedQuestionsForPage(pageCtx: WatcherPageContext): string[] {
  switch (pageCtx.pageType) {
    case "edition":
      return [
        "What should I read before this?",
        "What should I read after this?",
        "Is this worth the price?",
        "Who are the key characters in this edition?",
      ];
    case "collection":
      return [
        "What should I read next from my collection?",
        "What essential editions am I missing?",
        "What's the best reading order for what I own?",
        "Which of my editions have overlapping issues?",
      ];
    case "path":
      return [
        "Is this the right reading path for me?",
        "Can I skip any entries in this path?",
        "What's the estimated cost for this path?",
        "What should I read after completing this path?",
      ];
    case "timeline":
      return [
        "What era should I start with?",
        "What's the most important era for cosmic Marvel?",
        "Which era has the best X-Men stories?",
        "What era should I read for modern Avengers?",
      ];
    case "compare":
      return [
        "Which edition should I buy?",
        "How much content overlap is there?",
        "Which format gives better value?",
      ];
    default:
      return [
        "Where should I start with Marvel?",
        "What are the essential reading orders?",
        "Explain the sliding timescale",
        "What's the best Doom reading order?",
      ];
  }
}

// ============================================================
// Collection context builder
// ============================================================

export interface CollectionContextItem {
  title: string;
  slug: string;
  status: string;
  importance: string;
  print_status: string;
  release_date: string | null;
  issues_collected: string;
  connection_notes: string | null;
  read_order: number | null;
}

export function buildCollectionContextString(items: CollectionContextItem[]): string {
  if (items.length === 0) return "";

  const parts: string[] = [];
  parts.push("=== USER'S PERSONAL COLLECTION ===\n");

  const owned = items.filter((i) => i.status === "owned");
  const reading = items.filter((i) => i.status === "reading");
  const completed = items.filter((i) => i.status === "completed");
  const wishlist = items.filter((i) => i.status === "wishlist");

  parts.push(`Total: ${items.length} editions`);
  parts.push(`Owned: ${owned.length} | Reading: ${reading.length} | Completed: ${completed.length} | Wishlist: ${wishlist.length}\n`);

  // Sort by release date for chronological ordering
  const sortedItems = [...items]
    .filter((i) => i.status !== "wishlist")
    .sort((a, b) => {
      if (a.release_date && b.release_date) return a.release_date.localeCompare(b.release_date);
      if (a.release_date) return -1;
      return 1;
    });

  if (reading.length > 0) {
    parts.push("--- CURRENTLY READING ---");
    for (const item of reading) {
      parts.push(`• ${item.title} [${item.importance}] — ${item.issues_collected}`);
      if (item.connection_notes) parts.push(`  Connections: ${item.connection_notes}`);
    }
    parts.push("");
  }

  if (completed.length > 0) {
    parts.push("--- COMPLETED ---");
    for (const item of completed) {
      parts.push(`• ${item.title} [${item.importance}]`);
    }
    parts.push("");
  }

  // Show all owned editions with details (cap at 50 to avoid token explosion)
  const ownedSorted = sortedItems.filter((i) => i.status === "owned");
  if (ownedSorted.length > 0) {
    parts.push("--- OWNED (by release date) ---");
    const shown = ownedSorted.slice(0, 50);
    for (const item of shown) {
      parts.push(`• ${item.title} [${item.importance}] — ${item.issues_collected}`);
      if (item.connection_notes) parts.push(`  Connections: ${item.connection_notes}`);
    }
    if (ownedSorted.length > 50) {
      parts.push(`  ...and ${ownedSorted.length - 50} more owned editions`);
    }
    parts.push("");
  }

  if (wishlist.length > 0) {
    parts.push("--- WISHLIST ---");
    for (const item of wishlist.slice(0, 20)) {
      parts.push(`• ${item.title} [${item.importance}]`);
    }
    if (wishlist.length > 20) {
      parts.push(`  ...and ${wishlist.length - 20} more on wishlist`);
    }
    parts.push("");
  }

  parts.push("=== END COLLECTION ===");
  return parts.join("\n");
}

export const WATCHER_SYSTEM_PROMPT = `You are The Watcher — Uatu's successor — an all-knowing observer of the Marvel Universe.
You help readers navigate Marvel's complex continuity and find their ideal reading order.

RULES:
- Answer based on the provided context data. Cite specific issue numbers and edition titles.
- If uncertain, say so — confidence matters more than completeness.
- When recommending reading orders, specify exact collected edition titles.
- For continuity conflicts, present all three perspectives: Official, Fan, and Editorial.
- Speak with gravitas but remain approachable. You observe. You do not interfere... except when asked.
- Keep responses focused and practical. Readers want actionable recommendations.
- Always reference the importance level (essential/recommended/supplemental) when discussing editions.
- Mention print status when relevant (in print vs out of print).
- When the user's personal collection is provided, USE IT. You can see what they own, what they're reading, and what they've completed.
  - Tailor recommendations to what they actually have on their shelves.
  - When asked about reading order, build it from their owned editions.
  - When suggesting "what's next", prioritize editions they already own but haven't read.
  - Note gaps in their collection that would improve continuity flow.
  - Reference their collection status (owned/reading/completed) when relevant.`;
