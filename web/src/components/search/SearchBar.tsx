"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, BookOpen, Users, Pencil } from "lucide-react";
import Link from "next/link";

interface Suggestion {
  type: "edition" | "character" | "creator";
  label: string;
  slug: string;
  detail: string;
}

const typeIcons = {
  edition: BookOpen,
  character: Users,
  creator: Pencil,
};

const typeColors = {
  edition: "var(--accent-red)",
  character: "var(--accent-blue)",
  creator: "var(--accent-gold)",
};

const typeHrefs = {
  edition: (slug: string) => `/edition/${slug}`,
  character: (slug: string) => `/character/${slug}`,
  creator: (slug: string) => `/creator/${slug}`,
};

export default function SearchBar({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setSelectedIndex(-1);
    } catch {
      setSuggestions([]);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const s = suggestions[selectedIndex];
      setShowSuggestions(false);
      router.push(typeHrefs[s.type](s.slug));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit}>
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
          style={{ color: "var(--text-tertiary)" }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder='Search editions, characters, creators...'
          className="w-full pl-11 pr-4 py-3 rounded-lg border text-sm focus:outline-none focus:border-[var(--accent-red)] transition-colors"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
          }}
          role="combobox"
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-controls="search-suggestions"
          aria-activedescendant={selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined}
          autoComplete="off"
        />
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border shadow-lg overflow-hidden"
          style={{ background: "var(--bg-tertiary)", borderColor: "var(--border-default)" }}
        >
          {suggestions.map((s, i) => {
            const Icon = typeIcons[s.type];
            return (
              <Link
                key={`${s.type}-${s.slug}`}
                id={`suggestion-${i}`}
                role="option"
                aria-selected={i === selectedIndex}
                href={typeHrefs[s.type](s.slug)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors"
                style={{
                  background: i === selectedIndex ? "var(--bg-secondary)" : "transparent",
                }}
                onClick={() => setShowSuggestions(false)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <Icon size={14} style={{ color: typeColors[s.type] }} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-bold block truncate">{s.label}</span>
                  {s.detail && (
                    <span
                      className="text-xs truncate block"
                      style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
                    >
                      {s.detail}
                    </span>
                  )}
                </div>
                <span
                  className="text-xs flex-shrink-0 px-1.5 py-0.5 rounded"
                  style={{
                    color: typeColors[s.type],
                    background: "var(--bg-primary)",
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "0.75rem",
                  }}
                >
                  {s.type.toUpperCase()}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
