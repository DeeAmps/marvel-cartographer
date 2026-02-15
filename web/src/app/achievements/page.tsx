import type { Metadata } from "next";
import AchievementsClient from "./AchievementsClient";

export const metadata: Metadata = {
  title: "Achievements",
  description: "Track your reading achievements, XP level, and reading streaks in the Marvel Cartographer.",
};

export default function AchievementsPage() {
  return <AchievementsClient />;
}
