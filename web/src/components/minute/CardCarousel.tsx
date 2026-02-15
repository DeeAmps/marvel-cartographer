"use client";

import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MinuteCard from "./MinuteCard";
import type { MarvelMinuteCard } from "@/lib/daily-content";

export default function CardCarousel({ cards }: { cards: MarvelMinuteCard[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollTo(index: number) {
    const clamped = Math.max(0, Math.min(index, cards.length - 1));
    setActiveIndex(clamped);
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.getBoundingClientRect().width || 360;
    el.scrollTo({ left: clamped * (cardWidth + 16), behavior: "smooth" });
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.getBoundingClientRect().width || 360;
    const index = Math.round(el.scrollLeft / (cardWidth + 16));
    setActiveIndex(Math.max(0, Math.min(index, cards.length - 1)));
  }

  return (
    <div className="relative">
      {/* Navigation arrows */}
      {activeIndex > 0 && (
        <button
          onClick={() => scrollTo(activeIndex - 1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 hidden sm:flex"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
        >
          <ChevronLeft size={18} />
        </button>
      )}
      {activeIndex < cards.length - 1 && (
        <button
          onClick={() => scrollTo(activeIndex + 1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 hidden sm:flex"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {cards.map((card, i) => (
          <div key={i} className="snap-center shrink-0 first:ml-auto last:mr-auto">
            <MinuteCard card={card} index={i} total={cards.length} />
          </div>
        ))}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mt-4">
        {cards.map((card, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className="w-2.5 h-2.5 rounded-full transition-all"
            style={{
              background: i === activeIndex ? card.color : "var(--bg-tertiary)",
              transform: i === activeIndex ? "scale(1.3)" : "scale(1)",
            }}
          />
        ))}
      </div>

      {/* Counter */}
      <p
        className="text-center text-xs mt-2"
        style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
      >
        {activeIndex + 1} / {cards.length}
      </p>
    </div>
  );
}
