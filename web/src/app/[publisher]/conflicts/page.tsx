import { notFound } from "next/navigation";
import Link from "next/link";
import { getConflicts, getHandbookEntries } from "@/lib/data";
import { isValidPublisher, type Publisher } from "@/lib/types";
import ConfidenceScore from "@/components/ui/ConfidenceScore";
import HandbookTypeBadge from "@/components/handbook/HandbookTypeBadge";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) return { title: "Not Found" };
  return {
    title: "Continuity Conflicts",
    description: "Explore Marvel's biggest continuity conflicts with three interpretations: Official, Fan, and Editorial.",
  };
}

export default async function ConflictsPage({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;
  const [conflicts, handbookEntries] = await Promise.all([
    getConflicts(publisher),
    getHandbookEntries(publisher),
  ]);

  // Build a map from conflict slug to related handbook entries
  const conflictHandbookMap = new Map<string, typeof handbookEntries>();
  for (const entry of handbookEntries) {
    for (const conflictSlug of entry.related_conflict_slugs) {
      if (!conflictHandbookMap.has(conflictSlug)) {
        conflictHandbookMap.set(conflictSlug, []);
      }
      conflictHandbookMap.get(conflictSlug)!.push(entry);
    }
  }

  return (
    <div>
      <h1
        className="text-2xl sm:text-3xl font-bold tracking-tight mb-2"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        Continuity Conflicts
      </h1>
      <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
        Marvel&apos;s canon is messy. These are the biggest unresolved debates, presented with three
        interpretations: Official, Fan, and Editorial.
      </p>

      <div className="space-y-8">
        {conflicts.map((conflict) => (
          <div
            key={conflict.slug}
            className="rounded-lg border overflow-hidden"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
          >
            {/* Header */}
            <div className="p-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  className="text-xl font-bold tracking-tight"
                  style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
                >
                  {conflict.title}
                </h2>
                {conflict.description && (
                  <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    {conflict.description}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0 flex flex-col items-center">
                <ConfidenceScore score={conflict.confidence} />
                <span
                  className="text-xs mt-1"
                  style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
                >
                  certainty
                </span>
              </div>
            </div>

            {/* Three interpretations */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: "var(--border-default)", borderTopWidth: "1px" }}>
              {/* Official */}
              <div className="p-4" style={{ borderColor: "var(--border-default)" }}>
                <h3
                  className="text-xs font-bold uppercase mb-2 flex items-center gap-1.5"
                  style={{ color: "var(--accent-red)" }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent-red)" }} />
                  Official Stance
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {conflict.official_stance}
                </p>
              </div>

              {/* Fan */}
              <div className="p-4" style={{ borderColor: "var(--border-default)" }}>
                <h3
                  className="text-xs font-bold uppercase mb-2 flex items-center gap-1.5"
                  style={{ color: "var(--accent-gold)" }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent-gold)" }} />
                  Fan Interpretation
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {conflict.fan_interpretation}
                </p>
              </div>

              {/* Editorial */}
              <div className="p-4" style={{ borderColor: "var(--border-default)" }}>
                <h3
                  className="text-xs font-bold uppercase mb-2 flex items-center gap-1.5"
                  style={{ color: "var(--accent-blue)" }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent-blue)" }} />
                  Editorial Context
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {conflict.editorial_context}
                </p>
              </div>
            </div>

            {/* Citations */}
            {conflict.source_citations && conflict.source_citations.length > 0 && (
              <div className="px-5 py-3" style={{ background: "var(--bg-tertiary)" }}>
                <span className="text-xs font-bold uppercase" style={{ color: "var(--text-tertiary)" }}>
                  Sources:
                </span>{" "}
                <span
                  className="text-xs"
                  style={{ color: "var(--text-secondary)", fontFamily: "var(--font-geist-mono), monospace" }}
                >
                  {conflict.source_citations.join(", ")}
                </span>
              </div>
            )}

            {/* Related Handbook Entries */}
            {conflictHandbookMap.has(conflict.slug) && (
              <div className="px-5 py-3 flex flex-wrap items-center gap-2" style={{ borderTop: "1px solid var(--border-default)" }}>
                <span className="text-xs font-bold uppercase" style={{ color: "var(--accent-purple)" }}>
                  Related:
                </span>
                {conflictHandbookMap.get(conflict.slug)!.map((entry) => (
                  <Link
                    key={entry.slug}
                    href={`/${publisher}/handbook/${entry.slug}`}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold transition-colors hover:bg-[var(--bg-tertiary)]"
                    style={{ color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}
                  >
                    <HandbookTypeBadge type={entry.entry_type} />
                    {entry.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
