export default function FaithfulnessBreakdown({
  score,
  compact = false,
}: {
  score: number;
  compact?: boolean;
}) {
  const color =
    score >= 70
      ? "var(--accent-green)"
      : score >= 40
      ? "var(--accent-gold)"
      : "var(--accent-blue)";

  const label =
    score >= 70
      ? "Faithful"
      : score >= 40
      ? "Inspired"
      : "Loosely Based";

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="flex-1 h-1.5 rounded-full overflow-hidden"
          style={{ background: "var(--bg-tertiary)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${score}%`, background: color }}
          />
        </div>
        <span
          className="text-xs font-bold shrink-0"
          style={{ color, fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.65rem" }}
        >
          {score}%
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold uppercase" style={{ color: "var(--text-tertiary)" }}>
          Comic Faithfulness
        </span>
        <span
          className="text-xs font-bold"
          style={{ color, fontFamily: "var(--font-geist-mono), monospace" }}
        >
          {label} ({score}%)
        </span>
      </div>
      <div
        className="w-full h-2.5 rounded-full overflow-hidden"
        style={{ background: "var(--bg-tertiary)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <div
        className="flex justify-between mt-1 text-xs"
        style={{ color: "var(--text-tertiary)", fontSize: "0.6rem" }}
      >
        <span>Original Story</span>
        <span>Faithful Adaptation</span>
      </div>
    </div>
  );
}
