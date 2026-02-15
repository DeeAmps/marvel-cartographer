"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Menu, X, Search, BookOpen, Clock, Zap, AlertTriangle, Users, Pencil,
  Library, Globe, HelpCircle, GitCompareArrows, BookMarked, LogIn, LogOut,
  User, Trophy, GitBranch, Shuffle, Eye, ChevronDown, Compass, Layers,
  Star, Sparkles, Film, Gem, Swords, Newspaper, BookText, Play,
} from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import StreakBadge from "@/components/achievements/StreakBadge";
import { useAuth } from "@/hooks/useAuth";

/* ------------------------------------------------------------------ */
/*  Nav structure: grouped menus + standalone links                     */
/* ------------------------------------------------------------------ */

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  description?: string;
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  items: NavItem[];
}

type NavEntry =
  | { type: "link"; item: NavItem }
  | { type: "group"; group: NavGroup };

const navStructure: NavEntry[] = [
  {
    type: "link",
    item: { href: "/timeline", label: "Timeline", icon: Clock, description: "Interactive chronology" },
  },
  {
    type: "group",
    group: {
      label: "Explore",
      icon: Compass,
      items: [
        { href: "/events", label: "Events", icon: Zap, description: "Crossovers & line-wide events" },
        { href: "/universes", label: "Universes", icon: Globe, description: "Earth-616, Ultimate & beyond" },
        { href: "/what-if", label: "What If?", icon: Shuffle, description: "Alternate reality stories" },
        { href: "/retcons", label: "Retcons", icon: GitBranch, description: "Changed continuity" },
        { href: "/conflicts", label: "Conflicts", icon: AlertTriangle, description: "Continuity disputes" },
        { href: "/stones", label: "Infinity Stones", icon: Gem, description: "Thematic tracker" },
      ],
    },
  },
  {
    type: "group",
    group: {
      label: "Browse",
      icon: Layers,
      items: [
        { href: "/characters", label: "Characters", icon: Users, description: "Heroes, villains & teams" },
        { href: "/creators", label: "Creators", icon: Pencil, description: "Writers, artists & editors" },
        { href: "/handbook", label: "Handbook", icon: BookMarked, description: "Marvel reference database" },
        { href: "/mcu", label: "MCU", icon: Film, description: "Movie & show cross-reference" },
        { href: "/search", label: "Search", icon: Search, description: "Full-text search" },
      ],
    },
  },
  {
    type: "group",
    group: {
      label: "Reading",
      icon: BookOpen,
      items: [
        { href: "/paths", label: "Reading Paths", icon: BookOpen, description: "Curated reading orders" },
        { href: "/guide", label: "Auto Guides", icon: BookText, description: "Generated reading guides" },
        { href: "/compare", label: "Compare", icon: GitCompareArrows, description: "Overlap & duplication detector" },
        { href: "/collection", label: "My Collection", icon: Library, description: "Track what you own & read" },
        { href: "/journey", label: "Journey Replay", icon: Play, description: "Animated reading timeline" },
      ],
    },
  },
  {
    type: "group",
    group: {
      label: "Community",
      icon: Star,
      items: [
        { href: "/trivia", label: "Trivia", icon: HelpCircle, description: "Test your Marvel knowledge" },
        { href: "/achievements", label: "Achievements", icon: Trophy, description: "Badges & milestones" },
        { href: "/debates", label: "Debates", icon: Swords, description: "Marvel debate arena" },
        { href: "/minute", label: "Marvel Minute", icon: Newspaper, description: "Quick knowledge cards" },
      ],
    },
  },
];

