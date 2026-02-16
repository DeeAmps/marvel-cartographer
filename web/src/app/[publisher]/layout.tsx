import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isValidPublisher, type Publisher } from "@/lib/types";
import { getPublisherConfig } from "@/lib/publisher-config";
import { PublisherProvider } from "@/components/context/PublisherProvider";

interface PublisherLayoutProps {
  children: React.ReactNode;
  params: Promise<{ publisher: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publisher: string }>;
}): Promise<Metadata> {
  const { publisher } = await params;
  if (!isValidPublisher(publisher)) return {};
  const config = getPublisherConfig(publisher as Publisher);
  return {
    title: {
      default: config.fullName,
      template: `%s | ${config.fullName}`,
    },
    description: `${config.tagline}. Interactive chronology, reading paths, continuity tracking, and collected edition guides.`,
  };
}

export default async function PublisherLayout({
  children,
  params,
}: PublisherLayoutProps) {
  const { publisher } = await params;

  if (!isValidPublisher(publisher)) {
    notFound();
  }

  return (
    <PublisherProvider publisher={publisher as Publisher}>
      {children}
    </PublisherProvider>
  );
}
