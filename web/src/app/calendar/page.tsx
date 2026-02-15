import { getCalendarEditions } from "@/lib/data";
import CalendarContent from "./CalendarContent";

export const revalidate = 3600;

export const metadata = {
  title: "Marvel Calendar",
  description: "Release calendar for upcoming and recent Marvel collected editions — omnibuses, trades, and more.",
};

export default async function CalendarPage() {
  const now = new Date();
  const startDate = `${now.getFullYear() - 1}-01-01`;
  const endDate = `${now.getFullYear() + 1}-12-31`;
  const editions = await getCalendarEditions(startDate, endDate);

  return <CalendarContent editions={editions} />;
}
