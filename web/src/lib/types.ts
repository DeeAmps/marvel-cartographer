export type EditionFormat =
  | 'omnibus'
  | 'epic_collection'
  | 'trade_paperback'
  | 'hardcover'
  | 'masterworks'
  | 'compendium'
  | 'complete_collection'
  | 'oversized_hardcover';

export type PrintStatus =
  | 'in_print'
  | 'out_of_print'
  | 'upcoming'
  | 'digital_only'
  | 'ongoing'
  | 'check_availability';

export type ImportanceLevel =
  | 'essential'
  | 'recommended'
  | 'supplemental'
  | 'completionist';

export type ConnectionType =
  | 'leads_to'
  | 'ties_into'
  | 'spin_off'
  | 'retcons'
  | 'references'
  | 'parallel'
  | 'collected_in'
  | 'prerequisite'
  | 'recommended_after';

export type GuideStatus = 'complete' | 'in_progress' | 'planned';

export interface Era {
  id: string;
  slug: string;
  name: string;
  number: number;
  year_start: number;
  year_end: number;
  subtitle: string;
  description: string;
  color: string;
  guide_status?: GuideStatus;
  chapters?: EraChapter[];
}

export interface EraChapter {
  id: string;
  era_id: string;
  slug: string;
  name: string;
  number: number;
  description: string;
  year_start: number;
  year_end: number;
}

export interface Universe {
  id: string;
  slug: string;
  name: string;
  designation: string;
  year_start: number;
  year_end: number | null;
  description: string;
  is_primary: boolean;
  color: string;
}

export interface Creator {
  id: string;
  slug: string;
  name: string;
  roles: string[];
  active_years: string;
  bio: string;
  image_url?: string;
}

export interface Character {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  first_appearance_issue: string;
  universe: string;
  teams: string[];
  description: string;
  image_url?: string;
}

export interface StoryArc {
  id: string;
  slug: string;
  name: string;
  issues: string;
  era_slug: string;
  importance: ImportanceLevel;
  synopsis: string;
  tags: string[];
}

export interface Event {
  id: string;
  slug: string;
  name: string;
  year: number;
  core_issues: string;
  importance: ImportanceLevel;
  synopsis: string;
  impact: string;
  prerequisites: string;
  consequences: string;
  era_slug: string;
  tags: string[];
  guide_status: GuideStatus;
  phases?: EventPhase[];
}

export interface EventPhase {
  id: string;
  event_id: string;
  slug: string;
  name: string;
  number: number;
  description: string;
}

export interface ReadingOrderEntry {
  id: string;
  context_type: 'event' | 'event_phase' | 'chapter' | 'arc';
  context_id: string;
  position: number;
  series_title: string;
  issue_number: string;
  edition_slug: string | null;
  note: string | null;
  is_core: boolean;
  phase_id: string | null;
  phase_name?: string;
  phase_number?: number;
}

export interface EventEdition {
  event_slug: string;
  edition_slug: string;
  is_core: boolean;
  reading_order: number;
}

export interface Issue {
  id: string;
  slug: string;
  series: string;
  issue_number: number;
  publication_date: string;
  title: string;
  importance: ImportanceLevel;
  first_appearances: string[];
  tags: string[];
}

export interface SearchFilters {
  query?: string;
  era?: string;
  importance?: ImportanceLevel;
  status?: PrintStatus;
  format?: EditionFormat;
  creator?: string;
  character?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  slug: string;
  title: string;
  importance: string;
  print_status: string;
  cover_image_url?: string;
  depth: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  connection_type: string;
  strength: number;
  confidence: number;
  description: string;
}

export interface CollectedEdition {
  id: string;
  slug: string;
  title: string;
  format: EditionFormat;
  issues_collected: string;
  issue_count: number;
  print_status: PrintStatus;
  importance: ImportanceLevel;
  era_id: string;
  chapter_id?: string;
  universe_id?: string;
  synopsis: string;
  connection_notes: string;
  cover_image_url: string | null;
  page_count?: number;
  cover_price?: number;
  isbn?: string;
  era_name?: string;
  era_slug?: string;
  era_number?: number;
  era_color?: string;
  chapter_name?: string;
  chapter_slug?: string;
  universe_name?: string;
  universe_designation?: string;
  creator_names?: string[];
}

export interface Connection {
  id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  connection_type: ConnectionType;
  strength: number;
  confidence: number;
  description: string;
  source_title?: string;
  target_title?: string;
}

