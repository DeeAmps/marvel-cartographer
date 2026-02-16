"use client";

import { createContext, useContext, useMemo } from "react";
import type { Publisher, PublisherConfig } from "@/lib/types";
import { getPublisherConfig } from "@/lib/publisher-config";

interface PublisherContextValue {
  publisher: Publisher;
  config: PublisherConfig;
  basePath: string;
  /** Prepend publisher base path to a route. e.g. link("/timeline") → "/marvel/timeline" */
  link: (path: string) => string;
}

const PublisherContext = createContext<PublisherContextValue | null>(null);

export function PublisherProvider({
  publisher,
  children,
}: {
  publisher: Publisher;
  children: React.ReactNode;
}) {
  const value = useMemo<PublisherContextValue>(() => {
    const config = getPublisherConfig(publisher);
    const basePath = `/${publisher}`;
    return {
      publisher,
      config,
      basePath,
      link: (path: string) => `${basePath}${path.startsWith("/") ? path : `/${path}`}`,
    };
  }, [publisher]);

  return (
    <PublisherContext.Provider value={value}>
      {children}
    </PublisherContext.Provider>
  );
}

export function usePublisher(): PublisherContextValue {
  const ctx = useContext(PublisherContext);
  if (!ctx) {
    throw new Error("usePublisher must be used within a PublisherProvider");
  }
  return ctx;
}
