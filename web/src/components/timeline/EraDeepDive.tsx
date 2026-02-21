"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { Era, CollectedEdition, EraChapter } from "@/lib/types";
import type { EraEditionCount } from "@/lib/data";
import type { EraData } from "@/app/timeline/actions";
import { getEraData } from "@/app/timeline/actions";
import EraMapStrip from "./EraMapStrip";
import EraStorylineThreads from "./EraStorylineThreads";
import EraSidebar from "./EraSidebar";
import EraCard from "./EraCard";
import ChapterNav from "./ChapterNav";
import GuideStatusBadge from "@/components/ui/GuideStatusBadge";
import ShowAllButton from "./ShowAllButton";
import CoverImage from "@/components/ui/CoverImage";
import Link from "next/link";
import type { Event } from "@/lib/types";

const EDITIONS_PER_ERA = 12;

interface Props {
  eras: Era[];
  counts: Record<string, EraEditionCount>;
  landmarkEvents: Event[];
}

interface RawChapter {
  era_slug: string;
  slug: string;
  name: string;
  number: number;
  year_start: number;
  year_end: number;
  description: string;
  edition_slugs: string[];
}

export default function EraDeepDive({ eras, counts, landmarkEvents }: Props) {
  const [selectedEra, setSelectedEra] = useState<string | null>(null);
  const [eraData, setEraData] = useState<EraData | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSelectEra = useCallback(
    (slug: string) => {
      setSelectedEra(slug);
      startTransition(async () => {
        const data = await getEraData(slug);
        setEraData(data);
      });
      // Scroll to deep dive section after a short delay
      setTimeout(() => {
        document.getElementById("era-deep-dive")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    },
    []
  );

  const era = eras.find((e) => e.slug === selectedEra);

  return (
    <>
      <EraMapStrip
        eras={eras}
        counts={counts}
        landmarkEvents={landmarkEvents}
        selectedEra={selectedEra}
        onSelectEra={handleSelectEra}
      />

      <div id="era-deep-dive" className="scroll-mt-20">
        {isPending && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin" size={24} style={{ color: "var(--text-tertiary)" }} />
            <span className="ml-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
              Loading era...
            </span>
          </div>
        )}

        {!isPending && selectedEra && era && eraData && (
          <div>
            {/* Era Header */}
            <EraCard era={era}>
              <div className="flex items-center gap-3 mb-3">
                {era.guide_status && (
                  <GuideStatusBadge status={era.guide_status} />
                )}
              </div>
            </EraCard>

            {/* Content: threads + sidebar on desktop, stacked on mobile */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Main content */}
              <div className="flex-1 min-w-0">
                {/* Storyline threads */}
                <EraStorylineThreads
                  editions={eraData.editions}
                  eraColor={era.color}
                />

                {/* Chapter nav */}
                {eraData.chapters.length > 0 && (
                  <ChapterNav
                    chapters={eraData.chapters}
                    eraColor={era.color}
                  />
                )}

                {/* Full edition grid */}
                <EraEditionGrid
                  editions={eraData.editions}
                  chapters={eraData.chapters}
                />
              </div>

              {/* Sidebar */}
              <div className="w-full lg:w-72 flex-shrink-0">
                <EraSidebar
                  events={eraData.events}
                  debutCharacters={eraData.debutCharacters}
                  relatedPaths={eraData.relatedPaths}
                  eraColor={era.color}
                />
              </div>
            </div>
          </div>
        )}

        {!isPending && !selectedEra && (
          <div
            className="rounded-xl border p-8 text-center"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-default)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              Select an era above to explore its editions, storylines, and key events.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// Importance level config for compact badges
const IMPORTANCE_CONFIG: Record<string, { label: string; color: string }> = {
  essential: { label: "Essential", color: "var(--importance-essential)" },
  recommended: { label: "Rec'd", color: "var(--importance-recommended)" },
  supplemental: { label: "Supp.", color: "var(--importance-supplemental)" },
  completionist: { label: "Comp.", color: "var(--importance-completionist)" },
};

// Print status config for compact badges
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  in_print: { label: "In Print", color: "var(--status-in-print)" },
  out_of_print: { label: "OOP", color: "var(--status-out-of-print)" },
  upcoming: { label: "Soon", color: "var(--status-upcoming)" },
  digital_only: { label: "Digital", color: "var(--status-digital)" },
  ongoing: { label: "Ongoing", color: "var(--status-ongoing)" },
};

function CompactEditionCard({ edition }: { edition: CollectedEdition }) {
  const importance = IMPORTANCE_CONFIG[edition.importance] || IMPORTANCE_CONFIG.completionist;
  const status = STATUS_CONFIG[edition.print_status] || STATUS_CONFIG.in_print;

  return (
    <Link
      href={`/edition/${edition.slug}`}
      className="flex-shrink-0 group"
      style={{ width: 110 }}
    >
      <div
        className="rounded-lg border overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
        }}
      >
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "2/3", maxHeight: 160, background: "var(--bg-tertiary)" }}
        >
          <CoverImage
            src={edition.cover_image_url}
            alt={edition.title}
            fill
            sizes="110px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            format={edition.format}
          />
          {/* Importance badge — top-right corner */}
          {(edition.importance === "essential" || edition.importance === "recommended") && (
            <span
              className="absolute top-1 right-1 px-1 py-px rounded text-white font-semibold leading-none"
              style={{
                fontSize: "0.55rem",
                backgroundColor: importance.color,
                boxShadow: edition.importance === "essential"
                  ? `0 0 6px color-mix(in srgb, ${importance.color} 50%, transparent)`
                  : undefined,
              }}
            >
              {importance.label}
            </span>
          )}
        </div>
        <div className="px-1.5 py-1.5">
          <p
            className="font-medium leading-tight line-clamp-2 group-hover:text-[var(--accent-red)] transition-colors"
            style={{ color: "var(--text-primary)", fontSize: "0.6rem" }}
          >
            {edition.title}
          </p>
          {/* Print status — small colored text below title */}
          <span
            className="inline-block mt-0.5 font-medium leading-none"
            style={{ color: status.color, fontSize: "0.5rem" }}
          >
            {status.label}
          </span>
        </div>
      </div>
    </Link>
  );
}

