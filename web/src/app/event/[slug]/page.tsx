import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getEventWithPhases,
  getEvents,
  getEditionsForEvent,
  getReadingOrderForEvent,
  getEditions,
} from "@/lib/data";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import GuideStatusBadge from "@/components/ui/GuideStatusBadge";
import EventPhaseTimeline from "@/components/events/EventPhaseTimeline";
import ReadingOrderList from "@/components/events/ReadingOrderList";
import { ArrowLeft, ChevronRight } from "lucide-react";
import type { Event } from "@/lib/types";
import React from "react";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventWithPhases(slug);
  if (!event) return { title: "Not Found" };
  return {
    title: event.name,
    description: event.synopsis.slice(0, 160),
  };
}

function linkifyEventText(
  text: string,
  allEvents: Event[]
): React.ReactNode {
  // Sort events by name length descending so longer names match first
  const sortedEvents = [...allEvents].sort(
    (a, b) => b.name.length - a.name.length
  );

  // Build an array of segments: text or link
  type Segment = { type: "text"; value: string } | { type: "link"; event: Event; matched: string };
  let segments: Segment[] = [{ type: "text", value: text }];

  for (const evt of sortedEvents) {
    const newSegments: Segment[] = [];
    for (const seg of segments) {
      if (seg.type === "link") {
        newSegments.push(seg);
        continue;
      }
      const remaining = seg.value;
      const lowerRemaining = remaining.toLowerCase();
      const lowerName = evt.name.toLowerCase();
      const idx = lowerRemaining.indexOf(lowerName);
      if (idx === -1) {
        newSegments.push(seg);
        continue;
      }
      // Split into before, match, after
      if (idx > 0) {
        newSegments.push({ type: "text", value: remaining.slice(0, idx) });
      }
      newSegments.push({
        type: "link",
        event: evt,
        matched: remaining.slice(idx, idx + evt.name.length),
      });
      if (idx + evt.name.length < remaining.length) {
        newSegments.push({
          type: "text",
          value: remaining.slice(idx + evt.name.length),
        });
      }
    }
    segments = newSegments;
  }

  if (segments.length === 1 && segments[0].type === "text") {
    return text;
  }

  return segments.map((seg, i) => {
    if (seg.type === "link") {
      return (
        <Link
          key={`${seg.event.slug}-${i}`}
          href={`/event/${seg.event.slug}`}
          className="font-bold transition-colors hover:text-[var(--accent-red)]"
          style={{ color: "var(--accent-blue)" }}
        >
          {seg.matched}
        </Link>
      );
    }
    return <React.Fragment key={i}>{seg.value}</React.Fragment>;
  });
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [event, allEvents, readingOrder, allEditions] = await Promise.all([
    getEventWithPhases(slug),
    getEvents(),
    getReadingOrderForEvent(slug),
    getEditions(),
  ]);

  const editionTitleMap: Record<string, string> = {};
  for (const e of allEditions) {
    editionTitleMap[e.slug] = e.title;
  }
  if (!event) notFound();

  const eventEditions = await getEditionsForEvent(slug);
  const phases = event.phases || [];

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/events"
        className="inline-flex items-center gap-1 text-sm mb-6 transition-colors hover:text-[var(--accent-red)]"
        style={{ color: "var(--text-tertiary)" }}
      >
        <ArrowLeft size={14} />
        Back to Events
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-bold tracking-tight mb-1"
              style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
            >
              {event.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p
                className="text-sm"
                style={{
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {event.year} &middot; {event.core_issues}
              </p>
              {event.guide_status && (
                <GuideStatusBadge status={event.guide_status} />
              )}
            </div>
          </div>
          <ImportanceBadge level={event.importance} />
        </div>

        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded text-xs"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "0.75rem",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Synopsis */}
      <section
        className="rounded-lg border p-6 mb-4"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
        }}
      >
        <h2
          className="text-lg font-bold tracking-tight mb-3"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          Synopsis
        </h2>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {event.synopsis}
        </p>
      </section>

      {/* Impact */}
      <section
        className="rounded-lg border p-6 mb-4"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
        }}
      >
        <h2
          className="text-lg font-bold tracking-tight mb-3"
          style={{
            fontFamily: "var(--font-bricolage), sans-serif",
            color: "var(--accent-gold)",
          }}
        >
          Impact
        </h2>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {event.impact}
        </p>
      </section>

      {/* Prerequisites & Consequences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {event.prerequisites && (
          <section
            className="rounded-lg border p-5"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-default)",
            }}
          >
            <h3
              className="text-sm font-bold uppercase mb-2"
              style={{ color: "var(--accent-blue)" }}
            >
              Prerequisites
            </h3>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {linkifyEventText(event.prerequisites, allEvents)}
            </p>
          </section>
        )}
        {event.consequences && (
          <section
            className="rounded-lg border p-5"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-default)",
            }}
          >
            <h3
              className="text-sm font-bold uppercase mb-2"
              style={{ color: "var(--accent-purple)" }}
            >
              Consequences
            </h3>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {linkifyEventText(event.consequences, allEvents)}
            </p>
          </section>
        )}
      </div>

      {/* Event Phases */}
      {phases.length > 0 && (
        <EventPhaseTimeline phases={phases} />
      )}

      {/* Issue-by-Issue Reading Order */}
      {readingOrder.length > 0 && (
        <section
          className="rounded-lg border p-6 mb-4"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-default)",
          }}
        >
          <ReadingOrderList entries={readingOrder} editionTitleMap={editionTitleMap} />
        </section>
      )}

      {/* Collected Edition Reading Order */}
      {eventEditions.length > 0 && (
        <section>
          <h2
            className="text-lg font-bold tracking-tight mb-4"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            {readingOrder.length > 0 ? "Collected Editions" : "Reading Order"}
          </h2>
          <div className="space-y-2">
            {eventEditions.map((item, idx) => (
              <Link
                key={item.edition.slug}
                href={`/edition/${item.edition.slug}`}
                className="block group"
              >
                <div
                  className="rounded-lg border p-3 sm:p-4 transition-all hover:border-[var(--accent-red)] hover:shadow-lg hover:shadow-[var(--accent-red)]/5 flex items-center gap-3"
                  style={{
                    background: "var(--bg-secondary)",
                    borderColor: "var(--border-default)",
                    borderLeft: `3px solid ${item.is_core ? "var(--accent-red)" : "var(--border-default)"}`,
                  }}
                >
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: item.is_core
                        ? "var(--accent-red)"
                        : "var(--bg-tertiary)",
                      color: item.is_core ? "#fff" : "var(--text-tertiary)",
                      fontFamily: "var(--font-geist-mono), monospace",
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold group-hover:text-[var(--accent-red)] transition-colors truncate">
                        {item.edition.title}
                      </h4>
                      {item.is_core && (
                        <span
                          className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-bold"
                          style={{
                            background: "var(--accent-red)",
                            color: "#fff",
                            fontFamily: "var(--font-geist-mono), monospace",
                            fontSize: "0.75rem",
                          }}
                        >
                          CORE
                        </span>
                      )}
                    </div>
                    {item.edition.issues_collected && (
                      <p
                        className="text-xs truncate"
                        style={{
                          color: "var(--text-tertiary)",
                          fontFamily: "var(--font-geist-mono), monospace",
                        }}
                      >
                        {item.edition.issues_collected}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      <ImportanceBadge level={item.edition.importance} />
                      <StatusBadge status={item.edition.print_status} />
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    style={{ color: "var(--text-tertiary)" }}
                    className="flex-shrink-0"
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
