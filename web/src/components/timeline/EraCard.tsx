import type { Era } from "@/lib/types";

export default function EraCard({ era, children }: { era: Era; children?: React.ReactNode }) {
  return (
    <section className="mb-14">
      <div className="flex items-center gap-4 mb-5">
        <div
          className="w-1 h-14 rounded-full"
          style={{ background: era.color }}
        />
        <div>
          <h2
            className="text-2xl font-semibold"
            style={{
              fontFamily: "var(--font-bricolage), sans-serif",
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            {era.name}
          </h2>
          <p
            className="text-sm mt-0.5"
            style={{
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "0.8rem",
            }}
          >
            {era.year_start}&ndash;{era.year_end}
          </p>
        </div>
      </div>

      {era.subtitle && (
        <p className="text-base mb-2 italic" style={{ color: era.color }}>
          {era.subtitle}
        </p>
      )}

      {era.description && (
        <p className="text-sm mb-5 max-w-3xl leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {era.description}
        </p>
      )}

      {children}
    </section>
  );
}
