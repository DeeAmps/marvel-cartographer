import { notFound } from "next/navigation";
import Link from "next/link";
import type { InfinityTheme } from "@/lib/types";
import { INFINITY_THEME_META, isValidPublisher, type Publisher } from "@/lib/types";
import { getEditionsWithThemes } from "@/lib/data";
import { getPublisherConfig } from "@/lib/publisher-config";
import ThemeIcon from "@/components/themes/ThemeIcon";
import { Gem } from "lucide-react";

export const revalidate = 3600;

const ALL_THEMES: InfinityTheme[] = ["power", "space", "time", "reality", "soul", "mind"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) return { title: "Not Found" };
  const config = getPublisherConfig(publisherParam as Publisher);
  return {
    title: `${config.thematicTrackerName} Thematic Tracker — The Comic Cartographer`,
    description: "Explore Marvel Comics through six thematic lenses: Power, Space, Time, Reality, Soul, and Mind.",
  };
}

export default async function ThemesPage({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;
  const config = getPublisherConfig(publisher);

  const editions = await getEditionsWithThemes(publisher);

  const counts = new Map<InfinityTheme, number>();
  for (const theme of ALL_THEMES) {
    counts.set(theme, editions.filter((e) => e.infinity_themes.includes(theme)).length);
  }

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center py-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Gem size={24} style={{ color: "var(--accent-purple)" }} />
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            {config.thematicTrackerName}
          </h1>
        </div>
        <p className="text-sm max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
          Explore the Marvel Universe through six thematic lenses.
          Every collected edition tagged by the themes that define it.
        </p>
      </section>

      {/* Theme Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {ALL_THEMES.map((theme) => {
          const meta = INFINITY_THEME_META[theme];
          const count = counts.get(theme) || 0;
          return (
            <Link key={theme} href={`/${publisher}/themes/${theme}`} className="group">
              <div
                className="rounded-2xl border p-6 transition-all hover:shadow-xl hover:-translate-y-1 h-full relative overflow-hidden"
                style={{
                  background: "var(--bg-secondary)",
                  borderColor: `color-mix(in srgb, ${meta.color} 25%, var(--border-default))`,
                }}
              >
                {/* Glow background */}
                <div
                  className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-15 group-hover:opacity-30 transition-opacity pointer-events-none"
                  style={{ background: meta.color }}
                />

                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <ThemeIcon theme={theme} size={40} glow />
                    <div>
                      <h2
                        className="text-xl font-bold tracking-tight"
                        style={{ fontFamily: "var(--font-bricolage), sans-serif", color: meta.color }}
                      >
                        {meta.label} Stone
                      </h2>
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
                      >
                        {count} edition{count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {meta.description}
                  </p>

                  <div
                    className="mt-4 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: meta.color }}
                  >
                    Explore editions &rarr;
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
