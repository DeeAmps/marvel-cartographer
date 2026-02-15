import { createClient } from "@supabase/supabase-js";
import type {
  Era,
  EraChapter,
  CollectedEdition,
  Connection,
  ContinuityConflict,
  ReadingPath,
  Resource,
  Retailer,
  Character,
  Creator,
  StoryArc,
  Event,
  EventPhase,
  EventEdition,
  ReadingOrderEntry,
  Universe,
  SearchFilters,
  GraphData,
  GraphNode,
  GraphEdge,
  TriviaQuestion,
  HandbookEntry,
  DailyIssue,
  ImportanceLevel,
  MCUContent,
  MCUComicMapping,
  Debate,
  DebateVote,
  DebateEvidence,
  InfinityTheme,
} from "./types";

// ============================================================
// Supabase server-side client
// ============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================
// Cache
// ============================================================

// ============================================================
// Supabase cache layer
// ============================================================

const sbCache = new Map<string, { data: unknown; timestamp: number }>();
const SB_CACHE_TTL = 300_000; // 5 minutes

async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const cached = sbCache.get(key);
  if (cached && Date.now() - cached.timestamp < SB_CACHE_TTL) {
    return cached.data as T;
  }
  const data = await queryFn();
  sbCache.set(key, { data, timestamp: Date.now() });
  return data;
}

// ============================================================
// Paginated fetch helper — Supabase caps at 1000 rows per request
// ============================================================