export interface ContinuityConflict {
  id: string;
  slug: string;
  title: string;
  description: string;
  official_stance: string;
  fan_interpretation: string;
  editorial_context: string;
  confidence: number;
  source_citations: string[];
  tags: string[];
}

export interface ReadingPath {
  id: string;
  slug: string;
  name: string;
  category: string;
  path_type: string;
  difficulty: string;
  description: string;
  estimated_issues: number;
  sections?: ReadingPathSection[];
  entries: ReadingPathEntry[];
}

export interface ReadingPathSection {
  name: string;
  start_position: number;
  end_position: number;
}

export interface ReadingPathEntry {
  position: number;
  edition: CollectedEdition;
  note: string;
  is_optional: boolean;
}

export interface WhatsNextResult {
  edition: {
    id: string;
    slug: string;
    title: string;
    importance: ImportanceLevel;
    print_status: PrintStatus;
    issues_collected: string;
    synopsis: string;
    cover_image_url?: string;
  };
  connection_type: ConnectionType;
  strength: number;
  confidence: number;
  depth: number;
  score: number;
}

export interface Resource {
  id: string;
  name: string;
  resource_type: string;
  url: string;
  description: string;
  focus: string;
  best_for: string;
}

export interface Retailer {
  id: string;
  slug: string;
  name: string;
  url: string;
  description: string;
  notes: string;
  is_digital: boolean;
  ships_international: boolean;
}

// ============================================================
// Differentiator Feature Types
// ============================================================

export interface PurchasePlanEntry {
  position: number;
  edition: {
    id: string;
    slug: string;
    title: string;
    importance: ImportanceLevel;
    print_status: PrintStatus;
    issues_collected: string;
    synopsis: string;
    cover_image_url?: string;
  };
  cover_price: number;
  cheapest_price?: number;
  cheapest_retailer?: string;
  reprint_date?: string;
  note?: string;
}

export interface PurchasePlan {
  path_name: string;
  path_slug: string;
  total_cover_price: number;
  total_best_price: number;
  savings: number;
  in_print: PurchasePlanEntry[];
  out_of_print: PurchasePlanEntry[];
  upcoming: PurchasePlanEntry[];
  digital_only: PurchasePlanEntry[];
}

export interface OverlapResult {
  edition_a_slug: string;
  edition_a_title: string;
  edition_b_slug: string;
  edition_b_title: string;
  overlap_count: number;
  overlap_issues: string[];
}

export interface OverlapResponse {
  editions: {
    id: string;
    slug: string;
    title: string;
    importance: ImportanceLevel;
    print_status: PrintStatus;
  }[];
  overlaps: OverlapResult[];
  total_overlapping_issues: number;
}

export interface CreatorSagaEntry {
  position: number;
  edition: {
    id: string;
    slug: string;
    title: string;
    importance: ImportanceLevel;
    print_status: PrintStatus;
    issues_collected: string;
    synopsis: string;
    cover_image_url?: string;
    era_name?: string;
    era_slug?: string;
  };
  era_name: string;
  role: string;
}

export interface CreatorSaga {
  creator_name: string;
  creator_slug: string;
  entries: CreatorSagaEntry[];
  connections: {
    source_id: string;
    target_id: string;
    connection_type: ConnectionType;
    strength: number;
  }[];
}

export interface PrintStatusChange {
  old_status: string;
  new_status: string;
  changed_at: string;
  source: string;
}

export interface EditionIssue {
  edition_slug: string;
  series_name: string;
  issue_number: number;
  is_annual: boolean;
}

export type TriviaCategory =
  | 'first-appearances'
  | 'deaths-returns'
  | 'villains'
  | 'teams'
  | 'cosmic'
  | 'events'
  | 'creators'
  | 'powers'
  | 'relationships'
  | 'weapons-artifacts'
  | 'locations'
  | 'secret-identities'
  | 'retcons'
  | 'behind-the-scenes'
  | 'miscellaneous';

export type TriviaDifficulty = 'easy' | 'medium' | 'hard';

export interface TriviaQuestion {
  id: number;
  question: string;
  answer: string;
  source_issue: string;
  category: TriviaCategory;
  difficulty: TriviaDifficulty;
  tags: string[];
}

// ============================================================
// Handbook System Types
// ============================================================

export type HandbookEntryType =
  | 'character'
  | 'team'
  | 'location'
  | 'artifact'
  | 'species'
  | 'editorial_concept';

