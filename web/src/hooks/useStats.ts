"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { getLevelFromXP } from "@/lib/xp";
import type { UserStats } from "@/lib/types";

export function useStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStats(null);
      setLoading(false);
      return;
    }

    async function fetchStats() {
      const { data, error } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user!.id)
        .single();

      if (!error && data) {
        setStats(data as UserStats);
      }
      setLoading(false);
    }

    fetchStats();
  }, [user?.id]);

  const level = stats ? getLevelFromXP(stats.total_xp) : null;

  return {
    stats,
    loading,
    levelName: level?.name ?? "Recruit",
    levelColor: level?.color ?? "var(--text-tertiary)",
    refresh: async () => {
      if (!user) return;
      const { data } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data) setStats(data as UserStats);
    },
  };
}
