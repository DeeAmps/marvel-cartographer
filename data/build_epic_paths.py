#!/usr/bin/env python3
"""Add new reading paths featuring Epic Collections as budget alternatives."""
import json

with open("archive/reading_paths.json", "r") as f:
    paths = json.load(f)

with open("archive/collected_editions.json", "r") as f:
    editions = json.load(f)

slug_set = {e["slug"] for e in editions}
existing_path_slugs = {p["slug"] for p in paths}

new_paths = []

def make_path(slug, name, path_type, difficulty, description, entries):
    if slug in existing_path_slugs:
        print(f"  SKIP: {slug} already exists")
        return
    # Validate all edition slugs exist
    valid_entries = []
    for e in entries:
        if e["edition_slug"] in slug_set:
            valid_entries.append(e)
        else:
            print(f"  WARN: {e['edition_slug']} not found, skipping from {slug}")
    new_paths.append({
        "slug": slug,
        "name": name,
        "path_type": path_type,
        "difficulty": difficulty,
        "description": description,
        "entries": valid_entries
    })

# ============================================================
# Budget-friendly paths using Epic Collections
# ============================================================

make_path("budget-essentials-epic", "Budget Marvel Essentials (Epic Collections)",
    "curated", "beginner",
    "The same essential Marvel stories as the Absolute Essentials path, but using affordable Epic Collections instead of omnibuses. ~$40 per volume vs $100+ for omnibuses.",
    [
        {"position": 1, "edition_slug": "asm-epic-great-power", "note": "Spider-Man's origin (Epic alternative to ASM Omnibus Vol. 1)"},
        {"position": 2, "edition_slug": "asm-epic-great-responsibility", "note": "Lee/Ditko conclusion"},
        {"position": 3, "edition_slug": "ff-epic-worlds-greatest", "note": "FF origins (Epic alternative to FF Omnibus Vol. 1)"},
        {"position": 4, "edition_slug": "ff-epic-coming-of-galactus", "note": "Galactus Trilogy (Epic alternative to FF Omnibus Vol. 2)"},
        {"position": 5, "edition_slug": "avengers-epic-earths-mightiest", "note": "Avengers founding"},
        {"position": 6, "edition_slug": "avengers-epic-v5-beachhead-earth", "note": "Kree-Skrull War"},
        {"position": 7, "edition_slug": "warlock-by-starlin", "note": "Essential cosmic Marvel (Complete Collection)"},
        {"position": 8, "edition_slug": "uxm-claremont-omnibus-v1", "note": "No Epic alternative covers this scope — get the omnibus"},
        {"position": 9, "edition_slug": "asm-epic-v17-kravens-last-hunt", "note": "One of the greatest Spider-Man stories"},
        {"position": 10, "edition_slug": "asm-epic-v18-venom", "note": "Venom's debut arc"},
        {"position": 11, "edition_slug": "infinity-gauntlet-omnibus", "note": "Essential cosmic event"},
        {"position": 12, "edition_slug": "nxm-epic-e-is-extinction", "note": "Morrison reinvents X-Men"},
        {"position": 13, "edition_slug": "cap-modern-epic-winter-soldier", "note": "Brubaker reinvents Cap"},
        {"position": 14, "edition_slug": "new-avengers-epic-v1-assembled", "note": "Bendis era begins"},
        {"position": 15, "edition_slug": "annihilation-epic", "note": "Cosmic renaissance"},
        {"position": 16, "edition_slug": "house-of-x-powers-of-x", "note": "Hickman X-Men (TPB)"},
    ]
)

make_path("complete-spider-man-epic", "Complete Spider-Man (Epic Collections)",
    "character", "advanced",
    "Follow Spider-Man from origin through the 90s using affordable Epic Collections. 28 volumes covering ASM #1-399.",
    [{"position": i+1, "edition_slug": slug}
     for i, slug in enumerate([
        "asm-epic-great-power", "asm-epic-great-responsibility",
        "asm-epic-v3-spider-man-no-more", "asm-epic-v4-goblin-lives",
        "asm-epic-v5-petrified-tablet", "asm-epic-v6-death-captain-stacy",
        "asm-epic-v7-goblins-last-stand", "asm-epic-v8-man-wolf",
        "asm-epic-v9-spider-clone", "asm-epic-v10-big-apple",
        "asm-epic-v11-black-cat", "asm-epic-v15-ghosts-of-past",
        "asm-epic-v17-kravens-last-hunt", "asm-epic-v18-venom",
        "asm-epic-v19-assassin-nation", "asm-epic-v20-cosmic-adventures",
        "asm-epic-v21-sinister-six", "asm-epic-v22-round-robin",
        "asm-epic-v23-hero-killers", "asm-epic-v24-spider-slayers",
        "asm-epic-v25-maximum-carnage", "asm-epic-v26-lifetheft",
        "asm-epic-v27-clone-saga", "asm-epic-v28-web-of-life",
     ])]
)

