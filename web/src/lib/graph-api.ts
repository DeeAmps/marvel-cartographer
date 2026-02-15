const GRAPH_API_URL = process.env.GO_GRAPH_SERVICE_URL || process.env.NEXT_PUBLIC_GRAPH_API_URL || 'http://localhost:8080';

async function fetchGraph<T>(path: string): Promise<T> {
  const res = await fetch(`${GRAPH_API_URL}${path}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`Graph API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getWhatsNext(editionId: string) {
  return fetchGraph<{
    edition_id: string;
    results: import('./types').WhatsNextResult[];
    count: number;
  }>(`/api/v1/graph/whats-next/${editionId}`);
}

export async function getConnections(editionId: string) {
  return fetchGraph<{
    edition: import('./types').CollectedEdition;
    outgoing: import('./types').Connection[];
    incoming: import('./types').Connection[];
  }>(`/api/v1/graph/connections/${editionId}`);
}

export async function getTimeline() {
  return fetchGraph<{
    eras: Record<string, import('./types').CollectedEdition[]>;
    connections: import('./types').Connection[];
    total_nodes: number;
    total_edges: number;
  }>('/api/v1/graph/timeline');
}

export async function getReadingPath(pathId: string) {
  return fetchGraph<import('./types').ReadingPath>(`/api/v1/graph/path/${pathId}`);
}

export async function getShortestPath(fromId: string, toId: string) {
  return fetchGraph<{
    nodes: import('./types').CollectedEdition[];
    edges: import('./types').Connection[];
    hops: number;
  }>(`/api/v1/graph/shortest-path?from=${fromId}&to=${toId}`);
}

// ============================================================
// Differentiator Feature Endpoints
// ============================================================

export async function getPurchasePlan(pathId: string) {
  return fetchGraph<import('./types').PurchasePlan>(
    `/api/v1/graph/purchase-plan/${pathId}`
  );
}

export async function getOverlap(editionSlugs: string[]) {
  return fetchGraph<import('./types').OverlapResponse>(
    `/api/v1/graph/overlap?editions=${editionSlugs.join(',')}`
  );
}

export async function getCreatorSaga(creatorSlug: string) {
  return fetchGraph<import('./types').CreatorSaga>(
    `/api/v1/graph/creator-saga/${creatorSlug}`
  );
}

export async function getPriceHistory(editionId: string) {
  return fetchGraph<{
    edition: import('./types').CollectedEdition;
    history: import('./types').PrintStatusChange[];
  }>(`/api/v1/graph/price-history/${editionId}`);
}
