# Marvel Cartographer API Documentation

## Overview

The Marvel Cartographer exposes two API layers:

1. **Go Graph Service** -- A standalone microservice (default port `8080`) that handles graph traversal, reading path computation, and recommendation algorithms. It loads all edition nodes and connection edges into an in-memory adjacency list on startup for sub-millisecond graph operations.

2. **Next.js API Proxy** -- A thin proxy route at `/api/graph` in the Next.js web app that forwards requests to the Go service. The frontend uses this proxy to avoid CORS issues in production.

All responses are JSON. All timestamps follow ISO 8601 format.

---

## Base URLs

| Environment | Go Graph Service | Next.js Proxy |
|-------------|-----------------|---------------|
| Local dev   | `http://localhost:8080/api/v1` | `http://localhost:3000/api/graph` |
| Production  | Configured via `GO_GRAPH_SERVICE_URL` env var | Your Vercel deployment URL |

### Using the Next.js Proxy

The proxy accepts GET and POST requests. Pass the Go service path (everything after `/api/v1`) as the `path` query parameter:

```
GET  /api/graph?path=/health
GET  /api/graph?path=/graph/whats-next/ff-omnibus-v1
POST /api/graph?path=/graph/custom-path   (with JSON body)
```

The proxy applies a 10-second timeout to all upstream requests. If the Go service is unreachable, the proxy returns a `503` response:

```json
{
  "error": "Graph service unavailable",
  "details": "..."
}
```

---

## Authentication

The Go Graph Service does not currently require authentication. CORS is configured to allow requests from `http://localhost:3000` and `http://localhost:3001` in development, plus the origin specified by the `CORS_ORIGIN` environment variable.

Allowed methods: `GET`, `POST`, `OPTIONS`
Allowed headers: `Origin`, `Content-Type`, `Accept`, `Authorization`

---

## Endpoints

### GET /api/v1/health

Health check. Returns the current state of the in-memory graph.

**Parameters:** None

**Response:**

```json
{
  "status": "ok",
  "graph": {
    "nodes": 127,
    "edges": 284
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Always `"ok"` if the service is running |
| `graph.nodes` | integer | Number of collected edition nodes loaded in memory |
| `graph.edges` | integer | Number of edition-to-edition connection edges loaded in memory |

**Example:**

```bash
curl http://localhost:8080/api/v1/health
```

---

### GET /api/v1/graph/whats-next/:editionId

Computes recommended next reads after a given edition. Uses BFS traversal with strength/confidence weighting up to 3 levels deep. This is the core "What should I read next?" feature.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `editionId` | string | Yes | UUID or slug of the edition (e.g., `ff-omnibus-v1`) |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `importance` | string | No | Comma-separated importance levels to filter by. Values: `essential`, `recommended`, `supplemental`, `completionist`. Example: `?importance=essential,recommended` |

**Scoring Algorithm:**

Results are scored using: `score = (strength * 10) + confidence - (depth * 20)`

Higher scores appear first. The algorithm follows edges of type `leads_to`, `recommended_after`, and `spin_off` up to 3 hops deep.

**Response:**

```json
{
  "edition_id": "a1b2c3d4-...",
  "results": [
    {
      "edition": {
        "id": "e5f6g7h8-...",
        "slug": "ff-omnibus-v2",
        "title": "Fantastic Four Omnibus Vol. 2",
        "era_id": "...",
        "era_slug": "birth-of-marvel",
        "era_name": "The Birth of Marvel",
        "importance": "essential",
        "print_status": "in_print",
        "issues_collected": "FF #31-60, Annual #2-3",
        "synopsis": "THE essential Silver Age volume...",
        "cover_image_url": "https://..."
      },
      "connection_type": "leads_to",
      "strength": 10,
      "confidence": 100,
      "depth": 1,
      "score": 180
    }
  ],
  "count": 5
}
```

| Field | Type | Description |
|-------|------|-------------|
| `edition_id` | string | The resolved UUID of the queried edition |
| `results` | array | Ordered list of `WhatsNextResult` objects, sorted by score descending |
| `count` | integer | Number of results returned |

**Errors:**

| Status | Response | Cause |
|--------|----------|-------|
| 404 | `{"error": "edition not found"}` | The edition ID/slug does not exist in the graph |

**Examples:**

```bash
# By slug
curl http://localhost:8080/api/v1/graph/whats-next/ff-omnibus-v1