/* Flatten all items for active detection & mobile menu */
function flattenNav(entries: NavEntry[]): NavItem[] {
  const result: NavItem[] = [];
  for (const e of entries) {
    if (e.type === "link") result.push(e.item);
    else result.push(...e.group.items);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Dropdown component                                                 */
/* ------------------------------------------------------------------ */

function NavDropdown({
  group,
  isActive,
}: {
  group: NavGroup;
  isActive: (href: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const ref = useRef<HTMLDivElement>(null);

  const anyActive = group.items.some((i) => isActive(i.href));

  const openMenu = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }, []);

  // Close on outside click (for keyboard / tap users)
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={closeMenu}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors shrink-0"
        style={{
          color: anyActive ? "var(--text-primary)" : "var(--text-tertiary)",
          borderColor: anyActive ? "var(--accent-red)" : "transparent",
          fontWeight: anyActive ? 500 : 400,
        }}
        onMouseEnter={(e) => {
          if (!anyActive) {
            e.currentTarget.style.color = "var(--text-primary)";
            e.currentTarget.style.borderColor = "var(--border-default)";
          }
        }}
        onMouseLeave={(e) => {
          if (!anyActive) {
            e.currentTarget.style.color = "var(--text-tertiary)";
            e.currentTarget.style.borderColor = "transparent";
          }
        }}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <group.icon size={14} />
        {group.label}
        <ChevronDown
          size={12}
          className="transition-transform"
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-px w-64 rounded-lg py-1.5 shadow-xl z-50"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-default)",
          }}
          onMouseEnter={openMenu}
          onMouseLeave={closeMenu}
        >
          {group.items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 px-3 py-2.5 transition-colors"
                style={{
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  background: active ? "var(--bg-tertiary)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = active ? "var(--bg-tertiary)" : "transparent";
                  e.currentTarget.style.color = active ? "var(--text-primary)" : "var(--text-secondary)";
                }}
              >
                <item.icon size={16} />
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-tight">{item.label}</div>
                  {item.description && (
                    <div
                      className="text-xs mt-0.5 leading-snug"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {item.description}
                    </div>
                  )}
                </div>
                {active && (
                  <span
                    className="ml-auto mt-0.5 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "var(--accent-red)" }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

  // Auth-only items
  const authItems: NavItem[] = user
    ? [{ href: "/watcher", label: "The Watcher", icon: Eye, description: "Your personalized feed" }]
    : [];

  const allItems = [...flattenNav(navStructure), ...authItems];

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [userMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [mobileOpen]);

  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-default)" }}
    >
      {/* Top row: logo + nav + controls */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-14 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span
              className="text-lg sm:text-xl font-bold"
              style={{
                fontFamily: "var(--font-bricolage), sans-serif",
                color: "var(--accent-red)",
                letterSpacing: "-0.01em",
              }}
            >
              <span className="lg:hidden">Marvel Cart.</span>
              <span className="hidden lg:inline">The Marvel Cartographer</span>
            </span>
          </Link>

          {/* Desktop navigation — grouped dropdowns */}
          <nav
            className="hidden md:flex items-center gap-0.5 flex-1 justify-center -mb-px"
            aria-label="Main navigation"
          >
            {navStructure.map((entry, i) => {
              if (entry.type === "link") {
                const { item } = entry;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors shrink-0"
                    style={{
                      color: active ? "var(--text-primary)" : "var(--text-tertiary)",
                      borderColor: active ? "var(--accent-red)" : "transparent",
                      fontWeight: active ? 500 : 400,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.color = "var(--text-primary)";
                        e.currentTarget.style.borderColor = "var(--border-default)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.color = "var(--text-tertiary)";
                        e.currentTarget.style.borderColor = "transparent";
                      }
                    }}
                  >
                    <item.icon size={14} />
                    {item.label}
                  </Link>
                );
              } else {
                return (
                  <NavDropdown
                    key={entry.group.label}
                    group={entry.group}
                    isActive={isActive}
                  />
                );
              }
            })}

            {/* Auth-only links (inline) */}
            {authItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors shrink-0"
                  style={{
                    color: active ? "var(--text-primary)" : "var(--text-tertiary)",
                    borderColor: active ? "var(--accent-red)" : "transparent",
                    fontWeight: active ? 500 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = "var(--text-primary)";
                      e.currentTarget.style.borderColor = "var(--border-default)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = "var(--text-tertiary)";
                      e.currentTarget.style.borderColor = "transparent";
                    }
                  }}
                >
                  <item.icon size={14} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* Quick search button (desktop) */}
            <Link
              href="/search"
              className="hidden md:flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "var(--bg-tertiary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.background = "transparent"; }}
              aria-label="Search"
            >
              <Search size={16} />
            </Link>

            <ThemeToggle />
            {user && <StreakBadge />}

            {/* Auth button / user menu */}
            {!loading && (
              user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center justify-center w-10 h-10 rounded-full text-xs font-bold uppercase transition-opacity hover:opacity-80"
                    style={{ background: "var(--accent-red)", color: "#fff" }}
                    aria-label="User menu"
                    aria-expanded={userMenuOpen}
                  >
                    {user.email?.[0] ?? <User size={14} />}
                  </button>

                  {userMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 rounded-lg py-1 shadow-xl z-50"
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-default)",
                      }}
                    >
                      <div
                        className="px-3 py-2 text-xs truncate"
                        style={{ color: "var(--text-tertiary)", borderBottom: "1px solid var(--border-default)" }}
                      >
                        {user.email}
                      </div>
                      <Link
                        href="/collection"
                        className="flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                        style={{ color: "var(--text-secondary)" }}
                        onClick={() => setUserMenuOpen(false)}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                      >
                        <Library size={14} />
                        My Collection
                      </Link>
                      <Link
                        href="/achievements"
                        className="flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                        style={{ color: "var(--text-secondary)" }}
                        onClick={() => setUserMenuOpen(false)}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; e.currentTarget.style.color = "var(--accent-gold)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                      >
                        <Trophy size={14} />
                        Achievements
                      </Link>
                      <button
                        onClick={async () => { setUserMenuOpen(false); await signOut(); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors"
                        style={{ color: "var(--text-secondary)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; e.currentTarget.style.color = "var(--accent-red)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                      >
                        <LogOut size={14} />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                  style={{ background: "var(--accent-red)", color: "#fff" }}
                >
                  <LogIn size={14} />
                  <span className="hidden sm:inline">Sign In</span>
                </Link>
              )
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ color: "var(--text-secondary)" }}
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav — full-screen overlay with grouped sections */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="fixed inset-x-0 top-14 bottom-0 z-50 md:hidden overflow-y-auto"
            style={{ background: "var(--bg-primary)", paddingBottom: "max(5rem, calc(4rem + env(safe-area-inset-bottom)))" }}
          >
            <nav
              id="mobile-nav"
              role="navigation"
              aria-label="Mobile navigation"
              className="max-w-lg mx-auto px-4 py-4 space-y-4"
            >
              {navStructure.map((entry) => {
                if (entry.type === "link") {
                  const { item } = entry;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-base transition-colors"
                      style={{
                        color: active ? "var(--text-primary)" : "var(--text-secondary)",
                        background: active ? "var(--bg-tertiary)" : "transparent",
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      <item.icon size={20} />
                      {item.label}
                      {item.description && (
                        <span className="ml-auto text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {item.description}
                        </span>
                      )}
                    </Link>
                  );
                }

                const { group } = entry;
                return (
                  <div key={group.label}>
                    <div
                      className="flex items-center gap-2 px-3 mb-1.5 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      <group.icon size={12} />
                      {group.label}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {group.items.map((item) => {
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm transition-colors"
                            style={{
                              color: active ? "var(--text-primary)" : "var(--text-secondary)",
                              background: active ? "var(--bg-tertiary)" : "transparent",
                              fontWeight: active ? 500 : 400,
                            }}
                          >
                            <item.icon size={16} />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Auth-only section */}
              {authItems.length > 0 && (
                <div>
                  <div
                    className="flex items-center gap-2 px-3 mb-1.5 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    <Sparkles size={12} />
                    Personal
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {authItems.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm transition-colors"
                          style={{
                            color: active ? "var(--text-primary)" : "var(--text-secondary)",
                            background: active ? "var(--bg-tertiary)" : "transparent",
                            fontWeight: active ? 500 : 400,
                          }}
                        >
                          <item.icon size={16} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
