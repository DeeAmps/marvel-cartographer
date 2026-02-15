"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import CoverImage from "@/components/ui/CoverImage";
import type { ImportanceLevel, PrintStatus } from "@/lib/types";

interface CalendarEdition {
  slug: string;
  title: string;
  format: string;
  cover_image_url: string | null;
  importance: string;
  print_status: string;
  issue_count: number;
}

export default function CalendarEditionCard({
  edition,
  isWishlisted,
  onToggleWishlist,
  showWishlistButton,
}: {
  edition: CalendarEdition;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
  showWishlistButton: boolean;
}) {
  const formatLabel = edition.format.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div
      className="rounded-lg border p-2 transition-all hover:border-[var(--accent-blue)] group relative"
      style={{
        background: "var(--bg-secondary)",
        borderColor: isWishlisted ? "var(--accent-gold)" : "var(--border-default)",
        borderWidth: isWishlisted ? "2px" : "1px",
      }}
    >
      <Link href={`/edition/${edition.slug}`} className="block">
        <div className="flex items-start gap-2">
          {/* Cover thumbnail */}
          <div
            className="flex-shrink-0 w-10 h-14 rounded overflow-hidden flex items-center justify-center"
            style={{ background: "var(--bg-tertiary)" }}
          >
            <CoverImage
              src={edition.cover_image_url}
              alt={edition.title}
              width={40}
              height={56}
              className="w-full h-full object-cover"
              format={edition.format}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-bold line-clamp-2 group-hover:text-[var(--accent-red)] transition-colors"
              style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
            >
              {edition.title}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-tertiary)",
                  fontSize: "0.65rem",
                }}
              >
                {formatLabel}
              </span>
              <ImportanceBadge level={edition.importance as ImportanceLevel} />
            </div>
          </div>
        </div>
      </Link>

      {/* Wishlist button */}
      {showWishlistButton && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist();
          }}
          className="absolute top-1.5 right-1.5 p-1 rounded-full transition-all hover:scale-110"
          style={{
            background: isWishlisted ? "var(--accent-gold)" : "var(--bg-tertiary)",
            color: isWishlisted ? "#fff" : "var(--text-tertiary)",
          }}
          title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart size={10} fill={isWishlisted ? "#fff" : "none"} />
        </button>
      )}
    </div>
  );
}
