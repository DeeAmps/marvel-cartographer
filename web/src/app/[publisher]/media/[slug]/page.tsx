import { notFound } from "next/navigation";
import Link from "next/link";
import { getMCUContent, getMCUContentBySlug, getMCUMappingsForContent } from "@/lib/data";
import { isValidPublisher, type Publisher } from "@/lib/types";
import { getPublisherConfig } from "@/lib/publisher-config";
import FaithfulnessBreakdown from "@/components/media/FaithfulnessBreakdown";
import ComicSourceList from "@/components/media/ComicSourceList";
import { ArrowLeft, Film, Tv, Sparkles } from "lucide-react";

export const revalidate = 3600;

export async function generateStaticParams() {
  const content = await getMCUContent();
  return content.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ publisher: string; slug: string }> }) {
  const { publisher: publisherParam, slug } = await params;
  if (!isValidPublisher(publisherParam)) return { title: "Not Found" };
  const publisher = publisherParam as Publisher;
  const config = getPublisherConfig(publisher);
  const content = await getMCUContentBySlug(slug, publisher);
  if (!content) return { title: "Not Found" };
  return {
    title: `${content.title} — ${config.mediaFeatureName}`,
    description: `Comic book sources for ${content.title}. Faithfulness score: ${content.faithfulness_score}%.`,
  };
}

export default async function MediaDetailPage({ params }: { params: Promise<{ publisher: string; slug: string }> }) {
  const { publisher: publisherParam, slug } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;
  const config = getPublisherConfig(publisher);
  const content = await getMCUContentBySlug(slug, publisher);
  if (!content) notFound();

  const mappings = await getMCUMappingsForContent(content.id, publisher);

  const typeIcon = content.content_type === "movie" ? Film : content.content_type === "series" ? Tv : Sparkles;
  const TypeIcon = typeIcon;
  const typeColor =
    content.content_type === "movie"
      ? "var(--accent-red)"
      : content.content_type === "series"
      ? "var(--accent-blue)"
      : "var(--accent-purple)";

  const directAdaptations = mappings.filter((m) => m.mapping_type === "direct_adaptation");
  const looseInspirations = mappings.filter((m) => m.mapping_type === "loose_inspiration");
  const characterOrigins = mappings.filter((m) => m.mapping_type === "character_origin");

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/${publisher}/media`}
        className="inline-flex items-center gap-1 text-sm mb-6 transition-colors hover:text-[var(--accent-red)]"
        style={{ color: "var(--text-tertiary)" }}
      >
        <ArrowLeft size={14} />
        Back to {config.mediaFeatureName}
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `color-mix(in srgb, ${typeColor} 15%, transparent)` }}
        >
          <TypeIcon size={28} style={{ color: typeColor }} />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="px-1.5 py-0.5 rounded text-xs font-bold uppercase"
              style={{
                background: `color-mix(in srgb, ${typeColor} 15%, transparent)`,
                color: typeColor,
                fontSize: "0.6rem",
              }}
            >
              {content.content_type}
            </span>
            <span
              className="text-xs"
              style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
            >
              Phase {content.phase} &middot; {content.saga}
            </span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            {content.title}
          </h1>
          {content.release_date && (
            <p
              className="text-sm mt-1"
              style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
            >
              {new Date(content.release_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </div>
      </div>

      {/* Faithfulness Score */}
      <section
        className="rounded-lg border p-6 mb-4"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <FaithfulnessBreakdown score={content.faithfulness_score} />
      </section>

      {/* Synopsis */}
      {content.synopsis && (
        <section
          className="rounded-lg border p-6 mb-4"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <h2
            className="text-lg font-bold tracking-tight mb-3"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            Synopsis
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {content.synopsis}
          </p>
        </section>
      )}

      {/* Comic Sources */}
      <section
        className="rounded-lg border p-6 mb-4"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <h2
          className="text-lg font-bold tracking-tight mb-4"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          Comic Book Sources ({mappings.length})
        </h2>

        {directAdaptations.length > 0 && (
          <div className="mb-6">
            <h3
              className="text-xs font-bold uppercase mb-3"
              style={{ color: "var(--accent-red)" }}
            >
              Direct Adaptations
            </h3>
            <ComicSourceList mappings={directAdaptations} />
          </div>
        )}

        {looseInspirations.length > 0 && (
          <div className="mb-6">
            <h3
              className="text-xs font-bold uppercase mb-3"
              style={{ color: "var(--accent-gold)" }}
            >
              Loose Inspirations
            </h3>
            <ComicSourceList mappings={looseInspirations} />
          </div>
        )}

        {characterOrigins.length > 0 && (
          <div>
            <h3
              className="text-xs font-bold uppercase mb-3"
              style={{ color: "var(--accent-blue)" }}
            >
              Character Origins
            </h3>
            <ComicSourceList mappings={characterOrigins} />
          </div>
        )}

        {mappings.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            No comic source mappings have been added yet.
          </p>
        )}
      </section>

      {/* Read the Comics CTA */}
      {mappings.length > 0 && (
        <div
          className="rounded-lg border p-6 text-center"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border-default)",
          }}
        >
          <p className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            Loved {content.title}?
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
            Read the original comics that inspired it
          </p>
          <Link
            href={`/${publisher}/edition/${mappings[0].edition_slug}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all hover:scale-[1.02]"
            style={{ background: "var(--accent-red)", color: "#fff" }}
          >
            Start with {mappings[0].edition_title}
          </Link>
        </div>
      )}
    </div>
  );
}
