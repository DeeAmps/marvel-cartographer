import { NextRequest, NextResponse } from "next/server";
import { getEditions, getCharacters, getCreators } from "@/lib/data";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.toLowerCase().trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const [editions, characters, creators] = await Promise.all([
    getEditions(),
    getCharacters(),
    getCreators(),
  ]);

  type Suggestion = { type: "edition" | "character" | "creator"; label: string; slug: string; detail: string };
  const suggestions: Suggestion[] = [];

  // Editions: prefix match boosted
  for (const e of editions) {
    if (suggestions.length >= 8) break;
    const titleLower = e.title.toLowerCase();
    if (titleLower.includes(q)) {
      suggestions.push({
        type: "edition",
        label: e.title,
        slug: e.slug,
        detail: e.issues_collected,
      });
    }
  }

  // Characters
  for (const c of characters) {
    if (suggestions.length >= 8) break;
    const match =
      c.name.toLowerCase().includes(q) ||
      c.aliases.some((a) => a.toLowerCase().includes(q));
    if (match) {
      suggestions.push({
        type: "character",
        label: c.name,
        slug: c.slug,
        detail: c.aliases.slice(0, 2).join(", ") || c.first_appearance_issue,
      });
    }
  }

  // Creators
  for (const c of creators) {
    if (suggestions.length >= 8) break;
    if (c.name.toLowerCase().includes(q)) {
      suggestions.push({
        type: "creator",
        label: c.name,
        slug: c.slug,
        detail: c.roles.join(", "),
      });
    }
  }

  // Sort: prefix matches first, then by type priority
  suggestions.sort((a, b) => {
    const aPrefix = a.label.toLowerCase().startsWith(q) ? 0 : 1;
    const bPrefix = b.label.toLowerCase().startsWith(q) ? 0 : 1;
    if (aPrefix !== bPrefix) return aPrefix - bPrefix;
    const typePriority = { edition: 0, character: 1, creator: 2 };
    return typePriority[a.type] - typePriority[b.type];
  });

  return NextResponse.json({ suggestions: suggestions.slice(0, 8) });
}
