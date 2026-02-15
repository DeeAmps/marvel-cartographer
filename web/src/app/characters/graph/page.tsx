import type { Metadata } from "next";
import { getCharacterGraphData } from "@/lib/data";
import GraphContent from "./GraphContent";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Character Relationship Map — The Marvel Cartographer",
  description:
    "Explore the interconnected web of Marvel character relationships. Allies, enemies, family, and more.",
};

export default async function CharacterGraphPage() {
  const { nodes, edges } = await getCharacterGraphData();

  return <GraphContent nodes={nodes} edges={edges} />;
}
