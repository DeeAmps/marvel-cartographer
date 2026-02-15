"use client";

import { toast } from "sonner";
import {
  BookOpen, Sparkles, Library, Archive, Globe, Orbit,
  Star, Trophy, Flame, Eye, Shield, Award, Crown,
} from "lucide-react";
import type { Achievement, AchievementRarity } from "@/lib/types";

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  "book-open": BookOpen,
  sparkles: Sparkles,
  library: Library,
  archive: Archive,
  globe: Globe,
  orbit: Orbit,
  star: Star,
  trophy: Trophy,
  flame: Flame,
  eye: Eye,
  shield: Shield,
  award: Award,
  crown: Crown,
};

const rarityColors: Record<AchievementRarity, string> = {
  common: "var(--text-secondary)",
  uncommon: "var(--accent-green)",
  rare: "var(--accent-blue)",
  epic: "var(--accent-purple)",
  legendary: "var(--accent-gold)",
  mythic: "var(--accent-red)",
};

export function showAchievementToast(achievement: Achievement) {
  const Icon = iconMap[achievement.icon] || Trophy;
  const color = rarityColors[achievement.rarity];

  toast.custom(
    () => (
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 shadow-xl w-full max-w-sm"
        style={{
          background: "var(--bg-secondary)",
          border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
          boxShadow: `0 0 30px color-mix(in srgb, ${color} 15%, transparent)`,
        }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: `color-mix(in srgb, ${color} 15%, transparent)`,
            color,
          }}
        >
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold" style={{ color: "var(--accent-gold)" }}>
            Achievement Unlocked!
          </p>
          <p className="text-sm font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
            {achievement.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-xs font-bold"
              style={{
                color,
                fontSize: "0.65rem",
                textTransform: "uppercase",
              }}
            >
              {achievement.rarity}
            </span>
            <span
              className="text-xs font-bold"
              style={{ color: "var(--accent-gold)", fontFamily: "var(--font-geist-mono), monospace" }}
            >
              +{achievement.xp_reward} XP
            </span>
          </div>
        </div>
      </div>
    ),
    { duration: 5000 }
  );
}
