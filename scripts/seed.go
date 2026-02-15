package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

// JSON types matching our data files

type Era struct {
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Number      int    `json:"number"`
	YearStart   int    `json:"year_start"`
	YearEnd     int    `json:"year_end"`
	Subtitle    string `json:"subtitle"`
	Description string `json:"description"`
	Color       string `json:"color"`
}

type Creator struct {
	Slug        string   `json:"slug"`
	Name        string   `json:"name"`
	Roles       []string `json:"roles"`
	ActiveYears string   `json:"active_years"`
	Bio         string   `json:"bio"`
}

type Character struct {
	Slug                 string   `json:"slug"`
	Name                 string   `json:"name"`
	Aliases              []string `json:"aliases"`
	FirstAppearanceIssue string   `json:"first_appearance_issue"`
	Universe             string   `json:"universe"`
	Teams                []string `json:"teams"`
	Description          string   `json:"description"`
}

type EditionCreator struct {
	Name string `json:"name"`
	Role string `json:"role"`
}

type CollectedEdition struct {
	Slug             string           `json:"slug"`
	Title            string           `json:"title"`
	Format           string           `json:"format"`
	IssuesCollected  string           `json:"issues_collected"`
	IssueCount       int              `json:"issue_count"`
	PrintStatus      string           `json:"print_status"`
	Importance       string           `json:"importance"`
	EraSlug          string           `json:"era_slug"`
	Creators         []EditionCreator `json:"creators"`
	Synopsis         string           `json:"synopsis"`
	ConnectionNotes  string           `json:"connection_notes"`
}

type StoryArc struct {
	Slug       string   `json:"slug"`
	Name       string   `json:"name"`
	Issues     string   `json:"issues"`
	EraSlug    string   `json:"era_slug"`
	Importance string   `json:"importance"`
	Synopsis   string   `json:"synopsis"`
	Tags       []string `json:"tags"`
}

type Event struct {
	Slug          string   `json:"slug"`
	Name          string   `json:"name"`
	Year          int      `json:"year"`
	CoreIssues    string   `json:"core_issues"`
	Importance    string   `json:"importance"`
	Synopsis      string   `json:"synopsis"`
	Impact        string   `json:"impact"`
	Prerequisites string   `json:"prerequisites"`
	Consequences  string   `json:"consequences"`
	EraSlug       string   `json:"era_slug"`
	Tags          []string `json:"tags"`
}

type Connection struct {
	SourceType     string `json:"source_type"`
	SourceSlug     string `json:"source_slug"`
	TargetType     string `json:"target_type"`
	TargetSlug     string `json:"target_slug"`
	ConnectionType string `json:"connection_type"`
	Strength       int    `json:"strength"`
	Confidence     int    `json:"confidence"`
	Description    string `json:"description"`
}

type ContinuityConflict struct {
	Slug               string   `json:"slug"`
	Title              string   `json:"title"`
	Description        string   `json:"description"`
	OfficialStance     string   `json:"official_stance"`
	FanInterpretation  string   `json:"fan_interpretation"`
	EditorialContext    string   `json:"editorial_context"`
	Confidence         int      `json:"confidence"`
	SourceCitations    []string `json:"source_citations"`
	Tags               []string `json:"tags"`
}

type ReadingPathEntry struct {
	Position    int    `json:"position"`
	EditionSlug string `json:"edition_slug"`
	Note        string `json:"note"`
	IsOptional  bool   `json:"is_optional"`
}

type ReadingPath struct {
	Slug            string             `json:"slug"`
	Name            string             `json:"name"`
	PathType        string             `json:"path_type"`
	Difficulty      string             `json:"difficulty"`
	Description     string             `json:"description"`
	EstimatedIssues int                `json:"estimated_issues"`
	Entries         []ReadingPathEntry `json:"entries"`
}

type Retailer struct {
	Slug               string `json:"slug"`
	Name               string `json:"name"`
	URL                string `json:"url"`
	Description        string `json:"description"`
	Notes              string `json:"notes"`
	IsDigital          bool   `json:"is_digital"`
	ShipsInternational bool   `json:"ships_international"`
}

type Resource struct {
	Name         string `json:"name"`
	ResourceType string `json:"resource_type"`
	URL          string `json:"url"`
	Description  string `json:"description"`
	Focus        string `json:"focus"`
	BestFor      string `json:"best_for"`
}

