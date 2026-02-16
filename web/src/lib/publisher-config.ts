import type { Publisher, PublisherConfig } from "./types";

// ============================================================
// Publisher Configuration
// ============================================================

export const PUBLISHER_CONFIGS: Record<Publisher, PublisherConfig> = {
  marvel: {
    id: "marvel",
    name: "Marvel",
    fullName: "The Marvel Cartographer",
    tagline: "Mapping the Marvel Universe since Fantastic Four #1 (1961)",
    startYear: 1961,
    originTitle: "Fantastic Four #1",
    accentColor: "var(--accent-red)",
    aiAssistantName: "The Watcher",
    aiAssistantDescription: "Uatu's successor observes all. Ask anything about the Marvel Universe.",
    mediaFeatureName: "MCU Cross-Reference",
    mediaFeatureAbbrev: "MCU",
    thematicTrackerName: "Infinity Stones",
    primaryUniverse: "Earth-616",
    minuteFeatureName: "Marvel Minute",
  },
  dc: {
    id: "dc",
    name: "DC",
    fullName: "The DC Cartographer",
    tagline: "Mapping the DC Universe since Action Comics #1 (1938)",
    startYear: 1938,
    originTitle: "Action Comics #1",
    accentColor: "var(--accent-blue)",
    aiAssistantName: "The Monitor",
    aiAssistantDescription: "Nix Uotan watches over all realities. Ask anything about the DC Universe.",
    mediaFeatureName: "DCU Cross-Reference",
    mediaFeatureAbbrev: "DCU",
    thematicTrackerName: "Emotional Spectrum",
    primaryUniverse: "Earth-0",
    minuteFeatureName: "DC Minute",
  },
};

export function getPublisherConfig(publisher: Publisher): PublisherConfig {
  return PUBLISHER_CONFIGS[publisher];
}

// ============================================================
// Thematic Tags per Publisher
// ============================================================

export type MarvelTheme = "power" | "space" | "time" | "reality" | "soul" | "mind";
export type DCTheme = "willpower" | "fear" | "rage" | "avarice" | "hope" | "compassion" | "love";
export type ThematicTag = MarvelTheme | DCTheme;

export interface ThemeMetadata {
  label: string;
  color: string;
  description: string;
}

export const MARVEL_THEMES: Record<MarvelTheme, ThemeMetadata> = {
  power: { label: "Power", color: "#9b59b6", description: "Conflict, battles & war" },
  space: { label: "Space", color: "#3498db", description: "Cosmic exploration & alien civilizations" },
  time: { label: "Time", color: "#2ecc71", description: "Legacy, continuity & time travel" },
  reality: { label: "Reality", color: "#e74c3c", description: "Retcons, reality warping & alternate worlds" },
  soul: { label: "Soul", color: "#e67e22", description: "Character depth, sacrifice & emotion" },
  mind: { label: "Mind", color: "#f1c40f", description: "Strategy, intellect & manipulation" },
};

export const DC_THEMES: Record<DCTheme, ThemeMetadata> = {
  willpower: { label: "Willpower", color: "#2ecc71", description: "Determination, Green Lanterns & courage" },
  fear: { label: "Fear", color: "#f1c40f", description: "Sinestro Corps, Scarecrow & terror" },
  rage: { label: "Rage", color: "#e74c3c", description: "Red Lanterns, vengeance & fury" },
  avarice: { label: "Avarice", color: "#e67e22", description: "Orange Lanterns, greed & Larfleeze" },
  hope: { label: "Hope", color: "#3498db", description: "Blue Lanterns, Superman & inspiration" },
  compassion: { label: "Compassion", color: "#8e44ad", description: "Indigo Tribe, empathy & redemption" },
  love: { label: "Love", color: "#e91e8f", description: "Star Sapphires, bonds & devotion" },
};

export function getThemesForPublisher(publisher: Publisher): Record<string, ThemeMetadata> {
  return publisher === "marvel" ? MARVEL_THEMES : DC_THEMES;
}

// ============================================================
// Nav Structure per Publisher
// ============================================================

export interface PublisherNavItem {
  href: string;
  label: string;
  description?: string;
}

export interface PublisherNavGroup {
  label: string;
  items: PublisherNavItem[];
}

export function getPublisherNav(publisher: Publisher): PublisherNavGroup[] {
  const base = `/${publisher}`;
  return [
    {
      label: "Explore",
      items: [
        { href: `${base}/events`, label: "Events", description: "Crossovers & line-wide events" },
        { href: `${base}/universes`, label: "Universes", description: publisher === "marvel" ? "Earth-616, Ultimate & beyond" : "Earth-0, multiverse & beyond" },
        { href: `${base}/what-if`, label: publisher === "marvel" ? "What If?" : "Elseworlds", description: "Alternate reality stories" },
        { href: `${base}/retcons`, label: "Retcons", description: "Changed continuity" },
        { href: `${base}/conflicts`, label: "Conflicts", description: "Continuity disputes" },
        { href: `${base}/themes`, label: publisher === "marvel" ? "Infinity Stones" : "Emotional Spectrum", description: "Thematic tracker" },
      ],
    },
    {
      label: "Browse",
      items: [
        { href: `${base}/characters`, label: "Characters", description: "Heroes, villains & teams" },
        { href: `${base}/creators`, label: "Creators", description: "Writers, artists & editors" },
        { href: `${base}/handbook`, label: "Handbook", description: `${publisher === "marvel" ? "Marvel" : "DC"} reference database` },
        { href: `${base}/media`, label: publisher === "marvel" ? "MCU" : "DCU", description: "Movie & show cross-reference" },
        { href: `${base}/search`, label: "Search", description: "Full-text search" },
      ],
    },
    {
      label: "Reading",
      items: [
        { href: `${base}/paths`, label: "Reading Paths", description: "Curated reading orders" },
        { href: `${base}/guide`, label: "Auto Guides", description: "Generated reading guides" },
        { href: `${base}/compare`, label: "Compare", description: "Overlap & duplication detector" },
        { href: `${base}/collection`, label: "My Collection", description: "Track what you own & read" },
        { href: `${base}/journey`, label: "Journey Replay", description: "Animated reading timeline" },
      ],
    },
    {
      label: "Community",
      items: [
        { href: `${base}/trivia`, label: "Trivia", description: `Test your ${publisher === "marvel" ? "Marvel" : "DC"} knowledge` },
        { href: `${base}/achievements`, label: "Achievements", description: "Badges & milestones" },
        { href: `${base}/debates`, label: "Debates", description: `${publisher === "marvel" ? "Marvel" : "DC"} debate arena` },
        { href: `${base}/minute`, label: publisher === "marvel" ? "Marvel Minute" : "DC Minute", description: "Quick knowledge cards" },
      ],
    },
  ];
}

