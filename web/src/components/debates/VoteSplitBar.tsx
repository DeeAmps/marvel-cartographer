export default function VoteSplitBar({
  agree,
  disagree,
  complicated,
  compact = false,
}: {
  agree: number;
  disagree: number;
  complicated: number;
  compact?: boolean;
}) {
  const total = agree + disagree + complicated;
  if (total === 0) {
    return (
      <div
        className={`w-full rounded-full overflow-hidden ${compact ? "h-1.5" : "h-3"}`}
        style={{ background: "var(--bg-tertiary)" }}
      />
    );
  }

  const agreePct = Math.round((agree / total) * 100);
  const disagreePct = Math.round((disagree / total) * 100);
  const complicatedPct = 100 - agreePct - disagreePct;

  return (
    <div>
      <div
        className={`w-full rounded-full overflow-hidden flex ${compact ? "h-1.5" : "h-3"}`}
        style={{ background: "var(--bg-tertiary)" }}
      >
        {agreePct > 0 && (
          <div
            style={{ width: `${agreePct}%`, background: "var(--accent-green)" }}
            className="transition-all"
          />
        )}
        {complicatedPct > 0 && (
          <div
            style={{ width: `${complicatedPct}%`, background: "var(--accent-gold)" }}
            className="transition-all"
          />
        )}
        {disagreePct > 0 && (
          <div
            style={{ width: `${disagreePct}%`, background: "var(--accent-red)" }}
            className="transition-all"
          />
        )}
      </div>
      {!compact && total > 0 && (
        <div className="flex justify-between mt-1.5">
          <span
            className="text-xs font-bold"
            style={{ color: "var(--accent-green)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.65rem" }}
          >
            {agreePct}% Agree
          </span>
          {complicatedPct > 0 && (
            <span
              className="text-xs font-bold"
              style={{ color: "var(--accent-gold)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.65rem" }}
            >
              {complicatedPct}% Complicated
            </span>
          )}
          <span
            className="text-xs font-bold"
            style={{ color: "var(--accent-red)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.65rem" }}
          >
            {disagreePct}% Disagree
          </span>
        </div>
      )}
    </div>
  );
}
