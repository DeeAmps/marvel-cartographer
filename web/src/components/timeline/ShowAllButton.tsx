"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  count: number;
  children: React.ReactNode;
}

export default function ShowAllButton({ count, children }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return <>{children}</>;
  }

  return (
    <div className="mt-4 text-center">
      <button
        onClick={() => setExpanded(true)}
        className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md cursor-pointer"
        style={{
          background: "var(--bg-tertiary)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border-default)",
        }}
      >
        Show all {count} editions
      </button>
    </div>
  );
}
