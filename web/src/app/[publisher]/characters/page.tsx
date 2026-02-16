import Link from "next/link";
import { notFound } from "next/navigation";
import { Share2 } from "lucide-react";
import { getCharacters, getCharacterEditionCounts } from "@/lib/data";
import { isValidPublisher, type Publisher } from "@/lib/types";
import CharacterCard from "@/components/characters/CharacterCard";
import SearchBar from "@/components/search/SearchBar";

export const metadata = {
  title: "Characters",
  description:
    "Browse Marvel characters from the Fantastic Four to the X-Men, Spider-Man, Avengers, and beyond.",
};

type SortOption = "alphabetical" | "first_appearance" | "popularity";

export default async function CharactersPage({
  params: routeParams,
  searchParams,
}: {
  params: Promise<{ publisher: string }>;
  searchParams: Promise<{ q?: string; team?: string; sort?: string }>;
}) {
  const { publisher: publisherParam } = await routeParams;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;

  const { q, team, sort } = await searchParams;
  const characters = await getCharacters();
  const currentSort = (sort as SortOption) || "alphabetical";

  // Collect all unique teams for filter
  const allTeams = [
    ...new Set(characters.flatMap((c) => c.teams)),
  ].sort();

  let filtered = characters;

  if (q) {
    const query = q.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.aliases.some((a) => a.toLowerCase().includes(query)) ||
        c.teams.some((t) => t.toLowerCase().includes(query)) ||
        c.description.toLowerCase().includes(query)
    );
  }

  if (team) {
    filtered = filtered.filter((c) =>
      c.teams.some((t) => t.toLowerCase() === team.toLowerCase())
    );
  }

  // Sort
  if (currentSort === "first_appearance") {
    filtered.sort((a, b) => {
      const yearA = parseInt(a.first_appearance_issue.match(/\((\d{4})\)/)?.[1] || "9999");
      const yearB = parseInt(b.first_appearance_issue.match(/\((\d{4})\)/)?.[1] || "9999");
      return yearA - yearB;
    });
  } else if (currentSort === "popularity") {
    // Use pre-computed edition counts (computed once, cached in data layer)
    const editionCounts = await getCharacterEditionCounts(publisher);
    filtered.sort((a, b) => (editionCounts.get(b.slug) || 0) - (editionCounts.get(a.slug) || 0));
  } else {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "alphabetical", label: "A–Z" },
    { value: "first_appearance", label: "First Appearance" },
    { value: "popularity", label: "Most Editions" },
  ];

  function buildSortUrl(s: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (team) params.set("team", team);
    if (s !== "alphabetical") params.set("sort", s);
    const qs = params.toString();
    return `/${publisher}/characters${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-2">
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          Characters
        </h1>
        <Link
          href={`/${publisher}/characters/graph`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex-shrink-0"
          style={{
            background: "var(--bg-tertiary)",
            color: "var(--accent-blue)",
            border: "1px solid var(--accent-blue)",
          }}
        >
          <Share2 size={14} />
          Relationship Map
        </Link>
      </div>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
        {characters.length} characters from across the Marvel Universe.
      </p>

      <div className="mb-6">
        <SearchBar initialQuery={q || ""} />
      </div>

      {/* Team filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <a
          href={`/${publisher}/characters`}
          className="px-2.5 py-1 rounded text-xs font-bold transition-all"
          style={{
            background: !team ? "var(--bg-tertiary)" : "transparent",
            color: !team ? "var(--text-primary)" : "var(--text-tertiary)",
            border: `1px solid ${!team ? "var(--border-default)" : "transparent"}`,
          }}
        >
          All
        </a>
        {allTeams.slice(0, 12).map((t) => (
          <a
            key={t}
            href={`/${publisher}/characters?team=${encodeURIComponent(t)}`}
            className="px-2.5 py-1 rounded text-xs font-bold transition-all"
            style={{
              background:
                team === t ? "var(--bg-tertiary)" : "transparent",
              color:
                team === t
                  ? "var(--accent-blue)"
                  : "var(--text-tertiary)",
              border: `1px solid ${team === t ? "var(--accent-blue)" : "transparent"}`,
            }}
          >
            {t}
          </a>
        ))}
      </div>

      {/* Sort options */}
      <div className="flex flex-wrap gap-1.5 mb-6 items-center">
        <span className="text-xs font-bold uppercase" style={{ color: "var(--text-tertiary)" }}>
          Sort:
        </span>
        {sortOptions.map((opt) => (
          <a
            key={opt.value}
            href={buildSortUrl(opt.value)}
            className="px-2.5 py-1 rounded text-xs font-bold transition-all"
            style={{
              background: currentSort === opt.value ? "var(--bg-tertiary)" : "transparent",
              color: currentSort === opt.value ? "var(--accent-gold)" : "var(--text-tertiary)",
              border: `1px solid ${currentSort === opt.value ? "var(--accent-gold)" : "transparent"}`,
            }}
          >
            {opt.label}
          </a>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-lg border p-8 text-center"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-default)",
          }}
        >
          <p style={{ color: "var(--text-tertiary)" }}>
            No characters found. Try a different search or filter.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm mb-4" style={{ color: "var(--text-tertiary)" }}>
            {filtered.length} character{filtered.length !== 1 ? "s" : ""}
            {q ? ` matching "${q}"` : ""}
            {team ? ` in ${team}` : ""}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((character) => (
              <CharacterCard key={character.slug} character={character} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