async function paginatedFetch(
  table: string,
  selectColumns: string = "*",
  pageSize: number = 1000
): Promise<Record<string, unknown>[]> {
  const allRows: Record<string, unknown>[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(selectColumns)
      .range(offset, offset + pageSize - 1);
    if (error) {
      console.error(`paginatedFetch(${table}) error:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allRows.push(...(data as unknown as Record<string, unknown>[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return allRows;
}

// ============================================================
// ERAS
// ============================================================

export async function getEras(): Promise<Era[]> {
  return cachedQuery("eras", async () => {
    const { data, error } = await supabase
      .from("eras")
      .select("*")
      .order("number");
    if (error) {
      console.error("getEras error:", error.message);
      return [];
    }
    return (data || []).map((e: Record<string, unknown>) => ({
      id: e.id as string,
      slug: e.slug as string,
      name: e.name as string,
      number: e.number as number,
      year_start: e.year_start as number,
      year_end: e.year_end as number,
      subtitle: (e.subtitle as string) || "",
      description: (e.description as string) || "",
      color: (e.color as string) || "#333",
      guide_status: (e.guide_status as Era["guide_status"]) || undefined,
    }));
  });
}

// ============================================================
// COLLECTED EDITIONS
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

function mapEditionRow(e: Record<string, unknown>): CollectedEdition {
  return {
    id: e.id as string,
    slug: e.slug as string,
    title: e.title as string,
    format: (e.format as CollectedEdition["format"]) || "omnibus",
    issues_collected: (e.issues_collected as string) || "",
    issue_count: (e.issue_count as number) || 0,
    print_status: (e.print_status as CollectedEdition["print_status"]) || "check_availability",
    importance: (e.importance as CollectedEdition["importance"]) || "recommended",
    era_id: (e.era_id as string) || "",
    chapter_id: (e.chapter_id as string) || undefined,
    universe_id: (e.universe_id as string) || undefined,
    synopsis: (e.synopsis as string) || "",
    connection_notes: (e.connection_notes as string) || "",
    cover_image_url: (e.cover_image_url as string) || null,
    page_count: (e.page_count as number) || undefined,
    cover_price: (e.cover_price as number) || undefined,
    isbn: (e.isbn as string) || undefined,
    era_name: (e.era_name as string) || undefined,
    era_slug: (e.era_slug as string) || undefined,
    era_number: (e.era_number as number) || undefined,
    era_color: (e.era_color as string) || undefined,
    chapter_name: (e.chapter_name as string) || undefined,
    chapter_slug: (e.chapter_slug as string) || undefined,
    universe_name: (e.universe_name as string) || undefined,
    universe_designation: (e.universe_designation as string) || undefined,
    creator_names: (e.creator_names as string[]) || [],
  };
}

export async function getEditions(): Promise<CollectedEdition[]> {
  return cachedQuery("editions", async () => {
    const allRows = await paginatedFetch("editions_full");
    return allRows.map(mapEditionRow);
  });
}

export async function getEditionBySlug(
  slug: string
): Promise<CollectedEdition | undefined> {
  // Try cache first via full list
  const cached = sbCache.get("editions");
  if (cached && Date.now() - cached.timestamp < SB_CACHE_TTL) {
    const editions = cached.data as CollectedEdition[];
    return editions.find((e) => e.slug === slug);
  }

  // Direct query
  const { data, error } = await supabase
    .from("editions_full")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error || !data) {
    console.error("getEditionBySlug error:", error?.message);
    return undefined;
  }
  return mapEditionRow(data);
}

const IMPORTANCE_ORDER: Record<string, number> = {
  essential: 0,
  recommended: 1,
  supplemental: 2,
  completionist: 3,
};

function sortEditions(editions: CollectedEdition[]): CollectedEdition[] {
  return [...editions].sort((a, b) => {
    const impA = IMPORTANCE_ORDER[a.importance] ?? 9;
    const impB = IMPORTANCE_ORDER[b.importance] ?? 9;
    if (impA !== impB) return impA - impB;
    return a.title.localeCompare(b.title);
  });
}

export async function getEditionsByEra(): Promise<
  Record<string, CollectedEdition[]>
> {
  const editions = await getEditions();
  const grouped: Record<string, CollectedEdition[]> = {};
  for (const e of editions) {
    const key = e.era_slug || e.era_id;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  }
  // Sort editions within each era: essential first, then by title
  for (const key of Object.keys(grouped)) {
    grouped[key] = sortEditions(grouped[key]);
  }
  return grouped;
}

// ============================================================
// CHARACTERS
// ============================================================

export async function getCharacters(): Promise<Character[]> {
  return cachedQuery("characters", async () => {
    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .range(0, 4999);
    if (error) {
      console.error("getCharacters error:", error.message);
      return [];
    }
    return (data || []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      slug: c.slug as string,
      name: c.name as string,
      aliases: (c.aliases as string[]) || [],
      first_appearance_issue: (c.first_appearance_issue as string) || "",
      universe: (c.universe as string) || "Earth-616",
      teams: (c.teams as string[]) || [],
      description: (c.description as string) || "",
      image_url: (c.image_url as string) || undefined,
    }));
  });
}

export async function getCharacterBySlug(
  slug: string
): Promise<Character | undefined> {
  const characters = await getCharacters();
  return characters.find((c) => c.slug === slug);
}

export async function getEditionsByCharacter(
  characterSlug: string
): Promise<CollectedEdition[]> {
  const [character, editions] = await Promise.all([
    getCharacterBySlug(characterSlug),
    getEditions(),
  ]);
  if (!character) return [];

  const searchTerms = [
    character.name.toLowerCase(),
    ...character.aliases.map((a) => a.toLowerCase()),
  ];

  return editions.filter((e) => {
    const text = `${e.title} ${e.synopsis} ${e.connection_notes}`.toLowerCase();
    return searchTerms.some((term) => text.includes(term));
  });
}

// ============================================================
// CHARACTER EDITION COUNTS
// ============================================================

export async function getCharacterEditionCounts(): Promise<Map<string, number>> {
  const [characters, editions] = await Promise.all([
    getCharacters(),
    getEditions(),
  ]);
  const counts = new Map<string, number>();

  const editionTexts = editions.map(
    (e) => `${e.title} ${e.synopsis} ${e.connection_notes}`.toLowerCase()
  );

  for (const c of characters) {
    const searchTerms = [
      c.name.toLowerCase(),
      ...c.aliases.map((a) => a.toLowerCase()),
    ];
    let count = 0;
    for (const text of editionTexts) {
      if (searchTerms.some((term) => text.includes(term))) count++;
    }
    counts.set(c.slug, count);
  }
  return counts;
}

// ============================================================
// CREATORS
// ============================================================

export async function getCreators(): Promise<Creator[]> {
  return cachedQuery("creators", async () => {
    const { data, error } = await supabase
      .from("creators")
      .select("*")
      .range(0, 4999);
    if (error) {
      console.error("getCreators error:", error.message);
      return [];
    }
    return (data || []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      slug: c.slug as string,
      name: c.name as string,
      roles: (c.roles as string[]) || [],
      active_years: (c.active_years as string) || "",
      bio: (c.bio as string) || "",
      image_url: (c.image_url as string) || undefined,
    }));
  });
}

export async function getCreatorBySlug(
  slug: string
): Promise<Creator | undefined> {
  const creators = await getCreators();
  return creators.find((c) => c.slug === slug);
}

export async function getEditionsByCreator(
  creatorSlug: string
): Promise<CollectedEdition[]> {
  const creator = await getCreatorBySlug(creatorSlug);
  if (!creator) return [];

  // Use edition_creators junction table to find editions
  return cachedQuery(`editions-by-creator:${creatorSlug}`, async () => {
    // Get creator UUID
    const { data: creatorRow, error: cErr } = await supabase
      .from("creators")
      .select("id")
      .eq("slug", creatorSlug)
      .single();
    if (cErr || !creatorRow) return [];

    // Get edition IDs from junction table
    const { data: junctions, error: jErr } = await supabase
      .from("edition_creators")
      .select("edition_id")
      .eq("creator_id", creatorRow.id)
      .range(0, 4999);
    if (jErr || !junctions || junctions.length === 0) return [];

    const editionIds = new Set(junctions.map((j: Record<string, unknown>) => j.edition_id as string));
    const editions = await getEditions();
    return editions.filter((e) => editionIds.has(e.id));
  });
}

// ============================================================
// STORY ARCS
// ============================================================

export async function getStoryArcs(): Promise<StoryArc[]> {
  return cachedQuery("story_arcs", async () => {
    const { data, error } = await supabase
      .from("story_arcs")
      .select("*")
      .range(0, 4999);
    if (error) {
      console.error("getStoryArcs error:", error.message);
      return [];
    }
    // Need era_slug: story_arcs has era_id (UUID), we need the slug
    const eras = await getEras();
    const eraMap = new Map(eras.map((e) => [e.id, e.slug]));

    return (data || []).map((a: Record<string, unknown>) => ({
      id: a.id as string,
      slug: a.slug as string,
      name: a.name as string,
      issues: (a.issues as string) || "",
      era_slug: eraMap.get(a.era_id as string) || (a.era_id as string) || "",
      importance: (a.importance as StoryArc["importance"]) || "recommended",
      synopsis: (a.synopsis as string) || "",
      tags: (a.tags as string[]) || [],
    }));
  });
}

export async function getStoryArcsByEdition(
  editionSlug: string
): Promise<StoryArc[]> {
  const [edition, arcs] = await Promise.all([
    getEditionBySlug(editionSlug),
    getStoryArcs(),
  ]);
  if (!edition) return [];

  const issuesText = edition.issues_collected.toLowerCase();
  const synopsisText = edition.synopsis.toLowerCase();

  return arcs.filter((arc) => {
    const arcName = arc.name.toLowerCase();
    const arcIssues = arc.issues.toLowerCase();
    return (
      synopsisText.includes(arcName) ||
      issuesText.includes(arcIssues) ||
      synopsisText.includes(arcIssues)
    );
  });
}

// ============================================================
// EVENTS
// ============================================================

export async function getEvents(): Promise<Event[]> {
  return cachedQuery("events", async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .range(0, 4999);
    if (error) {
      console.error("getEvents error:", error.message);
      return [];
    }
    const eras = await getEras();
    const eraMap = new Map(eras.map((e) => [e.id, e.slug]));

    return (data || []).map((e: Record<string, unknown>) => ({
      id: e.id as string,
      slug: e.slug as string,
      name: e.name as string,
      year: (e.year as number) || 0,
      core_issues: (e.core_issues as string) || "",
      importance: (e.importance as Event["importance"]) || "recommended",
      synopsis: (e.synopsis as string) || "",
      impact: (e.impact as string) || "",
      prerequisites: (e.prerequisites as string) || "",
      consequences: (e.consequences as string) || "",
      era_slug: eraMap.get(e.era_id as string) || (e.era_id as string) || "",
      tags: (e.tags as string[]) || [],
      guide_status: (e.guide_status as Event["guide_status"]) || ("complete" as const),
    }));
  });
}

export async function getEventBySlug(
  slug: string
): Promise<Event | undefined> {
  const events = await getEvents();
  return events.find((e) => e.slug === slug);
}

export async function getEditionsForEvent(
  eventSlug: string
): Promise<
  { edition: CollectedEdition; is_core: boolean; reading_order: number }[]
> {
  // Get event UUID
  const event = await getEventBySlug(eventSlug);
  if (!event) return [];

  return cachedQuery(`editions-for-event:${eventSlug}`, async () => {
    const { data: eeData, error: eeErr } = await supabase
      .from("event_editions")
      .select("edition_id, is_core, reading_order")
      .eq("event_id", event.id)
      .order("reading_order")
      .range(0, 999);
    if (eeErr || !eeData || eeData.length === 0) return [];

    const editions = await getEditions();
    const editionMap = new Map(editions.map((e) => [e.id, e]));

    return eeData
      .map((ee: Record<string, unknown>) => {
        const edition = editionMap.get(ee.edition_id as string);
        if (!edition) return null;
        return {
          edition,
          is_core: (ee.is_core as boolean) || false,
          reading_order: (ee.reading_order as number) || 0,
        };
      })
      .filter(Boolean) as {
      edition: CollectedEdition;
      is_core: boolean;
      reading_order: number;
    }[];
  });
}

export async function getEventEditionCounts(): Promise<Record<string, number>> {
  return cachedQuery("event-edition-counts", async () => {
    const { data, error } = await supabase
      .from("event_editions")
      .select("event_id")
      .range(0, 9999);
    if (error || !data) return {};

    const events = await getEvents();
    const eventIdToSlug = new Map(events.map((e) => [e.id, e.slug]));

    const counts: Record<string, number> = {};
    for (const row of data) {
      const slug = eventIdToSlug.get(row.event_id as string);
      if (slug) {
        counts[slug] = (counts[slug] || 0) + 1;
      }
    }
    return counts;
  });
}

// ============================================================
// CONNECTIONS
// ============================================================

export async function getConnections(): Promise<RawConnection[]> {
  return cachedQuery("connections", async () => {
    const data = await paginatedFetch(
      "connections",
      "source_type,source_id,target_type,target_id,connection_type,strength,confidence,description,source_slug,target_slug"
    );

    // If source_slug/target_slug are populated, use them directly.
    // Otherwise fall back to building a UUID->slug map.
    const needsMapping = data.some(
      (c: Record<string, unknown>) => !c.source_slug && c.source_type === "edition"
    );

    let uuidToSlug: Map<string, string> | null = null;
    if (needsMapping) {
      const editions = await getEditions();
      uuidToSlug = new Map(editions.map((e) => [e.id, e.slug]));
    }

    return data.map((c: Record<string, unknown>) => ({
      source_type: (c.source_type as string) || "edition",
      source_slug:
        (c.source_slug as string) ||
        (uuidToSlug ? uuidToSlug.get(c.source_id as string) || (c.source_id as string) : (c.source_id as string)),
      target_type: (c.target_type as string) || "edition",
      target_slug:
        (c.target_slug as string) ||
        (uuidToSlug ? uuidToSlug.get(c.target_id as string) || (c.target_id as string) : (c.target_id as string)),
      connection_type: (c.connection_type as string) || "leads_to",
      strength: (c.strength as number) || 5,
      confidence: (c.confidence as number) || 50,
      description: (c.description as string) || "",
    }));
  });
}

export async function getConnectionsForEdition(slug: string): Promise<{
  outgoing: (RawConnection & {
    target_title: string;
    target_importance: string;
    target_status: string;
    target_issues: string;
  })[];
  incoming: (RawConnection & {
    source_title: string;
    source_importance: string;
    source_status: string;
    source_issues: string;
  })[];
}> {
  const [connections, editions] = await Promise.all([
    getConnections(),
    getEditions(),
  ]);
  const editionMap = new Map(editions.map((e) => [e.slug, e]));

  const outgoing = connections
    .filter((c) => c.source_slug === slug && c.target_type === "edition")
    .map((c) => {
      const target = editionMap.get(c.target_slug);
      return {
        ...c,
        target_title:
          target?.title ||
          c.target_slug
            .replace(/-/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
        target_importance: target?.importance || "recommended",
        target_status: target?.print_status || "check_availability",
        target_issues: target?.issues_collected || "",
      };
    })
    .sort((a, b) => b.strength - a.strength);

  const incoming = connections
    .filter((c) => c.target_slug === slug && c.source_type === "edition")
    .map((c) => {
      const source = editionMap.get(c.source_slug);
      return {
        ...c,
        source_title:
          source?.title ||
          c.source_slug
            .replace(/-/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
        source_importance: source?.importance || "recommended",
        source_status: source?.print_status || "check_availability",
        source_issues: source?.issues_collected || "",
      };
    })
    .sort((a, b) => b.strength - a.strength);

  return { outgoing, incoming };
}

// ============================================================
// MULTI-HOP CONNECTIONS (BFS for WhatsNext Graph)
// ============================================================

export async function getMultiHopConnections(
  slug: string,
  maxDepth: number = 3
): Promise<GraphData> {
  const [connections, editions] = await Promise.all([
    getConnections(),
    getEditions(),
  ]);
  const editionMap = new Map(editions.map((e) => [e.slug, e]));

  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const visited = new Set<string>();

  // Add center node
  const center = editionMap.get(slug);
  if (center) {
    nodes.set(slug, {
      id: slug,
      slug: slug,
      title: center.title,
      importance: center.importance,
      print_status: center.print_status,
      cover_image_url: center.cover_image_url || undefined,
      depth: 0,
    });
  }

  // BFS
  const queue: { slug: string; depth: number }[] = [{ slug, depth: 0 }];
  visited.add(slug);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    // Outgoing connections
    const outgoing = connections.filter(
      (c) =>
        c.source_slug === current.slug &&
        c.target_type === "edition" &&
        [
          "leads_to",
          "recommended_after",
          "spin_off",
          "ties_into",
          "prerequisite",
        ].includes(c.connection_type)
    );

    for (const conn of outgoing) {
      const target = editionMap.get(conn.target_slug);
      if (!target) continue;

      if (!nodes.has(conn.target_slug)) {
        nodes.set(conn.target_slug, {
          id: conn.target_slug,
          slug: conn.target_slug,
          title: target.title,
          importance: target.importance,
          print_status: target.print_status,
          cover_image_url: target.cover_image_url || undefined,
          depth: current.depth + 1,
        });
      }

      edges.push({
        source: conn.source_slug,
        target: conn.target_slug,
        connection_type: conn.connection_type,
        strength: conn.strength,
        confidence: conn.confidence,
        description: conn.description,
      });

      if (!visited.has(conn.target_slug)) {
        visited.add(conn.target_slug);
        queue.push({ slug: conn.target_slug, depth: current.depth + 1 });
      }
    }

    // Incoming connections (for "what came before")
    const incoming = connections.filter(
      (c) =>
        c.target_slug === current.slug &&
        c.source_type === "edition" &&
        ["leads_to", "recommended_after", "spin_off"].includes(
          c.connection_type
        )
    );

    for (const conn of incoming) {
      const source = editionMap.get(conn.source_slug);
      if (!source) continue;

      if (!nodes.has(conn.source_slug)) {
        nodes.set(conn.source_slug, {
          id: conn.source_slug,
          slug: conn.source_slug,
          title: source.title,
          importance: source.importance,
          print_status: source.print_status,
          cover_image_url: source.cover_image_url || undefined,
          depth: current.depth + 1,
        });
      }

      // Only add edge if not already present
      const edgeKey = `${conn.source_slug}->${conn.target_slug}-${conn.connection_type}`;
      if (
        !edges.some(
          (e) =>
            `${e.source}->${e.target}-${e.connection_type}` === edgeKey
        )
      ) {
        edges.push({
          source: conn.source_slug,
          target: conn.target_slug,
          connection_type: conn.connection_type,
          strength: conn.strength,
          confidence: conn.confidence,
          description: conn.description,
        });
      }

      if (!visited.has(conn.source_slug)) {
        visited.add(conn.source_slug);
        queue.push({ slug: conn.source_slug, depth: current.depth + 1 });
      }
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges,
  };
}

// ============================================================
// CONTINUITY CONFLICTS
// ============================================================

export async function getConflicts(): Promise<ContinuityConflict[]> {
  return cachedQuery("conflicts", async () => {
    const { data, error } = await supabase
      .from("continuity_conflicts")
      .select("*");
    if (error) {
      console.error("getConflicts error:", error.message);
      return [];
    }
    return (data || []).map((c: Record<string, unknown>) => ({
      id: (c.id as string) || (c.slug as string) || "",
      slug: (c.slug as string) || "",
      title: (c.title as string) || "",
      description: (c.description as string) || "",
      official_stance: (c.official_stance as string) || "",
      fan_interpretation: (c.fan_interpretation as string) || "",
      editorial_context: (c.editorial_context as string) || "",
      confidence: (c.confidence as number) || 0,
      source_citations: (c.source_citations as string[]) || [],
      tags: (c.tags as string[]) || [],
    }));
  });
}

// ============================================================
// READING PATHS
// ============================================================

export async function getReadingPaths(): Promise<ReadingPath[]> {
  return cachedQuery("reading_paths", async () => {
    // Fetch paths, entries, and editions in parallel
    const [pathsRes, entriesData, editions] = await Promise.all([
      supabase.from("reading_paths").select("*").range(0, 999),
      paginatedFetch("reading_path_entries"),
      getEditions(),
    ]);

    if (pathsRes.error) {
      console.error("getReadingPaths error:", pathsRes.error.message);
      return [];
    }

    const editionMap = new Map(editions.map((e) => [e.id, e]));

    // Group entries by path_id
    const entriesByPath = new Map<string, Record<string, unknown>[]>();
    for (const entry of entriesData) {
      const pathId = entry.path_id as string;
      if (!entriesByPath.has(pathId)) entriesByPath.set(pathId, []);
      entriesByPath.get(pathId)!.push(entry);
    }

    return (pathsRes.data || []).map((p: Record<string, unknown>) => {
      const pathEntries = entriesByPath.get(p.id as string) || [];
      const sortedEntries = pathEntries.sort(
        (a, b) => (a.position as number) - (b.position as number)
      );

      return {
        id: p.id as string,
        slug: p.slug as string,
        name: p.name as string,
        category: (p.category as string) || (p.path_type as string) || "",
        path_type: (p.path_type as string) || "",
        difficulty: (p.difficulty as string) || "beginner",
        description: (p.description as string) || "",
        estimated_issues: (p.estimated_issues as number) || sortedEntries.length * 25,
        sections: (p.sections as ReadingPath["sections"]) || undefined,
        entries: sortedEntries.map((entry) => {
          const edition = editionMap.get(entry.edition_id as string);
          return {
            position: (entry.position as number) || 0,
            edition: edition || {
              id: (entry.edition_id as string) || "",
              slug: "",
              title: "Unknown Edition",
              format: "omnibus" as const,
              issues_collected: "",
              issue_count: 0,
              print_status: "check_availability" as const,
              importance: "recommended" as const,
              era_id: "",
              era_slug: "",
              synopsis: "",
              connection_notes: "",
              cover_image_url: null,
              creator_names: [],
            },
            note: (entry.note as string) ?? "",
            is_optional: (entry.is_optional as boolean) || false,
          };
        }),
      };
    });
  });
}

export async function getReadingPathBySlug(
  slug: string
): Promise<ReadingPath | undefined> {
  const paths = await getReadingPaths();
  return paths.find((p) => p.slug === slug);
}

// ============================================================
// RESOURCES & RETAILERS
// ============================================================

export async function getResources(): Promise<Resource[]> {
  return cachedQuery("resources", async () => {
    const { data, error } = await supabase.from("resources").select("*");
    if (error) {
      console.error("getResources error:", error.message);
      return [];
    }
    return (data || []).map((r: Record<string, unknown>, i: number) => ({
      id: (r.id as string) || `resource-${i}`,
      name: (r.name as string) || "",
      resource_type: (r.resource_type as string) || "",
      url: (r.url as string) || "",
      description: (r.description as string) || "",
      focus: (r.focus as string) || "",
      best_for: (r.best_for as string) || "",
    }));
  });
}

export async function getRetailers(): Promise<Retailer[]> {
  return cachedQuery("retailers", async () => {
    const { data, error } = await supabase.from("retailers").select("*");
    if (error) {
      console.error("getRetailers error:", error.message);
      return [];
    }
    return (data || []).map((r: Record<string, unknown>) => ({
      id: (r.id as string) || "",
      slug: (r.slug as string) || "",
      name: (r.name as string) || "",
      url: (r.url as string) || "",
      description: (r.description as string) || "",
      notes: (r.notes as string) || "",
      is_digital: (r.is_digital as boolean) || false,
      ships_international: (r.ships_international as boolean) || false,
    }));
  });
}

// ============================================================
// EDITION ISSUES (Overlap Detection)
// ============================================================

interface RawEditionIssue {
  edition_slug: string;
  series_name: string;
  issue_number: number;
  is_annual: boolean;
}

export async function getEditionIssues(): Promise<RawEditionIssue[]> {
  return cachedQuery("edition_issues", async () => {
    // edition_issues has edition_id (UUID), not edition_slug
    // We need to join with collected_editions to get the slug
    const data = await paginatedFetch(
      "edition_issues",
      "edition_id, series_name, issue_number, is_annual"
    );

    // Build UUID -> slug map from editions
    const editions = await getEditions();
    const idToSlug = new Map(editions.map((e) => [e.id, e.slug]));

    return data.map((row: Record<string, unknown>) => ({
      edition_slug: idToSlug.get(row.edition_id as string) || (row.edition_id as string),
      series_name: (row.series_name as string) || "",
      issue_number: (row.issue_number as number) || 0,
      is_annual: (row.is_annual as boolean) || false,
    }));
  });
}

export async function findOverlaps(
  editionSlugs: string[]
): Promise<{
  overlaps: {
    edition_a: string;
    edition_b: string;
    edition_a_title: string;
    edition_b_title: string;
    shared_issues: string[];
  }[];
  total: number;
}> {
  const [issues, editions] = await Promise.all([
    getEditionIssues(),
    getEditions(),
  ]);
  const editionMap = new Map(editions.map((e) => [e.slug, e]));
  const slugSet = new Set(editionSlugs);

  // Group issues by edition
  const editionIssueMap = new Map<string, Set<string>>();
  for (const issue of issues) {
    if (!slugSet.has(issue.edition_slug)) continue;
    if (!editionIssueMap.has(issue.edition_slug)) {
      editionIssueMap.set(issue.edition_slug, new Set());
    }
    const key = `${issue.series_name}${issue.is_annual ? " Annual" : ""} #${issue.issue_number}`;
    editionIssueMap.get(issue.edition_slug)!.add(key);
  }

  // Find pairwise overlaps
  const slugArr = Array.from(slugSet);
  const overlaps: {
    edition_a: string;
    edition_b: string;
    edition_a_title: string;
    edition_b_title: string;
    shared_issues: string[];
  }[] = [];
  let total = 0;

  for (let i = 0; i < slugArr.length; i++) {
    for (let j = i + 1; j < slugArr.length; j++) {
      const aIssues = editionIssueMap.get(slugArr[i]);
      const bIssues = editionIssueMap.get(slugArr[j]);
      if (!aIssues || !bIssues) continue;

      const shared: string[] = [];
      for (const issue of aIssues) {
        if (bIssues.has(issue)) shared.push(issue);
      }
      if (shared.length > 0) {
        overlaps.push({
          edition_a: slugArr[i],
          edition_b: slugArr[j],
          edition_a_title: editionMap.get(slugArr[i])?.title || slugArr[i],
          edition_b_title: editionMap.get(slugArr[j])?.title || slugArr[j],
          shared_issues: shared.sort(),
        });
        total += shared.length;
      }
    }
  }

  return { overlaps, total };
}

// ============================================================
// CREATOR SAGA
// ============================================================

export async function getCreatorSaga(creatorSlug: string): Promise<{
  creator_name: string;
  editions: CollectedEdition[];
  connections: RawConnection[];
}> {
  const [creator, editions, connections] = await Promise.all([
    getCreatorBySlug(creatorSlug),
    getEditionsByCreator(creatorSlug),
    getConnections(),
  ]);

  if (!creator) {
    return { creator_name: "", editions: [], connections: [] };
  }

  const editionSlugs = new Set(editions.map((e) => e.slug));
  const sagaConnections = connections.filter(
    (c) =>
      c.source_type === "edition" &&
      c.target_type === "edition" &&
      editionSlugs.has(c.source_slug) &&
      editionSlugs.has(c.target_slug)
  );

  return {
    creator_name: creator.name,
    editions,
    connections: sagaConnections,
  };
}

// ============================================================
// PURCHASE PLAN
// ============================================================

export async function getPurchasePlan(pathSlug: string): Promise<{
  path_name: string;
  total_cover: number;
  in_print: CollectedEdition[];
  out_of_print: CollectedEdition[];
  upcoming: CollectedEdition[];
  digital_only: CollectedEdition[];
}> {
  const readingPath = await getReadingPathBySlug(pathSlug);
  if (!readingPath) {
    return {
      path_name: "",
      total_cover: 0,
      in_print: [],
      out_of_print: [],
      upcoming: [],
      digital_only: [],
    };
  }

  const inPrint: CollectedEdition[] = [];
  const outOfPrint: CollectedEdition[] = [];
  const upcoming: CollectedEdition[] = [];
  const digitalOnly: CollectedEdition[] = [];
  let totalCover = 0;

  for (const entry of readingPath.entries) {
    const ed = entry.edition;
    totalCover += ed.cover_price || 0;
    switch (ed.print_status) {
      case "in_print":
      case "ongoing":
        inPrint.push(ed);
        break;
      case "out_of_print":
        outOfPrint.push(ed);
        break;
      case "upcoming":
        upcoming.push(ed);
        break;
      case "digital_only":
        digitalOnly.push(ed);
        break;
      default:
        inPrint.push(ed);
    }
  }

  return {
    path_name: readingPath.name,
    total_cover: totalCover,
    in_print: inPrint,
    out_of_print: outOfPrint,
    upcoming,
    digital_only: digitalOnly,
  };
}

// ============================================================
// ERA CHAPTERS
// ============================================================

export async function getEraChapters(): Promise<EraChapter[]> {
  return cachedQuery("era_chapters", async () => {
    const { data, error } = await supabase
      .from("era_chapters")
      .select("*")
      .range(0, 999);
    if (error) {
      console.error("getEraChapters error:", error.message);
      return [];
    }

    // era_chapters has era_id (UUID). We need to map to era_slug for the EraChapter type.
    const eras = await getEras();
    const eraIdToSlug = new Map(eras.map((e) => [e.id, e.slug]));

    return (data || []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      era_id: eraIdToSlug.get(c.era_id as string) || (c.era_id as string) || "",
      slug: c.slug as string,
      name: (c.name as string) || "",
      number: (c.number as number) || 0,
      description: (c.description as string) || "",
      year_start: (c.year_start as number) || 0,
      year_end: (c.year_end as number) || 0,
    }));
  });
}

