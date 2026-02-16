import { notFound } from "next/navigation";
import { getHandbookEntries, getEras } from "@/lib/data";
import { isValidPublisher, type Publisher } from "@/lib/types";
import HandbookEntryCard from "@/components/handbook/HandbookEntryCard";
import type { HandbookEntryType } from "@/lib/types";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) return { title: "Not Found" };
  return {
    title: "Handbook",
    description:
      "The Official Comic Cartographer Handbook — characters, teams, artifacts, locations, species, and editorial concepts with era-by-era tracking and retcon histories.",
  };
}

const typeFilters: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "character", label: "Characters" },
  { value: "team", label: "Teams" },
  { value: "artifact", label: "Artifacts" },
  { value: "location", label: "Locations" },
  { value: "species", label: "Species" },
  { value: "editorial_concept", label: "Concepts" },
];

const sortOptions = [
  { value: "name", label: "Name" },
  { value: "confidence", label: "Confidence" },
  { value: "type", label: "Type" },
];

export default async function HandbookPage({
  params,
  searchParams,
}: {
  params: Promise<{ publisher: string }>;
  searchParams: Promise<{ type?: string; q?: string; sort?: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;
  const resolvedSearchParams = await searchParams;
  const typeFilter = resolvedSearchParams.type || "all";
  const query = resolvedSearchParams.q || "";
  const sortBy = resolvedSearchParams.sort || "name";
  const entries = await getHandbookEntries(publisher);

  let filtered = entries;

  if (typeFilter !== "all") {
    filtered = filtered.filter((e) => e.entry_type === typeFilter);
  }

  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.core_concept.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (sortBy === "confidence") {
    filtered.sort((a, b) => b.canon_confidence - a.canon_confidence);
  } else if (sortBy === "type") {
    filtered.sort((a, b) => a.entry_type.localeCompare(b.entry_type));
  } else {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    const merged = {
      type: typeFilter,
      q: query,
      sort: sortBy,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "all" && v !== "name" && !(k === "q" && v === "")) {
        p.set(k, v);
      }
    }
    const qs = p.toString();
    return `/${publisher}/handbook${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <h1
        className="text-2xl sm:text-3xl font-bold tracking-tight mb-2"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        Handbook
      </h1>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
        The continuity intelligence layer. {entries.length} entries tracking
        characters, teams, artifacts, locations, species, and editorial concepts
        across every era of Marvel history.
      </p>

      {/* Search */}
      <div className="mb-4">
        <form action={`/${publisher}/handbook`} method="GET">
          {typeFilter !== "all" && (
            <input type="hidden" name="type" value={typeFilter} />
          )}
          {sortBy !== "name" && (
            <input type="hidden" name="sort" value={sortBy} />
          )}
          <input
            name="q"
            type="text"
            defaultValue={query}
            placeholder="Search handbook entries..."
            className="w-full max-w-md px-4 py-2 rounded-lg border text-sm focus:outline-none focus:border-[var(--accent-red)] transition-colors"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
        </form>
      </div>

      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {typeFilters.map((tf) => (
          <a
            key={tf.value}
            href={buildUrl({ type: tf.value })}
            className="px-2.5 py-1 rounded text-xs font-bold transition-all"
            style={{
              background:
                typeFilter === tf.value ? "var(--bg-tertiary)" : "transparent",
              color:
                typeFilter === tf.value
                  ? "var(--text-primary)"
                  : "var(--text-tertiary)",
              border: `1px solid ${typeFilter === tf.value ? "var(--border-default)" : "transparent"}`,
            }}
          >
            {tf.label}
          </a>
        ))}
      </div>

      {/* Sort */}
      <div className="flex flex-wrap gap-1.5 mb-6 items-center">
        <span
          className="text-xs font-bold uppercase"
          style={{ color: "var(--text-tertiary)" }}
        >
          Sort:
        </span>
        {sortOptions.map((opt) => (
          <a
            key={opt.value}
            href={buildUrl({ sort: opt.value })}
            className="px-2.5 py-1 rounded text-xs font-bold transition-all"
            style={{
              background:
                sortBy === opt.value ? "var(--bg-tertiary)" : "transparent",
              color:
                sortBy === opt.value
                  ? "var(--accent-gold)"
                  : "var(--text-tertiary)",
              border: `1px solid ${sortBy === opt.value ? "var(--accent-gold)" : "transparent"}`,
            }}
          >
            {opt.label}
          </a>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div
          className="rounded-lg border p-8 text-center"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-default)",
          }}
        >
          <p style={{ color: "var(--text-tertiary)" }}>
            No entries found. Try a different search or filter.
          </p>
        </div>
      ) : (
        <>
          <p
            className="text-sm mb-4"
            style={{ color: "var(--text-tertiary)" }}
          >
            {filtered.length} entr{filtered.length !== 1 ? "ies" : "y"}
            {query ? ` matching "${query}"` : ""}
            {typeFilter !== "all" ? ` in ${typeFilter.replace("_", " ")}` : ""}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((entry) => (
              <HandbookEntryCard key={entry.slug} entry={entry} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
