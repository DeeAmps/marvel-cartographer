"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { recordActivity } from "@/lib/activity";

export type CollectionStatus = "owned" | "wishlist" | "reading" | "completed";

export interface CollectionItem {
  edition_slug: string;
  status: CollectionStatus;
  added_at: string;
}

// --- Slug <-> UUID resolution ---

async function resolveSlugToId(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from("collected_editions")
    .select("id")
    .eq("slug", slug)
    .single();
  return data?.id ?? null;
}

async function resolveSlugsToIds(slugs: string[]): Promise<Record<string, string>> {
  if (slugs.length === 0) return {};
  const { data } = await supabase
    .from("collected_editions")
    .select("id, slug")
    .in("slug", slugs);
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.slug] = row.id;
  }
  return map;
}

async function resolveIdsToSlugs(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const { data } = await supabase
    .from("collected_editions")
    .select("id, slug")
    .in("id", ids);
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.id] = row.slug;
  }
  return map;
}

// --- Supabase collection helpers ---

async function fetchSupabaseCollection(userId: string): Promise<CollectionItem[]> {
  const { data, error } = await supabase
    .from("user_collections")
    .select("edition_id, status, added_at")
    .eq("user_id", userId);

  if (error || !data || data.length === 0) return [];

  const ids = data.map((r) => r.edition_id);
  const idToSlug = await resolveIdsToSlugs(ids);

  return data
    .filter((r) => idToSlug[r.edition_id])
    .map((r) => ({
      edition_slug: idToSlug[r.edition_id],
      status: r.status as CollectionStatus,
      added_at: r.added_at,
    }));
}

async function upsertSupabaseItem(
  userId: string,
  editionSlug: string,
  status: CollectionStatus
) {
  const editionId = await resolveSlugToId(editionSlug);
  if (!editionId) {
    console.warn("[Collection] Edition not found for slug:", editionSlug);
    return;
  }

  const payload: Record<string, unknown> = {
    user_id: userId,
    edition_id: editionId,
    status,
    added_at: new Date().toISOString(),
  };

  // Set completed_at when marking as completed
  if (status === "completed") {
    payload.completed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("user_collections").upsert(
    payload,
    { onConflict: "user_id,edition_id" }
  );

  if (error) {
    console.error("[Collection] Upsert failed:", error.message, { editionSlug, status });
  }
}

async function deleteSupabaseItem(userId: string, editionSlug: string) {
  const editionId = await resolveSlugToId(editionSlug);
  if (!editionId) return;

  const { error } = await supabase
    .from("user_collections")
    .delete()
    .eq("user_id", userId)
    .eq("edition_id", editionId);

  if (error) {
    console.error("[Collection] Delete failed:", error.message, { editionSlug });
  }
}

// --- Hook ---

const noopAdd = () => {};
const noopRemove = () => {};
const noopUpdate = () => {};
const noopGetStatus = (): CollectionStatus | null => null;

export function useCollection() {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { user, loading } = useAuth();
  const authenticated = !!user;

  // Load collection from Supabase when user is logged in
  useEffect(() => {
    if (loading) return;

    if (!user) {
      setItems([]);
      setHydrated(true);
      return;
    }

    async function load() {
      const supaItems = await fetchSupabaseCollection(user!.id);
      setItems(supaItems);
      setHydrated(true);
    }

    load();
  }, [user?.id, loading]);

  const addItem = useCallback(
    (editionSlug: string, status: CollectionStatus = "owned") => {
      if (!user) return;

      setItems((prev) => {
        const existing = prev.findIndex((i) => i.edition_slug === editionSlug);
        let next: CollectionItem[];
        if (existing >= 0) {
          next = [...prev];
          next[existing] = { ...next[existing], status };
        } else {
          next = [
            ...prev,
            { edition_slug: editionSlug, status, added_at: new Date().toISOString() },
          ];
        }
        return next;
      });

      upsertSupabaseItem(user.id, editionSlug, status);

      // Track activity for reading/completion
      if (status === "reading" || status === "completed") {
        recordActivity(user.id, `edition_${status}`, { edition_slug: editionSlug });
      }
    },
    [user]
  );

  const removeItem = useCallback(
    (editionSlug: string) => {
      if (!user) return;

      setItems((prev) => prev.filter((i) => i.edition_slug !== editionSlug));

      deleteSupabaseItem(user.id, editionSlug);
    },
    [user]
  );

  const updateStatus = useCallback(
    (editionSlug: string, status: CollectionStatus) => {
      addItem(editionSlug, status);
    },
    [addItem]
  );

  const getStatus = useCallback(
    (editionSlug: string): CollectionStatus | null => {
      const item = items.find((i) => i.edition_slug === editionSlug);
      return item?.status ?? null;
    },
    [items]
  );

  // When not authenticated, return no-op functions and empty state
  if (!authenticated && !loading) {
    return {
      items: [] as CollectionItem[],
      addItem: noopAdd as (slug: string, status?: CollectionStatus) => void,
      removeItem: noopRemove as (slug: string) => void,
      updateStatus: noopUpdate as (slug: string, status: CollectionStatus) => void,
      getStatus: noopGetStatus,
      hydrated: true,
      authenticated: false,
    };
  }

  return { items, addItem, removeItem, updateStatus, getStatus, hydrated, authenticated };
}
