import type { PowerGrid } from "@/lib/types";

const axes: { key: keyof PowerGrid; label: string }[] = [
  { key: "intelligence", label: "INT" },
  { key: "strength", label: "STR" },
  { key: "speed", label: "SPD" },
  { key: "durability", label: "DUR" },
  { key: "energy_projection", label: "EP" },
  { key: "fighting_skills", label: "FS" },
];

const MAX = 7;

export default function PowerGridRadar({ grid }: { grid: PowerGrid }) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 40;
  const n = axes.length;

  function polarToCart(value: number, index: number) {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    const r = (value / MAX) * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  // Grid rings
  const rings = [1, 2, 3, 4, 5, 6, 7];

  // Data polygon
  const dataPoints = axes.map((a, i) => polarToCart(grid[a.key], i));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";

  return (
    <div
      className="rounded-lg border p-4 inline-block"
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border-default)",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Power grid: Intelligence ${grid.intelligence}, Strength ${grid.strength}, Speed ${grid.speed}, Durability ${grid.durability}, Energy Projection ${grid.energy_projection}, Fighting Skills ${grid.fighting_skills}`}
      >
        {/* Grid rings */}
        {rings.map((r) => {
          const ringPoints = axes
            .map((_, i) => polarToCart(r, i))
            .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
            .join(" ");
          return (
            <path
              key={r}
              d={ringPoints + "Z"}
              fill="none"
              stroke="var(--border-default)"
              strokeWidth={r === 7 ? 1.5 : 0.5}
              opacity={r === 7 ? 0.6 : 0.3}
            />
          );
        })}

        {/* Axis lines */}
        {axes.map((_, i) => {
          const end = polarToCart(MAX, i);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke="var(--border-default)"
              strokeWidth={0.5}
              opacity={0.3}
            />
          );
        })}

        {/* Data polygon */}
        <path
          d={dataPath}
          fill="var(--accent-red)"
          fillOpacity={0.2}
          stroke="var(--accent-red)"
          strokeWidth={2}
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="var(--accent-red)"
            stroke="var(--bg-secondary)"
            strokeWidth={2}
          />
        ))}

        {/* Axis labels */}
        {axes.map((a, i) => {
          const labelPos = polarToCart(MAX + 1.2, i);
          return (
            <text
              key={a.key}
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--text-tertiary)"
              fontSize={11}
              fontFamily="var(--font-geist-mono), monospace"
              fontWeight={700}
            >
              {a.label}
            </text>
          );
        })}

        {/* Value labels */}
        {axes.map((a, i) => {
          const valPos = polarToCart(grid[a.key] + 0.6, i);
          return (
            <text
              key={`v-${a.key}`}
              x={valPos.x}
              y={valPos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--accent-red)"
              fontSize={10}
              fontFamily="var(--font-geist-mono), monospace"
              fontWeight={700}
            >
              {grid[a.key]}
            </text>
          );
        })}
      </svg>

      {/* Legend table */}
      <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-1">
        {axes.map((a) => (
          <div key={a.key} className="flex items-center justify-between gap-2">
            <span className="text-xs capitalize" style={{ color: "var(--text-secondary)" }}>
              {a.key.replace(/_/g, " ")}
            </span>
            <span
              className="text-xs font-bold"
              style={{
                color: "var(--accent-red)",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              {grid[a.key]}/7
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
