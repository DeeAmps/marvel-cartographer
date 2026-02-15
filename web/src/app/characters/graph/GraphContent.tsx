"use client";

import { useState, useMemo } from "react";
import { Share2 } from "lucide-react";
import RelationshipGraph from "@/components/characters/RelationshipGraph";
import GraphControls from "@/components/characters/GraphControls";

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

export default function GraphContent({
  nodes,
  edges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}) {
  const [search, setSearch] = useState("");
  const [activeTeams, setActiveTeams] = useState<Set<string>>(new Set());
  const [activeRelTypes, setActiveRelTypes] = useState<Set<string>>(new Set());

  const allTeams = useMemo(() => {
    const teamSet = new Set<string>();
    for (const n of nodes) {
      for (const t of n.teams) teamSet.add(t);
    }
    return [...teamSet].sort();
  }, [nodes]);

  const toggleTeam = (t: string) => {
    setActiveTeams((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const toggleRelType = (t: string) => {
    setActiveRelTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const reset = () => {
    setSearch("");
    setActiveTeams(new Set());
    setActiveRelTypes(new Set());
  };

  // Focus slug from search
  const focusSlug = useMemo(() => {
    if (!search) return null;
    const q = search.toLowerCase();
    const match = nodes.find(
      (n) => n.name.toLowerCase().includes(q) || n.slug.includes(q)
    );
    return match?.slug || null;
  }, [search, nodes]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          <Share2 size={28} style={{ color: "var(--accent-blue)" }} />
          Character Relationships
        </h1>
        <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
          Explore how Marvel characters are connected. Click a node to focus, double-click to visit
          their page.
        </p>
        <p
          className="text-xs mt-1"
          style={{
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          {nodes.length} characters · {edges.length} connections
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Controls sidebar */}
        <div>
          <GraphControls
            teams={allTeams}
            activeTeams={activeTeams}
            onToggleTeam={toggleTeam}
            activeRelTypes={activeRelTypes}
            onToggleRelType={toggleRelType}
            search={search}
            onSearchChange={setSearch}
            onReset={reset}
          />
        </div>

        {/* Graph */}
        <div>
          <RelationshipGraph
            nodes={nodes}
            edges={edges}
            focusSlug={focusSlug}
            activeTeams={activeTeams}
            activeRelTypes={activeRelTypes}
          />
        </div>
      </div>
    </div>
  );
}
