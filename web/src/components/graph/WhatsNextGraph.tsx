"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { GraphData, CollectedEdition } from "@/lib/types";
import type { ForceGraphNode, ForceGraphEdge } from "@/lib/graph/types";
import { prepareTraversal, getActiveConnectionTypes } from "@/lib/graph/prepare";
import GraphControls, { type ViewMode } from "./GraphControls";
import ForceCanvas from "./ForceCanvas";
import GraphTooltip from "./GraphTooltip";
import GraphLegend from "./GraphLegend";
import WhatsNextMap from "@/components/editions/WhatsNextMap";

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

interface WhatsNextGraphProps {
  currentSlug: string;
  currentTitle: string;
  outgoing: ConnectionNode[];
  incoming: ConnectionNode[];
  graphData: GraphData;
  editions: CollectedEdition[];
}

export default function WhatsNextGraph({
  currentSlug,
  currentTitle,
  outgoing,
  incoming,
  graphData,
  editions,
}: WhatsNextGraphProps) {
  const router = useRouter();
  const [depth, setDepth] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("graph");
  const [isMobile, setIsMobile] = useState(false);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    node: ForceGraphNode;
    edge?: ForceGraphEdge;
  } | null>(null);

  // All connection types available in the graph
  const allTypes = useMemo(() => getActiveConnectionTypes(graphData), [graphData]);
  const [activeTypes, setActiveTypes] = useState<string[]>(allTypes);

  // Reset active types when graph data changes
  useEffect(() => {
    setActiveTypes(allTypes);
  }, [allTypes]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Compute traversal result
  const traversal = useMemo(() => {
    const typeFilters = activeTypes.length < allTypes.length ? activeTypes : undefined;
    return prepareTraversal(graphData, currentSlug, editions, depth, typeFilters);
  }, [graphData, currentSlug, editions, depth, activeTypes, allTypes.length]);

  const handleToggleType = useCallback((type: string) => {
    setActiveTypes((prev) => {
      if (prev.includes(type)) {
        // Don't allow deselecting all types
        if (prev.length <= 1) return prev;
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  }, []);

  const handleNodeClick = useCallback(
    (slug: string) => {
      router.push(`/edition/${slug}`);
    },
    [router]
  );

  const handleHover = useCallback(
    (data: { x: number; y: number; node: ForceGraphNode; edge?: ForceGraphEdge } | null) => {
      setTooltip(data);
    },
    []
  );

  const hasGraphData = graphData.nodes.length > 1;
  const showViewToggle = !isMobile && hasGraphData;
  const effectiveViewMode = isMobile ? "list" : viewMode;

  return (
    <div className="space-y-3">
      <GraphControls
        depth={depth}
        onDepthChange={setDepth}
        activeTypes={activeTypes}
        availableTypes={allTypes}
        onToggleType={handleToggleType}
        viewMode={effectiveViewMode}
        onViewModeChange={setViewMode}
        nodeCount={traversal.nodes.length}
        edgeCount={traversal.edges.length}
        showViewToggle={showViewToggle}
      />

      {effectiveViewMode === "graph" && hasGraphData ? (
        <div className="relative">
          <ForceCanvas
            nodes={traversal.nodes}
            edges={traversal.edges}
            rootId={currentSlug}
            onHover={handleHover}
            onNodeClick={handleNodeClick}
          />
          {tooltip && (
            <GraphTooltip
              x={tooltip.x}
              y={tooltip.y}
              node={tooltip.node}
              edge={tooltip.edge}
            />
          )}
          <div className="mt-2">
            <GraphLegend activeTypes={activeTypes} />
          </div>
        </div>
      ) : (
        <WhatsNextMap
          currentSlug={currentSlug}
          currentTitle={currentTitle}
          outgoing={outgoing}
          incoming={incoming}
          graphData={graphData}
          hideGraphOption
        />
      )}
    </div>
  );
}
