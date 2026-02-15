"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useCollection, type CollectionStatus } from "@/hooks/useCollection";
import { BookOpen, Check, ChevronDown, X, LogIn } from "lucide-react";

const statusOptions: { value: CollectionStatus; label: string; color: string }[] = [
  { value: "owned", label: "Owned", color: "var(--accent-green)" },
  { value: "wishlist", label: "Wishlist", color: "var(--accent-gold)" },
  { value: "reading", label: "Reading", color: "var(--accent-blue)" },
  { value: "completed", label: "Completed", color: "var(--accent-purple)" },
];

export default function CollectionButton({ editionSlug }: { editionSlug: string }) {
  const { getStatus, addItem, removeItem, hydrated, authenticated } = useCollection();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentStatus = getStatus(editionSlug);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!hydrated) return null;

  if (!authenticated) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all"
        style={{
          background: "var(--bg-secondary)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border-default)",
        }}
      >
        <LogIn size={14} />
        Sign in to Collect
      </Link>
    );
  }

  const current = currentStatus
    ? statusOptions.find((o) => o.value === currentStatus)
    : null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all"
        style={{
          background: current ? "var(--bg-tertiary)" : "var(--bg-secondary)",
          color: current ? current.color : "var(--text-secondary)",
          border: `1px solid ${current ? current.color : "var(--border-default)"}`,
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="collection-dropdown"
        aria-label={current ? `Collection status: ${current.label}` : "Add to collection"}
      >
        {current ? <Check size={14} /> : <BookOpen size={14} />}
        {current ? current.label : "Add to Collection"}
        <ChevronDown size={12} />
      </button>

      {open && (
        <div
          id="collection-dropdown"
          role="listbox"
          aria-label="Collection status options"
          className="absolute right-0 mt-1 z-30 rounded-lg border shadow-lg py-1 min-w-[160px]"
          style={{ background: "var(--bg-tertiary)", borderColor: "var(--border-default)" }}
        >
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              role="option"
              aria-selected={currentStatus === opt.value}
              onClick={() => {
                addItem(editionSlug, opt.value);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs font-bold flex items-center gap-2 transition-colors"
              style={{
                color: currentStatus === opt.value ? opt.color : "var(--text-secondary)",
                background: currentStatus === opt.value ? "var(--bg-secondary)" : "transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  currentStatus === opt.value ? "var(--bg-secondary)" : "transparent")
              }
            >
              {currentStatus === opt.value && <Check size={12} />}
              {opt.label}
            </button>
          ))}
          {currentStatus && (
            <>
              <div className="my-1" style={{ borderTop: "1px solid var(--border-default)" }} />
              <button
                onClick={() => {
                  removeItem(editionSlug);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold flex items-center gap-2 transition-colors"
                style={{ color: "var(--accent-red)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <X size={12} />
                Remove
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
