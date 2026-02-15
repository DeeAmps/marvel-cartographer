import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About & Glossary",
  description:
    "What is the Marvel Cartographer? Learn about collected editions, format types, importance scores, and how to use this site.",
};

const formats = [
  {
    name: "Omnibus",
    description:
      "The premium format. Oversized hardcovers (typically 700-1200+ pages) collecting long runs. Expensive ($75-$125 cover) but the most content per dollar. Go in and out of print frequently.",
    price: "$75-$125",
    color: "var(--accent-red)",
  },
  {
    name: "Trade Paperback (TPB)",
    description:
      "The most common format. Softcover collections of 5-12 issues (~120-280 pages). Affordable and widely available. The standard entry point for most readers.",
    price: "$15-$25",
    color: "var(--accent-blue)",
  },
  {
    name: "Epic Collection",
    description:
      "Marvel's chronological reprint line. 400-500 page softcovers covering runs in publication order. Great for completionists working through a title's full history.",
    price: "$35-$50",
    color: "var(--accent-green)",
  },
  {
    name: "Hardcover (HC / OHC)",
    description:
      "Oversized hardcovers collecting 12-25 issues. Higher quality printing than TPBs. Oversized HCs (OHCs) are larger format with better paper stock.",
    price: "$30-$75",
    color: "var(--accent-gold)",
  },
  {
    name: "Marvel Masterworks",
    description:
      "Hardcover reprints of classic Silver/Bronze Age material. ~250 pages covering 10-12 issues. Premium quality but expensive per-issue.",
    price: "$50-$75",
    color: "var(--accent-purple)",
  },
  {
    name: "Complete Collection",
    description:
      "Large-format TPBs collecting an entire run or storyline. Similar to Epic Collections but organized by creative run rather than chronological order.",
    price: "$30-$45",
    color: "var(--text-secondary)",
  },
];