function EraEditionGrid({
  editions,
  chapters,
}: {
  editions: CollectedEdition[];
  chapters: EraChapter[];
}) {
  if (editions.length === 0) {
    return (
      <p className="text-sm italic" style={{ color: "var(--text-tertiary)" }}>
        No editions in this era.
      </p>
    );
  }

  // If chapters exist, group by chapter
  if (chapters.length > 0) {
    const chapterEditions = new Map<string, CollectedEdition[]>();
    const ungrouped: CollectedEdition[] = [];

    for (const ed of editions) {
      if (ed.chapter_slug) {
        if (!chapterEditions.has(ed.chapter_slug)) chapterEditions.set(ed.chapter_slug, []);
        chapterEditions.get(ed.chapter_slug)!.push(ed);
      } else {
        ungrouped.push(ed);
      }
    }

    const hasChapterData = chapters.some((ch) => (chapterEditions.get(ch.slug) || []).length > 0);

    if (hasChapterData) {
      return (
        <div className="space-y-6">
          {chapters.map((ch) => {
            const chEditions = chapterEditions.get(ch.slug) || [];
            if (chEditions.length === 0) return null;
            return (
              <div key={ch.slug}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{
                      background: "var(--bg-tertiary)",
                      color: "var(--text-tertiary)",
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: "0.75rem",
                    }}
                  >
                    PART {ch.number}
                  </span>
                  <h3
                    className="text-sm font-bold tracking-tight"
                    style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
                  >
                    {ch.name}
                  </h3>
                  <span
                    className="text-xs"
                    style={{
                      color: "var(--text-tertiary)",
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: "0.75rem",
                    }}
                  >
                    {ch.year_start}&ndash;{ch.year_end}
                  </span>
                </div>
                {ch.description && (
                  <p className="text-xs mb-3 max-w-2xl" style={{ color: "var(--text-secondary)" }}>
                    {ch.description}
                  </p>
                )}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {chEditions.map((edition) => (
                    <CompactEditionCard key={edition.slug} edition={edition} />
                  ))}
                </div>
              </div>
            );
          })}
          {ungrouped.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {ungrouped.map((edition) => (
                <CompactEditionCard key={edition.slug} edition={edition} />
              ))}
            </div>
          )}
        </div>
      );
    }
  }

  // No chapters — flat grid with ShowAllButton using compact cards
  const needsPagination = editions.length > EDITIONS_PER_ERA;

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {(needsPagination ? editions.slice(0, EDITIONS_PER_ERA) : editions).map((edition) => (
          <CompactEditionCard key={edition.slug} edition={edition} />
        ))}
      </div>
      {needsPagination && (
        <ShowAllButton count={editions.length}>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin flex-wrap">
            {editions.map((edition) => (
              <CompactEditionCard key={edition.slug} edition={edition} />
            ))}
          </div>
        </ShowAllButton>
      )}
    </div>
  );
}
