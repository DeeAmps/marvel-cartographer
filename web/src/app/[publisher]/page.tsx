import Link from "next/link";
import { isValidPublisher, type Publisher } from "@/lib/types";
import { getPublisherConfig, getQuickStartPaths } from "@/lib/publisher-config";
import { getEras, getEditions, getCharacters, getCreators, getEvents, getReadingPathBySlug, getTrivia, getIssues } from "@/lib/data";
import { getDailyBriefingIssues, getMarvelMinuteCards } from "@/lib/daily-content";
import { BookOpen, Clock, Search, Zap, AlertTriangle, ArrowRight, Users, Pencil, Compass, HelpCircle, Sparkles, BookMarked, Trophy } from "lucide-react";
import RandomEditionButton from "@/components/ui/RandomEditionButton";
import DailyBriefing from "@/components/briefing/DailyBriefing";
import MarvelMinute from "@/components/knowledge/MarvelMinute";
import { notFound } from "next/navigation";

export const revalidate = 3600;

export default async function PublisherHome({
  params,
}: {
  params: Promise<{ publisher: string }>;
}) {
  const { publisher: publisherParam } = await params;
  if (!isValidPublisher(publisherParam)) notFound();
  const publisher = publisherParam as Publisher;
  const config = getPublisherConfig(publisher);
  const base = `/${publisher}`;

  const [eras, editions, characters, creators, events, essentialsPath, trivia, issues] = await Promise.all([
    getEras(publisher),
    getEditions(publisher),
    getCharacters(),
    getCreators(),
    getEvents(publisher),
    getReadingPathBySlug(publisher === "marvel" ? "absolute-essentials" : "dc-essentials", publisher),
    getTrivia(publisher),
    getIssues(),
  ]);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const dailyIssues = getDailyBriefingIssues(issues, today);
  const minuteCards = getMarvelMinuteCards(trivia, issues, editions, today);
  const essentialCount = editions.filter((e) => e.importance === "essential").length;
  const essentialsBookCount = essentialsPath?.entries.length || 29;
  const triviaCount = trivia.length;

  const quickStarts = getQuickStartPaths(publisher);

  return (
    <div className="space-y-14 sm:space-y-20">
      {/* Hero */}
      <section className="relative py-10 sm:py-24 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${config.accentColor} 0%, transparent 70%)` }}
        />
        <div className="relative text-center max-w-3xl mx-auto">
          <p
            className="text-sm font-medium tracking-wide mb-4"
            style={{ color: config.accentColor, fontFamily: "var(--font-geist-mono), monospace" }}
          >
            {config.originTitle} ({config.startYear}) &mdash; Present
          </p>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
            style={{
              fontFamily: "var(--font-bricolage), sans-serif",
              color: "var(--text-primary)",
              lineHeight: 1.05,
            }}
          >
            The {config.name}{" "}
            <span style={{ color: config.accentColor }}>Cartographer</span>
          </h1>
          <p
            className="text-base sm:text-lg max-w-xl mx-auto leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Map the entire {config.name} Universe. Interactive chronology, reading paths,
            continuity tracking, and collected edition guides for every era.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            <Link
              href={`${base}/timeline`}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] hover:shadow-lg"
              style={{ background: config.accentColor, color: "#fff" }}
            >
              <Clock size={18} />
              Explore Timeline
            </Link>
            <Link
              href={`${base}/search`}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border transition-all"
              style={{ borderColor: "var(--border-default)", color: "var(--text-primary)", background: "var(--bg-secondary)" }}
            >
              <Search size={18} />
              Search Editions
            </Link>
            <Link
              href={`${base}/start`}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border transition-all"
              style={{ borderColor: "var(--border-default)", color: "var(--accent-gold)", background: "var(--bg-secondary)" }}
            >
              <Compass size={18} />
              Where Do I Start?
            </Link>
            <RandomEditionButton slugs={editions.map(e => e.slug)} basePath={base} />
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
        {[
          { value: editions.length > 0 ? `${editions.length}+` : "0", label: "Collected Editions", color: config.accentColor },
          { value: String(eras.length), label: `${config.name} Eras`, color: "var(--accent-gold)" },
          { value: String(config.startYear), label: "Starting Year", color: "var(--accent-blue)" },
          { value: "2026", label: "Current Year", color: "var(--accent-green)" },
        ].map((stat) => (
          <div key={stat.label} className="text-center py-4">
            <div
              className="text-2xl sm:text-3xl font-bold"
              style={{ color: stat.color, fontFamily: "var(--font-bricolage), sans-serif" }}
            >
              {stat.value}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </section>

      {/* Daily Briefing */}
      {dailyIssues.length > 0 && (
        <DailyBriefing issues={dailyIssues} date={todayStr} />
      )}

      {/* Reading Paths */}
      {quickStarts.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-8">
            <div>
              <h2
                className="text-2xl sm:text-3xl font-bold tracking-tight"
                style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
              >
                Reading Paths
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
                Curated journeys through the {config.name} Universe
              </p>
            </div>
            <Link
              href={`${base}/paths`}
              className="hidden sm:flex items-center gap-1 text-sm font-medium transition-colors hover:text-[var(--accent-red)]"
              style={{ color: "var(--text-secondary)" }}
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickStarts.map((qs) => (
              <Link key={qs.href} href={qs.href} className="group">
                <div
                  className="relative rounded-xl border p-6 transition-all hover:shadow-lg h-full overflow-hidden"
                  style={{
                    background: "var(--bg-secondary)",
                    borderColor: "var(--border-default)",
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse at top right, color-mix(in srgb, ${qs.accent} 8%, transparent), transparent 60%)`,
                    }}
                  />
                  <div className="relative">
                    <h3
                      className="text-base font-semibold group-hover:text-[var(--accent-red)] transition-colors"
                      style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
                    >
                      {qs.label}
                    </h3>
                    <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {qs.desc}
                    </p>
                    <div
                      className="flex items-center gap-1.5 mt-4 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: qs.accent }}
                    >
                      Start reading <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Era Exploration */}
      {eras.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-8">
            <div>
              <h2
                className="text-2xl sm:text-3xl font-bold tracking-tight"
                style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
              >
                {eras.length} Eras of {config.name}
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
                From the earliest era to the present day
              </p>
            </div>
            <Link
              href={`${base}/timeline`}
              className="hidden sm:flex items-center gap-1 text-sm font-medium transition-colors hover:text-[var(--accent-red)]"
              style={{ color: "var(--text-secondary)" }}
            >
              Full timeline <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {eras.map((era) => (
              <Link key={era.slug} href={`${base}/timeline#${era.slug}`} className="group">
                <div
                  className="rounded-xl border p-4 transition-all hover:shadow-md h-full"
                  style={{
                    background: "var(--bg-secondary)",
                    borderColor: "var(--border-default)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-1 h-10 rounded-full flex-shrink-0 mt-0.5"
                      style={{ background: era.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-sm font-semibold group-hover:text-[var(--accent-red)] transition-colors truncate">
                          {era.name}
                        </h3>
                        <span
                          className="text-xs flex-shrink-0"
                          style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-geist-mono), monospace" }}
                        >
                          {era.year_start}&ndash;{era.year_end}
                        </span>
                      </div>
                      {era.subtitle && (
                        <p className="text-xs mt-1 italic truncate" style={{ color: era.color }}>
                          {era.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick Nav */}
      <section>
        <h2
          className="text-2xl sm:text-3xl font-bold tracking-tight mb-8"
          style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          Explore
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { href: `${base}/characters`, icon: Users, label: "Characters", desc: `${characters.length} heroes & villains`, accent: "var(--accent-blue)" },
            { href: `${base}/creators`, icon: Pencil, label: "Creators", desc: `${creators.length} writers & artists`, accent: "var(--accent-gold)" },
            { href: `${base}/events`, icon: Zap, label: "Events", desc: `${events.length} crossover events`, accent: config.accentColor },
            { href: `${base}/conflicts`, icon: AlertTriangle, label: "Conflicts", desc: "Canon disputes & retcons", accent: "var(--accent-purple)" },
            { href: `${base}/handbook`, icon: BookMarked, label: "Handbook", desc: "Characters, teams & lore", accent: "var(--accent-purple)" },
            { href: `${base}/paths`, icon: BookOpen, label: "Essentials", desc: `${essentialsBookCount} books. The whole universe.`, accent: "var(--accent-green)" },
            { href: `${base}/trivia`, icon: HelpCircle, label: "Trivia", desc: `${triviaCount}+ questions`, accent: "var(--accent-gold)" },
            { href: `${base}/achievements`, icon: Trophy, label: "Achievements", desc: "Streaks, XP & badges", accent: config.accentColor },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="group">
                <div
                  className="rounded-xl border p-5 text-center transition-all hover:shadow-md h-full"
                  style={{ background: "var(--bg-secondary)", borderColor: "var(--border-default)" }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-3"
                    style={{
                      background: `color-mix(in srgb, ${item.accent} 10%, transparent)`,
                      color: item.accent,
                    }}
                  >
                    <Icon size={22} />
                  </div>
                  <h3 className="text-sm font-semibold group-hover:text-[var(--accent-red)] transition-colors">
                    {item.label}
                  </h3>
                  <p className="text-xs mt-1 leading-snug" style={{ color: "var(--text-tertiary)" }}>
                    {item.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Knowledge Cards */}
      {minuteCards.length > 0 && (
        <MarvelMinute cards={minuteCards} />
      )}
    </div>
  );
}