make_path("complete-avengers-epic", "Complete Avengers (Epic Collections)",
    "team", "advanced",
    "The complete Avengers from #1 through the 90s using Epic Collections. Kree-Skrull War, Korvac Saga, Under Siege, and more.",
    [{"position": i+1, "edition_slug": slug}
     for i, slug in enumerate([
        "avengers-epic-earths-mightiest", "avengers-epic-v2-once-an-avenger",
        "avengers-epic-v3-masters-of-evil", "avengers-epic-v5-beachhead-earth",
        "avengers-epic-v6-traitor-stalks", "avengers-epic-v8-kang-war",
        "avengers-epic-v9-final-threat", "avengers-epic-v10-yesterday-quest",
        "avengers-epic-v11-evil-reborn", "avengers-epic-v13-seasons-witch",
        "avengers-under-siege", "avengers-epic-v17-judgment-day",
        "avengers-epic-v18-heavy-metal", "avengers-epic-v19-acts-vengeance",
        "avengers-epic-v20-crossing-line", "avengers-epic-v21-collection-obsession",
        "avengers-epic-v22-galactic-storm", "avengers-epic-v23-fear-reaper",
        "avengers-epic-v25-gathering", "avengers-epic-v26-taking-aim",
     ])]
)

make_path("complete-ff-epic", "Complete Fantastic Four (Epic Collections)",
    "team", "completionist",
    "The complete FF from #1 through Heroes Reborn using Epic Collections. All 25+ volumes of the First Family.",
    [{"position": i+1, "edition_slug": slug}
     for i, slug in enumerate([
        "ff-epic-worlds-greatest", "ff-epic-coming-of-galactus",
        "ff-epic-v4-the-mystery-of-the-black-panther", "ff-epic-v5-the-name-is-doom",
        "ff-epic-v6-at-war-with-atlantis", "ff-epic-v7-battle-of-the-behemoths",
        "ff-epic-v8-annihilus-revealed", "ff-epic-v9-the-crusader-syndrome",
        "ff-epic-v10-counter-earth-must-die", "ff-epic-v11-four-no-more",
        "ff-epic-v17-all-in-the-family", "ff-epic-v18-the-more-things-change",
        "ff-epic-v19-the-dream-is-dead", "ff-epic-v20-into-the-time-stream",
        "ff-epic-v21-the-new-fantastic-four", "ff-epic-v22-this-flame-this-fury",
        "ff-epic-v23-nobody-gets-out-alive", "ff-epic-v24-atlantis-rising",
        "ff-epic-v25-strange-days",
     ])]
)

make_path("complete-thor-epic", "Complete Thor (Epic Collections)",
    "character", "completionist",
    "Thor from Journey into Mystery through the 90s using Epic Collections. Asgardian saga across 24 volumes.",
    [{"position": i+1, "edition_slug": slug}
     for i, slug in enumerate([
        "thor-epic-god-of-thunder", "thor-epic-v2-when-titans-clash",
        "thor-epic-v3-the-wrath-of-odin", "thor-epic-v4-to-wake-the-mangog",
        "thor-epic-v5-the-fall-of-asgard", "thor-epic-v6-into-the-dark-nebula",
        "thor-epic-v7-ulik-unchained", "thor-epic-v8-war-of-the-gods",
        "thor-epic-v9-even-an-immortal-can-die", "thor-epic-v10-the-eternals-saga",
        "thor-epic-v11-a-kingdom-lost", "thor-epic-v12-runequest",
        "thor-epic-v16-war-of-the-pantheons", "thor-epic-v17-in-mortal-flesh",
        "thor-epic-v18-the-black-galaxy", "thor-epic-v19-the-thor-war",
        "thor-epic-v20-the-final-gauntlet", "thor-epic-v21-blood-and-thunder",
        "thor-epic-v22-hel-on-earth", "thor-epic-v23-worldengine",
        "thor-epic-v24-the-lost-gods",
     ])]
)

