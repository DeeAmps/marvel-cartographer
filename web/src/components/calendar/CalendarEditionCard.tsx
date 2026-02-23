"use client";

import Link from "next/link";
import { Heart, Calendar } from "lucide-react";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import CoverImage from "@/components/ui/CoverImage";
import type { CollectedEdition, ImportanceLevel } from "@/lib/types";

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
};

function formatReleaseDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return null;
  }
}

export default function CalendarEditionCard({
  edition,
  isWishlisted,
  onToggleWishlist,
  showWishlistButton,
}: {
  edition: CollectedEdition;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
  showWishlistButton: boolean;
}) {
  const formatLabel = FORMAT_LABELS[edition.format] || edition.format;
  const status = STATUS_CONFIG[edition.print_status] || STATUS_CONFIG.in_print;
  const releaseLabel = formatReleaseDate(edition.release_date);

  return (
    <div className="relative group">
      <Link
        href={`/edition/${edition.slug}`}
        className="block rounded-lg border transition-all hover:shadow-md hover:-translate-y-0.5"
        style={{
          background: "var(--bg-secondary)",
          borderColor: isWishlisted ? "var(--accent-gold)" : "var(--border-default)",
          borderWidth: isWishlisted ? "2px" : "1px",
        }}
      >
        {/* Cover image */}
        <div className="relative">
          <div
            className="relative w-full overflow-hidden rounded-t-lg"
            style={{
              aspectRatio: "2/3",
              maxHeight: 260,
              background: "var(--bg-tertiary)",
            }}
          >
            <CoverImage
              src={edition.cover_image_url}
              alt={edition.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              format={edition.format}
            />
          </div>

          {/* Status badge overlay */}
          <span
            className="absolute top-2 left-2 px-1.5 py-0.5 rounded font-bold text-white shadow"
            style={{
              fontSize: "0.6rem",
              background: status.color,
            }}
          >
            {status.label}
          </span>
        </div>

        {/* Card body */}
        <div className="px-2.5 py-2">
          {/* Release date */}
          {releaseLabel && (
            <div
              className="flex items-center gap-1 mb-1.5"
              style={{ color: "var(--accent-purple)" }}
            >
              <Calendar size={10} />
              <span
                className="font-bold"
                style={{
                  fontSize: "0.65rem",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {releaseLabel}
              </span>
            </div>
          )}

          {/* Title */}
          <p
            className="font-semibold leading-snug group-hover:text-[var(--accent-red)] transition-colors line-clamp-2"
            style={{
              color: "var(--text-primary)",
              fontSize: "0.8rem",
              fontFamily: "var(--font-bricolage), sans-serif",
            }}
          >
            {edition.title}
          </p>

          {/* Format + Importance */}
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
            <ImportanceBadge level={edition.importance as ImportanceLevel} />
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

          {/* Price */}
          {edition.cover_price && (
            <p
              className="mt-1"
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.6rem",
              }}
            >
              ${edition.cover_price.toFixed(2)}
            </p>
          )}
        </div>
      </Link>

      {/* Wishlist button */}
      {showWishlistButton && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist();
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full transition-all hover:scale-110 shadow z-10"
          style={{
            background: isWishlisted ? "var(--accent-gold)" : "rgba(0,0,0,0.6)",
            color: isWishlisted ? "#fff" : "var(--text-secondary)",
          }}
          title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart size={14} fill={isWishlisted ? "#fff" : "none"} />
        </button>
      )}
    </div>
  );
}
