import Link from "next/link";

export default function Footer() {
  return (
    <footer
      className="mt-20"
      style={{
        background: "var(--bg-secondary)",
        borderTop: "1px solid var(--border-default)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-24 md:pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
          {/* Navigation */}
          <div>
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: "var(--text-tertiary)" }}
            >
              Navigate
            </h3>
            <ul className="space-y-2.5">
              {[
                { href: "/timeline", label: "Timeline" },
                { href: "/search", label: "Search" },
                { href: "/events", label: "Events" },
                { href: "/conflicts", label: "Conflicts" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors hover:text-[var(--accent-red)]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Browse */}
          <div>
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: "var(--text-tertiary)" }}
            >
              Browse
            </h3>
            <ul className="space-y-2.5">
              {[
                { href: "/characters", label: "Characters" },
                { href: "/creators", label: "Creators" },
                { href: "/path/absolute-essentials", label: "Reading Paths" },
                { href: "/collection", label: "My Collection" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors hover:text-[var(--accent-red)]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Reading Paths */}
          <div>
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: "var(--text-tertiary)" }}
            >
              Reading Paths
            </h3>
            <ul className="space-y-2.5">
              {[
                { href: "/path/absolute-essentials", label: "Absolute Essentials" },
                { href: "/path/ff-complete", label: "Fantastic Four" },
                { href: "/path/cosmic-marvel", label: "Cosmic Marvel" },
                { href: "/path/doctor-doom-arc", label: "Doctor Doom" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors hover:text-[var(--accent-red)]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: "var(--text-tertiary)" }}
            >
              Resources
            </h3>
            <ul className="space-y-2.5">
              {[
                { href: "https://comicbookherald.com", label: "Comic Book Herald" },
                { href: "https://crushingkrisis.com", label: "Crushing Krisis" },
                { href: "https://marvel.com/unlimited", label: "Marvel Unlimited" },
                { href: "https://metron.cloud", label: "Metron" },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm transition-colors hover:text-[var(--accent-red)]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: "1px solid var(--border-default)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            The Marvel Cartographer &mdash; Mapping the Marvel Universe since Fantastic Four #1 (1961)
          </p>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Comic data from{" "}
            <a
              href="https://metron.cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--accent-blue)] transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              Metron
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
