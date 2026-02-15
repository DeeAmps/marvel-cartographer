"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock, Search, BookOpen, MoreHorizontal } from "lucide-react";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/timeline", icon: Clock, label: "Timeline" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/path/absolute-essentials", icon: BookOpen, label: "Paths" },
  { href: "/collection", icon: MoreHorizontal, label: "More" },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden z-50"
      style={{ background: "var(--bg-secondary)", borderTop: "1px solid var(--border-default)" }}
    >
      <div className="flex items-center justify-around py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-2.5 justify-center min-h-[48px] active:opacity-70 transition-opacity transition-colors relative"
              style={{ color: isActive ? "var(--accent-red)" : "var(--text-tertiary)" }}
            >
              {/* Active indicator dot */}
              {isActive && (
                <span
                  className="absolute -top-0.5 w-1 h-1 rounded-full"
                  style={{ background: "var(--accent-red)" }}
                />
              )}
              <Icon size={22} />
              <span className="text-xs" style={{ fontSize: "0.6875rem", lineHeight: 1.1, fontWeight: isActive ? 600 : 400 }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
