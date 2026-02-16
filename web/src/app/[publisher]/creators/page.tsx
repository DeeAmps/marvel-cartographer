import { getCreators, getEditionsByCreator, getEras } from "@/lib/data";
import { notFound } from "next/navigation";
import { isValidPublisher, type Publisher } from "@/lib/types";
import CreatorCard from "@/components/creators/CreatorCard";

export const metadata = {
  title: "Creators",
  description:
    "Browse the writers and artists who built the Marvel Universe — from Stan Lee and Jack Kirby to Jonathan Hickman and Al Ewing.",
};

const eraGroups = [
  { label: "Silver Age", slugs: ["birth-of-marvel", "the-expansion"] },
  { label: "Bronze Age", slugs: ["bronze-age", "rise-of-x-men"] },
  { label: "Modern", slugs: ["event-age", "speculation-crash", "heroes-reborn-return", "marvel-knights-ultimate"] },
  { label: "Current", slugs: ["bendis-avengers", "hickman-saga", "all-new-all-different", "dawn-of-krakoa", "blood-hunt-doom", "current-ongoings"] },
];

export default async function CreatorsPage({
  params: routeParams,
  searchParams,
}: {
  params: Promise<{ publisher: string }>;
  searchParams: Promise<{ role?: string; era?: string }>;
}) {
  const { publisher: publisherParam } = await routeParams;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;

  const { role, era } = await searchParams;
  const creators = await getCreators();

  const allRoles = [
    ...new Set(creators.flatMap((c) => c.roles)),
  ].sort();

  let filtered = role
    ? creators.filter((c) => c.roles.includes(role))
    : creators;

  // Era filter: match creators whose active_years overlap with era range
  if (era) {
    const group = eraGroups.find((g) => g.label.toLowerCase().replace(/\s+/g, "-") === era);
    if (group) {
      filtered = filtered.filter((c) => {
        const years = c.active_years;
        if (!years) return false;
        const match = years.match(/(\d{4})/);
        if (!match) return false;
        const startYear = parseInt(match[1]);
        const eraRanges: Record<string, [number, number]> = {
          "silver-age": [1961, 1970],
          "bronze-age": [1970, 1985],
          "modern": [1985, 2004],
          "current": [2004, 2026],
        };
        const range = eraRanges[era];
        if (!range) return true;
        const endMatch = years.match(/(\d{4})[^0-9]*$/);
        const endYear = endMatch ? parseInt(endMatch[1]) : 2026;
        return startYear <= range[1] && endYear >= range[0];
      });
    }
  }

  return (
    <div>
      <h1
        className="text-3xl font-bold tracking-tight mb-2"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        Creators
      </h1>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
        {creators.length} writers, artists, and editors who built the Marvel Universe.
      </p>

      {/* Role filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <a
          href={`/${publisher}/creators`}
          className="px-2.5 py-1 rounded text-xs font-bold transition-all"
          style={{
            background: !role && !era ? "var(--bg-tertiary)" : "transparent",
            color: !role && !era ? "var(--text-primary)" : "var(--text-tertiary)",
            border: `1px solid ${!role && !era ? "var(--border-default)" : "transparent"}`,
          }}
        >
          All
        </a>
        {allRoles.map((r) => (
          <a
            key={r}
            href={`/${publisher}/creators?role=${encodeURIComponent(r)}${era ? `&era=${era}` : ""}`}
            className="px-2.5 py-1 rounded text-xs font-bold transition-all"
            style={{
              background: role === r ? "var(--bg-tertiary)" : "transparent",
              color:
                role === r ? "var(--accent-gold)" : "var(--text-tertiary)",
              border: `1px solid ${role === r ? "var(--accent-gold)" : "transparent"}`,
            }}
          >
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </a>
        ))}
      </div>

      {/* Era filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-6 items-center">
        <span className="text-xs font-bold uppercase" style={{ color: "var(--text-tertiary)" }}>
          Era:
        </span>
        {eraGroups.map((g) => {
          const eraValue = g.label.toLowerCase().replace(/\s+/g, "-");
          return (
            <a
              key={eraValue}
              href={`/${publisher}/creators?${role ? `role=${encodeURIComponent(role)}&` : ""}era=${eraValue}`}
              className="px-2 sm:px-2.5 py-1 rounded text-xs font-bold transition-all"
              style={{
                background: era === eraValue ? "var(--bg-tertiary)" : "transparent",
                color: era === eraValue ? "var(--accent-blue)" : "var(--text-tertiary)",
                border: `1px solid ${era === eraValue ? "var(--accent-blue)" : "transparent"}`,
              }}
            >
              {g.label}
            </a>
          );
        })}
        {era && (
          <a
            href={`/${publisher}/creators${role ? `?role=${encodeURIComponent(role)}` : ""}`}
            className="px-2 py-1 text-xs font-bold transition-all hover:opacity-80"
            style={{ color: "var(--accent-red)" }}
          >
            Clear era
          </a>
        )}
      </div>

      <p className="text-sm mb-4" style={{ color: "var(--text-tertiary)" }}>
        {filtered.length} creator{filtered.length !== 1 ? "s" : ""}
        {role ? ` with role: ${role}` : ""}
        {era ? ` (${era.replace(/-/g, " ")})` : ""}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((creator) => (
          <CreatorCard key={creator.slug} creator={creator} />
        ))}
      </div>
    </div>
  );
}