export async function getChaptersForEra(eraSlug: string): Promise<EraChapter[]> {
  const chapters = await getEraChapters();
  return chapters
    .filter((c) => c.era_id === eraSlug)
    .sort((a, b) => a.number - b.number);
}

export async function getChapterEditionSlugs(chapterSlug: string): Promise<string[]> {
  return cachedQuery(`chapter-edition-slugs:${chapterSlug}`, async () => {
    // Get chapter UUID from slug
    const { data: chapterRow, error: cErr } = await supabase
      .from("era_chapters")
      .select("id")
      .eq("slug", chapterSlug)
      .single();
    if (cErr || !chapterRow) return [];

    // Get edition slugs for that chapter
    const { data, error } = await supabase
      .from("collected_editions")
      .select("slug")
      .eq("chapter_id", chapterRow.id)
      .range(0, 999);
    if (error || !data) return [];
    return data.map((e: Record<string, unknown>) => e.slug as string);
  });
}

export async function getEditionsForChapter(
  chapterSlug: string
): Promise<CollectedEdition[]> {
  const [slugs, editions] = await Promise.all([
    getChapterEditionSlugs(chapterSlug),
    getEditions(),
  ]);
  const editionMap = new Map(editions.map((e) => [e.slug, e]));
  return slugs
    .map((slug) => editionMap.get(slug))
    .filter(Boolean) as CollectedEdition[];
}

