"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import Link from "next/link";
import type { GraphData } from "@/lib/types";

interface ConnectionNode {
  slug: string;
  title: string;
  importance: string;
  status: string;
  issues: string;
  connectionType: string;
  strength: number;
  confidence: number;
  description: string;
  direction: "outgoing" | "incoming";
}

const typeColors: Record<string, string> = {
  leads_to: "#e94560",
  recommended_after: "#f0a500",
  spin_off: "#bb86fc",
  ties_into: "#4fc3f7",
  prerequisite: "#00e676",
  parallel: "#6e7681",
  references: "#6e7681",
  retcons: "#ff1744",
  collected_in: "#6e7681",
};

const typeLabels: Record<string, string> = {
  leads_to: "Leads to",
  recommended_after: "Read after",
  spin_off: "Spin-off",
  ties_into: "Ties into",
  prerequisite: "Prerequisite",
  parallel: "Parallel",
  references: "References",
  retcons: "Retcons",
  collected_in: "Collected in",
};

const importanceColors: Record<string, string> = {
  essential: "#ff1744",
  recommended: "#f0a500",
  supplemental: "#00e676",
  completionist: "#6e7681",
};

function StrengthBar({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="w-1.5 h-2 rounded-sm"
          style={{
            background: i < value ? "var(--accent-gold)" : "var(--bg-tertiary)",
          }}
        />
      ))}
    </div>
  );
}

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  slug: string;
  title: string;
  importance: string;
  print_status: string;
  cover_image_url?: string;
  depth: number;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  connection_type: string;
  strength: number;
  confidence: number;
  description: string;
}

