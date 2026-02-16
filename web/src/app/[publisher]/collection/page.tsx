import { notFound } from "next/navigation";
import { getEditions } from "@/lib/data";
import { isValidPublisher, type Publisher } from "@/lib/types";
import CollectionContent from "./CollectionContent";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) return { title: "Not Found" };
  return {
    title: "My Collection",
    description: "Track your Marvel collected editions — coverage heatmap, smart recommendations, and library management.",
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;

  const editions = await getEditions(publisher);
  const editionMap: Record<string, {
    title: string;
    cover_image_url: string | null;
    format: string;
    importance: string;
    print_status: string;
    issues_collected: string;
  }> = {};
  for (const e of editions) {
    editionMap[e.slug] = {
      title: e.title,
      cover_image_url: e.cover_image_url,
      format: e.format,
      importance: e.importance,
      print_status: e.print_status,
      issues_collected: e.issues_collected,
    };
  }

  return (
    <CollectionContent
      editionMap={editionMap}
    />
  );
}
