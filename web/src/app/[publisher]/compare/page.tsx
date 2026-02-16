import { notFound } from "next/navigation";
import { getEditionsForComparison, getEditionIssueMap, getSuggestedComparisons } from "@/lib/data";
import { isValidPublisher, type Publisher } from "@/lib/types";
import CompareContent from "./CompareContent";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) return { title: "Not Found" };
  return {
    title: "Compare Editions",
    description: "Side-by-side comparison of Marvel collected editions — format, page count, issues, overlap, and value analysis.",
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;

  const [editions, editionIssueMap, suggestedComparisons] = await Promise.all([
    getEditionsForComparison(publisher),
    getEditionIssueMap(publisher),
    getSuggestedComparisons(publisher),
  ]);

  return (
    <CompareContent
      allEditions={editions}
      editionIssueMap={editionIssueMap}
      suggestedComparisons={suggestedComparisons}
    />
  );
}
