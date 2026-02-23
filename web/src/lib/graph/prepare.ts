import type { CollectedEdition, GraphData } from "../types";
import type {
  ForceGraphNode,
  ForceGraphEdge,
  TraversalResult,
  ConnectionTypeFilter,
} from "./types";

/**
 * Convert GraphData (from getMultiHopConnections) into a TraversalResult
 * suitable for the force-directed graph, with optional depth and type filtering.
 */
export function prepareTraversal(
  graphData: GraphData,
  rootSlug: string,
  editions: CollectedEdition[],
  depth: number = 3,
  typeFilters?: ConnectionTypeFilter[]
): TraversalResult {
  const editionMap = new Map(editions.map((e) => [e.slug, e]));

  // Filter nodes by depth
  const filteredNodes = graphData.nodes.filter((n) => n.depth <= depth);
  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

  // Filter edges by visible nodes and optionally by connection type
  let filteredEdges = graphData.edges.filter(
    (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
  );

  if (typeFilters && typeFilters.length > 0) {
    const typeSet = new Set(typeFilters);
    filteredEdges = filteredEdges.filter((e) =>
      typeSet.has(e.connection_type)
    );

    // After type filtering, remove orphan nodes (nodes with no edges)
    // but always keep the root
    const connectedIds = new Set<string>();
    connectedIds.add(rootSlug);
    for (const e of filteredEdges) {
      connectedIds.add(e.source);
      connectedIds.add(e.target);
    }
    const nodesAfterFilter = filteredNodes.filter((n) =>
      connectedIds.has(n.id)
    );

    return {
      nodes: toForceNodes(nodesAfterFilter, editionMap),
      edges: toForceEdges(filteredEdges),
      rootId: rootSlug,
    };
  }

  return {
    nodes: toForceNodes(filteredNodes, editionMap),
    edges: toForceEdges(filteredEdges),
    rootId: rootSlug,
  };
}

function toForceNodes(
  nodes: GraphData["nodes"],
  editionMap: Map<string, CollectedEdition>
): ForceGraphNode[] {
  return nodes.map((n) => {
    const edition = editionMap.get(n.slug);
    return {
      id: n.id,
      slug: n.slug,
      title: n.title,
      importance: n.importance,
      print_status: n.print_status,
      cover_image_url: n.cover_image_url,
      era_color: edition?.era_color,
      issues_collected: edition?.issues_collected,
      format: edition?.format,
      depth: n.depth,
    };
  });
}

function toForceEdges(
  edges: GraphData["edges"]
): ForceGraphEdge[] {
  return edges.map((e) => ({
    source: e.source,
    target: e.target,
    connection_type: e.connection_type,
    strength: e.strength,
    confidence: e.confidence,
    description: e.description,
  }));
}

/**
 * Get unique connection types present in a graph dataset.
 */
export function getActiveConnectionTypes(
  graphData: GraphData
): string[] {
  return [...new Set(graphData.edges.map((e) => e.connection_type))];
}
