import { notFound } from "next/navigation";
import Link from "next/link";
import { getReadingPathBySlug, getReadingPaths, getPurchasePlan } from "@/lib/data";
import { isValidPublisher, type Publisher } from "@/lib/types";
import PurchasePlanner from "@/components/purchase/PurchasePlanner";
import { ArrowLeft, BookOpen } from "lucide-react";

export const revalidate = 3600;

export async function generateStaticParams() {
  const paths = await getReadingPaths();
  return paths.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publisher: string; slug: string }>;
}) {
  const { publisher: publisherParam, slug } = await params;
  if (!isValidPublisher(publisherParam)) return { title: "Not Found" };
  const publisher = publisherParam as Publisher;
  const path = await getReadingPathBySlug(slug, publisher);
  if (!path) return { title: "Not Found" };
  return {
    title: `Purchase Plan: ${path.name}`,
    description: `Complete purchase breakdown for ${path.name} — see what's in print, out of print, and the cheapest way to collect this reading path.`,
  };
}

export default async function PurchasePlanPage({
  params,
}: {
  params: Promise<{ publisher: string; slug: string }>;
}) {
  const { publisher: publisherParam, slug } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;

  const plan = await getPurchasePlan(slug, publisher);
  if (!plan.path_name) notFound();

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href={`/${publisher}/path/${slug}`}
        className="inline-flex items-center gap-1 text-sm mb-6 transition-colors hover:text-[var(--accent-red)]"
        style={{ color: "var(--text-tertiary)" }}
      >
        <ArrowLeft size={14} />
        Back to Reading Path
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={20} style={{ color: "var(--accent-gold)" }} />
          <span className="text-xs uppercase tracking-tight" style={{ color: "var(--accent-gold)" }}>
            Purchase Planner
          </span>
        </div>
        <h1
          className="text-3xl font-bold tracking-tight mb-2"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          {plan.path_name}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Complete purchase breakdown — what&apos;s available, what&apos;s out of print, and how to collect this path.
        </p>
      </div>

      <PurchasePlanner
        pathName={plan.path_name}
        pathSlug={slug}
        inPrint={plan.in_print}
        outOfPrint={plan.out_of_print}
        upcoming={plan.upcoming}
        digitalOnly={plan.digital_only}
        totalCover={plan.total_cover}
      />

      {/* Link to reading order */}
      <div className="mt-8 text-center">
        <Link
          href={`/${publisher}/path/${slug}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all hover:shadow-lg"
          style={{
            background: "var(--accent-red)",
            color: "white",
          }}
        >
          <BookOpen size={16} />
          View Reading Order
        </Link>
      </div>
    </div>
  );
}
