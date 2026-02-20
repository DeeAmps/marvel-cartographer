import type { DailyIssue, TriviaQuestion, CollectedEdition } from "./types";

// Simple seeded PRNG (mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashDateString(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const chr = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash + chr) | 0;
  }
  return Math.abs(hash);
}

export function seededShuffle<T>(arr: T[], seed: string): T[] {
  const rng = mulberry32(hashDateString(seed));
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Get issues published on this day in Marvel history */
export function getDailyBriefingIssues(
  allIssues: DailyIssue[],
  date: Date = new Date()
): DailyIssue[] {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const matches = allIssues.filter((issue) => {
    if (!issue.publication_date) return false;
    const pubDate = new Date(issue.publication_date);
    return pubDate.getMonth() + 1 === month && pubDate.getDate() === day;
  });

  if (matches.length > 0) {
    return matches.slice(0, 5);
  }

  // Fallback: same month, or random essential issue
  const monthMatches = allIssues.filter((issue) => {
    if (!issue.publication_date) return false;
    return new Date(issue.publication_date).getMonth() + 1 === month;
  });

  if (monthMatches.length > 0) {
    const dateStr = `${date.getFullYear()}-${month}-${day}`;
    return seededShuffle(monthMatches, dateStr).slice(0, 3);
  }

  // Last resort: random essential issues
  const essentials = allIssues.filter((i) => i.importance === "essential");
  const dateStr = `${date.getFullYear()}-${month}-${day}`;
  return seededShuffle(essentials, dateStr).slice(0, 3);
}

export interface MarvelMinuteCard {
  type: "trivia" | "issue" | "edition";
  category: string;
  front: string;
  back: string;
  source?: string;
  color: string;
}

/** Generate 10 deterministic cards for today's Marvel Minute */
export function getMarvelMinuteCards(
  trivia: TriviaQuestion[],
  issues: DailyIssue[],
  editions: CollectedEdition[],
  date: Date = new Date()
): MarvelMinuteCard[] {
  const dateStr = date.toISOString().split("T")[0];
  const cards: MarvelMinuteCard[] = [];

  // 5 trivia cards
  const shuffledTrivia = seededShuffle(trivia, dateStr + "-trivia");
  for (let i = 0; i < Math.min(5, shuffledTrivia.length); i++) {
    const q = shuffledTrivia[i];
    cards.push({
      type: "trivia",
      category: q.category,
      front: q.question,
      back: q.answer,
      source: q.source_issue,
      color: getCategoryColor(q.category),
    });
  }

  // 3 key issues
  const keyIssues = issues.filter((i) => i.first_appearances.length > 0 || i.importance === "essential");
  const shuffledIssues = seededShuffle(keyIssues, dateStr + "-issues");
  for (let i = 0; i < Math.min(3, shuffledIssues.length); i++) {
    const issue = shuffledIssues[i];
    cards.push({
      type: "issue",
      category: "Key Issue",
      front: `${issue.series} #${issue.issue_number}`,
      back: issue.title + (issue.first_appearances.length > 0 ? `\nFirst: ${issue.first_appearances.join(", ")}` : ""),
      source: `Published ${new Date(issue.publication_date).getFullYear()}`,
      color: "var(--accent-red)",
    });
  }

  // 2 essential editions
  const essentialEditions = editions.filter((e) => e.importance === "essential");
  const shuffledEditions = seededShuffle(essentialEditions, dateStr + "-editions");
  for (let i = 0; i < Math.min(2, shuffledEditions.length); i++) {
    const ed = shuffledEditions[i];
    cards.push({
      type: "edition",
      category: "Essential Read",
      front: ed.title,
      back: ed.synopsis,
      source: ed.issues_collected,
      color: "var(--accent-gold)",
    });
  }

  return seededShuffle(cards, dateStr + "-final");
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    "first-appearances": "var(--accent-red)",
    "deaths-returns": "#ff1744",
    villains: "var(--accent-purple)",
    teams: "var(--accent-blue)",
    cosmic: "var(--accent-gold)",
    events: "var(--accent-red)",
    creators: "var(--accent-gold)",
    powers: "var(--accent-green)",
    relationships: "#ff69b4",
    "weapons-artifacts": "#b0bec5",
    locations: "var(--accent-blue)",
    "secret-identities": "var(--accent-purple)",
    retcons: "#ff9800",
    "behind-the-scenes": "var(--text-secondary)",
  };
  return colors[category] ?? "var(--text-tertiary)";
}
