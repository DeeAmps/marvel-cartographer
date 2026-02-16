"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useCollection";
import AssistantPanel from "./AssistantPanel";
import type { AssistantPageContext, AssistantPageType } from "@/lib/assistant-context";

function buildPageContextFromRoute(
  pathname: string,
  searchParams: URLSearchParams,
  collectionSlugs: string[]
): AssistantPageContext {
  // /edition/[slug]
  const editionMatch = pathname.match(/^\/edition\/([^/]+)$/);
  if (editionMatch) {
    return { pageType: "edition", editionSlug: editionMatch[1] };
  }

  // /path/[slug]
  const pathMatch = pathname.match(/^\/path\/([^/]+)$/);
  if (pathMatch) {
    return { pageType: "path", pathSlug: pathMatch[1] };
  }

  // /collection
  if (pathname === "/collection") {
    return { pageType: "collection", collectionSlugs };
  }

  // /timeline
  if (pathname === "/timeline") {
    return { pageType: "timeline" };
  }

  // /compare
  if (pathname === "/compare") {
    const editionsParam = searchParams.get("editions");
    return {
      pageType: "compare",
      editionSlugs: editionsParam ? editionsParam.split(",") : undefined,
    };
  }

  // /search
  if (pathname === "/search") {
    return {
      pageType: "search",
      searchQuery: searchParams.get("q") || undefined,
    };
  }

  // Home
  if (pathname === "/") {
    return { pageType: "home" };
  }

  return { pageType: "general" };
}

export default function AssistantFAB() {
  const [panelOpen, setPanelOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { items } = useCollection();

  // Hide on /assistant page (avoid double UI) and /login
  if (pathname === "/assistant" || pathname === "/login" || pathname === "/signup") {
    return null;
  }

  const collectionSlugs = items.map((i) => i.edition_slug);
  const pageContext = buildPageContextFromRoute(
    pathname,
    searchParams,
    collectionSlugs
  );

  return (
    <>
      <button
        onClick={() => {
          if (!user) {
            window.location.href = "/login";
            return;
          }
          setPanelOpen(true);
        }}
        className="fixed z-40 flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all hover:scale-110 hover:shadow-xl bottom-[5.5rem] md:bottom-6 right-4 md:right-6"
        style={{
          background: "var(--accent-purple)",
          color: "#fff",
          boxShadow: "0 4px 20px rgba(187, 134, 252, 0.3)",
        }}
        aria-label="Ask The Watcher"
        title="Ask The Watcher"
      >
        <Eye size={20} />
      </button>

      {panelOpen && (
        <AssistantPanel
          pageContext={pageContext}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </>
  );
}
