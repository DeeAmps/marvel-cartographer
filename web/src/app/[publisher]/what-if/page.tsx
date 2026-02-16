import { notFound } from "next/navigation";
import { getEditions, getConnections } from "@/lib/data";
import { isValidPublisher, type Publisher } from "@/lib/types";
import WhatIfContent from "./WhatIfContent";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) return { title: "Not Found" };
  return {
    title: "What If? Paths — The Comic Cartographer",
    description:
      "Explore dynamically computed reading paths through the Marvel Universe. BFS traversal, shortest paths, and themed reading orders.",
  };
}

export default async function WhatIfPage({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;

  const [editions, connections] = await Promise.all([
    getEditions(publisher),
    getConnections(publisher),
  ]);

  return <WhatIfContent editions={editions} connections={connections} />;
}
