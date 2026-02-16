import type { InfinityTheme } from "@/lib/types";
import { INFINITY_THEME_META } from "@/lib/types";

export default function ThemeIcon({
  theme,
  size = 24,
  glow = false,
}: {
  theme: InfinityTheme;
  size?: number;
  glow?: boolean;
}) {
  const meta = INFINITY_THEME_META[theme];
  const halfSize = size / 2;

  return (
    <div
      className="inline-flex items-center justify-center rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 40% 40%, ${meta.color}, color-mix(in srgb, ${meta.color} 60%, #000))`,
        boxShadow: glow
          ? `0 0 ${size * 0.5}px ${meta.color}, 0 0 ${size}px color-mix(in srgb, ${meta.color} 30%, transparent)`
          : "none",
      }}
    >
      <div
        className="rounded-full"
        style={{
          width: halfSize * 0.6,
          height: halfSize * 0.6,
          background: `radial-gradient(circle, rgba(255,255,255,0.6), rgba(255,255,255,0.1))`,
        }}
      />
    </div>
  );
}
