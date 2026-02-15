interface RosterEntry {
  era_slug: string;
  members: string[];
  note?: string;
}

export default function RosterTable({
  rosters,
  eraMap,
}: {
  rosters: RosterEntry[];
  eraMap: Record<string, { slug: string; name: string; color: string }>;
}) {
  return (
    <div className="space-y-4">
      {rosters.map((r, i) => {
        const era = eraMap[r.era_slug];
        return (
          <div
            key={`${r.era_slug}-${i}`}
            className="rounded-lg border p-4"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-default)",
              borderLeft: `3px solid ${era?.color || "var(--border-default)"}`,
            }}
          >
            <p
              className="text-xs font-bold mb-2"
              style={{ color: era?.color || "var(--text-tertiary)" }}
            >
              {era?.name || r.era_slug}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {r.members.map((m) => (
                <span
                  key={m}
                  className="px-2 py-0.5 rounded text-xs font-bold"
                  style={{
                    background: "var(--bg-tertiary)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {m}
                </span>
              ))}
            </div>
            {r.note && (
              <p
                className="text-xs mt-2 italic"
                style={{ color: "var(--text-tertiary)" }}
              >
                {r.note}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