// ============================================================
// EVENT PHASES
// ============================================================

export async function getEventPhases(): Promise<EventPhase[]> {
  return cachedQuery("event_phases", async () => {
    const { data, error } = await supabase
      .from("event_phases")
      .select("*")
      .range(0, 999);
    if (error) {
      console.error("getEventPhases error:", error.message);
      return [];
    }

    // event_phases has event_id (UUID). Map to event slug for compatibility.
    const events = await getEvents();
    const eventIdToSlug = new Map(events.map((e) => [e.id, e.slug]));

    return (data || []).map((p: Record<string, unknown>) => ({
      id: p.id as string,
      event_id: eventIdToSlug.get(p.event_id as string) || (p.event_id as string) || "",
      slug: p.slug as string,
      name: (p.name as string) || "",
      number: (p.number as number) || 0,
      description: (p.description as string) || "",
    }));
  });
}

export async function getPhasesForEvent(eventSlug: string): Promise<EventPhase[]> {
  const phases = await getEventPhases();
  return phases
    .filter((p) => p.event_id === eventSlug)
    .sort((a, b) => a.number - b.number);
}

// ============================================================
// UNIVERSES
// ============================================================

export async function getUniverses(): Promise<Universe[]> {
  return cachedQuery("universes", async () => {
    const { data, error } = await supabase
      .from("universes")
      .select("*");
    if (error) {
      console.error("getUniverses error:", error.message);
      return [];
    }
    return (data || []).map((u: Record<string, unknown>) => ({
      id: u.id as string,
      slug: u.slug as string,
      name: (u.name as string) || "",
      designation: (u.designation as string) || "",
      year_start: (u.year_start as number) || 0,
      year_end: (u.year_end as number | null) || null,
      description: (u.description as string) || "",
      is_primary: (u.is_primary as boolean) || false,
      color: (u.color as string) || "#333",
    }));
  });
}

