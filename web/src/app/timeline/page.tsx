import {
  getErasWithChapters,
  getEraEditionCounts,
  getEssentialEditionsByEra,
} from "@/lib/data";
import Link from "next/link";
import TimelineFlow from "@/components/timeline/TimelineFlow";

export const revalidate = 3600;

export const metadata = {
  title: "The Marvel Reading Timeline",
  description:
    "Your chronological guide through 65 years of Marvel Comics. Browse collected editions era by era, from 1961 to 2026.",
};

export default async function TimelinePage() {
  const [eras, counts, essentialByEra] = await Promise.all([
    getErasWithChapters(),
    getEraEditionCounts(),
    getEssentialEditionsByEra(),
  ]);

  return (
    <div>
      <h1
        className="text-2xl sm:text-3xl font-bold tracking-tight mb-2"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        The Marvel Reading Timeline
      </h1>
      <p
        className="mb-5 max-w-3xl leading-relaxed"
        style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}
      >
        Your chronological guide through 65 years of Marvel Comics. Each era
        lists the collected editions — omnibuses, trades, and hardcovers — you
        need to read, ranked by importance.{" "}
        <Link
          href="/path/absolute-essentials"
          className="underline underline-offset-2 hover:text-[var(--accent-red)] transition-colors"
        >
          Start with the Absolute Essentials path &rarr;
        </Link>
      </p>

      {/* Importance tier legend */}
      <div
        className="flex flex-wrap gap-x-5 gap-y-1.5 mb-6 px-3 py-2.5 rounded-lg text-xs"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-default)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-sm"
            style={{ background: "var(--importance-essential)" }}
          />
          <span style={{ color: "var(--text-primary)" }}>
            <strong>Essential</strong>
            <span style={{ color: "var(--text-secondary)" }}>
              {" "}— Must-reads that define each era
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-sm"
            style={{ background: "var(--importance-recommended)" }}
          />
          <span style={{ color: "var(--text-primary)" }}>
            <strong>Recommended</strong>
            <span style={{ color: "var(--text-secondary)" }}>
              {" "}— Great reads that deepen the story
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-sm"
            style={{ background: "var(--importance-supplemental)" }}
          />
          <span style={{ color: "var(--text-primary)" }}>
            <strong>Supplemental</strong>
            <span style={{ color: "var(--text-secondary)" }}>
              {" "}— For fans who want more context
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-sm"
            style={{ background: "var(--importance-completionist)" }}
          />
          <span style={{ color: "var(--text-primary)" }}>
            <strong>Completionist</strong>
            <span style={{ color: "var(--text-secondary)" }}>
              {" "}— Every collected edition from the era
            </span>
          </span>
        </div>
      </div>

      <TimelineFlow
        eras={eras}
        essentialByEra={essentialByEra}
        counts={counts}
      />
    </div>
  );
}