export interface HandbookStatusByEra {
  era_slug: string;
  status: string;
  note?: string;
  citation?: string;
}

export interface HandbookRetconEvent {
  year: number;
  description: string;
  source: string;
  old_state: string;
  new_state: string;
}

export interface PowerGrid {
  intelligence: number;
  strength: number;
  speed: number;
  durability: number;
  energy_projection: number;
  fighting_skills: number;
}

export interface CharacterHandbookData {
  power_grid: PowerGrid;
  abilities: string[];
  affiliations: { team_slug: string; era_slugs: string[] }[];
  identity_changes: { era_slug: string; identity: string; citation: string }[];
}

export interface TeamHandbookData {
  roster_by_era: { era_slug: string; members: string[]; note?: string }[];
  founding_event: string;
  headquarters: string[];
}

export interface LocationHandbookData {
  location_type: 'nation' | 'realm' | 'dimension' | 'planet' | 'city' | 'island';
  significance_by_era: { era_slug: string; significance: string; citation?: string }[];
  notable_residents: string[];
}

export interface ArtifactHandbookData {
  artifact_type: 'weapon' | 'cosmic' | 'magical' | 'technological';
  possession_history: { holder_slug: string; era_slug: string; how_obtained: string; citation: string }[];
  power_description: string;
}

export interface SpeciesHandbookData {
  species_type: 'alien' | 'cosmic' | 'mutant' | 'magical';
  homeworld: string;
  notable_members: string[];
  canon_evolution: { era_slug: string; change: string; citation?: string }[];
}

export interface EditorialConceptData {
  concept_type: 'continuity_mechanic' | 'story_device' | 'meta_concept';
  applies_to: string[];
  examples: { description: string; citation: string }[];
}

export type HandbookData =
  | CharacterHandbookData
  | TeamHandbookData
  | LocationHandbookData
  | ArtifactHandbookData
  | SpeciesHandbookData
  | EditorialConceptData;

