import { notFound } from "next/navigation";
import Link from "next/link";
import { BookMarked, Clock, ArrowRight, BookOpen, Zap, AlertTriangle, Quote } from "lucide-react";
import { getHandbookEntryBySlug, getHandbookEntries, getEras, getEditions, getEvents, getConflicts } from "@/lib/data";

export const revalidate = 3600;
import HandbookTypeBadge from "@/components/handbook/HandbookTypeBadge";
import ConfidenceScore from "@/components/ui/ConfidenceScore";
import PowerGridRadar from "@/components/handbook/PowerGridRadar";
import StatusTimeline from "@/components/handbook/StatusTimeline";
import RetconTimeline from "@/components/handbook/RetconTimeline";
import PossessionTimeline from "@/components/handbook/PossessionTimeline";
import RosterTable from "@/components/handbook/RosterTable";
import type { Metadata } from "next";
import type {
  CharacterHandbookData,
  TeamHandbookData,
  LocationHandbookData,
  ArtifactHandbookData,
  SpeciesHandbookData,
  EditorialConceptData,
} from "@/lib/types";

export async function generateStaticParams() {
  const entries = await getHandbookEntries();
  return entries.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getHandbookEntryBySlug(slug);
  if (!entry) return { title: "Not Found" };
  return {
    title: `${entry.name} — Handbook`,
    description: entry.core_concept,
  };
}

