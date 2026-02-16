import { notFound } from "next/navigation";
import Link from "next/link";
import { getDebates, getDebateBySlug, getDebateEvidence } from "@/lib/data";
import { isValidPublisher, type Publisher } from "@/lib/types";
import VoteSplitBar from "@/components/debates/VoteSplitBar";
import EvidenceList from "@/components/debates/EvidenceList";
import DebateVoteClient from "./DebateVoteClient";
import { ArrowLeft, MessageSquare } from "lucide-react";

export const revalidate = 300;

export async function generateStaticParams() {
  const debates = await getDebates();
  return debates.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ publisher: string; slug: string }> }) {
  const { publisher: publisherParam, slug } = await params;
  if (!isValidPublisher(publisherParam)) return { title: "Not Found" };
  const publisher = publisherParam as Publisher;
  const debate = await getDebateBySlug(slug, publisher);
  if (!debate) return { title: "Not Found" };
  return {
    title: `${debate.title} — Debate Arena`,
    description: debate.question,
  };
}

export default async function DebateDetailPage({ params }: { params: Promise<{ publisher: string; slug: string }> }) {
  const { publisher: publisherParam, slug } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;
  const debate = await getDebateBySlug(slug, publisher);
  if (!debate) notFound();

  const evidence = await getDebateEvidence(debate.id);

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/${publisher}/debates`}
        className="inline-flex items-center gap-1 text-sm mb-6 transition-colors hover:text-[var(--accent-red)]"
        style={{ color: "var(--text-tertiary)" }}
      >
        <ArrowLeft size={14} />
        Back to Debates
      </Link>

      {/* Header */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare size={18} style={{ color: "var(--accent-red)" }} />
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold uppercase"
            style={{
              background: "color-mix(in srgb, var(--accent-red) 12%, transparent)",
              color: "var(--accent-red)",
              fontSize: "0.6rem",
            }}
          >
            {debate.category}
          </span>
        </div>
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-tight mb-3"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          {debate.title}
        </h1>
        <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {debate.question}
        </p>
        {debate.context && (
          <p className="text-sm mt-3 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
            {debate.context}
          </p>
        )}
      </section>

      {/* Vote Results */}
      <section
        className="rounded-xl border p-6 mb-6"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <h2
          className="text-sm font-bold uppercase mb-4"
          style={{ color: "var(--text-tertiary)" }}
        >
          Community Vote ({debate.total_votes || 0} votes)
        </h2>
        <VoteSplitBar
          agree={debate.agree_count || 0}
          disagree={debate.disagree_count || 0}
          complicated={debate.complicated_count || 0}
        />
      </section>

      {/* Vote Panel (client component) */}
      <section className="mb-6">
        <DebateVoteClient debateId={debate.id} />
      </section>

      {/* Evidence */}
      <section
        className="rounded-xl border p-6"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
      >
        <h2
          className="text-lg font-bold tracking-tight mb-4"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          Evidence & Citations
        </h2>
        <EvidenceList evidence={evidence} />
      </section>
    </div>
  );
}
