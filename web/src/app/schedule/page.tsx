import type { Metadata } from "next";
import ScheduleContent from "./ScheduleContent";

export const metadata: Metadata = {
  title: "Reading Schedule",
  description:
    "Plan your Marvel reading — schedule editions weekly, track progress, and stay on pace with your personal reading calendar.",
};

export default function SchedulePage() {
  return <ScheduleContent />;
}