export default async function HandbookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [entry, eras, editions, events, conflicts, allEntries] = await Promise.all([
    getHandbookEntryBySlug(slug),
    getEras(),
    getEditions(),
    getEvents(),
    getConflicts(),
    getHandbookEntries(),
  ]);

  if (!entry) notFound();

  const eraMap = Object.fromEntries(eras.map((e) => [e.slug, e]));
  const editionMap = Object.fromEntries(editions.map((e) => [e.slug, e]));
  const eventMap = Object.fromEntries(events.map((e) => [e.slug, e]));
  const conflictMap = Object.fromEntries(conflicts.map((c) => [c.slug, c]));
  const handbookMap = Object.fromEntries(allEntries.map((e) => [e.slug, e]));

  const relatedEditions = entry.related_edition_slugs
    .map((s) => editionMap[s])
    .filter(Boolean);
  const relatedEvents = entry.related_event_slugs
    .map((s) => eventMap[s])
    .filter(Boolean);
  const relatedConflicts = entry.related_conflict_slugs
    .map((s) => conflictMap[s])
    .filter(Boolean);
  const relatedHandbook = entry.related_handbook_slugs
    .map((s) => handbookMap[s])
    .filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs mb-6" style={{ color: "var(--text-tertiary)" }}>
        <Link href="/handbook" className="hover:text-[var(--accent-red)] transition-colors">
          Handbook
        </Link>
        <span>/</span>
        <span style={{ color: "var(--text-secondary)" }}>{entry.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <HandbookTypeBadge type={entry.entry_type} size="large" />
            <ConfidenceScore score={entry.canon_confidence} />
          </div>
          <h1
            className="text-3xl font-bold tracking-tight mb-2"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            {entry.name}
          </h1>
          <p
            className="text-lg leading-relaxed"
            style={{ color: "var(--accent-gold)" }}
          >
            {entry.core_concept}
          </p>
        </div>
      </div>

      {/* Tags */}
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-8">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-xs"
              style={{
                background: "var(--bg-tertiary)",
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      <section className="mb-10">
        <div
          className="rounded-lg border p-6"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-default)",
          }}
        >
          <p
            className="text-sm leading-relaxed whitespace-pre-line"
            style={{ color: "var(--text-secondary)" }}
          >
            {entry.description}
          </p>
        </div>
      </section>

      {/* Type-specific visualizations */}
      {entry.entry_type === "character" && (
        <CharacterSection data={entry.data as CharacterHandbookData} handbookMap={handbookMap} />
      )}

      {entry.entry_type === "team" && (
        <TeamSection data={entry.data as TeamHandbookData} eraMap={eraMap} />
      )}

      {entry.entry_type === "artifact" && (
        <ArtifactSection data={entry.data as ArtifactHandbookData} eraMap={eraMap} handbookMap={handbookMap} />
      )}

      {entry.entry_type === "location" && (
        <LocationSection data={entry.data as LocationHandbookData} eraMap={eraMap} />
      )}

      {entry.entry_type === "species" && (
        <SpeciesSection data={entry.data as SpeciesHandbookData} eraMap={eraMap} />
      )}

      {entry.entry_type === "editorial_concept" && (
        <EditorialConceptSection data={entry.data as EditorialConceptData} />
      )}

      {/* Status by Era */}
      {entry.status_by_era.length > 0 && (
        <section className="mb-10">
          <SectionHeader icon={Clock} title="Status by Era" />
          <StatusTimeline statuses={entry.status_by_era} eraMap={eraMap} />
        </section>
      )}

      {/* Retcon History */}
      {entry.retcon_history.length > 0 && (
        <section className="mb-10">
          <SectionHeader icon={AlertTriangle} title="Retcon History" />
          <RetconTimeline retcons={entry.retcon_history} />
        </section>
      )}

      {/* Related Editions */}
      {relatedEditions.length > 0 && (
        <section className="mb-10">
          <SectionHeader icon={BookOpen} title="Key Editions" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {relatedEditions.map((ed) => (
              <Link
                key={ed!.slug}
                href={`/edition/${ed!.slug}`}
                className="block rounded-lg border p-3 transition-all hover:border-[var(--accent-red)] hover:shadow-lg hover:shadow-[var(--accent-red)]/5"
                style={{
                  background: "var(--bg-secondary)",
                  borderColor: "var(--border-default)",
                }}
              >
                <p className="text-sm font-bold truncate">{ed!.title}</p>
                <p
                  className="text-xs mt-0.5 truncate"
                  style={{
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                >
                  {ed!.issues_collected}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Related Events */}
      {relatedEvents.length > 0 && (
        <section className="mb-10">
          <SectionHeader icon={Zap} title="Related Events" />
          <div className="flex flex-wrap gap-2">
            {relatedEvents.map((ev) => (
              <Link
                key={ev!.slug}
                href={`/event/${ev!.slug}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--accent-blue)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <Zap size={10} />
                {ev!.name} ({ev!.year})
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Related Conflicts */}
      {relatedConflicts.length > 0 && (
        <section className="mb-10">
          <SectionHeader icon={AlertTriangle} title="Related Continuity Conflicts" />
          <div className="space-y-2">
            {relatedConflicts.map((c) => (
              <Link
                key={c!.slug}
                href={`/conflicts#${c!.slug}`}
                className="block rounded-lg border p-3 transition-all hover:border-[var(--accent-gold)]"
                style={{
                  background: "var(--bg-secondary)",
                  borderColor: "var(--border-default)",
                }}
              >
                <p className="text-sm font-bold">{c!.title}</p>
                <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--text-tertiary)" }}>
                  {c!.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Related Handbook Entries */}
      {relatedHandbook.length > 0 && (
        <section className="mb-10">
          <SectionHeader icon={BookMarked} title="Related Handbook Entries" />
          <div className="flex flex-wrap gap-2">
            {relatedHandbook.map((h) => (
              <Link
                key={h!.slug}
                href={`/handbook/${h!.slug}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <BookMarked size={10} />
                {h!.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Source Citations */}
      {entry.source_citations.length > 0 && (
        <section className="mb-10">
          <SectionHeader icon={Quote} title="Source Citations" />
          <div
            className="rounded-lg border p-4"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-default)",
            }}
          >
            <ul className="space-y-1">
              {entry.source_citations.map((cite, i) => (
                <li
                  key={i}
                  className="text-xs"
                  style={{
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                >
                  {cite}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: typeof Clock;
  title: string;
}) {
  return (
    <h2
      className="flex items-center gap-2 text-lg font-bold tracking-tight mb-4"
      style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
    >
      <Icon size={18} style={{ color: "var(--accent-red)" }} />
      {title}
    </h2>
  );
}

function CharacterSection({
  data,
  handbookMap,
}: {
  data: CharacterHandbookData;
  handbookMap: Record<string, { slug: string; name: string }>;
}) {
  return (
    <>
      {/* Power Grid */}
      <section className="mb-10">
        <SectionHeader icon={Zap} title="Power Grid" />
        <PowerGridRadar grid={data.power_grid} />
      </section>

      {/* Abilities */}
      {data.abilities.length > 0 && (
        <section className="mb-10">
          <h3
            className="text-sm font-bold tracking-tight mb-3"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            Abilities
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {data.abilities.map((a) => (
              <span
                key={a}
                className="px-2.5 py-1 rounded-lg text-xs font-bold"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-default)",
                }}
              >
                {a}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Affiliations */}
      {data.affiliations.length > 0 && (
        <section className="mb-10">
          <h3
            className="text-sm font-bold tracking-tight mb-3"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            Team Affiliations
          </h3>
          <div className="space-y-2">
            {data.affiliations.map((aff) => {
              const team = handbookMap[aff.team_slug];
              return (
                <div
                  key={aff.team_slug}
                  className="flex items-center gap-2 text-sm"
                >
                  {team ? (
                    <Link
                      href={`/handbook/${team.slug}`}
                      className="font-bold hover:text-[var(--accent-red)] transition-colors"
                    >
                      {team.name}
                    </Link>
                  ) : (
                    <span className="font-bold">
                      {aff.team_slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  )}
                  <span
                    className="text-xs"
                    style={{
                      color: "var(--text-tertiary)",
                      fontFamily: "var(--font-geist-mono), monospace",
                    }}
                  >
                    ({aff.era_slugs.join(", ")})
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Identity Changes */}
      {data.identity_changes.length > 0 && (
        <section className="mb-10">
          <h3
            className="text-sm font-bold tracking-tight mb-3"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            Identity Changes
          </h3>
          <div className="space-y-2">
            {data.identity_changes.map((ic, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm"
              >
                <ArrowRight size={12} style={{ color: "var(--accent-gold)" }} />
                <span className="font-bold">{ic.identity}</span>
                <span
                  className="text-xs"
                  style={{
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                >
                  {ic.citation}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function TeamSection({
  data,
  eraMap,
}: {
  data: TeamHandbookData;
  eraMap: Record<string, { slug: string; name: string; color: string }>;
}) {
  return (
    <>
      {/* Founding */}
      {data.founding_event && (
        <section className="mb-6">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            <span className="font-bold">Founded:</span>{" "}
            <span
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                color: "var(--accent-blue)",
              }}
            >
              {data.founding_event}
            </span>
          </p>
        </section>
      )}

      {/* Headquarters */}
      {data.headquarters.length > 0 && (
        <section className="mb-6">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            <span className="font-bold">Headquarters:</span>{" "}
            {data.headquarters.join(", ")}
          </p>
        </section>
      )}

      {/* Roster by Era */}
      {data.roster_by_era.length > 0 && (
        <section className="mb-10">
          <SectionHeader icon={BookMarked} title="Roster by Era" />
          <RosterTable rosters={data.roster_by_era} eraMap={eraMap} />
        </section>
      )}
    </>
  );
}

function ArtifactSection({
  data,
  eraMap,
  handbookMap,
}: {
  data: ArtifactHandbookData;
  eraMap: Record<string, { slug: string; name: string; color: string }>;
  handbookMap: Record<string, { slug: string; name: string }>;
}) {
  return (
    <>
      <section className="mb-6">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          <span className="font-bold">Type:</span>{" "}
          <span className="capitalize">{data.artifact_type}</span>
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          <span className="font-bold">Power:</span> {data.power_description}
        </p>
      </section>

      {data.possession_history.length > 0 && (
        <section className="mb-10">
          <SectionHeader icon={Clock} title="Possession History" />
          <PossessionTimeline
            history={data.possession_history}
            eraMap={eraMap}
            handbookMap={handbookMap}
          />
        </section>
      )}
    </>
  );
}

function LocationSection({
  data,
  eraMap,
}: {
  data: LocationHandbookData;
  eraMap: Record<string, { slug: string; name: string; color: string }>;
}) {
  return (
    <>
      <section className="mb-6">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          <span className="font-bold">Type:</span>{" "}
          <span className="capitalize">{data.location_type}</span>
        </p>
        {data.notable_residents.length > 0 && (
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            <span className="font-bold">Notable Residents:</span>{" "}
            {data.notable_residents.join(", ")}
          </p>
        )}
      </section>

      {data.significance_by_era.length > 0 && (
        <section className="mb-10">
          <SectionHeader icon={Clock} title="Significance by Era" />
          <div className="space-y-3">
            {data.significance_by_era.map((s, i) => {
              const era = eraMap[s.era_slug];
              return (
                <div
                  key={`${s.era_slug}-${i}`}
                  className="rounded-lg border p-3"
                  style={{
                    background: "var(--bg-secondary)",
                    borderColor: "var(--border-default)",
                    borderLeft: `3px solid ${era?.color || "var(--border-default)"}`,
                  }}
                >
                  <p className="text-xs font-bold mb-1" style={{ color: era?.color }}>
                    {era?.name || s.era_slug}
                  </p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {s.significance}
                  </p>
                  {s.citation && (
                    <p
                      className="text-xs mt-1"
                      style={{
                        color: "var(--text-tertiary)",
                        fontFamily: "var(--font-geist-mono), monospace",
                      }}
                    >
                      {s.citation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

function SpeciesSection({
  data,
  eraMap,
}: {
  data: SpeciesHandbookData;
  eraMap: Record<string, { slug: string; name: string; color: string }>;
}) {
  return (
    <>
      <section className="mb-6">
        <div className="flex flex-wrap gap-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          <p>
            <span className="font-bold">Type:</span>{" "}
            <span className="capitalize">{data.species_type}</span>
          </p>
          <p>
            <span className="font-bold">Homeworld:</span> {data.homeworld}
          </p>
        </div>
        {data.notable_members.length > 0 && (
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            <span className="font-bold">Notable Members:</span>{" "}
            {data.notable_members.join(", ")}
          </p>
        )}
      </section>

      {data.canon_evolution.length > 0 && (
        <section className="mb-10">
          <SectionHeader icon={Clock} title="Canon Evolution" />
          <div className="space-y-3">
            {data.canon_evolution.map((ce, i) => {
              const era = eraMap[ce.era_slug];
              return (
                <div
                  key={i}
                  className="rounded-lg border p-3"
                  style={{
                    background: "var(--bg-secondary)",
                    borderColor: "var(--border-default)",
                    borderLeft: `3px solid ${era?.color || "var(--border-default)"}`,
                  }}
                >
                  <p className="text-xs font-bold mb-1" style={{ color: era?.color }}>
                    {era?.name || ce.era_slug}
                  </p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {ce.change}
                  </p>
                  {ce.citation && (
                    <p
                      className="text-xs mt-1"
                      style={{
                        color: "var(--text-tertiary)",
                        fontFamily: "var(--font-geist-mono), monospace",
                      }}
                    >
                      {ce.citation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

function EditorialConceptSection({ data }: { data: EditorialConceptData }) {
  return (
    <>
      <section className="mb-6">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          <span className="font-bold">Type:</span>{" "}
          <span className="capitalize">{data.concept_type.replace(/_/g, " ")}</span>
        </p>
        {data.applies_to.length > 0 && (
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            <span className="font-bold">Applies to:</span>{" "}
            {data.applies_to.join(", ")}
          </p>
        )}
      </section>

      {data.examples.length > 0 && (
        <section className="mb-10">
          <SectionHeader icon={BookOpen} title="Examples" />
          <div className="space-y-3">
            {data.examples.map((ex, i) => (
              <div
                key={i}
                className="rounded-lg border p-3"
                style={{
                  background: "var(--bg-secondary)",
                  borderColor: "var(--border-default)",
                }}
              >
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {ex.description}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                >
                  {ex.citation}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
