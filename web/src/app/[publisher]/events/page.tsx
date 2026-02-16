import { getEvents, getEventEditionCounts } from "@/lib/data";
import { notFound } from "next/navigation";
import { isValidPublisher, type Publisher } from "@/lib/types";
import EventsClient from "./EventsClient";

export const revalidate = 3600;

export const metadata = {
  title: "Crossover Events",
  description: "Browse every major Marvel crossover event from Secret Wars (1984) to Armageddon (2026).",
};

export default async function EventsPage({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;

  const [events, editionCounts] = await Promise.all([
    getEvents(publisher),
    getEventEditionCounts(publisher),
  ]);

  return (
    <EventsClient
      events={events}
      editionCounts={editionCounts}
    />
  );
}
