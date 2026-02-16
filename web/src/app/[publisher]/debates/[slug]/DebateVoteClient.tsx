"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import VotePanel from "@/components/debates/VotePanel";

export default function DebateVoteClient({ debateId }: { debateId: string }) {
  const { user } = useAuth();
  const [currentVote, setCurrentVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from("debate_votes")
      .select("position")
      .eq("debate_id", debateId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setCurrentVote(data?.position || null);
        setLoading(false);
      });
  }, [user, debateId]);

  if (loading) {
    return (
      <div className="h-24 rounded-xl animate-pulse" style={{ background: "var(--bg-tertiary)" }} />
    );
  }

  return (
    <VotePanel
      debateId={debateId}
      currentVote={currentVote}
      onVoted={(pos) => setCurrentVote(pos)}
    />
  );
}
