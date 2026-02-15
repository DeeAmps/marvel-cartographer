"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";

export default function FilterDrawer({
  children,
  activeCount,
}: {
  children: ReactNode;
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop: show filters inline */}
      <div className="hidden md:block">{children}</div>

      {/* Mobile: show button + drawer */}
      <div className="md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all"
          style={{
            background: "var(--bg-secondary)",
            borderColor: activeCount > 0 ? "var(--accent-red)" : "var(--border-default)",
            color: "var(--text-primary)",
          }}
        >
          <SlidersHorizontal size={16} />
          Filters
          {activeCount > 0 && (
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "var(--accent-red)", color: "#fff" }}
            >
              {activeCount}
            </span>
          )}
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.5)" }}
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto"
              style={{ background: "var(--bg-secondary)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-lg font-bold tracking-tight"
                  style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
                >
                  FILTERS
                </h3>
                <button onClick={() => setOpen(false)} className="p-2 rounded-lg">
                  <X size={20} style={{ color: "var(--text-tertiary)" }} />
                </button>
              </div>
              {children}
              <button
                onClick={() => setOpen(false)}
                className="w-full mt-6 py-3 rounded-lg font-bold text-sm transition-all"
                style={{ background: "var(--accent-red)", color: "#fff" }}
              >
                Apply Filters
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
