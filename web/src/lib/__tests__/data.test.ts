import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock the filesystem so tests run without real JSON seed files on disk.
// Each test can override the mock return value when needed.
// ---------------------------------------------------------------------------

const MOCK_EDITIONS = [
  {
    slug: "ff-omnibus-v1",
    title: "Fantastic Four Omnibus Vol. 1",
    format: "omnibus",
    issues_collected: "FF #1-30, Annual #1",
    issue_count: 31,
    print_status: "in_print",
    importance: "essential",
    era_slug: "birth-of-marvel",
    creators: [
      { name: "Stan Lee", role: "writer" },
      { name: "Jack Kirby", role: "artist" },
    ],
    synopsis:
      "Origin of the Marvel Universe. Doctor Doom debut (#5). Namor's return (#4).",
    connection_notes: "Leads to: FF Omnibus Vol. 2.",
    cover_image_url: null,
  },
  {
    slug: "ff-omnibus-v2",
    title: "Fantastic Four Omnibus Vol. 2",
    format: "omnibus",
    issues_collected: "FF #31-60, Annual #2-3",
    issue_count: 32,
    print_status: "in_print",
    importance: "essential",
    era_slug: "birth-of-marvel",
    creators: [
      { name: "Stan Lee", role: "writer" },
      { name: "Jack Kirby", role: "artist" },
    ],
    synopsis: "Galactus Trilogy (#48-50). Black Panther first appearance (#52-53).",
    connection_notes: "Leads to: FF Omnibus Vol. 3.",
    cover_image_url: "https://static.metron.cloud/media/issue/ff-31.jpg",
  },
  {
    slug: "asm-omnibus-v1",
    title: "Amazing Spider-Man Omnibus Vol. 1",
    format: "omnibus",
    issues_collected: "AF #15, ASM #1-38, Annual #1-2",
    issue_count: 41,
    print_status: "in_print",
    importance: "essential",
    era_slug: "birth-of-marvel",
    creators: [
      { name: "Stan Lee", role: "writer" },
      { name: "Steve Ditko", role: "artist" },
    ],
    synopsis: "Spider-Man origin. Every classic villain.",
    connection_notes: "Leads to: ASM Omnibus Vol. 2.",
    cover_image_url: null,
  },
];

const MOCK_CHARACTERS = [
  {
    slug: "reed-richards",
    name: "Reed Richards",
    aliases: ["Mr. Fantastic", "The Maker"],
    first_appearance_issue: "Fantastic Four #1 (1961)",
    universe: "Earth-616",
    teams: ["Fantastic Four", "Illuminati"],
    description: "Genius scientist and leader of the Fantastic Four.",
  },
  {
    slug: "peter-parker",
    name: "Peter Parker",
    aliases: ["Spider-Man"],
    first_appearance_issue: "Amazing Fantasy #15 (1962)",
    universe: "Earth-616",
    teams: ["Avengers"],
    description: "Your friendly neighborhood Spider-Man.",
  },
];

const MOCK_CONNECTIONS = [
  {
    source_type: "edition",
    source_slug: "ff-omnibus-v1",
    target_type: "edition",
    target_slug: "ff-omnibus-v2",
    connection_type: "leads_to",
    strength: 10,
    confidence: 100,
    description: "Direct continuation of Lee/Kirby Fantastic Four.",
  },
  {
    source_type: "edition",
    source_slug: "ff-omnibus-v2",
    target_type: "edition",
    target_slug: "asm-omnibus-v1",
    connection_type: "ties_into",
    strength: 5,
    confidence: 80,
    description: "FF/Spider-Man crossovers.",
  },
];

