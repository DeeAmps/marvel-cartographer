import type { ImportanceLevel } from "@/lib/types";

// ============================================================
// Types
// ============================================================

export interface PathSummaryEntry {
  edition_slug: string;
  title: string;
  importance: string;
  print_status: string;
  is_optional: boolean;
}

export interface PathSummary {
  slug: string;
  name: string;
  path_type: string;
  difficulty: string;
  entries: PathSummaryEntry[];
}

export interface PathMatch {
  path: PathSummary;
  ownedCount: number;
  totalCount: number;
  requiredOwnedCount: number;
  requiredTotalCount: number;
  completionPct: number;
  gapCount: number;
  ownedSlugs: string[];
  missingSlugs: string[];
}

interface ConnectionForSort {
  source_slug: string;
  target_slug: string;
  connection_type: string;
  strength: number;
}

interface EditionForSort {
  slug: string;
  era_number: number;
  importance: string;
  title: string;
}

// ============================================================
// Path Matching
// ============================================================

const IMPORTANCE_ORDER: Record<string, number> = {
  essential: 0,
  recommended: 1,
  supplemental: 2,
  completionist: 3,
};

export function matchPathsToCollection(
  paths: PathSummary[],
  ownedSlugs: Set<string>
): PathMatch[] {
  return paths
    .map((path) => {
      const total = path.entries.length;
      const owned = path.entries.filter((e) => ownedSlugs.has(e.edition_slug));
      const required = path.entries.filter((e) => !e.is_optional);
      const requiredOwned = required.filter((e) =>
        ownedSlugs.has(e.edition_slug)
      );
      const missing = path.entries.filter(
        (e) => !ownedSlugs.has(e.edition_slug)
      );

      const completionPct =
        total > 0 ? Math.round((owned.length / total) * 100) : 0;

      return {
        path,
        ownedCount: owned.length,
        totalCount: total,
        requiredOwnedCount: requiredOwned.length,
        requiredTotalCount: required.length,
        completionPct,
        gapCount: missing.length,
        ownedSlugs: owned.map((e) => e.edition_slug),
        missingSlugs: missing.map((e) => e.edition_slug),
      };
    })
    .filter((m) => m.ownedCount > 0 || m.totalCount > 0)
    .sort((a, b) => {
      // 100% complete paths first, then by completion desc
      if (a.completionPct === 100 && b.completionPct !== 100) return -1;
      if (b.completionPct === 100 && a.completionPct !== 100) return 1;
      return b.completionPct - a.completionPct;
    });
}

// ============================================================
// Topological Sort (Kahn's Algorithm)
// ============================================================

const SORT_CONNECTION_TYPES = new Set([
  "leads_to",
  "recommended_after",
  "prerequisite",
  "spin_off",
]);

function editionSortKey(e: EditionForSort): string {
  const imp = IMPORTANCE_ORDER[e.importance] ?? 99;
  // Pad numbers for correct string sorting
  return `${String(e.era_number).padStart(3, "0")}-${imp}-${e.title.toLowerCase()}`;
}

export function computeReadingOrder(
  ownedSlugs: Set<string>,
  editionMap: Map<string, EditionForSort>,
  connections: ConnectionForSort[]
): string[] {
  if (ownedSlugs.size === 0) return [];

  // Filter connections to only edges where both source and target are owned
  const relevantEdges = connections.filter(
    (c) =>
      SORT_CONNECTION_TYPES.has(c.connection_type) &&
      ownedSlugs.has(c.source_slug) &&
      ownedSlugs.has(c.target_slug)
  );

  // Build adjacency list and in-degree map
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const slug of ownedSlugs) {
    adj.set(slug, []);
    inDegree.set(slug, 0);
  }

  for (const edge of relevantEdges) {
    adj.get(edge.source_slug)!.push(edge.target_slug);
    inDegree.set(
      edge.target_slug,
      (inDegree.get(edge.target_slug) || 0) + 1
    );
  }

  // Priority queue: all nodes with in-degree 0
  const queue: string[] = [];
  for (const slug of ownedSlugs) {
    if ((inDegree.get(slug) || 0) === 0) {
      queue.push(slug);
    }
  }

  // Sort queue by era/importance/title
  const sortBySortKey = (a: string, b: string) => {
    const ea = editionMap.get(a);
    const eb = editionMap.get(b);
    if (!ea || !eb) return 0;
    return editionSortKey(ea).localeCompare(editionSortKey(eb));
  };

  queue.sort(sortBySortKey);

  const result: string[] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (visited.has(node)) continue;
    visited.add(node);
    result.push(node);

    const neighbors = adj.get(node) || [];
    const newReady: string[] = [];

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg <= 0) {
        newReady.push(neighbor);
      }
    }

    // Insert newly ready nodes into queue maintaining sort order
    if (newReady.length > 0) {
      newReady.sort(sortBySortKey);
      queue.push(...newReady);
      queue.sort(sortBySortKey);
    }
  }

  // Handle any remaining nodes (cycles) - append sorted by era/importance
  const remaining = [...ownedSlugs].filter((s) => !visited.has(s));
  if (remaining.length > 0) {
    remaining.sort(sortBySortKey);
    result.push(...remaining);
  }

  return result;
}
