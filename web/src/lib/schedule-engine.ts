/**
 * Schedule Engine — Smart distribution of editions across weeks.
 *
 * Core algorithm: given an ordered list of editions, a start date, and a
 * pace (editions/week), assign each edition to a Monday–Sunday bucket.
 */

// ============================================================
// Types
// ============================================================

export interface SchedulableEdition {
  slug: string;
  id: string;
  title: string;
  page_count?: number;
  importance?: string;
}

export interface DistributeConfig {
  editions: SchedulableEdition[];
  startDate: Date;
  pacePerWeek: number;
  /** If true, heavy omnibuses (800+ pages) automatically get extra time. */
  balanceByWeight?: boolean;
}

export interface ScheduledSlot {
  edition: SchedulableEdition;
  scheduledDate: string; // ISO date — start reading
  dueDate: string;       // ISO date — planned finish
  position: number;
}

export interface RescheduleResult {
  id: string;
  scheduledDate: string;
  dueDate: string;
  position: number;
}

// ============================================================
// Helpers
// ============================================================

/** Return the Monday of the week containing `date`. */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Sunday = 0, Monday = 1, ..., Saturday = 6
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Return Sunday of the week starting on `monday`. */
function getSunday(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  return d;
}

/** Add `weeks` to a date. */
function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

/** Format Date as YYYY-MM-DD. */
function toISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

/** Weight multiplier for heavy books. 800+ pages = 2x, 400+ = 1.5x, else 1x. */
function pageWeight(pageCount: number | undefined): number {
  if (!pageCount) return 1;
  if (pageCount >= 800) return 2;
  if (pageCount >= 400) return 1.5;
  return 1;
}

// ============================================================
// Core Distribution
// ============================================================

/**
 * Distribute an ordered list of editions with start/finish date ranges.
 *
 * Each book gets a reading window. At pace 1.0, each book gets 7 days.
 * At pace 0.5, each book gets 14 days. At pace 2.0, each gets ~3.5 days (rounded to 4).
 *
 * With `balanceByWeight`, heavy omnibuses (800+ pages) get proportionally
 * more reading time.
 */
export function distributeEditions(config: DistributeConfig): ScheduledSlot[] {
  const { editions, startDate, pacePerWeek, balanceByWeight = false } = config;

  if (editions.length === 0 || pacePerWeek <= 0) return [];

  const slots: ScheduledSlot[] = [];
  // Base reading days per edition: 7 days / pace
  const baseDaysPerEdition = 7 / pacePerWeek;
  let currentStart = new Date(startDate);
  currentStart.setHours(0, 0, 0, 0);

  for (let i = 0; i < editions.length; i++) {
    const edition = editions[i];
    const weight = balanceByWeight ? pageWeight(edition.page_count) : 1;

    // Reading window for this book (at least 1 day)
    const readingDays = Math.max(1, Math.round(baseDaysPerEdition * weight));

    const finishDate = new Date(currentStart);
    finishDate.setDate(finishDate.getDate() + readingDays - 1);

    slots.push({
      edition,
      scheduledDate: toISO(currentStart),
      dueDate: toISO(finishDate),
      position: i,
    });

    // Next book starts the day after this one finishes
    currentStart = new Date(finishDate);
    currentStart.setDate(currentStart.getDate() + 1);
  }

  return slots;
}

// ============================================================
// Pace Suggestion
// ============================================================

/**
 * Suggest a sustainable reading pace based on past behavior.
 * Uses 0.8x multiplier on observed velocity for comfort margin.
 */
export function suggestPace(
  completedCount: number,
  daysSinceFirst: number,
  streak: number
): number {
  if (completedCount === 0 || daysSinceFirst === 0) {
    return 1.0; // Default: 1 edition/week
  }

  const weeksSinceFirst = daysSinceFirst / 7;
  const observedPace = completedCount / weeksSinceFirst;

  // Apply comfort multiplier
  let suggested = observedPace * 0.8;

  // Boost slightly for consistent readers (streak > 7 days)
  if (streak >= 7) {
    suggested *= 1.1;
  }

  // Clamp to reasonable range: 0.5 to 5.0 editions/week
  suggested = Math.max(0.5, Math.min(5.0, suggested));

  // Round to nearest 0.5
  return Math.round(suggested * 2) / 2;
}

// ============================================================
// Rescheduling
// ============================================================

interface ReschedulableItem {
  id: string;
  scheduled_date: string;
  due_date: string;
  position: number;
  status: string;
}

/**
 * Shift all non-completed items from a given date forward by `shiftDays`.
 * Preserves each item's reading window duration.
 */
export function rescheduleFrom(
  items: ReschedulableItem[],
  fromDate: string,
  shiftDays: number
): RescheduleResult[] {
  return items
    .filter(
      (item) =>
        item.status !== "completed" &&
        item.status !== "skipped" &&
        item.scheduled_date >= fromDate
    )
    .map((item) => {
      const newStart = new Date(item.scheduled_date);
      newStart.setDate(newStart.getDate() + shiftDays);
      const newEnd = new Date(item.due_date);
      newEnd.setDate(newEnd.getDate() + shiftDays);

      return {
        id: item.id,
        scheduledDate: toISO(newStart),
        dueDate: toISO(newEnd),
        position: item.position,
      };
    });
}

/**
 * Compact the schedule by pulling future items forward when
 * earlier items have been completed. Maintains relative order.
 */
export function compactSchedule(
  items: ReschedulableItem[],
  completedIds: Set<string>,
  pacePerWeek: number,
  startDate?: string
): RescheduleResult[] {
  // Separate completed/skipped items from active ones
  const activeItems = items
    .filter((item) => !completedIds.has(item.id) && item.status !== "skipped")
    .sort((a, b) => a.position - b.position);

  if (activeItems.length === 0) return [];

  const start = startDate ? new Date(startDate) : new Date();
  const redistributed = distributeEditions({
    editions: activeItems.map((item) => ({
      slug: item.id, // Using id as slug placeholder
      id: item.id,
      title: "",
    })),
    startDate: start,
    pacePerWeek,
  });

  return redistributed.map((slot, i) => ({
    id: activeItems[i].id,
    scheduledDate: slot.scheduledDate,
    dueDate: slot.dueDate,
    position: i,
  }));
}

// ============================================================
// Utilities
// ============================================================

/** Get the Monday of the current week. */
export function getCurrentWeekStart(): string {
  return toISO(getMonday(new Date()));
}

/** Get the Monday of the week containing a given date. */
export function getWeekStart(date: string | Date): string {
  return toISO(getMonday(new Date(date)));
}

/** Calculate estimated end date given edition count and pace. */
export function estimateEndDate(
  editionCount: number,
  pacePerWeek: number,
  startDate: Date = new Date()
): string {
  if (pacePerWeek <= 0 || editionCount === 0) return toISO(startDate);
  const weeksNeeded = Math.ceil(editionCount / pacePerWeek);
  return toISO(addWeeks(getMonday(startDate), weeksNeeded));
}

/** Get all Mondays between two dates (inclusive). */
export function getWeeksBetween(start: string, end: string): string[] {
  const weeks: string[] = [];
  let current = getMonday(new Date(start));
  const endDate = new Date(end);

  while (current <= endDate) {
    weeks.push(toISO(current));
    current = addWeeks(current, 1);
  }

  return weeks;
}

/** Get all days in a month as an array of ISO date strings. */
export function getDaysInMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(toISO(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}
