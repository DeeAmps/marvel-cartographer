"use client";

import { useState, useEffect } from "react";
import { Eye, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function NewsletterSubscribe() {
  const { user, session } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  // Check subscription status on mount
  useEffect(() => {
    if (!session || checked) return;

    const checkStatus = async () => {
      try {
        const response = await fetch("/api/newsletter/subscribe", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await response.json();
        setSubscribed(data.subscribed ?? false);
      } catch {
        // Ignore
      } finally {
        setChecked(true);
      }
    };

    checkStatus();
  }, [session, checked]);

  if (!user) return null;

  const toggleSubscription = async () => {
    if (!session || loading) return;

    setLoading(true);
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: subscribed ? "unsubscribe" : "subscribe",
        }),
      });
      const data = await response.json();
      setSubscribed(data.subscribed ?? !subscribed);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex items-center gap-3 rounded-lg p-3"
      style={{
        background: subscribed ? "rgba(187, 134, 252, 0.08)" : "var(--bg-tertiary)",
        border: subscribed
          ? "1px solid var(--accent-purple)"
          : "1px solid var(--border-default)",
      }}
    >
      <Eye size={16} style={{ color: "var(--accent-purple)" }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
          The Watcher&apos;s Weekly
        </p>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {subscribed
            ? "You'll receive personalized recommendations every Monday."
            : "Get weekly personalized reading recommendations from The Watcher."}
        </p>
      </div>
      <button
        onClick={toggleSubscription}
        disabled={loading}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
        style={{
          background: subscribed ? "transparent" : "var(--accent-purple)",
          color: subscribed ? "var(--accent-purple)" : "#fff",
          border: subscribed ? "1px solid var(--accent-purple)" : "none",
        }}
      >
        {loading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : subscribed ? (
          "Unsubscribe"
        ) : (
          <span className="flex items-center gap-1">
            <Mail size={12} />
            Subscribe
          </span>
        )}
      </button>
    </div>
  );
}