make_path("premier-starter-pack", "Marvel Premier Collection Starter Pack",
    "curated", "beginner",
    "All 11 Marvel Premier Collection pocket-sized paperbacks. The cheapest way to read Marvel's best stories at $14.99 each. Perfect for new readers or commuters.",
    [
        {"position": 1, "edition_slug": "premier-dd-born-again", "note": "The greatest Daredevil story"},
        {"position": 2, "edition_slug": "premier-cap-winter-soldier", "note": "Brubaker reinvents Cap"},
        {"position": 3, "edition_slug": "premier-ff-solve-everything", "note": "Hickman's FF masterwork"},
        {"position": 4, "edition_slug": "premier-civil-war", "note": "The event that split Marvel"},
        {"position": 5, "edition_slug": "premier-planet-hulk", "note": "Hulk as gladiator king"},
        {"position": 6, "edition_slug": "premier-old-man-logan", "note": "Alternate future classic"},
        {"position": 7, "edition_slug": "premier-hawkeye", "note": "Fraction/Aja Eisner winner"},
        {"position": 8, "edition_slug": "premier-vision", "note": "Suburban horror masterpiece"},
        {"position": 9, "edition_slug": "premier-bp-nation", "note": "Coates's literary Black Panther"},
        {"position": 10, "edition_slug": "premier-punisher-welcome-back", "note": "Ennis redefines Punisher"},
        {"position": 11, "edition_slug": "premier-spider-men", "note": "Peter meets Miles"},
    ]
)

make_path("cosmic-marvel-epic", "Cosmic Marvel Thread (Epic Collections)",
    "thematic", "intermediate",
    "Follow the cosmic Marvel story from Galactus to Guardians using Epic Collections.",
    [
        {"position": 1, "edition_slug": "ss-epic-v1-when-galactus-calls", "note": "Galactus Trilogy + early Surfer"},
        {"position": 2, "edition_slug": "warlock-by-starlin", "note": "Warlock vs Magus, Thanos rises"},
        {"position": 3, "edition_slug": "ss-epic-v5-return-of-thanos", "note": "Thanos returns"},
        {"position": 4, "edition_slug": "ss-epic-v6-thanos-quest", "note": "Thanos collects the Infinity Gems"},
        {"position": 5, "edition_slug": "infinity-gauntlet-omnibus", "note": "The snap"},
        {"position": 6, "edition_slug": "annihilation-epic", "note": "Cosmic renaissance"},
        {"position": 7, "edition_slug": "gotg-modern-epic-v1", "note": "Guardians form"},
        {"position": 8, "edition_slug": "gotg-modern-epic-v2", "note": "War of Kings"},
    ]
)

make_path("new-mutants-to-x-force", "New Mutants to X-Force Complete",
    "team", "intermediate",
    "Follow the New Mutants from Xavier's school through their transformation into Cable's X-Force.",
    [{"position": i+1, "edition_slug": slug}
     for i, slug in enumerate([
        "new-mutants-epic-v1-renewal", "new-mutants-epic-v2-the-demon-bear-saga",
        "new-mutants-epic-v3-asgardian-wars", "new-mutants-epic-v4-fallen-angels",
        "new-mutants-epic-v5-sudden-death", "new-mutants-epic-v6-curse-of-the-valkyries",
        "new-mutants-epic-v7-cable", "new-mutants-epic-v8-the-end-of-the-beginning",
        "x-force-epic-v1-under-the-gun", "x-force-epic-v2-x-cutioners-song",
        "x-force-epic-v3-assault-on-graymalkin", "x-force-epic-v4-toy-soldiers",
     ])]
)

# Merge
merged = paths + new_paths
print(f"Existing paths: {len(paths)}")
print(f"New paths: {len(new_paths)}")
print(f"Total paths: {len(merged)}")

with open("archive/reading_paths.json", "w") as f:
    json.dump(merged, f, indent=4)

print(f"Successfully wrote {len(merged)} paths to archive/reading_paths.json")
