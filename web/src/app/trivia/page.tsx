import { getTrivia } from "@/lib/data";
import TriviaGame from "@/components/trivia/TriviaGame";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const revalidate = 3600;

export const metadata = {
  title: "Marvel Trivia — 500+ Questions",
  description:
    "Test your Marvel Comics knowledge with 500+ trivia questions. Each answer includes the exact comic issue where you can find it.",
};

export default async function TriviaPage() {
  const questions = await getTrivia();

  const categoryStats = questions.reduce(
    (acc, q) => {
      acc[q.category] = (acc[q.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const difficultyStats = questions.reduce(
    (acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm mb-6 transition-colors hover:text-[var(--accent-red)]"
        style={{ color: "var(--text-tertiary)" }}
      >
        <ArrowLeft size={14} />
        Back to Home
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight mb-2"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          Marvel Trivia
        </h1>
        <p
          className="text-sm mb-4"
          style={{ color: "var(--text-secondary)" }}
        >
          {questions.length}+ questions spanning 65 years of Marvel Comics
          history. Every answer includes the exact comic issue where you can
          find it.
        </p>

        {/* Stats bar */}
        <div className="flex flex-wrap gap-3">
          <span
            className="text-xs px-2 py-1 rounded"
            style={{
              color: "var(--accent-red)",
              border: "1px solid var(--accent-red)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {questions.length} QUESTIONS
          </span>
          <span
            className="text-xs px-2 py-1 rounded"
            style={{
              color: "var(--accent-gold)",
              border: "1px solid var(--accent-gold)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {Object.keys(categoryStats).length} CATEGORIES
          </span>
          <span
            className="text-xs px-2 py-1 rounded"
            style={{
              color: "var(--accent-green)",
              border: "1px solid var(--accent-green)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {difficultyStats.easy || 0} EASY
          </span>
          <span
            className="text-xs px-2 py-1 rounded"
            style={{
              color: "var(--accent-gold)",
              border: "1px solid var(--accent-gold)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {difficultyStats.medium || 0} MEDIUM
          </span>
          <span
            className="text-xs px-2 py-1 rounded"
            style={{
              color: "var(--accent-red)",
              border: "1px solid var(--accent-red)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {difficultyStats.hard || 0} HARD
          </span>
        </div>
      </div>

      <TriviaGame questions={questions} />
    </div>
  );
}
