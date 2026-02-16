import { notFound } from "next/navigation";
import { isValidPublisher } from "@/lib/types";
import AssistantClient from "./AssistantClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) return { title: "Not Found" };
  return {
    title: "Ask The Watcher — The Comic Cartographer",
    description:
      "AI-powered Marvel Universe guide. Ask about reading orders, continuity, characters, and recommendations.",
  };
}

export default async function AssistantPage({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) notFound();

  return <AssistantClient />;
}
