"use client";

import { useState } from "react";
import Link from "next/link";
import type { MCUContent } from "@/lib/types";
import FaithfulnessBreakdown from "./FaithfulnessBreakdown";

function PosterPlaceholder({ contentType, phase, color }: { contentType: string; phase: number; color: string }) {
  return (
    <div className="text-center p-4">
      <div
        className="text-3xl font-bold mb-1"
        style={{ fontFamily: "var(--font-bricolage), sans-serif", color }}
      >
        {contentType === "movie" ? "FILM" : contentType === "series" ? "SERIES" : "SPECIAL"}
      </div>
      <div
        className="text-xs"
        style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
      >
        Phase {phase}
      </div>
    </div>
  );
}

export default function MCUContentCard({ content }: { content: MCUContent }) {
  const [imgBroken, setImgBroken] = useState(false);

  const typeColor =
    content.content_type === "movie"
      ? "var(--accent-red)"
      : content.content_type === "series"
      ? "var(--accent-blue)"
      : "var(--accent-purple)";

  const showPoster = content.poster_url && !imgBroken;

  return (
    <Link href={`/mcu/${content.slug}`} className="block group">
      <div
        className="rounded-xl border overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
        }}
      >
        {/* Type strip */}
        <div className="h-1 w-full" style={{ background: typeColor }} />

        {/* Poster */}
        <div
          className="relative w-full overflow-hidden flex items-center justify-center"
          style={{ aspectRatio: "2/3", background: "var(--bg-tertiary)" }}
        >
          {showPoster ? (
            <img
              src={content.poster_url!}
              alt={content.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              onError={() => setImgBroken(true)}
            />
          ) : (
            <PosterPlaceholder contentType={content.content_type} phase={content.phase} color={typeColor} />
          )}
        </div>

        <div className="px-4 py-3">
          <h3
            className="text-sm font-semibold leading-tight group-hover:text-[var(--accent-red)] transition-colors line-clamp-2"
            style={{ color: "var(--text-primary)" }}
          >
            {content.title}
          </h3>

          <div className="flex items-center gap-2 mt-1.5">
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
              style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.75rem" }}
            >
              Phase {content.phase}
            </span>
          </div>

          {content.release_date && (
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.75rem" }}
            >
              {new Date(content.release_date).getFullYear()}
            </p>
          )}

          <div className="mt-2">
            <FaithfulnessBreakdown score={content.faithfulness_score} compact />
          </div>
        </div>
      </div>
    </Link>
  );
}
