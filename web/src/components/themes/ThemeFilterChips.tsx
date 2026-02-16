"use client";

import type { InfinityTheme } from "@/lib/types";
import { INFINITY_THEME_META } from "@/lib/types";
import ThemeIcon from "./ThemeIcon";

const ALL_THEMES: InfinityTheme[] = ["power", "space", "time", "reality", "soul", "mind"];

export default function ThemeFilterChips({
  selected,
  onToggle,
}: {
  selected: InfinityTheme[];
  onToggle: (theme: InfinityTheme) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_THEMES.map((theme) => {
        const meta = INFINITY_THEME_META[theme];
        const isSelected = selected.includes(theme);
        return (
          <button
            key={theme}
            onClick={() => onToggle(theme)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105"
            style={{
              background: isSelected
                ? `color-mix(in srgb, ${meta.color} 20%, var(--bg-secondary))`
                : "var(--bg-tertiary)",
              border: `1px solid ${isSelected ? meta.color : "var(--border-default)"}`,
              color: isSelected ? meta.color : "var(--text-tertiary)",
            }}
          >
            <ThemeIcon theme={theme} size={14} glow={isSelected} />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
