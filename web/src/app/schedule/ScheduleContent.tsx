"use client";

import { useState } from "react";
import { useReadingSchedule } from "@/hooks/useReadingSchedule";
import { CalendarDays, List, Settings, Clock, Plus } from "lucide-react";
import ScheduleStats from "@/components/schedule/ScheduleStats";
import AddEditionSearch from "@/components/schedule/AddEditionSearch";
import ScheduleWeekView from "@/components/schedule/ScheduleWeekView";
import ScheduleMonthView from "@/components/schedule/ScheduleMonthView";
import ScheduleTimeline from "@/components/schedule/ScheduleTimeline";
import ScheduleWizard from "@/components/schedule/ScheduleWizard";
import ScheduleEmpty from "@/components/schedule/ScheduleEmpty";
import { getCurrentWeekStart } from "@/lib/schedule-engine";

type Tab = "week" | "calendar" | "upcoming" | "settings";

export default function ScheduleContent() {
  const [activeTab, setActiveTab] = useState<Tab>("week");
  const [showWizard, setShowWizard] = useState(false);
  const [showAddSearch, setShowAddSearch] = useState(false);
  const schedule = useReadingSchedule();

  const {
    activeSchedule,
    activeItems,
    stats,
    loading,
    authenticated,
    schedules,
    completeItem,
    skipItem,
    removeItem,
    rescheduleItem,
    deleteSchedule,
    switchSchedule,
    scheduleFromPath,
    scheduleFromCollection,
    createSchedule,
    addItem,
    getItemsForWeek,
    getItemsForMonth,
  } = schedule;

  if (!authenticated) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-12">
        <h1
          className="text-3xl font-bold mb-4"
          style={{ fontFamily: "var(--font-bricolage)", color: "var(--text-primary)" }}
        >
          Reading Schedule
        </h1>
        <div
          className="rounded-lg p-8 text-center"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
        >
          <p style={{ color: "var(--text-secondary)" }}>
            Sign in to create a personal reading schedule.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-12">
        <h1
          className="text-3xl font-bold mb-8"
          style={{ fontFamily: "var(--font-bricolage)", color: "var(--text-primary)" }}
        >
          Reading Schedule
        </h1>
        <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
          <Clock size={16} className="animate-spin" />
          Loading your schedule...
        </div>
      </main>
    );
  }

  const hasSchedule = !!activeSchedule;

  if (showWizard) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-12">
        <h1
          className="text-3xl font-bold mb-8"
          style={{ fontFamily: "var(--font-bricolage)", color: "var(--text-primary)" }}
        >
          Reading Schedule
        </h1>
        <ScheduleWizard
          onScheduleFromPath={async (pathSlug, startDate, pace) => {
            const ok = await scheduleFromPath(pathSlug, startDate, pace);
            if (ok) setShowWizard(false);
          }}
          onScheduleFromCollection={async (startDate, pace) => {
            const ok = await scheduleFromCollection(startDate, pace);
            if (ok) setShowWizard(false);
          }}
          onCreateManual={async (name, pace) => {
            await createSchedule(name, { pacePerWeek: pace, sourceType: "manual" });
              setShowWizard(false);
            }}
            onCancel={() => setShowWizard(false)}
          />
      </main>
    );
  }

  if (!hasSchedule && !loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-12">
        <h1
          className="text-3xl font-bold mb-8"
          style={{ fontFamily: "var(--font-bricolage)", color: "var(--text-primary)" }}
        >
          Reading Schedule
        </h1>
        <ScheduleEmpty onCreateSchedule={() => setShowWizard(true)} />
      </main>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: "week", label: "This Week", icon: Clock },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    { id: "upcoming", label: "Upcoming", icon: List },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "var(--font-bricolage)", color: "var(--text-primary)" }}
          >
            {activeSchedule?.name ?? "Reading Schedule"}
          </h1>
          {activeSchedule && (
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {activeSchedule.pace_per_week} edition{activeSchedule.pace_per_week !== 1 ? "s" : ""}/week
              {activeSchedule.source_type === "path" && activeSchedule.source_id
                ? ` · from path: ${activeSchedule.source_id}`
                : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddSearch(!showAddSearch)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: showAddSearch ? "var(--bg-tertiary)" : "var(--accent-blue)",
              color: showAddSearch ? "var(--text-primary)" : "#fff",
            }}
          >
            <Plus size={14} /> Add Edition
          </button>
          <button
            onClick={() => setShowWizard(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: "var(--accent-red)",
              color: "#fff",
            }}
          >
            New Schedule
          </button>
        </div>
      </div>

      {/* Add Edition Search */}
      {showAddSearch && (
        <div className="mb-6">
          <AddEditionSearch
            onAdd={addItem}
            isEditionScheduled={schedule.isEditionScheduled}
            onClose={() => setShowAddSearch(false)}
          />
        </div>
      )}

      {/* Stats Dashboard */}
      {stats && <ScheduleStats stats={stats} items={activeItems} />}

      {/* Tabs */}
      <div
        className="flex gap-1 mb-6 p-1 rounded-lg"
        style={{ background: "var(--bg-secondary)" }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center"
              style={{
                background: isActive ? "var(--bg-tertiary)" : "transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "week" && (
        <ScheduleWeekView
          items={getItemsForWeek(getCurrentWeekStart())}
          weekStart={getCurrentWeekStart()}
          onComplete={completeItem}
          onSkip={skipItem}
          onRemove={removeItem}
          onReschedule={rescheduleItem}
          onAddItem={addItem}
        />
      )}

      {activeTab === "calendar" && (
        <ScheduleMonthView
          items={activeItems}
          onComplete={completeItem}
          onSkip={skipItem}
          getItemsForMonth={getItemsForMonth}
        />
      )}

      {activeTab === "upcoming" && (
        <ScheduleTimeline
          items={activeItems.filter(
            (i) => i.status === "scheduled" || i.status === "in_progress" || i.status === "overdue"
          )}
          onComplete={completeItem}
          onSkip={skipItem}
          onRemove={removeItem}
        />
      )}

      {activeTab === "settings" && (
        <ScheduleSettings
          schedule={activeSchedule!}
          schedules={schedules}
          itemCount={activeItems.length}
          onDelete={deleteSchedule}
          onSwitch={switchSchedule}
          onNewSchedule={() => setShowWizard(true)}
        />
      )}
    </main>
  );
}