# By UUID
curl http://localhost:8080/api/v1/graph/whats-next/a1b2c3d4-5678-90ab-cdef-1234567890ab

# With importance filter
curl "http://localhost:8080/api/v1/graph/whats-next/ff-omnibus-v1?importance=essential,recommended"

# Via Next.js proxy
curl "http://localhost:3000/api/graph?path=/graph/whats-next/ff-omnibus-v1"
```

---

### GET /api/v1/graph/connections/:editionId

Returns all incoming and outgoing connections for a given edition, along with the edition's own metadata. Useful for rendering the "What's Next" mini-graph on edition detail pages.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `editionId` | string | Yes | UUID or slug of the edition |

**Response:**

```json
{
  "edition": {
    "id": "a1b2c3d4-...",
    "slug": "ff-omnibus-v2",
    "title": "Fantastic Four Omnibus Vol. 2",
    "era_id": "...",
    "era_slug": "birth-of-marvel",
    "era_name": "The Birth of Marvel",
    "importance": "essential",
    "print_status": "in_print",
    "issues_collected": "FF #31-60, Annual #2-3",
    "synopsis": "...",
    "cover_image_url": "https://..."
  },
  "outgoing": [
    {
      "id": "...",
      "source_id": "a1b2c3d4-...",
      "target_id": "b2c3d4e5-...",
      "connection_type": "leads_to",
      "strength": 10,
      "confidence": 100,
      "description": "Direct continuation of the FF storyline",
      "target_title": "Fantastic Four Omnibus Vol. 3"
    }
  ],
  "incoming": [
    {
      "id": "...",
      "source_id": "z9y8x7w6-...",
      "target_id": "a1b2c3d4-...",
      "connection_type": "leads_to",
      "strength": 10,
      "confidence": 100,
      "description": "Continues from Vol. 1",
      "source_title": "Fantastic Four Omnibus Vol. 1"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `edition` | Node | The queried edition's full metadata |
| `outgoing` | array | Edges leading FROM this edition to others. Each includes `target_title`. |
| `incoming` | array | Edges leading TO this edition from others. Each includes `source_title`. |

**Errors:**

| Status | Response | Cause |
|--------|----------|-------|
| 404 | `{"error": "edition not found"}` | The edition ID/slug does not exist in the graph |

**Example:**

```bash
curl http://localhost:8080/api/v1/graph/connections/infinity-gauntlet-omnibus
```

---

### GET /api/v1/graph/timeline

Returns the full timeline dataset for the D3/Cytoscape visualization. Editions are grouped by era slug. All edition-to-edition connections are included.

**Parameters:** None

**Response:**

```json
{
  "eras": {
    "birth-of-marvel": [
      {
        "id": "a1b2c3d4-...",
        "slug": "ff-omnibus-v1",
        "title": "Fantastic Four Omnibus Vol. 1",
        "era_id": "...",
        "era_slug": "birth-of-marvel",
        "era_name": "The Birth of Marvel",
        "importance": "essential",
        "print_status": "in_print",
        "issues_collected": "FF #1-30, Annual #1",
        "synopsis": "...",
        "cover_image_url": "https://..."
      }
    ],
    "the-expansion": [ ... ],
    "bronze-age": [ ... ]
  },
  "connections": [
    {
      "id": "...",
      "source_id": "a1b2c3d4-...",
      "target_id": "b2c3d4e5-...",
      "connection_type": "leads_to",
      "strength": 10,
      "confidence": 100,
      "description": "..."
    }
  ],
  "total_nodes": 127,
  "total_edges": 284
}
```

| Field | Type | Description |
|-------|------|-------------|
| `eras` | object | Map of era slug to array of Node objects belonging to that era |
| `connections` | array | All edition-to-edition Edge objects in the graph |
| `total_nodes` | integer | Total number of edition nodes |
| `total_edges` | integer | Total number of connection edges |

**Example:**

```bash
curl http://localhost:8080/api/v1/graph/timeline
```

---

### GET /api/v1/graph/path/:pathId

Returns a curated reading path with all its entries resolved to full edition metadata. Entries are ordered by position. Reading paths are stored in the database (not computed by the graph engine).

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pathId` | string | Yes | UUID or slug of the reading path (e.g., `absolute-essentials`) |

**Response:**

```json
{
  "id": "p1q2r3s4-...",
  "slug": "absolute-essentials",
  "name": "The Absolute Essentials",
  "path_type": "curated",
  "difficulty": "beginner",
  "description": "The minimum number of books to understand the Marvel Universe...",
  "entries": [
    {
      "position": 1,
      "edition": {
        "id": "a1b2c3d4-...",
        "slug": "ff-omnibus-v1",
        "title": "Fantastic Four Omnibus Vol. 1",
        "importance": "essential",
        "print_status": "in_print",
        "issues_collected": "FF #1-30, Annual #1",
        "synopsis": "Origin of the Marvel Universe...",
        "cover_image_url": "https://..."
      },
      "note": "",
      "is_optional": false
    },
    {
      "position": 2,
      "edition": { ... },
      "note": "Galactus Trilogy - most important cosmic event",
      "is_optional": false
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID of the reading path |
| `slug` | string | URL-friendly identifier |
| `name` | string | Display name of the path |
| `path_type` | string | One of: `character`, `team`, `event`, `creator`, `thematic`, `curated`, `complete` |
| `difficulty` | string | One of: `beginner`, `intermediate`, `advanced`, `completionist` |
| `description` | string | What this path covers and who it is for |
| `entries` | array | Ordered list of `PathEntry` objects |

Each `PathEntry`:

| Field | Type | Description |
|-------|------|-------------|
| `position` | integer | 1-indexed order in the path |
| `edition` | Node | Full edition metadata |
| `note` | string | Why this edition is in the path at this position |
| `is_optional` | boolean | Whether this entry can be skipped |

**Errors:**

| Status | Response | Cause |
|--------|----------|-------|
| 404 | `{"error": "reading path not found"}` | The path ID/slug does not exist |
| 500 | `{"error": "failed to fetch path entries"}` | Database query failure |

**Example:**

```bash
curl http://localhost:8080/api/v1/graph/path/absolute-essentials
curl http://localhost:8080/api/v1/graph/path/doctor-doom-arc
curl http://localhost:8080/api/v1/graph/path/cosmic-marvel
```

---

### GET /api/v1/graph/shortest-path

Finds the shortest reading path between two editions using Dijkstra's algorithm. Edge weight is computed as `10 - strength` (so stronger connections have lower weight / shorter distance).

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string | Yes | UUID or slug of the starting edition |
| `to` | string | Yes | UUID or slug of the target edition |

**Response (path found):**

```json
{
  "nodes": [
    {
      "id": "a1b2c3d4-...",
      "slug": "ff-omnibus-v1",
      "title": "Fantastic Four Omnibus Vol. 1",
      "era_id": "...",
      "era_slug": "birth-of-marvel",
      "era_name": "The Birth of Marvel",
      "importance": "essential",
      "print_status": "in_print",
      "issues_collected": "FF #1-30, Annual #1",
      "synopsis": "...",
      "cover_image_url": "https://..."
    },
    {
      "id": "b2c3d4e5-...",
      "slug": "ff-omnibus-v2",
      "title": "Fantastic Four Omnibus Vol. 2",
      ...
    },
    {
      "id": "c3d4e5f6-...",
      "slug": "secret-wars-2015-omnibus",
      "title": "Secret Wars (2015) Omnibus",
      ...
    }
  ],
  "edges": [
    {
      "id": "...",
      "source_id": "a1b2c3d4-...",
      "target_id": "b2c3d4e5-...",
      "connection_type": "leads_to",
      "strength": 10,
      "confidence": 100,
      "description": "..."
    }
  ],
  "hops": 2
}
```

| Field | Type | Description |
|-------|------|-------------|
| `nodes` | array | Ordered list of Node objects from `from` to `to` (inclusive) |
| `edges` | array | The edges connecting each consecutive pair of nodes |
| `hops` | integer | Number of edges in the path (always `len(nodes) - 1`) |

**Errors:**

| Status | Response | Cause |
|--------|----------|-------|
| 400 | `{"error": "from and to query params required"}` | Missing one or both query parameters |
| 404 | `{"error": "no path found"}` | No path exists between the two editions in the graph |
| 500 | `{"error": "..."}` | Internal error during computation |

**Examples:**

```bash
# By slug
curl "http://localhost:8080/api/v1/graph/shortest-path?from=ff-omnibus-v1&to=secret-wars-2015-omnibus"

# By UUID
curl "http://localhost:8080/api/v1/graph/shortest-path?from=a1b2c3d4-...&to=c3d4e5f6-..."

# Via proxy
curl "http://localhost:3000/api/graph?path=/graph/shortest-path%3Ffrom=ff-omnibus-v1%26to=secret-wars-2015-omnibus"
```

---

### POST /api/v1/graph/custom-path

Builds an optimal reading order from a user-selected set of editions. Uses topological sort (Kahn's algorithm) on the sub-graph formed by the selected editions and their mutual connections.

**Request Body:**

```json
{
  "edition_ids": ["ff-omnibus-v1", "ff-omnibus-v2", "infinity-gauntlet-omnibus", "warlock-by-starlin"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `edition_ids` | string[] | Yes | Array of edition UUIDs or slugs. Both can be mixed. |

**Response:**

```json
{
  "path": [
    {
      "id": "a1b2c3d4-...",
      "slug": "ff-omnibus-v1",
      "title": "Fantastic Four Omnibus Vol. 1",
      "era_id": "...",
      "era_slug": "birth-of-marvel",
      "era_name": "The Birth of Marvel",
      "importance": "essential",
      "print_status": "in_print",
      "issues_collected": "FF #1-30, Annual #1",
      "synopsis": "...",
      "cover_image_url": "https://..."
    },
    {
      "id": "b2c3d4e5-...",
      "slug": "ff-omnibus-v2",
      "title": "Fantastic Four Omnibus Vol. 2",
      ...
    },
    {
      "id": "w1x2y3z4-...",
      "slug": "warlock-by-starlin",
      "title": "Warlock by Jim Starlin (Complete Collection)",
      ...
    },
    {
      "id": "i9j8k7l6-...",
      "slug": "infinity-gauntlet-omnibus",
      "title": "Infinity Gauntlet Omnibus",
      ...
    }
  ],
  "count": 4
}
```

| Field | Type | Description |
|-------|------|-------------|
| `path` | array | The editions in computed reading order (topological sort) |
| `count` | integer | Number of editions in the resulting path |

**Errors:**

| Status | Response | Cause |
|--------|----------|-------|
| 400 | `{"error": "edition_ids array required"}` | Missing or malformed request body |

**Example:**

```bash
curl -X POST http://localhost:8080/api/v1/graph/custom-path \
  -H "Content-Type: application/json" \
  -d '{"edition_ids": ["ff-omnibus-v1", "ff-omnibus-v2", "warlock-by-starlin", "infinity-gauntlet-omnibus"]}'
```

---

## Data Model Types

### Node (Collected Edition)

The primary entity in the graph. Represents a collected edition (omnibus, trade paperback, etc.) of Marvel Comics.

```json
{
  "id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "slug": "ff-omnibus-v1",
  "title": "Fantastic Four Omnibus Vol. 1",
  "era_id": "e1e2e3e4-...",
  "era_slug": "birth-of-marvel",
  "era_name": "The Birth of Marvel",
  "importance": "essential",
  "print_status": "in_print",
  "issues_collected": "FF #1-30, Annual #1",
  "synopsis": "Origin of the Marvel Universe...",
  "cover_image_url": "https://..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `slug` | string | URL-friendly unique identifier |
| `title` | string | Full display title |
| `era_id` | UUID | Foreign key to the era this edition belongs to |
| `era_slug` | string | Denormalized era slug for convenience |
| `era_name` | string | Denormalized era display name |
| `importance` | ImportanceLevel | How critical this edition is to understanding Marvel continuity |
| `print_status` | PrintStatus | Current availability |
| `issues_collected` | string | Issue range, e.g., `"FF #1-30, Annual #1"` |
| `synopsis` | string | Story summary with specific issue citations |
| `cover_image_url` | string | Cover image URL (populated by Metron enrichment, may be empty) |

### Edge (Connection)

A directional relationship between two editions in the graph.

```json
{
  "id": "c1c2c3c4-...",
  "source_id": "a1b2c3d4-...",
  "target_id": "b2c3d4e5-...",
  "connection_type": "leads_to",
  "strength": 10,
  "confidence": 100,
  "description": "Direct continuation of the Fantastic Four storyline"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `source_id` | UUID | The edition this connection originates from |
| `target_id` | UUID | The edition this connection points to |
| `connection_type` | ConnectionType | Nature of the relationship |
| `strength` | integer | 1-10 scale of how important the connection is (10 = essential sequel) |
| `confidence` | integer | 0-100 certainty that this connection is correct |
| `description` | string | Human-readable explanation of the connection |

### WhatsNextResult

A recommended next read returned by the What's Next algorithm.

```json
{
  "edition": { ... },
  "connection_type": "leads_to",
  "strength": 10,
  "confidence": 100,
  "depth": 1,
  "score": 180
}
```

| Field | Type | Description |
|-------|------|-------------|
| `edition` | Node | Full edition metadata |
| `connection_type` | ConnectionType | How this edition relates to the queried one |
| `strength` | integer | 1-10 connection strength |
| `confidence` | integer | 0-100 certainty |
| `depth` | integer | Number of hops from the queried edition (1 = direct connection) |
| `score` | integer | Computed relevance score: `(strength * 10) + confidence - (depth * 20)` |

### ReadingPath

A curated or computed reading order.

```json
{
  "id": "p1q2r3s4-...",
  "slug": "absolute-essentials",
  "name": "The Absolute Essentials",
  "path_type": "curated",
  "difficulty": "beginner",
  "description": "The minimum number of books to understand the Marvel Universe...",
  "entries": [ ... ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `slug` | string | URL-friendly identifier |
| `name` | string | Display name |
| `path_type` | PathType | Category of reading path |
| `difficulty` | DifficultyLevel | Target audience |
| `description` | string | What this path covers |
| `entries` | PathEntry[] | Ordered list of editions in the path |

### PathEntry

A single step in a reading path.

| Field | Type | Description |
|-------|------|-------------|
| `position` | integer | 1-indexed order |
| `edition` | Node | Full edition metadata |
| `note` | string | Context for why this edition is at this position |
| `is_optional` | boolean | Whether this entry can be skipped |

---

## Enum Types

### ImportanceLevel

How critical an edition is to understanding Marvel continuity.

| Value | Description |
|-------|-------------|
| `essential` | Must-read. Core to understanding the Marvel Universe. |
| `recommended` | Strong recommendation. Enriches the experience significantly. |
| `supplemental` | Good but not required. Adds depth. |
| `completionist` | For thorough readers only. |

### PrintStatus

Current physical/digital availability.

| Value | Description |
|-------|-------------|
| `in_print` | Currently available from retailers |
| `out_of_print` | No longer manufactured; secondary market only |
| `upcoming` | Announced but not yet released |
| `digital_only` | Available only through digital platforms (Marvel Unlimited, Comixology) |
| `ongoing` | Series is still being published |
| `check_availability` | Status is uncertain; verify with retailers |

### ConnectionType

The nature of a directional relationship between editions.

| Value | Description | Used by What's Next |
|-------|-------------|:-------------------:|
| `leads_to` | Direct sequel or continuation | Yes |
| `recommended_after` | Best reading experience after this | Yes |
| `spin_off` | New series launched from events in this edition | Yes |
| `ties_into` | Crossover connection | No |
| `retcons` | Changes the meaning of a previous story | No |
| `references` | Callback or reference to another story | No |
| `parallel` | Events happening simultaneously in-universe | No |
| `collected_in` | An issue appears in this collected edition | No |
| `prerequisite` | Should be read before the target | No |

Note: The What's Next algorithm only traverses `leads_to`, `recommended_after`, and `spin_off` edges. All other connection types are returned by the `/connections` endpoint but are not followed during BFS traversal.

### PathType

Category of a curated reading path.

| Value | Description |
|-------|-------------|
| `character` | Follows a single character's arc (e.g., Doctor Doom) |
| `team` | Follows a team's history (e.g., Fantastic Four) |
| `event` | Covers a crossover event and its tie-ins |
| `creator` | Follows a creator's body of work |
| `thematic` | Follows a theme across titles (e.g., Cosmic Marvel) |
| `curated` | Editorially curated general path (e.g., Absolute Essentials) |
| `complete` | Comprehensive coverage of a subject |

### DifficultyLevel

Target audience for a reading path.

| Value | Description |
|-------|-------------|
| `beginner` | New readers, minimal commitment |
| `intermediate` | Some Marvel knowledge assumed |
| `advanced` | Deep dives, many volumes |
| `completionist` | Everything, leaving nothing out |

### InterpretationType

Used in the `connections` table and continuity conflicts to indicate the source of an interpretation.

| Value | Description |
|-------|-------------|
| `official` | Marvel's stated editorial position |
| `fan_accepted` | Community consensus among readers |
| `editorial_retcon` | Behind-the-scenes context explaining editorial decisions |

---

## Supabase Direct Access

The Next.js frontend also queries Supabase directly (via `@supabase/supabase-js`) for standard CRUD operations that do not require graph computation:

| Operation | Table | Notes |
|-----------|-------|-------|
| List eras | `eras` | Ordered by `number` |
| Search editions | `collected_editions` | Uses `search_text` tsvector via `search_editions()` function |
| Get edition detail | `collected_editions` | Join with `eras`, `edition_creators`, `creators` |
| List editions by era | `collected_editions` | Via `get_era_editions()` function |
| List events | `events` | Ordered by `year` |
| List continuity conflicts | `continuity_conflicts` | All three interpretations included |
| List retailers | `retailers` | Sorted by name |
| List resources | `resources` | YouTube, podcasts, websites |
| User collections | `user_collections` | Requires Supabase auth |

### Key Database Functions

**`search_editions(query TEXT, limit_count INTEGER DEFAULT 20)`**

Full-text search across edition titles, issue ranges, synopses, and connection notes.

```sql
SELECT * FROM search_editions('Galactus', 10);
```

**`get_whats_next(edition_uuid UUID, max_depth INTEGER DEFAULT 3)`**

SQL-based alternative to the Go graph engine's What's Next computation. Uses recursive CTEs. The Go service is preferred for performance.

**`get_era_editions(era_slug_param TEXT)`**

Returns all editions for an era with creator names and connected edition metadata.

```sql
SELECT * FROM get_era_editions('birth-of-marvel');
```

---

## Error Handling

All error responses follow this format:

```json
{
  "error": "Human-readable error message"
}
```

Standard HTTP status codes:

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (missing required parameters) |
| 404 | Resource not found |
| 500 | Internal server error |
| 503 | Graph service unavailable (returned by Next.js proxy) |

---

## Slug Resolution

All endpoints that accept an edition ID also accept an edition slug. The Go service first attempts to look up the value as a slug; if a matching node is found, it resolves to the node's UUID before processing. This means the following calls are equivalent:

```bash
curl http://localhost:8080/api/v1/graph/whats-next/ff-omnibus-v1
curl http://localhost:8080/api/v1/graph/whats-next/a1b2c3d4-5678-90ab-cdef-1234567890ab
```

The same applies to the `from` and `to` parameters on `/shortest-path` and the `edition_ids` array in the `/custom-path` request body.

Reading path endpoints (`/path/:pathId`) accept either the path UUID or slug, resolved at the database level.

---

## Rate Limiting

The Go service does not enforce rate limiting. In production, apply rate limiting at the reverse proxy or load balancer level.

The Metron enrichment service (internal, not exposed via API) self-limits to approximately 1 request every 5 seconds to respect Metron's community server resources.
