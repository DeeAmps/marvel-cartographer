"use client";

import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto text-center py-16">
      <AlertTriangle
        size={64}
        className="mx-auto mb-6"
        style={{ color: "var(--accent-red)" }}
      />
      <h1
        className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        Something Went Wrong
      </h1>
      <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
        A continuity error occurred in our timeline.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 rounded-lg text-sm font-bold transition-all hover:scale-105"
        style={{ background: "var(--accent-red)", color: "#fff" }}
      >
        Try Again
      </button>
    </div>
  );
}
