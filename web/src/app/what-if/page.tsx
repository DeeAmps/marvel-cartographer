import { getEditions, getConnections } from "@/lib/data";
import WhatIfContent from "./WhatIfContent";

export const revalidate = 3600;

export const metadata = {
  title: "What If? Paths — The Marvel Cartographer",
  description:
    "Explore dynamically computed reading paths through the Marvel Universe. BFS traversal, shortest paths, and themed reading orders.",
};

export default async function WhatIfPage() {
  const [editions, connections] = await Promise.all([
    getEditions(),
    getConnections(),
  ]);

  return <WhatIfContent editions={editions} connections={connections} />;
}
