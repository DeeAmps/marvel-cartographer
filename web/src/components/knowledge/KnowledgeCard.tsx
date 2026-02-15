"use client";

import { useState } from "react";
import type { MarvelMinuteCard } from "@/lib/daily-content";

export default function KnowledgeCard({ card }: { card: MarvelMinuteCard }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="flex-shrink-0 w-[280px] sm:w-[320px] h-[200px] cursor-pointer"
      style={{ perspective: "1000px" }}
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0)",
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-xl border p-5 flex flex-col justify-between"
          style={{
            background: "var(--bg-secondary)",
            borderColor: `color-mix(in srgb, ${card.color} 30%, var(--border-default))`,
            backfaceVisibility: "hidden",
          }}
        >
          <div>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded inline-block mb-3"
              style={{
                color: card.color,
                border: `1px solid ${card.color}`,
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.65rem",
                textTransform: "uppercase",
              }}
            >
              {card.category}
            </span>
            <p className="text-sm font-semibold leading-snug line-clamp-4" style={{ color: "var(--text-primary)" }}>
              {card.front}
            </p>
          </div>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Tap to reveal
          </p>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-xl border p-5 flex flex-col justify-between"
          style={{
            background: "var(--bg-tertiary)",
            borderColor: `color-mix(in srgb, ${card.color} 30%, var(--border-default))`,
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded inline-block mb-3"
              style={{
                color: card.color,
                background: `color-mix(in srgb, ${card.color} 12%, transparent)`,
                fontSize: "0.65rem",
                textTransform: "uppercase",
              }}
            >
              Answer
            </span>
            <p className="text-sm leading-snug line-clamp-4 whitespace-pre-line" style={{ color: "var(--text-primary)" }}>
              {card.back}
            </p>
          </div>
          {card.source && (
            <p
              className="text-xs"
              style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.65rem" }}
            >
              {card.source}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