func loadJSON[T any](filename string) ([]T, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("reading %s: %w", filename, err)
	}
	var items []T
	if err := json.Unmarshal(data, &items); err != nil {
		return nil, fmt.Errorf("parsing %s: %w", filename, err)
	}
	return items, nil
}

func main() {
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	dbURL := os.Getenv("SUPABASE_DB_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Println("Connected to database")

	dataDir := filepath.Join("..", "data")

	// Slug -> UUID maps for cross-referencing
	eraIDs := make(map[string]string)
	creatorIDs := make(map[string]string)
	editionIDs := make(map[string]string)

	// 1. Seed Eras
	eras, err := loadJSON[Era](filepath.Join(dataDir, "eras.json"))
	if err != nil {
		log.Fatalf("Loading eras: %v", err)
	}
	for _, era := range eras {
		var id string
		err := pool.QueryRow(ctx,
			`INSERT INTO eras (slug, name, number, year_start, year_end, subtitle, description, color)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			 ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
			 RETURNING id`,
			era.Slug, era.Name, era.Number, era.YearStart, era.YearEnd, era.Subtitle, era.Description, era.Color,
		).Scan(&id)
		if err != nil {
			log.Fatalf("Inserting era %s: %v", era.Slug, err)
		}
		eraIDs[era.Slug] = id
	}
	log.Printf("Seeded %d eras", len(eras))

	// 2. Seed Creators
	creators, err := loadJSON[Creator](filepath.Join(dataDir, "creators.json"))
	if err != nil {
		log.Fatalf("Loading creators: %v", err)
	}
	for _, c := range creators {
		var id string
		err := pool.QueryRow(ctx,
			`INSERT INTO creators (slug, name, roles, active_years, bio)
			 VALUES ($1, $2, $3, $4, $5)
			 ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
			 RETURNING id`,
			c.Slug, c.Name, c.Roles, c.ActiveYears, c.Bio,
		).Scan(&id)
		if err != nil {
			log.Fatalf("Inserting creator %s: %v", c.Slug, err)
		}
		creatorIDs[c.Slug] = id
	}
	log.Printf("Seeded %d creators", len(creators))

	// 3. Seed Characters
	characters, err := loadJSON[Character](filepath.Join(dataDir, "characters.json"))
	if err != nil {
		log.Fatalf("Loading characters: %v", err)
	}
	for _, ch := range characters {
		universe := ch.Universe
		if universe == "" {
			universe = "Earth-616"
		}
		_, err := pool.Exec(ctx,
			`INSERT INTO characters (slug, name, aliases, first_appearance_issue, universe, teams, description)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)
			 ON CONFLICT (slug) DO NOTHING`,
			ch.Slug, ch.Name, ch.Aliases, ch.FirstAppearanceIssue, universe, ch.Teams, ch.Description,
		)
		if err != nil {
			log.Fatalf("Inserting character %s: %v", ch.Slug, err)
		}
	}
	log.Printf("Seeded %d characters", len(characters))

	// 4. Seed Collected Editions
	editions, err := loadJSON[CollectedEdition](filepath.Join(dataDir, "collected_editions.json"))
	if err != nil {
		log.Fatalf("Loading editions: %v", err)
	}
	for _, ed := range editions {
		eraID, ok := eraIDs[ed.EraSlug]
		if !ok {
			log.Printf("WARNING: Era slug '%s' not found for edition '%s'", ed.EraSlug, ed.Title)
			continue
		}
		var id string
		err := pool.QueryRow(ctx,
			`INSERT INTO collected_editions (slug, title, format, issues_collected, issue_count, print_status, importance, era_id, synopsis, connection_notes)
			 VALUES ($1, $2, $3::edition_format, $4, $5, $6::print_status, $7::importance_level, $8, $9, $10)
			 ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title
			 RETURNING id`,
			ed.Slug, ed.Title, ed.Format, ed.IssuesCollected, ed.IssueCount, ed.PrintStatus, ed.Importance, eraID, ed.Synopsis, ed.ConnectionNotes,
		).Scan(&id)
		if err != nil {
			log.Fatalf("Inserting edition %s: %v", ed.Slug, err)
		}
		editionIDs[ed.Slug] = id

		// Insert edition_creators
		for _, ec := range ed.Creators {
			creatorSlug := slugify(ec.Name)
			creatorID, ok := creatorIDs[creatorSlug]
			if !ok {
				log.Printf("  WARNING: Creator '%s' (slug: %s) not found for edition '%s'", ec.Name, creatorSlug, ed.Title)
				continue
			}
			_, err := pool.Exec(ctx,
				`INSERT INTO edition_creators (edition_id, creator_id, role)
				 VALUES ($1, $2, $3)
				 ON CONFLICT DO NOTHING`,
				id, creatorID, ec.Role,
			)
			if err != nil {
				log.Printf("  WARNING: Failed to link creator %s to edition %s: %v", ec.Name, ed.Slug, err)
			}
		}
	}
	log.Printf("Seeded %d editions", len(editions))

	// 5. Seed Connections
	connections, err := loadJSON[Connection](filepath.Join(dataDir, "connections.json"))
	if err != nil {
		log.Fatalf("Loading connections: %v", err)
	}
	connCount := 0
	for _, conn := range connections {
		sourceID, ok := editionIDs[conn.SourceSlug]
		if !ok {
			log.Printf("WARNING: Source edition '%s' not found for connection", conn.SourceSlug)
			continue
		}
		targetID, ok := editionIDs[conn.TargetSlug]
		if !ok {
			log.Printf("WARNING: Target edition '%s' not found for connection", conn.TargetSlug)
			continue
		}
		_, err := pool.Exec(ctx,
			`INSERT INTO connections (source_type, source_id, target_type, target_id, connection_type, strength, confidence, description)
			 VALUES ($1, $2, $3, $4, $5::connection_type, $6, $7, $8)
			 ON CONFLICT DO NOTHING`,
			conn.SourceType, sourceID, conn.TargetType, targetID, conn.ConnectionType, conn.Strength, conn.Confidence, conn.Description,
		)
		if err != nil {
			log.Printf("WARNING: Failed to insert connection %s -> %s: %v", conn.SourceSlug, conn.TargetSlug, err)
			continue
		}
		connCount++
	}
	log.Printf("Seeded %d connections", connCount)

	// 6. Seed Continuity Conflicts
	conflicts, err := loadJSON[ContinuityConflict](filepath.Join(dataDir, "continuity_conflicts.json"))
	if err != nil {
		log.Fatalf("Loading conflicts: %v", err)
	}
	for _, c := range conflicts {
		_, err := pool.Exec(ctx,
			`INSERT INTO continuity_conflicts (slug, title, description, official_stance, fan_interpretation, editorial_context, confidence, source_citations, tags)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			 ON CONFLICT (slug) DO NOTHING`,
			c.Slug, c.Title, c.Description, c.OfficialStance, c.FanInterpretation, c.EditorialContext, c.Confidence, c.SourceCitations, c.Tags,
		)
		if err != nil {
			log.Fatalf("Inserting conflict %s: %v", c.Slug, err)
		}
	}
	log.Printf("Seeded %d continuity conflicts", len(conflicts))

	// 7. Seed Story Arcs
	arcs, err := loadJSON[StoryArc](filepath.Join(dataDir, "story_arcs.json"))
	if err != nil {
		log.Printf("WARNING: Loading story arcs: %v (skipping)", err)
	} else {
		for _, arc := range arcs {
			eraID := eraIDs[arc.EraSlug]
			_, err := pool.Exec(ctx,
				`INSERT INTO story_arcs (slug, name, issues, era_id, importance, synopsis, tags)
				 VALUES ($1, $2, $3, $4, $5::importance_level, $6, $7)
				 ON CONFLICT (slug) DO NOTHING`,
				arc.Slug, arc.Name, arc.Issues, eraID, arc.Importance, arc.Synopsis, arc.Tags,
			)
			if err != nil {
				log.Printf("WARNING: Failed to insert arc %s: %v", arc.Slug, err)
			}
		}
		log.Printf("Seeded %d story arcs", len(arcs))
	}

	// 8. Seed Events
	events, err := loadJSON[Event](filepath.Join(dataDir, "events.json"))
	if err != nil {
		log.Printf("WARNING: Loading events: %v (skipping)", err)
	} else {
		for _, ev := range events {
			eraID := eraIDs[ev.EraSlug]
			_, err := pool.Exec(ctx,
				`INSERT INTO events (slug, name, year, core_issues, importance, synopsis, impact, prerequisites, consequences, era_id, tags)
				 VALUES ($1, $2, $3, $4, $5::importance_level, $6, $7, $8, $9, $10, $11)
				 ON CONFLICT (slug) DO NOTHING`,
				ev.Slug, ev.Name, ev.Year, ev.CoreIssues, ev.Importance, ev.Synopsis, ev.Impact, ev.Prerequisites, ev.Consequences, eraID, ev.Tags,
			)
			if err != nil {
				log.Printf("WARNING: Failed to insert event %s: %v", ev.Slug, err)
			}
		}
		log.Printf("Seeded %d events", len(events))
	}

	// 9. Seed Reading Paths
	paths, err := loadJSON[ReadingPath](filepath.Join(dataDir, "reading_paths.json"))
	if err != nil {
		log.Fatalf("Loading reading paths: %v", err)
	}
	for _, p := range paths {
		var pathID string
		err := pool.QueryRow(ctx,
			`INSERT INTO reading_paths (slug, name, path_type, difficulty, description, estimated_issues)
			 VALUES ($1, $2, $3::path_type, $4::difficulty_level, $5, $6)
			 ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
			 RETURNING id`,
			p.Slug, p.Name, p.PathType, p.Difficulty, p.Description, p.EstimatedIssues,
		).Scan(&pathID)
		if err != nil {
			log.Fatalf("Inserting path %s: %v", p.Slug, err)
		}

		for _, entry := range p.Entries {
			editionID, ok := editionIDs[entry.EditionSlug]
			if !ok {
				log.Printf("  WARNING: Edition '%s' not found for path '%s' position %d", entry.EditionSlug, p.Slug, entry.Position)
				continue
			}
			_, err := pool.Exec(ctx,
				`INSERT INTO reading_path_entries (path_id, edition_id, position, note, is_optional)
				 VALUES ($1, $2, $3, $4, $5)
				 ON CONFLICT (path_id, position) DO NOTHING`,
				pathID, editionID, entry.Position, entry.Note, entry.IsOptional,
			)
			if err != nil {
				log.Printf("  WARNING: Failed to insert path entry: %v", err)
			}
		}
	}
	log.Printf("Seeded %d reading paths", len(paths))

	// 10. Seed Retailers
	retailers, err := loadJSON[Retailer](filepath.Join(dataDir, "retailers.json"))
	if err != nil {
		log.Fatalf("Loading retailers: %v", err)
	}
	for _, r := range retailers {
		_, err := pool.Exec(ctx,
			`INSERT INTO retailers (slug, name, url, description, notes, is_digital, ships_international)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)
			 ON CONFLICT (slug) DO NOTHING`,
			r.Slug, r.Name, r.URL, r.Description, r.Notes, r.IsDigital, r.ShipsInternational,
		)
		if err != nil {
			log.Fatalf("Inserting retailer %s: %v", r.Slug, err)
		}
	}
	log.Printf("Seeded %d retailers", len(retailers))

	// 11. Seed Resources
	resources, err := loadJSON[Resource](filepath.Join(dataDir, "resources.json"))
	if err != nil {
		log.Fatalf("Loading resources: %v", err)
	}
	for _, r := range resources {
		_, err := pool.Exec(ctx,
			`INSERT INTO resources (name, resource_type, url, description, focus, best_for)
			 VALUES ($1, $2::resource_type, $3, $4, $5, $6)
			 ON CONFLICT DO NOTHING`,
			r.Name, r.ResourceType, r.URL, r.Description, r.Focus, r.BestFor,
		)
		if err != nil {
			log.Printf("WARNING: Failed to insert resource %s: %v", r.Name, err)
		}
	}
	log.Printf("Seeded %d resources", len(resources))

	log.Println("=== Seed complete ===")
}

// slugify converts a name like "Stan Lee" to "stan-lee"
func slugify(name string) string {
	s := strings.ToLower(name)
	s = strings.ReplaceAll(s, " ", "-")
	s = strings.ReplaceAll(s, ".", "")
	s = strings.ReplaceAll(s, "'", "")
	s = strings.ReplaceAll(s, "é", "e")
	// Handle special cases
	switch s {
	case "george-pérez":
		return "george-perez"
	case "jm-dematteis":
		return "j-m-dematteis"
	}
	return s
}

// Ensure pgx is used (avoid import error)
var _ = pgx.ErrNoRows
