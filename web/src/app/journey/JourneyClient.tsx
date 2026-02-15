"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCollection } from "@/hooks/useCollection";
import { supabase } from "@/lib/supabase";
import { buildJourneyFrames, computeJourneyStats } from "@/lib/journey-animator";
import type { JourneyFrame } from "@/lib/types";
import JourneyCanvas from "@/components/journey/JourneyCanvas";
import JourneyControls from "@/components/journey/JourneyControls";
import JourneyStats from "@/components/journey/JourneyStats";
import { LogIn, BookOpen } from "lucide-react";
import Link from "next/link";

export default function JourneyClient() {
  const { items, hydrated, authenticated } = useCollection();
  const [frames, setFrames] = useState<JourneyFrame[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load edition metadata for collection items
  useEffect(() => {
    if (!hydrated) return;

    const completedItems = items.filter(
      (i) => i.status === "completed" || i.status === "reading"
    );

    if (completedItems.length === 0) {
      setFrames([]);
      setLoading(false);
      return;
    }

    async function loadEditionData() {
      const slugs = completedItems.map((i) => i.edition_slug);

      const { data: editions } = await supabase
        .from("editions_full")
        .select("slug, title, importance, era_slug")
        .in("slug", slugs);

      if (!editions || editions.length === 0) {
        setFrames([]);
        setLoading(false);
        return;
      }

      const { data: eras } = await supabase
        .from("eras")
        .select("slug, color");

      const eraColors: Record<string, string> = {};
      for (const era of eras || []) {
        eraColors[era.slug] = era.color || "#888";
      }

      const editionMap = new Map(
        editions.map((e) => [e.slug, e])
      );

      const enriched = completedItems
        .filter((item) => editionMap.has(item.edition_slug))
        .map((item) => {
          const ed = editionMap.get(item.edition_slug)!;
          return {
            slug: ed.slug,
            title: ed.title,
            completed_at: item.added_at, // Use added_at as proxy for completion time
            era_slug: ed.era_slug || "",
            era_color: eraColors[ed.era_slug || ""] || "#888",
            importance: ed.importance || "supplemental",
          };
        });

      const builtFrames = buildJourneyFrames(enriched);
      setFrames(builtFrames);
      setLoading(false);
    }

    loadEditionData();
  }, [items, hydrated]);

  // Animation timer
  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      const interval = 1200 / speed; // Base: 1.2s per frame

      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= frames.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, interval);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, frames.length]);

  const handleTogglePlay = useCallback(() => {
    if (currentIndex >= frames.length - 1) {
      // Reset and play
      setCurrentIndex(-1);
      setIsPlaying(true);
    } else {
      setIsPlaying((p) => !p);
    }
  }, [currentIndex, frames.length]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(-1);
  }, []);

  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex((p) => Math.min(p + 1, frames.length - 1));
  }, [frames.length]);

  const handleStepBackward = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex((p) => Math.max(p - 1, -1));
  }, []);

  // Not authenticated
  if (hydrated && !authenticated) {
    return (
      <div
        className="text-center py-16 rounded-xl border"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
        }}
      >
        <LogIn
          size={48}
          className="mx-auto mb-4"
          style={{ color: "var(--text-tertiary)" }}
        />
        <h2
          className="text-xl font-bold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Sign In to Replay Your Journey
        </h2>
        <p
          className="text-sm mb-6 max-w-md mx-auto"
          style={{ color: "var(--text-secondary)" }}
        >
          Track editions in your collection, then watch your reading journey
          unfold as an animated timeline.
        </p>
        <Link
          href="/collection"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
          style={{
            background: "var(--accent-purple)",
            color: "#fff",
          }}
        >
          <BookOpen size={16} />
          Go to Collection
        </Link>
      </div>
    );
  }

  // Loading
  if (loading || !hydrated) {
    return (
      <div
        className="text-center py-16 rounded-xl border"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
        }}
      >
        <div
          className="text-sm animate-pulse"
          style={{ color: "var(--text-tertiary)" }}
        >
          Loading your journey...
        </div>
      </div>
    );
  }

  // No completed editions
  if (frames.length === 0) {
    return (
      <div
        className="text-center py-16 rounded-xl border"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-default)",
        }}
      >
        <BookOpen
          size={48}
          className="mx-auto mb-4"
          style={{ color: "var(--text-tertiary)" }}
        />
        <h2
          className="text-xl font-bold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Start Your Journey
        </h2>
        <p
          className="text-sm mb-6 max-w-md mx-auto"
          style={{ color: "var(--text-secondary)" }}
        >
          Mark editions as &quot;Reading&quot; or &quot;Completed&quot; in your collection
          to build your journey replay.
        </p>
        <Link
          href="/timeline"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
          style={{
            background: "var(--accent-purple)",
            color: "#fff",
          }}
        >
          Browse Timeline
        </Link>
      </div>
    );
  }

  const stats =
    currentIndex >= 0
      ? computeJourneyStats(frames, currentIndex)
      : { editionsRead: 0, erasCovered: 0, essentialCount: 0, latestEra: "" };

  return (
    <div className="space-y-4">
      <JourneyStats
        editionsRead={stats.editionsRead}
        erasCovered={stats.erasCovered}
        essentialCount={stats.essentialCount}
        totalFrames={frames.length}
      />

      <JourneyCanvas
        frames={frames}
        currentIndex={currentIndex}
        hoveredIndex={hoveredIndex}
        onHover={setHoveredIndex}
      />

      <JourneyControls
        isPlaying={isPlaying}
        speed={speed}
        currentIndex={currentIndex}
        totalFrames={frames.length}
        onTogglePlay={handleTogglePlay}
        onSpeedChange={setSpeed}
        onReset={handleReset}
        onStepForward={handleStepForward}
        onStepBackward={handleStepBackward}
      />

      <p
        className="text-center text-xs"
        style={{ color: "var(--text-tertiary)" }}
      >
        Press play to animate your reading journey. Hover dots for edition
        details. Use speed controls to adjust pace.
      </p>
    </div>
  );
}
