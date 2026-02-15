import { getEditionsForComparison, getEditionIssueMap, getSuggestedComparisons } from "@/lib/data";
import CompareContent from "./CompareContent";

export const revalidate = 3600;

export const metadata = {
  title: "Compare Editions",
  description: "Side-by-side comparison of Marvel collected editions — format, page count, issues, overlap, and value analysis.",
};

export default async function ComparePage() {
  const [editions, editionIssueMap, suggestedComparisons] = await Promise.all([
    getEditionsForComparison(),
    getEditionIssueMap(),
    getSuggestedComparisons(),
  ]);

  return (
    <CompareContent
      allEditions={editions}
      editionIssueMap={editionIssueMap}
      suggestedComparisons={suggestedComparisons}
    />
  );
}
