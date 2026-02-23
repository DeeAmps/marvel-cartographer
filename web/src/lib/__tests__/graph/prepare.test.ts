import { describe, it, expect } from "vitest";
import { prepareTraversal, getActiveConnectionTypes } from "../../graph/prepare";
import type { GraphData, CollectedEdition } from "../../types";

const MOCK_EDITIONS: CollectedEdition[] = [
  {
    id: "ff-v1",
    slug: "ff-v1",
    title: "Fantastic Four Omnibus Vol. 1",
    format: "omnibus",
    issues_collected: "FF #1-30",
    issue_count: 30,
    print_status: "in_print",
    importance: "essential",
    era_id: "birth-of-marvel",
    era_slug: "birth-of-marvel",
    era_color: "#e94560",
    synopsis: "Origin of the Marvel Universe.",
    connection_notes: "",
    cover_image_url: null,
  },
  {
    id: "ff-v2",
    slug: "ff-v2",
    title: "Fantastic Four Omnibus Vol. 2",
    format: "omnibus",
    issues_collected: "FF #31-60",
    issue_count: 30,
    print_status: "in_print",
    importance: "essential",
    era_id: "birth-of-marvel",
    era_slug: "birth-of-marvel",
    era_color: "#e94560",
    synopsis: "Galactus Trilogy.",
    connection_notes: "",
    cover_image_url: null,
  },
  {
    id: "asm-v1",
    slug: "asm-v1",
    title: "Amazing Spider-Man Omnibus Vol. 1",
    format: "omnibus",
    issues_collected: "ASM #1-38",
    issue_count: 38,
    print_status: "in_print",
    importance: "recommended",
    era_id: "birth-of-marvel",
    era_slug: "birth-of-marvel",
    era_color: "#e94560",
    synopsis: "Spider-Man origin.",
    connection_notes: "",
    cover_image_url: null,
  },
];

const MOCK_GRAPH_DATA: GraphData = {
  nodes: [
    { id: "ff-v1", slug: "ff-v1", title: "Fantastic Four Omnibus Vol. 1", importance: "essential", print_status: "in_print", depth: 0 },
    { id: "ff-v2", slug: "ff-v2", title: "Fantastic Four Omnibus Vol. 2", importance: "essential", print_status: "in_print", depth: 1 },
    { id: "asm-v1", slug: "asm-v1", title: "Amazing Spider-Man Omnibus Vol. 1", importance: "recommended", print_status: "in_print", depth: 2 },
  ],
  edges: [
    { source: "ff-v1", target: "ff-v2", connection_type: "leads_to", strength: 10, confidence: 100, description: "Direct continuation" },
    { source: "ff-v2", target: "asm-v1", connection_type: "ties_into", strength: 5, confidence: 80, description: "Crossover" },
  ],
};

describe("prepareTraversal", () => {
  it("returns all nodes and edges at max depth", () => {
    const result = prepareTraversal(MOCK_GRAPH_DATA, "ff-v1", MOCK_EDITIONS, 3);
    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);
    expect(result.rootId).toBe("ff-v1");
  });

  it("filters nodes by depth", () => {
    const result = prepareTraversal(MOCK_GRAPH_DATA, "ff-v1", MOCK_EDITIONS, 1);
    expect(result.nodes).toHaveLength(2); // depth 0 + depth 1
    expect(result.edges).toHaveLength(1); // only ff-v1 -> ff-v2
    expect(result.nodes.map((n) => n.id)).toContain("ff-v1");
    expect(result.nodes.map((n) => n.id)).toContain("ff-v2");
    expect(result.nodes.map((n) => n.id)).not.toContain("asm-v1");
  });

  it("filters edges by connection type", () => {
    const result = prepareTraversal(MOCK_GRAPH_DATA, "ff-v1", MOCK_EDITIONS, 3, ["leads_to"]);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].connection_type).toBe("leads_to");
    // asm-v1 should be removed as an orphan (only connected via ties_into)
    expect(result.nodes.map((n) => n.id)).not.toContain("asm-v1");
  });

  it("always keeps root node even with type filters", () => {
    const result = prepareTraversal(MOCK_GRAPH_DATA, "ff-v1", MOCK_EDITIONS, 3, ["ties_into"]);
    expect(result.nodes.map((n) => n.id)).toContain("ff-v1");
  });

  it("enriches nodes with edition data (era_color, issues_collected)", () => {
    const result = prepareTraversal(MOCK_GRAPH_DATA, "ff-v1", MOCK_EDITIONS, 3);
    const ffNode = result.nodes.find((n) => n.id === "ff-v1");
    expect(ffNode?.era_color).toBe("#e94560");
    expect(ffNode?.issues_collected).toBe("FF #1-30");
    expect(ffNode?.format).toBe("omnibus");
  });

  it("handles empty graph data", () => {
    const empty: GraphData = { nodes: [], edges: [] };
    const result = prepareTraversal(empty, "ff-v1", MOCK_EDITIONS, 3);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });
});

describe("getActiveConnectionTypes", () => {
  it("returns unique connection types from edges", () => {
    const types = getActiveConnectionTypes(MOCK_GRAPH_DATA);
    expect(types).toContain("leads_to");
    expect(types).toContain("ties_into");
    expect(types).toHaveLength(2);
  });

  it("returns empty array for empty graph", () => {
    const types = getActiveConnectionTypes({ nodes: [], edges: [] });
    expect(types).toHaveLength(0);
  });
});
