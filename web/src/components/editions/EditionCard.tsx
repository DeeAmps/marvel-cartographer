import Link from "next/link";
import type { CollectedEdition, InfinityTheme } from "@/lib/types";
import { INFINITY_THEME_META } from "@/lib/types";
import StatusBadge from "@/components/ui/StatusBadge";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import CoverImage from "@/components/ui/CoverImage";
import RatingDisplay from "@/components/ratings/RatingDisplay";

export default function EditionCard({
  edition,
  eraColor,
  connectionCount,
  ratingAverage,
  ratingCount,
  infinityThemes,
}: {
  edition: CollectedEdition;
  eraColor?: string;
  connectionCount?: number;
  ratingAverage?: number;
  ratingCount?: number;
  infinityThemes?: InfinityTheme[];
}) {
  return (
    <Link href={`/edition/${edition.slug}`} className="block group">
      <div
        className="rounded-xl border p-0 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      >
        {/* Era color strip at top */}
        {eraColor && (
          <div
            className="h-1 w-full"
            style={{
              background: `linear-gradient(90deg, ${eraColor}00 0%, ${eraColor} 20%, ${eraColor} 80%, ${eraColor}00 100%)`,
            }}
          />
        )}

        {/* Cover image — dominant, full width */}
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "2/3", maxHeight: 260, background: "var(--bg-tertiary)" }}
        >
          <CoverImage
            src={edition.cover_image_url}
            alt={edition.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            format={edition.format}
          />

          {/* Badges overlaid on cover */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            <ImportanceBadge level={edition.importance} />
          </div>
          <div className="absolute bottom-2 left-2">
            <StatusBadge status={edition.print_status} />
          </div>
        </div>

        {/* Content below cover */}
        <div className="px-4 py-3">
          <h3
            className="text-sm font-semibold leading-tight group-hover:text-[var(--accent-red)] transition-colors line-clamp-2"
            style={{ color: "var(--text-primary)" }}
          >
            {edition.title}
          </h3>

          <p
            className="text-xs mt-1 truncate"
            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.75rem" }}
          >
            {edition.issues_collected}
          </p>

          {edition.creator_names && edition.creator_names.length > 0 && (
            <p className="text-xs mt-1.5 truncate" style={{ color: "var(--text-secondary)" }}>
              {edition.creator_names.slice(0, 3).join(", ")}
            </p>
          )}

          {ratingAverage != null && ratingCount != null && ratingCount > 0 && (
            <div className="mt-1.5">
              <RatingDisplay average={ratingAverage} count={ratingCount} />
            </div>
          )}

          {connectionCount != null && connectionCount > 0 && (
            <p
              className="text-xs mt-1.5"
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.75rem",
              }}
            >
              {connectionCount} connection{connectionCount !== 1 ? "s" : ""}
            </p>
          )}

          {infinityThemes && infinityThemes.length > 0 && (
            <div className="flex gap-1 mt-1.5">
              {infinityThemes.map((theme) => {
                const meta = INFINITY_THEME_META[theme];
                return (
                  <div
                    key={theme}
                    className="w-3 h-3 rounded-full"
                    title={meta.label}
                    style={{
                      background: `radial-gradient(circle at 40% 40%, ${meta.color}, color-mix(in srgb, ${meta.color} 60%, #000))`,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