// ---- Settings Panel (inline, simple) ----

function ScheduleSettings({
  schedule,
  schedules,
  itemCount,
  onDelete,
  onSwitch,
  onNewSchedule,
}: {
  schedule: import("@/lib/types").ReadingSchedule;
  schedules: import("@/lib/types").ReadingSchedule[];
  itemCount: number;
  onDelete: (id: string) => void;
  onSwitch: (id: string) => void;
  onNewSchedule: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="space-y-6">
      <div
        className="rounded-lg p-6"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
      >
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Active Schedule
        </h3>
        <div className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <p><strong>Name:</strong> {schedule.name}</p>
          <p><strong>Pace:</strong> {schedule.pace_per_week} editions/week</p>
          <p><strong>Source:</strong> {schedule.source_type ?? "manual"}</p>
          <p><strong>Started:</strong> {schedule.start_date}</p>
        </div>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="mt-4 px-4 py-2 rounded-lg text-sm"
            style={{
              border: "1px solid var(--accent-red)",
              color: "var(--accent-red)",
              background: "transparent",
            }}
          >
            Delete Schedule
          </button>
        ) : (
          <div
            className="mt-4 rounded-lg p-4"
            style={{ background: "rgba(233, 69, 96, 0.1)", border: "1px solid var(--accent-red)" }}
          >
            <p className="text-sm font-medium mb-1" style={{ color: "var(--accent-red)" }}>
              Delete &ldquo;{schedule.name}&rdquo;?
            </p>
            <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
              This will remove the schedule and all {itemCount} scheduled item{itemCount !== 1 ? "s" : ""}. Your collection is not affected.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 rounded-lg text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => onDelete(schedule.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "var(--accent-red)", color: "#fff" }}
              >
                Yes, Delete Everything
              </button>
            </div>
          </div>
        )}
      </div>

      {schedules.length > 1 && (
        <div
          className="rounded-lg p-6"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
        >
          <h3
            className="text-lg font-semibold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            All Schedules
          </h3>
          <div className="space-y-2">
            {schedules.map((s) => (
              <button
                key={s.id}
                onClick={() => onSwitch(s.id)}
                className="w-full text-left px-4 py-3 rounded-lg text-sm transition-colors"
                style={{
                  background: s.is_active ? "var(--bg-tertiary)" : "transparent",
                  color: s.is_active ? "var(--text-primary)" : "var(--text-secondary)",
                  border: s.is_active ? "1px solid var(--accent-blue)" : "1px solid var(--border-default)",
                }}
              >
                <span className="font-medium">{s.name}</span>
                {s.is_active && (
                  <span className="ml-2 text-xs" style={{ color: "var(--accent-green)" }}>
                    Active
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onNewSchedule}
        className="px-4 py-2 rounded-lg text-sm font-medium"
        style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}
      >
        Create New Schedule
      </button>
    </div>
  );
}