export async function getUniverseBySlug(
  slug: string
): Promise<Universe | undefined> {
  const universes = await getUniverses();
  return universes.find((u) => u.slug === slug);
}

/** Map edition slugs to universe slugs based on title/content keywords */
const UNIVERSE_EDITION_MAP: Record<string, string[]> = {
  "earth-1610": [
    "ultimate-spider-man-bendis-v1",
    "ultimates-millar-hitch-omnibus",
    "ultimate-ff-omnibus-v1",
    "ultimate-comics-doomsday",
    "ultimates-camp-v1",
  ],
  "earth-295": ["xmen-age-of-apocalypse"],
};

/** Keywords in edition slug/title that map to a universe */
const UNIVERSE_SLUG_PREFIXES: Record<string, string> = {
  "ultimate-": "earth-1610",
};

function getUniverseForEdition(edition: CollectedEdition): string {
  // Use DB-assigned universe if available
  if (edition.universe_designation) {
    // Map designation to slug format
    const universes_cache = sbCache.get("universes");
    if (universes_cache) {
      const universes = universes_cache.data as Universe[];
      const match = universes.find(
        (u) => u.designation === edition.universe_designation
      );
      if (match) return match.slug;
    }
  }

  // Check explicit mapping first
  for (const [universe, slugs] of Object.entries(UNIVERSE_EDITION_MAP)) {
    if (slugs.includes(edition.slug)) return universe;
  }
  // Check slug prefixes
  for (const [prefix, universe] of Object.entries(UNIVERSE_SLUG_PREFIXES)) {
    if (edition.slug.startsWith(prefix)) return universe;
  }
  // Default: main continuity
  return "earth-616";
}

export async function getEditionsByUniverse(
  universeSlug: string
): Promise<CollectedEdition[]> {
  const editions = await getEditions();
  return editions.filter((e) => getUniverseForEdition(e) === universeSlug);
}

// ============================================================
// READING ORDER ENTRIES (Issue-level interleaved orders)
// ============================================================

export async function getReadingOrderForEvent(
  eventSlug: string
): Promise<ReadingOrderEntry[]> {
  return cachedQuery(`reading-order:${eventSlug}`, async () => {
    // Get event UUID
    const event = await getEventBySlug(eventSlug);
    if (!event) return [];

    const { data, error } = await supabase
      .from("reading_order_entries")
      .select("*")
      .eq("context_type", "event")
      .eq("context_id", event.id)
      .order("position")
      .range(0, 999);
    if (error || !data || data.length === 0) return [];

    const phases = await getPhasesForEvent(eventSlug);
    // phase_id in the DB is a UUID. Map UUID -> phase object.
    const phaseById = new Map(phases.map((p) => [p.id, p]));
    // Also try by slug in case phase_id is a slug
    const phaseBySlug = new Map(phases.map((p) => [p.slug, p]));

    return data.map((e: Record<string, unknown>) => {
      const phaseId = e.phase_id as string | null;
      const phase = phaseId
        ? phaseById.get(phaseId) || phaseBySlug.get(phaseId)
        : undefined;
      return {
        id: (e.id as string) || `${eventSlug}-${e.position}`,
        context_type: (e.context_type as ReadingOrderEntry["context_type"]) || "event",
        context_id: eventSlug,
        position: (e.position as number) || 0,
        series_title: (e.series_title as string) || "",
        issue_number: (e.issue_number as string) || "",
        edition_slug: (e.edition_slug as string) || null,
        note: (e.note as string) || null,
        is_core: (e.is_core as boolean) || false,
        phase_id: phaseId,
        phase_name: phase?.name,
        phase_number: phase?.number,
      };
    });
  });
}

// ============================================================
// ERAS WITH CHAPTERS (enriched)
// ============================================================

export async function getErasWithChapters(): Promise<Era[]> {
  const [eras, chapters] = await Promise.all([
    getEras(),
    getEraChapters(),
  ]);
  const chaptersByEra = new Map<string, EraChapter[]>();
  for (const ch of chapters) {
    const key = ch.era_id;
    if (!chaptersByEra.has(key)) chaptersByEra.set(key, []);
    chaptersByEra.get(key)!.push(ch);
  }
  return eras.map((era) => ({
    ...era,
    chapters: (chaptersByEra.get(era.slug) || []).sort(
      (a, b) => a.number - b.number
    ),
  }));
}

// ============================================================
// EVENTS WITH PHASES (enriched)
// ============================================================

export async function getEventsWithPhases(): Promise<Event[]> {
  const [events, phases] = await Promise.all([
    getEvents(),
    getEventPhases(),
  ]);
  const phasesByEvent = new Map<string, EventPhase[]>();
  for (const ph of phases) {
    const key = ph.event_id;
    if (!phasesByEvent.has(key)) phasesByEvent.set(key, []);
    phasesByEvent.get(key)!.push(ph);
  }
  return events.map((event) => ({
    ...event,
    phases: (phasesByEvent.get(event.slug) || []).sort(
      (a, b) => a.number - b.number
    ),
  }));
}

export async function getEventWithPhases(
  slug: string
): Promise<(Event & { phases: EventPhase[] }) | undefined> {
  const [event, phases] = await Promise.all([
    getEventBySlug(slug),
    getPhasesForEvent(slug),
  ]);
  if (!event) return undefined;
  return { ...event, phases };
}

// ============================================================
// SEARCH (Enhanced with filters)
// ============================================================

export async function searchEditions(
  queryOrFilters: string | SearchFilters
): Promise<CollectedEdition[]> {
  const editions = await getEditions();

  const filters: SearchFilters =
    typeof queryOrFilters === "string"
      ? { query: queryOrFilters }
      : queryOrFilters;

  let results = editions;

  // Text search - word-boundary matching with relevance scoring
  if (filters.query) {
    const q = filters.query.toLowerCase();
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const wordBoundaryRe = new RegExp(`\\b${escaped}`, "i");
    const matchesText = (text: string) => wordBoundaryRe.test(text);

    const scored = results
      .map((e) => {
        let score = 0;
        if (matchesText(e.title)) score += 100;
        if (e.creator_names?.some((c) => matchesText(c))) score += 80;
        if (matchesText(e.issues_collected)) score += 60;
        if (e.connection_notes && matchesText(e.connection_notes)) score += 20;
        if (matchesText(e.synopsis)) score += 10;
        return { edition: e, score };
      })
      .filter((s) => s.score > 0);

    scored.sort((a, b) => b.score - a.score);
    results = scored.map((s) => s.edition);
  }

  // Era filter
  if (filters.era) {
    results = results.filter(
      (e) => e.era_slug === filters.era || e.era_id === filters.era
    );
  }

  // Importance filter
  if (filters.importance) {
    results = results.filter((e) => e.importance === filters.importance);
  }

  // Status filter
  if (filters.status) {
    results = results.filter((e) => e.print_status === filters.status);
  }

  // Format filter
  if (filters.format) {
    results = results.filter((e) => e.format === filters.format);
  }

  // Creator filter
  if (filters.creator) {
    const creatorQ = filters.creator.toLowerCase();
    results = results.filter(
      (e) =>
        e.creator_names &&
        e.creator_names.some((c) => c.toLowerCase().includes(creatorQ))
    );
  }

  // Character filter
  if (filters.character) {
    const charQ = filters.character.toLowerCase();
    results = results.filter(
      (e) =>
        e.synopsis.toLowerCase().includes(charQ) ||
        e.title.toLowerCase().includes(charQ) ||
        (e.connection_notes &&
          e.connection_notes.toLowerCase().includes(charQ))
    );
  }

  return results;
}

// ============================================================
// TRIVIA
// ============================================================

export async function getTrivia(): Promise<TriviaQuestion[]> {
  const cached = sbCache.get("trivia");
  if (cached && Date.now() - cached.timestamp < SB_CACHE_TTL) {
    return cached.data as TriviaQuestion[];
  }
  const { data, error } = await supabase
    .from("trivia_questions")
    .select("*")
    .range(0, 999);
  if (error) {
    console.error("Error fetching trivia:", error.message);
    return [];
  }
  const result = (data || []) as TriviaQuestion[];
  sbCache.set("trivia", { data: result, timestamp: Date.now() });
  return result;
}

export async function getTriviaByCategory(
  category: string
): Promise<TriviaQuestion[]> {
  if (category === "all") return getTrivia();
  const { data, error } = await supabase
    .from("trivia_questions")
    .select("*")
    .eq("category", category);
  if (error) {
    console.error("Error fetching trivia by category:", error.message);
    return [];
  }
  return (data || []) as TriviaQuestion[];
}

