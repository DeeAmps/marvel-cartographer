"use client";

import { Search, RotateCcw } from "lucide-react";

const TEAM_COLORS: Record<string, string> = {
  "X-Men": "#f0a500",
  Avengers: "#4fc3f7",
  "Fantastic Four": "#e94560",
  "Spider-Man": "#e94560",
  "Guardians of the Galaxy": "#bb86fc",
  Defenders: "#00e676",
  Thunderbolts: "#6e7681",
};

const RELATIONSHIP_TYPES = [
  { key: "ally", label: "Ally", color: "#00e676" },
  { key: "enemy", label: "Enemy", color: "#e94560" },
  { key: "family", label: "Family", color: "#4fc3f7" },
  { key: "romantic", label: "Romantic", color: "#f48fb1" },
  { key: "mentor", label: "Mentor", color: "#f0a500" },
  { key: "rival", label: "Rival", color: "#f0a500" },
  { key: "teammate", label: "Teammate", color: "#6e7681" },
];

export default function GraphControls({
  teams,
  activeTeams,
  onToggleTeam,
  activeRelTypes,
  onToggleRelType,
  search,
  onSearchChange,
  onReset,
}: {
  teams: string[];
  activeTeams: Set<string>;
  onToggleTeam: (t: string) => void;
  activeRelTypes: Set<string>;
  onToggleRelType: (t: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  onReset: () => void;
}) {
  // Limit displayed teams to ones that have a defined color or the top teams
  const displayTeams = teams
    .filter((t) => TEAM_COLORS[t])
    .slice(0, 8);

  return (
    <div
      className="rounded-lg border p-4 space-y-3"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
    >
      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-tertiary)" }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Find a character..."
          className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
          style={{
            background: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-default)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--accent-blue)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border-default)";
          }}
        />
      </div>

      {/* Team filters */}
      <div>
        <p
          className="text-xs font-bold uppercase tracking-wider mb-1.5"
          style={{ color: "var(--text-tertiary)", fontSize: "0.6rem" }}
        >
          Teams
        </p>
        <div className="flex flex-wrap gap-1.5">
          {displayTeams.map((t) => {
            const active = activeTeams.size === 0 || activeTeams.has(t);
            const color = TEAM_COLORS[t] || "var(--text-tertiary)";
            return (
              <button
                key={t}
                onClick={() => onToggleTeam(t)}
                className="px-2 py-0.5 rounded-full text-xs font-bold transition-all"
                style={{
                  background: active ? `${color}20` : "var(--bg-tertiary)",
                  color: active ? color : "var(--text-tertiary)",
                  border: `1px solid ${active ? color : "transparent"}`,
                  fontSize: "0.65rem",
                  opacity: active ? 1 : 0.5,
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Relationship type filters */}
      <div>
        <p
          className="text-xs font-bold uppercase tracking-wider mb-1.5"
          style={{ color: "var(--text-tertiary)", fontSize: "0.6rem" }}
        >
          Relationship Types
        </p>
        <div className="flex flex-wrap gap-1.5">
          {RELATIONSHIP_TYPES.map((rt) => {
            const active = activeRelTypes.size === 0 || activeRelTypes.has(rt.key);
            return (
              <button
                key={rt.key}
                onClick={() => onToggleRelType(rt.key)}
                className="px-2 py-0.5 rounded-full text-xs font-bold transition-all"
                style={{
                  background: active ? `${rt.color}20` : "var(--bg-tertiary)",
                  color: active ? rt.color : "var(--text-tertiary)",
                  border: `1px solid ${active ? rt.color : "transparent"}`,
                  fontSize: "0.65rem",
                  opacity: active ? 1 : 0.5,
                }}
              >
                {rt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={onReset}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
        style={{
          background: "var(--bg-tertiary)",
          color: "var(--text-secondary)",
        }}
      >
        <RotateCcw size={12} />
        Reset
      </button>
    </div>
  );
}
