"use client";

import { useRef, useEffect, useMemo } from "react";
import type { JourneyFrame } from "@/lib/types";

const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 500;

// Era band definitions for background
const ERA_BANDS: { slug: string; label: string; xStart: number; xEnd: number; color: string }[] = [
  { slug: "birth-of-marvel", label: "Birth", xStart: 30, xEnd: 130, color: "#1a237e" },
  { slug: "the-expansion", label: "Expansion", xStart: 130, xEnd: 230, color: "#283593" },
  { slug: "bronze-age", label: "Bronze", xStart: 230, xEnd: 350, color: "#4527a0" },
  { slug: "rise-of-x-men", label: "X-Men Rise", xStart: 350, xEnd: 470, color: "#6a1b9a" },
  { slug: "event-age", label: "Events", xStart: 470, xEnd: 580, color: "#7b1fa2" },
  { slug: "speculation-crash", label: "Crash", xStart: 580, xEnd: 680, color: "#880e4f" },
  { slug: "heroes-reborn-return", label: "Reborn", xStart: 680, xEnd: 780, color: "#ad1457" },
  { slug: "marvel-knights-ultimate", label: "Knights", xStart: 780, xEnd: 890, color: "#c62828" },
  { slug: "bendis-avengers", label: "Bendis", xStart: 890, xEnd: 1010, color: "#d32f2f" },
  { slug: "hickman-saga", label: "Hickman", xStart: 1010, xEnd: 1140, color: "#e53935" },
  { slug: "all-new-all-different", label: "ANAD", xStart: 1140, xEnd: 1250, color: "#ef5350" },
  { slug: "dawn-of-krakoa", label: "Krakoa", xStart: 1250, xEnd: 1360, color: "#f44336" },
  { slug: "blood-hunt-doom", label: "Doom", xStart: 1360, xEnd: 1450, color: "#ff1744" },
  { slug: "current-ongoings", label: "Current", xStart: 1450, xEnd: 1570, color: "#ff5252" },
];

function importanceRadius(importance: string): number {
  switch (importance) {
    case "essential": return 8;
    case "recommended": return 6;
    case "supplemental": return 4;
    default: return 3;
  }
}

export default function JourneyCanvas({
  frames,
  currentIndex,
  hoveredIndex,
  onHover,
}: {
  frames: JourneyFrame[];
  currentIndex: number;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Visible frames up to current index
  const visibleFrames = useMemo(
    () => frames.slice(0, currentIndex + 1),
    [frames, currentIndex]
  );

  // Draw the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw era bands
    for (const band of ERA_BANDS) {
      ctx.fillStyle = band.color + "15"; // Very faint
      ctx.fillRect(band.xStart, 0, band.xEnd - band.xStart, CANVAS_HEIGHT);

      // Band separator
      ctx.strokeStyle = band.color + "30";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(band.xEnd, 0);
      ctx.lineTo(band.xEnd, CANVAS_HEIGHT);
      ctx.stroke();

      // Era label at bottom
      ctx.fillStyle = band.color + "60";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(band.label, (band.xStart + band.xEnd) / 2, CANVAS_HEIGHT - 10);
    }

    // Draw connection lines between consecutive visible frames
    if (visibleFrames.length > 1) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(visibleFrames[0].x, visibleFrames[0].y);
      for (let i = 1; i < visibleFrames.length; i++) {
        ctx.lineTo(visibleFrames[i].x, visibleFrames[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw visible edition dots
    for (let i = 0; i < visibleFrames.length; i++) {
      const frame = visibleFrames[i];
      const r = importanceRadius(frame.importance);
      const isLatest = i === visibleFrames.length - 1;
      const isHovered = hoveredIndex === i;

      // Glow for latest dot
      if (isLatest) {
        const gradient = ctx.createRadialGradient(
          frame.x, frame.y, 0,
          frame.x, frame.y, r * 4
        );
        gradient.addColorStop(0, frame.era_color + "60");
        gradient.addColorStop(1, frame.era_color + "00");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(frame.x, frame.y, r * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Hovered glow
      if (isHovered) {
        ctx.fillStyle = frame.era_color + "40";
        ctx.beginPath();
        ctx.arc(frame.x, frame.y, r * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dot
      ctx.fillStyle = isLatest ? "#fff" : frame.era_color;
      ctx.beginPath();
      ctx.arc(frame.x, frame.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Stroke for latest
      if (isLatest) {
        ctx.strokeStyle = frame.era_color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(frame.x, frame.y, r + 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Draw title for hovered or latest dot
    const labelFrame =
      hoveredIndex !== null && hoveredIndex < visibleFrames.length
        ? visibleFrames[hoveredIndex]
        : visibleFrames.length > 0
        ? visibleFrames[visibleFrames.length - 1]
        : null;

    if (labelFrame) {
      const label =
        labelFrame.edition_title.length > 40
          ? labelFrame.edition_title.slice(0, 37) + "..."
          : labelFrame.edition_title;
      ctx.fillStyle = "#e6edf3";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, labelFrame.x, labelFrame.y - 18);
    }
  }, [visibleFrames, hoveredIndex]);

  // Handle mouse movement for hover detection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let closest: number | null = null;
    let closestDist = 20; // Max hover distance

    for (let i = 0; i < visibleFrames.length; i++) {
      const f = visibleFrames[i];
      const dist = Math.hypot(f.x - mx, f.y - my);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }

    onHover(closest);
  };

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto overflow-y-hidden rounded-xl border"
      style={{
        background: "var(--bg-primary)",
        borderColor: "var(--border-default)",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          minWidth: 900,
          height: "auto",
          aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
          cursor: "crosshair",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => onHover(null)}
      />
    </div>
  );
}