export async function getRandomTrivia(
  count: number
): Promise<TriviaQuestion[]> {
  const all = await getTrivia();
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ============================================================
// COVERAGE & COLLECTION INTELLIGENCE
// ============================================================

/** Returns a map of edition_slug -> Set<issue_key> for all editions */
export async function getEditionIssueMap(): Promise<
  Record<string, string[]>
> {
  const issues = await getEditionIssues();
  const map: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = `${issue.series_name}${issue.is_annual ? " Annual" : ""} #${issue.issue_number}`;
    if (!map[issue.edition_slug]) map[issue.edition_slug] = [];
    map[issue.edition_slug].push(key);
  }
  return map;
}

/** Coverage data: editions grouped by era with issue counts */
export async function getCoverageData(): Promise<{
  eras: {
    slug: string;
    name: string;
    color: string;
    number: number;
    editions: {
      slug: string;
      title: string;
      importance: string;
      print_status: string;
      issue_count: number;
    }[];
    total_issues: number;
  }[];
  connections: RawConnection[];
}> {
  const [eras, editions, connections] = await Promise.all([
    getEras(),
    getEditions(),
    getConnections(),
  ]);

  const editionsByEra = new Map<string, CollectedEdition[]>();
  for (const e of editions) {
    const key = e.era_slug || e.era_id;
    if (!editionsByEra.has(key)) editionsByEra.set(key, []);
    editionsByEra.get(key)!.push(e);
  }

  return {
    eras: eras.map((era) => {
      const eraEditions = editionsByEra.get(era.slug) || [];
      return {
        slug: era.slug,
        name: era.name,
        color: era.color,
        number: era.number,
        editions: eraEditions.map((e) => ({
          slug: e.slug,
          title: e.title,
          importance: e.importance,
          print_status: e.print_status,
          issue_count: e.issue_count || 0,
        })),
        total_issues: eraEditions.reduce(
          (sum, e) => sum + (e.issue_count || 0),
          0
        ),
      };
    }),
    connections,
  };
}

// ============================================================
// HANDBOOK ENTRIES
// ============================================================

export async function getHandbookEntries(): Promise<HandbookEntry[]> {
  const cached = sbCache.get("handbook");
  if (cached && Date.now() - cached.timestamp < SB_CACHE_TTL) {
    return cached.data as HandbookEntry[];
  }
  const { data, error } = await supabase
    .from("handbook_entries")
    .select("*")
    .range(0, 999);
  if (error) {
    console.error("Error fetching handbook:", error.message);
    return [];
  }
  const result = (data || []).map((row: Record<string, unknown>) => normalizeHandbookEntry(row));
  sbCache.set("handbook", { data: result, timestamp: Date.now() });
  return result;
}

function normalizeHandbookEntry(raw: Record<string, unknown>): HandbookEntry {
  // JSONB fields may come back as strings if double-stringified during seed
  const parseJsonb = <T>(val: unknown, fallback: T): T => {
    if (typeof val === "string") {
      try { return JSON.parse(val) as T; } catch { return fallback; }
    }
    return (val as T) ?? fallback;
  };
  return {
    slug: (raw.slug as string) || "",
    entry_type: (raw.entry_type as string) || "character",
    name: (raw.name as string) || "",
    core_concept: (raw.core_concept as string) || "",
    canon_confidence: (raw.canon_confidence as number) || 0,
    description: (raw.description as string) || "",
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    source_citations: Array.isArray(raw.source_citations) ? raw.source_citations : [],
    related_edition_slugs: Array.isArray(raw.related_edition_slugs) ? raw.related_edition_slugs : [],
    related_event_slugs: Array.isArray(raw.related_event_slugs) ? raw.related_event_slugs : [],
    related_conflict_slugs: Array.isArray(raw.related_conflict_slugs) ? raw.related_conflict_slugs : [],
    related_handbook_slugs: Array.isArray(raw.related_handbook_slugs) ? raw.related_handbook_slugs : [],
    status_by_era: parseJsonb(raw.status_by_era, []),
    retcon_history: parseJsonb(raw.retcon_history, []),
    data: parseJsonb(raw.data, {}),
  } as unknown as HandbookEntry;
}

export async function getHandbookEntryBySlug(
  slug: string
): Promise<HandbookEntry | undefined> {
  const { data, error } = await supabase
    .from("handbook_entries")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error || !data) return undefined;
  return normalizeHandbookEntry(data);
}

export async function getHandbookEntriesByType(
  entryType: string
): Promise<HandbookEntry[]> {
  const { data, error } = await supabase
    .from("handbook_entries")
    .select("*")
    .eq("entry_type", entryType);
  if (error) return [];
  return (data || []) as HandbookEntry[];
}

export async function getHandbookEntriesForEdition(
  editionSlug: string
): Promise<HandbookEntry[]> {
  const { data, error } = await supabase
    .from("handbook_entries")
    .select("*")
    .contains("related_edition_slugs", [editionSlug]);
  if (error) return [];
  return (data || []) as HandbookEntry[];
}

export async function getHandbookEntriesForEra(
  eraSlug: string
): Promise<HandbookEntry[]> {
  // status_by_era is JSONB, need to filter in-memory
  const entries = await getHandbookEntries();
  return entries.filter((e) =>
    e.status_by_era.some((s: { era_slug: string }) => s.era_slug === eraSlug)
  );
}

export async function getHandbookEntriesForEvent(
  eventSlug: string
): Promise<HandbookEntry[]> {
  const { data, error } = await supabase
    .from("handbook_entries")
    .select("*")
    .contains("related_event_slugs", [eventSlug]);
  if (error) return [];
  return (data || []) as HandbookEntry[];
}

export async function searchHandbook(
  query: string
): Promise<HandbookEntry[]> {
  const entries = await getHandbookEntries();
  const q = query.toLowerCase();
  return entries.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.core_concept.toLowerCase().includes(q) ||
      e.tags.some((t: string) => t.toLowerCase().includes(q)) ||
      e.description.toLowerCase().includes(q)
  );
}

// ============================================================
// CALENDAR EDITIONS
// ============================================================

export async function getCalendarEditions(
  startDate: string,
  endDate: string
): Promise<CollectedEdition[]> {
  const editions = await getEditions();
  return editions.filter((e) => {
    // Editions with release_date or upcoming/in_print status
    // For now, use era year ranges as proxy if no release_date
    if (e.print_status === "upcoming" || e.print_status === "in_print" || e.print_status === "ongoing") {
      return true;
    }
    return false;
  });
}

// ============================================================
// RETCON DATA (for /retcons page)
// ============================================================

export async function getRetconData(): Promise<{
  entries: (HandbookEntry & { retcon_count: number })[];
  allRetcons: { entry_slug: string; entry_name: string; entry_type: string; retcon: { year: number; description: string; source: string; old_state: string; new_state: string } }[];
}> {
  const handbook = await getHandbookEntries();
  const entriesWithRetcons = handbook
    .filter((e) => e.retcon_history && e.retcon_history.length > 0)
    .map((e) => ({ ...e, retcon_count: e.retcon_history.length }));

  const allRetcons: { entry_slug: string; entry_name: string; entry_type: string; retcon: { year: number; description: string; source: string; old_state: string; new_state: string } }[] = [];
  for (const entry of entriesWithRetcons) {
    for (const retcon of entry.retcon_history) {
      allRetcons.push({
        entry_slug: entry.slug,
        entry_name: entry.name,
        entry_type: entry.entry_type,
        retcon,
      });
    }
  }
  allRetcons.sort((a, b) => a.retcon.year - b.retcon.year);

  return { entries: entriesWithRetcons, allRetcons };
}

// ============================================================
// CHARACTER GRAPH DATA (for /characters/graph)
// ============================================================

