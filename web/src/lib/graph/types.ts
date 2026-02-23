import type { ConnectionType } from "../types";

export interface ForceGraphNode {
  id: string;
  slug: string;
  title: string;
  importance: string;
  print_status: string;
  cover_image_url?: string;
  era_color?: string;
  issues_collected?: string;
  format?: string;
  depth: number;
}

export interface ForceGraphEdge {
  source: string;
  target: string;
  connection_type: string;
  strength: number;
  confidence: number;
  description: string;
}

export interface TraversalResult {
  nodes: ForceGraphNode[];
  edges: ForceGraphEdge[];
  rootId: string;
}

export type ConnectionTypeFilter = ConnectionType | string;
