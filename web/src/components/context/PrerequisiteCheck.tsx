import { Shield } from "lucide-react";
import PrerequisiteItem from "./PrerequisiteItem";

interface Prerequisite {
  edition_slug: string;
  edition_title: string;
  issues_collected: string;
  importance: string;
  connection_type: string;
  strength: number;
  description: string;
  category: "required" | "recommended" | "helpful";
}

export default function PrerequisiteCheck({
  prerequisites,
}: {
  prerequisites: Prerequisite[];
}) {
  if (prerequisites.length === 0) return null;

  const required = prerequisites.filter((p) => p.category === "required");
  const recommended = prerequisites.filter((p) => p.category === "recommended");
  const helpful = prerequisites.filter((p) => p.category === "helpful");

  return (
    <section
      className="rounded-lg border p-6 mt-4"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
    >
      <h2
        className="text-lg font-bold tracking-tight mb-2 flex items-center gap-2"
        style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        <Shield size={18} style={{ color: "var(--accent-blue)" }} />
        Reading Prerequisites
      </h2>

      {/* Traffic light summary */}
      <div className="flex flex-wrap gap-3 mb-4">
        {required.length > 0 && (
          <span className="text-xs font-bold" style={{ color: "var(--accent-red)" }}>
            {required.length} required
          </span>
        )}
        {recommended.length > 0 && (
          <span className="text-xs font-bold" style={{ color: "var(--accent-gold)" }}>
            {recommended.length} recommended
          </span>
        )}
        {helpful.length > 0 && (
          <span className="text-xs font-bold" style={{ color: "var(--accent-blue)" }}>
            {helpful.length} helpful
          </span>
        )}
      </div>

      <div className="space-y-4">
        {required.length > 0 && (
          <div>
            <h3
              className="text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: "var(--accent-red)" }}
            >
              Required
            </h3>
            <div className="space-y-2">
              {required.map((p) => (
                <PrerequisiteItem
                  key={p.edition_slug}
                  editionSlug={p.edition_slug}
                  editionTitle={p.edition_title}
                  issuesCollected={p.issues_collected}
                  importance={p.importance}
                  connectionType={p.connection_type}
                  description={p.description}
                  category={p.category}
                />
              ))}
            </div>
          </div>
        )}

        {recommended.length > 0 && (
          <div>
            <h3
              className="text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: "var(--accent-gold)" }}
            >
              Recommended
            </h3>
            <div className="space-y-2">
              {recommended.map((p) => (
                <PrerequisiteItem
                  key={p.edition_slug}
                  editionSlug={p.edition_slug}
                  editionTitle={p.edition_title}
                  issuesCollected={p.issues_collected}
                  importance={p.importance}
                  connectionType={p.connection_type}
                  description={p.description}
                  category={p.category}
                />
              ))}
            </div>
          </div>
        )}

        {helpful.length > 0 && (
          <div>
            <h3
              className="text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: "var(--accent-blue)" }}
            >
              Helpful Context
            </h3>
            <div className="space-y-2">
              {helpful.map((p) => (
                <PrerequisiteItem
                  key={p.edition_slug}
                  editionSlug={p.edition_slug}
                  editionTitle={p.edition_title}
                  issuesCollected={p.issues_collected}
                  importance={p.importance}
                  connectionType={p.connection_type}
                  description={p.description}
                  category={p.category}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
