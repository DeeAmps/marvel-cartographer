"use client";

import { useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Era } from "@/lib/types";

const TOTAL_YEAR_SPAN = 65; // 1961–2026

interface Props {
  eras: Era[];
  activeEraSlug: string | null;
}

export default function TimelineEraBar({ eras, activeEraSlug }: Props) {
  const activeIdx = eras.findIndex((e) => e.slug === activeEraSlug);

  const scrollToEra = useCallback((slug: string) => {
    const el = document.getElementById(slug);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handlePrev = () => {
    if (activeIdx > 0) scrollToEra(eras[activeIdx - 1].slug);
  };

  const handleNext = () => {
    if (activeIdx < eras.length - 1) scrollToEra(eras[activeIdx + 1].slug);
  };

  return (
    <div
      className="sticky top-14 z-40 border-b"
      style={{
        background: "var(--bg-primary)",
        borderColor: "var(--border-default)",
      }}
    >
      {/* Desktop: proportional bar + active era name */}
      <div className="hidden sm:block">
        {/* Active era name */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={activeIdx <= 0}
              className="p-0.5 rounded disabled:opacity-20 cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
            >
              <ChevronLeft size={14} />
            </button>
            {activeEraSlug && activeIdx >= 0 ? (
              <span
                className="text-sm font-semibold"
                style={{ color: eras[activeIdx].color }}
              >
                {eras[activeIdx].name}
              </span>
            ) : (
              <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                Scroll to explore
              </span>
            )}
            <button
              onClick={handleNext}
              disabled={activeIdx >= eras.length - 1}
              className="p-0.5 rounded disabled:opacity-20 cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
          {activeIdx >= 0 && (
            <span
              className="text-xs"
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              Era {activeIdx + 1} of {eras.length}
            </span>
          )}
        </div>

        {/* Proportional colored segments */}
        <div className="relative flex h-2">
          {eras.map((era) => {
            const widthPct = ((era.year_end - era.year_start) / TOTAL_YEAR_SPAN) * 100;
            const isActive = era.slug === activeEraSlug;
            return (
              <button
                key={era.slug}
                onClick={() => scrollToEra(era.slug)}
                className="relative h-full transition-opacity cursor-pointer"
                style={{
                  width: `${Math.max(widthPct, 2)}%`,
                  background: era.color,
                  opacity: isActive ? 1 : 0.3,
                }}
                title={`${era.name} (${era.year_start}–${era.year_end})`}
              />
            );
          })}
        </div>
      </div>

      {/* Mobile: compact single-line with arrows */}
      <div className="sm:hidden flex items-center h-10 px-3 gap-2">
        <button
          onClick={handlePrev}
          disabled={activeIdx <= 0}
          className="p-1 rounded disabled:opacity-20 cursor-pointer"
          style={{ color: "var(--text-secondary)" }}
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 text-center truncate">
          {activeEraSlug && activeIdx >= 0 ? (
            <div>
              <span
                className="text-xs font-semibold"
                style={{ color: eras[activeIdx].color }}
              >
                {eras[activeIdx].name}
              </span>
              <span
                className="text-xs ml-2"
                style={{
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {activeIdx + 1}/{eras.length}
              </span>
            </div>
          ) : (
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Scroll to explore
            </span>
          )}
        </div>
        <button
          onClick={handleNext}
          disabled={activeIdx >= eras.length - 1}
          className="p-1 rounded disabled:opacity-20 cursor-pointer"
          style={{ color: "var(--text-secondary)" }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