function ForceGraph({
  graphData,
  currentSlug,
  maxDepth,
}: {
  graphData: GraphData;
  currentSlug: string;
  maxDepth: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    node: D3Node;
    edge?: D3Link;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setDimensions({ width: Math.max(w, 400), height: w < 640 ? 320 : 440 });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;

    // Filter nodes by depth
    const filteredNodes = graphData.nodes.filter((n) => n.depth <= maxDepth);
    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = graphData.edges.filter(
      (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
    );

    // Initialize all nodes at center for entrance animation
    const nodes: D3Node[] = filteredNodes.map((n) => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * 20,
      y: height / 2 + (Math.random() - 0.5) * 20,
    }));
    const links: D3Link[] = filteredEdges.map((e) => ({
      source: e.source,
      target: e.target,
      connection_type: e.connection_type,
      strength: e.strength,
      confidence: e.confidence,
      description: e.description,
    }));

    // Force simulation with entrance animation (high initial alpha)
    const simulation = d3
      .forceSimulation(nodes)
      .alpha(1.2)
      .alphaDecay(0.02)
      .force(
        "link",
        d3
          .forceLink<D3Node, D3Link>(links)
          .id((d) => d.id)
          .distance((d) => 80 + (10 - d.strength) * 10)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Arrow marker
    svg
      .append("defs")
      .selectAll("marker")
      .data(Object.keys(typeColors))
      .enter()
      .append("marker")
      .attr("id", (d) => `arrow-${d}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", (d) => typeColors[d] || "#6e7681")
      .attr("d", "M0,-5L10,0L0,5");

    const g = svg.append("g");

    // Zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    // Links
    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", (d) => typeColors[d.connection_type] || "#6e7681")
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", (d) => Math.max(1, d.strength / 3))
      .attr("marker-end", (d) => `url(#arrow-${d.connection_type})`);

    // Link labels
    const linkLabel = g
      .append("g")
      .selectAll("text")
      .data(links)
      .enter()
      .append("text")
      .attr("text-anchor", "middle")
      .attr("fill", (d) => typeColors[d.connection_type] || "#6e7681")
      .attr("font-size", "7px")
      .attr("opacity", 0.6)
      .text((d) => typeLabels[d.connection_type] || d.connection_type.replace(/_/g, " "));

    // Nodes
    const node = g
      .append("g")
      .selectAll("g")
      .data(nodes)
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

    // Node circles
    node
      .append("circle")
      .attr("r", (d) => (d.id === currentSlug ? 16 : d.depth === 1 ? 12 : 9))
      .attr("fill", (d) => importanceColors[d.importance] || "#6e7681")
      .attr("stroke", (d) => (d.id === currentSlug ? "#fff" : "#0d1117"))
      .attr("stroke-width", (d) => (d.id === currentSlug ? 3 : 1.5))
      .attr("opacity", (d) => {
        const fade = 1 - d.depth * 0.2;
        return Math.max(0.4, fade);
      });

    // Node labels
    node
      .append("text")
      .attr("dy", (d) => (d.id === currentSlug ? 28 : 22))
      .attr("text-anchor", "middle")
      .attr("fill", "#e6edf3")
      .attr("font-size", (d) => (d.id === currentSlug ? "10px" : "8px"))
      .attr("font-weight", (d) => (d.id === currentSlug ? "bold" : "normal"))
      .text((d) => (d.title.length > 20 ? d.title.slice(0, 18) + "..." : d.title));

    // Interactions
    node
      .on("mouseenter", function (event: MouseEvent, d: D3Node) {
        d3.select(this)
          .select("circle")
          .transition()
          .duration(150)
          .attr("r", d.id === currentSlug ? 20 : 16);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltip({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top - 10,
            node: d,
          });
        }
      })
      .on("mouseleave", function (_event: MouseEvent, d: D3Node) {
        d3.select(this)
          .select("circle")
          .transition()
          .duration(150)
          .attr("r", d.id === currentSlug ? 16 : d.depth === 1 ? 12 : 9);
        setTooltip(null);
      })
      .on("click", (_event: MouseEvent, d: D3Node) => {
        if (d.id !== currentSlug) {
          window.location.href = `/edition/${d.slug}`;
        }
      });

    // Simulation tick
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
  }, [graphData, currentSlug, dimensions, maxDepth]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="rounded-lg"
        style={{ background: "var(--bg-primary)" }}
        role="img"
        aria-label={`Connection graph showing ${graphData.nodes.length} related editions`}
      />

      {/* Screen reader summary */}
      <div className="sr-only">
        <p>Graph connections:</p>
        <ul>
          {graphData.edges
            .filter((e) => {
              const nodeIds = new Set(graphData.nodes.filter(n => n.depth <= maxDepth).map(n => n.id));
              return nodeIds.has(e.source) && nodeIds.has(e.target);
            })
            .map((e, i) => {
              const src = graphData.nodes.find(n => n.id === e.source);
              const tgt = graphData.nodes.find(n => n.id === e.target);
              return (
                <li key={i}>
                  {src?.title || e.source} {e.connection_type.replace(/_/g, " ")} {tgt?.title || e.target}
                </li>
              );
            })}
        </ul>
      </div>

      {/* Legend */}
      <div className="absolute top-2 right-2 flex flex-wrap gap-2">
        {[
          { label: "Essential", color: importanceColors.essential },
          { label: "Recommended", color: importanceColors.recommended },
          { label: "Supplemental", color: importanceColors.supplemental },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
            <span
              className="text-xs hidden sm:inline"
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.75rem",
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-20 rounded-lg border px-3 py-2 shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
            background: "var(--bg-tertiary)",
            borderColor: "var(--border-default)",
            maxWidth: 240,
          }}
        >
          <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
            {tooltip.node.title}
          </p>
          <p
            className="text-xs"
            style={{
              color: importanceColors[tooltip.node.importance] || "var(--text-tertiary)",
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "0.75rem",
            }}
          >
            {tooltip.node.importance.toUpperCase()} · Depth {tooltip.node.depth}
          </p>
        </div>
      )}
    </div>
  );
}

