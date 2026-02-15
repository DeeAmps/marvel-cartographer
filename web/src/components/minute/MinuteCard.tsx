"use client";

import { useState } from "react";
import type { MarvelMinuteCard } from "@/lib/daily-content";

export default function MinuteCard({
  card,
  index,
  total,
}: {
  card: MarvelMinuteCard;
  index: number;
  total: number;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="w-[340px] sm:w-[400px] h-[260px] sm:h-[280px] cursor-pointer select-none"
      style={{ perspective: "1200px" }}
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
          className="absolute inset-0 rounded-2xl border p-6 flex flex-col justify-between"
          style={{
            background: "var(--bg-secondary)",
            borderColor: `color-mix(in srgb, ${card.color} 30%, var(--border-default))`,
            backfaceVisibility: "hidden",
            boxShadow: `0 4px 24px color-mix(in srgb, ${card.color} 10%, transparent)`,
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full inline-block"
                style={{
                  color: card.color,
                  border: `1px solid ${card.color}`,
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "0.6rem",
                  textTransform: "uppercase",
                }}
              >
                {card.category}
              </span>
              <span
                className="text-xs"
                style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.6rem" }}
              >
                {index + 1}/{total}
              </span>
            </div>
            <p className="text-base font-semibold leading-snug line-clamp-5" style={{ color: "var(--text-primary)" }}>
              {card.front}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Tap to reveal answer
            </p>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: `color-mix(in srgb, ${card.color} 15%, transparent)`, color: card.color }}
            >
              <span style={{ fontSize: "0.7rem" }}>?</span>
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl border p-6 flex flex-col justify-between"
          style={{
            background: "var(--bg-tertiary)",
            borderColor: `color-mix(in srgb, ${card.color} 40%, var(--border-default))`,
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            boxShadow: `0 4px 24px color-mix(in srgb, ${card.color} 15%, transparent)`,
          }}
        >
          <div>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full inline-block mb-4"
              style={{
                color: "#fff",
                background: card.color,
                fontSize: "0.6rem",
                textTransform: "uppercase",
              }}
            >
              Answer
            </span>
            <p className="text-base leading-snug line-clamp-5 whitespace-pre-line" style={{ color: "var(--text-primary)" }}>
              {card.back}
            </p>
          </div>
          {card.source && (
            <p
              className="text-xs"
              style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.6rem" }}
            >
              {card.source}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
