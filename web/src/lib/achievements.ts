import { supabase } from "./supabase";
import type { Achievement } from "./types";

interface AchievementCheckContext {
  editionsRead: number;
  editionsOwned: number;
  currentStreak: number;
  distinctEras: number;
  essentialRead: number;
  ratingsGiven: number;
  pathsCompleted: number;
  completedPathSlugs: string[];
  totalPaths: number;
}

async function buildContext(userId: string): Promise<AchievementCheckContext> {
  // Fetch user stats
  const { data: stats } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  // Fetch collection items
  const { data: collection } = await supabase
    .from("user_collections")
    .select("edition_id, status")
    .eq("user_id", userId);

  const items = collection ?? [];
  const completedIds = items.filter((i) => i.status === "completed").map((i) => i.edition_id);
  const ownedIds = items.filter((i) => i.status === "owned" || i.status === "completed").map((i) => i.edition_id);

  // Count distinct eras from completed editions
  let distinctEras = 0;
  let essentialRead = 0;
  if (completedIds.length > 0) {
    const { data: editions } = await supabase
      .from("collected_editions")
      .select("era_id, importance")
      .in("id", completedIds);

    if (editions) {
      const eraSet = new Set(editions.map((e) => e.era_id).filter(Boolean));
      distinctEras = eraSet.size;
      essentialRead = editions.filter((e) => e.importance === "essential").length;
    }
  }

  // Count ratings
  const { count: ratingsCount } = await supabase
    .from("edition_ratings")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // Check completed reading paths
  const { data: paths } = await supabase
    .from("reading_paths")
    .select("id, slug");

  const { data: pathEntries } = await supabase
    .from("reading_path_entries")
    .select("path_id, edition_id");

  const completedPathSlugs: string[] = [];
  if (paths && pathEntries) {
    for (const path of paths) {
      const pathEditionIds = pathEntries
        .filter((pe) => pe.path_id === path.id)
        .map((pe) => pe.edition_id);
      if (pathEditionIds.length > 0 && pathEditionIds.every((id) => completedIds.includes(id))) {
        completedPathSlugs.push(path.slug);
      }
    }
  }

  return {
    editionsRead: stats?.editions_read ?? completedIds.length,
    editionsOwned: ownedIds.length,
    currentStreak: stats?.current_streak ?? 0,
    distinctEras,
    essentialRead,
    ratingsGiven: ratingsCount ?? 0,
    pathsCompleted: completedPathSlugs.length,
    completedPathSlugs,
    totalPaths: paths?.length ?? 0,
  };
}

function checkAchievement(achievement: Achievement, ctx: AchievementCheckContext): boolean {
  const val = achievement.requirement_value as Record<string, unknown>;

  switch (achievement.requirement_type) {
    case "edition_read":
      return ctx.editionsRead >= (val.count as number);
    case "edition_owned":
      return ctx.editionsOwned >= (val.count as number);
    case "streak":
      return ctx.currentStreak >= (val.days as number);
    case "era_coverage":
      return ctx.distinctEras >= (val.count as number);
    case "essential_read":
      return ctx.essentialRead >= (val.count as number);
    case "path_complete":
      if (val.path_slug) {
        return ctx.completedPathSlugs.includes(val.path_slug as string);
      }
      return ctx.pathsCompleted >= ((val.count as number) ?? 1);
    case "all_paths_complete":
      return ctx.totalPaths > 0 && ctx.pathsCompleted >= ctx.totalPaths;
    case "ratings_given":
      return ctx.ratingsGiven >= (val.count as number);
    default:
      return false;
  }
}

export async function checkAndUnlockAchievements(
  userId: string
): Promise<Achievement[]> {
  // Fetch all achievements
  const { data: allAchievements } = await supabase
    .from("achievements")
    .select("*");

  if (!allAchievements || allAchievements.length === 0) return [];

  // Fetch already unlocked
  const { data: unlocked } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId);

  const unlockedIds = new Set((unlocked ?? []).map((u) => u.achievement_id));

  // Build context
  const ctx = await buildContext(userId);

  // Check each locked achievement
  const newlyUnlocked: Achievement[] = [];

  for (const achievement of allAchievements as Achievement[]) {
    if (unlockedIds.has(achievement.id)) continue;
    if (achievement.requirement_type === "manual") continue;

    if (checkAchievement(achievement, ctx)) {
      // Unlock it
      const { error } = await supabase.from("user_achievements").insert({
        user_id: userId,
        achievement_id: achievement.id,
      });

      if (!error) {
        newlyUnlocked.push(achievement);

        // Award XP
        const { data: stats } = await supabase
          .from("user_stats")
          .select("total_xp")
          .eq("user_id", userId)
          .single();

        if (stats) {
          await supabase
            .from("user_stats")
            .update({
              total_xp: stats.total_xp + achievement.xp_reward,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        }
      }
    }
  }

  return newlyUnlocked;
}
