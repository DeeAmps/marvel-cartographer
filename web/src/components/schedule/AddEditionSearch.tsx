"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Plus, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface SearchResult {
  slug: string;
  title: string;
  cover_image_url: string | null;
  importance: string;
  era_name?: string;
  era_color?: string;
}

interface Props {
  onAdd: (slug: string, startDate: string, endDate: string) => Promise<boolean>;
  isEditionScheduled: (slug: string) => boolean;
  defaultDate?: string;
  onClose?: () => void;
}

export default function AddEditionSearch({ onAdd, isEditionScheduled, defaultDate, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const today = defaultDate ?? new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const defaultEnd = (() => { const d = new Date(today); d.setDate(d.getDate() + 6); return d.toISOString().split("T")[0]; })();
  const [endDate, setEndDate] = useState(defaultEnd);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("collected_editions")
        .select("slug, title, cover_image_url, importance, eras!collected_editions_era_id_fkey(name, color)")
        .textSearch("search_text", query.split(/\s+/).join(" & "), { type: "plain" })
        .limit(10);

      if (data) {
        setResults(
          data.map((row: Record<string, unknown>) => {
            const era = row.eras as Record<string, unknown> | null;
            return {
              slug: row.slug as string,
              title: row.title as string,
              cover_image_url: row.cover_image_url as string | null,
              importance: row.importance as string,
              era_name: era?.name as string | undefined,
              era_color: era?.color as string | undefined,
            };
          })
        );
      }
      setSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleAdd = async (slug: string) => {
    const ok = await onAdd(slug, startDate, endDate);
    if (ok) toast.success("Added to schedule");
    else toast.error("Failed to add");
  };

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-default)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Add Edition to Schedule
        </h4>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-tertiary)]">
            <X size={14} style={{ color: "var(--text-tertiary)" }} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 mb-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-tertiary)" }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search editions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: "var(--text-tertiary)" }}>Start</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (e.target.value > endDate) {
                  const d = new Date(e.target.value);
                  d.setDate(d.getDate() + 6);
                  setEndDate(d.toISOString().split("T")[0]);
                }
              }}
              className="w-full px-2 py-2 rounded-lg text-sm"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: "var(--text-tertiary)" }}>Finish by</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2 py-2 rounded-lg text-sm"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {searching && (
        <p className="text-xs py-2" style={{ color: "var(--text-tertiary)" }}>Searching...</p>
      )}

      {results.length > 0 && (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {results.map((r) => {
            const already = isEditionScheduled(r.slug);
            return (
              <div
                key={r.slug}
                className="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
              >
                {r.cover_image_url ? (
                  <img
                    src={r.cover_image_url}
                    alt=""
                    className="rounded flex-shrink-0 object-cover"
                    style={{ width: 32, height: 48 }}
                  />
                ) : (
                  <div
                    className="rounded flex-shrink-0"
                    style={{ width: 32, height: 48, background: r.era_color ?? "var(--bg-tertiary)", opacity: 0.4 }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {r.title}
                  </p>
                  <div className="flex items-center gap-2">
                    {r.era_name && (
                      <span className="text-xs" style={{ color: r.era_color ?? "var(--text-tertiary)" }}>
                        {r.era_name}
                      </span>
                    )}
                    <span
                      className="text-xs"
                      style={{
                        color: r.importance === "essential" ? "var(--accent-red)"
                          : r.importance === "recommended" ? "var(--accent-gold)"
                          : "var(--text-tertiary)",
                      }}
                    >
                      {r.importance}
                    </span>
                  </div>
                </div>
                {already ? (
                  <span className="flex items-center gap-1 text-xs" style={{ color: "var(--accent-green)" }}>
                    <Check size={12} /> Added
                  </span>
                ) : (
                  <button
                    onClick={() => handleAdd(r.slug)}
                    className="p-1.5 rounded-md transition-colors hover:bg-[var(--bg-primary)]"
                    title="Add to schedule"
                  >
                    <Plus size={16} style={{ color: "var(--accent-blue)" }} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {query.length >= 2 && !searching && results.length === 0 && (
        <p className="text-xs py-2" style={{ color: "var(--text-tertiary)" }}>
          No editions found for &ldquo;{query}&rdquo;
        </p>
      )}
    </div>
  );
}
