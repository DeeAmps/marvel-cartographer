import type { EraChapter } from "@/lib/types";

export default function ChapterNav({
  chapters,
  eraColor,
  activeChapter,
}: {
  chapters: EraChapter[];
  eraColor: string;
  activeChapter?: string;
}) {
  if (chapters.length === 0) return null;

  return (
    <div className="mb-4">
      <p
        className="text-xs font-bold uppercase mb-2"
        style={{ color: "var(--text-tertiary)" }}
      >
        Chapters
      </p>
      <div className="flex flex-wrap gap-2">
        {chapters.map((chapter) => {
          const isActive = activeChapter === chapter.slug;
          return (
            <a
              key={chapter.slug}
              href={`#${chapter.slug}`}
              className="group rounded-lg border px-3 py-2 transition-all"
              style={{
                background: isActive ? `${eraColor}15` : "var(--bg-tertiary)",
                borderColor: isActive ? eraColor : "var(--border-default)",
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: isActive ? eraColor : "var(--bg-secondary)",
                    color: isActive ? "#fff" : "var(--text-tertiary)",
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "0.75rem",
                  }}
                >
                  {chapter.number}
                </span>
                <span
                  className="text-xs font-bold group-hover:text-[var(--text-primary)] transition-colors"
                  style={{
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  {chapter.name}
                </span>
              </div>
              <p
                className="text-xs mt-0.5 ml-7"
                style={{
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "0.75rem",
                }}
              >
                {chapter.year_start}–{chapter.year_end}
              </p>
            </a>
          );
        })}
      </div>
    </div>
  );
}
