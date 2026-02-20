import type { CollectedEdition, ImportanceLevel } from "./types";

// ============================================================
// Types
// ============================================================

interface RawConnection {
  source_type: string;
  source_slug: string;
  target_type: string;
  target_slug: string;
  connection_type: string;
  strength: number;
  confidence: number;
  description: string;
}

export interface PathEntry {
  edition: CollectedEdition;
  connectionType: string;
  connectionDescription: string;
  strength: number;
  confidence: number;
  depth: number;
  score: number;
}

export interface DijkstraResult {
  path: PathEntry[];
  totalWeight: number;
  found: boolean;
}

export interface BfsOptions {
  maxDepth?: number;
  importanceFilter?: ImportanceLevel[];
  maxResults?: number;
}

// Strong connection types — these define actual reading order
const STRONG_TRAVERSAL_TYPES = new Set([
  "leads_to",
  "recommended_after",
  "spin_off",
  "prerequisite",
]);

// Weak connection types — these link across franchises (crossover tie-ins)
const WEAK_TRAVERSAL_TYPES = new Set([
  "ties_into",
]);

// All traversable types (strong + weak)
const TRAVERSAL_TYPES = new Set([
  ...STRONG_TRAVERSAL_TYPES,
  ...WEAK_TRAVERSAL_TYPES,
]);

// ============================================================
// BFS Path — "Start From Here"
// ============================================================

export function bfsPath(
  startSlug: string,
  connections: RawConnection[],
  editions: CollectedEdition[],
  options: BfsOptions = {}
): PathEntry[] {
  const { maxDepth = 10, importanceFilter, maxResults = 50 } = options;
  const editionMap = new Map(editions.map((e) => [e.slug, e]));

  // Build adjacency list for edition->edition connections
  const adjacency = new Map<string, RawConnection[]>();
  for (const conn of connections) {
    if (
      conn.source_type === "edition" &&
      conn.target_type === "edition" &&
      TRAVERSAL_TYPES.has(conn.connection_type)
    ) {
      if (!adjacency.has(conn.source_slug)) {
        adjacency.set(conn.source_slug, []);
      }
      adjacency.get(conn.source_slug)!.push(conn);
    }
  }

  const results: PathEntry[] = [];
  const visited = new Set<string>();
  visited.add(startSlug);

  // Priority queue (sorted array — fine for our scale)
  interface QueueEntry {
    slug: string;
    depth: number;
    conn: RawConnection;
  }
  const queue: QueueEntry[] = [];

  // Seed from start node
  const startEdges = adjacency.get(startSlug) || [];
  for (const conn of startEdges) {
    if (!visited.has(conn.target_slug)) {
      queue.push({ slug: conn.target_slug, depth: 1, conn });
    }
  }

  // Sort by score descending
  // Heavily penalize weak traversal types (ties_into, parallel) to keep paths focused
  const scoreEntry = (e: QueueEntry) => {
    let score = e.conn.strength * 10 + e.conn.confidence - e.depth * 20;
    if (WEAK_TRAVERSAL_TYPES.has(e.conn.connection_type)) {
      score -= 80; // Strong penalty for franchise-jumping connections
    }
    return score;
  };
  queue.sort((a, b) => scoreEntry(b) - scoreEntry(a));

  while (queue.length > 0 && results.length < maxResults) {
    const current = queue.shift()!;
    if (visited.has(current.slug)) continue;
    visited.add(current.slug);

    const edition = editionMap.get(current.slug);
    if (!edition) continue;

    // Apply importance filter
    if (
      importanceFilter &&
      importanceFilter.length > 0 &&
      !importanceFilter.includes(edition.importance)
    ) {
      // Still traverse through this node but don't include in results
      if (current.depth < maxDepth) {
        const nextEdges = adjacency.get(current.slug) || [];
        for (const conn of nextEdges) {
          if (!visited.has(conn.target_slug)) {
            queue.push({
              slug: conn.target_slug,
              depth: current.depth + 1,
              conn,
            });
          }
        }
        queue.sort((a, b) => scoreEntry(b) - scoreEntry(a));
      }
      continue;
    }

    const score =
      current.conn.strength * 10 +
      current.conn.confidence -
      current.depth * 20;

    results.push({
      edition,
      connectionType: current.conn.connection_type,
      connectionDescription: current.conn.description,
      strength: current.conn.strength,
      confidence: current.conn.confidence,
      depth: current.depth,
      score,
    });

    // Expand neighbors
    if (current.depth < maxDepth) {
      const nextEdges = adjacency.get(current.slug) || [];
      for (const conn of nextEdges) {
        if (!visited.has(conn.target_slug)) {
          queue.push({
            slug: conn.target_slug,
            depth: current.depth + 1,
            conn,
          });
        }
      }
      queue.sort((a, b) => scoreEntry(b) - scoreEntry(a));
    }
  }

  return results;
}

