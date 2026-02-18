import { notFound } from "next/navigation";
import Link from "next/link";
import CoverImage from "@/components/ui/CoverImage";
import {
  getEditionBySlug,
  getConnectionsForEdition,
  getMultiHopConnections,
  getCharacters,
  getStoryArcsByEdition,
  getRetailers,
  getEditionIssueMap,
  getHandbookEntriesForEdition,
  getEras,
  getPrerequisites,
  getMCUMappingsForEdition,
} from "@/lib/data";
import StatusBadge from "@/components/ui/StatusBadge";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import WhatsNextMap from "@/components/editions/WhatsNextMap";
import CollectionButton from "@/components/collection/CollectionButton";
import CollectionOverlapAlert from "@/components/collection/CollectionOverlapAlert";
import OverlapDetector from "@/components/overlap/OverlapDetector";
import PriceHistory from "@/components/purchase/PriceHistory";
import HandbookIntelligenceSection from "@/components/handbook/HandbookIntelligenceSection";
import RatingSection from "@/components/ratings/RatingSection";
import PrerequisiteCheck from "@/components/context/PrerequisiteCheck";
import PrerequisiteCollectionStatus from "@/components/context/PrerequisiteCollectionStatus";
import WatcherVerdict from "@/components/watcher/WatcherVerdict";
import { ArrowLeft, Users, Layers, ShoppingCart, Sparkles, Lightbulb, Film } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const edition = await getEditionBySlug(slug);
  if (!edition) return { title: "Not Found" };
  return {
    title: edition.title,
    description: edition.synopsis.slice(0, 160),
  };
}

