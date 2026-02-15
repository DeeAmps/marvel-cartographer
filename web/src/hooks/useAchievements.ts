"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Achievement, UserAchievement } from "@/lib/types";

export function useAchievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    // Fetch all achievement definitions
    const { data: allAchievements } = await supabase
      .from("achievements")
      .select("*")
      .order("xp_reward", { ascending: true });

    if (allAchievements) {
      setAchievements(allAchievements as Achievement[]);
    }

    // Fetch user's unlocked achievements
    if (user) {
      const { data: unlocked } = await supabase
        .from("user_achievements")
        .select("*, achievement:achievements(*)")
        .eq("user_id", user.id);

      if (unlocked) {
        setUserAchievements(unlocked as UserAchievement[]);
      }
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const unlockedIds = new Set(userAchievements.map((ua) => ua.achievement_id));

  return {
    achievements,
    userAchievements,
    loading,
    isUnlocked: (achievementId: string) => unlockedIds.has(achievementId),
    unlockedCount: userAchievements.length,
    totalCount: achievements.length,
    refresh: fetchAll,
  };
}
