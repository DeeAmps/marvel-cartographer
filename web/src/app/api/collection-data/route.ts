import { NextResponse } from "next/server";
import { getCoverageData, getEditionIssueMap, getReadingPaths } from "@/lib/data";

export const revalidate = 3600;

export async function GET() {
  const [coverageData, editionIssueMap, paths] = await Promise.all([
    getCoverageData(),
    getEditionIssueMap(),
    getReadingPaths(),
  ]);

  // Map paths to lightweight summaries for the reading plan tab
  const pathSummaries = paths.map((p) => ({
    slug: p.slug,
    name: p.name,
    path_type: p.path_type,
    difficulty: p.difficulty,
    entries: p.entries.map((e) => ({
      edition_slug: e.edition.slug,
      title: e.edition.title,
      importance: e.edition.importance,
      print_status: e.edition.print_status,
      is_optional: e.is_optional,
    })),
  }));

  return NextResponse.json({ coverageData, editionIssueMap, pathSummaries });
}
