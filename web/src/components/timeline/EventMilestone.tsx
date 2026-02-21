import Link from "next/link";
import type { Event } from "@/lib/types";

export default function EventMilestone({ event }: { event: Event }) {
  return (
    <Link
      href={`/event/${event.slug}`}
      className="flex-shrink-0 flex flex-col items-center gap-1 px-2 py-3 group"
      style={{ width: 80 }}
    >
      {/* Gold diamond marker */}
      <div
        className="w-4 h-4 rotate-45 rounded-sm transition-transform group-hover:scale-125"
        style={{ background: "var(--accent-gold)" }}
      />
      <span
        className="text-center leading-tight font-semibold line-clamp-2 group-hover:text-[var(--accent-gold)] transition-colors"
        style={{
          color: "var(--accent-gold)",
          fontSize: "0.55rem",
        }}
      >
        {event.name}
      </span>
      <span
        className="font-mono"
        style={{ color: "var(--text-tertiary)", fontSize: "0.5rem" }}
      >
        {event.year}
      </span>
    </Link>
  );
}