const importanceLevels = [
  {
    name: "Essential",
    description:
      "Must-read material that defines the Marvel Universe. Major origins, universe-shaping events, and definitive runs. If you only read one thing from an era, read the essential picks.",
    color: "var(--importance-essential)",
  },
  {
    name: "Recommended",
    description:
      "Excellent stories that significantly enrich your understanding. Great runs, important character development, and quality storytelling. Read these if the era or character interests you.",
    color: "var(--importance-recommended)",
  },
  {
    name: "Supplemental",
    description:
      "Good material that adds depth but isn't necessary for the big picture. Solid runs, interesting side stories, and character-specific deep dives.",
    color: "var(--importance-supplemental)",
  },
  {
    name: "Completionist",
    description:
      "For thorough readers who want everything. These fill gaps, provide context, or cover less prominent characters and storylines.",
    color: "var(--importance-completionist)",
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1
        className="text-3xl font-bold tracking-tight mb-2"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        About & Glossary
      </h1>
      <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
        Everything you need to know about the Marvel Cartographer and the world of collected editions.
      </p>

      {/* What is this? */}
      <section
        className="rounded-lg border p-6 mb-6"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <h2
          className="text-lg font-bold tracking-tight mb-3"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          What Is the Marvel Cartographer?
        </h2>
        <div className="space-y-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          <p>
            The Marvel Cartographer maps the entire Marvel Comics Universe from Fantastic Four #1 (1961) to current
            ongoings. It uses <strong style={{ color: "var(--text-primary)" }}>collected editions</strong> (omnibuses,
            trade paperbacks, hardcovers) as the primary navigation unit&mdash;because that&apos;s how most people
            actually read comics today.
          </p>
          <p>
            Unlike simple reading order lists, the Cartographer shows you <strong style={{ color: "var(--text-primary)" }}>how
            stories connect</strong>. Every edition links to what came before it, what comes after it, and what runs
            in parallel. You can follow a single character, trace a cosmic saga, or explore an entire era.
          </p>
          <p>
            We&apos;re also honest about uncertainty. Marvel&apos;s 60+ year continuity is full of contradictions,
            retcons, and editorial decisions that fans debate endlessly. Instead of pretending there&apos;s one
            &ldquo;correct&rdquo; reading, we show you{" "}
            <strong style={{ color: "var(--text-primary)" }}>three interpretations</strong> for every continuity
            conflict: the official stance, the fan consensus, and the behind-the-scenes editorial context.
          </p>
        </div>
      </section>

      {/* What is a collected edition? */}
      <section
        className="rounded-lg border p-6 mb-6"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <h2
          className="text-lg font-bold tracking-tight mb-3"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          What Is a Collected Edition?
        </h2>
        <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
          Marvel Comics are originally published as individual monthly issues (~22 pages each). A{" "}
          <strong style={{ color: "var(--text-primary)" }}>collected edition</strong> bundles multiple issues
          into a single book. They come in various formats, sizes, and price points:
        </p>

        <div className="space-y-3">
          {formats.map((fmt) => (
            <div
              key={fmt.name}
              className="rounded-lg border p-4"
              style={{
                background: "var(--bg-tertiary)",
                borderColor: "var(--border-default)",
                borderLeft: `3px solid ${fmt.color}`,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold" style={{ color: fmt.color }}>
                  {fmt.name}
                </h3>
                <span
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
                >
                  {fmt.price}
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {fmt.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Importance levels */}
      <section
        className="rounded-lg border p-6 mb-6"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <h2
          className="text-lg font-bold tracking-tight mb-3"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          Importance Levels
        </h2>
        <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
          Every edition is rated by its significance to the overall Marvel narrative:
        </p>

        <div className="space-y-3">
          {importanceLevels.map((level) => (
            <div key={level.name} className="flex items-start gap-3">
              <span
                className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-bold mt-0.5"
                style={{
                  background: level.color,
                  color: "#fff",
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "0.75rem",
                }}
              >
                {level.name.toUpperCase()}
              </span>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {level.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Confidence scores */}
      <section
        className="rounded-lg border p-6 mb-6"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <h2
          className="text-lg font-bold tracking-tight mb-3"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          Confidence Scores
        </h2>
        <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
          Connections between editions have a <strong style={{ color: "var(--text-primary)" }}>confidence score</strong>{" "}
          (0&ndash;100%) representing how certain the connection is. A direct sequel
          (&ldquo;FF Vol. 1 leads to FF Vol. 2&rdquo;) has 100% confidence. A thematic
          connection or debated retcon might have 50-70%.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text-primary)" }}>Strength</strong> (1&ndash;10) measures how important a
          connection is. A strength-10 &ldquo;leads to&rdquo; means you absolutely should read the next book.
          A strength-3 &ldquo;references&rdquo; means it&apos;s a nice callback but not essential.
        </p>
      </section>

      {/* How to use */}
      <section
        className="rounded-lg border p-6 mb-6"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <h2
          className="text-lg font-bold tracking-tight mb-3"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          How to Use This Site
        </h2>
        <div className="space-y-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          <p>
            <strong style={{ color: "var(--accent-red)" }}>New to Marvel?</strong> Start with the{" "}
            <Link href="/start" className="underline" style={{ color: "var(--accent-blue)" }}>
              Where Do I Start?
            </Link>{" "}
            wizard. It will recommend a reading path based on your interests.
          </p>
          <p>
            <strong style={{ color: "var(--accent-gold)" }}>Browsing?</strong> Explore the{" "}
            <Link href="/timeline" className="underline" style={{ color: "var(--accent-blue)" }}>
              Timeline
            </Link>{" "}
            to see every era, or use{" "}
            <Link href="/search" className="underline" style={{ color: "var(--accent-blue)" }}>
              Search
            </Link>{" "}
            to find a specific edition, character, or creator.
          </p>
          <p>
            <strong style={{ color: "var(--accent-green)" }}>On any edition page</strong>, look for the{" "}
            <strong style={{ color: "var(--text-primary)" }}>What&apos;s Next?</strong> section. This shows you exactly
            where to go after finishing a book, with visual graph connections and strength/confidence indicators.
          </p>
          <p>
            <strong style={{ color: "var(--accent-purple)" }}>Track your reading</strong> with the{" "}
            <Link href="/collection" className="underline" style={{ color: "var(--accent-blue)" }}>
              Collection
            </Link>{" "}
            feature. Mark editions as owned, reading, wishlist, or completed.
          </p>
        </div>
      </section>

      {/* CTA */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/start"
          className="flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-sm transition-all hover:scale-105"
          style={{ background: "var(--accent-red)", color: "#fff" }}
        >
          Where Do I Start? <ArrowRight size={16} />
        </Link>
        <Link
          href="/timeline"
          className="flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-sm border transition-colors hover:border-[var(--accent-red)]"
          style={{ borderColor: "var(--border-default)", color: "var(--text-primary)", background: "var(--bg-secondary)" }}
        >
          Explore Timeline <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
