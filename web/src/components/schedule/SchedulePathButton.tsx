"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { useReadingSchedule } from "@/hooks/useReadingSchedule";
import PacePicker from "./PacePicker";
import { toast } from "sonner";

interface Props {
  pathSlug: string;
  pathName: string;
  entryCount: number;
}

export default function SchedulePathButton({ pathSlug, pathName, entryCount }: Props) {
  const { authenticated, scheduleFromPath } = useReadingSchedule();
  const [expanded, setExpanded] = useState(false);
  const [pace, setPace] = useState(1.0);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [submitting, setSubmitting] = useState(false);

  if (!authenticated) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-3 rounded-lg border p-4 mb-6 transition-all hover:border-[var(--accent-blue)] hover:shadow-lg hover:shadow-[var(--accent-blue)]/5"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <CalendarDays size={20} style={{ color: "var(--accent-blue)" }} />
        <div className="flex-1">
          <h3 className="text-sm font-bold">Schedule This Path</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Sign in to schedule this reading path on your personal calendar.
          </p>
        </div>
        <ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} />
      </Link>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-3 rounded-lg border p-4 mb-6 w-full text-left transition-all hover:border-[var(--accent-blue)] hover:shadow-lg hover:shadow-[var(--accent-blue)]/5"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <CalendarDays size={20} style={{ color: "var(--accent-blue)" }} />
        <div className="flex-1">
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            Schedule This Path
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Distribute {entryCount} editions across your reading calendar.
          </p>
        </div>
        <ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} />
      </button>
    );
  }

  return (
    <div
      className="rounded-lg border p-4 mb-6"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--accent-blue)" }}
    >
      <h3
        className="text-sm font-bold mb-4"
        style={{ color: "var(--text-primary)" }}
      >
        Schedule &ldquo;{pathName}&rdquo;
      </h3>

      <div className="space-y-4">
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <PacePicker
          pace={pace}
          onChange={setPace}
          editionCount={entryCount}
          startDate={new Date(startDate + "T12:00:00")}
        />
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setExpanded(false)}
          className="px-4 py-2 rounded-lg text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            setSubmitting(true);
            const ok = await scheduleFromPath(
              pathSlug,
              new Date(startDate + "T12:00:00"),
              pace
            );
            setSubmitting(false);
            if (ok) {
              toast.success(`Scheduled "${pathName}"`);
              setExpanded(false);
            } else {
              toast.error("Failed to create schedule");
            }
          }}
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            background: "var(--accent-red)",
            color: "#fff",
            opacity: submitting ? 0.5 : 1,
          }}
        >
          {submitting ? "Creating..." : "Create Schedule"}
        </button>
      </div>
    </div>
  );
}
