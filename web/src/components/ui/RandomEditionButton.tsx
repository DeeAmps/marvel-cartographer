"use client";

import { useRouter } from "next/navigation";
import { Shuffle } from "lucide-react";

export default function RandomEditionButton({ slugs }: { slugs: string[] }) {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        const randomSlug = slugs[Math.floor(Math.random() * slugs.length)];
        router.push(`/edition/${randomSlug}`);
      }}
      className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm border transition-all hover:border-[var(--accent-purple)] hover:shadow-lg hover:shadow-[var(--accent-purple)]/10"
      style={{ borderColor: "var(--border-default)", color: "var(--text-primary)", background: "var(--bg-secondary)" }}
    >
      <Shuffle size={18} style={{ color: "var(--accent-purple)" }} />
      Random Edition
    </button>
  );
}
