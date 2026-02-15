"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { ThumbsUp, ThumbsDown, HelpCircle } from "lucide-react";

const positions = [
  { value: "agree", label: "Agree", icon: ThumbsUp, color: "var(--accent-green)" },
  { value: "disagree", label: "Disagree", icon: ThumbsDown, color: "var(--accent-red)" },
  { value: "complicated", label: "It's Complicated", icon: HelpCircle, color: "var(--accent-gold)" },
] as const;

export default function VotePanel({
  debateId,
  currentVote,
  onVoted,
}: {
  debateId: string;
  currentVote: string | null;
  onVoted: (position: string) => void;
}) {
  const { user } = useAuth();
  const [voting, setVoting] = useState(false);
  const [selected, setSelected] = useState<string | null>(currentVote);

  async function handleVote(position: string) {
    if (!user || voting) return;
    setVoting(true);
    try {
      const { error } = await supabase.from("debate_votes").upsert(
        {
          debate_id: debateId,
          user_id: user.id,
          position,
        },
        { onConflict: "debate_id,user_id" }
      );
      if (!error) {
        setSelected(position);
        onVoted(position);
      }
    } finally {
      setVoting(false);
    }
  }

  if (!user) {
    return (
      <div
        className="rounded-lg border p-4 text-center"
        style={{ background: "var(--bg-tertiary)", borderColor: "var(--border-default)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          Sign in to vote
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      {positions.map(({ value, label, icon: Icon, color }) => {
        const isSelected = selected === value;
        return (
          <button
            key={value}
            onClick={() => handleVote(value)}
            disabled={voting}
            className="flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-xl border transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{
              background: isSelected
                ? `color-mix(in srgb, ${color} 12%, var(--bg-secondary))`
                : "var(--bg-secondary)",
              borderColor: isSelected ? color : "var(--border-default)",
              color: isSelected ? color : "var(--text-secondary)",
            }}
          >
            <Icon size={24} />
            <span className="text-xs font-bold">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