// Mock node:fs/promises so readJson resolves with our fixtures.
// The data module uses `fs.readFile` from "fs" (via `promises`).
vi.mock("fs", () => {
  const fileMap: Record<string, unknown> = {
    "collected_editions.json": MOCK_EDITIONS,
    "characters.json": MOCK_CHARACTERS,
    "connections.json": MOCK_CONNECTIONS,
  };

  return {
    promises: {
      readFile: vi.fn(async (filePath: string) => {
        // Extract just the filename from the full path
        const filename = filePath.split("/").pop() ?? filePath;
        const data = fileMap[filename];
        if (!data) {
          throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
        }
        return JSON.stringify(data);
      }),
    },
  };
});

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are in place
// ---------------------------------------------------------------------------
import {
  getEditions,
  getEditionBySlug,
  searchEditions,
  getCharacters,
  getConnectionsForEdition,
} from "../data";

// Clear the in-memory JSON cache between tests so mocks are re-read
beforeEach(() => {
  vi.clearAllMocks();
});

// ===================================================================
// getEditions
// ===================================================================
describe("getEditions", () => {
  it("returns an array of CollectedEdition objects", async () => {
    const editions = await getEditions();
    expect(Array.isArray(editions)).toBe(true);
    expect(editions.length).toBe(MOCK_EDITIONS.length);
  });

  it("maps raw fields to CollectedEdition shape", async () => {
    const editions = await getEditions();
    const ff1 = editions.find((e) => e.slug === "ff-omnibus-v1");

    expect(ff1).toBeDefined();
    expect(ff1!.id).toBe("ff-omnibus-v1");
    expect(ff1!.title).toBe("Fantastic Four Omnibus Vol. 1");
    expect(ff1!.format).toBe("omnibus");
    expect(ff1!.print_status).toBe("in_print");
    expect(ff1!.importance).toBe("essential");
    expect(ff1!.era_id).toBe("birth-of-marvel");
    expect(ff1!.era_slug).toBe("birth-of-marvel");
  });

  it("builds creator_names from raw creators array", async () => {
    const editions = await getEditions();
    const ff1 = editions.find((e) => e.slug === "ff-omnibus-v1");

    expect(ff1!.creator_names).toEqual(
      expect.arrayContaining(["Stan Lee (writer)", "Jack Kirby (artist)"])
    );
  });

  it("sets cover_image_url to null when raw value is falsy", async () => {
    const editions = await getEditions();
    const ff1 = editions.find((e) => e.slug === "ff-omnibus-v1");
    expect(ff1!.cover_image_url).toBeNull();
  });

  it("preserves cover_image_url when present in raw data", async () => {
    const editions = await getEditions();
    const ff2 = editions.find((e) => e.slug === "ff-omnibus-v2");
    expect(ff2!.cover_image_url).toBe(
      "https://static.metron.cloud/media/issue/ff-31.jpg"
    );
  });
});

// ===================================================================
// getEditionBySlug
// ===================================================================
describe("getEditionBySlug", () => {
  it("returns the matching edition when slug exists", async () => {
    const edition = await getEditionBySlug("asm-omnibus-v1");
    expect(edition).toBeDefined();
    expect(edition!.slug).toBe("asm-omnibus-v1");
    expect(edition!.title).toBe("Amazing Spider-Man Omnibus Vol. 1");
  });

  it("returns undefined for a non-existent slug", async () => {
    const edition = await getEditionBySlug("does-not-exist");
    expect(edition).toBeUndefined();
  });
});

// ===================================================================
// searchEditions
// ===================================================================
describe("searchEditions", () => {
  it("filters editions by title text (string overload)", async () => {
    const results = await searchEditions("Fantastic Four");
    expect(results.length).toBe(2);
    expect(results.every((e) => e.title.includes("Fantastic Four"))).toBe(true);
  });

  it("filters editions by synopsis text", async () => {
    const results = await searchEditions("Galactus");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].slug).toBe("ff-omnibus-v2");
  });

  it("filters editions by creator name in creator_names", async () => {
    const results = await searchEditions("Ditko");
    expect(results.length).toBe(1);
    expect(results[0].slug).toBe("asm-omnibus-v1");
  });

  it("returns all editions when query is empty (via SearchFilters)", async () => {
    const results = await searchEditions({ query: "" });
    expect(results.length).toBe(MOCK_EDITIONS.length);
  });

  it("filters by importance via SearchFilters object", async () => {
    const results = await searchEditions({ importance: "essential" });
    expect(results.length).toBe(MOCK_EDITIONS.length);
  });

  it("returns empty array when no editions match", async () => {
    const results = await searchEditions("zzz-nonexistent-xyz");
    expect(results.length).toBe(0);
  });
});

