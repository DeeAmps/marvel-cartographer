import { Suspense } from "react";
import { getErasWithChapters, getEditionsByEra, getEraChapters } from "@/lib/data";
import EraCard from "@/components/timeline/EraCard";
import EditionCard from "@/components/editions/EditionCard";
import ChapterNav from "@/components/timeline/ChapterNav";
import GuideStatusBadge from "@/components/ui/GuideStatusBadge";
import TimelineFilters from "@/components/timeline/TimelineFilters";
import TimelineView from "@/components/timeline/TimelineView";
import HashScroller from "@/components/timeline/HashScroller";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidPublisher, type Publisher } from "@/lib/types";
import type { CollectedEdition, EraChapter } from "@/lib/types";

const EDITIONS_PER_ERA = 12;

export const revalidate = 3600;

export const metadata = {
  title: "Timeline",
  description: "Browse the complete Marvel Universe timeline from 1961 to 2026, organized by era.",
};

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

function FilteredEditions({
  editions,
  importance,
  status,
  format,
  creator,
  chapters,
  rawChapters,
  showAll,
  eraSlug,
  currentParams,
}: {
  editions: CollectedEdition[];
  importance: string;
  status: string;
  format: string;
  creator: string;
  chapters?: EraChapter[];
  rawChapters?: RawChapter[];
  showAll: boolean;
  eraSlug: string;
  currentParams: Record<string, string>;
}) {
  const filtered = editions.filter((e) => {
    if (importance !== "all" && e.importance !== importance) return false;
    if (status !== "all" && e.print_status !== status) return false;
    if (format !== "all" && e.format !== format) return false;
    if (creator) {
      const creatorLower = creator.toLowerCase();
      const hasCreator = e.creator_names?.some((c) => c.toLowerCase().includes(creatorLower));
      if (!hasCreator) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    return (
      <p className="text-sm italic" style={{ color: "var(--text-tertiary)" }}>
        No editions match the current filters.
      </p>
    );
  }

  // If chapters exist, group editions by chapter
  if (chapters && chapters.length > 0 && rawChapters) {
    const editionToChapter = new Map<string, string>();
    for (const rc of rawChapters) {
      for (const slug of rc.edition_slugs) {
        editionToChapter.set(slug, rc.slug);
      }
    }

    const chapterGroups = new Map<string, CollectedEdition[]>();
    const ungrouped: CollectedEdition[] = [];

    for (const ed of filtered) {
      const chSlug = editionToChapter.get(ed.slug);
      if (chSlug) {
        if (!chapterGroups.has(chSlug)) chapterGroups.set(chSlug, []);
        chapterGroups.get(chSlug)!.push(ed);
      } else {
        ungrouped.push(ed);
      }
    }

    return (
      <div className="space-y-6">
        {chapters.map((ch) => {
          const chEditions = chapterGroups.get(ch.slug) || [];
          if (chEditions.length === 0) return null;
          return (
            <div key={ch.slug} id={ch.slug} className="scroll-mt-24">
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
                  {ch.year_start}–{ch.year_end}
                </span>
              </div>
              {ch.description && (
                <p
                  className="text-xs mb-3 max-w-2xl"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {ch.description}
                </p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {chEditions.map((edition) => (
                  <EditionCard key={edition.slug} edition={edition} />
                ))}
              </div>
            </div>
          );
        })}
        {ungrouped.length > 0 && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ungrouped.map((edition) => (
                <EditionCard key={edition.slug} edition={edition} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Apply pagination: show limited editions unless showAll is set
  const totalFiltered = filtered.length;
  const shouldPaginate = !showAll && totalFiltered > EDITIONS_PER_ERA;
  const displayed = shouldPaginate ? filtered.slice(0, EDITIONS_PER_ERA) : filtered;

  // Build "show all" URL preserving current filter params
  const showAllParams = new URLSearchParams(currentParams);
  showAllParams.set(`showAll_${eraSlug}`, "1");
  const showAllUrl = `?${showAllParams.toString()}#${eraSlug}`;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayed.map((edition) => (
          <EditionCard key={edition.slug} edition={edition} />
        ))}
      </div>
      {shouldPaginate && (
        <div className="mt-4 text-center">
          <Link
            href={showAllUrl}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
            }}
          >
            Show all {totalFiltered} editions
          </Link>
        </div>
      )}
    </div>
  );
}

export default async function TimelinePage({
  params: routeParams,
  searchParams,
}: {
  params: Promise<{ publisher: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { publisher: publisherParam } = await routeParams;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;

  const params = await searchParams;
  const importance = params.importance || "all";
  const status = params.status || "all";
  const format = params.format || "all";
  const creator = params.creator || "";

  // Build a clean params record for "show all" links to preserve filters
  const currentParams: Record<string, string> = {};
  if (params.importance) currentParams.importance = params.importance;
  if (params.status) currentParams.status = params.status;
  if (params.format) currentParams.format = params.format;
  if (params.creator) currentParams.creator = params.creator;
  // Preserve existing showAll flags
  for (const [key, val] of Object.entries(params)) {
    if (key.startsWith("showAll_") && val) currentParams[key] = val;
  }
  const [eras, editionsByEra, allRawChapters] = await Promise.all([
    getErasWithChapters(publisher),
    getEditionsByEra(publisher),
    (async () => {
      try {
        const { promises: fs } = await import("fs");
        const path = await import("path");
        const raw = await fs.readFile(
          path.join(process.cwd(), "..", "data", "era_chapters.json"),
          "utf-8"
        );
        return JSON.parse(raw) as RawChapter[];
      } catch {
        return [] as RawChapter[];
      }
    })(),
  ]);

  // Build raw chapter lookup by era
  const rawChaptersByEra = new Map<string, RawChapter[]>();
  for (const rc of allRawChapters) {
    if (!rawChaptersByEra.has(rc.era_slug)) rawChaptersByEra.set(rc.era_slug, []);
    rawChaptersByEra.get(rc.era_slug)!.push(rc);
  }

  return (
    <div>
      <HashScroller />
      <h1
        className="text-2xl sm:text-3xl font-bold tracking-tight mb-2"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        Timeline
      </h1>
      <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
        The complete Marvel Universe, era by era. {eras.length} eras spanning 1961&ndash;2026.
      </p>
      <div
        className="rounded-lg border p-3 mb-8 text-xs leading-relaxed"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
      >
        <span className="font-bold" style={{ color: "var(--accent-gold)" }}>Note:</span>{" "}
        Some eras overlap in date ranges. This is intentional&mdash;Marvel&apos;s narrative movements ran in parallel across different title families.
        For example, the Claremont X-Men revolution (1975&ndash;1985) overlapped with the broader Bronze Age, and Hickman&apos;s saga (2009&ndash;2015) ran alongside the Bendis Avengers era.
      </div>

      {/* Interactive D3 Timeline */}
      <TimelineView
        eras={eras.map((era) => ({
          slug: era.slug,
          name: era.name,
          year_start: era.year_start,
          year_end: era.year_end,
          color: era.color,
          editions: (editionsByEra[era.slug] || []).map((e) => ({
            slug: e.slug,
            title: e.title,
            importance: e.importance,
            print_status: e.print_status,
            cover_image_url: e.cover_image_url || undefined,
          })),
        }))}
      />

      <div className="mt-6 mb-2">
        <Suspense>
          <TimelineFilters />
        </Suspense>
      </div>

      <div className="mt-4">
        {eras.map((era) => {
          const editions = editionsByEra[era.slug] || [];
          const chapters = era.chapters || [];
          const eraRawChapters = rawChaptersByEra.get(era.slug) || [];
          return (
            <div key={era.slug} id={era.slug} className="scroll-mt-24">
              <EraCard era={era}>
                <>
                  {/* Guide status + chapter nav */}
                  <div className="flex items-center gap-3 mb-3">
                    {era.guide_status && (
                      <GuideStatusBadge status={era.guide_status} />
                    )}
                  </div>
                  {chapters.length > 0 && (
                    <ChapterNav chapters={chapters} eraColor={era.color} />
                  )}
                  <FilteredEditions
                    editions={editions}
                    importance={importance}
                    status={status}
                    format={format}
                    creator={creator}
                    chapters={chapters}
                    rawChapters={eraRawChapters}
                    showAll={params[`showAll_${era.slug}`] === "1"}
                    eraSlug={era.slug}
                    currentParams={currentParams}
                  />
                </>
              </EraCard>
            </div>
          );
        })}
      </div>
    </div>
  );
}
