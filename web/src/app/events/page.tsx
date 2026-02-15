import { getEvents, getEventEditionCounts } from "@/lib/data";
import EventsClient from "./EventsClient";

export const revalidate = 3600;

export const metadata = {
  title: "Crossover Events",
  description: "Browse every major Marvel crossover event from Secret Wars (1984) to Armageddon (2026).",
};

export default async function EventsPage() {
  const [events, editionCounts] = await Promise.all([
    getEvents(),
    getEventEditionCounts(),
  ]);

  return (
    <EventsClient
      events={events}
      editionCounts={editionCounts}
    />
  );
}
