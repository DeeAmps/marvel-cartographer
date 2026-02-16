import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCreatorBySlug,
  getCreators,
  getEditionsByCreator,
  getEras,
  getAllEditionCreators,
  getCreatorDNAData,
} from "@/lib/data";
import { isValidPublisher, type Publisher } from "@/lib/types";
import EditionCard from "@/components/editions/EditionCard";
import CreatorDNAPanel from "@/components/creators/CreatorDNA";
import { computeCreatorDNA } from "@/lib/creator-analytics";
import { ArrowLeft, Star, GitBranch } from "lucide-react";

export const revalidate = 3600;

export async function generateStaticParams() {
  const creators = await getCreators();
  return creators.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publisher: string; slug: string }>;
}) {
  const { publisher: publisherParam, slug } = await params;
  if (!isValidPublisher(publisherParam)) return { title: "Not Found" };
  const creator = await getCreatorBySlug(slug);
  if (!creator) return { title: "Not Found" };
  return {
    title: creator.name,
    description: creator.bio.slice(0, 160),
  };
}

const roleColors: Record<string, string> = {
  writer: "var(--accent-gold)",
  artist: "var(--accent-blue)",
  editor: "var(--accent-purple)",
};

export default async function CreatorDetailPage({
  params,
}: {
  params: Promise<{ publisher: string; slug: string }>;
}) {
  const { publisher: publisherParam, slug } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;
  const creator = await getCreatorBySlug(slug);
  if (!creator) notFound();

  const [editions, eras, dnaData] = await Promise.all([
    getEditionsByCreator(slug, publisher),
    getEras(publisher),
    getCreatorDNAData(slug, publisher),
  ]);

  const eraMap = new Map(eras.map((e) => [e.slug, e]));

  // Compute Creator DNA analytics
  const creatorDNA = computeCreatorDNA(
    editions,
    dnaData.allEditionCreators,
    dnaData.creators,
    eras,
    creator.id
  );

  // Signature runs: essential editions by this creator
  const signatureRuns = editions.filter((e) => e.importance === "essential");

  // Group editions by era
  const editionsByEra: Record<string, typeof editions> = {};
  for (const edition of editions) {
    const eraSlug = edition.era_slug || edition.era_id || "unknown";
    if (!editionsByEra[eraSlug]) editionsByEra[eraSlug] = [];
    editionsByEra[eraSlug].push(edition);
  }

  // Sort eras by number
  const sortedEras = Object.keys(editionsByEra).sort((a, b) => {
    const eraA = eraMap.get(a);
    const eraB = eraMap.get(b);
    return (eraA?.number ?? 99) - (eraB?.number ?? 99);
  });

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href={`/${publisher}/creators`}
        className="inline-flex items-center gap-1 text-sm mb-6 transition-colors hover:text-[var(--accent-red)]"
        style={{ color: "var(--text-tertiary)" }}
      >
        <ArrowLeft size={14} />
        Back to Creators
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-tight mb-2"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          {creator.name}
        </h1>

        <div className="flex flex-wrap gap-2 mb-3">
          {creator.roles.map((role) => (
            <span
              key={role}
              className="px-2 py-0.5 rounded text-xs font-bold"
              style={{
                color: roleColors[role] || "var(--text-secondary)",
                border: `1px solid ${roleColors[role] || "var(--text-tertiary)"}`,
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              {role.toUpperCase()}
            </span>
          ))}
        </div>

        {creator.active_years && (
          <p
            className="text-sm mb-3"
            style={{
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            Active: {creator.active_years}
          </p>
        )}
      </div>

      {/* Bio */}
      <section
        className="rounded-lg border p-6 mb-8"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
        }}
      >
        <h2
          className="text-lg font-bold tracking-tight mb-3"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          Biography
        </h2>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {creator.bio}
        </p>
      </section>

      {/* Creator DNA Analytics */}
      <CreatorDNAPanel dna={creatorDNA} creatorName={creator.name} />

      {/* Signature Runs */}
      {signatureRuns.length > 0 && (
        <section className="mb-8">
          <h2
            className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2"
            style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "var(--accent-gold)" }}
          >
            <Star size={18} />
            Signature Runs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {signatureRuns.map((edition) => (
              <EditionCard key={edition.slug} edition={edition} />
            ))}
          </div>
        </section>
      )}

      {/* Connected Saga Link */}
      {editions.length >= 2 && (
        <Link
          href={`/${publisher}/creator/${slug}/saga`}
          className="flex items-center gap-3 rounded-lg border p-4 mb-8 transition-all hover:border-[var(--accent-red)] hover:shadow-lg hover:shadow-[var(--accent-red)]/5"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <GitBranch size={20} style={{ color: "var(--accent-red)" }} />
          <div className="flex-1">
            <h3 className="text-sm font-bold">Connected Saga</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              Follow {creator.name}&apos;s editions in story order, not publication order.
            </p>
          </div>
          <ArrowLeft size={16} style={{ color: "var(--text-tertiary)", transform: "rotate(180deg)" }} />
        </Link>
      )}

      {/* Bibliography grouped by era */}
      {editions.length > 0 && (
        <section>
          <h2
            className="text-lg font-bold tracking-tight mb-4"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            Full Bibliography ({editions.length} Editions)
          </h2>

          <div className="space-y-6">
            {sortedEras.map((eraSlug) => {
              const era = eraMap.get(eraSlug);
              const eraEditions = editionsByEra[eraSlug];
              return (
                <div key={eraSlug}>
                  <h3
                    className="text-sm font-bold mb-3 flex items-center gap-2"
                    style={{ color: era?.color || "var(--text-secondary)" }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: era?.color || "var(--text-tertiary)",
                      }}
                    />
                    {era?.name || eraSlug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    <span
                      className="text-xs"
                      style={{
                        color: "var(--text-tertiary)",
                        fontFamily: "var(--font-geist-mono), monospace",
                      }}
                    >
                      ({eraEditions.length})
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {eraEditions.map((edition) => (
                      <EditionCard key={edition.slug} edition={edition} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