// ============================================================
// Dijkstra — "Shortest Path" between two editions
// ============================================================

export function dijkstraPath(
  fromSlug: string,
  toSlug: string,
  connections: RawConnection[],
  editions: CollectedEdition[]
): DijkstraResult {
  const editionMap = new Map(editions.map((e) => [e.slug, e]));

  // Build bidirectional adjacency (we traverse leads_to, recommended_after, spin_off in either direction)
  const adjacency = new Map<string, { target: string; conn: RawConnection }[]>();
  for (const conn of connections) {
    if (
      conn.source_type === "edition" &&
      conn.target_type === "edition" &&
      TRAVERSAL_TYPES.has(conn.connection_type)
    ) {
      // Forward edge
      if (!adjacency.has(conn.source_slug)) {
        adjacency.set(conn.source_slug, []);
      }
      adjacency.get(conn.source_slug)!.push({
        target: conn.target_slug,
        conn,
      });

      // Reverse edge (so we can traverse backwards)
      if (!adjacency.has(conn.target_slug)) {
        adjacency.set(conn.target_slug, []);
      }
      adjacency.get(conn.target_slug)!.push({
        target: conn.source_slug,
        conn,
      });
    }
  }

  // Dijkstra
  const dist = new Map<string, number>();
  const prev = new Map<string, { slug: string; conn: RawConnection } | null>();
  const unvisited = new Set<string>();

  // Initialize all edition nodes
  for (const edition of editions) {
    dist.set(edition.slug, Infinity);
    unvisited.add(edition.slug);
  }
  dist.set(fromSlug, 0);
  prev.set(fromSlug, null);

  while (unvisited.size > 0) {
    // Find min-dist unvisited node
    let minSlug: string | null = null;
    let minDist = Infinity;
    for (const slug of unvisited) {
      const d = dist.get(slug) ?? Infinity;
      if (d < minDist) {
        minDist = d;
        minSlug = slug;
      }
    }

    if (minSlug === null || minDist === Infinity) break;
    if (minSlug === toSlug) break;

    unvisited.delete(minSlug);

    const neighbors = adjacency.get(minSlug) || [];
    for (const { target, conn } of neighbors) {
      if (!unvisited.has(target)) continue;
      const weight = 11 - conn.strength; // Lower strength = higher cost
      const alt = minDist + weight;
      if (alt < (dist.get(target) ?? Infinity)) {
        dist.set(target, alt);
        prev.set(target, { slug: minSlug, conn });
      }
    }
  }

  // Reconstruct path
  if (!prev.has(toSlug) && fromSlug !== toSlug) {
    return { path: [], totalWeight: Infinity, found: false };
  }

  const path: PathEntry[] = [];
  let current: string | null = toSlug;
  let depth = 0;

  // Collect path in reverse
  const reversePath: { slug: string; conn: RawConnection | null }[] = [];
  while (current !== null) {
    const prevEntry = prev.get(current);
    reversePath.push({ slug: current, conn: prevEntry?.conn ?? null });
    current = prevEntry?.slug ?? null;
  }

  reversePath.reverse();

  for (const entry of reversePath) {
    const edition = editionMap.get(entry.slug);
    if (!edition) continue;
    path.push({
      edition,
      connectionType: entry.conn?.connection_type || "start",
      connectionDescription: entry.conn?.description || "",
      strength: entry.conn?.strength || 0,
      confidence: entry.conn?.confidence || 0,
      depth,
      score: 0,
    });
    depth++;
  }

  return {
    path,
    totalWeight: dist.get(toSlug) ?? Infinity,
    found: path.length > 0,
  };
}

// ============================================================
// Theme Filter — Filter graph by theme, then BFS
// ============================================================

