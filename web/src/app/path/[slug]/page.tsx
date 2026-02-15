import { notFound } from "next/navigation";
import Link from "next/link";
import { getReadingPathBySlug, getReadingPaths } from "@/lib/data";
import StatusBadge from "@/components/ui/StatusBadge";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import PathProgress, { PathCheckbox } from "@/components/paths/PathProgress";
import PathCollectionStatus from "@/components/paths/PathCollectionStatus";
import PathEntryOwned from "@/components/paths/PathEntryOwned";
import { ArrowLeft, ChevronRight, DollarSign } from "lucide-react";

// Revalidate reading path pages every hour (ISR)
export const revalidate = 3600;

export async function generateStaticParams() {
  const paths = await getReadingPaths();
  return paths.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const path = await getReadingPathBySlug(slug);
  if (!path) return { title: "Not Found" };
  return {
    title: path.name,
    description: path.description,
  };
}

export default async function ReadingPathPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const path = await getReadingPathBySlug(slug);
  if (!path) notFound();

  const allPaths = await getReadingPaths();

  const difficultyColors: Record<string, string> = {
    beginner: "var(--accent-green)",
    intermediate: "var(--accent-gold)",
    advanced: "var(--accent-red)",
    completionist: "var(--text-tertiary)",
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/paths"
        className="inline-flex items-center gap-1 text-sm mb-6 transition-colors hover:text-[var(--accent-red)]"
        style={{ color: "var(--text-tertiary)" }}
      >
        <ArrowLeft size={14} />
        All Reading Paths
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-3xl font-bold tracking-tight mb-2"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          {path.name}
        </h1>
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
          {path.description}
        </p>
        <div className="flex flex-wrap gap-3 text-xs">
          <span
            className="px-2 py-0.5 rounded font-bold"
            style={{
              color: difficultyColors[path.difficulty] || "var(--text-tertiary)",
              border: `1px solid ${difficultyColors[path.difficulty] || "var(--text-tertiary)"}`,
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {path.difficulty.toUpperCase()}
          </span>
          <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}>
            {path.entries.length} editions
          </span>
          <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}>
            {path.path_type.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Progress tracker */}
      <PathProgress pathSlug={slug} totalEntries={path.entries.length} />

      {/* Collection progress */}
      <PathCollectionStatus
        pathSlug={slug}
        editionSlugs={path.entries.map((e) => e.edition.slug)}
      />

      {/* Purchase Plan Link */}
      <Link
        href={`/plan/${slug}`}
        className="flex items-center gap-3 rounded-lg border p-4 mb-6 transition-all hover:border-[var(--accent-gold)] hover:shadow-lg hover:shadow-[var(--accent-gold)]/5"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <DollarSign size={20} style={{ color: "var(--accent-gold)" }} />
        <div className="flex-1">
          <h3 className="text-sm font-bold">Purchase Planner</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            See what&apos;s in print, out of print, and the cheapest way to collect this path.
          </p>
        </div>
        <ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} />
      </Link>

      {/* Section quick nav (if sections exist) */}
      {path.sections && path.sections.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {path.sections.map((section, i) => (
            <a
              key={i}
              href={`#section-${i}`}
              className="px-3 py-1.5 rounded text-xs font-bold border transition-colors hover:border-[var(--accent-red)]"
              style={{
                borderColor: "var(--border-default)",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              {section.name}
            </a>
          ))}
        </div>
      )}

      {/* Reading List */}
      <div className="space-y-3">
        {path.entries.map((entry, idx) => {
          // Check if this entry starts a new section
          const sectionStart = path.sections?.find((s) => s.start_position === entry.position);
          const sectionIndex = sectionStart ? path.sections!.indexOf(sectionStart) : -1;

          return (
            <div key={entry.position}>
              {/* Section header */}
              {sectionStart && (
                <div id={`section-${sectionIndex}`} className="scroll-mt-24 pt-4 pb-2 first:pt-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{
                        background: "var(--accent-red)",
                        color: "#fff",
                        fontFamily: "var(--font-geist-mono), monospace",
                        fontSize: "0.75rem",
                      }}
                    >
                      PART {sectionIndex + 1}
                    </span>
                    <h2
                      className="text-sm font-bold tracking-tight"
                      style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
                    >
                      {sectionStart.name}
                    </h2>
                  </div>
                </div>
              )}

              <div className="flex gap-2 sm:gap-4">
                {/* Position marker / checkbox */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <PathCheckbox pathSlug={slug} position={entry.position} />
                  {idx < path.entries.length - 1 && (
                    <div className="w-px flex-1 my-1" style={{ background: "var(--border-default)" }} />
                  )}
                </div>

                {/* Edition card */}
                <Link href={`/edition/${entry.edition.slug}`} className="flex-1 group">
                  <div
                    className="rounded-lg border p-3 sm:p-4 transition-all hover:border-[var(--accent-red)] hover:shadow-lg hover:shadow-[var(--accent-red)]/5"
                    style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold group-hover:text-[var(--accent-red)] transition-colors">
                          {entry.edition.title}
                        </h3>
                        {entry.edition.issues_collected && (
                          <p
                            className="text-xs mt-0.5 leading-relaxed"
                            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
                          >
                            {entry.edition.issues_collected}
                          </p>
                        )}
                        {entry.note && (
                          <p className="text-xs mt-1 italic" style={{ color: "var(--accent-gold)" }}>
                            {entry.note}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-2">
                          <ImportanceBadge level={entry.edition.importance} />
                          <StatusBadge status={entry.edition.print_status} />
                          <PathEntryOwned editionSlug={entry.edition.slug} />
                        </div>
                      </div>
                      <ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} className="flex-shrink-0 mt-1" />
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Other paths */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            Other Reading Paths
          </h2>
          <Link
            href="/paths"
            className="text-xs transition-colors hover:text-[var(--accent-red)]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Browse all {allPaths.length} paths
          </Link>
        </div>
        <div className="flex flex-wrap gap-3">
          {allPaths
            .filter((p) => p.slug !== slug && p.category === path.category)
            .slice(0, 8)
            .map((p) => (
              <Link
                key={p.slug}
                href={`/path/${p.slug}`}
                className="px-4 py-2 rounded-lg text-sm border transition-colors hover:border-[var(--accent-red)]"
                style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
              >
                {p.name}
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
