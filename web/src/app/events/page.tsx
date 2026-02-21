import { getEvents, getEventEditionCounts, getAllEventEditions } from "@/lib/data";
import EventsClient from "./EventsClient";

export const revalidate = 3600;

export const metadata = {
  title: "Events & Sagas",
  description: "Browse every major Marvel event, crossover, and saga-defining run from the Coming of Galactus to the present.",
};

export default async function EventsPage() {
  const [events, editionCounts, eventEditions] = await Promise.all([
    getEvents(),
    getEventEditionCounts(),
    getAllEventEditions(),
  ]);

  return (
    <EventsClient
      events={events}
      editionCounts={editionCounts}
      eventEditions={eventEditions}
    />
  );
}
