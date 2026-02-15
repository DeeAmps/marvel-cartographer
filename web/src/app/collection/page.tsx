import { getEditions } from "@/lib/data";
import CollectionContent from "./CollectionContent";

export const revalidate = 3600;

export const metadata = {
  title: "My Collection",
  description: "Track your Marvel collected editions — coverage heatmap, smart recommendations, and library management.",
};

export default async function CollectionPage() {
  const editions = await getEditions();
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
