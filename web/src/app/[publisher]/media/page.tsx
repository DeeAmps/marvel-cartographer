import { notFound } from "next/navigation";
import { getMCUContent } from "@/lib/data";
import { isValidPublisher, type Publisher } from "@/lib/types";
import { getPublisherConfig } from "@/lib/publisher-config";
import MediaContentCard from "@/components/media/MediaContentCard";
import { Film, Tv, Sparkles } from "lucide-react";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) return { title: "Not Found" };
  const config = getPublisherConfig(publisherParam as Publisher);
  return {
    title: `${config.mediaFeatureName} — The Comic Cartographer`,
    description: `Discover which comics inspired every ${config.mediaFeatureAbbrev} movie, series, and special. See faithfulness scores and read the original source material.`,
  };
}

export default async function MediaPage({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;
  const config = getPublisherConfig(publisher);
  const content = await getMCUContent(publisher);

  const movies = content.filter((c) => c.content_type === "movie");
  const series = content.filter((c) => c.content_type === "series");
  const specials = content.filter((c) => c.content_type === "special");

  // Group movies by phase
  const phases = new Map<number, typeof movies>();
  for (const m of movies) {
    const phase = m.phase || 1;
    if (!phases.has(phase)) phases.set(phase, []);
    phases.get(phase)!.push(m);
  }

  const sagaNames: Record<number, string> = {
    1: "Infinity Saga",
    2: "Infinity Saga",
    3: "Infinity Saga",
    4: "Multiverse Saga",
    5: "Multiverse Saga",
    6: "New World Saga",
  };

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center py-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Film size={24} style={{ color: "var(--accent-red)" }} />
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            {config.mediaFeatureName}
          </h1>
        </div>
        <p className="text-sm max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
          Every {config.mediaFeatureAbbrev} movie and series mapped to its comic book source material.
          See how faithful each adaptation is and read the original stories.
        </p>
        <div
          className="flex justify-center gap-6 mt-6 text-center"
          style={{ fontFamily: "var(--font-geist-mono), monospace" }}
        >
          <div>
            <div className="text-xl font-bold" style={{ color: "var(--accent-red)" }}>{movies.length}</div>
            <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>Movies</div>
          </div>
          <div>
            <div className="text-xl font-bold" style={{ color: "var(--accent-blue)" }}>{series.length}</div>
            <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>Series</div>
          </div>
          <div>
            <div className="text-xl font-bold" style={{ color: "var(--accent-purple)" }}>{specials.length}</div>
            <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>Specials</div>
          </div>
        </div>
      </section>

      {/* Movies by Phase */}
      {Array.from(phases.entries())
        .sort(([a], [b]) => a - b)
        .map(([phase, phaseMovies]) => (
          <section key={phase}>
            <div className="flex items-baseline gap-3 mb-6">
              <h2
                className="text-xl sm:text-2xl font-bold tracking-tight"
                style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
              >
                Phase {phase}
              </h2>
              <span className="text-xs font-bold" style={{ color: "var(--accent-red)" }}>
                {sagaNames[phase] || ""}
              </span>
              <span
                className="text-xs"
                style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
              >
                {phaseMovies.length} films
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {phaseMovies.map((m) => (
                <MediaContentCard key={m.slug} content={m} />
              ))}
            </div>
          </section>
        ))}

      {/* Series */}
      {series.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Tv size={20} style={{ color: "var(--accent-blue)" }} />
            <h2
              className="text-xl sm:text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
            >
              Disney+ Series
            </h2>
            <span
              className="text-xs"
              style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
            >
              {series.length} shows
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {series.map((s) => (
              <MediaContentCard key={s.slug} content={s} />
            ))}
          </div>
        </section>
      )}

      {/* Specials */}
      {specials.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Sparkles size={20} style={{ color: "var(--accent-purple)" }} />
            <h2
              className="text-xl sm:text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
            >
              Specials
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {specials.map((s) => (
              <MediaContentCard key={s.slug} content={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
