"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import type { InfinityTheme } from "@/lib/types";
import { INFINITY_THEME_META } from "@/lib/types";

const stoneOptions: { value: InfinityTheme; label: string; color: string }[] = [
  { value: "power", label: "Power", color: INFINITY_THEME_META.power.color },
  { value: "space", label: "Space", color: INFINITY_THEME_META.space.color },
  { value: "time", label: "Time", color: INFINITY_THEME_META.time.color },
  { value: "reality", label: "Reality", color: INFINITY_THEME_META.reality.color },
  { value: "soul", label: "Soul", color: INFINITY_THEME_META.soul.color },
  { value: "mind", label: "Mind", color: INFINITY_THEME_META.mind.color },
];

const importanceOptions = [
  { value: "all", label: "All", color: "var(--text-primary)" },
  { value: "essential", label: "Essential", color: "var(--importance-essential)" },
  { value: "recommended", label: "Recommended", color: "var(--importance-recommended)" },
  { value: "supplemental", label: "Supplemental", color: "var(--importance-supplemental)" },
  { value: "completionist", label: "Completionist", color: "var(--importance-completionist)" },
];

const statusOptions = [
  { value: "all", label: "All" },
  { value: "in_print", label: "In Print" },
  { value: "out_of_print", label: "Out of Print" },
  { value: "upcoming", label: "Upcoming" },
  { value: "digital_only", label: "Digital Only" },
  { value: "ongoing", label: "Ongoing" },
  { value: "check_availability", label: "Check Availability" },
];

const formatOptions = [
  { value: "all", label: "All" },
  { value: "omnibus", label: "Omnibus" },
  { value: "trade_paperback", label: "TPB" },
  { value: "epic_collection", label: "Epic" },
  { value: "hardcover", label: "HC" },
  { value: "complete_collection", label: "Complete" },
  { value: "masterworks", label: "Masterworks" },
  { value: "compendium", label: "Compendium" },
  { value: "oversized_hardcover", label: "OHC" },
];

export default function TimelineFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const importance = searchParams.get("importance") || "all";
  const status = searchParams.get("status") || "all";
  const format = searchParams.get("format") || "all";
  const creator = searchParams.get("creator") || "";
  const stone = searchParams.get("stone") || "";
  const [creatorInput, setCreatorInput] = useState(creator);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync creatorInput when URL changes externally (e.g. reset)
  useEffect(() => {
    setCreatorInput(creator);
  }, [creator]);

  const hasFilters = importance !== "all" || status !== "all" || format !== "all" || creator !== "" || stone !== "";

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.push(`/timeline${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, searchParams]
  );

  const resetAll = useCallback(() => {
    router.push("/timeline", { scroll: false });
  }, [router]);

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <span className="text-xs font-bold uppercase" style={{ color: "var(--text-tertiary)" }}>
        Filter:
      </span>
      <div className="flex flex-wrap gap-1">
        {importanceOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateFilter("importance", opt.value)}
            className="px-3 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: importance === opt.value ? "var(--bg-tertiary)" : "transparent",
              color: importance === opt.value ? opt.color : "var(--text-tertiary)",
              border: `1px solid ${importance === opt.value ? "var(--border-default)" : "transparent"}`,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateFilter("status", opt.value)}
            className="px-3 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: status === opt.value ? "var(--bg-tertiary)" : "transparent",
              color: status === opt.value ? "var(--text-primary)" : "var(--text-tertiary)",
              border: `1px solid ${status === opt.value ? "var(--border-default)" : "transparent"}`,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {formatOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateFilter("format", opt.value)}
            className="px-3 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: format === opt.value ? "var(--bg-tertiary)" : "transparent",
              color: format === opt.value ? "var(--text-primary)" : "var(--text-tertiary)",
              border: `1px solid ${format === opt.value ? "var(--border-default)" : "transparent"}`,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs font-bold uppercase" style={{ color: "var(--text-tertiary)" }}>
          Creator:
        </span>
        <input
          type="text"
          value={creatorInput}
          onChange={(e) => {
            const value = e.target.value;
            setCreatorInput(value);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
              const params = new URLSearchParams(searchParams.toString());
              if (!value) {
                params.delete("creator");
              } else {
                params.set("creator", value);
              }
              const qs = params.toString();
              router.push(`/timeline${qs ? `?${qs}` : ""}`, { scroll: false });
            }, 300);
          }}
          placeholder="Filter by creator..."
          className="w-32 sm:w-40 px-2 py-1 rounded text-xs border focus:outline-none focus:border-[var(--accent-red)] transition-colors"
          style={{
            background: "var(--bg-tertiary)",
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
          }}
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {stoneOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateFilter("stone", stone === opt.value ? "all" : opt.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
            style={{
              background: stone === opt.value ? "var(--bg-tertiary)" : "transparent",
              color: stone === opt.value ? opt.color : "var(--text-tertiary)",
              border: `1px solid ${stone === opt.value ? opt.color : "transparent"}`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ background: opt.color }}
            />
            {opt.label}
          </button>
        ))}
      </div>
      {hasFilters && (
        <button
          onClick={resetAll}
          className="flex items-center gap-1 text-xs font-bold transition-all hover:opacity-80"
          style={{ color: "var(--accent-red)" }}
        >
          <X size={12} />
          Reset
        </button>
      )}
    </div>
  );
}
