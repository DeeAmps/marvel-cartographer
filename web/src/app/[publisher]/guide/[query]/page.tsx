import { notFound } from "next/navigation";
import { getEditions, getCharacters, getEvents, getStoryArcs } from "@/lib/data";
import { isValidPublisher, type Publisher } from "@/lib/types";
import { generateGuide } from "@/lib/guide-generator";
import GuideTierSection from "@/components/guides/GuideTierSection";
import Link from "next/link";
import { ArrowLeft, BookOpen, DollarSign, Layers, Users, Zap } from "lucide-react";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publisher: string; query: string }>;
}) {
  const { publisher: publisherParam, query } = await params;
  if (!isValidPublisher(publisherParam)) return { title: "Not Found" };
  const decoded = decodeURIComponent(query);
  return {
    title: `${decoded} Reading Guide — The Comic Cartographer`,
    description: `Auto-generated reading guide for "${decoded}". Essential, recommended, and completionist tiers.`,
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ publisher: string; query: string }>;
}) {
  const { publisher: publisherParam, query } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;

  const decoded = decodeURIComponent(query);

  const [editions, characters, events, arcs] = await Promise.all([
    getEditions(publisher),
    getCharacters(),
    getEvents(publisher),
    getStoryArcs(publisher),
  ]);

  // Build a simple character -> edition map from synopsis matching
  const editionCharacterMap = new Map<string, string[]>();
  for (const edition of editions) {
    const text = `${edition.title} ${edition.synopsis}`.toLowerCase();
    const matched: string[] = [];
    for (const c of characters) {
      const terms = [c.name.toLowerCase(), ...c.aliases.map((a) => a.toLowerCase())];
      if (terms.some((t) => t.length >= 4 && text.includes(t))) {
        matched.push(c.slug);
      }
    }
    if (matched.length > 0) {
      editionCharacterMap.set(edition.slug, matched);
    }
  }

  const guide = generateGuide({
    query: decoded,
    editions,
    characters,
    events: events.map((e) => ({ slug: e.slug, name: e.name, tags: e.tags })),
    arcs: arcs.map((a) => ({ slug: a.slug, name: a.name, tags: a.tags })),
    connections: [],
    editionCharacterMap,
  });

  const inPrintCost = [...guide.essential, ...guide.recommended]
    .filter((e) => e.print_status === "in_print" && e.cover_price)
    .reduce((sum, e) => sum + (e.cover_price || 0), 0);

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/${publisher}/search`}
        className="inline-flex items-center gap-1 text-sm mb-6 transition-colors hover:text-[var(--accent-red)]"
        style={{ color: "var(--text-tertiary)" }}
      >
        <ArrowLeft size={14} />
        Back to Search
      </Link>

      {/* Header */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={20} style={{ color: "var(--accent-gold)" }} />
          <span
            className="text-xs font-bold uppercase"
            style={{ color: "var(--accent-gold)", fontFamily: "var(--font-geist-mono), monospace" }}
          >
            Auto-Generated Guide
          </span>
        </div>
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          {guide.title}
        </h1>
        <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
          {guide.description}
        </p>
      </section>

      {/* Stats bar */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div
          className="rounded-lg border p-3 text-center"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <div className="text-lg font-bold" style={{ color: "var(--accent-red)" }}>{guide.total_editions}</div>
          <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>Editions</div>
        </div>
        <div
          className="rounded-lg border p-3 text-center"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <div className="text-lg font-bold" style={{ color: "var(--accent-gold)" }}>{guide.essential.length}</div>
          <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>Essential</div>
        </div>
        {guide.matched_characters.length > 0 && (
          <div
            className="rounded-lg border p-3 text-center"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
          >
            <div className="text-lg font-bold" style={{ color: "var(--accent-blue)" }}>{guide.matched_characters.length}</div>
            <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>Characters</div>
          </div>
        )}
        {inPrintCost > 0 && (
          <div
            className="rounded-lg border p-3 text-center"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
          >
            <div className="text-lg font-bold" style={{ color: "var(--accent-green)" }}>${Math.round(inPrintCost)}</div>
            <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>Est. Cost</div>
          </div>
        )}
      </section>

      {/* Matched context */}
      {(guide.matched_characters.length > 0 || guide.matched_events.length > 0) && (
        <section className="mb-8 flex flex-wrap gap-2">
          {guide.matched_characters.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ background: "color-mix(in srgb, var(--accent-blue) 12%, transparent)", color: "var(--accent-blue)" }}
            >
              <Users size={10} />
              {name}
            </span>
          ))}
          {guide.matched_events.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ background: "color-mix(in srgb, var(--accent-red) 12%, transparent)", color: "var(--accent-red)" }}
            >
              <Zap size={10} />
              {name}
            </span>
          ))}
        </section>
      )}

      {/* Tiers */}
      <div className="space-y-4">
        <GuideTierSection
          title="Essential"
          color="var(--importance-essential)"
          editions={guide.essential}
          defaultOpen={true}
        />
        <GuideTierSection
          title="Recommended"
          color="var(--importance-recommended)"
          editions={guide.recommended}
          defaultOpen={true}
        />
        <GuideTierSection
          title="Completionist"
          color="var(--importance-completionist)"
          editions={guide.completionist}
          defaultOpen={false}
        />
      </div>

      {guide.total_editions === 0 && (
        <div
          className="rounded-xl border p-8 text-center"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <p className="text-lg font-bold mb-2">No results found</p>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Try a different search term like a character name, event, or concept.
          </p>
          <Link
            href={`/${publisher}/search`}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: "var(--accent-red)", color: "#fff" }}
          >
            Search Editions
          </Link>
        </div>
      )}
    </div>
  );
}
