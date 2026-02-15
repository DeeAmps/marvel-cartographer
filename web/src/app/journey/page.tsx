import { Film } from "lucide-react";
import JourneyClient from "./JourneyClient";

export const metadata = {
  title: "Reading Journey Replay — The Marvel Cartographer",
  description:
    "Watch your Marvel reading journey unfold in an animated timeline. See how your collection grew across eras.",
};

export default function JourneyPage() {
  return (
    <div className="space-y-6">
      <section className="text-center py-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Film size={24} style={{ color: "var(--accent-purple)" }} />
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            Reading Journey Replay
          </h1>
        </div>
        <p
          className="text-sm max-w-lg mx-auto"
          style={{ color: "var(--text-secondary)" }}
        >
          Watch your Marvel reading journey come alive. Each dot is an edition
          you&apos;ve completed, appearing in the order you read them.
        </p>
      </section>

      <JourneyClient />
    </div>
  );
}