export async function getCharacterGraphData(): Promise<{
  nodes: { slug: string; name: string; teams: string[]; universe: string; editionCount: number }[];
  edges: { source: string; target: string; type: string; strength: number; label: string }[];
}> {
  const [characters, editionCounts] = await Promise.all([
    getCharacters(),
    getCharacterEditionCounts(),
  ]);

  // Filter to characters with 2+ edition appearances
  const relevantCharacters = characters.filter(
    (c) => (editionCounts.get(c.slug) || 0) >= 2
  );

  const nodes = relevantCharacters.map((c) => ({
    slug: c.slug,
    name: c.name,
    teams: c.teams,
    universe: c.universe,
    editionCount: editionCounts.get(c.slug) || 0,
  }));

  const edges: { source: string; target: string; type: string; strength: number; label: string }[] = [];
  const edgeSet = new Set<string>();

  // Team co-membership edges
  const slugSet = new Set(relevantCharacters.map((c) => c.slug));
  const teamMembers = new Map<string, string[]>();
  for (const c of relevantCharacters) {
    for (const team of c.teams) {
      if (!teamMembers.has(team)) teamMembers.set(team, []);
      teamMembers.get(team)!.push(c.slug);
    }
  }
  for (const [team, members] of teamMembers) {
    if (members.length < 2 || members.length > 20) continue;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const key = [members[i], members[j]].sort().join(":");
        if (!edgeSet.has(`teammate:${key}`)) {
          edgeSet.add(`teammate:${key}`);
          edges.push({
            source: members[i],
            target: members[j],
            type: "teammate",
            strength: 3,
            label: team,
          });
        }
      }
    }
  }

  // Explicit relationships from DB
  const { data: relData } = await supabase
    .from("character_relationships")
    .select("character_a_id, character_b_id, relationship_type, strength, description, citation")
    .range(0, 999);

  if (relData && relData.length > 0) {
    // Map character IDs to slugs
    const idToSlug = new Map(relevantCharacters.map((c) => [c.id, c.slug]));
    for (const rel of relData) {
      const aSlug = idToSlug.get(rel.character_a_id as string);
      const bSlug = idToSlug.get(rel.character_b_id as string);
      if (!aSlug || !bSlug) continue;
      const key = [aSlug, bSlug].sort().join(":");
      const edgeKey = `${rel.relationship_type}:${key}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push({
          source: aSlug,
          target: bSlug,
          type: rel.relationship_type as string,
          strength: (rel.strength as number) || 5,
          label: (rel.description as string) || "",
        });
      }
    }
  }

  return { nodes, edges };
}

// ============================================================
// SUGGESTED COMPARISONS (for compare page)
// ============================================================

export async function getSuggestedComparisons(): Promise<
  { slug_a: string; title_a: string; slug_b: string; title_b: string; overlap_count: number; reason: string }[]
> {
  const [editions, issueMap] = await Promise.all([
    getEditions(),
    getEditionIssueMap(),
  ]);

  const suggestions: { slug_a: string; title_a: string; slug_b: string; title_b: string; overlap_count: number; reason: string }[] = [];
  const editionMap = new Map(editions.map((e) => [e.slug, e]));
  const slugs = Object.keys(issueMap);

  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      const a = slugs[i];
      const b = slugs[j];
      const setA = new Set(issueMap[a]);
      const overlap = (issueMap[b] || []).filter((issue) => setA.has(issue));
      const pctA = setA.size > 0 ? overlap.length / setA.size : 0;
      const pctB = (issueMap[b] || []).length > 0 ? overlap.length / (issueMap[b] || []).length : 0;

      if (overlap.length > 0 && (pctA >= 0.3 || pctB >= 0.3)) {
        const edA = editionMap.get(a);
        const edB = editionMap.get(b);
        if (!edA || !edB) continue;
        // Same series different format?
        const sameSeriesDiffFormat = edA.format !== edB.format;
        suggestions.push({
          slug_a: a,
          title_a: edA.title,
          slug_b: b,
          title_b: edB.title,
          overlap_count: overlap.length,
          reason: sameSeriesDiffFormat
            ? `Same series, different format (${overlap.length} shared issues)`
            : `${overlap.length} overlapping issues (${Math.round(Math.max(pctA, pctB) * 100)}% overlap)`,
        });
      }
    }
  }

  // Sort by overlap count descending, take top 6
  suggestions.sort((a, b) => b.overlap_count - a.overlap_count);
  return suggestions.slice(0, 6);
}

// ============================================================
// PREREQUISITES (for edition detail context engine)
// ============================================================

export async function getPrerequisites(editionSlug: string): Promise<
  { edition_slug: string; edition_title: string; issues_collected: string; importance: string; connection_type: string; strength: number; description: string; category: 'required' | 'recommended' | 'helpful' }[]
> {
  const [connections, editions] = await Promise.all([
    getConnections(),
    getEditions(),
  ]);
  const editionMap = new Map(editions.map((e) => [e.slug, e]));

  // Find incoming connections (things that should be read before this edition)
  const incoming = connections.filter(
    (c) =>
      c.target_slug === editionSlug &&
      c.source_type === "edition" &&
      ["prerequisite", "recommended_after", "references", "leads_to"].includes(c.connection_type)
  );

  return incoming
    .map((c) => {
      const source = editionMap.get(c.source_slug);
      if (!source) return null;

      let category: 'required' | 'recommended' | 'helpful';
      if (c.connection_type === "prerequisite" || c.strength >= 8) {
        category = "required";
      } else if (c.connection_type === "recommended_after" || c.connection_type === "leads_to" || c.strength >= 5) {
        category = "recommended";
      } else {
        category = "helpful";
      }

      return {
        edition_slug: source.slug,
        edition_title: source.title,
        issues_collected: source.issues_collected,
        importance: source.importance,
        connection_type: c.connection_type,
        strength: c.strength,
        description: c.description,
        category,
      };
    })
    .filter(Boolean) as { edition_slug: string; edition_title: string; issues_collected: string; importance: string; connection_type: string; strength: number; description: string; category: 'required' | 'recommended' | 'helpful' }[];
}

/** Get all edition data needed for comparison page */
export async function getEditionsForComparison(): Promise<
  {
    slug: string;
    title: string;
    format: string;
    issues_collected: string;
    issue_count: number;
    page_count?: number;
    cover_price?: number;
    print_status: string;
    importance: string;
    era_slug?: string;
    era_name?: string;
    synopsis: string;
    creator_names?: string[];
    cover_image_url: string | null;
  }[]
> {
  const editions = await getEditions();
  return editions.map((e) => ({
    slug: e.slug,
    title: e.title,
    format: e.format,
    issues_collected: e.issues_collected,
    issue_count: e.issue_count,
    page_count: e.page_count,
    cover_price: e.cover_price,
    print_status: e.print_status,
    importance: e.importance,
    era_slug: e.era_slug,
    era_name: e.era_name,
    synopsis: e.synopsis,
    creator_names: e.creator_names,
    cover_image_url: e.cover_image_url,
  }));
}

// ============================================================
// ISSUES (for Daily Briefing)
// ============================================================

export async function getIssues(): Promise<DailyIssue[]> {
  return cachedQuery("issues", async () => {
    const { data, error } = await supabase
      .from("issues")
      .select("*")
      .range(0, 999);
    if (error) {
      console.error("Error fetching issues:", error.message);
      return [];
    }
    return (data || []).map((i: Record<string, unknown>) => ({
      slug: i.slug as string,
      series: i.series as string,
      issue_number: i.issue_number as string,
      publication_date: i.publication_date as string,
      title: (i.title as string) || "",
      importance: (i.importance as DailyIssue["importance"]) || "recommended",
      first_appearances: (i.first_appearances as string[]) || [],
      tags: (i.tags as string[]) || [],
    }));
  });
}

// ============================================================
// WHAT IF? PATHS — lightweight data for graph algorithms
// ============================================================

export async function getEditionsForWhatIf(): Promise<
  { slug: string; title: string; importance: ImportanceLevel; era_slug: string; era_name: string }[]
> {
  const editions = await getEditions();
  return editions.map((e) => ({
    slug: e.slug,
    title: e.title,
    importance: e.importance as ImportanceLevel,
    era_slug: e.era_slug || "",
    era_name: e.era_name || "",
  }));
}

// ============================================================
// CREATOR DNA — analytics data
// ============================================================

export interface EditionCreatorRow {
  edition_id: string;
  creator_id: string;
  role: string;
}

export async function getAllEditionCreators(): Promise<EditionCreatorRow[]> {
  return cachedQuery("all-edition-creators", async () => {
    const data = await paginatedFetch(
      "edition_creators",
      "edition_id, creator_id, role"
    );
    return data.map((r: Record<string, unknown>) => ({
      edition_id: r.edition_id as string,
      creator_id: r.creator_id as string,
      role: (r.role as string) || "writer",
    }));
  });
}

export async function getCreatorDNAData(creatorSlug: string) {
  const [creator, editions, allEditionCreators, creators, eras] =
    await Promise.all([
      getCreatorBySlug(creatorSlug),
      getEditionsByCreator(creatorSlug),
      getAllEditionCreators(),
      getCreators(),
      getEras(),
    ]);

  return { creator, editions, allEditionCreators, creators, eras };
}

// ============================================================
// ASK THE WATCHER — context building helpers
// ============================================================

import type {
  WatcherPageContext,
  WatcherPageContextData,
} from "./watcher-context";

export async function getWatcherPageContextData(
  pageCtx: WatcherPageContext
): Promise<WatcherPageContextData> {
  const data: WatcherPageContextData = {};

  switch (pageCtx.pageType) {
    case "edition": {
      if (pageCtx.editionSlug) {
        const [edition, connections, prerequisites] = await Promise.all([
          getEditionBySlug(pageCtx.editionSlug),
          getConnectionsForEdition(pageCtx.editionSlug),
          getPrerequisites(pageCtx.editionSlug),
        ]);
        if (edition) data.edition = edition;
        data.connections = {
          outgoing: connections.outgoing.map((c) => ({
            target_title: c.target_title,
            connection_type: c.connection_type,
            strength: c.strength,
          })),
          incoming: connections.incoming.map((c) => ({
            source_title: c.source_title,
            connection_type: c.connection_type,
            strength: c.strength,
          })),
        };
        data.prerequisites = prerequisites.map((p) => ({
          edition_title: p.edition_title,
          category: p.category,
        }));
      }
      break;
    }

    case "path": {
      if (pageCtx.pathSlug) {
        const path = await getReadingPathBySlug(pageCtx.pathSlug);
        if (path) {
          data.path = {
            name: path.name,
            description: path.description,
            entries: path.entries.map((e) => ({
              title: e.edition.title,
              importance: e.edition.importance,
            })),
          };
        }
      }
      break;
    }

    case "collection": {
      if (pageCtx.collectionSlugs && pageCtx.collectionSlugs.length > 0) {
        const editions = await getEditions();
        const editionMap = new Map(editions.map((e) => [e.slug, e]));
        const titles = pageCtx.collectionSlugs
          .map((s) => editionMap.get(s)?.title)
          .filter(Boolean) as string[];
        data.collectionTitles = titles;
        data.collectionStats = {
          total: pageCtx.collectionSlugs.length,
          completed: 0,
          reading: 0,
        };
      }
      break;
    }

    case "timeline":
    case "home": {
      const eras = await getEras();
      data.erasSummary = eras.map((e) => ({
        name: e.name,
        year_start: e.year_start,
        year_end: e.year_end,
      }));
      break;
    }

    default:
      break;
  }

  return data;
}

// ============================================================
// WATCHER VERDICTS
// ============================================================

export interface WatcherVerdictData {
  rating: number;
  one_sentence: string;
  who_for: string[];
  who_skip: string[];
  continuity_impact: number;
  continuity_sets_up: string[];
  continuity_changes: string[];
  value_per_issue: string;
  value_verdict: string;
  deep_cut: string;
  prerequisites: string[];
}

export async function getWatcherVerdict(
  editionSlug: string
): Promise<{ verdict: WatcherVerdictData; model_version: string; generated_at: string } | null> {
  const { data, error } = await supabase
    .from("watcher_verdicts")
    .select("verdict_json, model_version, generated_at, expires_at")
    .eq("edition_slug", editionSlug)
    .single();

  if (error || !data) return null;

  // Check TTL
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }

  return {
    verdict: data.verdict_json as WatcherVerdictData,
    model_version: data.model_version,
    generated_at: data.generated_at,
  };
}

export async function saveWatcherVerdict(
  editionSlug: string,
  verdict: WatcherVerdictData,
  modelVersion: string
): Promise<void> {
  await supabase.from("watcher_verdicts").upsert(
    {
      edition_slug: editionSlug,
      verdict_json: verdict,
      model_version: modelVersion,
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "edition_slug" }
  );
}

export async function getWatcherSearchContext(query: string) {
  const [editions, conflicts, eras, characters] = await Promise.all([
    searchEditions(query),
    getConflicts(),
    getEras(),
    getCharacters(),
  ]);

  // Get top 5 edition matches
  const topEditions = editions.slice(0, 5);

  // Find matching conflicts
  const q = query.toLowerCase();
  const matchingConflicts = conflicts.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.tags.some((t) => q.includes(t.toLowerCase()))
  ).slice(0, 3);

  // Find matching characters
  const matchingCharacters = characters.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.aliases.some((a) => a.toLowerCase().includes(q))
  ).slice(0, 3);

  return { topEditions, matchingConflicts, matchingCharacters, eras };
}

// ============================================================
// MCU CONTENT (#33)
// ============================================================

export async function getMCUContent(): Promise<MCUContent[]> {
  return cachedQuery("mcu_content", async () => {
    const { data, error } = await supabase
      .from("mcu_content")
      .select("*")
      .order("release_date");
    if (error) {
      console.error("getMCUContent error:", error.message);
      return [];
    }
    return (data || []) as MCUContent[];
  });
}

export async function getMCUContentBySlug(slug: string): Promise<MCUContent | null> {
  const all = await getMCUContent();
  return all.find((m) => m.slug === slug) || null;
}

export async function getMCUMappingsForContent(mcuContentId: string): Promise<MCUComicMapping[]> {
  return cachedQuery(`mcu_mappings_${mcuContentId}`, async () => {
    const { data, error } = await supabase
      .from("mcu_comic_mappings")
      .select("*")
      .eq("mcu_content_id", mcuContentId);
    if (error) {
      console.error("getMCUMappingsForContent error:", error.message);
      return [];
    }
    // Enrich with edition data
    const editions = await getEditions();
    const editionMap = new Map(editions.map((e) => [e.id, e]));
    return (data || []).map((m: Record<string, unknown>) => {
      const edition = editionMap.get(m.edition_id as string);
      return {
        ...m,
        edition_slug: edition?.slug,
        edition_title: edition?.title,
        edition_cover_image_url: edition?.cover_image_url,
        edition_importance: edition?.importance,
      } as MCUComicMapping;
    });
  });
}

export async function getMCUMappingsForEdition(editionId: string): Promise<MCUComicMapping[]> {
  return cachedQuery(`mcu_mappings_edition_${editionId}`, async () => {
    const { data, error } = await supabase
      .from("mcu_comic_mappings")
      .select("*")
      .eq("edition_id", editionId);
    if (error) {
      console.error("getMCUMappingsForEdition error:", error.message);
      return [];
    }
    const mcuContent = await getMCUContent();
    const mcuMap = new Map(mcuContent.map((m) => [m.id, m]));
    return (data || []).map((m: Record<string, unknown>) => {
      const mcu = mcuMap.get(m.mcu_content_id as string);
      return {
        ...m,
        mcu_title: mcu?.title,
        mcu_slug: mcu?.slug,
        mcu_poster_url: mcu?.poster_url,
        mcu_content_type: mcu?.content_type,
      } as MCUComicMapping;
    });
  });
}

// ============================================================
// DEBATES (#34)
// ============================================================

export async function getDebates(): Promise<Debate[]> {
  return cachedQuery("debates", async () => {
    const { data, error } = await supabase
      .from("debates")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("getDebates error:", error.message);
      return [];
    }
    // Get vote counts
    const { data: votes } = await supabase
      .from("debate_votes")
      .select("debate_id, position");
    const voteCounts = new Map<string, { agree: number; disagree: number; complicated: number }>();
    for (const v of votes || []) {
      const id = v.debate_id as string;
      if (!voteCounts.has(id)) voteCounts.set(id, { agree: 0, disagree: 0, complicated: 0 });
      const counts = voteCounts.get(id)!;
      const pos = v.position as string;
      if (pos === "agree") counts.agree++;
      else if (pos === "disagree") counts.disagree++;
      else counts.complicated++;
    }
    return (data || []).map((d: Record<string, unknown>) => {
      const counts = voteCounts.get(d.id as string) || { agree: 0, disagree: 0, complicated: 0 };
      return {
        ...d,
        agree_count: counts.agree,
        disagree_count: counts.disagree,
        complicated_count: counts.complicated,
        total_votes: counts.agree + counts.disagree + counts.complicated,
      } as Debate;
    });
  });
}

export async function getDebateBySlug(slug: string): Promise<Debate | null> {
  const all = await getDebates();
  return all.find((d) => d.slug === slug) || null;
}

export async function getDebateEvidence(debateId: string): Promise<DebateEvidence[]> {
  const { data, error } = await supabase
    .from("debate_evidence")
    .select("*")
    .eq("debate_id", debateId)
    .order("vote_count", { ascending: false });
  if (error) {
    console.error("getDebateEvidence error:", error.message);
    return [];
  }
  return (data || []) as DebateEvidence[];
}

// ============================================================
// INFINITY THEMES (#26)
// ============================================================

export async function getEditionsWithThemes(): Promise<(CollectedEdition & { infinity_themes: InfinityTheme[] })[]> {
  return cachedQuery("editions_with_themes", async () => {
    const editions = await getEditions();
    // Fetch themes from DB
    const { data } = await supabase
      .from("collected_editions")
      .select("slug, infinity_themes");
    const themeMap = new Map<string, InfinityTheme[]>();
    for (const row of data || []) {
      themeMap.set(row.slug as string, (row.infinity_themes as InfinityTheme[]) || []);
    }
    return editions.map((e) => ({
      ...e,
      infinity_themes: themeMap.get(e.slug) || [],
    }));
  });
}

export async function getEditionsByTheme(theme: InfinityTheme): Promise<CollectedEdition[]> {
  const editions = await getEditionsWithThemes();
  return editions.filter((e) => e.infinity_themes.includes(theme));
}