// ============================================================
// Quick Start Paths per Publisher
// ============================================================

export interface QuickStartPath {
  href: string;
  label: string;
  desc: string;
  accent: string;
}

export function getQuickStartPaths(publisher: Publisher): QuickStartPath[] {
  const base = `/${publisher}`;
  if (publisher === "marvel") {
    return [
      { href: `${base}/path/absolute-essentials`, label: "The Absolute Essentials", desc: "Must-read editions spanning 60 years", accent: "var(--accent-red)" },
      { href: `${base}/path/ff-complete`, label: "The Complete Fantastic Four", desc: "Follow the First Family from the very beginning", accent: "var(--accent-blue)" },
      { href: `${base}/path/cosmic-marvel`, label: "Cosmic Marvel", desc: "From the Galactus Trilogy to the Multiverse", accent: "var(--accent-purple)" },
      { href: `${base}/path/doctor-doom-arc`, label: "Doctor Doom's Arc", desc: "Tyrant. God Emperor. Sorcerer Supreme.", accent: "var(--accent-gold)" },
    ];
  }
  return [
    { href: `${base}/path/dc-essentials`, label: "DC Essentials", desc: "The must-read DC collected editions", accent: "var(--accent-blue)" },
    { href: `${base}/path/batman-complete`, label: "The Complete Batman", desc: "From Year One to the present day", accent: "var(--accent-gold)" },
    { href: `${base}/path/green-lantern-saga`, label: "Green Lantern Saga", desc: "Johns' complete Green Lantern epic", accent: "var(--accent-green)" },
    { href: `${base}/path/crisis-trilogy`, label: "Crisis Trilogy", desc: "COIE, Infinite Crisis, Final Crisis", accent: "var(--accent-red)" },
  ];
}

// ============================================================
// Start Wizard Interest Types per Publisher
// ============================================================

export interface InterestOption {
  id: string;
  label: string;
  description: string;
  suggestedPaths: string[];
}

export function getInterestOptions(publisher: Publisher): InterestOption[] {
  if (publisher === "marvel") {
    return [
      { id: "cosmic", label: "Cosmic", description: "Space, Galactus, Silver Surfer, Infinity Stones", suggestedPaths: ["cosmic-marvel", "infinity-saga"] },
      { id: "street", label: "Street-Level", description: "Daredevil, Spider-Man, Punisher", suggestedPaths: ["daredevil-complete", "spider-man-complete"] },
      { id: "mutants", label: "Mutants", description: "X-Men, Brotherhood, Krakoa", suggestedPaths: ["x-men-complete", "dawn-of-krakoa"] },
      { id: "teams", label: "Teams", description: "Avengers, Fantastic Four, Defenders", suggestedPaths: ["avengers-complete", "ff-complete"] },
      { id: "horror", label: "Horror", description: "Ghost Rider, Blade, Werewolf by Night", suggestedPaths: ["marvel-horror"] },
      { id: "mcu", label: "MCU Fan", description: "Start with comics adapted into MCU films", suggestedPaths: ["mcu-source-reading"] },
      { id: "everything", label: "Everything", description: "The complete chronological experience", suggestedPaths: ["absolute-essentials"] },
    ];
  }
  return [
    { id: "bat-family", label: "Bat-Family", description: "Batman, Robin, Batgirl, Nightwing", suggestedPaths: ["batman-complete", "bat-family-order"] },
    { id: "superman", label: "Superman", description: "The Man of Steel and his world", suggestedPaths: ["superman-complete"] },
    { id: "cosmic-lantern", label: "Cosmic / Lanterns", description: "Green Lantern Corps, cosmic stories", suggestedPaths: ["green-lantern-saga"] },
    { id: "teams", label: "Teams", description: "Justice League, Teen Titans, JSA", suggestedPaths: ["justice-league-complete", "teen-titans"] },
    { id: "horror", label: "Horror / Vertigo", description: "Sandman, Swamp Thing, Hellblazer", suggestedPaths: ["vertigo-essential"] },
    { id: "dcu", label: "DCU Fan", description: "Comics adapted into DC films", suggestedPaths: ["dcu-source-reading"] },
    { id: "everything", label: "Everything", description: "The complete chronological experience", suggestedPaths: ["dc-essentials"] },
  ];
}
