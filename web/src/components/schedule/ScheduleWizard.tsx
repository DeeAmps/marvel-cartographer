"use client";

import { useState, useEffect } from "react";
import { BookOpen, Library, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import PacePicker from "./PacePicker";

type SourceMode = "path" | "collection" | "manual";
type Step = "source" | "configure" | "confirm";

interface PathOption {
  slug: string;
  name: string;
  category: string;
  entryCount: number;
}

interface Props {
  onScheduleFromPath: (pathSlug: string, startDate: Date, pace: number) => Promise<void>;
  onScheduleFromCollection: (startDate: Date, pace: number) => Promise<void>;
  onCreateManual: (name: string, pace: number) => Promise<void>;
  onCancel: () => void;
}

export default function ScheduleWizard({
  onScheduleFromPath,
  onScheduleFromCollection,
  onCreateManual,
  onCancel,
}: Props) {
  const [step, setStep] = useState<Step>("source");
  const [sourceMode, setSourceMode] = useState<SourceMode | null>(null);
  const [pace, setPace] = useState(1.0);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [manualName, setManualName] = useState("My Reading Plan");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [paths, setPaths] = useState<PathOption[]>([]);
  const [pathSearch, setPathSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch reading paths when path mode is selected
  useEffect(() => {
    if (sourceMode !== "path") return;

    async function loadPaths() {
      const { data } = await supabase
        .from("reading_paths")
        .select("slug, name, category")
        .order("name");

      if (!data) return;

      // Count entries per path
      const { data: entries } = await supabase
        .from("reading_path_entries")
        .select("path_id, reading_paths!inner(slug)");

      const countMap = new Map<string, number>();
      for (const e of entries ?? []) {
        const pathSlug = (e.reading_paths as unknown as Record<string, unknown>)?.slug as string;
        if (pathSlug) countMap.set(pathSlug, (countMap.get(pathSlug) ?? 0) + 1);
      }

      setPaths(
        data.map((p) => ({
          slug: p.slug,
          name: p.name,
          category: p.category,
          entryCount: countMap.get(p.slug) ?? 0,
        }))
      );
    }

    loadPaths();
  }, [sourceMode]);

  const filteredPaths = pathSearch
    ? paths.filter((p) =>
        p.name.toLowerCase().includes(pathSearch.toLowerCase())
      )
    : paths;

  const selectedPathData = paths.find((p) => p.slug === selectedPath);

  const handleConfirm = async () => {
    setSubmitting(true);
    const start = new Date(startDate + "T12:00:00");

    if (sourceMode === "path" && selectedPath) {
      await onScheduleFromPath(selectedPath, start, pace);
    } else if (sourceMode === "collection") {
      await onScheduleFromCollection(start, pace);
    } else {
      await onCreateManual(manualName, pace);
    }

    setSubmitting(false);
  };

  const canProceedFromSource =
    sourceMode === "manual" ||
    sourceMode === "collection" ||
    (sourceMode === "path" && selectedPath);

  return (
    <div
      className="rounded-lg p-6"
      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {(["source", "configure", "confirm"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background:
                  step === s
                    ? "var(--accent-red)"
                    : i < ["source", "configure", "confirm"].indexOf(step)
                    ? "var(--accent-green)"
                    : "var(--bg-tertiary)",
                color: "#fff",
              }}
            >
              {i + 1}
            </div>
            {i < 2 && (
              <div
                className="w-8 h-0.5"
                style={{ background: "var(--border-default)" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Source */}
      {step === "source" && (
        <div>
          <h3
            className="text-lg font-semibold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            How do you want to build your schedule?
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {[
              {
                mode: "path" as SourceMode,
                icon: BookOpen,
                label: "Reading Path",
                desc: "Follow a curated reading order",
                color: "var(--accent-blue)",
              },
              {
                mode: "collection" as SourceMode,
                icon: Library,
                label: "My Collection",
                desc: "Schedule what you already own",
                color: "var(--accent-purple)",
              },
              {
                mode: "manual" as SourceMode,
                icon: Sparkles,
                label: "Manual",
                desc: "Build from scratch",
                color: "var(--accent-gold)",
              },
            ].map(({ mode, icon: Icon, label, desc, color }) => (
              <button
                key={mode}
                onClick={() => setSourceMode(mode)}
                className="p-4 rounded-lg text-left transition-colors"
                style={{
                  background:
                    sourceMode === mode ? "var(--bg-tertiary)" : "transparent",
                  border:
                    sourceMode === mode
                      ? `1px solid ${color}`
                      : "1px solid var(--border-default)",
                }}
              >
                <Icon size={20} style={{ color }} />
                <p
                  className="text-sm font-medium mt-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {label}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  {desc}
                </p>
              </button>
            ))}
          </div>

          {/* Path selector */}
          {sourceMode === "path" && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search paths..."
                value={pathSearch}
                onChange={(e) => setPathSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm mb-3"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                }}
              />
              <div
                className="max-h-60 overflow-y-auto space-y-1 rounded-lg p-1"
                style={{ background: "var(--bg-primary)" }}
              >
                {filteredPaths.map((path) => (
                  <button
                    key={path.slug}
                    onClick={() => setSelectedPath(path.slug)}
                    className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors"
                    style={{
                      background:
                        selectedPath === path.slug
                          ? "var(--bg-tertiary)"
                          : "transparent",
                      color:
                        selectedPath === path.slug
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                    }}
                  >
                    <span className="font-medium">{path.name}</span>
                    <span className="ml-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {path.entryCount} editions · {path.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Cancel
            </button>
            <button
              onClick={() => setStep("configure")}
              disabled={!canProceedFromSource}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
              style={{
                background: "var(--accent-red)",
                color: "#fff",
                opacity: canProceedFromSource ? 1 : 0.4,
              }}
            >
              Next <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Configure */}
      {step === "configure" && (
        <div>
          <h3
            className="text-lg font-semibold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Configure Your Schedule
          </h3>

          <div className="space-y-6">
            {sourceMode === "manual" && (
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  Schedule Name
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            )}

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm"
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
              editionCount={selectedPathData?.entryCount}
              startDate={new Date(startDate + "T12:00:00")}
            />
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep("source")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={() => setStep("confirm")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: "var(--accent-red)", color: "#fff" }}
            >
              Next <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === "confirm" && (
        <div>
          <h3
            className="text-lg font-semibold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Confirm Your Schedule
          </h3>

          <div
            className="space-y-3 p-4 rounded-lg mb-6"
            style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
          >
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--text-secondary)" }}>Source</span>
              <span style={{ color: "var(--text-primary)" }}>
                {sourceMode === "path"
                  ? selectedPathData?.name ?? selectedPath
                  : sourceMode === "collection"
                  ? "My Collection"
                  : manualName}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--text-secondary)" }}>Pace</span>
              <span style={{ color: "var(--text-primary)" }}>
                {pace} edition{pace !== 1 ? "s" : ""}/week
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--text-secondary)" }}>Start</span>
              <span style={{ color: "var(--text-primary)" }}>
                {new Date(startDate + "T12:00:00").toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            {selectedPathData && (
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Editions</span>
                <span style={{ color: "var(--text-primary)" }}>
                  {selectedPathData.entryCount}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep("configure")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="px-6 py-2 rounded-lg text-sm font-semibold transition-opacity"
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
      )}
    </div>
  );
}
