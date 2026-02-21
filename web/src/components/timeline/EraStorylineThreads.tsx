import Link from "next/link";
import type { CollectedEdition } from "@/lib/types";
import CoverImage from "@/components/ui/CoverImage";

interface Props {
  editions: CollectedEdition[];
  eraColor: string;
}

// Character family groupings by title keyword matching
const CHARACTER_FAMILIES: { label: string; keywords: string[] }[] = [
  { label: "X-Men", keywords: ["x-men", "x-force", "wolverine", "uncanny x", "new mutants", "excalibur", "x-factor", "cable", "deadpool", "magneto", "gambit", "storm", "generation x", "hellions", "marauders", "krakoa"] },
  { label: "Avengers", keywords: ["avengers", "mighty avengers", "new avengers", "west coast avengers", "thunderbolts"] },
  { label: "Spider-Man", keywords: ["spider-man", "spider-verse", "amazing spider", "spectacular spider", "venom", "carnage", "miles morales"] },
  { label: "Fantastic Four", keywords: ["fantastic four", "ff omnibus", "silver surfer", "thing", "human torch"] },
  { label: "Iron Man & Tech", keywords: ["iron man", "war machine", "ironheart", "armor wars"] },
  { label: "Captain America", keywords: ["captain america", "winter soldier", "falcon"] },
  { label: "Thor & Asgard", keywords: ["thor", "asgard", "mighty thor", "loki", "jane foster"] },
  { label: "Hulk", keywords: ["hulk", "incredible hulk", "immortal hulk", "she-hulk"] },
  { label: "Cosmic", keywords: ["guardians of the galaxy", "nova", "annihilation", "infinity", "thanos", "galactus", "silver surfer", "cosmic"] },
  { label: "Street Level", keywords: ["daredevil", "punisher", "luke cage", "iron fist", "jessica jones", "heroes for hire", "moon knight", "elektra"] },
  { label: "Events", keywords: ["secret wars", "civil war", "house of m", "age of", "war of", "siege", "axis", "original sin", "world war", "empyre", "king in black", "blood hunt", "doom"] },
];

function groupByFamily(editions: CollectedEdition[]): { label: string; editions: CollectedEdition[] }[] {
  const grouped: { label: string; editions: CollectedEdition[] }[] = [];
  const used = new Set<string>();

  for (const family of CHARACTER_FAMILIES) {
    const matches = editions.filter((e) => {
      if (used.has(e.slug)) return false;
      const title = e.title.toLowerCase();
      return family.keywords.some((kw) => title.includes(kw));
    });
    if (matches.length >= 2) {
      for (const m of matches) used.add(m.slug);
      grouped.push({ label: family.label, editions: matches });
    }
  }

  // Remaining editions that didn't match any family
  const remaining = editions.filter((e) => !used.has(e.slug));
  if (remaining.length > 0) {
    grouped.push({ label: "Other", editions: remaining });
  }

  return grouped;
}

export default function EraStorylineThreads({ editions, eraColor }: Props) {
  // Only show essential + recommended for threads
  const topEditions = editions.filter(
    (e) => e.importance === "essential" || e.importance === "recommended"
  );

  const threads = groupByFamily(topEditions);
  if (threads.length === 0) return null;

  // Only show threads with 2+ editions, limit to 5 threads
  const visibleThreads = threads.filter((t) => t.editions.length >= 2).slice(0, 5);
  if (visibleThreads.length === 0) return null;

  return (
    <div className="mb-6">
      <h3
        className="text-sm font-bold uppercase tracking-wider mb-3"
        style={{ color: "var(--text-tertiary)" }}
      >
        Key Storyline Threads
      </h3>
      <div className="space-y-4">
        {visibleThreads.map((thread) => (
          <div key={thread.label}>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: eraColor }}
              />
              <span
                className="text-xs font-bold"
                style={{ color: "var(--text-secondary)" }}
              >
                {thread.label}
              </span>
              <span
                className="text-xs"
                style={{
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "0.7rem",
                }}
              >
                {thread.editions.length} editions
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {thread.editions.map((edition) => (
                <Link
                  key={edition.slug}
                  href={`/edition/${edition.slug}`}
                  className="flex-shrink-0 group"
                  style={{ width: 100 }}
                >
                  <div
                    className="rounded-lg border overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
                    style={{
                      background: "var(--bg-secondary)",
                      borderColor: "var(--border-default)",
                    }}
                  >
                    <div
                      className="relative w-full overflow-hidden"
                      style={{ aspectRatio: "2/3", maxHeight: 150, background: "var(--bg-tertiary)" }}
                    >
                      <CoverImage
                        src={edition.cover_image_url}
                        alt={edition.title}
                        fill
                        sizes="100px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        format={edition.format}
                      />
                    </div>
                    <div className="px-1.5 py-1.5">
                      <p
                        className="text-xs font-medium leading-tight line-clamp-2 group-hover:text-[var(--accent-red)] transition-colors"
                        style={{ color: "var(--text-primary)", fontSize: "0.65rem" }}
                      >
                        {edition.title}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
