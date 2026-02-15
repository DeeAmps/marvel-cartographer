"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, Star, AlertCircle, Check, X, LogIn, Loader2, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useCollection";

interface VerdictData {
  rating: number;
  one_sentence: string;
  who_for: string[];
  who_skip: string[];
  continuity_impact: number;
  continuity_sets_up: string[];
  continuity_changes: string[];
  value_per_issue: string;
  value_verdict: string;
  deep_cut: string;
  prerequisites: string[];
}

interface Props {
  editionSlug: string;
  editionTitle: string;
  coverPrice?: number;
  issueCount: number;
}

export default function WatcherVerdict({ editionSlug, editionTitle, coverPrice, issueCount }: Props) {
  const { user, session } = useAuth();
  const { items } = useCollection();
  const [verdict, setVerdict] = useState<VerdictData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!session || fetched) return;

    const fetchVerdict = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/watcher/verdict", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ editionSlug }),
        });

        if (!response.ok) {
          const data = await response.json();
          if (response.status === 429) {
            setError("Rate limit reached. Verdict will be available later.");
          } else {
            setError(data.error || "Failed to load verdict");
          }
          return;
        }

        const data = await response.json();
        setVerdict(data.verdict);
      } catch {
        setError("Failed to connect");
      } finally {
        setLoading(false);
        setFetched(true);
      }
    };

    fetchVerdict();
  }, [session, editionSlug, fetched]);

  // Owned edition slugs for prerequisite checking
  const ownedSlugs = new Set(items.map((i) => i.edition_slug));

  // Not logged in — show CTA
  if (!user) {
    return (
      <section
        className="rounded-lg border p-6 mt-4"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Eye size={18} style={{ color: "var(--accent-purple)" }} />
          <h2
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            The Watcher&apos;s Verdict
          </h2>
        </div>
        <p className="text-sm mb-3" style={{ color: "var(--text-tertiary)" }}>
          Get an AI-powered review with personalized prerequisite tracking.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
          style={{ background: "var(--accent-purple)", color: "#fff" }}
        >
          <LogIn size={14} />
          Sign in for personalized verdicts
        </Link>
      </section>
    );
  }

  // Loading skeleton
  if (loading) {
    return (
      <section
        className="rounded-lg border p-6 mt-4"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--accent-purple)",
          borderWidth: "1px",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Eye size={18} style={{ color: "var(--accent-purple)" }} />
          <h2
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            The Watcher&apos;s Verdict
          </h2>
          <Loader2 size={14} className="animate-spin ml-auto" style={{ color: "var(--accent-purple)" }} />
        </div>
        <div className="space-y-3">
          <div className="h-4 rounded animate-pulse" style={{ background: "var(--bg-tertiary)", width: "80%" }} />
          <div className="h-4 rounded animate-pulse" style={{ background: "var(--bg-tertiary)", width: "60%" }} />
          <div className="h-4 rounded animate-pulse" style={{ background: "var(--bg-tertiary)", width: "70%" }} />
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section
        className="rounded-lg border p-6 mt-4"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Eye size={18} style={{ color: "var(--accent-purple)" }} />
          <h2
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            The Watcher&apos;s Verdict
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle size={14} style={{ color: "var(--text-tertiary)" }} />
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            {error}
          </p>
        </div>
      </section>
    );
  }

  if (!verdict) return null;

  // Render stars
  const stars = Array.from({ length: 5 }, (_, i) => i < verdict.rating);

  return (
    <section
      className="rounded-lg border p-6 mt-4"
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--accent-purple)",
        borderWidth: "1px",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Eye size={18} style={{ color: "var(--accent-purple)" }} />
        <h2
          className="text-lg font-bold tracking-tight"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          The Watcher&apos;s Verdict
        </h2>
        <div className="ml-auto flex items-center gap-0.5">
          {stars.map((filled, i) => (
            <Star
              key={i}
              size={16}
              fill={filled ? "var(--accent-gold)" : "none"}
              style={{ color: filled ? "var(--accent-gold)" : "var(--text-tertiary)" }}
            />
          ))}
        </div>
      </div>

      {/* One sentence */}
      <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-primary)" }}>
        {verdict.one_sentence}
      </p>

      {/* Who For / Who Skip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <h3 className="text-xs font-bold uppercase mb-1.5" style={{ color: "var(--accent-green)" }}>
            Read this if you...
          </h3>
          <ul className="space-y-1">
            {verdict.who_for.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--accent-green)" }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase mb-1.5" style={{ color: "var(--accent-red)" }}>
            Skip if you...
          </h3>
          <ul className="space-y-1">
            {verdict.who_skip.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                <X size={12} className="flex-shrink-0 mt-0.5" style={{ color: "var(--accent-red)" }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Continuity Impact */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Zap size={14} style={{ color: "var(--accent-gold)" }} />
          <h3 className="text-xs font-bold uppercase" style={{ color: "var(--accent-gold)" }}>
            Continuity Impact: {verdict.continuity_impact}/10
          </h3>
        </div>
        <div className="flex gap-0.5 mb-2">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{
                background:
                  i < verdict.continuity_impact
                    ? "var(--accent-gold)"
                    : "var(--bg-tertiary)",
              }}
            />
          ))}
        </div>
        {verdict.continuity_sets_up.length > 0 && (
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Sets up: {verdict.continuity_sets_up.join(", ")}
          </p>
        )}
        {verdict.continuity_changes.length > 0 && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Changes: {verdict.continuity_changes.join(", ")}
          </p>
        )}
      </div>

      {/* Value Analysis */}
      {coverPrice && issueCount > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase mb-1" style={{ color: "var(--accent-blue)" }}>
            Value Analysis
          </h3>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {verdict.value_per_issue} per issue &mdash; {verdict.value_verdict}
          </p>
        </div>
      )}

      {/* Prerequisites with collection overlay */}
      {verdict.prerequisites.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase mb-1.5" style={{ color: "var(--text-tertiary)" }}>
            Prerequisites
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {verdict.prerequisites.map((prereq, i) => {
              // Try to match prerequisite title to a slug in the collection
              const prereqSlug = prereq
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, "")
                .replace(/\s+/g, "-");
              const isOwned = ownedSlugs.has(prereqSlug);

              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
                  style={{
                    background: "var(--bg-tertiary)",
                    color: isOwned ? "var(--accent-green)" : "var(--text-secondary)",
                    border: isOwned ? "1px solid var(--accent-green)" : "1px solid var(--border-default)",
                  }}
                >
                  {isOwned ? <Check size={10} /> : <X size={10} style={{ color: "var(--accent-red)" }} />}
                  {prereq}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Deep Cut */}
      {verdict.deep_cut && (
        <div
          className="rounded-lg p-3"
          style={{ background: "var(--bg-tertiary)" }}
        >
          <h3 className="text-xs font-bold uppercase mb-1" style={{ color: "var(--accent-purple)" }}>
            Deep Cut
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {verdict.deep_cut}
          </p>
        </div>
      )}
    </section>
  );
}
