"use client";

import { useState } from "react";
import Link from "next/link";
import type { CollectedEdition } from "@/lib/types";
import ImportanceBadge from "@/components/ui/ImportanceBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import CoverImage from "@/components/ui/CoverImage";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function GuideTierSection({
  title,
  color,
  editions,
  defaultOpen = true,
}: {
  title: string;
  color: string;
  editions: CollectedEdition[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (editions.length === 0) return null;

  return (
    <section
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: `color-mix(in srgb, ${color} 30%, var(--border-default))` }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors"
        style={{ background: `color-mix(in srgb, ${color} 8%, var(--bg-secondary))` }}
      >
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ background: color }} />
          <h3
            className="text-base font-bold"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            {title}
          </h3>
          <span
            className="text-xs font-bold"
            style={{ color, fontFamily: "var(--font-geist-mono), monospace" }}
          >
            {editions.length} edition{editions.length !== 1 ? "s" : ""}
          </span>
        </div>
        {open ? <ChevronUp size={16} style={{ color: "var(--text-tertiary)" }} /> : <ChevronDown size={16} style={{ color: "var(--text-tertiary)" }} />}
      </button>

      {open && (
        <div className="divide-y" style={{ borderColor: "var(--border-default)" }}>
          {editions.map((edition, i) => (
            <Link
              key={edition.slug}
              href={`/edition/${edition.slug}`}
              className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-[var(--bg-tertiary)] group"
              style={{ background: "var(--bg-secondary)" }}
            >
              <span
                className="text-xs font-bold mt-1 w-6 text-center shrink-0"
                style={{ color, fontFamily: "var(--font-geist-mono), monospace" }}
              >
                {i + 1}
              </span>
              <CoverImage
                src={edition.cover_image_url}
                alt={edition.title}
                width={40}
                height={60}
                className="rounded flex-shrink-0 object-cover"
                loading="lazy"
                format={edition.format}
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold group-hover:text-[var(--accent-red)] transition-colors">
                  {edition.title}
                </h4>
                <p
                  className="text-xs mt-0.5 truncate"
                  style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
                >
                  {edition.issues_collected}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <ImportanceBadge level={edition.importance} />
                  <StatusBadge status={edition.print_status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
