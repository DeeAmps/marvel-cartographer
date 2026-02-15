"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Eye,
  EyeOff,
  BookOpen,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Trophy,
  Filter,
  Check,
  X,
} from "lucide-react";
import type { TriviaQuestion, TriviaCategory, TriviaDifficulty } from "@/lib/types";

const categoryLabels: Record<TriviaCategory, string> = {
  "first-appearances": "First Appearances",
  "deaths-returns": "Deaths & Returns",
  villains: "Villains",
  teams: "Teams",
  cosmic: "Cosmic",
  events: "Events & Crossovers",
  creators: "Creators",
  powers: "Powers & Abilities",
  relationships: "Relationships",
  "weapons-artifacts": "Weapons & Artifacts",
  locations: "Locations",
  "secret-identities": "Secret Identities",
  retcons: "Retcons & Continuity",
  "behind-the-scenes": "Behind the Scenes",
  miscellaneous: "Miscellaneous",
};

const categoryColors: Record<TriviaCategory, string> = {
  "first-appearances": "var(--accent-red)",
  "deaths-returns": "#ff1744",
  villains: "var(--accent-purple)",
  teams: "var(--accent-blue)",
  cosmic: "var(--accent-gold)",
  events: "var(--accent-red)",
  creators: "var(--accent-gold)",
  powers: "var(--accent-green)",
  relationships: "#ff69b4",
  "weapons-artifacts": "#b0bec5",
  locations: "var(--accent-blue)",
  "secret-identities": "var(--accent-purple)",
  retcons: "#ff9800",
  "behind-the-scenes": "var(--text-secondary)",
  miscellaneous: "var(--text-tertiary)",
};

const difficultyColors: Record<TriviaDifficulty, string> = {
  easy: "var(--accent-green)",
  medium: "var(--accent-gold)",
  hard: "var(--accent-red)",
};

type GameMode = "browse" | "quiz";

