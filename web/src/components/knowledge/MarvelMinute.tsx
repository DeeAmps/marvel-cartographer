"use client";

import { BookOpen } from "lucide-react";
import KnowledgeCard from "./KnowledgeCard";
import type { MarvelMinuteCard } from "@/lib/daily-content";

export default function MarvelMinute({ cards }: { cards: MarvelMinuteCard[] }) {
  if (cards.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: "color-mix(in srgb, var(--accent-purple) 12%, transparent)", color: "var(--accent-purple)" }}
        >
          <BookOpen size={20} />
        </div>
        <div>
          <h2
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            Marvel Minute
          </h2>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Daily knowledge cards — tap to flip
          </p>
        </div>
      </div>

      <div
        className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4"
        style={{
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {cards.map((card, i) => (
          <div key={i} style={{ scrollSnapAlign: "start" }}>
            <KnowledgeCard card={card} />
          </div>
        ))}
      </div>

      {/* Navigation dots */}
      <div className="flex justify-center gap-1.5 mt-2">
        {cards.map((card, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: card.color, opacity: 0.4 }}
          />
        ))}
      </div>
    </section>
  );
}
