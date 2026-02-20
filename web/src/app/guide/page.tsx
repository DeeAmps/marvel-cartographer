"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Loader2, Search, Sparkles } from "lucide-react";

const SUGGESTIONS = [
  { label: "Thanos", description: "The Mad Titan's full arc" },
  { label: "Doctor Doom", description: "Marvel's greatest villain" },
  { label: "X-Men", description: "Mutant saga from Giant-Size to Krakoa" },
  { label: "Spider-Man", description: "The wall-crawler's essential reads" },
  { label: "Infinity Gauntlet", description: "The cosmic event" },
  { label: "Civil War", description: "Hero vs hero" },
  { label: "Cosmic Marvel", description: "Annihilation through Secret Wars" },
  { label: "Daredevil", description: "The Man Without Fear" },
  { label: "Fantastic Four", description: "Marvel's First Family" },
  { label: "Jonathan Hickman", description: "The grand architect's saga" },
];

export default function GuideIndexPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function navigate(path: string) {
    setLoading(true);
    router.push(path);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/guide/${encodeURIComponent(trimmed)}`);
    }
  }

  function handleSuggestion(label: string) {
    navigate(`/guide/${encodeURIComponent(label)}`);
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <section className="text-center py-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <BookOpen size={24} style={{ color: "var(--accent-gold)" }} />
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            Auto Reading Guides
          </h1>
        </div>
        <p
          className="text-sm max-w-md mx-auto"
          style={{ color: "var(--text-secondary)" }}
        >
          Enter a character, team, event, or creator and we&apos;ll generate a
          tiered reading guide — Essential, Recommended, and Completionist.
        </p>
      </section>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="relative">
        <div
          className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors focus-within:border-[var(--accent-gold)]"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-default)",
          }}
        >
          <Search size={20} style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Thanos, X-Men, Civil War, Hickman..."
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: "var(--text-primary)" }}
            autoFocus
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="px-4 py-1.5 rounded-lg text-sm font-bold transition-opacity disabled:opacity-30"
            style={{
              background: "var(--accent-gold)",
              color: "#000",
            }}
          >
            {loading ? (
              <Loader2 size={14} className="inline mr-1 animate-spin" />
            ) : (
              <Sparkles size={14} className="inline mr-1" />
            )}
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </form>

      {/* Suggestions */}
      <div>
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: "var(--text-tertiary)" }}
        >
          Popular Guides
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => handleSuggestion(s.label)}
              disabled={loading}
              className="text-left px-3 py-3 rounded-lg border transition-colors disabled:opacity-50"
              style={{
                background: "var(--bg-secondary)",
                borderColor: "var(--border-default)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent-gold)";
                e.currentTarget.style.background = "var(--bg-tertiary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default)";
                e.currentTarget.style.background = "var(--bg-secondary)";
              }}
            >
              <div
                className="text-sm font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {s.label}
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {s.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
