"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { recordActivity } from "@/lib/activity";
import type { EditionRating, EditionRatingStats } from "@/lib/types";

export function useRatings(editionId: string | null) {
  const { user } = useAuth();
  const [userRating, setUserRating] = useState<EditionRating | null>(null);
  const [stats, setStats] = useState<EditionRatingStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!editionId) return;

    // Fetch rating stats
    const { data: statsData } = await supabase
      .from("edition_rating_stats")
      .select("*")
      .eq("edition_id", editionId)
      .single();

    if (statsData) setStats(statsData as EditionRatingStats);

    // Fetch user's rating
    if (user) {
      const { data: ratingData } = await supabase
        .from("edition_ratings")
        .select("*")
        .eq("user_id", user.id)
        .eq("edition_id", editionId)
        .single();

      if (ratingData) setUserRating(ratingData as EditionRating);
    }

    setLoading(false);
  }, [editionId, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const submitRating = async (rating: number, review?: string) => {
    if (!user || !editionId) return;

    const { error } = await supabase.from("edition_ratings").upsert(
      {
        user_id: user.id,
        edition_id: editionId,
        rating,
        review: review || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,edition_id" }
    );

    if (!error) {
      setUserRating({
        id: userRating?.id ?? "",
        user_id: user.id,
        edition_id: editionId,
        rating,
        review: review || null,
        created_at: userRating?.created_at ?? new Date().toISOString(),
      });

      // Re-fetch stats (trigger will have updated them)
      const { data: newStats } = await supabase
        .from("edition_rating_stats")
        .select("*")
        .eq("edition_id", editionId)
        .single();

      if (newStats) setStats(newStats as EditionRatingStats);

      // Track activity (only on first rating for this edition)
      if (!userRating) {
        recordActivity(user.id, "rating_submitted", { edition_id: editionId });
      }
    }
  };

  return { userRating, stats, loading, submitRating, refresh: fetchData };
}

/** Lightweight hook to fetch just rating stats by edition slug (for cards) */
export function useRatingStats(editionId: string | null) {
  const [stats, setStats] = useState<EditionRatingStats | null>(null);

  useEffect(() => {
    if (!editionId) return;
    supabase
      .from("edition_rating_stats")
      .select("*")
      .eq("edition_id", editionId)
      .single()
      .then(({ data }) => {
        if (data) setStats(data as EditionRatingStats);
      });
  }, [editionId]);

  return stats;
}
