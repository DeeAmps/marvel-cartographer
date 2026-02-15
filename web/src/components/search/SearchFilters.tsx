"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { X } from "lucide-react";

const eraOptions = [
  { value: "birth-of-marvel", label: "Birth of Marvel" },
  { value: "the-expansion", label: "The Expansion" },
  { value: "bronze-age", label: "Bronze Age" },
  { value: "rise-of-x-men", label: "Rise of X-Men" },
  { value: "event-age", label: "Event Age" },
  { value: "speculation-crash", label: "Speculation Crash" },
  { value: "heroes-reborn-return", label: "Heroes Reborn" },
  { value: "marvel-knights-ultimate", label: "Marvel Knights" },
  { value: "bendis-avengers", label: "Bendis Avengers" },
  { value: "hickman-saga", label: "Hickman Saga" },
  { value: "all-new-all-different", label: "All-New All-Different" },
  { value: "dawn-of-krakoa", label: "Dawn of Krakoa" },
  { value: "blood-hunt-doom", label: "Blood Hunt & Doom" },
  { value: "current-ongoings", label: "Current" },
];

const importanceOptions = [
  { value: "essential", label: "Essential", color: "var(--importance-essential)" },
  { value: "recommended", label: "Recommended", color: "var(--importance-recommended)" },
  { value: "supplemental", label: "Supplemental", color: "var(--importance-supplemental)" },
  { value: "completionist", label: "Completionist", color: "var(--importance-completionist)" },
];

const statusOptions = [
  { value: "in_print", label: "In Print" },
  { value: "out_of_print", label: "Out of Print" },
  { value: "upcoming", label: "Upcoming" },
  { value: "digital_only", label: "Digital Only" },
  { value: "ongoing", label: "Ongoing" },
  { value: "check_availability", label: "Check Availability" },
];

const formatOptions = [
  { value: "omnibus", label: "Omnibus" },
  { value: "epic_collection", label: "Epic Collection" },
  { value: "trade_paperback", label: "Trade Paperback" },
  { value: "hardcover", label: "Hardcover" },
  { value: "masterworks", label: "Masterworks" },
  { value: "complete_collection", label: "Complete Collection" },
  { value: "oversized_hardcover", label: "OHC" },
  { value: "compendium", label: "Compendium" },
];

export default function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentEra = searchParams.get("era") || "";
  const currentImportance = searchParams.get("importance") || "";
  const currentStatus = searchParams.get("status") || "";
  const currentFormat = searchParams.get("format") || "";
  const currentCreator = searchParams.get("creator") || "";
  const currentCharacter = searchParams.get("character") || "";

  const hasFilters = currentEra || currentImportance || currentStatus || currentFormat || currentCreator || currentCharacter;

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === params.get(key)) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.push(`/search${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, searchParams]
  );

  const resetAll = useCallback(() => {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    const qs = params.toString();
    router.push(`/search${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [router, searchParams]);

  return (
    <div className="space-y-3">
      {/* Era */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span
          className="text-xs font-bold uppercase mr-1"
          style={{ color: "var(--text-tertiary)", minWidth: 60 }}
        >
          Era
        </span>
        {eraOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateFilter("era", opt.value)}
            className="px-2 py-0.5 rounded text-xs font-bold transition-all"
            style={{
              background: currentEra === opt.value ? "var(--bg-tertiary)" : "transparent",
              color: currentEra === opt.value ? "var(--text-primary)" : "var(--text-tertiary)",
              border: `1px solid ${currentEra === opt.value ? "var(--border-default)" : "transparent"}`,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Importance */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span
          className="text-xs font-bold uppercase mr-1"
          style={{ color: "var(--text-tertiary)", minWidth: 60 }}
        >
          Level
        </span>
        {importanceOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateFilter("importance", opt.value)}
            className="px-2 py-0.5 rounded text-xs font-bold transition-all"
            style={{
              background: currentImportance === opt.value ? "var(--bg-tertiary)" : "transparent",
              color: currentImportance === opt.value ? opt.color : "var(--text-tertiary)",
              border: `1px solid ${currentImportance === opt.value ? opt.color : "transparent"}`,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span
          className="text-xs font-bold uppercase mr-1"
          style={{ color: "var(--text-tertiary)", minWidth: 60 }}
        >
          Status
        </span>
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateFilter("status", opt.value)}
            className="px-2 py-0.5 rounded text-xs font-bold transition-all"
            style={{
              background: currentStatus === opt.value ? "var(--bg-tertiary)" : "transparent",
              color: currentStatus === opt.value ? "var(--text-primary)" : "var(--text-tertiary)",
              border: `1px solid ${currentStatus === opt.value ? "var(--border-default)" : "transparent"}`,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Format */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span
          className="text-xs font-bold uppercase mr-1"
          style={{ color: "var(--text-tertiary)", minWidth: 60 }}
        >
          Format
        </span>
        {formatOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateFilter("format", opt.value)}
            className="px-2 py-0.5 rounded text-xs font-bold transition-all"
            style={{
              background: currentFormat === opt.value ? "var(--bg-tertiary)" : "transparent",
              color: currentFormat === opt.value ? "var(--text-primary)" : "var(--text-tertiary)",
              border: `1px solid ${currentFormat === opt.value ? "var(--border-default)" : "transparent"}`,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Creator text input */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span
          className="text-xs font-bold uppercase mr-1"
          style={{ color: "var(--text-tertiary)", minWidth: 60 }}
        >
          Creator
        </span>
        <input
          type="text"
          value={currentCreator}
          onChange={(e) => updateFilter("creator", e.target.value)}
          placeholder="Filter by creator name..."
          className="px-2 py-1 rounded text-xs border focus:outline-none focus:border-[var(--accent-red)] transition-colors"
          style={{
            background: "var(--bg-tertiary)",
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
            width: 180,
          }}
        />
      </div>

      {/* Character text input */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span
          className="text-xs font-bold uppercase mr-1"
          style={{ color: "var(--text-tertiary)", minWidth: 60 }}
        >
          Character
        </span>
        <input
          type="text"
          value={currentCharacter}
          onChange={(e) => updateFilter("character", e.target.value)}
          placeholder="Filter by character name..."
          className="px-2 py-1 rounded text-xs border focus:outline-none focus:border-[var(--accent-red)] transition-colors"
          style={{
            background: "var(--bg-tertiary)",
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
            width: 180,
          }}
        />
      </div>

      {/* Reset */}
      {hasFilters && (
        <button
          onClick={resetAll}
          className="flex items-center gap-1 px-3 py-1 rounded text-xs font-bold transition-all hover:opacity-80"
          style={{ color: "var(--accent-red)" }}
        >
          <X size={12} />
          Reset filters
        </button>
      )}
    </div>
  );
}
