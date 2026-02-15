import { getTrivia, getIssues, getEditions } from "@/lib/data";
import { getMarvelMinuteCards } from "@/lib/daily-content";
import CardCarousel from "@/components/minute/CardCarousel";
import { BookOpen, Share2 } from "lucide-react";

export const revalidate = 3600;

export const metadata = {
  title: "Marvel Minute — Daily Knowledge Cards",
  description: "Swipeable Marvel knowledge cards. Learn something new about the Marvel Universe every day.",
};

export default async function MinutePage() {
  const [trivia, issues, editions] = await Promise.all([
    getTrivia(),
    getIssues(),
    getEditions(),
  ]);

  const today = new Date();
  const cards = getMarvelMinuteCards(trivia, issues, editions, today);
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <section className="text-center py-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--accent-purple) 12%, transparent)" }}
          >
            <BookOpen size={24} style={{ color: "var(--accent-purple)" }} />
          </div>
        </div>
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          Marvel Minute
        </h1>
        <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
          Daily knowledge cards for {dateStr}
        </p>
        <p
          className="text-xs mt-1"
          style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
        >
          {cards.length} cards &middot; Tap to flip &middot; Swipe to browse
        </p>
      </section>

      {/* Large Card Carousel */}
      <CardCarousel cards={cards} />

      {/* Stats */}
      <section className="mt-12 grid grid-cols-3 gap-4 text-center">
        <div
          className="rounded-lg border p-4"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <div className="text-xl font-bold" style={{ color: "var(--accent-red)" }}>
            {cards.filter((c) => c.type === "trivia").length}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Trivia</div>
        </div>
        <div
          className="rounded-lg border p-4"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <div className="text-xl font-bold" style={{ color: "var(--accent-gold)" }}>
            {cards.filter((c) => c.type === "issue").length}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Key Issues</div>
        </div>
        <div
          className="rounded-lg border p-4"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
        >
          <div className="text-xl font-bold" style={{ color: "var(--accent-purple)" }}>
            {cards.filter((c) => c.type === "edition").length}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Essential Reads</div>
        </div>
      </section>

      <p
        className="text-center text-xs mt-8"
        style={{ color: "var(--text-tertiary)" }}
      >
        Cards refresh daily. Come back tomorrow for new knowledge.
      </p>
    </div>
  );
}
