"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { recordActivity } from "@/lib/activity";
import {
  distributeEditions,
  type SchedulableEdition,
} from "@/lib/schedule-engine";
import type {
  ReadingSchedule,
  ScheduleItem,
  ScheduleStats,
  ScheduleSourceType,
} from "@/lib/types";

// ============================================================
// Slug ↔ UUID resolution (same pattern as useCollection)
// ============================================================

async function resolveSlugToId(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from("collected_editions")
    .select("id")
    .eq("slug", slug)
    .single();
  return data?.id ?? null;
}

async function resolveIdToSlug(id: string): Promise<string | null> {
  const { data } = await supabase
    .from("collected_editions")
    .select("slug")
    .eq("id", id)
    .single();
  return data?.slug ?? null;
}

// ============================================================
// Fetch helpers
// ============================================================

async function fetchSchedules(userId: string): Promise<ReadingSchedule[]> {
  const { data, error } = await supabase
    .from("reading_schedules")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Schedule] Failed to fetch schedules:", error.message);
    return [];
  }
  return (data ?? []) as ReadingSchedule[];
}

async function fetchScheduleItems(
  userId: string,
  scheduleId?: string
): Promise<ScheduleItem[]> {
  let query = supabase
    .from("schedule_items")
    .select(
      `
      *,
      collected_editions!inner (
        slug, title, cover_image_url, importance, print_status,
        issues_collected, page_count, release_date,
        eras!collected_editions_era_id_fkey ( name, color, number )
      )
    `
    )
    .eq("user_id", userId)
    .order("scheduled_date", { ascending: true })
    .order("position", { ascending: true });

  if (scheduleId) {
    query = query.eq("schedule_id", scheduleId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Schedule] Failed to fetch items:", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const ce = row.collected_editions as Record<string, unknown> | null;
    const era = ce?.eras as Record<string, unknown> | null;
    return {
      id: row.id,
      schedule_id: row.schedule_id,
      user_id: row.user_id,
      edition_id: row.edition_id,
      scheduled_date: row.scheduled_date,
      due_date: row.due_date,
      position: row.position,
      status: row.status,
      completed_at: row.completed_at,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      edition_slug: ce?.slug,
      edition_title: ce?.title,
      edition_cover_image_url: ce?.cover_image_url,
      edition_importance: ce?.importance,
      edition_print_status: ce?.print_status,
      edition_issues_collected: ce?.issues_collected,
      edition_page_count: ce?.page_count,
      edition_era_name: era?.name,
      edition_era_color: era?.color,
      edition_era_number: era?.number as number | undefined,
      edition_release_date: ce?.release_date as string | undefined,
    } as ScheduleItem;
  });
}

async function fetchStats(userId: string): Promise<ScheduleStats | null> {
  const { data, error } = await supabase.rpc("get_schedule_stats", {
    p_user_id: userId,
  });

  if (error || !data || data.length === 0) return null;
  const row = data[0];
  return {
    total_scheduled: Number(row.total_scheduled),
    total_completed: Number(row.total_completed),
    total_overdue: Number(row.total_overdue),
    current_week_items: Number(row.current_week_items),
    current_week_completed: Number(row.current_week_completed),
    on_track: row.on_track,
    next_edition_id: row.next_edition_id,
    next_edition_date: row.next_edition_date,
  };
}

// ============================================================
// Hook
// ============================================================

