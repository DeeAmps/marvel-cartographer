"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import type { ForceGraphNode, ForceGraphEdge } from "@/lib/graph/types";
import { CONNECTION_TYPE_COLORS, IMPORTANCE_COLORS } from "@/lib/constants/colors";
import { CONNECTION_TYPE_LABELS } from "@/lib/constants/labels";

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  slug: string;
  title: string;
  importance: string;
  print_status: string;
  era_color?: string;
  depth: number;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  connection_type: string;
  strength: number;
  confidence: number;
  description: string;
}

const IMPORTANCE_RADIUS: Record<string, number> = {
  essential: 12,
  recommended: 9,
  supplemental: 7,
  completionist: 5,
};

const ROOT_RADIUS = 16;
const MAX_VISIBLE_NODES = 50;

interface ForceCanvasProps {
  nodes: ForceGraphNode[];
  edges: ForceGraphEdge[];
  rootId: string;
  onHover: (data: { x: number; y: number; node: ForceGraphNode; edge?: ForceGraphEdge } | null) => void;
  onNodeClick: (slug: string) => void;
}

export default function ForceCanvas({
  nodes,
  edges,
  rootId,
  onHover,
  onNodeClick,
}: ForceCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 440 });

  // Responsive sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setDimensions({ width: Math.max(w, 400), height: w < 640 ? 340 : 440 });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleHover = useCallback(onHover, [onHover]);
  const handleClick = useCallback(onNodeClick, [onNodeClick]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;

    // Cap visible nodes for performance — take top-N by strength per depth
    let visibleNodes = nodes;
    if (nodes.length > MAX_VISIBLE_NODES) {
      const byDepth = new Map<number, ForceGraphNode[]>();
      for (const n of nodes) {
        if (!byDepth.has(n.depth)) byDepth.set(n.depth, []);
        byDepth.get(n.depth)!.push(n);
      }
      visibleNodes = [];
      for (const [, group] of byDepth) {
        visibleNodes.push(...group.slice(0, Math.ceil(MAX_VISIBLE_NODES / byDepth.size)));
      }
    }

    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    const visibleEdges = edges.filter(
      (e) => visibleIds.has(e.source) && visibleIds.has(e.target)
    );

    // D3 simulation data
    const simNodes: D3Node[] = visibleNodes.map((n) => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * 20,
      y: height / 2 + (Math.random() - 0.5) * 20,
    }));

    const simLinks: D3Link[] = visibleEdges.map((e) => ({
      source: e.source,
      target: e.target,
      connection_type: e.connection_type,
      strength: e.strength,
      confidence: e.confidence,
      description: e.description,
    }));

    // Force simulation
    const simulation = d3
      .forceSimulation(simNodes)
      .alpha(1.2)
      .alphaDecay(0.025)
      .force(
        "link",
        d3
          .forceLink<D3Node, D3Link>(simLinks)
          .id((d) => d.id)
          .distance((d) => 80 + (10 - d.strength) * 10)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Defs: arrow markers per connection type
    const defs = svg.append("defs");

    // Pulsing ring for root node
    defs
      .append("radialGradient")
      .attr("id", "root-pulse-gradient")
      .selectAll("stop")
      .data([
        { offset: "60%", color: "var(--accent-red)", opacity: "0.3" },
        { offset: "100%", color: "var(--accent-red)", opacity: "0" },
      ])
      .enter()
      .append("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color)
      .attr("stop-opacity", (d) => d.opacity);

    // Arrow markers
    const connectionTypes = [...new Set(visibleEdges.map((e) => e.connection_type))];
    for (const type of connectionTypes) {
      defs
        .append("marker")
        .attr("id", `arrow-${type}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("fill", CONNECTION_TYPE_COLORS[type] || "#6e7681")
        .attr("d", "M0,-5L10,0L0,5");
    }

    const g = svg.append("g");

    // Zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    // Edges
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(simLinks)
      .enter()
      .append("line")
      .attr("stroke", (d) => CONNECTION_TYPE_COLORS[d.connection_type] || "#6e7681")
      .attr("stroke-opacity", (d) => Math.max(0.3, d.confidence / 150))
      .attr("stroke-width", (d) => Math.max(1, d.strength / 3))
      .attr("marker-end", (d) => `url(#arrow-${d.connection_type})`);

    // Edge labels
    const linkLabel = g
      .append("g")
      .attr("class", "link-labels")
      .selectAll("text")
      .data(simLinks)
      .enter()
      .append("text")
      .attr("text-anchor", "middle")
      .attr("fill", (d) => CONNECTION_TYPE_COLORS[d.connection_type] || "#6e7681")
      .attr("font-size", "7px")
      .attr("opacity", 0.6)
      .text((d) => CONNECTION_TYPE_LABELS[d.connection_type] || d.connection_type.replace(/_/g, " "));

    // Node groups
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(simNodes)
      .enter()
      .append("g")
      .attr("cursor", "pointer")
      .style("opacity", (d) => {
        // Staggered entrance by depth
        const fade = 1 - d.depth * 0.15;
        return Math.max(0.4, fade);
      })
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

    // Root pulsing highlight ring
    node
      .filter((d) => d.id === rootId)
      .append("circle")
      .attr("r", ROOT_RADIUS + 8)
      .attr("fill", "url(#root-pulse-gradient)")
      .append("animate")
      .attr("attributeName", "r")
      .attr("values", `${ROOT_RADIUS + 6};${ROOT_RADIUS + 12};${ROOT_RADIUS + 6}`)
      .attr("dur", "2s")
      .attr("repeatCount", "indefinite");

    // Node circles — colored by era_color if available, else importance
    node
      .append("circle")
      .attr("r", (d) =>
        d.id === rootId
          ? ROOT_RADIUS
          : IMPORTANCE_RADIUS[d.importance] || 7
      )
      .attr("fill", (d) => d.era_color || IMPORTANCE_COLORS[d.importance] || "#6e7681")
      .attr("stroke", (d) => (d.id === rootId ? "#fff" : "#0d1117"))
      .attr("stroke-width", (d) => (d.id === rootId ? 3 : 1.5));

    // Node labels
    node
      .append("text")
      .attr("dy", (d) => (d.id === rootId ? ROOT_RADIUS + 14 : (IMPORTANCE_RADIUS[d.importance] || 7) + 12))
      .attr("text-anchor", "middle")
      .attr("fill", "#e6edf3")
      .attr("font-size", (d) => (d.id === rootId ? "10px" : "8px"))
      .attr("font-weight", (d) => (d.id === rootId ? "bold" : "normal"))
      .text((d) => (d.title.length > 22 ? d.title.slice(0, 20) + "..." : d.title));

    // Hover + click interactions
    node
      .on("mouseenter", function (event: MouseEvent, d: D3Node) {
        d3.select(this)
          .select("circle:not(:first-child)")
          .transition()
          .duration(150)
          .attr("r", (d.id === rootId ? ROOT_RADIUS : (IMPORTANCE_RADIUS[d.importance] || 7)) + 4);

        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          // Find the edge connecting this node to its parent
          const edge = visibleEdges.find(
            (e) => e.target === d.id || e.source === d.id
          );
          handleHover({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top - 10,
            node: visibleNodes.find((n) => n.id === d.id) || {
              id: d.id,
              slug: d.slug,
              title: d.title,
              importance: d.importance,
              print_status: d.print_status,
              era_color: d.era_color,
              depth: d.depth,
            },
            edge: edge || undefined,
          });
        }
      })
      .on("mouseleave", function (_event: MouseEvent, d: D3Node) {
        d3.select(this)
          .select("circle:not(:first-child)")
          .transition()
          .duration(150)
          .attr("r", d.id === rootId ? ROOT_RADIUS : IMPORTANCE_RADIUS[d.importance] || 7);
        handleHover(null);
      })
      .on("click", (_event: MouseEvent, d: D3Node) => {
        if (d.id !== rootId) {
          handleClick(d.slug);
        }
      });

    // Tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as D3Node).x!)
        .attr("y1", (d) => (d.source as D3Node).y!)
        .attr("x2", (d) => (d.target as D3Node).x!)
        .attr("y2", (d) => (d.target as D3Node).y!);

      linkLabel
        .attr("x", (d) => ((d.source as D3Node).x! + (d.target as D3Node).x!) / 2)
        .attr("y", (d) => ((d.source as D3Node).y! + (d.target as D3Node).y!) / 2);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, rootId, dimensions, handleHover, handleClick]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="rounded-lg"
        style={{ background: "var(--bg-primary)" }}
        role="img"
        aria-label={`Connection graph showing ${nodes.length} related editions`}
      />

      {/* Screen reader summary */}
      <div className="sr-only">
        <p>Graph connections:</p>
        <ul>
          {edges.map((e, i) => {
            const src = nodes.find((n) => n.id === e.source);
            const tgt = nodes.find((n) => n.id === e.target);
            return (
              <li key={i}>
                {src?.title || e.source} {e.connection_type.replace(/_/g, " ")} {tgt?.title || e.target}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