function MobileGraphTree({
  graphData,
  currentSlug,
  currentTitle,
  maxDepth,
}: {
  graphData: GraphData;
  currentSlug: string;
  currentTitle: string;
  maxDepth: number;
}) {
  const filteredNodes = graphData.nodes.filter((n) => n.depth <= maxDepth && n.id !== currentSlug);
  const filteredEdges = graphData.edges.filter((e) => {
    const nodeIds = new Set(graphData.nodes.filter(n => n.depth <= maxDepth).map(n => n.id));
    return nodeIds.has(e.source) && nodeIds.has(e.target);
  });

  // Group nodes by their connection direction relative to current
  const outgoingIds = new Set(
    filteredEdges.filter((e) => e.source === currentSlug).map((e) => e.target)
  );
  const incomingIds = new Set(
    filteredEdges.filter((e) => e.target === currentSlug).map((e) => e.source)
  );

  const outgoingNodes = filteredNodes.filter((n) => outgoingIds.has(n.id));
  const incomingNodes = filteredNodes.filter((n) => incomingIds.has(n.id));
  const otherNodes = filteredNodes.filter((n) => !outgoingIds.has(n.id) && !incomingIds.has(n.id));

  function getEdgeForNode(nodeId: string) {
    return filteredEdges.find(
      (e) => (e.source === currentSlug && e.target === nodeId) || (e.target === currentSlug && e.source === nodeId)
    );
  }

  function NodeCard({ node, direction }: { node: typeof filteredNodes[0]; direction: "outgoing" | "incoming" | "other" }) {
    const edge = getEdgeForNode(node.id);
    const connType = edge?.connection_type || "references";
    return (
      <Link href={`/edition/${node.slug}`} className="block">
        <div
          className="rounded-lg border p-3 transition-all active:scale-[0.98]"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-default)",
            borderLeft: `3px solid ${typeColors[connType] || "var(--border-default)"}`,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs px-1.5 py-0.5 rounded font-bold"
              style={{
                color: typeColors[connType] || "var(--text-tertiary)",
                background: "var(--bg-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.75rem",
              }}
            >
              {direction === "incoming" ? "\u2190 " : "\u2192 "}
              {typeLabels[connType] || connType.replace(/_/g, " ")}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                color: importanceColors[node.importance] || "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.75rem",
              }}
            >
              {node.importance.toUpperCase()}
            </span>
          </div>
          <p className="text-sm font-bold">{node.title}</p>
          {edge && (
            <div className="flex items-center gap-2 mt-1">
              <StrengthBar value={edge.strength} />
              <span
                className="text-xs"
                style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.75rem" }}
              >
                {edge.confidence}%
              </span>
            </div>
          )}
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current edition */}
      <div
        className="rounded-lg border-2 p-3 text-center"
        style={{ borderColor: "var(--accent-red)", background: "var(--bg-secondary)" }}
      >
        <p className="text-sm font-bold" style={{ color: "var(--accent-red)" }}>{currentTitle}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>Current</p>
      </div>

      {/* Incoming: What Came Before */}
      {incomingNodes.length > 0 && (
        <div>
          <p
            className="text-xs font-bold uppercase mb-2"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
          >
            What Came Before ({incomingNodes.length})
          </p>
          <div className="space-y-2">
            {incomingNodes.map((node) => (
              <NodeCard key={node.id} node={node} direction="incoming" />
            ))}
          </div>
        </div>
      )}

      {/* Outgoing: What's Next */}
      {outgoingNodes.length > 0 && (
        <div>
          <p
            className="text-xs font-bold uppercase mb-2"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
          >
            What&apos;s Next ({outgoingNodes.length})
          </p>
          <div className="space-y-2">
            {outgoingNodes.map((node) => (
              <NodeCard key={node.id} node={node} direction="outgoing" />
            ))}
          </div>
        </div>
      )}

      {/* Other connected (depth > 1) */}
      {otherNodes.length > 0 && (
        <div>
          <p
            className="text-xs font-bold uppercase mb-2"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
          >
            Extended Connections ({otherNodes.length})
          </p>
          <div className="space-y-2">
            {otherNodes.map((node) => (
              <NodeCard key={node.id} node={node} direction="other" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WhatsNextMap({
  currentSlug,
  currentTitle,
  outgoing,
  incoming,
  graphData,
}: {
  currentSlug: string;
  currentTitle: string;
  outgoing: ConnectionNode[];
  incoming: ConnectionNode[];
  graphData?: GraphData;
}) {
  const [view, setView] = useState<"graph" | "next" | "prev" | "all">(
    graphData && graphData.nodes.length > 1 ? "graph" : "next"
  );
  const [filter, setFilter] = useState<string>("all");
  const [maxDepth, setMaxDepth] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const displayed =
    view === "next"
      ? outgoing
      : view === "prev"
        ? incoming
        : view === "all"
          ? [...outgoing, ...incoming]
          : [];

  const filtered =
    filter === "all"
      ? displayed
      : displayed.filter((n) => n.connectionType === filter);

  const connectionTypes = [
    ...new Set([...outgoing, ...incoming].map((n) => n.connectionType)),
  ];

  const showGraph = view === "graph" && graphData && graphData.nodes.length > 1;

  return (
    <div>
      {/* View toggle */}
      <div className="flex flex-wrap gap-2 mb-4">
        {graphData && graphData.nodes.length > 1 && (
          <button
            onClick={() => setView("graph")}
            className="px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: view === "graph" ? "var(--accent-red)" : "transparent",
              color: view === "graph" ? "#fff" : "var(--text-tertiary)",
              border: `1px solid ${view === "graph" ? "var(--accent-red)" : "var(--border-default)"}`,
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            Graph View
          </button>
        )}
        {(
          [
            { key: "next", label: "What's Next", count: outgoing.length },
            { key: "prev", label: "What Came Before", count: incoming.length },
            { key: "all", label: "All", count: outgoing.length + incoming.length },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className="px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: view === tab.key ? "var(--bg-tertiary)" : "transparent",
              color: view === tab.key ? "var(--accent-gold)" : "var(--text-tertiary)",
              border: `1px solid ${view === tab.key ? "var(--accent-gold)" : "var(--border-default)"}`,
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Graph View */}
      {showGraph && graphData && (
        <div>
          {/* Depth slider */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-bold uppercase" style={{ color: "var(--text-tertiary)" }}>
              Depth
            </span>
            <input
              type="range"
              min={1}
              max={3}
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
              className="w-24 accent-[var(--accent-red)]"
            />
            <span
              className="text-xs font-bold"
              style={{ color: "var(--accent-gold)", fontFamily: "var(--font-geist-mono), monospace" }}
            >
              {maxDepth} hop{maxDepth > 1 ? "s" : ""}
            </span>
          </div>
          {/* Desktop: full D3 force graph */}
          {!isMobile && (
            <ForceGraph
              graphData={graphData}
              currentSlug={currentSlug}
              maxDepth={maxDepth}
            />
          )}
          {/* Mobile: simplified tree layout */}
          {isMobile && (
            <MobileGraphTree
              graphData={graphData}
              currentSlug={currentSlug}
              currentTitle={currentTitle}
              maxDepth={maxDepth}
            />
          )}
        </div>
      )}

      {/* List View */}
      {!showGraph && (
        <>
          {/* Type filter chips */}
          {connectionTypes.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              <button
                onClick={() => setFilter("all")}
                className="px-2 py-0.5 rounded text-xs font-bold transition-all"
                style={{
                  background: filter === "all" ? "var(--bg-tertiary)" : "transparent",
                  color: filter === "all" ? "var(--text-primary)" : "var(--text-tertiary)",
                  border: `1px solid ${filter === "all" ? "var(--border-default)" : "transparent"}`,
                }}
              >
                All
              </button>
              {connectionTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className="px-2 py-0.5 rounded text-xs font-bold transition-all"
                  style={{
                    background: filter === type ? "var(--bg-tertiary)" : "transparent",
                    color: filter === type ? typeColors[type] || "var(--text-primary)" : "var(--text-tertiary)",
                    border: `1px solid ${filter === type ? typeColors[type] || "var(--border-default)" : "transparent"}`,
                  }}
                >
                  {typeLabels[type] || type.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          )}

          {/* Connection list */}
          {filtered.length === 0 ? (
            <p className="text-sm italic" style={{ color: "var(--text-tertiary)" }}>
              No connections found for this filter.
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((node, i) => (
                <Link
                  key={`${node.slug}-${node.connectionType}-${node.direction}-${i}`}
                  href={`/edition/${node.slug}`}
                  className="block group"
                >
                  <div
                    className="rounded-lg border p-3 transition-all hover:border-[var(--accent-red)] hover:shadow-lg hover:shadow-[var(--accent-red)]/5"
                    style={{
                      background: "var(--bg-secondary)",
                      borderColor: "var(--border-default)",
                      borderLeft: `3px solid ${typeColors[node.connectionType] || "var(--border-default)"}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-bold"
                            style={{
                              color: typeColors[node.connectionType] || "var(--text-tertiary)",
                              background: "var(--bg-tertiary)",
                              fontFamily: "var(--font-geist-mono), monospace",
                              fontSize: "0.75rem",
                            }}
                          >
                            {node.direction === "incoming" ? "← " : "→ "}
                            {typeLabels[node.connectionType] || node.connectionType.replace(/_/g, " ")}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold group-hover:text-[var(--accent-red)] transition-colors">
                          {node.title}
                        </h4>
                        {node.issues && (
                          <p
                            className="text-xs mt-0.5 truncate"
                            style={{
                              color: "var(--text-tertiary)",
                              fontFamily: "var(--font-geist-mono), monospace",
                            }}
                          >
                            {node.issues}
                          </p>
                        )}
                        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                          {node.description}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <StrengthBar value={node.strength} />
                        <span
                          className="text-xs"
                          style={{
                            color: "var(--text-tertiary)",
                            fontFamily: "var(--font-geist-mono), monospace",
                            fontSize: "0.75rem",
                          }}
                        >
                          {node.confidence}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
