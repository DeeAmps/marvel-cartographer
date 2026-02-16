import { getReadingPaths } from "@/lib/data";
import { notFound } from "next/navigation";
import { isValidPublisher, type Publisher } from "@/lib/types";
import PathsBrowser from "@/components/paths/PathsBrowser";

export const revalidate = 3600;

export const metadata = {
  title: "Reading Paths — The Comic Cartographer",
  description:
    "Browse 80+ curated Marvel reading paths by character, team, event, creator, or theme.",
};

export default async function PathsPage({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;

  const paths = await getReadingPaths(publisher);

  const summaries = paths.map((p) => ({
    slug: p.slug,
    name: p.name,
    category: p.category,
    path_type: p.path_type,
    difficulty: p.difficulty,
    description: p.description,
    entryCount: p.entries.length,
    estimated_issues: p.estimated_issues,
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-tight mb-2"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          Reading Paths
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {summaries.length} curated paths to guide you through the Marvel
          Universe. Search, filter by category or difficulty, and find your next
          reading journey.
        </p>
      </div>

      <PathsBrowser paths={summaries} />
    </div>
  );
}