export default function TriviaGame({
  questions,
}: {
  questions: TriviaQuestion[];
}) {
  const [mode, setMode] = useState<GameMode>("browse");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Quiz mode state
  const [quizQuestions, setQuizQuestions] = useState<TriviaQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizRevealed, setQuizRevealed] = useState(false);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });

  // Browse page state
  const [browsePage, setBrowsePage] = useState(0);
  const ITEMS_PER_PAGE = 20;

  const categories = useMemo(() => {
    const cats = new Set(questions.map((q) => q.category));
    return Array.from(cats).sort();
  }, [questions]);

  const filtered = useMemo(() => {
    let result = questions;
    if (selectedCategory !== "all") {
      result = result.filter((q) => q.category === selectedCategory);
    }
    if (selectedDifficulty !== "all") {
      result = result.filter((q) => q.difficulty === selectedDifficulty);
    }
    return result;
  }, [questions, selectedCategory, selectedDifficulty]);

  const pagedQuestions = useMemo(() => {
    const start = browsePage * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, browsePage]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const toggleReveal = useCallback((id: number) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const startQuiz = useCallback(() => {
    const pool = [...filtered].sort(() => Math.random() - 0.5).slice(0, 20);
    setQuizQuestions(pool);
    setQuizIndex(0);
    setQuizRevealed(false);
    setQuizScore({ correct: 0, total: 0 });
    setMode("quiz");
  }, [filtered]);

  const handleQuizAnswer = useCallback(
    (gotIt: boolean) => {
      setQuizScore((prev) => ({
        correct: prev.correct + (gotIt ? 1 : 0),
        total: prev.total + 1,
      }));
      if (quizIndex < quizQuestions.length - 1) {
        setQuizIndex((prev) => prev + 1);
        setQuizRevealed(false);
      }
    },
    [quizIndex, quizQuestions.length]
  );

  const resetFilters = () => {
    setSelectedCategory("all");
    setSelectedDifficulty("all");
    setBrowsePage(0);
  };

  // Quiz mode
  if (mode === "quiz" && quizQuestions.length > 0) {
    const q = quizQuestions[quizIndex];
    const isFinished = quizScore.total === quizQuestions.length;

    if (isFinished) {
      const pct = Math.round(
        (quizScore.correct / quizScore.total) * 100
      );
      return (
        <div className="max-w-2xl mx-auto text-center py-12">
          <Trophy
            size={48}
            className="mx-auto mb-4"
            style={{
              color:
                pct >= 80
                  ? "var(--accent-gold)"
                  : pct >= 50
                    ? "var(--accent-green)"
                    : "var(--accent-red)",
            }}
          />
          <h2
            className="text-3xl font-bold tracking-tight mb-2"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            Quiz Complete
          </h2>
          <p
            className="text-5xl font-bold mb-2"
            style={{
              fontFamily: "var(--font-bricolage), sans-serif",
              color:
                pct >= 80
                  ? "var(--accent-gold)"
                  : pct >= 50
                    ? "var(--accent-green)"
                    : "var(--accent-red)",
            }}
          >
            {quizScore.correct}/{quizScore.total}
          </p>
          <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
            {pct >= 90
              ? "True Believer! Stan Lee would be proud."
              : pct >= 70
                ? "Solid knowledge! You know your Marvel."
                : pct >= 50
                  ? "Not bad! Keep reading those comics."
                  : "Time to hit the back issues!"}
          </p>
          <p
            className="text-xs mb-6"
            style={{
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {pct}% correct
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={startQuiz}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:scale-105"
              style={{ background: "var(--accent-red)", color: "#fff" }}
            >
              <RotateCcw size={16} /> Play Again
            </button>
            <button
              onClick={() => setMode("browse")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm border transition-colors hover:border-[var(--accent-red)]"
              style={{
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
              }}
            >
              Browse All
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto">
        {/* Quiz header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setMode("browse")}
            className="flex items-center gap-1 text-sm transition-colors hover:text-[var(--accent-red)]"
            style={{ color: "var(--text-tertiary)" }}
          >
            <ChevronLeft size={14} /> Back to Browse
          </button>
          <div
            className="text-sm font-bold"
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              color: "var(--text-secondary)",
            }}
          >
            {quizIndex + 1} / {quizQuestions.length}
          </div>
          <div
            className="text-sm font-bold"
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              color: "var(--accent-gold)",
            }}
          >
            Score: {quizScore.correct}
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="h-1 rounded-full mb-6 overflow-hidden"
          style={{ background: "var(--bg-tertiary)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${((quizIndex + 1) / quizQuestions.length) * 100}%`,
              background: "var(--accent-red)",
            }}
          />
        </div>

        {/* Question card */}
        <div
          className="rounded-lg border p-6 sm:p-8"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-default)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded"
              style={{
                color: categoryColors[q.category as TriviaCategory] || "var(--text-tertiary)",
                border: `1px solid ${categoryColors[q.category as TriviaCategory] || "var(--border-default)"}`,
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.75rem",
              }}
            >
              {categoryLabels[q.category as TriviaCategory] || q.category}
            </span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded"
              style={{
                color: difficultyColors[q.difficulty] || "var(--text-tertiary)",
                border: `1px solid ${difficultyColors[q.difficulty] || "var(--border-default)"}`,
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.75rem",
              }}
            >
              {q.difficulty.toUpperCase()}
            </span>
          </div>

          <h3
            className="text-lg sm:text-xl font-bold mb-6"
            style={{ color: "var(--text-primary)" }}
          >
            {q.question}
          </h3>

          {!quizRevealed ? (
            <button
              onClick={() => setQuizRevealed(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all hover:scale-[1.02]"
              style={{ background: "var(--accent-red)", color: "#fff" }}
            >
              <Eye size={16} /> Reveal Answer
            </button>
          ) : (
            <>
              <div
                className="rounded-lg p-4 mb-4"
                style={{ background: "var(--bg-tertiary)" }}
              >
                <p
                  className="text-sm font-bold mb-2"
                  style={{ color: "var(--accent-gold)" }}
                >
                  {q.answer}
                </p>
                <p
                  className="text-xs flex items-center gap-1"
                  style={{
                    color: "var(--text-tertiary)",
                    fontFamily: "var(--font-geist-mono), monospace",
                  }}
                >
                  <BookOpen size={12} /> {q.source_issue}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleQuizAnswer(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all hover:scale-[1.02]"
                  style={{ background: "var(--accent-green)", color: "#000" }}
                >
                  <Check size={16} /> I Knew It
                </button>
                <button
                  onClick={() => handleQuizAnswer(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm border transition-all hover:scale-[1.02]"
                  style={{
                    borderColor: "var(--accent-red)",
                    color: "var(--accent-red)",
                  }}
                >
                  <X size={16} /> Didn&apos;t Know
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Browse mode
  return (
    <div>
      {/* Mode header */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={startQuiz}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:scale-105"
          style={{ background: "var(--accent-red)", color: "#fff" }}
        >
          <Shuffle size={16} /> Quiz Mode ({Math.min(filtered.length, 20)} Questions)
        </button>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border transition-colors hover:border-[var(--accent-red)]"
          style={{
            borderColor: "var(--border-default)",
            color: "var(--text-secondary)",
          }}
        >
          <Filter size={14} /> Filters
          {(selectedCategory !== "all" || selectedDifficulty !== "all") && (
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "var(--accent-red)" }}
            />
          )}
        </button>
        <span
          className="text-xs"
          style={{
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          {filtered.length} questions
        </span>
      </div>

      {/* Filters */}
      {showFilters && (
        <div
          className="rounded-lg border p-4 mb-6 space-y-4"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-default)",
          }}
        >
          <div>
            <h4
              className="text-xs font-bold mb-2"
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              CATEGORY
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setBrowsePage(0);
                }}
                className="px-3 py-1 rounded text-xs font-bold border transition-colors"
                style={{
                  borderColor:
                    selectedCategory === "all"
                      ? "var(--accent-red)"
                      : "var(--border-default)",
                  color:
                    selectedCategory === "all"
                      ? "var(--accent-red)"
                      : "var(--text-secondary)",
                  background:
                    selectedCategory === "all"
                      ? "var(--bg-tertiary)"
                      : "transparent",
                }}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setBrowsePage(0);
                  }}
                  className="px-3 py-1 rounded text-xs font-bold border transition-colors"
                  style={{
                    borderColor:
                      selectedCategory === cat
                        ? categoryColors[cat as TriviaCategory] || "var(--accent-red)"
                        : "var(--border-default)",
                    color:
                      selectedCategory === cat
                        ? categoryColors[cat as TriviaCategory] || "var(--accent-red)"
                        : "var(--text-secondary)",
                    background:
                      selectedCategory === cat
                        ? "var(--bg-tertiary)"
                        : "transparent",
                  }}
                >
                  {categoryLabels[cat as TriviaCategory] || cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4
              className="text-xs font-bold mb-2"
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              DIFFICULTY
            </h4>
            <div className="flex gap-2">
              {["all", "easy", "medium", "hard"].map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setSelectedDifficulty(d);
                    setBrowsePage(0);
                  }}
                  className="px-3 py-1 rounded text-xs font-bold border transition-colors"
                  style={{
                    borderColor:
                      selectedDifficulty === d
                        ? d === "all"
                          ? "var(--accent-red)"
                          : difficultyColors[d as TriviaDifficulty]
                        : "var(--border-default)",
                    color:
                      selectedDifficulty === d
                        ? d === "all"
                          ? "var(--accent-red)"
                          : difficultyColors[d as TriviaDifficulty]
                        : "var(--text-secondary)",
                    background:
                      selectedDifficulty === d
                        ? "var(--bg-tertiary)"
                        : "transparent",
                  }}
                >
                  {d === "all" ? "All" : d.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {(selectedCategory !== "all" || selectedDifficulty !== "all") && (
            <button
              onClick={resetFilters}
              className="text-xs flex items-center gap-1 transition-colors hover:text-[var(--accent-red)]"
              style={{ color: "var(--text-tertiary)" }}
            >
              <RotateCcw size={12} /> Reset filters
            </button>
          )}
        </div>
      )}

      {/* Questions grid */}
      <div className="space-y-3">
        {pagedQuestions.map((q) => {
          const isRevealed = revealedIds.has(q.id);
          return (
            <div
              key={q.id}
              className="rounded-lg border p-4 sm:p-5 transition-all"
              style={{
                background: "var(--bg-secondary)",
                borderColor: isRevealed
                  ? categoryColors[q.category as TriviaCategory] || "var(--border-default)"
                  : "var(--border-default)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded"
                      style={{
                        color: categoryColors[q.category as TriviaCategory] || "var(--text-tertiary)",
                        border: `1px solid ${categoryColors[q.category as TriviaCategory] || "var(--border-default)"}`,
                        fontFamily: "var(--font-geist-mono), monospace",
                        fontSize: "0.75rem",
                      }}
                    >
                      {categoryLabels[q.category as TriviaCategory] || q.category}
                    </span>
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded"
                      style={{
                        color: difficultyColors[q.difficulty],
                        fontFamily: "var(--font-geist-mono), monospace",
                        fontSize: "0.75rem",
                      }}
                    >
                      {q.difficulty.toUpperCase()}
                    </span>
                    <span
                      className="text-xs"
                      style={{
                        color: "var(--text-tertiary)",
                        fontFamily: "var(--font-geist-mono), monospace",
                        fontSize: "0.75rem",
                      }}
                    >
                      #{q.id}
                    </span>
                  </div>

                  <h3
                    className="text-sm font-bold mb-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {q.question}
                  </h3>

                  {isRevealed && (
                    <div className="mt-3">
                      <p
                        className="text-sm mb-1.5"
                        style={{ color: "var(--accent-gold)" }}
                      >
                        {q.answer}
                      </p>
                      <p
                        className="text-xs flex items-center gap-1"
                        style={{
                          color: "var(--text-tertiary)",
                          fontFamily: "var(--font-geist-mono), monospace",
                        }}
                      >
                        <BookOpen size={11} /> {q.source_issue}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => toggleReveal(q.id)}
                  className="flex-shrink-0 p-2 rounded-lg border transition-colors hover:border-[var(--accent-red)]"
                  style={{
                    borderColor: "var(--border-default)",
                    color: isRevealed
                      ? "var(--accent-red)"
                      : "var(--text-tertiary)",
                  }}
                  aria-label={isRevealed ? "Hide answer" : "Show answer"}
                >
                  {isRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setBrowsePage((p) => Math.max(0, p - 1))}
            disabled={browsePage === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-sm border transition-colors hover:border-[var(--accent-red)] disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              borderColor: "var(--border-default)",
              color: "var(--text-secondary)",
            }}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span
            className="text-xs"
            style={{
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            Page {browsePage + 1} of {totalPages}
          </span>
          <button
            onClick={() =>
              setBrowsePage((p) => Math.min(totalPages - 1, p + 1))
            }
            disabled={browsePage >= totalPages - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-sm border transition-colors hover:border-[var(--accent-red)] disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              borderColor: "var(--border-default)",
              color: "var(--text-secondary)",
            }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
