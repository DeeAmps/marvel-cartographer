"use client";

import { Search, Filter } from "lucide-react";

const ENTRY_TYPES = ["character", "team", "location", "artifact", "species", "editorial_concept"];

const TYPE_LABELS: Record<string, string> = {
  character: "Character",
  team: "Team",
  location: "Location",
  artifact: "Artifact",
  species: "Species",
  editorial_concept: "Concept",
};

interface Era {
  slug: string;
  name: string;
  year_start: number;
  year_end: number;
}

export default function RetconFilterBar({
  search,
  onSearchChange,
  activeTypes,
  onToggleType,
  eras,
  selectedEra,
  onEraChange,
  majorOnly,
  onMajorOnlyChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  activeTypes: Set<string>;
  onToggleType: (t: string) => void;
  eras: Era[];
  selectedEra: string;
  onEraChange: (v: string) => void;
  majorOnly: boolean;
  onMajorOnlyChange: (v: boolean) => void;
}) {
  return (
    <div
      className="rounded-lg border p-4 space-y-3"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Filter size={14} style={{ color: "var(--text-tertiary)" }} />
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--text-tertiary)" }}
        >
          Filters
        </span>
      </div>

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
          placeholder="Search characters or concepts..."
          className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none transition-colors"
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

      {/* Type chips */}
      <div className="flex flex-wrap gap-1.5">
        {ENTRY_TYPES.map((t) => {
          const active = activeTypes.has(t);
          return (
            <button
              key={t}
              onClick={() => onToggleType(t)}
              className="px-2.5 py-1 rounded-full text-xs font-bold uppercase transition-all"
              style={{
                background: active ? "var(--accent-blue)" : "var(--bg-tertiary)",
                color: active ? "#fff" : "var(--text-tertiary)",
                fontSize: "0.65rem",
              }}
            >
              {TYPE_LABELS[t] || t}
            </button>
          );
        })}
      </div>

      {/* Era + Major Only row */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedEra}
          onChange={(e) => onEraChange(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-xs outline-none cursor-pointer"
          style={{
            background: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-default)",
          }}
        >
          <option value="">All Eras</option>
          {eras.map((era) => (
            <option key={era.slug} value={era.slug}>
              {era.name} ({era.year_start}-{era.year_end})
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={majorOnly}
            onChange={(e) => onMajorOnlyChange(e.target.checked)}
            className="sr-only peer"
          />
          <div
            className="w-8 h-4 rounded-full relative transition-colors peer-checked:bg-[var(--accent-gold)]"
            style={{ background: majorOnly ? undefined : "var(--bg-tertiary)" }}
          >
            <div
              className="absolute top-0.5 w-3 h-3 rounded-full transition-transform"
              style={{
                background: "#fff",
                left: majorOnly ? "calc(100% - 14px)" : "2px",
              }}
            />
          </div>
          <span className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
            Major Only
          </span>
        </label>
      </div>
    </div>
  );
}
