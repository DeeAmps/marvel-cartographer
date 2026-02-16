import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidPublisher } from "@/lib/types";
import AchievementsClient from "./AchievementsClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publisher: string }>;
}): Promise<Metadata> {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) return { title: "Not Found" };
  return {
    title: "Achievements",
    description: "Track your reading achievements, XP level, and reading streaks in the Comic Cartographer.",
  };
}

export default async function AchievementsPage({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) notFound();

  return <AchievementsClient />;
}
