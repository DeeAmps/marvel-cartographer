"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import GraphTooltip from "./GraphTooltip";

interface GraphNode {
  slug: string;
  name: string;
  teams: string[];
  universe: string;
  editionCount: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  strength: number;
  label: string;
}

interface D3Node extends d3.SimulationNodeDatum {
  slug: string;
  name: string;
  teams: string[];
  universe: string;
  editionCount: number;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  type: string;
  strength: number;
  label: string;
}

const TEAM_COLORS: Record<string, string> = {
  "X-Men": "#f0a500",
  Avengers: "#4fc3f7",
  "Fantastic Four": "#e94560",
  "Guardians of the Galaxy": "#bb86fc",
  Defenders: "#00e676",
  Thunderbolts: "#6e7681",
  Illuminati: "#f0a500",
  "New Mutants": "#f0a500",
  Inhumans: "#bb86fc",
};

const EDGE_COLORS: Record<string, string> = {
  ally: "#00e676",
  enemy: "#e94560",
  family: "#4fc3f7",
  romantic: "#f48fb1",
  mentor: "#f0a500",
  rival: "#f0a500",
  teammate: "#6e7681",
};

function getNodeColor(teams: string[]): string {
  for (const team of teams) {
    if (TEAM_COLORS[team]) return TEAM_COLORS[team];
  }
  return "#6e7681";
}

function getNodeRadius(editionCount: number): number {
  return Math.max(6, Math.min(20, 4 + Math.sqrt(editionCount) * 2));
}

