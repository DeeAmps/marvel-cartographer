"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { WatcherConversation } from "@/lib/types";
import type { WatcherMessage } from "@/components/watcher/WatcherMessageRenderer";

export function useWatcherConversations() {
  const { user, loading } = useAuth();
  const [conversations, setConversations] = useState<WatcherConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WatcherMessage[]>([]);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);

  // Track whether we've already created a conversation for the current "new" session
  const pendingConversationRef = useRef<Promise<string> | null>(null);

  // Load conversation list on mount
  useEffect(() => {
    if (loading || !user) {
      setConversations([]);
      setConversationsLoaded(!loading);
      return;
    }

    async function loadConversations() {
      const { data } = await supabase
        .from("watcher_conversations")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(50);

      setConversations(data ?? []);
      setConversationsLoaded(true);
    }

    loadConversations();
  }, [user?.id, loading]);

  const loadConversation = useCallback(
    async (id: string) => {
      setActiveConversationId(id);
      pendingConversationRef.current = null;

      const { data } = await supabase
        .from("watcher_messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      const loaded: WatcherMessage[] = (data ?? []).map((m) => ({
        role: m.role as "user" | "watcher",
        content: m.content,
      }));

      setMessages(loaded);
    },
    []
  );

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    pendingConversationRef.current = null;
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      // Optimistic removal
      setConversations((prev) => prev.filter((c) => c.id !== id));

      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
        pendingConversationRef.current = null;
      }

      await supabase.from("watcher_conversations").delete().eq("id", id);
    },
    [activeConversationId]
  );

  // Ensures a conversation exists, creating one if needed. Returns the conversation ID.
  const ensureConversation = useCallback(
    async (firstMessageContent: string): Promise<string> => {
      if (activeConversationId) return activeConversationId;

      // If we're already creating one, wait for it
      if (pendingConversationRef.current) {
        return pendingConversationRef.current;
      }

      const promise = (async () => {
        const title = firstMessageContent.length > 60
          ? firstMessageContent.slice(0, 57) + "..."
          : firstMessageContent;

        const { data, error } = await supabase
          .from("watcher_conversations")
          .insert({ user_id: user!.id, title })
          .select()
          .single();

        if (error || !data) {
          console.error("[WatcherConversations] Failed to create conversation:", error?.message);
          throw new Error("Failed to create conversation");
        }

        const conversation = data as WatcherConversation;
        setActiveConversationId(conversation.id);
        setConversations((prev) => [conversation, ...prev]);
        return conversation.id;
      })();

      pendingConversationRef.current = promise;
      return promise;
    },
    [activeConversationId, user]
  );

  const saveUserMessage = useCallback(
    async (content: string) => {
      if (!user) return;

      const conversationId = await ensureConversation(content);

      // Fire-and-forget DB write
      supabase
        .from("watcher_messages")
        .insert({ conversation_id: conversationId, role: "user", content })
        .then(({ error }) => {
          if (error) console.error("[WatcherConversations] Failed to save user message:", error.message);
        });
    },
    [user, ensureConversation]
  );

  const saveWatcherMessage = useCallback(
    async (content: string) => {
      if (!user || !content.trim()) return;

      // activeConversationId should already be set by saveUserMessage
      const conversationId = activeConversationId;
      if (!conversationId) return;

      supabase
        .from("watcher_messages")
        .insert({ conversation_id: conversationId, role: "watcher", content })
        .then(({ error }) => {
          if (error) console.error("[WatcherConversations] Failed to save watcher message:", error.message);
        });
    },
    [user, activeConversationId]
  );

  return {
    conversations,
    activeConversationId,
    messages,
    setMessages,
    conversationsLoaded,
    createConversation: ensureConversation,
    loadConversation,
    deleteConversation,
    startNewConversation,
    saveUserMessage,
    saveWatcherMessage,
  };
}
