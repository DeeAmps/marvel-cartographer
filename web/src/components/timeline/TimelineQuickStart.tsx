import Link from "next/link";
import { BookOpen, Rocket, Layers, HelpCircle } from "lucide-react";

const ENTRY_POINTS = [
  {
    label: "New to Marvel?",
    description: "The 29 essential collected editions",
    href: "/path/absolute-essentials",
    icon: BookOpen,
    color: "var(--accent-red)",
  },
  {
    label: "Cosmic Marvel",
    description: "Galactus, Thanos, and the Infinity Saga",
    href: "/path/cosmic-marvel",
    icon: Rocket,
    color: "var(--accent-purple)",
  },
  {
    label: "Pick an Era",
    description: "Jump to any decade below",
    href: "#era-map",
    icon: Layers,
    color: "var(--accent-gold)",
  },
  {
    label: "Need help?",
    description: "Guided start wizard",
    href: "/start",
    icon: HelpCircle,
    color: "var(--accent-blue)",
  },
] as const;

export default function TimelineQuickStart() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
      {ENTRY_POINTS.map((ep) => {
        const Icon = ep.icon;
        const isAnchor = ep.href.startsWith("#");
        const Component = isAnchor ? "a" : Link;
        return (
          <Component
            key={ep.label}
            href={ep.href}
            className="group rounded-xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-default)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} style={{ color: ep.color }} />
              <span
                className="text-sm font-bold group-hover:text-[var(--accent-red)] transition-colors"
                style={{ color: "var(--text-primary)" }}
              >
                {ep.label}
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {ep.description}
            </p>
          </Component>
        );
      })}
    </div>
  );
}
