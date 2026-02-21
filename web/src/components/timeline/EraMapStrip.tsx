"use client";

import { useState } from "react";
import type { Era, Event } from "@/lib/types";
import type { EraEditionCount } from "@/lib/data";

interface Props {
  eras: Era[];
  counts: Record<string, EraEditionCount>;
  landmarkEvents: Event[];
  selectedEra: string | null;
  onSelectEra: (slug: string) => void;
}

const IMPORTANCE_DOTS: { key: keyof Omit<EraEditionCount, "total">; color: string; label: string }[] = [
  { key: "essential", color: "var(--importance-essential)", label: "Essential" },
  { key: "recommended", color: "var(--importance-recommended)", label: "Recommended" },
  { key: "supplemental", color: "var(--importance-supplemental)", label: "Supplemental" },
];

export default function EraMapStrip({
  eras,
  counts,
  landmarkEvents,
  selectedEra,
  onSelectEra,
}: Props) {
  return (
    <div id="era-map" className="mb-8 scroll-mt-20">
      {/* Era cards strip */}
      <div className="flex gap-2 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-thin">
        {eras.map((era) => {
          const c = counts[era.slug] || { total: 0, essential: 0, recommended: 0, supplemental: 0, completionist: 0 };
          const isSelected = selectedEra === era.slug;
          return (
            <button
              key={era.slug}
              onClick={() => onSelectEra(era.slug)}
              className="flex-shrink-0 snap-start rounded-xl border p-3 transition-all hover:shadow-md text-left cursor-pointer"
              style={{
                width: 180,
                background: isSelected ? `color-mix(in srgb, ${era.color} 12%, var(--bg-secondary))` : "var(--bg-secondary)",
                borderColor: isSelected ? era.color : "var(--border-default)",
                borderWidth: isSelected ? 2 : 1,
              }}
            >
              {/* Color bar */}
              <div
                className="h-1 w-full rounded-full mb-2"
                style={{ background: era.color }}
              />
              <div className="flex items-baseline gap-1.5 mb-1">
                <span
                  className="text-xs font-bold"
                  style={{
                    color: era.color,
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                >
                  {String(era.number).padStart(2, "0")}
                </span>
                <span
                  className="text-xs font-bold truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {era.name}
                </span>
              </div>
              <p
                className="text-xs mb-2"
                style={{
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "0.7rem",
                }}
              >
                {era.year_start}&ndash;{era.year_end}
              </p>
              {/* Edition count + importance dots */}
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {c.total} editions
                </span>
                <div className="flex gap-0.5">
                  {IMPORTANCE_DOTS.map((dot) => {
                    const n = c[dot.key];
                    if (n === 0) return null;
                    return (
                      <div
                        key={dot.key}
                        className="w-2 h-2 rounded-full"
                        title={`${n} ${dot.label}`}
                        style={{ background: dot.color }}
                      />
                    );
                  })}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Timeline ruler with landmark events */}
      {landmarkEvents.length > 0 && (
        <div className="relative mt-2">
          <div
            className="h-px w-full"
            style={{ background: "var(--border-default)" }}
          />
          <div className="flex justify-between mt-1">
            {landmarkEvents.map((event) => (
              <div
                key={event.slug}
                className="flex flex-col items-center"
                style={{ maxWidth: 100 }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full -mt-[5px]"
                  style={{ background: "var(--accent-gold)" }}
                />
                <span
                  className="text-center mt-1 leading-tight"
                  style={{
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "0.6rem",
                  }}
                >
                  {event.name}
                </span>
                <span
                  style={{
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "0.55rem",
                  }}
                >
                  {event.year}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
