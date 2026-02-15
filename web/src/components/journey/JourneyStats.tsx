"use client";

export default function JourneyStats({
  editionsRead,
  erasCovered,
  essentialCount,
  totalFrames,
}: {
  editionsRead: number;
  erasCovered: number;
  essentialCount: number;
  totalFrames: number;
}) {
  return (
    <div
      className="flex gap-6 justify-center py-3 rounded-lg"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-default)",
        fontFamily: "var(--font-geist-mono), monospace",
      }}
    >
      <div className="text-center">
        <div className="text-lg font-bold" style={{ color: "var(--accent-red)" }}>
          {editionsRead}
          <span className="text-xs font-normal" style={{ color: "var(--text-tertiary)" }}>
            /{totalFrames}
          </span>
        </div>
        <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Editions
        </div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold" style={{ color: "var(--accent-gold)" }}>
          {erasCovered}
        </div>
        <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Eras
        </div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold" style={{ color: "var(--accent-purple)" }}>
          {essentialCount}
        </div>
        <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Essential
        </div>
      </div>
    </div>
  );
}
