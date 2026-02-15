import type { XPLevel } from "./types";

export const XP_LEVELS: XPLevel[] = [
  { name: "Recruit", min_xp: 0, max_xp: 49, color: "var(--text-tertiary)" },
  { name: "Agent", min_xp: 50, max_xp: 149, color: "var(--accent-green)" },
  { name: "Avenger", min_xp: 150, max_xp: 349, color: "var(--accent-blue)" },
  { name: "Herald", min_xp: 350, max_xp: 699, color: "var(--accent-purple)" },
  { name: "Watcher", min_xp: 700, max_xp: Infinity, color: "var(--accent-gold)" },
];

export function getLevelFromXP(xp: number): XPLevel {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].min_xp) return XP_LEVELS[i];
  }
  return XP_LEVELS[0];
}

export function getLevelNumber(xp: number): number {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].min_xp) return i + 1;
  }
  return 1;
}

export function getXPProgress(xp: number): { current: number; needed: number; percent: number } {
  const level = getLevelFromXP(xp);
  if (level.max_xp === Infinity) {
    return { current: xp - level.min_xp, needed: 0, percent: 100 };
  }
  const current = xp - level.min_xp;
  const needed = level.max_xp - level.min_xp + 1;
  return { current, needed, percent: Math.min(100, Math.round((current / needed) * 100)) };
}

// XP rewards for different activities
export const XP_REWARDS = {
  edition_reading: 5,
  edition_completed: 15,
  path_completed: 50,
  rating_submitted: 5,
  trivia_played: 3,
} as const;