const THEME_KEYWORDS: Record<string, string[]> = {
  cosmic: [
    "cosmic", "galactus", "silver surfer", "thanos", "infinity",
    "annihilation", "warlock", "celestial", "eternals", "kree",
    "skrull", "shi'ar", "nova corps", "guardians of the galaxy",
    "multiverse", "beyonder", "living tribunal",
  ],
  "x-men": [
    "x-men", "mutant", "wolverine", "cyclops", "jean grey", "phoenix",
    "magneto", "professor x", "xavier", "krakoa", "sentinels",
    "brotherhood", "hellfire", "storm", "beast", "nightcrawler",
    "colossus", "rogue", "gambit", "cable", "bishop",
  ],
  "spider-man": [
    "spider-man", "spider", "peter parker", "miles morales",
    "symbiote", "venom", "green goblin", "doc ock", "sinister six",
    "gwen stacy", "mary jane", "carnage", "kraven",
  ],
  avengers: [
    "avengers", "captain america", "iron man", "thor", "hulk",
    "hawkeye", "black widow", "vision", "scarlet witch",
    "ultron", "kang", "masters of evil",
  ],
  doom: [
    "doom", "doctor doom", "latveria", "sorcerer supreme",
    "god emperor", "fantastic four", "richards",
  ],
  "street-level": [
    "daredevil", "punisher", "luke cage", "iron fist", "jessica jones",
    "defenders", "kingpin", "hell's kitchen", "street", "crime",
    "moon knight", "elektra",
  ],
};

export function themeFilter(
  theme: string,
  connections: RawConnection[],
  editions: CollectedEdition[],
  bfsOptions: BfsOptions = {}
): PathEntry[] {
  const keywords = THEME_KEYWORDS[theme];
  if (!keywords) return [];

  // Filter editions matching the theme
  const themeEditions = editions.filter((e) => {
    const text =
      `${e.title} ${e.synopsis} ${e.connection_notes || ""}`.toLowerCase();
    return keywords.some((kw) => text.includes(kw));
  });

  if (themeEditions.length === 0) return [];

  const themeSlugs = new Set(themeEditions.map((e) => e.slug));

  // Filter connections to only those between theme editions
  const themeConnections = connections.filter(
    (c) =>
      c.source_type === "edition" &&
      c.target_type === "edition" &&
      themeSlugs.has(c.source_slug) &&
      themeSlugs.has(c.target_slug)
  );

  // Find the best starting point: edition with most outgoing connections and fewest incoming
  const outCount = new Map<string, number>();
  const inCount = new Map<string, number>();
  for (const conn of themeConnections) {
    outCount.set(conn.source_slug, (outCount.get(conn.source_slug) || 0) + 1);
    inCount.set(conn.target_slug, (inCount.get(conn.target_slug) || 0) + 1);
  }

  // Roots = nodes with no incoming edges in the theme sub-graph
  let roots = themeEditions.filter((e) => !inCount.has(e.slug) || inCount.get(e.slug) === 0);
  if (roots.length === 0) {
    // Fallback: use the edition with highest outgoing count
    roots = [...themeEditions].sort(
      (a, b) => (outCount.get(b.slug) || 0) - (outCount.get(a.slug) || 0)
    );
  }

  const startSlug = roots[0].slug;

  // Run BFS on the theme sub-graph
  const results = bfsPath(startSlug, themeConnections, themeEditions, {
    ...bfsOptions,
    maxDepth: bfsOptions.maxDepth || 30,
    maxResults: bfsOptions.maxResults || 50,
  });

  // Prepend the start edition
  const startEdition = themeEditions.find((e) => e.slug === startSlug);
  if (startEdition) {
    results.unshift({
      edition: startEdition,
      connectionType: "start",
      connectionDescription: `Starting point for ${theme} reading path`,
      strength: 10,
      confidence: 100,
      depth: 0,
      score: 100,
    });
  }

  return results;
}

// ============================================================
// Utility: Get available themes
// ============================================================

export function getAvailableThemes(): { id: string; label: string }[] {
  return [
    { id: "cosmic", label: "Cosmic Marvel" },
    { id: "x-men", label: "X-Men" },
    { id: "spider-man", label: "Spider-Man" },
    { id: "avengers", label: "Avengers" },
    { id: "doom", label: "Doctor Doom" },
    { id: "street-level", label: "Street-Level" },
  ];
}