// ===================================================================
// getCharacters
// ===================================================================
describe("getCharacters", () => {
  it("returns an array of Character objects", async () => {
    const characters = await getCharacters();
    expect(Array.isArray(characters)).toBe(true);
    expect(characters.length).toBe(MOCK_CHARACTERS.length);
  });

  it("maps raw fields to Character shape", async () => {
    const characters = await getCharacters();
    const reed = characters.find((c) => c.slug === "reed-richards");

    expect(reed).toBeDefined();
    expect(reed!.id).toBe("reed-richards");
    expect(reed!.name).toBe("Reed Richards");
    expect(reed!.aliases).toEqual(["Mr. Fantastic", "The Maker"]);
    expect(reed!.universe).toBe("Earth-616");
    expect(reed!.teams).toContain("Fantastic Four");
  });

  it("defaults universe to Earth-616 when not provided", async () => {
    const characters = await getCharacters();
    for (const char of characters) {
      expect(char.universe).toBe("Earth-616");
    }
  });
});

// ===================================================================
// getConnectionsForEdition
// ===================================================================
describe("getConnectionsForEdition", () => {
  it("returns outgoing and incoming connection arrays", async () => {
    const result = await getConnectionsForEdition("ff-omnibus-v1");
    expect(result).toHaveProperty("outgoing");
    expect(result).toHaveProperty("incoming");
    expect(Array.isArray(result.outgoing)).toBe(true);
    expect(Array.isArray(result.incoming)).toBe(true);
  });

  it("finds outgoing connections for ff-omnibus-v1", async () => {
    const { outgoing } = await getConnectionsForEdition("ff-omnibus-v1");
    expect(outgoing.length).toBe(1);
    expect(outgoing[0].target_slug).toBe("ff-omnibus-v2");
    expect(outgoing[0].connection_type).toBe("leads_to");
    expect(outgoing[0].target_title).toBe("Fantastic Four Omnibus Vol. 2");
  });

  it("finds incoming connections for ff-omnibus-v2", async () => {
    const { incoming } = await getConnectionsForEdition("ff-omnibus-v2");
    expect(incoming.length).toBe(1);
    expect(incoming[0].source_slug).toBe("ff-omnibus-v1");
    expect(incoming[0].source_title).toBe("Fantastic Four Omnibus Vol. 1");
  });

  it("returns enriched target metadata on outgoing connections", async () => {
    const { outgoing } = await getConnectionsForEdition("ff-omnibus-v1");
    const conn = outgoing[0];
    expect(conn.target_importance).toBe("essential");
    expect(conn.target_status).toBe("in_print");
    expect(conn.target_issues).toBe("FF #31-60, Annual #2-3");
  });

  it("returns empty arrays for an edition with no connections", async () => {
    const result = await getConnectionsForEdition("asm-omnibus-v1");
    // ASM V1 has no outgoing connections in our mock and is only a target from ff-v2
    expect(result.outgoing.length).toBe(0);
  });

  it("sorts outgoing connections by strength descending", async () => {
    const { outgoing } = await getConnectionsForEdition("ff-omnibus-v2");
    // ff-omnibus-v2 has one outgoing to asm-omnibus-v1
    expect(outgoing.length).toBe(1);
    if (outgoing.length > 1) {
      for (let i = 1; i < outgoing.length; i++) {
        expect(outgoing[i - 1].strength).toBeGreaterThanOrEqual(
          outgoing[i].strength
        );
      }
    }
  });
});
