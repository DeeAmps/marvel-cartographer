import { notFound } from "next/navigation";
import { getCalendarEditions } from "@/lib/data";
import { isValidPublisher, type Publisher } from "@/lib/types";
import CalendarContent from "./CalendarContent";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) return { title: "Not Found" };
  return {
    title: "Marvel Calendar",
    description: "Release calendar for upcoming and recent Marvel collected editions — omnibuses, trades, and more.",
  };
}

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;

  const now = new Date();
  const startDate = `${now.getFullYear() - 1}-01-01`;
  const endDate = `${now.getFullYear() + 1}-12-31`;
  const editions = await getCalendarEditions(startDate, endDate, publisher);

  return <CalendarContent editions={editions} />;
}
