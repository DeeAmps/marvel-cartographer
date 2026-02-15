import type { Metadata } from "next";
import { getRetconData, getEras } from "@/lib/data";
import RetconContent from "./RetconContent";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Retcon Tracker — The Marvel Cartographer",
  description:
    "Track how Marvel's continuity has been rewritten over the decades. Explore retcons by character, era, and impact.",
};

export default async function RetconsPage() {
  const [retconData, eras] = await Promise.all([getRetconData(), getEras()]);

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
