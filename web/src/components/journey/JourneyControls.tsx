"use client";

import { Play, Pause, SkipBack, SkipForward, RotateCcw } from "lucide-react";

export default function JourneyControls({
  isPlaying,
  speed,
  currentIndex,
  totalFrames,
  onTogglePlay,
  onSpeedChange,
  onReset,
  onStepForward,
  onStepBackward,
}: {
  isPlaying: boolean;
  speed: number;
  currentIndex: number;
  totalFrames: number;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
}) {
  const speeds = [0.5, 1, 2, 4];

  return (
    <div
      className="flex items-center justify-center gap-4 py-3 px-4 rounded-lg"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-default)",
      }}
    >
      {/* Reset */}
      <button
        onClick={onReset}
        className="p-2 rounded-md transition-colors"
        style={{ color: "var(--text-secondary)" }}
        title="Reset"
      >
        <RotateCcw size={16} />
      </button>

      {/* Step backward */}
      <button
        onClick={onStepBackward}
        disabled={currentIndex <= 0}
        className="p-2 rounded-md transition-colors disabled:opacity-30"
        style={{ color: "var(--text-secondary)" }}
        title="Previous"
      >
        <SkipBack size={16} />
      </button>

      {/* Play/Pause */}
      <button
        onClick={onTogglePlay}
        className="p-3 rounded-full transition-colors"
        style={{
          background: isPlaying
            ? "color-mix(in srgb, var(--accent-red) 20%, transparent)"
            : "color-mix(in srgb, var(--accent-green) 20%, transparent)",
          color: isPlaying ? "var(--accent-red)" : "var(--accent-green)",
        }}
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>

      {/* Step forward */}
      <button
        onClick={onStepForward}
        disabled={currentIndex >= totalFrames - 1}
        className="p-2 rounded-md transition-colors disabled:opacity-30"
        style={{ color: "var(--text-secondary)" }}
        title="Next"
      >
        <SkipForward size={16} />
      </button>

      {/* Speed selector */}
      <div className="flex items-center gap-1 ml-2">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className="px-2 py-1 rounded text-xs font-bold transition-colors"
            style={{
              background:
                speed === s
                  ? "color-mix(in srgb, var(--accent-blue) 20%, transparent)"
                  : "transparent",
              color: speed === s ? "var(--accent-blue)" : "var(--text-tertiary)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Progress */}
      <div
        className="text-xs ml-2"
        style={{
          color: "var(--text-tertiary)",
          fontFamily: "var(--font-geist-mono), monospace",
        }}
      >
        {currentIndex + 1}/{totalFrames}
      </div>
    </div>
  );
}
