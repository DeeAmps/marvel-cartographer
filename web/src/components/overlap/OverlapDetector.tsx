"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Layers, AlertCircle, Check } from "lucide-react";

interface OverlapPair {
  edition_a: string;
  edition_b: string;
  edition_a_title: string;
  edition_b_title: string;
  shared_issues: string[];
}

interface OverlapDetectorProps {
  editionSlug: string;
  editionTitle: string;
  relatedSlugs: string[];
}

export default function OverlapDetector({
  editionSlug,
  editionTitle,
  relatedSlugs,
}: OverlapDetectorProps) {
  const [overlaps, setOverlaps] = useState<OverlapPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function checkOverlaps() {
      if (relatedSlugs.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const allSlugs = [editionSlug, ...relatedSlugs];
        const res = await fetch(
          `/api/graph?action=overlap&editions=${allSlugs.join(",")}`
        );
        if (res.ok) {
          const data = await res.json();
          // Filter to only show overlaps involving this edition
          const relevant = (data.overlaps || []).filter(
            (o: OverlapPair) =>
              o.edition_a === editionSlug || o.edition_b === editionSlug
          );
          setOverlaps(relevant);
        }
      } catch {
        // Fallback: fetch edition_issues.json directly
        try {
          const res = await fetch("/api/graph?action=overlap-local&edition=" + editionSlug);
          if (res.ok) {
            const data = await res.json();
            setOverlaps(data.overlaps || []);
          }
        } catch {
          // Silent fail
        }
      }
      setLoading(false);
    }
    checkOverlaps();
  }, [editionSlug, relatedSlugs]);

  if (loading) return null;
  if (overlaps.length === 0) {
    return (
      <div
        className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
        style={{ background: "var(--bg-secondary)", color: "var(--accent-green)" }}
      >
        <Check size={14} />
        No issue overlap detected with connected editions
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--accent-gold)" + "40" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Layers size={16} style={{ color: "var(--accent-gold)" }} />
        <span className="text-sm font-bold" style={{ color: "var(--accent-gold)" }}>
          Issue Overlap Detected
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-mono ml-auto"
          style={{ background: "var(--accent-gold)" + "20", color: "var(--accent-gold)" }}
        >
          {overlaps.reduce((sum, o) => sum + o.shared_issues.length, 0)} shared issues
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {overlaps.map((overlap, idx) => {
            const otherSlug =
              overlap.edition_a === editionSlug ? overlap.edition_b : overlap.edition_a;
            const otherTitle =
              overlap.edition_a === editionSlug
                ? overlap.edition_b_title
                : overlap.edition_a_title;
            return (
              <div
                key={idx}
                className="rounded border p-3"
                style={{ borderColor: "var(--border-default)" }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      Overlaps with:
                    </div>
                    <Link
                      href={`/edition/${otherSlug}`}
                      className="text-sm font-bold hover:text-[var(--accent-red)] transition-colors"
                    >
                      {otherTitle}
                    </Link>
                  </div>
                  <AlertCircle size={14} style={{ color: "var(--accent-gold)" }} className="flex-shrink-0 mt-1" />
                </div>
                <div className="flex flex-wrap gap-1">
                  {overlap.shared_issues.slice(0, 10).map((issue) => (
                    <span
                      key={issue}
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: "var(--bg-tertiary)",
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-geist-mono), monospace",
                      }}
                    >
                      {issue}
                    </span>
                  ))}
                  {overlap.shared_issues.length > 10 && (
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      +{overlap.shared_issues.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            If you already own an edition listed above, you may not need this volume for those specific issues.
          </p>
        </div>
      )}
    </div>
  );
}
