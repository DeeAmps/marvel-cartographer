import { User, Users, MapPin, Gem, Bug, Lightbulb } from "lucide-react";
import type { HandbookEntryType } from "@/lib/types";

const typeConfig: Record<
  HandbookEntryType,
  { label: string; color: string; icon: typeof User }
> = {
  character: { label: "Character", color: "var(--accent-red)", icon: User },
  team: { label: "Team", color: "var(--accent-blue)", icon: Users },
  location: { label: "Location", color: "var(--accent-green)", icon: MapPin },
  artifact: { label: "Artifact", color: "var(--accent-gold)", icon: Gem },
  species: { label: "Species", color: "var(--accent-purple)", icon: Bug },
  editorial_concept: {
    label: "Concept",
    color: "var(--text-tertiary)",
    icon: Lightbulb,
  },
};

export default function HandbookTypeBadge({
  type,
  size = "default",
}: {
  type: HandbookEntryType;
  size?: "default" | "large";
}) {
  const cfg = typeConfig[type];
  const Icon = cfg.icon;

  if (size === "large") {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
        style={{
          background: `color-mix(in srgb, ${cfg.color} 15%, transparent)`,
          color: cfg.color,
          border: `1px solid ${cfg.color}`,
        }}
      >
        <Icon size={14} />
        {cfg.label}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold"
      style={{
        background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
        color: cfg.color,
      }}
    >
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

export { typeConfig };
