import type { JourneyFrame } from "./types";

/**
 * Build journey frames from user collection data + edition metadata.
 * Sorts by completed_at chronologically.
 */

// Era to visual position mapping (x-axis proportional to timeline)
const ERA_X: Record<string, number> = {
  "birth-of-marvel": 80,
  "the-expansion": 180,
  "bronze-age": 280,
  "rise-of-x-men": 400,
  "event-age": 520,
  "speculation-crash": 620,
  "heroes-reborn-return": 720,
  "marvel-knights-ultimate": 830,
  "bendis-avengers": 940,
  "hickman-saga": 1060,
  "all-new-all-different": 1180,
  "dawn-of-krakoa": 1300,
  "blood-hunt-doom": 1400,
  "current-ongoings": 1500,
};

const IMPORTANCE_Y: Record<string, number> = {
  essential: 120,
  recommended: 240,
  supplemental: 360,
  completionist: 440,
};

export function buildJourneyFrames(
  completedEditions: {
    slug: string;
    title: string;
    completed_at: string;
    era_slug: string;
    era_color: string;
    importance: string;
  }[]
): JourneyFrame[] {
  // Sort by completion date
  const sorted = [...completedEditions].sort(
    (a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
  );

  return sorted.map((ed, i) => {
    const baseX = ERA_X[ed.era_slug] || 800;
    const baseY = IMPORTANCE_Y[ed.importance] || 300;

    // Add deterministic jitter based on index to prevent overlap
    const jitterX = ((i * 37) % 60) - 30;
    const jitterY = ((i * 23) % 40) - 20;

    return {
      edition_slug: ed.slug,
      edition_title: ed.title,
      completed_at: ed.completed_at,
      era_slug: ed.era_slug,
      era_color: ed.era_color,
      importance: ed.importance as JourneyFrame["importance"],
      x: Math.max(40, Math.min(1560, baseX + jitterX)),
      y: Math.max(40, Math.min(460, baseY + jitterY)),
    };
  });
}

/**
 * Compute running stats at each animation step.
 */
export function computeJourneyStats(
  frames: JourneyFrame[],
  currentIndex: number
): {
  editionsRead: number;
  erasCovered: number;
  essentialCount: number;
  latestEra: string;
} {
  const visible = frames.slice(0, currentIndex + 1);
  const uniqueEras = new Set(visible.map((f) => f.era_slug));
  const essentialCount = visible.filter((f) => f.importance === "essential").length;

  return {
    editionsRead: visible.length,
    erasCovered: uniqueEras.size,
    essentialCount,
    latestEra: visible[visible.length - 1]?.era_slug || "",
  };
}
