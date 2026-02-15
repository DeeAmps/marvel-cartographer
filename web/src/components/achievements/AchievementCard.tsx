"use client";

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

export default function AchievementCard({
  achievement,
  unlocked,
  unlockedAt,
}: {
  achievement: Achievement;
  unlocked: boolean;
  unlockedAt?: string;
}) {
  const Icon = iconMap[achievement.icon] || Trophy;
  const color = rarityColors[achievement.rarity];

  return (
    <div
      className="rounded-xl border p-4 transition-all"
      style={{
        background: unlocked ? "var(--bg-secondary)" : "var(--bg-tertiary)",
        borderColor: unlocked ? `color-mix(in srgb, ${color} 40%, transparent)` : "var(--border-default)",
        opacity: unlocked ? 1 : 0.5,
        filter: unlocked ? "none" : "grayscale(80%)",
        boxShadow: unlocked ? `0 0 20px color-mix(in srgb, ${color} 10%, transparent)` : "none",
      }}
    >
      <div className="flex items-start gap-3">
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
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold" style={{ color: unlocked ? "var(--text-primary)" : "var(--text-tertiary)" }}>
              {achievement.name}
            </h3>
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded"
              style={{
                color,
                background: `color-mix(in srgb, ${color} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
                fontSize: "0.75rem",
                textTransform: "uppercase",
              }}
            >
              {achievement.rarity}
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            {achievement.description}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span
              className="text-xs font-bold"
              style={{ color: "var(--accent-gold)", fontFamily: "var(--font-geist-mono), monospace" }}
            >
              +{achievement.xp_reward} XP
            </span>
            {unlocked && unlockedAt && (
              <span
                className="text-xs"
                style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
              >
                {new Date(unlockedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
