import Link from "next/link";
import type { MCUComicMapping } from "@/lib/types";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import CoverImage from "@/components/ui/CoverImage";

const mappingTypeLabels: Record<string, { label: string; color: string }> = {
  direct_adaptation: { label: "Direct Adaptation", color: "var(--accent-red)" },
  loose_inspiration: { label: "Loose Inspiration", color: "var(--accent-gold)" },
  character_origin: { label: "Character Origin", color: "var(--accent-blue)" },
};

export default function ComicSourceList({ mappings }: { mappings: MCUComicMapping[] }) {
  if (mappings.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
        No comic source mappings for this entry yet.
      </p>
    );
  }

  // Sort: direct_adaptation first, then by faithfulness
  const sorted = [...mappings].sort((a, b) => {
    const typeOrder = { direct_adaptation: 0, loose_inspiration: 1, character_origin: 2 };
    const aOrder = typeOrder[a.mapping_type] ?? 2;
    const bOrder = typeOrder[b.mapping_type] ?? 2;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (b.faithfulness || 0) - (a.faithfulness || 0);
  });

  return (
    <div className="space-y-3">
      {sorted.map((mapping) => {
        const meta = mappingTypeLabels[mapping.mapping_type] || { label: mapping.mapping_type, color: "var(--text-tertiary)" };
        return (
          <Link
            key={mapping.id}
            href={`/edition/${mapping.edition_slug}`}
            className="block group"
          >
            <div
              className="rounded-lg border p-3 transition-all hover:border-[var(--accent-red)] hover:shadow-lg hover:shadow-[var(--accent-red)]/5"
              style={{ background: "var(--bg-tertiary)", borderColor: "var(--border-default)" }}
            >
              <div className="flex items-start gap-3">
                {mapping.edition_cover_image_url && (
                  <CoverImage
                    src={mapping.edition_cover_image_url}
                    alt={mapping.edition_title || ""}
                    width={48}
                    height={72}
                    className="rounded flex-shrink-0 object-cover"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold group-hover:text-[var(--accent-red)] transition-colors">
                    {mapping.edition_title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className="px-1.5 py-0.5 rounded text-xs font-bold"
                      style={{
                        background: `color-mix(in srgb, ${meta.color} 15%, transparent)`,
                        color: meta.color,
                        fontSize: "0.6rem",
                      }}
                    >
                      {meta.label}
                    </span>
                    {mapping.edition_importance && (
                      <ImportanceBadge level={mapping.edition_importance} />
                    )}
                    {mapping.faithfulness != null && (
                      <span
                        className="text-xs"
                        style={{
                          color: "var(--text-tertiary)",
                          fontFamily: "var(--font-geist-mono), monospace",
                          fontSize: "0.7rem",
                        }}
                      >
                        {mapping.faithfulness}% faithful
                      </span>
                    )}
                  </div>
                  {mapping.notes && (
                    <p className="text-xs mt-1.5 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                      {mapping.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
