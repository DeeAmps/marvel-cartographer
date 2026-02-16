import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCharacterGraphData } from "@/lib/data";
import { isValidPublisher, type Publisher } from "@/lib/types";
import GraphContent from "./GraphContent";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publisher: string }>;
}): Promise<Metadata> {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) return { title: "Not Found" };
  return {
    title: "Character Relationship Map — The Comic Cartographer",
    description:
      "Explore the interconnected web of Marvel character relationships. Allies, enemies, family, and more.",
  };
}

export default async function CharacterGraphPage({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) notFound();

  const { nodes, edges } = await getCharacterGraphData();

  return <GraphContent nodes={nodes} edges={edges} />;
}
