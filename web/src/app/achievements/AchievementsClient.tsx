"use client";

import { Trophy, Flame, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStats } from "@/hooks/useStats";
import { useAchievements } from "@/hooks/useAchievements";
import { getLevelFromXP, getXPProgress } from "@/lib/xp";
import AchievementCard from "@/components/achievements/AchievementCard";
import Link from "next/link";

export default function AchievementsClient() {
  const { user, loading: authLoading } = useAuth();
  const { stats, loading: statsLoading } = useStats();
  const { achievements, userAchievements, loading: achLoading, isUnlocked } = useAchievements();

  const loading = authLoading || statsLoading || achLoading;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded" style={{ background: "var(--bg-tertiary)" }} />
          <div className="h-32 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <Trophy size={48} style={{ color: "var(--accent-gold)" }} className="mx-auto mb-4" />
        <h1
          className="text-2xl sm:text-3xl font-bold mb-3"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          Achievements
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Sign in to track your reading achievements, streaks, and XP level.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
          style={{ background: "var(--accent-red)", color: "#fff" }}
        >
          Sign In to Start
        </Link>
      </div>
    );
  }

  const level = stats ? getLevelFromXP(stats.total_xp) : null;
  const progress = stats ? getXPProgress(stats.total_xp) : null;

  // Sort: unlocked first, then by XP reward
  const sortedAchievements = [...achievements].sort((a, b) => {
    const aUnlocked = isUnlocked(a.id);
    const bUnlocked = isUnlocked(b.id);
    if (aUnlocked && !bUnlocked) return -1;
    if (!aUnlocked && bUnlocked) return 1;
    return a.xp_reward - b.xp_reward;
  });

  const unlockedMap = new Map(
    userAchievements.map((ua) => [ua.achievement_id, ua.unlocked_at])
  );

  return (
    <div className="max-w-4xl mx-auto">
      <h1
        className="text-2xl sm:text-3xl font-bold tracking-tight mb-8"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        Achievements
      </h1>

      {/* Stats overview */}
      <div
        className="rounded-xl border p-6 mb-8"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <div className="flex flex-wrap items-center gap-6">
          {/* Level + XP */}
          <div>
            <span
              className="text-2xl font-bold"
              style={{ color: level?.color ?? "var(--text-primary)", fontFamily: "var(--font-bricolage), sans-serif" }}
            >
              {level?.name ?? "Recruit"}
            </span>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
            >
              {stats?.total_xp ?? 0} XP
            </p>
            {progress && progress.needed > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div
                  className="w-32 h-2 rounded-full overflow-hidden"
                  style={{ background: "var(--bg-tertiary)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress.percent}%`, background: level?.color }}
                  />
                </div>
                <span className="text-xs" style={{ color: "var(--text-tertiary)", fontSize: "0.65rem" }}>
                  {progress.current}/{progress.needed}
                </span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-12" style={{ background: "var(--border-default)" }} />

          {/* Streak */}
          <div className="flex items-center gap-2">
            <Flame size={20} style={{ color: (stats?.current_streak ?? 0) >= 7 ? "var(--accent-gold)" : "var(--text-tertiary)" }} />
            <div>
              <span className="text-lg font-bold" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
                {stats?.current_streak ?? 0}
              </span>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Day Streak
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Flame size={20} style={{ color: "var(--text-tertiary)" }} />
            <div>
              <span className="text-lg font-bold" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
                {stats?.longest_streak ?? 0}
              </span>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Best Streak
              </p>
            </div>
          </div>

          <div className="hidden sm:block w-px h-12" style={{ background: "var(--border-default)" }} />

          {/* Editions Read */}
          <div className="flex items-center gap-2">
            <BookOpen size={20} style={{ color: "var(--accent-blue)" }} />
            <div>
              <span className="text-lg font-bold" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
                {stats?.editions_read ?? 0}
              </span>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Completed
              </p>
            </div>
          </div>

          {/* Unlocked */}
          <div className="flex items-center gap-2">
            <Trophy size={20} style={{ color: "var(--accent-gold)" }} />
            <div>
              <span className="text-lg font-bold" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
                {userAchievements.length}/{achievements.length}
              </span>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Unlocked
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sortedAchievements.map((achievement) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            unlocked={isUnlocked(achievement.id)}
            unlockedAt={unlockedMap.get(achievement.id)}
          />
        ))}
      </div>
    </div>
  );
}
