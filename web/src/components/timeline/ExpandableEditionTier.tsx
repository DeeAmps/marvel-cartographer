"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { CollectedEdition } from "@/lib/types";
import { getExpandedEraEditions } from "@/app/timeline/actions";
import CoverImage from "@/components/ui/CoverImage";

const IMPORTANCE_CONFIG: Record<string, { label: string; color: string }> = {
  essential: { label: "Essential", color: "var(--importance-essential)" },
  recommended: { label: "Rec'd", color: "var(--importance-recommended)" },
  supplemental: { label: "Supp.", color: "var(--importance-supplemental)" },
  completionist: { label: "Comp.", color: "var(--importance-completionist)" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  in_print: { label: "In Print", color: "var(--status-in-print)" },
  out_of_print: { label: "OOP", color: "var(--status-out-of-print)" },
  upcoming: { label: "Soon", color: "var(--status-upcoming)" },
  digital_only: { label: "Digital", color: "var(--status-digital)" },
  ongoing: { label: "Ongoing", color: "var(--status-ongoing)" },
};

function CompactEditionCard({ edition }: { edition: CollectedEdition }) {
  const importance = IMPORTANCE_CONFIG[edition.importance] || IMPORTANCE_CONFIG.completionist;
  const status = STATUS_CONFIG[edition.print_status] || STATUS_CONFIG.in_print;

  return (
    <Link
      href={`/edition/${edition.slug}`}
      className="flex-shrink-0 group"
      style={{ width: 110 }}
    >
      <div
        className="rounded-lg border overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
        }}
      >
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "2/3", maxHeight: 160, background: "var(--bg-tertiary)" }}
        >
          <CoverImage
            src={edition.cover_image_url}
            alt={edition.title}
            fill
            sizes="110px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            format={edition.format}
          />
          {(edition.importance === "essential" || edition.importance === "recommended") && (
            <span
              className="absolute top-1 right-1 px-1 py-px rounded text-white font-semibold leading-none"
              style={{
                fontSize: "0.55rem",
                backgroundColor: importance.color,
              }}
            >
              {importance.label}
            </span>
          )}
        </div>
        <div className="px-1.5 py-1.5">
          <p
            className="font-medium leading-tight line-clamp-2 group-hover:text-[var(--accent-red)] transition-colors"
            style={{ color: "var(--text-primary)", fontSize: "0.6rem" }}
          >
            {edition.title}
          </p>
          <span
            className="inline-block mt-0.5 font-medium leading-none"
            style={{ color: status.color, fontSize: "0.5rem" }}
          >
            {status.label}
          </span>
        </div>
      </div>
    </Link>
  );
}

interface Props {
  eraSlug: string;
  importance: "recommended" | "supplemental" | "completionist";
  count: number;
}

const TIER_LABELS: Record<string, { label: string; description: string }> = {
  recommended: {
    label: "recommended",
    description: "great reads that deepen the story",
  },
  supplemental: {
    label: "supplemental",
    description: "more context for dedicated fans",
  },
  completionist: {
    label: "completionist",
    description: "every collected edition from this era",
  },
};

export default function ExpandableEditionTier({ eraSlug, importance, count }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editions, setEditions] = useState<CollectedEdition[]>([]);
  const [isPending, startTransition] = useTransition();

  if (count === 0) return null;

  const handleExpand = () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    startTransition(async () => {
      const data = await getExpandedEraEditions(eraSlug, importance);
      setEditions(data);
      setExpanded(true);
    });
  };

  return (
    <div className="mt-3">
      <button
        onClick={handleExpand}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:shadow-sm cursor-pointer disabled:opacity-50"
        style={{
          background: "var(--bg-tertiary)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border-default)",
        }}
      >
        {isPending ? (
          <>
            <Loader2 className="animate-spin" size={12} />
            Loading...
          </>
        ) : expanded ? (
          `− Hide ${count} ${TIER_LABELS[importance].label} editions`
        ) : (
          <>
            + {count} {TIER_LABELS[importance].label} editions
            <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>
              {" "}— {TIER_LABELS[importance].description}
            </span>
          </>
        )}
      </button>

      {expanded && editions.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-thin flex-wrap">
          {editions.map((edition) => (
            <CompactEditionCard key={edition.slug} edition={edition} />
          ))}
        </div>
      )}
    </div>
  );
}