export default async function EditionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const edition = await getEditionBySlug(slug);
  if (!edition) notFound();

  const [{ outgoing, incoming }, graphData, allCharacters, storyArcs, retailers, editionIssueMap, handbookEntries, eras, prerequisites, mcuMappings] = await Promise.all([
    getConnectionsForEdition(slug),
    getMultiHopConnections(slug, 3),
    getCharacters(),
    getStoryArcsByEdition(slug),
    getRetailers(),
    getEditionIssueMap(),
    getHandbookEntriesForEdition(slug),
    getEras(),
    getPrerequisites(slug),
    getMCUMappingsForEdition(edition.id),
  ]);

  const eraNameMap = new Map(eras.map((e) => [e.slug, e.name]));

  const formatLabel = edition.format.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  // Find characters that appear in this edition
  // Only match against synopsis (describes what happens in the book).
  // Exclude connection_notes which references other book *titles* like "Daredevil", "Punisher"
  // that would cause false character matches.
  const editionText = `${edition.title} ${edition.synopsis}`.toLowerCase();
  const featuredCharacters = allCharacters.filter((c) => {
    const terms = [c.name.toLowerCase(), ...c.aliases.map((a) => a.toLowerCase())];
    // Require whole-word match to avoid partial matches (e.g., "man" inside "Human")
    return terms.some((term) => {
      if (term.length < 4) return false; // Skip very short names/aliases
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      return regex.test(editionText);
    });
  });

  // Similar editions (same era, same importance, excluding this one)
  const allEditions = await getEditions();
  const similarEditions = allEditions
    .filter(
      (e) =>
        e.slug !== slug &&
        e.era_slug === edition.era_slug &&
        e.importance === edition.importance
    )
    .slice(0, 4);

  // Extract "Did You Know?" fun facts from synopsis
  const funFactKeywords = [
    "first appearance",
    "first appears",
    "debut",
    "origin",
    "death",
    "dies",
    "returns",
    "retcon",
    "introduced",
    "created",
    "most important",
    "landmark",
    "classic",
    "iconic",
    "redefines",
    "reinvents",
    "paradigm shift",
  ];
  const synopsisSentences = edition.synopsis
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 0);
  const funFacts = synopsisSentences.filter((sentence) => {
    const lower = sentence.toLowerCase();
    return funFactKeywords.some((kw) => lower.includes(kw));
  });

  const outgoingNodes = outgoing.map((c) => ({
    slug: c.target_slug,
    title: c.target_title,
    importance: c.target_importance,
    status: c.target_status,
    issues: c.target_issues,
    connectionType: c.connection_type,
    strength: c.strength,
    confidence: c.confidence,
    description: c.description,
    direction: "outgoing" as const,
  }));

  const incomingNodes = incoming.map((c) => ({
    slug: c.source_slug,
    title: c.source_title,
    importance: c.source_importance,
    status: c.source_status,
    issues: c.source_issues,
    connectionType: c.connection_type,
    strength: c.strength,
    confidence: c.confidence,
    description: c.description,
    direction: "incoming" as const,
  }));

  // Build ISBN search URL
  const isbnSearchUrl = edition.title
    ? `https://www.amazon.com/s?k=${encodeURIComponent(edition.title + " marvel")}`
    : null;

  return (
    <div className="max-w-4xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Book",
            name: edition.title,
            description: edition.synopsis.slice(0, 300),
            isbn: edition.isbn || undefined,
            bookFormat: "GraphicNovel",
            publisher: { "@type": "Organization", name: "Marvel Comics" },
            author: edition.creator_names?.map((name) => ({
              "@type": "Person",
              name: name.replace(/\s*\(.*?\)\s*/g, ""),
            })),
            image: edition.cover_image_url || undefined,
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "/" },
              { "@type": "ListItem", position: 2, name: "Timeline", item: "/timeline" },
              { "@type": "ListItem", position: 3, name: edition.title },
            ],
          }),
        }}
      />
      <Link
        href="/timeline"
        className="inline-flex items-center gap-1 text-sm mb-6 transition-colors hover:text-[var(--accent-red)]"
        style={{ color: "var(--text-tertiary)" }}
      >
        <ArrowLeft size={14} />
        Back to Timeline
      </Link>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Cover */}
        <div
          className="flex-shrink-0 w-full max-w-[200px] mx-auto md:mx-0 md:w-48 h-72 rounded-lg flex items-center justify-center"
          style={{ background: "var(--bg-tertiary)" }}
        >
          <CoverImage
            src={edition.cover_image_url}
            alt={edition.title}
            width={200}
            height={288}
            className="w-full h-full object-cover rounded-lg"
            priority
            format={edition.format}
          />
        </div>

        {/* Details */}
        <div className="flex-1">
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight mb-2"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            {edition.title}
          </h1>

          <p
            className="text-sm mb-3"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
          >
            {edition.issues_collected}
          </p>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <ImportanceBadge level={edition.importance} />
            <StatusBadge status={edition.print_status} />
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold"
              style={{
                color: "var(--accent-blue)",
                border: "1px solid var(--accent-blue)",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.75rem",
              }}
            >
              {formatLabel}
            </span>
            {edition.issue_count > 0 && (
              <span
                className="text-xs font-bold"
                style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
              >
                {edition.issue_count} issues
              </span>
            )}
            {edition.page_count && edition.page_count > 0 && (
              <span
                className="text-xs font-bold"
                style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
              >
                {edition.page_count} pages
              </span>
            )}
            {edition.cover_price && edition.cover_price > 0 && (
              <span
                className="text-xs font-bold"
                style={{ color: "var(--accent-green)", fontFamily: "var(--font-geist-mono), monospace" }}
              >
                ${edition.cover_price.toFixed(2)}
              </span>
            )}
            {edition.isbn && (
              <span
                className="text-xs"
                style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
              >
                ISBN: {edition.isbn}
              </span>
            )}
            <CollectionButton editionSlug={slug} />
          </div>

          {edition.creator_names && edition.creator_names.length > 0 && (
            <div className="mb-4">
              <h3
                className="text-xs font-bold uppercase mb-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                Creators
              </h3>
              <div className="flex flex-wrap gap-2">
                {edition.creator_names.map((c, i) => (
                  <span
                    key={i}
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {c}
                    {i < edition.creator_names!.length - 1 ? "," : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {edition.era_slug && (
            <div className="mb-4">
              <h3
                className="text-xs font-bold uppercase mb-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                Era
              </h3>
              <Link
                href={`/timeline#${edition.era_slug}`}
                className="text-sm transition-colors hover:text-[var(--accent-red)]"
                style={{ color: "var(--accent-blue)" }}
              >
                {eraNameMap.get(edition.era_slug) || edition.era_slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Collection Overlap Alert */}
      <div className="mt-6">
        <CollectionOverlapAlert
          editionSlug={slug}
          editionTitle={edition.title}
          issueKeys={editionIssueMap[slug] || []}
          editionIssueMap={editionIssueMap}
        />
      </div>

      {/* Reading Prerequisites */}
      {prerequisites.length > 0 && (
        <>
          <PrerequisiteCheck prerequisites={prerequisites} />
          <PrerequisiteCollectionStatus
            prerequisiteSlugs={prerequisites.map((p) => p.edition_slug)}
          />
        </>
      )}

      {/* Synopsis */}
      <section
        className="rounded-lg border p-6 mt-4"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <h2
          className="text-lg font-bold tracking-tight mb-3"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          Synopsis
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {edition.synopsis}
        </p>
      </section>

      {/* The Watcher's Verdict */}
      <WatcherVerdict
        editionSlug={slug}
        editionTitle={edition.title}
        coverPrice={edition.cover_price}
        issueCount={edition.issue_count}
      />

      {/* Community Rating */}
      <div className="mt-4">
        <RatingSection editionId={edition.id} />
      </div>

      {/* Connection Notes */}
      {edition.connection_notes && (
        <section
          className="rounded-lg border p-6 mt-4"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <h2
            className="text-lg font-bold tracking-tight mb-3"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            Connection Notes
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {edition.connection_notes}
          </p>
        </section>
      )}

      {/* Character Appearances */}
      {featuredCharacters.length > 0 && (
        <section
          className="rounded-lg border p-6 mt-4"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <h2
            className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            <Users size={18} style={{ color: "var(--accent-blue)" }} />
            Characters ({featuredCharacters.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {featuredCharacters.map((c) => (
              <Link
                key={c.slug}
                href={`/character/${c.slug}`}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all hover:border-[var(--accent-blue)]"
                style={{
                  background: "var(--bg-tertiary)",
                  borderColor: "var(--border-default)",
                  color: "var(--text-primary)",
                }}
              >
                {c.name}
                {c.aliases.length > 0 && (
                  <span style={{ color: "var(--text-tertiary)" }}> ({c.aliases[0]})</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Continuity Intelligence (Handbook) */}
      <HandbookIntelligenceSection entries={handbookEntries} />

      {/* Story Arcs */}
      {storyArcs.length > 0 && (
        <section
          className="rounded-lg border p-6 mt-4"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <h2
            className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            <Layers size={18} style={{ color: "var(--accent-purple)" }} />
            Story Arcs ({storyArcs.length})
          </h2>
          <div className="space-y-3">
            {storyArcs.map((arc) => (
              <div
                key={arc.slug}
                className="rounded-lg p-3"
                style={{ background: "var(--bg-tertiary)" }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-sm font-bold">{arc.name}</h4>
                  <span
                    className="flex-shrink-0 text-xs font-bold"
                    style={{
                      color:
                        arc.importance === "essential"
                          ? "var(--importance-essential)"
                          : arc.importance === "recommended"
                          ? "var(--importance-recommended)"
                          : "var(--importance-supplemental)",
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: "0.75rem",
                    }}
                  >
                    {arc.importance.toUpperCase()}
                  </span>
                </div>
                <p
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
                >
                  {arc.issues}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  {arc.synopsis}
                </p>
                {arc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {arc.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded text-xs"
                        style={{
                          background: "var(--bg-primary)",
                          color: "var(--text-tertiary)",
                          fontSize: "0.75rem",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Where to Buy */}
      <section
        className="rounded-lg border p-6 mt-4"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <h2
          className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          <ShoppingCart size={18} style={{ color: "var(--accent-green)" }} />
          Where to Buy
        </h2>
        {edition.print_status === "out_of_print" ? (
          <p className="text-sm mb-3" style={{ color: "var(--text-tertiary)" }}>
            This edition is currently out of print. Check eBay or Marvel Unlimited for digital access.
          </p>
        ) : (
          <p className="text-sm mb-3" style={{ color: "var(--text-tertiary)" }}>
            Available from these retailers:
          </p>
        )}
        {/* Digital options */}
        {(() => {
          const digitalRetailers = retailers.filter((r) => r.is_digital);
          return digitalRetailers.length > 0 ? (
            <div className="mb-4">
              <h3
                className="text-xs font-bold uppercase mb-2"
                style={{ color: "var(--accent-blue)" }}
              >
                Digital
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {digitalRetailers.map((r) => (
                  <a
                    key={r.slug}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border p-3 transition-all hover:border-[var(--accent-blue)] hover:shadow-lg hover:shadow-[var(--accent-blue)]/5"
                    style={{
                      background: "var(--bg-tertiary)",
                      borderColor: "var(--border-default)",
                    }}
                  >
                    <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                      {r.name}
                    </p>
                    {r.notes && (
                      <p
                        className="mt-1 line-clamp-2"
                        style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}
                      >
                        {r.notes}
                      </p>
                    )}
                  </a>
                ))}
              </div>
            </div>
          ) : null;
        })()}

        {/* Physical retailers */}
        {(() => {
          const searchQuery = encodeURIComponent(edition.title + " marvel");
          const physicalRetailers = retailers
            .filter((r) => !r.is_digital)
            .filter((r) => {
              if (edition.print_status === "out_of_print") {
                return r.slug === "ebay";
              }
              return true;
            });
          return physicalRetailers.length > 0 ? (
            <div>
              <h3
                className="text-xs font-bold uppercase mb-2"
                style={{ color: "var(--accent-green)" }}
              >
                {edition.print_status === "out_of_print" ? "Secondhand" : "Physical"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {physicalRetailers.map((r) => {
                  let href = r.url;
                  if (r.slug === "amazon" && isbnSearchUrl) {
                    href = isbnSearchUrl;
                  } else if (r.slug === "ebay") {
                    href = `https://www.ebay.com/sch/i.html?_nkw=${searchQuery}`;
                  }
                  const isHighlighted = edition.print_status === "out_of_print" && r.slug === "ebay";
                  return (
                    <a
                      key={r.slug}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border p-3 transition-all hover:border-[var(--accent-green)] hover:shadow-lg hover:shadow-[var(--accent-green)]/5"
                      style={{
                        background: isHighlighted ? "var(--bg-surface)" : "var(--bg-tertiary)",
                        borderColor: isHighlighted ? "var(--accent-gold)" : "var(--border-default)",
                      }}
                    >
                      <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                        {r.name}
                        {isHighlighted && (
                          <span style={{ color: "var(--accent-gold)", marginLeft: 4, fontSize: "0.75rem" }}>
                            BEST BET
                          </span>
                        )}
                      </p>
                      {r.notes && (
                        <p
                          className="mt-1 line-clamp-2"
                          style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}
                        >
                          {r.notes}
                        </p>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          ) : null;
        })()}
        <p
          className="text-xs mt-3"
          style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", fontFamily: "var(--font-geist-mono), monospace" }}
        >
          Prices and availability may vary. Links open in new tab.
        </p>
      </section>

      {/* Adapted in MCU */}
      {mcuMappings.length > 0 && (
        <section
          className="rounded-lg border p-6 mt-4"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <h2
            className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            <Film size={18} style={{ color: "var(--accent-red)" }} />
            Adapted in MCU ({mcuMappings.length})
          </h2>
          <div className="space-y-2">
            {mcuMappings.map((m) => {
              const typeColor =
                m.mapping_type === "direct_adaptation"
                  ? "var(--accent-red)"
                  : m.mapping_type === "loose_inspiration"
                  ? "var(--accent-gold)"
                  : "var(--accent-blue)";
              const typeLabel =
                m.mapping_type === "direct_adaptation"
                  ? "Direct Adaptation"
                  : m.mapping_type === "loose_inspiration"
                  ? "Loose Inspiration"
                  : "Character Origin";
              return (
                <Link
                  key={m.id}
                  href={`/mcu/${m.mcu_slug}`}
                  className="flex items-center gap-3 rounded-lg p-3 transition-all hover:border-[var(--accent-red)]"
                  style={{ background: "var(--bg-tertiary)" }}
                >
                  <Film size={16} style={{ color: typeColor }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold">{m.mcu_title}</span>
                    <span
                      className="ml-2 px-1.5 py-0.5 rounded text-xs font-bold"
                      style={{
                        background: `color-mix(in srgb, ${typeColor} 15%, transparent)`,
                        color: typeColor,
                        fontSize: "0.6rem",
                      }}
                    >
                      {typeLabel}
                    </span>
                  </div>
                  {m.faithfulness != null && (
                    <span
                      className="text-xs font-bold shrink-0"
                      style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.7rem" }}
                    >
                      {m.faithfulness}%
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* If you liked this... */}
      {similarEditions.length > 0 && (
        <section
          className="rounded-lg border p-6 mt-4"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <h2
            className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            <Sparkles size={18} style={{ color: "var(--accent-gold)" }} />
            If You Liked This
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {similarEditions.map((e) => (
              <Link
                key={e.slug}
                href={`/edition/${e.slug}`}
                className="rounded-lg border p-3 transition-all hover:border-[var(--accent-gold)]"
                style={{ background: "var(--bg-tertiary)", borderColor: "var(--border-default)" }}
              >
                <h4 className="text-sm font-bold">{e.title}</h4>
                <p
                  className="text-xs mt-0.5 truncate"
                  style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
                >
                  {e.issues_collected}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Did You Know? */}
      {funFacts.length > 0 && (
        <section
          className="rounded-lg border p-6 mt-4"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <h2
            className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            <Lightbulb size={18} style={{ color: "var(--accent-gold)" }} />
            Did You Know?
          </h2>
          <ul className="space-y-2">
            {funFacts.map((fact, i) => (
              <li
                key={i}
                className="text-sm leading-relaxed flex items-start gap-2"
                style={{ color: "var(--text-secondary)" }}
              >
                <span
                  className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--accent-gold)" }}
                />
                {fact}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Issue Overlap Detection */}
      <div className="mt-4">
        <OverlapDetector
          editionSlug={slug}
          editionTitle={edition.title}
          relatedSlugs={[
            ...outgoingNodes.map((n) => n.slug),
            ...incomingNodes.map((n) => n.slug),
          ]}
        />
      </div>

      {/* Print Status History */}
      <div className="mt-4">
        <PriceHistory editionSlug={slug} />
      </div>

      {/* What's Next - The Killer Feature */}
      {(outgoingNodes.length > 0 || incomingNodes.length > 0) && (
        <section
          className="rounded-lg border p-6 mt-4"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
        >
          <h2
            className="text-lg font-bold tracking-tight mb-4"
            style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "var(--accent-gold)" }}
          >
            Connections
          </h2>
          <WhatsNextMap
            currentSlug={slug}
            currentTitle={edition.title}
            outgoing={outgoingNodes}
            incoming={incomingNodes}
            graphData={graphData}
          />
        </section>
      )}
    </div>
  );
}