// ============================================================
// Retention Feature Types (Phase 1)
// ============================================================

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface Achievement {
  id: string;
  slug: string;
  name: string;
  description: string;
  rarity: AchievementRarity;
  icon: string;
  requirement_type: string;
  requirement_value: Record<string, unknown>;
  xp_reward: number;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

export interface UserStats {
  user_id: string;
  total_xp: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  editions_read: number;
  paths_completed: number;
}

export interface EditionRating {
  id: string;
  user_id: string;
  edition_id: string;
  rating: number;
  review: string | null;
  created_at: string;
}

export interface EditionRatingStats {
  edition_id: string;
  average_rating: number;
  rating_count: number;
}

export interface DailyIssue {
  slug: string;
  series: string;
  issue_number: string;
  publication_date: string;
  title: string;
  importance: ImportanceLevel;
  first_appearances: string[];
  tags: string[];
}

export interface XPLevel {
  name: string;
  min_xp: number;
  max_xp: number;
  color: string;
}

export interface HandbookEntry {
  slug: string;
  entry_type: HandbookEntryType;
  name: string;
  core_concept: string;
  canon_confidence: number;
  description: string;
  tags: string[];
  source_citations: string[];
  related_edition_slugs: string[];
  related_event_slugs: string[];
  related_conflict_slugs: string[];
  related_handbook_slugs: string[];
  status_by_era: HandbookStatusByEra[];
  retcon_history: HandbookRetconEvent[];
  data: HandbookData;
}

// ============================================================
// Phase 2 & 3 Feature Types
// ============================================================

export interface ComparisonVoteStats {
  edition_a_id: string;
  edition_b_id: string;
  a_votes: number;
  b_votes: number;
}

export type RelationshipType =
  | 'ally'
  | 'enemy'
  | 'family'
  | 'romantic'
  | 'mentor'
  | 'rival'
  | 'teammate';

export interface CharacterRelationship {
  character_a_slug: string;
  character_a_name: string;
  character_b_slug: string;
  character_b_name: string;
  relationship_type: RelationshipType;
  strength: number;
  description: string;
  citation: string;
}

export interface PrerequisiteEntry {
  edition_slug: string;
  edition_title: string;
  issues_collected: string;
  importance: ImportanceLevel;
  connection_type: ConnectionType;
  strength: number;
  description: string;
  category: 'required' | 'recommended' | 'helpful';
}

export interface RetconEntry {
  entry_slug: string;
  entry_name: string;
  entry_type: HandbookEntryType;
  retcon: HandbookRetconEvent;
}

export interface CharacterGraphNode {
  slug: string;
  name: string;
  teams: string[];
  universe: string;
  editionCount: number;
}

export interface CharacterGraphEdge {
  source: string;
  target: string;
  type: string;
  strength: number;
  label: string;
}

export interface SuggestedComparison {
  slug_a: string;
  title_a: string;
  slug_b: string;
  title_b: string;
  overlap_count: number;
  reason: string;
}

// ============================================================
// Tier 7 & 9 Feature Types
// ============================================================

// MCU Cross-Reference (#33)
export interface MCUContent {
  id: string;
  slug: string;
  title: string;
  content_type: 'movie' | 'series' | 'special';
  release_date: string | null;
  phase: number;
  saga: string;
  poster_url: string | null;
  faithfulness_score: number;
  synopsis: string;
}

export interface MCUComicMapping {
  id: string;
  mcu_content_id: string;
  edition_id: string;
  mapping_type: 'direct_adaptation' | 'loose_inspiration' | 'character_origin';
  faithfulness: number;
  notes: string;
  // Joined fields
  edition_slug?: string;
  edition_title?: string;
  edition_cover_image_url?: string;
  edition_importance?: ImportanceLevel;
  mcu_title?: string;
  mcu_slug?: string;
  mcu_poster_url?: string;
  mcu_content_type?: string;
}

// Infinity Stones Thematic Tracker (#26)
export type InfinityTheme = 'power' | 'space' | 'time' | 'reality' | 'soul' | 'mind';

export const INFINITY_THEME_META: Record<InfinityTheme, { label: string; color: string; description: string }> = {
  power: { label: 'Power', color: '#9b59b6', description: 'Conflict, battles & war' },
  space: { label: 'Space', color: '#3498db', description: 'Cosmic exploration & alien civilizations' },
  time: { label: 'Time', color: '#2ecc71', description: 'Legacy, continuity & time travel' },
  reality: { label: 'Reality', color: '#e74c3c', description: 'Retcons, reality warping & alternate worlds' },
  soul: { label: 'Soul', color: '#e67e22', description: 'Character depth, sacrifice & emotion' },
  mind: { label: 'Mind', color: '#f1c40f', description: 'Strategy, intellect & manipulation' },
};

// Debate Arena (#34)
export interface Debate {
  id: string;
  slug: string;
  title: string;
  question: string;
  category: string;
  context: string | null;
  is_featured: boolean;
  featured_at: string | null;
  status: string;
  related_edition_ids: string[];
  related_character_ids: string[];
  created_at: string;
  // Aggregated
  agree_count?: number;
  disagree_count?: number;
  complicated_count?: number;
  total_votes?: number;
}

export interface DebateVote {
  id: string;
  debate_id: string;
  user_id: string;
  position: 'agree' | 'disagree' | 'complicated';
  evidence_text: string | null;
  evidence_citations: string[];
  created_at: string;
}

export interface DebateEvidence {
  id: string;
  debate_id: string;
  position: 'agree' | 'disagree' | 'complicated';
  edition_id: string | null;
  issue_citation: string;
  description: string;
  vote_count: number;
  created_at: string;
}

// Auto-Generated Guides (#31)
export interface GeneratedGuide {
  query: string;
  title: string;
  description: string;
  essential: CollectedEdition[];
  recommended: CollectedEdition[];
  completionist: CollectedEdition[];
  total_editions: number;
  estimated_cost: number;
  matched_characters: string[];
  matched_events: string[];
  matched_arcs: string[];
}

// Marvel Minute Cards (#32)
export interface KnowledgeCard {
  id: string;
  category: 'character_origin' | 'event_summary' | 'retcon_explained' | 'creator_spotlight' | 'this_day';
  title: string;
  body: string;
  citation: string;
  image_url?: string;
  link_href?: string;
  link_label?: string;
  accent_color: string;
}

// Reading Journey Replay (#25)
export interface JourneyFrame {
  edition_slug: string;
  edition_title: string;
  completed_at: string;
  era_slug: string;
  era_color: string;
  importance: ImportanceLevel;
  x: number;
  y: number;
}

// ============================================================
// Watcher Conversation Persistence
// ============================================================

export interface WatcherConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface WatcherMessageRecord {
  id: string;
  conversation_id: string;
  role: 'user' | 'watcher';
  content: string;
  created_at: string;
}

