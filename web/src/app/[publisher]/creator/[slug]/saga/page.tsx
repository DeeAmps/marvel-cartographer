import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCreatorBySlug,
  getCreators,
  getEditionsByCreator,
  getConnections,
  getEras,
} from "@/lib/data";
import { isValidPublisher, type Publisher } from "@/lib/types";
import StatusBadge from "@/components/ui/StatusBadge";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import { ArrowLeft, GitBranch, ArrowRight } from "lucide-react";

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
    title: `${creator.name} — Connected Saga`,
    description: `Follow ${creator.name}'s complete Marvel saga in the order the stories connect, not just publication order.`,
  };
}

export default async function CreatorSagaPage({
  params,
}: {
  params: Promise<{ publisher: string; slug: string }>;
}) {
  const { publisher: publisherParam, slug } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;
  const creator = await getCreatorBySlug(slug);
  if (!creator) notFound();

  const [editions, connections, eras] = await Promise.all([
    getEditionsByCreator(slug, publisher),
    getConnections(publisher),
    getEras(publisher),
  ]);

  const eraMap = new Map(eras.map((e) => [e.slug, e]));

  // Build the sub-graph of connections between this creator's editions
  const editionSlugs = new Set(editions.map((e) => e.slug));
  const sagaConnections = connections.filter(
    (c) =>
      c.source_type === "edition" &&
      c.target_type === "edition" &&
      editionSlugs.has(c.source_slug) &&
      editionSlugs.has(c.target_slug)
  );

  // Topological sort using Kahn's algorithm
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();
  for (const slug of editionSlugs) {
    inDegree.set(slug, 0);
    adjList.set(slug, []);
  }
  for (const conn of sagaConnections) {
    adjList.get(conn.source_slug)?.push(conn.target_slug);
    inDegree.set(conn.target_slug, (inDegree.get(conn.target_slug) || 0) + 1);
  }

  const queue: string[] = [];
  for (const [slug, degree] of inDegree) {
    if (degree === 0) queue.push(slug);
  }

  const orderedSlugs: string[] = [];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    orderedSlugs.push(current);
    for (const next of adjList.get(current) || []) {
      inDegree.set(next, (inDegree.get(next) || 0) - 1);
      if (inDegree.get(next) === 0) queue.push(next);
    }
  }

  // Add any unvisited editions at the end
  for (const slug of editionSlugs) {
    if (!visited.has(slug)) orderedSlugs.push(slug);
  }

  const editionMap = new Map(editions.map((e) => [e.slug, e]));
  const orderedEditions = orderedSlugs
    .map((s) => editionMap.get(s))
    .filter(Boolean) as typeof editions;

  // Build connection map for showing arrows between editions
  const connectionMap = new Map<string, { target: string; type: string; strength: number }[]>();
  for (const conn of sagaConnections) {
    if (!connectionMap.has(conn.source_slug)) {
      connectionMap.set(conn.source_slug, []);
    }
    connectionMap.get(conn.source_slug)!.push({
      target: conn.target_slug,
      type: conn.connection_type,
      strength: conn.strength,
    });
  }

  const connectionTypeLabels: Record<string, string> = {
    leads_to: "continues in",
    spin_off: "spins off into",
    recommended_after: "read before",
    ties_into: "ties into",
    prerequisite: "prerequisite for",
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href={`/${publisher}/creator/${slug}`}
        className="inline-flex items-center gap-1 text-sm mb-6 transition-colors hover:text-[var(--accent-red)]"
        style={{ color: "var(--text-tertiary)" }}
      >
        <ArrowLeft size={14} />
        Back to {creator.name}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch size={20} style={{ color: "var(--accent-red)" }} />
          <span
            className="text-xs uppercase tracking-widest"
            style={{ color: "var(--accent-red)" }}
          >
            Creator Saga
          </span>
        </div>
        <h1
          className="text-3xl font-bold tracking-tight mb-2"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          {creator.name}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {orderedEditions.length} editions connected by story threads — ordered
          by how the narrative flows, not publication date.
        </p>
        {sagaConnections.length > 0 && (
          <p
            className="text-xs mt-1"
            style={{
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {sagaConnections.length} story connections found between editions
          </p>
        )}
      </div>

      {/* Connected saga list */}
      <div className="space-y-2">
        {orderedEditions.map((edition, idx) => {
          const era = eraMap.get(edition.era_slug || edition.era_id);
          const outgoing = connectionMap.get(edition.slug) || [];

          return (
            <div key={edition.slug}>
              {/* Edition card */}
              <Link href={`/${publisher}/edition/${edition.slug}`} className="group block">
                <div
                  className="rounded-lg border p-4 transition-all hover:border-[var(--accent-red)] hover:shadow-lg hover:shadow-[var(--accent-red)]/5"
                  style={{
                    background: "var(--bg-secondary)",
                    borderColor: "var(--border-default)",
                    borderLeft: `3px solid ${era?.color || "var(--border-default)"}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs font-mono px-1.5 py-0.5 rounded"
                          style={{
                            background: "var(--bg-tertiary)",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          #{idx + 1}
                        </span>
                        {era && (
                          <span
                            className="text-xs"
                            style={{ color: era.color }}
                          >
                            {era.name}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold group-hover:text-[var(--accent-red)] transition-colors">
                        {edition.title}
                      </h3>
                      <p
                        className="text-xs mt-0.5 truncate"
                        style={{
                          color: "var(--text-tertiary)",
                          fontFamily: "var(--font-geist-mono), monospace",
                        }}
                      >
                        {edition.issues_collected}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <ImportanceBadge level={edition.importance} />
                      <StatusBadge status={edition.print_status} />
                    </div>
                  </div>
                </div>
              </Link>

              {/* Connection arrows */}
              {outgoing.length > 0 && idx < orderedEditions.length - 1 && (
                <div className="ml-6 my-1 space-y-0.5">
                  {outgoing.slice(0, 2).map((conn, cIdx) => {
                    const targetEdition = editionMap.get(conn.target);
                    return (
                      <div
                        key={cIdx}
                        className="flex items-center gap-1.5 text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        <ArrowRight size={10} />
                        <span>
                          {connectionTypeLabels[conn.type] || conn.type.replace(/_/g, " ")}{" "}
                          <span style={{ color: "var(--text-secondary)" }}>
                            {targetEdition?.title || conn.target}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Link to full bibliography */}
      <div className="mt-8 text-center">
        <Link
          href={`/${publisher}/creator/${slug}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all hover:shadow-lg"
          style={{
            background: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-default)",
          }}
        >
          View Full Bibliography
        </Link>
      </div>
    </div>
  );
}