export function useReadingSchedule() {
  const { user, loading: authLoading } = useAuth();
  const [schedules, setSchedules] = useState<ReadingSchedule[]>([]);
  const [activeSchedule, setActiveSchedule] = useState<ReadingSchedule | null>(
    null
  );
  const [activeItems, setActiveItems] = useState<ScheduleItem[]>([]);
  const [stats, setStats] = useState<ScheduleStats | null>(null);
  const [loading, setLoading] = useState(true);

  const authenticated = !!user;

  // Load data when user is available
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setSchedules([]);
      setActiveSchedule(null);
      setActiveItems([]);
      setStats(null);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);

      // Mark overdue items first
      await supabase.rpc("mark_overdue_items", { p_user_id: user!.id });

      const [sched, st] = await Promise.all([
        fetchSchedules(user!.id),
        fetchStats(user!.id),
      ]);

      setSchedules(sched);
      setStats(st);

      const active = sched.find((s) => s.is_active) ?? sched[0] ?? null;
      setActiveSchedule(active);

      if (active) {
        const items = await fetchScheduleItems(user!.id, active.id);
        setActiveItems(items);
      }

      setLoading(false);
    }

    load();
  }, [user?.id, authLoading]);

  // Reload active items
  const reloadItems = useCallback(async () => {
    if (!user || !activeSchedule) return;
    const [items, st] = await Promise.all([
      fetchScheduleItems(user.id, activeSchedule.id),
      fetchStats(user.id),
    ]);
    setActiveItems(items);
    setStats(st);
  }, [user, activeSchedule]);

  // ---- CRUD Operations ----

  const createSchedule = useCallback(
    async (
      name: string,
      config: {
        pacePerWeek: number;
        sourceType?: ScheduleSourceType;
        sourceId?: string;
        startDate?: string;
      }
    ): Promise<ReadingSchedule | null> => {
      if (!user) return null;

      // Deactivate other schedules
      await supabase
        .from("reading_schedules")
        .update({ is_active: false })
        .eq("user_id", user.id);

      const { data, error } = await supabase
        .from("reading_schedules")
        .insert({
          user_id: user.id,
          name,
          pace_per_week: config.pacePerWeek,
          source_type: config.sourceType ?? "manual",
          source_id: config.sourceId ?? null,
          is_active: true,
          start_date: config.startDate ?? new Date().toISOString().split("T")[0],
        })
        .select()
        .single();

      if (error) {
        console.error("[Schedule] Create failed:", error.message);
        return null;
      }

      const schedule = data as ReadingSchedule;
      setSchedules((prev) =>
        [schedule, ...prev.map((s) => ({ ...s, is_active: false }))]
      );
      setActiveSchedule(schedule);
      setActiveItems([]);
      return schedule;
    },
    [user]
  );

  const deleteSchedule = useCallback(
    async (scheduleId: string) => {
      if (!user) return;

      // Revert completed schedule items: set their collection status back to "owned"
      const completedEditionIds = activeItems
        .filter((i) => i.schedule_id === scheduleId && i.status === "completed")
        .map((i) => i.edition_id);

      if (completedEditionIds.length > 0) {
        await supabase
          .from("user_collections")
          .update({ status: "owned" })
          .eq("user_id", user.id)
          .in("edition_id", completedEditionIds)
          .eq("status", "completed");
      }

      // Cascade delete removes all schedule_items automatically
      await supabase
        .from("reading_schedules")
        .delete()
        .eq("id", scheduleId)
        .eq("user_id", user.id);

      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
      if (activeSchedule?.id === scheduleId) {
        setActiveSchedule(null);
        setActiveItems([]);
      }
    },
    [user, activeSchedule, activeItems]
  );

  const switchSchedule = useCallback(
    async (scheduleId: string) => {
      if (!user) return;

      await supabase
        .from("reading_schedules")
        .update({ is_active: false })
        .eq("user_id", user.id);

      await supabase
        .from("reading_schedules")
        .update({ is_active: true })
        .eq("id", scheduleId)
        .eq("user_id", user.id);

      const target = schedules.find((s) => s.id === scheduleId);
      if (target) {
        setActiveSchedule({ ...target, is_active: true });
        setSchedules((prev) =>
          prev.map((s) => ({ ...s, is_active: s.id === scheduleId }))
        );
        const items = await fetchScheduleItems(user.id, scheduleId);
        setActiveItems(items);
      }
    },
    [user, schedules]
  );

  // ---- Item Operations ----

  const addItem = useCallback(
    async (editionSlug: string, startDate: string, endDate: string): Promise<boolean> => {
      if (!user || !activeSchedule) return false;

      const editionId = await resolveSlugToId(editionSlug);
      if (!editionId) {
        console.warn("[Schedule] Edition not found:", editionSlug);
        return false;
      }

      const maxPos = activeItems.reduce(
        (max, item) => Math.max(max, item.position),
        -1
      );

      const { error } = await supabase.from("schedule_items").insert({
        schedule_id: activeSchedule.id,
        user_id: user.id,
        edition_id: editionId,
        scheduled_date: startDate,
        due_date: endDate,
        position: maxPos + 1,
        status: "scheduled",
      });

      if (error) {
        console.error("[Schedule] Add item failed:", error.message);
        return false;
      }

      await reloadItems();
      return true;
    },
    [user, activeSchedule, activeItems, reloadItems]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!user) return;

      setActiveItems((prev) => prev.filter((i) => i.id !== itemId));

      await supabase
        .from("schedule_items")
        .delete()
        .eq("id", itemId)
        .eq("user_id", user.id);

      const st = await fetchStats(user.id);
      setStats(st);
    },
    [user]
  );

  const rescheduleItem = useCallback(
    async (itemId: string, newStartDate: string, newEndDate?: string) => {
      if (!user) return;

      // If no end date provided, keep the same reading window duration
      let endDate = newEndDate;
      if (!endDate) {
        const item = activeItems.find((i) => i.id === itemId);
        if (item) {
          const oldStart = new Date(item.scheduled_date);
          const oldEnd = new Date(item.due_date);
          const durationDays = Math.round((oldEnd.getTime() - oldStart.getTime()) / (1000 * 60 * 60 * 24));
          const newEnd = new Date(newStartDate);
          newEnd.setDate(newEnd.getDate() + durationDays);
          endDate = newEnd.toISOString().split("T")[0];
        } else {
          // Fallback: 7 days from start
          const newEnd = new Date(newStartDate);
          newEnd.setDate(newEnd.getDate() + 6);
          endDate = newEnd.toISOString().split("T")[0];
        }
      }

      // Optimistic update
      setActiveItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                scheduled_date: newStartDate,
                due_date: endDate!,
              }
            : item
        )
      );

      await supabase
        .from("schedule_items")
        .update({
          scheduled_date: newStartDate,
          due_date: endDate,
        })
        .eq("id", itemId)
        .eq("user_id", user.id);
    },
    [user, activeItems]
  );

  const completeItem = useCallback(
    async (itemId: string) => {
      if (!user) return;

      const now = new Date().toISOString();

      // Optimistic update
      setActiveItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, status: "completed" as const, completed_at: now }
            : item
        )
      );

      await supabase
        .from("schedule_items")
        .update({ status: "completed", completed_at: now })
        .eq("id", itemId)
        .eq("user_id", user.id);

      // Find the item to get the edition slug for activity tracking
      const item = activeItems.find((i) => i.id === itemId);
      if (item?.edition_slug) {
        await recordActivity(user.id, "schedule_item_completed", {
          edition_slug: item.edition_slug,
          schedule_id: activeSchedule?.id,
        });
      }

      const st = await fetchStats(user.id);
      setStats(st);
    },
    [user, activeItems, activeSchedule]
  );

  const skipItem = useCallback(
    async (itemId: string) => {
      if (!user) return;

      setActiveItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, status: "skipped" as const } : item
        )
      );

      await supabase
        .from("schedule_items")
        .update({ status: "skipped" })
        .eq("id", itemId)
        .eq("user_id", user.id);

      const st = await fetchStats(user.id);
      setStats(st);
    },
    [user]
  );

  // ---- Bulk Operations ----

  const scheduleFromPath = useCallback(
    async (
      pathSlug: string,
      startDate: Date,
      pacePerWeek: number,
      balanceByWeight = true
    ): Promise<boolean> => {
      if (!user) return false;

      // Fetch path entries with edition info
      const { data: pathData } = await supabase
        .from("reading_paths")
        .select("id, name")
        .eq("slug", pathSlug)
        .single();

      if (!pathData) return false;

      const { data: entries } = await supabase
        .from("reading_path_entries")
        .select(
          `
          position, is_optional,
          collected_editions!inner ( id, slug, title, page_count, importance )
        `
        )
        .eq("path_id", pathData.id)
        .order("position", { ascending: true });

      if (!entries || entries.length === 0) return false;

      // Create the schedule
      const schedule = await createSchedule(pathData.name, {
        pacePerWeek,
        sourceType: "path",
        sourceId: pathSlug,
        startDate: startDate.toISOString().split("T")[0],
      });

      if (!schedule) return false;

      // Map entries to schedulable editions
      const editions: SchedulableEdition[] = entries
        .filter((e: Record<string, unknown>) => !e.is_optional)
        .map((e: Record<string, unknown>) => {
          const ce = e.collected_editions as Record<string, unknown>;
          return {
            slug: ce.slug as string,
            id: ce.id as string,
            title: ce.title as string,
            page_count: ce.page_count as number | undefined,
            importance: ce.importance as string | undefined,
          };
        });

      // Distribute across weeks
      const slots = distributeEditions({
        editions,
        startDate,
        pacePerWeek,
        balanceByWeight,
      });

      // Bulk insert
      const rows = slots.map((slot) => ({
        schedule_id: schedule.id,
        user_id: user.id,
        edition_id: slot.edition.id,
        scheduled_date: slot.scheduledDate,
        due_date: slot.dueDate,
        position: slot.position,
        status: "scheduled",
      }));

      const { error } = await supabase.from("schedule_items").insert(rows);
      if (error) {
        console.error("[Schedule] Bulk insert failed:", error.message);
        return false;
      }

      await reloadItems();
      return true;
    },
    [user, createSchedule, reloadItems]
  );

  const scheduleFromCollection = useCallback(
    async (startDate: Date, pacePerWeek: number): Promise<boolean> => {
      if (!user) return false;

      // Fetch user's owned/reading collection items
      const { data: collection } = await supabase
        .from("user_collections")
        .select(
          `
          edition_id,
          collected_editions!inner ( id, slug, title, page_count, importance, era_id )
        `
        )
        .eq("user_id", user.id)
        .in("status", ["owned", "reading"]);

      if (!collection || collection.length === 0) return false;

      const editions: SchedulableEdition[] = collection.map(
        (row: Record<string, unknown>) => {
          const ce = row.collected_editions as Record<string, unknown>;
          return {
            slug: ce.slug as string,
            id: ce.id as string,
            title: ce.title as string,
            page_count: ce.page_count as number | undefined,
            importance: ce.importance as string | undefined,
          };
        }
      );

      const schedule = await createSchedule("My Collection Plan", {
        pacePerWeek,
        sourceType: "collection",
        startDate: startDate.toISOString().split("T")[0],
      });

      if (!schedule) return false;

      const slots = distributeEditions({
        editions,
        startDate,
        pacePerWeek,
        balanceByWeight: true,
      });

      const rows = slots.map((slot) => ({
        schedule_id: schedule.id,
        user_id: user.id,
        edition_id: slot.edition.id,
        scheduled_date: slot.scheduledDate,
        due_date: slot.dueDate,
        position: slot.position,
        status: "scheduled",
      }));

      const { error } = await supabase.from("schedule_items").insert(rows);
      if (error) {
        console.error("[Schedule] Collection schedule failed:", error.message);
        return false;
      }

      await reloadItems();
      return true;
    },
    [user, createSchedule, reloadItems]
  );

  // ---- Query helpers ----

  const getItemsForWeek = useCallback(
    (weekStart: string): ScheduleItem[] => {
      const monday = new Date(weekStart);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      const weekEnd = sunday.toISOString().split("T")[0];

      // Item overlaps the week if item.start <= weekEnd AND item.due >= weekStart
      return activeItems.filter(
        (item) =>
          item.scheduled_date <= weekEnd && item.due_date >= weekStart
      );
    },
    [activeItems]
  );

  const getItemsForMonth = useCallback(
    (year: number, month: number): ScheduleItem[] => {
      const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const end = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;

      // Item overlaps the month if item.start <= monthEnd AND item.due >= monthStart
      return activeItems.filter(
        (item) =>
          item.scheduled_date <= end && item.due_date >= start
      );
    },
    [activeItems]
  );

  const isEditionScheduled = useCallback(
    (slug: string): boolean => {
      return activeItems.some((item) => item.edition_slug === slug);
    },
    [activeItems]
  );

  const getOverdueCount = useCallback((): number => {
    return activeItems.filter((item) => item.status === "overdue").length;
  }, [activeItems]);

  // Unauthenticated no-ops
  if (!authenticated && !authLoading) {
    return {
      schedules: [] as ReadingSchedule[],
      activeSchedule: null,
      activeItems: [] as ScheduleItem[],
      stats: null,
      loading: false,
      authenticated: false,
      createSchedule: async () => null,
      deleteSchedule: async () => {},
      switchSchedule: async () => {},
      addItem: async (_slug: string, _start: string, _end: string) => false,
      removeItem: async () => {},
      rescheduleItem: async (_id: string, _start: string, _end?: string) => {},
      completeItem: async () => {},
      skipItem: async () => {},
      scheduleFromPath: async () => false,
      scheduleFromCollection: async () => false,
      getItemsForWeek: () => [],
      getItemsForMonth: () => [],
      isEditionScheduled: () => false,
      getOverdueCount: () => 0,
    };
  }

  return {
    schedules,
    activeSchedule,
    activeItems,
    stats,
    loading,
    authenticated,
    createSchedule,
    deleteSchedule,
    switchSchedule,
    addItem,
    removeItem,
    rescheduleItem,
    completeItem,
    skipItem,
    scheduleFromPath,
    scheduleFromCollection,
    getItemsForWeek,
    getItemsForMonth,
    isEditionScheduled,
    getOverdueCount,
  };
}
