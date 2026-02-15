"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";
const MIN_VISITS_KEY = "pwa-page-visits";
const MIN_VISITS = 3;

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed as standalone
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator &&
        (window.navigator as unknown as { standalone: boolean }).standalone);
    setIsStandalone(!!standalone);
    if (standalone) return;

    // Check if user previously dismissed
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      // Re-show after 7 days
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    // Track page visits
    const visits = parseInt(localStorage.getItem(MIN_VISITS_KEY) || "0", 10) + 1;
    localStorage.setItem(MIN_VISITS_KEY, String(visits));

    // Detect iOS
    const ua = window.navigator.userAgent;
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    // On iOS, show instructions after enough visits (no beforeinstallprompt)
    if (isIOSDevice && visits >= MIN_VISITS) {
      setShowPrompt(true);
      return;
    }

    // Listen for the browser's install prompt (Chrome/Edge/Samsung)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (visits >= MIN_VISITS) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }, []);

  if (isStandalone || !showPrompt) return null;

  return (
    <div
      className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 rounded-xl p-4 shadow-2xl animate-fade-in"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-default)",
      }}
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-md transition-colors"
        style={{ color: "var(--text-tertiary)" }}
        aria-label="Dismiss install prompt"
      >
        <X size={16} />
      </button>

      <div className="flex gap-3">
        {/* App icon */}
        <img
          src="/icons/icon-96x96.png"
          alt="Marvel Cartographer"
          width={48}
          height={48}
          className="w-12 h-12 rounded-xl flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-sm"
            style={{ color: "var(--text-primary)" }}
          >
            Install Marvel Cartographer
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Add to your home screen for quick access and offline browsing.
          </p>

          <div className="flex gap-2 mt-3">
            {isIOS ? (
              <div
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-secondary)",
                }}
              >
                <Share size={14} />
                <span>
                  Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>
                </span>
              </div>
            ) : (
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-opacity hover:opacity-90"
                style={{ background: "var(--accent-red)", color: "#fff" }}
              >
                <Download size={14} />
                Install app
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
