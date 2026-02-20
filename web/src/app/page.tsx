import Link from "next/link";
import { getEras, getEditions, getCharacters, getCreators, getEvents, getReadingPathBySlug, getTrivia, getIssues } from "@/lib/data";
import { getDailyBriefingIssues, getMarvelMinuteCards } from "@/lib/daily-content";
import { BookOpen, Clock, Search, Zap, AlertTriangle, ArrowRight, Users, Pencil, Compass, HelpCircle, Map, Sparkles, BookMarked, Trophy } from "lucide-react";
import RandomEditionButton from "@/components/ui/RandomEditionButton";
import DailyBriefing from "@/components/briefing/DailyBriefing";
import MarvelMinute from "@/components/knowledge/MarvelMinute";

export const revalidate = 3600;

export default async function Home() {
  const [eras, editions, characters, creators, events, essentialsPath, trivia, issues] = await Promise.all([
    getEras(),
    getEditions(),
    getCharacters(),
    getCreators(),
    getEvents(),
    getReadingPathBySlug("absolute-essentials"),
    getTrivia(),
    getIssues(),
  ]);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const dailyIssues = getDailyBriefingIssues(issues, today);
  const minuteCards = getMarvelMinuteCards(trivia, issues, editions, today);
  const essentialCount = editions.filter((e) => e.importance === "essential").length;
  const essentialsBookCount = essentialsPath?.entries.length || 29;
  const triviaCount = trivia.length;

  const quickStarts = [
    { href: "/path/absolute-essentials", label: "The Absolute Essentials", desc: `${essentialCount}+ must-read editions spanning 60 years`, icon: Sparkles, accent: "var(--accent-red)" },
    { href: "/path/ff-complete", label: "The Complete Fantastic Four", desc: "Follow the First Family from the very beginning", icon: Map, accent: "var(--accent-blue)" },
    { href: "/path/cosmic-marvel", label: "Cosmic Marvel", desc: "From the Galactus Trilogy to the Multiverse", icon: Zap, accent: "var(--accent-purple)" },
    { href: "/path/doctor-doom-arc", label: "Doctor Doom's Arc", desc: "Tyrant. God Emperor. Sorcerer Supreme.", icon: AlertTriangle, accent: "var(--accent-gold)" },
  ];

  return (
    <div className="space-y-14 sm:space-y-20">
      {/* Hero */}
      <section className="relative py-10 sm:py-24 overflow-hidden">
        {/* Subtle gradient orb behind hero */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, var(--accent-red) 0%, transparent 70%)" }}
        />
        <div className="relative text-center max-w-3xl mx-auto">
          <p
            className="text-sm font-medium tracking-wide mb-4"
            style={{ color: "var(--accent-red)", fontFamily: "var(--font-geist-mono), monospace" }}
          >
            Fantastic Four #1 (1961) &mdash; Present
          </p>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
            style={{
              fontFamily: "var(--font-bricolage), sans-serif",
              color: "var(--text-primary)",
              lineHeight: 1.05,
            }}
          >
            The Marvel{" "}
            <span style={{ color: "var(--accent-red)" }}>Cartographer</span>
          </h1>
          <p
            className="text-base sm:text-lg max-w-xl mx-auto leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Map the entire Marvel Universe. Interactive chronology, reading paths,
            continuity tracking, and collected edition guides for every era.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            <Link
              href="/timeline"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-[var(--accent-red)]/15"
              style={{ background: "var(--accent-red)", color: "#fff" }}
            >
              <Clock size={18} />
              Explore Timeline
            </Link>
            <Link
              href="/search"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border transition-all hover:border-[var(--accent-red)] hover:shadow-lg hover:shadow-[var(--accent-red)]/5"
              style={{ borderColor: "var(--border-default)", color: "var(--text-primary)", background: "var(--bg-secondary)" }}
            >
              <Search size={18} />
              Search Editions
            </Link>
            <Link
              href="/start"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border transition-all hover:border-[var(--accent-gold)] hover:shadow-lg hover:shadow-[var(--accent-gold)]/5"
              style={{ borderColor: "var(--border-default)", color: "var(--accent-gold)", background: "var(--bg-secondary)" }}
            >
              <Compass size={18} />
              Where Do I Start?
            </Link>
            <RandomEditionButton slugs={editions.map(e => e.slug)} />
          </div>
        </div>
      </section>

      {/* Stats Bar — inline, minimal */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
        {[
          { value: `${editions.length}+`, label: "Collected Editions", color: "var(--accent-red)" },
          { value: String(eras.length), label: "Marvel Eras", color: "var(--accent-gold)" },
          { value: "1961", label: "Starting Year", color: "var(--accent-blue)" },
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

      {/* Daily Briefing — On This Day */}
      {dailyIssues.length > 0 && (
        <DailyBriefing issues={dailyIssues} date={todayStr} />
      )}

      {/* Reading Paths — featured cards */}
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
              Curated journeys through the Marvel Universe
            </p>
          </div>
          <Link
            href="/path/absolute-essentials"
            className="hidden sm:flex items-center gap-1 text-sm font-medium transition-colors hover:text-[var(--accent-red)]"
            style={{ color: "var(--text-secondary)" }}
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickStarts.map((qs) => {
            const Icon = qs.icon;
            return (
              <Link key={qs.href} href={qs.href} className="group">
                <div
                  className="relative rounded-xl border p-6 transition-all hover:shadow-lg h-full overflow-hidden"
                  style={{
                    background: "var(--bg-secondary)",
                    borderColor: "var(--border-default)",
                  }}
                >
                  {/* Accent gradient on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse at top right, color-mix(in srgb, ${qs.accent} 8%, transparent), transparent 60%)`,
                    }}
                  />
                  <div className="relative">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                      style={{
                        background: `color-mix(in srgb, ${qs.accent} 12%, transparent)`,
                        color: qs.accent,
                      }}
                    >
                      <Icon size={20} />
                    </div>
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
            );
          })}
        </div>
      </section>

      {/* Era Exploration */}
      <section>
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
            >
              {eras.length} Eras of Marvel
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
              From the Silver Age to the present day
            </p>
          </div>
          <Link
            href="/timeline"
            className="hidden sm:flex items-center gap-1 text-sm font-medium transition-colors hover:text-[var(--accent-red)]"
            style={{ color: "var(--text-secondary)" }}
          >
            Full timeline <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {eras.map((era) => (
            <Link key={era.slug} href={`/timeline#${era.slug}`} className="group">
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
            { href: "/characters", icon: Users, label: "Characters", desc: `${characters.length} heroes & villains`, accent: "var(--accent-blue)" },
            { href: "/creators", icon: Pencil, label: "Creators", desc: `${creators.length} writers & artists`, accent: "var(--accent-gold)" },
            { href: "/events", icon: Zap, label: "Events", desc: `${events.length} events & sagas`, accent: "var(--accent-red)" },
            { href: "/conflicts", icon: AlertTriangle, label: "Conflicts", desc: "Canon disputes & retcons", accent: "var(--accent-purple)" },
            { href: "/handbook", icon: BookMarked, label: "Handbook", desc: "Characters, teams & lore", accent: "var(--accent-purple)" },
            { href: "/path/absolute-essentials", icon: BookOpen, label: "Essentials", desc: `${essentialsBookCount} books. The whole universe.`, accent: "var(--accent-green)" },
            { href: "/trivia", icon: HelpCircle, label: "Trivia", desc: `${triviaCount}+ questions`, accent: "var(--accent-gold)" },
            { href: "/achievements", icon: Trophy, label: "Achievements", desc: "Streaks, XP & badges", accent: "var(--accent-red)" },
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

      {/* Marvel Minute — Daily Knowledge Cards */}
      {minuteCards.length > 0 && (
        <MarvelMinute cards={minuteCards} />
      )}
    </div>
  );
}
