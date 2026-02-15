import Link from "next/link";
import SearchBar from "@/components/search/SearchBar";
import { ArrowLeft, Map } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto text-center py-16">
      <Map
        size={64}
        className="mx-auto mb-6"
        style={{ color: "var(--text-tertiary)" }}
      />
      <h1
        className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        Page Not Found
      </h1>
      <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
        This corner of the Marvel Universe hasn&apos;t been mapped yet.
      </p>

      <div className="max-w-md mx-auto mb-8">
        <SearchBar />
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-105"
          style={{ background: "var(--accent-red)", color: "#fff" }}
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>
        <Link
          href="/timeline"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold border transition-colors hover:border-[var(--accent-red)]"
          style={{
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
            background: "var(--bg-secondary)",
          }}
        >
          Explore Timeline
        </Link>
      </div>
    </div>
  );
}
