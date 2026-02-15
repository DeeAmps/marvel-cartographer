"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRatings } from "@/hooks/useRatings";
import Link from "next/link";

export default function RatingInput({ editionId }: { editionId: string }) {
  const { user } = useAuth();
  const { userRating, stats, submitRating } = useRatings(editionId);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(userRating?.rating ?? 0);
  const [review, setReview] = useState(userRating?.review ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Sync when userRating loads
  if (userRating && selectedRating === 0) {
    setSelectedRating(userRating.rating);
    if (userRating.review) setReview(userRating.review);
  }

  if (!user) {
    return (
      <div
        className="rounded-lg border p-4"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={18} style={{ color: "var(--text-tertiary)" }} />
            ))}
          </div>
          <Link
            href="/login"
            className="text-xs font-medium transition-colors hover:text-[var(--accent-red)]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Sign in to rate
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (selectedRating === 0) return;
    setSubmitting(true);
    await submitRating(selectedRating, review || undefined);
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  };

  const displayRating = hoverRating || selectedRating;

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
    >
      <h3
        className="text-sm font-bold mb-3 flex items-center gap-2"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        <Star size={16} style={{ color: "var(--accent-gold)" }} />
        {userRating ? "Your Rating" : "Rate This Edition"}
      </h3>

      <div className="flex items-center gap-2 mb-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            onMouseEnter={() => setHoverRating(i)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setSelectedRating(i)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              size={24}
              fill={i <= displayRating ? "var(--accent-gold)" : "transparent"}
              style={{
                color: i <= displayRating ? "var(--accent-gold)" : "var(--text-tertiary)",
              }}
            />
          </button>
        ))}
        {selectedRating > 0 && (
          <span
            className="text-xs ml-2 font-bold"
            style={{ color: "var(--accent-gold)", fontFamily: "var(--font-geist-mono), monospace" }}
          >
            {selectedRating}/5
          </span>
        )}
      </div>

      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value.slice(0, 280))}
        placeholder="Short review (optional, 280 chars max)"
        rows={2}
        className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1"
        style={{
          background: "var(--bg-tertiary)",
          borderColor: "var(--border-default)",
          color: "var(--text-primary)",
        }}
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {review.length}/280
        </span>
        <button
          onClick={handleSubmit}
          disabled={selectedRating === 0 || submitting}
          className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
          style={{
            background: submitted ? "var(--accent-green)" : "var(--accent-red)",
            color: "#fff",
          }}
        >
          {submitted ? "Saved!" : submitting ? "Saving..." : userRating ? "Update" : "Submit"}
        </button>
      </div>

      {stats && stats.rating_count > 0 && (
        <div
          className="flex items-center gap-2 mt-3 pt-3"
          style={{ borderTop: "1px solid var(--border-default)" }}
        >
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Community:
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: "var(--accent-gold)" }}
          >
            {Number(stats.average_rating).toFixed(1)}
          </span>
          <Star size={12} fill="var(--accent-gold)" style={{ color: "var(--accent-gold)" }} />
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            ({stats.rating_count})
          </span>
        </div>
      )}
    </div>
  );
}
