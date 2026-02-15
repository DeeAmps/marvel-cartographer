import { getDebates } from "@/lib/data";
import DebateCard from "@/components/debates/DebateCard";
import { MessageSquare } from "lucide-react";

export const revalidate = 300;

export const metadata = {
  title: "Debate Arena — The Marvel Cartographer",
  description: "Vote on the biggest debates in Marvel Comics. Is Doctor Doom the greatest villain? Was One More Day the worst decision? You decide.",
};

export default async function DebatesPage() {
  const debates = await getDebates();

  const featured = debates.find((d) => d.is_featured);
  const categories = [...new Set(debates.map((d) => d.category))];
  const byCategory = new Map<string, typeof debates>();
  for (const d of debates) {
    if (!byCategory.has(d.category)) byCategory.set(d.category, []);
    byCategory.get(d.category)!.push(d);
  }

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center py-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <MessageSquare size={24} style={{ color: "var(--accent-red)" }} />
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
          >
            Debate Arena
          </h1>
        </div>
        <p className="text-sm max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
          The biggest questions in Marvel Comics. Vote, cite evidence, and see where the community stands.
        </p>
        <p
          className="text-xs mt-2"
          style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
        >
          {debates.length} active debates
        </p>
      </section>

      {/* Featured Debate */}
      {featured && (
        <section>
          <h2
            className="text-xs font-bold uppercase mb-3 flex items-center gap-2"
            style={{ color: "var(--accent-gold)" }}
          >
            Featured Debate
          </h2>
          <div className="max-w-xl">
            <DebateCard debate={featured} />
          </div>
        </section>
      )}

      {/* By Category */}
      {categories.map((cat) => {
        const catDebates = byCategory.get(cat) || [];
        return (
          <section key={cat}>
            <h2
              className="text-lg font-bold tracking-tight mb-4 capitalize"
              style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
            >
              {cat.replace(/-/g, " ")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catDebates.map((d) => (
                <DebateCard key={d.slug} debate={d} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
