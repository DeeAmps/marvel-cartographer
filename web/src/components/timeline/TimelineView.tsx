"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as d3 from "d3";

interface EraData {
  slug: string;
  name: string;
  year_start: number;
  year_end: number;
  color: string;
  editions: {
    slug: string;
    title: string;
    importance: string;
    print_status: string;
    cover_image_url?: string;
  }[];
}

type ImportanceFilter = "essential" | "recommended" | "all";

const importanceColors: Record<string, string> = {
  essential: "#ff1744",
  recommended: "#f0a500",
  supplemental: "#00e676",
  completionist: "#6e7681",
};

function passesFilter(importance: string, filter: ImportanceFilter): boolean {
  if (filter === "all") return true;
  if (filter === "recommended") return importance === "essential" || importance === "recommended";
  return importance === "essential";
}

export default function TimelineView({ eras }: { eras: EraData[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    edition: EraData["editions"][0];
    era: string;
  } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 420 });
  const [isMobile, setIsMobile] = useState(false);
  const [importanceFilter, setImportanceFilter] = useState<ImportanceFilter>("all");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isFullscreen]);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isFullscreen]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const mobile = w < 640;
        setIsMobile(mobile);
        if (isFullscreen) {
          // Fill the available space in the fullscreen modal
          // The container is inside a flex column, so contentRect.height is correct
          const h = entry.contentRect.height;
          setDimensions({
            width: Math.max(w, 600),
            height: Math.max(h, 300),
          });
        } else {
          setDimensions({
            width: Math.max(w, 600),
            height: mobile ? 320 : 420,
          });
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [isFullscreen]);

  const margin = useMemo(() => ({ top: 20, right: 20, bottom: 50, left: 20 }), []);
  const innerWidth = useMemo(() => dimensions.width - margin.left - margin.right, [dimensions.width, margin]);
  const innerHeight = useMemo(() => dimensions.height - margin.top - margin.bottom, [dimensions.height, margin]);

  const filteredEras = useMemo(() => {
    return eras
      .map((era) => ({
        ...era,
        filteredEditions: era.editions.filter((ed) => passesFilter(ed.importance, importanceFilter)),
      }))
      .filter((era) => era.filteredEditions.length > 0);
  }, [eras, importanceFilter]);

  const totalFilteredEditions = useMemo(
    () => filteredEras.reduce((sum, era) => sum + era.filteredEditions.length, 0),
    [filteredEras]
  );

  // Compute era-proportional layout bands
  const eraBands = useMemo(() => {
    if (filteredEras.length === 0 || totalFilteredEditions === 0) return [];

    const minBandWidth = 60;
    const gapWidth = 2; // gap between era bands
    const totalGaps = (filteredEras.length - 1) * gapWidth;
    const availableWidth = innerWidth - totalGaps;

    // First pass: allocate proportionally
    const rawWidths = filteredEras.map(
      (era) => (era.filteredEditions.length / totalFilteredEditions) * availableWidth
    );

    // Second pass: enforce minimum, redistribute from larger bands
    const finalWidths = [...rawWidths];
    let deficit = 0;
    let largeCount = 0;
    for (let i = 0; i < finalWidths.length; i++) {
      if (finalWidths[i] < minBandWidth) {
        deficit += minBandWidth - finalWidths[i];
        finalWidths[i] = minBandWidth;
      } else {
        largeCount++;
      }
    }
    if (largeCount > 0 && deficit > 0) {
      const reduction = deficit / largeCount;
      for (let i = 0; i < finalWidths.length; i++) {
        if (rawWidths[i] >= minBandWidth) {
          finalWidths[i] = Math.max(minBandWidth, finalWidths[i] - reduction);
        }
      }
    }

    // Build cumulative offsets
    let cumX = 0;
    return filteredEras.map((era, i) => {
      const band = { era, x: cumX, width: finalWidths[i] };
      cumX += finalWidths[i] + gapWidth;
      return band;
    });
  }, [filteredEras, totalFilteredEditions, innerWidth]);

  const thumbDimensions = useMemo(() => {
    const w = dimensions.width < 640 ? 22 : 30;
    return { thumbW: w, thumbH: Math.round(w * 1.5) };
  }, [dimensions.width]);

  // D3 rendering
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    if (eraBands.length === 0) {
      svg
        .append("text")
        .attr("x", dimensions.width / 2)
        .attr("y", dimensions.height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#6e7681")
        .attr("font-size", "14px")
        .text("No editions match the current filter.");
      return;
    }

    const { thumbW, thumbH } = thumbDimensions;

    // Main group that zoom/pan will transform
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // D3 zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4])
      .translateExtent([
        [-margin.left, -margin.top],
        [dimensions.width, dimensions.height],
      ])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr("transform", event.transform.toString());
        // Dismiss tooltip while zooming/panning
        setTooltip(null);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Set initial transform so the group starts at margin offset
    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(margin.left, margin.top)
    );

    // Era bands + labels + editions
    eraBands.forEach(({ era, x: bandX, width: bandWidth }) => {
      // Band background
      g.append("rect")
        .attr("x", bandX)
        .attr("y", 0)
        .attr("width", bandWidth)
        .attr("height", innerHeight)
        .attr("fill", era.color)
        .attr("opacity", 0.12)
        .attr("rx", 3);

      // Era name label (top, centered)
      const maxLabelChars = Math.floor(bandWidth / 6);
      const eraLabel =
        era.name.length > maxLabelChars
          ? era.name.slice(0, Math.max(maxLabelChars - 1, 3)) + "\u2026"
          : era.name;

      g.append("text")
        .attr("x", bandX + bandWidth / 2)
        .attr("y", 12)
        .attr("text-anchor", "middle")
        .attr("fill", era.color)
        .attr("font-size", "8px")
        .attr("font-weight", "bold")
        .attr("opacity", 0.8)
        .text(eraLabel);

      // Year range under name (smaller)
      if (bandWidth > 50) {
        g.append("text")
          .attr("x", bandX + bandWidth / 2)
          .attr("y", 22)
          .attr("text-anchor", "middle")
          .attr("fill", era.color)
          .attr("font-size", "7px")
          .attr("opacity", 0.5)
          .style("font-family", "var(--font-geist-mono), monospace")
          .text(`${era.year_start}\u2013${era.year_end}`);
      }

      // Place editions within this era band
      const editions = era.filteredEditions;
      const count = editions.length;
      if (count === 0) return;

      // Dynamic row count: up to 5 rows, based on density
      const maxRows = Math.min(5, Math.max(2, Math.ceil(count / Math.max(1, Math.floor(bandWidth / (thumbW + 4))))));
      const rowHeight = thumbH + 8;
      const editionsStartY = 28;

      editions.forEach((edition, i) => {
        const col = Math.floor(i / maxRows);
        const row = i % maxRows;
        const colCount = Math.ceil(count / maxRows);
        const editionX =
          bandX + (bandWidth / (colCount + 1)) * (col + 1);
        const editionY = editionsStartY + row * rowHeight;

        const importanceColor = importanceColors[edition.importance] || "#6e7681";

        if (edition.cover_image_url) {
          const fo = g
            .append("foreignObject")
            .attr("x", editionX - thumbW / 2)
            .attr("y", editionY)
            .attr("width", thumbW)
            .attr("height", thumbH)
            .attr("cursor", "pointer")
            .style("overflow", "visible");

          const container = fo
            .append("xhtml:div")
            .style("width", thumbW + "px")
            .style("height", thumbH + "px")
            .style("border-radius", "3px")
            .style("overflow", "hidden")
            .style("border", `2px solid ${importanceColor}`)
            .style("opacity", "0.9")
            .style("transition", "transform 150ms, opacity 150ms, box-shadow 150ms")
            .style("box-shadow", "0 1px 4px rgba(0,0,0,0.4)");

          const imgEl = container
            .append("xhtml:img")
            .attr("src", edition.cover_image_url)
            .attr("alt", edition.title)
            .attr("loading", "lazy")
            .attr("decoding", "async")
            .style("width", "100%")
            .style("height", "100%")
            .style("object-fit", "cover")
            .style("display", "block");

          // Fallback: on error, replace the foreignObject with a dot
          (imgEl.node() as HTMLImageElement)?.addEventListener("error", () => {
            fo.remove();
            g.append("circle")
              .attr("cx", editionX)
              .attr("cy", editionY + thumbH / 2)
              .attr("r", edition.importance === "essential" ? 5 : 3.5)
              .attr("fill", importanceColor)
              .attr("opacity", 0.8)
              .attr("cursor", "pointer");
          });

          fo.on("mouseenter", function (event: MouseEvent) {
            d3.select(this)
              .select("div")
              .style("transform", "scale(1.3)")
              .style("opacity", "1")
              .style("box-shadow", `0 4px 12px ${importanceColor}66`)
              .style("z-index", "10");
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
              setTooltip({
                x: event.clientX - rect.left,
                y: event.clientY - rect.top - 10,
                edition,
                era: era.name,
              });
            }
          })
            .on("mouseleave", function () {
              d3.select(this)
                .select("div")
                .style("transform", "scale(1)")
                .style("opacity", "0.9")
                .style("box-shadow", "0 1px 4px rgba(0,0,0,0.4)")
                .style("z-index", "auto");
              setTooltip(null);
            })
            .on("click", function () {
              window.location.href = `/edition/${edition.slug}`;
            });
        } else {
          // Fallback dot
          g.append("circle")
            .attr("cx", editionX)
            .attr("cy", editionY + thumbH / 2)
            .attr("r", edition.importance === "essential" ? 5 : 3.5)
            .attr("fill", importanceColor)
            .attr("stroke", "#0d1117")
            .attr("stroke-width", 1)
            .attr("cursor", "pointer")
            .attr("opacity", 0.85)
            .on("mouseenter", function (event: MouseEvent) {
              d3.select(this)
                .transition()
                .duration(150)
                .attr("r", edition.importance === "essential" ? 8 : 6)
                .attr("opacity", 1);
              const rect = containerRef.current?.getBoundingClientRect();
              if (rect) {
                setTooltip({
                  x: event.clientX - rect.left,
                  y: event.clientY - rect.top - 10,
                  edition,
                  era: era.name,
                });
              }
            })
            .on("mouseleave", function () {
              d3.select(this)
                .transition()
                .duration(150)
                .attr("r", edition.importance === "essential" ? 5 : 3.5)
                .attr("opacity", 0.85);
              setTooltip(null);
            })
            .on("click", function () {
              window.location.href = `/edition/${edition.slug}`;
            });
        }
      });
    });

    // Bottom axis: era-name based ticks
    const axisG = g
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`);

    // Axis baseline
    axisG
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", "#30363d");

    eraBands.forEach(({ era, x: bandX, width: bandWidth }) => {
      // Tick mark
      const cx = bandX + bandWidth / 2;
      axisG
        .append("line")
        .attr("x1", cx)
        .attr("x2", cx)
        .attr("y1", 0)
        .attr("y2", 6)
        .attr("stroke", "#30363d");

      // Era year label
      axisG
        .append("text")
        .attr("x", cx)
        .attr("y", 18)
        .attr("text-anchor", "middle")
        .attr("fill", "#6e7681")
        .attr("font-size", "8px")
        .style("font-family", "var(--font-geist-mono), monospace")
        .text(`${era.year_start}\u2013${era.year_end}`);

      // Edition count
      axisG
        .append("text")
        .attr("x", cx)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("fill", "#4a5060")
        .attr("font-size", "7px")
        .style("font-family", "var(--font-geist-mono), monospace")
        .text(`${era.filteredEditions.length} ed.`);
    });
  }, [eraBands, dimensions, thumbDimensions, margin, innerWidth, innerHeight]);

  const handleResetZoom = useCallback(() => {
    const svgEl = svgRef.current;
    const zoom = zoomRef.current;
    if (!svgEl || !zoom) return;
    d3.select(svgEl)
      .transition()
      .duration(300)
      .call(
        zoom.transform as unknown as (
          transition: d3.Transition<SVGSVGElement, unknown, null, undefined>,
          transform: d3.ZoomTransform,
        ) => void,
        d3.zoomIdentity.translate(margin.left, margin.top)
      );
  }, [margin]);

  const filterOptions: { label: string; value: ImportanceFilter; color: string }[] = [
    { label: "Essential", value: "essential", color: importanceColors.essential },
    { label: "+ Recommended", value: "recommended", color: importanceColors.recommended },
    { label: "All", value: "all", color: "#8b949e" },
  ];

  const timelineControls = (
    <div className="flex items-center gap-2 mb-2 flex-wrap">
      <span
        className="text-xs mr-1"
        style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.75rem" }}
      >
        Filter:
      </span>
      {filterOptions.map((opt) => {
        const active = importanceFilter === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setImportanceFilter(opt.value)}
            className="text-xs px-2.5 py-1 rounded-full transition-colors"
            style={{
              background: active ? opt.color + "22" : "transparent",
              color: active ? opt.color : "var(--text-tertiary)",
              border: `1px solid ${active ? opt.color : "var(--border-default)"}`,
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "0.75rem",
              fontWeight: active ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {opt.label}
            {active && (
              <span style={{ marginLeft: 4, fontSize: "0.75rem", opacity: 0.7 }}>
                ({totalFilteredEditions})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const timelineSvg = (
    <div
      ref={containerRef}
      className="relative w-full rounded-lg border overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-default)",
        touchAction: "none",
        ...(isFullscreen ? { flex: 1, minHeight: 0 } : {}),
      }}
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ display: "block" }}
      />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-20 rounded-lg border px-3 py-2 shadow-lg flex gap-2"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
            background: "var(--bg-tertiary)",
            borderColor: "var(--border-default)",
            maxWidth: 260,
          }}
        >
          {tooltip.edition.cover_image_url && (
            <img
              src={tooltip.edition.cover_image_url}
              alt=""
              className="flex-shrink-0 rounded"
              loading="lazy"
              decoding="async"
              style={{ width: 40, height: 60, objectFit: "cover", background: "var(--bg-tertiary)" }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div>
            <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
              {tooltip.edition.title}
            </p>
            <p
              className="text-xs"
              style={{
                color: importanceColors[tooltip.edition.importance] || "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.75rem",
              }}
            >
              {tooltip.edition.importance.toUpperCase()} · {tooltip.era}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const bottomBar = (
    <div className="flex items-center justify-between mt-2">
      <div className="flex items-center gap-2">
        <button
          onClick={handleResetZoom}
          className="text-xs px-2 py-0.5 rounded transition-colors"
          style={{
            color: "var(--text-tertiary)",
            border: "1px solid var(--border-default)",
            background: "transparent",
            cursor: "pointer",
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "0.75rem",
          }}
        >
          Reset View
        </button>
        <button
          onClick={() => setIsFullscreen((v) => !v)}
          className="text-xs px-2 py-0.5 rounded transition-colors"
          style={{
            color: "var(--text-tertiary)",
            border: "1px solid var(--border-default)",
            background: "transparent",
            cursor: "pointer",
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "0.75rem",
          }}
        >
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>
      </div>

      <div className="flex gap-2 sm:gap-3">
        {[
          { label: "Essential", color: importanceColors.essential },
          { label: "Recommended", color: importanceColors.recommended },
          { label: "Supplemental", color: importanceColors.supplemental },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: item.color }}
            />
            <span
              className="text-xs"
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.75rem",
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <>
        {/* Placeholder to keep page layout stable */}
        <div style={{ height: 420 }} />

        {/* Fullscreen overlay */}
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: "var(--bg-primary, #0d1117)" }}
        >
          {/* Header bar */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "var(--border-default)", flexShrink: 0 }}
          >
            <div className="flex items-center gap-3">
              <h2
                className="text-sm font-bold"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-geist-mono), monospace" }}
              >
                Marvel Universe Timeline
              </h2>
              {timelineControls}
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="text-xs px-3 py-1.5 rounded transition-colors"
              style={{
                color: "var(--text-primary)",
                border: "1px solid var(--border-default)",
                background: "var(--bg-secondary)",
                cursor: "pointer",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "0.7rem",
              }}
            >
              ESC to close
            </button>
          </div>

          {/* Mobile zoom hint */}
          {isMobile && (
            <div
              className="text-center text-xs py-1"
              style={{ color: "var(--text-tertiary)", background: "var(--bg-tertiary)", flexShrink: 0 }}
            >
              <span className="inline-block animate-pulse">Pinch to zoom, drag to pan</span>
            </div>
          )}

          {/* Timeline fills remaining space */}
          <div className="flex-1 min-h-0 px-4 py-2 flex flex-col">
            {timelineSvg}
          </div>

          {/* Bottom bar */}
          <div className="px-4 pb-3" style={{ flexShrink: 0 }}>
            {bottomBar}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="relative w-full">
      {timelineControls}

      {/* Scroll/zoom hint for mobile */}
      {isMobile && (
        <div
          className="text-center text-xs py-1 mb-1 rounded"
          style={{ color: "var(--text-tertiary)", background: "var(--bg-tertiary)" }}
        >
          <span className="inline-block animate-pulse">Pinch to zoom, drag to pan</span>
        </div>
      )}

      {timelineSvg}
      {bottomBar}
    </div>
  );
}
