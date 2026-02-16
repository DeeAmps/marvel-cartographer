import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRetconData, getEras } from "@/lib/data";
import { isValidPublisher, type Publisher } from "@/lib/types";
import RetconContent from "./RetconContent";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publisher: string }>;
}): Promise<Metadata> {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) return { title: "Not Found" };
  return {
    title: "Retcon Tracker — The Comic Cartographer",
    description:
      "Track how Marvel's continuity has been rewritten over the decades. Explore retcons by character, era, and impact.",
  };
}

export default async function RetconsPage({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;

  const [retconData, eras] = await Promise.all([getRetconData(publisher), getEras(publisher)]);

  return (
    <RetconContent
      entries={retconData.entries}
      allRetcons={retconData.allRetcons}
      eras={eras.map((e) => ({
        slug: e.slug,
        name: e.name,
        year_start: e.year_start,
        year_end: e.year_end,
      }))}
    />
  );
}
