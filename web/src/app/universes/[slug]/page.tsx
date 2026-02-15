import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getUniverses,
  getUniverseBySlug,
  getEditionsByUniverse,
} from "@/lib/data";
import { ArrowLeft, BookOpen, Globe } from "lucide-react";
import { RawCoverImage } from "@/components/ui/CoverImage";

export const revalidate = 3600;

export async function generateStaticParams() {
  const universes = await getUniverses();
  return universes.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const universe = await getUniverseBySlug(slug);
  if (!universe) return { title: "Not Found" };
  return {
    title: `${universe.name} — Earth-${universe.designation}`,
    description: universe.description.slice(0, 160),
  };
}

export default async function UniverseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [universe, editions, allUniverses] = await Promise.all([
    getUniverseBySlug(slug),
    getEditionsByUniverse(slug),
    getUniverses(),
  ]);
  if (!universe) notFound();

  const otherUniverses = allUniverses
    .filter((u) => u.slug !== slug)
    .sort((a, b) => {
      if (a.is_primary) return -1;
      if (b.is_primary) return 1;
      return a.year_start - b.year_start;
    });

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/universes"
        className="inline-flex items-center gap-1 text-sm mb-6 transition-colors hover:text-[var(--accent-red)]"
        style={{ color: "var(--text-tertiary)" }}
      >
        <ArrowLeft size={14} />
        Back to Multiverse
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ background: universe.color }}
          />
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            {universe.name}
          </h1>
          {universe.is_primary && (
            <span
              className="px-2 py-0.5 rounded text-xs font-bold"
              style={{
                background: "var(--accent-red)",
                color: "#fff",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.75rem",
              }}
            >
              PRIMARY
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span
            className="px-2.5 py-1 rounded-full text-sm font-bold"
            style={{
              color: universe.color,
              border: `1px solid ${universe.color}`,
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            Earth-{universe.designation}
          </span>
          <span
            className="text-sm"
            style={{
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {universe.year_start}–{universe.year_end || "ONGOING"}
          </span>
        </div>
      </div>

      {/* Description */}
      <section
        className="rounded-lg border p-6 mb-8"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
          borderLeft: `4px solid ${universe.color}`,
        }}
      >
        <h2
          className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          <Globe size={18} style={{ color: universe.color }} />
          About This Universe
        </h2>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {universe.description}
        </p>
      </section>

      {/* Collected Editions */}
      <section className="mb-8">
        <h2
          className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          <BookOpen size={18} style={{ color: "var(--accent-gold)" }} />
          Collected Editions ({editions.length})
        </h2>

        {editions.length > 0 ? (
          <div className="space-y-2">
            {editions.map((edition) => (
              <Link
                key={edition.slug}
                href={`/edition/${edition.slug}`}
                className="block group"
              >
                <div
                  className="rounded-lg border p-3 sm:p-4 transition-all hover:border-[var(--accent-red)] hover:shadow-lg hover:shadow-[var(--accent-red)]/5 flex items-center gap-3"
                  style={{
                    background: "var(--bg-secondary)",
                    borderColor: "var(--border-default)",
                  }}
                >
                  <RawCoverImage
                    src={edition.cover_image_url}
                    alt={edition.title}
                    width={40}
                    height={56}
                    className="object-cover rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold group-hover:text-[var(--accent-red)] transition-colors truncate">
                      {edition.title}
                    </h4>
                    <p
                      className="text-xs truncate"
                      style={{
                        color: "var(--text-tertiary)",
                        fontFamily: "var(--font-geist-mono), monospace",
                      }}
                    >
                      {edition.issues_collected}
                    </p>
                    {edition.creator_names && edition.creator_names.length > 0 && (
                      <p
                        className="text-xs truncate mt-0.5"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {edition.creator_names
                          .map((c) => c.replace(/\s*\(.*?\)/, ""))
                          .filter((v, i, a) => a.indexOf(v) === i)
                          .slice(0, 3)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span
                      className="px-1.5 py-0.5 rounded text-xs font-bold"
                      style={{
                        color:
                          edition.importance === "essential"
                            ? "var(--importance-essential)"
                            : edition.importance === "recommended"
                            ? "var(--importance-recommended)"
                            : edition.importance === "supplemental"
                            ? "var(--importance-supplemental)"
                            : "var(--importance-completionist)",
                        fontFamily: "var(--font-geist-mono), monospace",
                        fontSize: "0.7rem",
                      }}
                    >
                      {edition.importance.toUpperCase()}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-xs"
                      style={{
                        color:
                          edition.print_status === "in_print"
                            ? "var(--status-in-print)"
                            : edition.print_status === "out_of_print"
                            ? "var(--status-out-of-print)"
                            : "var(--status-upcoming)",
                        fontFamily: "var(--font-geist-mono), monospace",
                        fontSize: "0.7rem",
                      }}
                    >
                      {edition.print_status.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div
            className="rounded-lg border p-8 text-center"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-default)",
            }}
          >
            <p
              className="text-sm"
              style={{ color: "var(--text-tertiary)" }}
            >
              No collected editions catalogued for this universe yet.
              {universe.is_primary
                ? ""
                : " Most editions in our database are from the main Earth-616 continuity."}
            </p>
          </div>
        )}
      </section>

      {/* Other Universes */}
      {otherUniverses.length > 0 && (
        <section className="mb-8">
          <h2
            className="text-lg font-bold tracking-tight mb-4"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            Other Universes
          </h2>
          <div className="flex flex-wrap gap-2">
            {otherUniverses.map((u) => (
              <Link
                key={u.slug}
                href={`/universes/${u.slug}`}
                className="px-3 py-2 rounded-lg text-sm border transition-all hover:shadow-lg"
                style={{
                  background: "var(--bg-secondary)",
                  borderColor: "var(--border-default)",
                  borderLeft: `3px solid ${u.color}`,
                }}
              >
                <span
                  className="font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {u.name}
                </span>
                <span
                  className="ml-2 text-xs"
                  style={{
                    color: u.color,
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                >
                  E-{u.designation}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
