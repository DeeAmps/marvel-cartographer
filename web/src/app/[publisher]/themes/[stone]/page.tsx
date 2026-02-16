import { notFound } from "next/navigation";
import Link from "next/link";
import type { InfinityTheme } from "@/lib/types";
import { INFINITY_THEME_META, isValidPublisher, type Publisher } from "@/lib/types";
import { getEditionsByTheme } from "@/lib/data";
import EditionCard from "@/components/editions/EditionCard";
import ThemeIcon from "@/components/themes/ThemeIcon";
import { ArrowLeft } from "lucide-react";

export const revalidate = 3600;

const VALID_THEMES: InfinityTheme[] = ["power", "space", "time", "reality", "soul", "mind"];

export async function generateStaticParams() {
  return VALID_THEMES.map((stone) => ({ stone }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publisher: string; stone: string }>;
}) {
  const { publisher: publisherParam, stone } = await params;
  if (!isValidPublisher(publisherParam)) return { title: "Not Found" };
  const meta = INFINITY_THEME_META[stone as InfinityTheme];
  if (!meta) return { title: "Not Found" };
  return {
    title: `${meta.label} Stone — Infinity Themes`,
    description: `${meta.description}. All collected editions tagged with the ${meta.label} theme.`,
  };
}

export default async function StoneDetailPage({
  params,
}: {
  params: Promise<{ publisher: string; stone: string }>;
}) {
  const { publisher: publisherParam, stone } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;

  if (!VALID_THEMES.includes(stone as InfinityTheme)) notFound();

  const theme = stone as InfinityTheme;
  const meta = INFINITY_THEME_META[theme];
  const editions = await getEditionsByTheme(theme, publisher);

  // Group by era
  const byEra = new Map<string, typeof editions>();
  for (const e of editions) {
    const era = e.era_slug || "unknown";
    if (!byEra.has(era)) byEra.set(era, []);
    byEra.get(era)!.push(e);
  }

  const essentials = editions.filter((e) => e.importance === "essential");
  const recommended = editions.filter((e) => e.importance === "recommended");

  return (
    <div className="space-y-8">
      <Link
        href={`/${publisher}/themes`}
        className="inline-flex items-center gap-1 text-sm transition-colors hover:text-[var(--accent-red)]"
        style={{ color: "var(--text-tertiary)" }}
      >
        <ArrowLeft size={14} />
        All Themes
      </Link>

      {/* Header */}
      <section className="flex items-center gap-4">
        <ThemeIcon theme={theme} size={56} glow />
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-bricolage), sans-serif", color: meta.color }}
          >
            {meta.label} Stone
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {meta.description}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
          >
            {editions.length} editions &middot; {essentials.length} essential &middot; {recommended.length} recommended
          </p>
        </div>
      </section>

      {/* Edition Grid */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {editions.map((edition) => (
            <EditionCard
              key={edition.slug}
              edition={edition}
              eraColor={edition.era_color}
            />
          ))}
        </div>
      </section>

      {editions.length === 0 && (
        <div
          className="rounded-xl border p-8 text-center"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            No editions tagged with this theme yet. Theme data is being populated.
          </p>
        </div>
      )}
    </div>
  );
}
