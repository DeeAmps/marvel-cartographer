"use client";

import { useState, useEffect } from "react";
import { ThumbsUp, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface EditionData {
  slug: string;
  title: string;
}

export default function ComparisonVote({
  editions,
}: {
  editions: EditionData[];
}) {
  const { user } = useAuth();
  const [editionIds, setEditionIds] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<{ a_votes: number; b_votes: number } | null>(null);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  if (editions.length !== 2) return null;
  const [a, b] = editions;

  // Resolve slugs to UUIDs and fetch stats
  useEffect(() => {
    async function init() {
      setLoading(true);
      // Get edition IDs
      const { data: edData } = await supabase
        .from("collected_editions")
        .select("id, slug")
        .in("slug", [a.slug, b.slug]);

      if (!edData || edData.length < 2) {
        setLoading(false);
        return;
      }

      const idMap: Record<string, string> = {};
      for (const row of edData) {
        idMap[row.slug] = row.id;
      }
      setEditionIds(idMap);

      const aId = idMap[a.slug];
      const bId = idMap[b.slug];
      if (!aId || !bId) {
        setLoading(false);
        return;
      }

      // Canonical ordering
      const [canA, canB] = aId < bId ? [aId, bId] : [bId, aId];

      // Fetch vote stats
      const { data: statsData } = await supabase
        .from("comparison_vote_stats")
        .select("a_votes, b_votes")
        .eq("edition_a_id", canA)
        .eq("edition_b_id", canB)
        .single();

      if (statsData) {
        // Remap canonical back to display order
        if (aId < bId) {
          setStats({ a_votes: statsData.a_votes, b_votes: statsData.b_votes });
        } else {
          setStats({ a_votes: statsData.b_votes, b_votes: statsData.a_votes });
        }
      }

      // Check user's existing vote
      if (user) {
        const { data: voteData } = await supabase
          .from("comparison_votes")
          .select("winner_id")
          .eq("user_id", user.id)
          .eq("edition_a_id", aId)
          .eq("edition_b_id", bId)
          .single();

        if (voteData) {
          setUserVote(voteData.winner_id === aId ? a.slug : b.slug);
        } else {
          // Check reverse order
          const { data: voteData2 } = await supabase
            .from("comparison_votes")
            .select("winner_id")
            .eq("user_id", user.id)
            .eq("edition_a_id", bId)
            .eq("edition_b_id", aId)
            .single();

          if (voteData2) {
            setUserVote(voteData2.winner_id === aId ? a.slug : b.slug);
          }
        }
      }

      setLoading(false);
    }
    init();
  }, [a.slug, b.slug, user?.id]);

  async function handleVote(winnerSlug: string) {
    if (!user || userVote) return;

    const aId = editionIds[a.slug];
    const bId = editionIds[b.slug];
    const winnerId = editionIds[winnerSlug];
    if (!aId || !bId || !winnerId) return;

    setUserVote(winnerSlug);

    // Optimistic update
    setStats((prev) => {
      const current = prev || { a_votes: 0, b_votes: 0 };
      return {
        a_votes: current.a_votes + (winnerSlug === a.slug ? 1 : 0),
        b_votes: current.b_votes + (winnerSlug === b.slug ? 1 : 0),
      };
    });

    await supabase.from("comparison_votes").insert({
      user_id: user.id,
      edition_a_id: aId,
      edition_b_id: bId,
      winner_id: winnerId,
    });
  }

  const totalVotes = (stats?.a_votes || 0) + (stats?.b_votes || 0);
  const aPct = totalVotes > 0 ? Math.round(((stats?.a_votes || 0) / totalVotes) * 100) : 50;
  const bPct = totalVotes > 0 ? Math.round(((stats?.b_votes || 0) / totalVotes) * 100) : 50;

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
    >
      <h3
        className="text-sm font-bold tracking-tight mb-3"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        Community Vote
      </h3>

      {loading ? (
        <div className="h-16 flex items-center justify-center">
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Loading...</span>
        </div>
      ) : (
        <>
          {/* Vote bar */}
          {totalVotes > 0 && (
            <div className="mb-3">
              <div className="flex rounded-full overflow-hidden h-6">
                <div
                  className="flex items-center justify-center transition-all"
                  style={{
                    width: `${aPct}%`,
                    background: "var(--accent-red)",
                    minWidth: aPct > 0 ? "2rem" : 0,
                  }}
                >
                  <span className="text-xs font-bold" style={{ color: "#fff" }}>
                    {aPct}%
                  </span>
                </div>
                <div
                  className="flex items-center justify-center transition-all"
                  style={{
                    width: `${bPct}%`,
                    background: "var(--accent-blue)",
                    minWidth: bPct > 0 ? "2rem" : 0,
                  }}
                >
                  <span className="text-xs font-bold" style={{ color: "#fff" }}>
                    {bPct}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs truncate max-w-[45%]" style={{ color: "var(--accent-red)" }}>
                  {a.title}
                </span>
                <span className="text-xs truncate max-w-[45%] text-right" style={{ color: "var(--accent-blue)" }}>
                  {b.title}
                </span>
              </div>
              <p className="text-xs text-center mt-1" style={{ color: "var(--text-tertiary)" }}>
                {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          {/* Vote buttons */}
          {!user ? (
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded text-xs font-bold transition-colors"
              style={{
                border: "1px dashed var(--border-default)",
                color: "var(--text-tertiary)",
              }}
            >
              <LogIn size={12} />
              Sign in to vote
            </Link>
          ) : userVote ? (
            <p className="text-xs text-center" style={{ color: "var(--accent-green)" }}>
              <ThumbsUp size={12} className="inline mr-1" />
              You voted for {userVote === a.slug ? a.title : b.title}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {[a, b].map((ed, i) => (
                <button
                  key={ed.slug}
                  onClick={() => handleVote(ed.slug)}
                  className="py-2 px-3 rounded text-xs font-bold transition-all hover:opacity-80"
                  style={{
                    background: i === 0 ? "var(--accent-red)" : "var(--accent-blue)",
                    color: "#fff",
                  }}
                >
                  <ThumbsUp size={12} className="inline mr-1" />
                  {ed.title.split(" ").slice(0, 4).join(" ")}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
