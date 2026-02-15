import { supabase } from "./supabase";
import { XP_REWARDS, getLevelNumber } from "./xp";
import { checkAndUnlockAchievements } from "./achievements";
import { showAchievementToast } from "@/components/achievements/AchievementUnlockToast";

export async function recordActivity(
  userId: string,
  activityType: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  // Insert activity record
  const { error: activityError } = await supabase.from("user_activity").insert({
    user_id: userId,
    activity_type: activityType,
    metadata,
  });

  if (activityError) {
    console.error("Failed to record activity:", activityError);
    return;
  }

  // Calculate streak via RPC
  const { data: streakData } = await supabase.rpc("calculate_user_streak", {
    p_user_id: userId,
  });

  const currentStreak = streakData?.[0]?.current_streak ?? 0;
  const longestStreak = streakData?.[0]?.longest_streak ?? 0;

  // Determine XP reward
  const xpReward = XP_REWARDS[activityType as keyof typeof XP_REWARDS] ?? 5;

  // Fetch current stats
  const { data: existingStats } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  const newXP = (existingStats?.total_xp ?? 0) + xpReward;
  const isCompleted = activityType === "edition_completed";
  const newEditionsRead = (existingStats?.editions_read ?? 0) + (isCompleted ? 1 : 0);

  // Upsert stats
  await supabase.from("user_stats").upsert(
    {
      user_id: userId,
      total_xp: newXP,
      current_level: getLevelNumber(newXP),
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_activity_date: new Date().toISOString().split("T")[0],
      editions_read: newEditionsRead,
      paths_completed: existingStats?.paths_completed ?? 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  // Check for newly unlocked achievements
  try {
    const newlyUnlocked = await checkAndUnlockAchievements(userId);
    for (const achievement of newlyUnlocked) {
      showAchievementToast(achievement);
    }
  } catch {
    // Achievement check is non-critical — don't block activity tracking
  }
}
