"use client";

import { useState, useEffect, useRef } from "react";
import type { Era, CollectedEdition } from "@/lib/types";
import type { EraEditionCount } from "@/lib/data";
import TimelineEraBar from "./TimelineEraBar";
import EssentialPath from "./EssentialPath";
import ExpandableEditionTier from "./ExpandableEditionTier";

interface Props {
  eras: Era[];
  essentialByEra: Record<string, CollectedEdition[]>;
  counts: Record<string, EraEditionCount>;
}

function useActiveEra(eras: Era[]): string | null {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        let bestEntry: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (
              !bestEntry ||
              entry.intersectionRatio > bestEntry.intersectionRatio
            ) {
              bestEntry = entry;
            }
          }
        }
        if (bestEntry) {
          setActiveSlug(bestEntry.target.id);
        }
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: [0, 0.25, 0.5],
      }
    );

    for (const era of eras) {
      const el = document.getElementById(era.slug);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [eras]);

  return activeSlug;
}

function EraDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = description.length > 300;

  return (
    <div className="mb-4 max-w-3xl">
      <p
        className="text-sm leading-relaxed"
        style={{ color: "var(--text-secondary)" }}
      >
        {isLong && !expanded ? description.slice(0, 300) + "..." : description}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs mt-1 font-medium cursor-pointer hover:underline"
          style={{ color: "var(--accent-blue)" }}
        >
          {expanded ? "Show less" : "Read the full story of this era"}
        </button>
      )}
    </div>
  );
}

export default function TimelineFlow({
  eras,
  essentialByEra,
  counts,
}: Props) {
  const activeEraSlug = useActiveEra(eras);

  return (
    <>
      <TimelineEraBar
        eras={eras}
        activeEraSlug={activeEraSlug}
      />

      <div className="mt-6">
        {eras.map((era) => {
          const essentials = essentialByEra[era.slug] || [];
          const eraCounts = counts[era.slug] || {
            total: 0,
            essential: 0,
            recommended: 0,
            supplemental: 0,
            completionist: 0,
          };

          return (
            <section
              key={era.slug}
              id={era.slug}
              className="scroll-mt-24 mb-16"
            >
              {/* Era header */}
              <div className="flex items-center gap-3 mb-1">
                <div
                  className="w-1 h-10 rounded-full flex-shrink-0"
                  style={{ background: era.color }}
                />
                <div>
                  <h2
                    className="text-xl sm:text-2xl font-semibold"
                    style={{
                      fontFamily: "var(--font-bricolage), sans-serif",
                      color: "var(--text-primary)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {era.name}
                  </h2>
                  <p
                    className="text-sm mt-0.5"
                    style={{
                      color: era.color,
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: "0.8rem",
                    }}
                  >
                    {era.year_start}&ndash;{era.year_end}
                    <span
                      className="ml-3"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {eraCounts.essential} essential reads &middot;{" "}
                      {eraCounts.total} collected editions total
                    </span>
                  </p>
                </div>
              </div>

              {era.subtitle && (
                <p className="text-sm mb-2 italic" style={{ color: era.color }}>
                  {era.subtitle}
                </p>
              )}

              {era.description && (
                <EraDescription description={era.description} />
              )}

              {/* Essential reading label */}
              {essentials.length > 0 && (
                <div className="flex items-center gap-2 mb-3 mt-4">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                    style={{ background: "var(--importance-essential)" }}
                  >
                    Essential Reading
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Must-read collected editions published during{" "}
                    {era.year_start}&ndash;{era.year_end}, in suggested reading
                    order.
                  </span>
                </div>
              )}

              {/* Essential reading path */}
              <EssentialPath
                editions={essentials}
                eraColor={era.color}
                eraYears={`${era.year_start}–${era.year_end}`}
              />

              {/* Expandable tiers for recommended/supplemental/completionist */}
              {eraCounts.recommended > 0 && (
                <ExpandableEditionTier
                  eraSlug={era.slug}
                  importance="recommended"
                  count={eraCounts.recommended}
                />
              )}
              {eraCounts.supplemental > 0 && (
                <ExpandableEditionTier
                  eraSlug={era.slug}
                  importance="supplemental"
                  count={eraCounts.supplemental}
                />
              )}
              {eraCounts.completionist > 0 && (
                <ExpandableEditionTier
                  eraSlug={era.slug}
                  importance="completionist"
                  count={eraCounts.completionist}
                />
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
