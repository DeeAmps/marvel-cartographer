import type { EventPhase } from "@/lib/types";

export default function EventPhaseTimeline({
  phases,
}: {
  phases: EventPhase[];
}) {
  if (phases.length === 0) return null;

  return (
    <section
      className="rounded-lg border p-6 mb-4"
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border-default)",
      }}
    >
      <h2
        className="text-lg font-bold tracking-tight mb-4"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        Event Phases
      </h2>
      <div className="relative">
        {/* Vertical timeline line */}
        <div
          className="absolute left-3 top-3 bottom-3 w-px"
          style={{ background: "var(--border-default)" }}
        />
        <div className="space-y-4">
          {phases.map((phase, idx) => (
            <div key={phase.slug} className="flex gap-4 relative">
              {/* Timeline dot */}
              <div
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10"
                style={{
                  background: idx === 0 ? "var(--accent-red)" : "var(--bg-tertiary)",
                  color: idx === 0 ? "#fff" : "var(--text-tertiary)",
                  border: `2px solid ${idx === 0 ? "var(--accent-red)" : "var(--border-default)"}`,
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "0.75rem",
                }}
              >
                {phase.number}
              </div>
              {/* Content */}
              <div className="flex-1 pb-1">
                <h3
                  className="text-sm font-bold"
                  style={{
                    fontFamily: "var(--font-bricolage), sans-serif",
                    color: "var(--text-primary)",
                    letterSpacing: "0.03em",
                  }}
                >
                  {phase.name.toUpperCase()}
                </h3>
                <p
                  className="text-xs leading-relaxed mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {phase.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