export default function RelationshipGraph({
  nodes,
  edges,
  focusSlug,
  activeTeams,
  activeRelTypes,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  focusSlug: string | null;
  activeTeams: Set<string>;
  activeRelTypes: Set<string>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const nodeSelRef = useRef<d3.Selection<SVGGElement, D3Node, SVGGElement, unknown> | null>(null);
  const linkSelRef = useRef<d3.Selection<SVGLineElement, D3Link, SVGGElement, unknown> | null>(null);
  const d3NodesRef = useRef<D3Node[]>([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    name?: string;
    teams?: string[];
    editionCount?: number;
    relationshipType?: string;
    relationshipLabel?: string;
    strength?: number;
  } | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const selectedNodeRef = useRef<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setDimensions({ width: Math.max(w, 400), height: w < 640 ? 400 : 550 });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Focus on a node when focusSlug changes
  useEffect(() => {
    if (focusSlug) setSelectedNode(focusSlug);
  }, [focusSlug]);

  // Filter nodes and edges
  const filteredNodes = nodes.filter((n) => {
    if (activeTeams.size === 0) return true;
    return n.teams.some((t) => activeTeams.has(t));
  });

  const filteredNodeSlugs = new Set(filteredNodes.map((n) => n.slug));

  const filteredEdges = edges.filter((e) => {
    if (!filteredNodeSlugs.has(e.source) || !filteredNodeSlugs.has(e.target)) return false;
    if (activeRelTypes.size === 0) return true;
    return activeRelTypes.has(e.type);
  });

  // Build the graph — only when nodes/edges/dimensions change, NOT on selection
  const renderGraph = useCallback(() => {
    if (!svgRef.current || filteredNodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;

    const d3Nodes: D3Node[] = filteredNodes.map((n) => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * 100,
      y: height / 2 + (Math.random() - 0.5) * 100,
    }));
    d3NodesRef.current = d3Nodes;

    const nodeMap = new Map(d3Nodes.map((n) => [n.slug, n]));

    const d3Links: D3Link[] = filteredEdges
      .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map((e) => ({
        source: e.source,
        target: e.target,
        type: e.type,
        strength: e.strength,
        label: e.label,
      }));

    const simulation = d3
      .forceSimulation(d3Nodes)
      .alpha(1)
      .alphaDecay(0.02)
      .force(
        "link",
        d3
          .forceLink<D3Node, D3Link>(d3Links)
          .id((d) => d.slug)
          .distance((d) => 100 + (10 - d.strength) * 8)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide<D3Node>().radius((d) => getNodeRadius(d.editionCount) + 4)
      );

    simulationRef.current = simulation;

    const g = svg.append("g");
    gRef.current = g;

    // Zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    zoomRef.current = zoom;
    svg.call(zoom);

    // Edge lines
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(d3Links)
      .enter()
      .append("line")
      .attr("stroke", (d) => EDGE_COLORS[d.type] || "#6e7681")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", (d) => Math.max(1, d.strength / 3));
    linkSelRef.current = link;

    // Node groups
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, D3Node>("g")
      .data(d3Nodes)
      .enter()
      .append("g")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, D3Node>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );
    nodeSelRef.current = node;

    // Node circles
    node
      .append("circle")
      .attr("r", (d) => getNodeRadius(d.editionCount))
      .attr("fill", (d) => getNodeColor(d.teams))
      .attr("stroke", "#0d1117")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.9);

    // Node labels
    node
      .append("text")
      .attr("dy", (d) => getNodeRadius(d.editionCount) + 12)
      .attr("text-anchor", "middle")
      .attr("fill", "#e6edf3")
      .attr("font-size", (d) => (d.editionCount > 5 ? "9px" : "7px"))
      .attr("font-weight", (d) => (d.editionCount > 5 ? "bold" : "normal"))
      .attr("opacity", (d) => (d.editionCount > 3 ? 0.8 : 0.4))
      .text((d) => (d.name.length > 16 ? d.name.slice(0, 14) + "..." : d.name));

    // Interactions
    node
      .on("mouseenter", function (event: MouseEvent, d: D3Node) {
        d3.select(this)
          .select("circle")
          .transition()
          .duration(150)
          .attr("r", getNodeRadius(d.editionCount) + 4)
          .attr("stroke", "#fff")
          .attr("stroke-width", 2);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltip({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top - 10,
            name: d.name,
            teams: d.teams,
            editionCount: d.editionCount,
          });
        }
      })
      .on("mouseleave", function (_event: MouseEvent, d: D3Node) {
        d3.select(this)
          .select("circle")
          .transition()
          .duration(150)
          .attr("r", getNodeRadius(d.editionCount))
          .attr("stroke", (selectedNodeRef.current === d.slug) ? "#fff" : "#0d1117")
          .attr("stroke-width", (selectedNodeRef.current === d.slug) ? 2.5 : 1.5);
        setTooltip(null);
      })
      .on("click", (_event: MouseEvent, d: D3Node) => {
        setSelectedNode((prev) => (prev === d.slug ? null : d.slug));
      })
      .on("dblclick", (_event: MouseEvent, d: D3Node) => {
        window.location.href = `/character/${d.slug}`;
      });

    // Edge hover for tooltip
    link
      .on("mouseenter", function (event: MouseEvent, d: D3Link) {
        d3.select(this)
          .attr("stroke-opacity", 1)
          .attr("stroke-width", Math.max(2, d.strength / 2));
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltip({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top - 10,
            relationshipType: d.type,
            relationshipLabel: d.label,
            strength: d.strength,
          });
        }
      })
      .on("mouseleave", function (_event: MouseEvent, d: D3Link) {
        const sel = selectedNodeRef.current;
        const src = (d.source as D3Node).slug || (d.source as string);
        const tgt = (d.target as D3Node).slug || (d.target as string);
        const isHighlighted = sel && (src === sel || tgt === sel);
        d3.select(this)
          .attr("stroke-opacity", isHighlighted ? 0.8 : (sel ? 0.05 : 0.4))
          .attr("stroke-width", Math.max(1, d.strength / 3));
        setTooltip(null);
      });

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as D3Node).x!)
        .attr("y1", (d) => (d.source as D3Node).y!)
        .attr("x2", (d) => (d.target as D3Node).x!)
        .attr("y2", (d) => (d.target as D3Node).y!);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredNodes.length, filteredEdges.length, dimensions]);

  useEffect(() => {
    const cleanup = renderGraph();
    return () => cleanup?.();
  }, [renderGraph]);

  // Highlight effect — runs when selectedNode changes WITHOUT rebuilding the graph
  useEffect(() => {
    const nodeSel = nodeSelRef.current;
    const linkSel = linkSelRef.current;
    if (!nodeSel || !linkSel) return;

    const sel = selectedNode;

    // Build connected set for fast lookup
    const connectedSlugs = new Set<string>();
    if (sel) {
      connectedSlugs.add(sel);
      linkSel.each(function (d) {
        const src = (d.source as D3Node).slug || (d.source as string);
        const tgt = (d.target as D3Node).slug || (d.target as string);
        if (src === sel) connectedSlugs.add(tgt);
        if (tgt === sel) connectedSlugs.add(src);
      });
    }

    // Update node circles
    nodeSel.select("circle")
      .transition()
      .duration(300)
      .attr("opacity", (d) => {
        if (!sel) return 0.9;
        if (d.slug === sel) return 1;
        return connectedSlugs.has(d.slug) ? 0.9 : 0.1;
      })
      .attr("stroke", (d) => {
        if (d.slug === sel) return "#fff";
        return "#0d1117";
      })
      .attr("stroke-width", (d) => {
        if (d.slug === sel) return 2.5;
        return 1.5;
      })
      .attr("r", (d) => {
        if (d.slug === sel) return getNodeRadius(d.editionCount) + 3;
        return getNodeRadius(d.editionCount);
      });

    // Update node labels
    nodeSel.select("text")
      .transition()
      .duration(300)
      .attr("opacity", (d) => {
        if (!sel) return d.editionCount > 3 ? 0.8 : 0.4;
        if (d.slug === sel) return 1;
        return connectedSlugs.has(d.slug) ? 1 : 0.05;
      });

    // Update edges
    linkSel
      .transition()
      .duration(300)
      .attr("stroke-opacity", (d) => {
        if (!sel) return 0.4;
        const src = (d.source as D3Node).slug || (d.source as string);
        const tgt = (d.target as D3Node).slug || (d.target as string);
        if (src === sel || tgt === sel) return 0.8;
        return 0.03;
      })
      .attr("stroke-width", (d) => {
        if (!sel) return Math.max(1, d.strength / 3);
        const src = (d.source as D3Node).slug || (d.source as string);
        const tgt = (d.target as D3Node).slug || (d.target as string);
        if (src === sel || tgt === sel) return Math.max(2, d.strength / 2);
        return Math.max(0.5, d.strength / 4);
      });

    // Zoom to focused node
    if (sel && svgRef.current && zoomRef.current) {
      const targetNode = d3NodesRef.current.find((n) => n.slug === sel);
      if (targetNode && targetNode.x != null && targetNode.y != null) {
        const svg = d3.select(svgRef.current);
        const { width, height } = dimensions;
        const scale = 1.5;
        const tx = width / 2 - targetNode.x * scale;
        const ty = height / 2 - targetNode.y * scale;
        svg.transition()
          .duration(500)
          .call(
            zoomRef.current.transform,
            d3.zoomIdentity.translate(tx, ty).scale(scale)
          );
      }
    } else if (!sel && svgRef.current && zoomRef.current) {
      // Reset zoom when deselecting
      const svg = d3.select(svgRef.current);
      svg.transition()
        .duration(500)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  }, [selectedNode, dimensions]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="rounded-lg"
        style={{ background: "var(--bg-primary)" }}
        role="img"
        aria-label={`Character relationship graph with ${filteredNodes.length} characters and ${filteredEdges.length} connections`}
      />

      {/* Screen reader summary */}
      <div className="sr-only">
        <p>Character relationship graph:</p>
        <ul>
          {filteredEdges.slice(0, 20).map((e, i) => (
            <li key={i}>
              {e.source} {e.type} {e.target}: {e.label}
            </li>
          ))}
        </ul>
      </div>

      {/* Legend */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        {[
          { label: "Ally", color: EDGE_COLORS.ally },
          { label: "Enemy", color: EDGE_COLORS.enemy },
          { label: "Family", color: EDGE_COLORS.family },
          { label: "Romantic", color: EDGE_COLORS.romantic },
          { label: "Mentor/Rival", color: EDGE_COLORS.mentor },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ background: item.color }} />
            <span
              className="text-xs hidden sm:inline"
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.65rem",
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Selection indicator */}
      {selectedNode && (
        <div className="absolute bottom-2 left-2">
          <button
            onClick={() => setSelectedNode(null)}
            className="px-2 py-1 rounded text-xs font-bold"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--accent-gold)",
              border: "1px solid var(--accent-gold)",
            }}
          >
            Focused: {nodes.find((n) => n.slug === selectedNode)?.name || selectedNode} — Click to
            clear
          </button>
        </div>
      )}

      {tooltip && <GraphTooltip {...tooltip} />}
    </div>
  );
}
