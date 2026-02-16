import Link from "next/link";
import { notFound } from "next/navigation";
import { searchEditions, getEditionIssueMap, searchHandbook } from "@/lib/data";
import { isValidPublisher, type Publisher } from "@/lib/types";
import SearchBar from "@/components/search/SearchBar";
import SearchFilters from "@/components/search/SearchFilters";
import FilterDrawer from "@/components/ui/FilterDrawer";
import SearchResults from "@/components/search/SearchResultsWithOverlap";
import HandbookTypeBadge from "@/components/handbook/HandbookTypeBadge";
import ConfidenceScore from "@/components/ui/ConfidenceScore";
import type { SearchFilters as SearchFiltersType } from "@/lib/types";

export const metadata = {
  title: "Search",
  description: "Search across all collected editions by title, creator, issue number, or story content.",
};

const DEFAULT_RESULT_LIMIT = 50;

export default async function SearchPage({
  params: routeParams,
  searchParams,
}: {
  params: Promise<{ publisher: string }>;
  searchParams: Promise<{ q?: string; era?: string; importance?: string; status?: string; format?: string; creator?: string; character?: string; showAll?: string }>;
}) {
  const { publisher: publisherParam } = await routeParams;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;

  const params = await searchParams;
  const query = params.q || "";
  const showAllResults = params.showAll === "1";

  const filters: SearchFiltersType = {
    query: query || undefined,
    era: params.era || undefined,
    importance: params.importance as SearchFiltersType["importance"],
    status: params.status as SearchFiltersType["status"],
    format: params.format as SearchFiltersType["format"],
    creator: params.creator || undefined,
    character: params.character || undefined,
  };

  const activeFilterCount = [params.era, params.importance, params.status, params.format, params.creator, params.character].filter(Boolean).length;
  const hasAnyFilter = query || activeFilterCount > 0;
  const [results, editionIssueMap, handbookResults] = await Promise.all([
    hasAnyFilter ? searchEditions(filters, publisher) : Promise.resolve([]),
    hasAnyFilter ? getEditionIssueMap(publisher) : Promise.resolve({}),
    query ? searchHandbook(query, publisher) : Promise.resolve([]),
  ]);

  return (
    <div>
      <h1
        className="text-2xl sm:text-3xl font-bold tracking-tight mb-2"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        Search
      </h1>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
        Search by title, creator, issue numbers, or story content. Use filters to narrow results.
      </p>

      <SearchBar initialQuery={query} />

      <div className="mt-4">
        <FilterDrawer activeCount={activeFilterCount}>
          <SearchFilters />
        </FilterDrawer>
      </div>

      {hasAnyFilter && (
        <div className="mt-8">
          {/* Handbook Results */}
          {handbookResults.length > 0 && (
            <div className="mb-8">
              <h2
                className="text-sm font-bold uppercase mb-3 flex items-center gap-2"
                style={{ color: "var(--accent-purple)" }}
              >
                Handbook ({handbookResults.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {handbookResults.map((entry) => (
                  <Link
                    key={entry.slug}
                    href={`/${publisher}/handbook/${entry.slug}`}
                    className="rounded-lg border p-3 transition-all hover:border-[var(--accent-purple)] hover:shadow-lg hover:shadow-[var(--accent-purple)]/5"
                    style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <HandbookTypeBadge type={entry.entry_type} />
                      <ConfidenceScore score={entry.canon_confidence} />
                    </div>
                    <h4 className="text-sm font-bold mb-0.5">{entry.name}</h4>
                    <p className="text-xs line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                      {entry.core_concept}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Edition Results */}
          {(() => {
            const totalCount = results.length;
            const isLimited = !showAllResults && totalCount > DEFAULT_RESULT_LIMIT;
            const displayedResults = isLimited ? results.slice(0, DEFAULT_RESULT_LIMIT) : results;

            // Build "show all" URL preserving current search params
            const showAllSearchParams = new URLSearchParams();
            if (params.q) showAllSearchParams.set("q", params.q);
            if (params.era) showAllSearchParams.set("era", params.era);
            if (params.importance) showAllSearchParams.set("importance", params.importance);
            if (params.status) showAllSearchParams.set("status", params.status);
            if (params.format) showAllSearchParams.set("format", params.format);
            if (params.creator) showAllSearchParams.set("creator", params.creator);
            if (params.character) showAllSearchParams.set("character", params.character);
            showAllSearchParams.set("showAll", "1");
            const showAllUrl = `/${publisher}/search?${showAllSearchParams.toString()}`;

            return (
              <>
                <p className="text-sm mb-4" style={{ color: "var(--text-tertiary)" }}>
                  {isLimited
                    ? <>Showing {DEFAULT_RESULT_LIMIT} of {totalCount} editions{query ? <> for &ldquo;{query}&rdquo;</> : null}</>
                    : <>{totalCount} edition{totalCount !== 1 ? "s" : ""}{query ? <> for &ldquo;{query}&rdquo;</> : null}</>
                  }
                </p>
                {displayedResults.length > 0 ? (
                  <>
                    <SearchResults
                      results={displayedResults}
                      query={query}
                      editionIssueMap={editionIssueMap}
                    />
                    {isLimited && (
                      <div className="mt-6 text-center">
                        <Link
                          href={showAllUrl}
                          className="inline-flex items-center gap-1 px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:shadow-md"
                          style={{
                            background: "var(--bg-tertiary)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--border-default)",
                          }}
                        >
                          Show all {totalCount} results
                        </Link>
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    className="rounded-lg border p-8 text-center"
                    style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
                  >
                    <p style={{ color: "var(--text-tertiary)" }}>
                      No editions found. Try adjusting your search or filters.
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
