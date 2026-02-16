import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidPublisher } from "@/lib/types";
import { PUBLISHER_CONFIGS } from "@/lib/publisher-config";
import StartWizard from "./StartWizard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publisher: string }>;
}): Promise<Metadata> {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) return { title: "Not Found" };
  const config = PUBLISHER_CONFIGS[publisherParam];
  return {
    title: "Where Do I Start?",
    description: `Not sure where to begin reading ${config.name} Comics? Answer three quick questions and we'll build your perfect reading path.`,
  };
}

export default async function StartPage({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const config = PUBLISHER_CONFIGS[publisherParam];

  return (
    <div className="max-w-2xl mx-auto">
      <h1
        className="text-3xl font-bold tracking-tight mb-2"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        Where Do I Start?
      </h1>
      <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
        Three questions. That&apos;s all it takes to find your perfect entry point into the {config.name} Universe.
      </p>
      <StartWizard />
    </div>
  );
}
