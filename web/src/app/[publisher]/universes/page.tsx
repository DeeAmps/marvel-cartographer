import { notFound } from "next/navigation";
import Link from "next/link";
import { getUniverses } from "@/lib/data";
import { isValidPublisher, type Publisher } from "@/lib/types";
import type { Universe } from "@/lib/types";
import { ChevronRight } from "lucide-react";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) return { title: "Not Found" };
  return {
    title: "Universes",
    description:
      "Explore the Marvel Multiverse — from Earth-616 to the Ultimate Universe, Marvel 2099, and beyond.",
  };
}

export default async function UniversesPage({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;

  const universes = await getUniverses(publisher);

  // Primary universe first, then sort by year_start
  const sorted = [...universes].sort((a, b) => {
    if (a.is_primary) return -1;
    if (b.is_primary) return 1;
    return a.year_start - b.year_start;
  });

  return (
    <div className="max-w-5xl mx-auto">
      <h1
        className="text-3xl font-bold tracking-tight mb-2"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        The Multiverse
      </h1>
      <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
        The Marvel Multiverse contains infinite realities. These are the ones
        that matter most — {universes.length} documented alternate universes with
        collected editions available.
      </p>

      <div className="space-y-4">
        {sorted.map((universe) => (
          <UniverseCard key={universe.slug} universe={universe} publisher={publisher} />
        ))}
      </div>
    </div>
  );
}

function UniverseCard({ universe, publisher }: { universe: Universe; publisher: Publisher }) {
  return (
    <Link href={`/${publisher}/universes/${universe.slug}`} className="block group">
      <div
        className="rounded-lg border p-5 transition-all hover:shadow-lg hover:border-[var(--accent-red)] cursor-pointer"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
          borderLeft: `4px solid ${universe.color}`,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: universe.color }}
              />
              <h2
                className="text-xl font-bold tracking-tight group-hover:text-[var(--accent-red)] transition-colors"
                style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
              >
                {universe.name}
              </h2>
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

            <div className="flex items-center gap-3 mb-3">
              <span
                className="px-2 py-0.5 rounded text-xs font-bold"
                style={{
                  color: universe.color,
                  border: `1px solid ${universe.color}`,
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "0.75rem",
                }}
              >
                Earth-{universe.designation}
              </span>
              <span
                className="text-xs"
                style={{
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {universe.year_start}–{universe.year_end || "ONGOING"}
              </span>
            </div>

            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {universe.description}
            </p>
          </div>

          <ChevronRight
            size={20}
            className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: "var(--accent-red)" }}
          />
        </div>
      </div>
    </Link>
  );
}
