"use client";

import Link from "next/link";
import type { CollectedEdition } from "@/lib/types";
import CoverImage from "@/components/ui/CoverImage";

const FORMAT_LABELS: Record<string, string> = {
  omnibus: "Omnibus",
  epic_collection: "Epic Collection",
  trade_paperback: "Trade Paperback",
  hardcover: "Hardcover",
  masterworks: "Masterworks",
  compendium: "Compendium",
  complete_collection: "Complete Collection",
  oversized_hardcover: "Oversized HC",
  premier_collection: "Premier Collection",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  in_print: { label: "In Print", color: "var(--status-in-print)" },
  out_of_print: { label: "Out of Print", color: "var(--status-out-of-print)" },
  upcoming: { label: "Upcoming", color: "var(--status-upcoming)" },
  digital_only: { label: "Digital Only", color: "var(--status-digital)" },
  ongoing: { label: "Ongoing", color: "var(--status-ongoing)" },
  check_availability: { label: "Check Availability", color: "var(--text-tertiary)" },
};

interface Props {
  editions: CollectedEdition[];
  eraColor: string;
  eraYears: string;
}

export default function EssentialPath({ editions, eraColor, eraYears }: Props) {
  if (editions.length === 0) {
    return (
      <p className="text-sm italic py-4" style={{ color: "var(--text-tertiary)" }}>
        No essential editions in this era.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto pb-3 scrollbar-thin">
      <div className="flex gap-3" style={{ minWidth: "max-content" }}>
        {editions.map((edition, i) => {
          const formatLabel = FORMAT_LABELS[edition.format] || edition.format;
          const status = STATUS_CONFIG[edition.print_status] || STATUS_CONFIG.in_print;

          return (
            <Link
              key={edition.slug}
              href={`/edition/${edition.slug}`}
              className="group flex-shrink-0 rounded-lg border transition-all hover:shadow-md hover:-translate-y-0.5"
              style={{
                width: 180,
                background: "var(--bg-secondary)",
                borderColor: "var(--border-default)",
              }}
            >
              {/* Reading order badge */}
              <div className="relative">
                <div
                  className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full flex items-center justify-center text-white font-bold shadow"
                  style={{ background: eraColor, fontSize: "0.65rem" }}
                >
                  {i + 1}
                </div>

                {/* Cover image */}
                <div
                  className="relative w-full overflow-hidden rounded-t-lg"
                  style={{
                    aspectRatio: "2/3",
                    maxHeight: 240,
                    background: "var(--bg-tertiary)",
                  }}
                >
                  <CoverImage
                    src={edition.cover_image_url}
                    alt={edition.title}
                    fill
                    sizes="180px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    format={edition.format}
                  />
                </div>
              </div>

              {/* Card body */}
              <div className="px-2.5 py-2">
                {/* Title */}
                <p
                  className="font-semibold leading-snug group-hover:text-[var(--accent-red)] transition-colors line-clamp-2"
                  style={{ color: "var(--text-primary)", fontSize: "0.8rem" }}
                >
                  {edition.title}
                </p>

                {/* Format + Status */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  <span
                    className="px-1.5 py-0.5 rounded font-medium"
                    style={{
                      fontSize: "0.6rem",
                      background: "var(--bg-tertiary)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    {formatLabel}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded font-medium"
                    style={{
                      fontSize: "0.6rem",
                      color: status.color,
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    {status.label}
                  </span>
                </div>

                {/* Issues collected */}
                {edition.issues_collected && (
                  <p
                    className="mt-1.5 leading-snug line-clamp-2"
                    style={{
                      color: "var(--text-tertiary)",
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: "0.6rem",
                    }}
                  >
                    {edition.issues_collected}
                  </p>
                )}

                {/* Published years */}
                <p
                  className="mt-1"
                  style={{
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "0.55rem",
                  }}
                >
                  Published {eraYears}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
