#!/usr/bin/env python3
"""Generate new Epic Collection and Premier Collection entries."""
import json

editions = []

def make_epic(slug, title, issues, count, era, writer, artist, synopsis, notes, importance="recommended", price=39.99):
    editions.append({
        "slug": slug,
        "title": title,
        "format": "epic_collection",
        "issues_collected": issues,
        "issue_count": count,
        "print_status": "in_print",
        "importance": importance,
        "era_slug": era,
        "creators": [{"name": writer, "role": "writer"}, {"name": artist, "role": "artist"}],
        "synopsis": synopsis,
        "connection_notes": notes,
        "cover_image_url": None,
        "isbn": None,
        "page_count": None,
        "cover_price": price
    })

def make_premier(slug, title, issues, count, era, writer, artist, synopsis, notes, importance, isbn=None):
    editions.append({
        "slug": slug,
        "title": title,
        "format": "premier_collection",
        "issues_collected": issues,
        "issue_count": count,
        "print_status": "in_print",
        "importance": importance,
        "era_slug": era,
        "creators": [{"name": writer, "role": "writer"}, {"name": artist, "role": "artist"}],
        "synopsis": synopsis,
        "connection_notes": notes,
        "cover_image_url": None,
        "isbn": isbn,
        "page_count": None,
        "cover_price": 14.99
    })

# ============================================================
# AMAZING SPIDER-MAN EPIC COLLECTIONS (vol 3-28)
# ============================================================
make_epic("asm-epic-v3-spider-man-no-more", "Amazing Spider-Man Epic Collection: Spider-Man No More",
    "Amazing Spider-Man #39-52, Annual #3", 15, "the-expansion", "Stan Lee", "John Romita Sr.",
    "John Romita Sr. takes over art. Green Goblin unmasked as Norman Osborn (#39-40). Classic 'Spider-Man No More' story (#50). Kraven and Spider-Slayer return.",
    "Budget alternative to ASM Omnibus Vol. 2. Leads to: ASM Epic Vol. 4.")

make_epic("asm-epic-v4-goblin-lives", "Amazing Spider-Man Epic Collection: The Goblin Lives",
    "Amazing Spider-Man #53-67, Annual #4", 16, "the-expansion", "Stan Lee", "John Romita Sr.",
    "Kingpin debut context. Ka-Zar crossover. Mysterio returns. Norman Osborn's ongoing menace continues.",
    "Leads to: ASM Epic Vol. 5.")

make_epic("asm-epic-v5-petrified-tablet", "Amazing Spider-Man Epic Collection: The Secret of the Petrified Tablet",
    "Amazing Spider-Man #68-85", 18, "bronze-age", "Stan Lee", "John Romita Sr.",
    "The Petrified Tablet saga. Kingpin consolidates power. Prowler debut (#78). Campus protest stories reflect the era.",
    "Budget alternative to ASM Omnibus Vol. 3. Leads to: ASM Epic Vol. 6.")

make_epic("asm-epic-v6-death-captain-stacy", "Amazing Spider-Man Epic Collection: The Death of Captain Stacy",
    "Amazing Spider-Man #86-104, Annual #5-6", 21, "bronze-age", "Stan Lee", "John Romita Sr./Gil Kane",
    "Captain Stacy dies saving a child (#90) — a landmark moment. Morbius the Living Vampire debut (#101). Six-armed Spider-Man saga.",
    "Captain Stacy's death is a landmark moment. Leads to: ASM Epic Vol. 7.", importance="essential")

make_epic("asm-epic-v7-goblins-last-stand", "Amazing Spider-Man Epic Collection: The Goblin's Last Stand",
    "Amazing Spider-Man #105-123", 19, "bronze-age", "Stan Lee/Gerry Conway", "Gil Kane/John Romita Sr.",
    "Gwen Stacy dies (#121-122) — the most shocking death in comics history. Green Goblin dies (#122). The end of the Silver Age.",
    "Death of Gwen Stacy ends the Silver Age. Budget alternative to ASM Omnibus Vol. 3. Leads to: ASM Epic Vol. 8.", importance="essential")

make_epic("asm-epic-v8-man-wolf", "Amazing Spider-Man Epic Collection: Man-Wolf at Midnight",
    "Amazing Spider-Man #124-142", 19, "bronze-age", "Gerry Conway", "Ross Andru",
    "Man-Wolf debut (#124-125). Punisher's first full appearance (#129). Jackal revealed. Gwen Stacy clone appears.",
    "Punisher debut issue is a key collectible moment. Leads to: ASM Epic Vol. 9.", importance="essential")

make_epic("asm-epic-v9-spider-clone", "Amazing Spider-Man Epic Collection: Spider-Man or Spider-Clone?",
    "Amazing Spider-Man #143-164", 22, "bronze-age", "Gerry Conway/Len Wein", "Ross Andru",
    "The original Clone Saga. Jackal's master plan. First Spider-Clone. Stegron the Dinosaur Man. Kingpin returns.",
    "The original clone story — revisited controversially in the 90s. Leads to: ASM Epic Vol. 10.")

make_epic("asm-epic-v10-big-apple", "Amazing Spider-Man Epic Collection: Big Apple Battleground",
    "Amazing Spider-Man #165-185", 21, "bronze-age", "Len Wein/Marv Wolfman", "Ross Andru",
    "Stegron returns. Rocket Racer and Big Wheel debut. Peter's graduate school era begins.",
    "Leads to: ASM Epic Vol. 11.")

make_epic("asm-epic-v11-black-cat", "Amazing Spider-Man Epic Collection: Nine Lives Has the Black Cat",
    "Amazing Spider-Man #186-206", 21, "rise-of-x-men", "Marv Wolfman/Denny O'Neil", "Keith Pollard",
    "Black Cat debut (#194-195). Burglar returns. Calypso and Hydro-Man debut.",
    "Black Cat becomes a major Spider-Man character. Leads to: ASM Epic Vol. 12.")

make_epic("asm-epic-v15-ghosts-of-past", "Amazing Spider-Man Epic Collection: Ghosts of the Past",
    "Amazing Spider-Man #259-272", 14, "rise-of-x-men", "Tom DeFalco", "Ron Frenz",
    "Hobgoblin mystery continues. Puma and Silver Sable debut. Rose revealed. Spider-Man ditches the black costume.",
    "Leads to: ASM Epic Vol. 16.")

make_epic("asm-epic-v17-kravens-last-hunt", "Amazing Spider-Man Epic Collection: Kraven's Last Hunt",
    "Amazing Spider-Man #289-294, Web of Spider-Man #31-32, Spectacular Spider-Man #131-132", 10, "event-age",
    "J.M. DeMatteis", "Mike Zeck",
    "Kraven's Last Hunt — one of the greatest Spider-Man stories ever told. Kraven buries Spider-Man alive, takes his identity. Psychological masterpiece.",
    "Essential reading. One of the most acclaimed Spider-Man stories.", importance="essential")

make_epic("asm-epic-v18-venom", "Amazing Spider-Man Epic Collection: Venom",
    "Amazing Spider-Man #295-310", 16, "event-age", "David Michelinie", "Todd McFarlane",
    "Todd McFarlane redefines Spider-Man's visual style. Venom's first full appearance (#300). The symbiote saga climaxes.",
    "Venom #300 is iconic. Budget alternative to ASM by Michelinie & McFarlane Omnibus.", importance="essential")

make_epic("asm-epic-v19-assassin-nation", "Amazing Spider-Man Epic Collection: Assassin Nation",
    "Amazing Spider-Man #311-325", 15, "event-age", "David Michelinie", "Todd McFarlane",
    "Inferno crossover. Hobgoblin vs. Green Goblin. Assassin Nation Plot — multiple factions target the Kingpin.",
    "Leads to: ASM Epic Vol. 20.")

make_epic("asm-epic-v20-cosmic-adventures", "Amazing Spider-Man Epic Collection: Cosmic Adventures",
    "Amazing Spider-Man #326-333, Spectacular Spider-Man #158-160", 11, "event-age",
    "David Michelinie", "Erik Larsen",
    "Acts of Vengeance crossover. Spider-Man gains cosmic Captain Universe powers. Erik Larsen takes over art.",
    "Leads to: ASM Epic Vol. 21.")

make_epic("asm-epic-v21-sinister-six", "Amazing Spider-Man Epic Collection: Return of the Sinister Six",
    "Amazing Spider-Man #334-350", 17, "event-age", "David Michelinie", "Erik Larsen",
    "Sinister Six reunites under Doc Ock. Cardiac debut. Doctor Doom crossover (#349-350).",
    "Leads to: ASM Epic Vol. 22.")

make_epic("asm-epic-v22-round-robin", "Amazing Spider-Man Epic Collection: Round Robin",
    "Amazing Spider-Man #351-360", 10, "event-age", "David Michelinie", "Mark Bagley",
    "Round Robin crossover with Moon Knight and Punisher. Mark Bagley begins his iconic ASM run.",
    "Leads to: ASM Epic Vol. 23.")

make_epic("asm-epic-v23-hero-killers", "Amazing Spider-Man Epic Collection: The Hero Killers",
    "Amazing Spider-Man #361-367, Annual #27", 8, "speculation-crash", "David Michelinie", "Mark Bagley",
    "Carnage debuts (#361-363) — Venom's offspring bonds with serial killer Cletus Kasady. One of the key 90s moments.",
    "Leads to: ASM Epic Vol. 24.", importance="essential")

make_epic("asm-epic-v24-spider-slayers", "Amazing Spider-Man Epic Collection: Invasion of the Spider-Slayers",
    "Amazing Spider-Man #368-377", 10, "speculation-crash", "David Michelinie", "Mark Bagley",
    "Alistair Smythe's army of Spider-Slayers attacks. Electro returns.",
    "Leads to: ASM Epic Vol. 25.")

make_epic("asm-epic-v25-maximum-carnage", "Amazing Spider-Man Epic Collection: Maximum Carnage",
    "Amazing Spider-Man #378-380, Web of Spider-Man #101-103, Spectacular Spider-Man #201-203, Spider-Man #35-37, Spider-Man Unlimited #1-2", 14,
    "speculation-crash", "Tom DeFalco/Terry Kavanagh/David Michelinie/J.M. DeMatteis", "Mark Bagley/Sal Buscema",
    "Maximum Carnage crossover. Carnage assembles psychopaths including Shriek, Demogoblin, Carrion. Venom and Spider-Man form uneasy alliance.",
    "The definitive 90s Spider-Man crossover.", importance="recommended")

make_epic("asm-epic-v26-lifetheft", "Amazing Spider-Man Epic Collection: Lifetheft",
    "Amazing Spider-Man #381-393", 13, "speculation-crash", "David Michelinie/J.M. DeMatteis", "Mark Bagley",
    "Vulture rejuvenated. Lead-up to the Clone Saga. Peter's parents returned (revealed as robots).",
    "Leads to: ASM Epic Vol. 27.")

make_epic("asm-epic-v27-clone-saga", "Amazing Spider-Man Epic Collection: The Clone Saga",
    "Amazing Spider-Man #394-396, Spectacular Spider-Man #217-219, Web of Spider-Man #117-119, Spider-Man #51-53", 12,
    "speculation-crash", "J.M. DeMatteis/Tom DeFalco/Howard Mackie", "Mark Bagley/Sal Buscema",
    "The Clone Saga begins. Ben Reilly returns as the Scarlet Spider. The most controversial Spider-Man story ever told.",
    "The infamous Clone Saga. Leads to: ASM Epic Vol. 28.")

make_epic("asm-epic-v28-web-of-life", "Amazing Spider-Man Epic Collection: Web of Life, Web of Death",
    "Amazing Spider-Man #397-399, Spectacular Spider-Man #220-222, Web of Spider-Man #120-122, Spider-Man #54-56", 12,
    "speculation-crash", "J.M. DeMatteis/Tom DeFalco/Howard Mackie", "Mark Bagley/Sal Buscema",
    "Clone Saga continues. Doctor Octopus killed. Kaine revealed. Ben Reilly takes on a larger role.",
    "Leads into the thick of the Clone Saga.")

# ============================================================
# ANT-MAN/GIANT-MAN
# ============================================================
make_epic("ant-man-epic-v1-man-in-ant-hill", "Ant-Man/Giant-Man Epic Collection: The Man in the Ant Hill",
    "Tales to Astonish #27, #35-59", 26, "birth-of-marvel", "Stan Lee", "Jack Kirby",
    "Hank Pym's origin as Ant-Man. Janet Van Dyne becomes the Wasp. Early adventures against Egghead, Porcupine, and the Human Top.",
    "Leads to: Ant-Man Epic Vol. 2. Parallel: Avengers #1 founding.")

make_epic("ant-man-epic-v2-no-more", "Ant-Man/Giant-Man Epic Collection: Ant-Man No More",
    "Tales to Astonish #60-69", 10, "birth-of-marvel", "Stan Lee", "Dick Ayers",
    "Giant-Man era. Hank Pym grows instead of shrinks. Final Tales to Astonish Giant-Man stories before Namor takes over.",
    "Leads to: Hank Pym's Avengers appearances.", importance="supplemental")

# ============================================================
# AVENGERS EPIC COLLECTIONS (vol 2-26, skipping existing)
# ============================================================
make_epic("avengers-epic-v2-once-an-avenger", "Avengers Epic Collection: Once an Avenger",
    "Avengers #21-40", 20, "birth-of-marvel", "Stan Lee", "Don Heck/Jack Kirby",
    "Cap's Kooky Quartet era. Power Man, Swordsman, and Collector debut. Hercules joins.",
    "Leads to: Avengers Epic Vol. 3.")

make_epic("avengers-epic-v3-masters-of-evil", "Avengers Epic Collection: Masters of Evil",
    "Avengers #41-56", 16, "the-expansion", "Roy Thomas", "John Buscema/Don Heck",
    "Roy Thomas takes over. Masters of Evil reform. Hercules becomes a full member. Dragon Man and Diablo appear.",
    "Leads to: Avengers Epic Vol. 4.")

make_epic("avengers-epic-v5-beachhead-earth", "Avengers Epic Collection: This Beachhead Earth",
    "Avengers #77-97", 21, "bronze-age", "Roy Thomas", "John Buscema/Sal Buscema/Neal Adams",
    "Kree-Skrull War (#89-97) — the definitive Avengers epic. Valkyrie debut. Squadron Supreme first appearance.",
    "Kree-Skrull War is essential Avengers reading.", importance="essential")

make_epic("avengers-epic-v6-traitor-stalks", "Avengers Epic Collection: A Traitor Stalks Among Us",
    "Avengers #98-114", 17, "bronze-age", "Roy Thomas/Steve Englehart", "Rich Buckler/Bob Brown",
    "Steve Englehart begins his acclaimed run. Vision and Scarlet Witch wed. Mantis introduced.",
    "Leads to: Avengers Epic Vol. 7.")

make_epic("avengers-epic-v8-kang-war", "Avengers Epic Collection: Kang War",
    "Avengers #129-149", 21, "bronze-age", "Steve Englehart", "Sal Buscema/George Tuska",
    "Celestial Madonna saga. Kang Dynasty. Mantis's origin revealed. Immortus appears.",
    "Englehart's Avengers peak. Leads to: Avengers Epic Vol. 9.")

make_epic("avengers-epic-v9-final-threat", "Avengers Epic Collection: The Final Threat",
    "Avengers #150-166", 17, "bronze-age", "Jim Shooter/Gerry Conway", "George Perez/John Byrne",
    "George Perez arrives. Count Nefaria becomes god-like. Ultron creates Jocasta. Wonder Man returns.",
    "Leads to: Avengers Epic Vol. 10.")

make_epic("avengers-epic-v10-yesterday-quest", "Avengers Epic Collection: The Yesterday Quest",
    "Avengers #167-188", 22, "bronze-age", "Jim Shooter/David Michelinie", "George Perez/John Byrne",
    "The Korvac Saga (#167-177) — galaxy-spanning epic. Scarlet Witch and Quicksilver discover their parentage.",
    "Korvac Saga is essential. Leads to: Avengers Epic Vol. 11.", importance="essential")

make_epic("avengers-epic-v11-evil-reborn", "Avengers Epic Collection: The Evil Reborn",
    "Avengers #189-209", 21, "rise-of-x-men", "David Michelinie/Jim Shooter", "John Byrne/George Perez",
    "Deathbird debuts. Taskmaster first appearance (#195-196). Yellowjacket's breakdown.",
    "Leads to: Avengers Epic Vol. 12.")

make_epic("avengers-epic-v13-seasons-witch", "Avengers Epic Collection: Seasons of the Witch",
    "Avengers #227-237", 11, "rise-of-x-men", "Roger Stern", "Al Milgrom",
    "Roger Stern's acclaimed run begins. Monica Rambeau (Captain Marvel) joins. The team rebuilds.",
    "Leads to: Avengers Epic Vol. 14.")

make_epic("avengers-epic-v17-judgment-day", "Avengers Epic Collection: Judgment Day",
    "Avengers #278-285", 8, "event-age", "Roger Stern", "John Buscema",
    "Masters of Evil invade Avengers Mansion! Hercules beaten nearly to death. Jarvis tortured. Cap fights back alone.",
    "Overlaps with Under Siege epic.", importance="essential")

make_epic("avengers-epic-v18-heavy-metal", "Avengers Epic Collection: Heavy Metal",
    "Avengers #286-303", 18, "event-age", "Roger Stern/Walter Simonson", "John Buscema",
    "Olympus War. Evolutionary War crossover. Walter Simonson takes over writing. Quasar joins.",
    "Leads to: Avengers Epic Vol. 19.")

make_epic("avengers-epic-v19-acts-vengeance", "Avengers Epic Collection: Acts of Vengeance",
    "Avengers #304-318", 15, "event-age", "John Byrne", "Paul Ryan",
    "Acts of Vengeance crossover — villains swap heroes. John Byrne restructures the team. Loki revealed as mastermind.",
    "Leads to: Avengers Epic Vol. 20.")

make_epic("avengers-epic-v20-crossing-line", "Avengers Epic Collection: The Crossing Line",
    "Avengers #319-333", 15, "event-age", "Larry Hama/Fabian Nicieza", "Paul Ryan",
    "The Crossing Line international incident. Alpha Flight crossover. Geopolitical conflicts.",
    "Leads to: Avengers Epic Vol. 21.")

make_epic("avengers-epic-v21-collection-obsession", "Avengers Epic Collection: The Collection Obsession",
    "Avengers #334-344", 11, "event-age", "Bob Harras", "Steve Epting",
    "The Collector targets the Avengers. Steve Epting arrives on art. Lead-up to Operation: Galactic Storm.",
    "Leads to: Avengers Epic Vol. 22.")

make_epic("avengers-epic-v22-galactic-storm", "Avengers Epic Collection: Operation Galactic Storm",
    "Avengers #345-347, Captain America #398-401, Iron Man #278-279, Thor #445-446, Wonder Man #7-9, Quasar #32-34", 19,
    "event-age", "Bob Harras/Mark Gruenwald", "Steve Epting/Rik Levins",
    "Kree-Shi'ar War. Iron Man's faction executes the Supreme Intelligence. Moral crisis divides the team.",
    "Major crossover event. Leads to: Avengers Epic Vol. 23.", importance="recommended")

make_epic("avengers-epic-v23-fear-reaper", "Avengers Epic Collection: Fear the Reaper",
    "Avengers #348-359", 12, "speculation-crash", "Bob Harras", "Steve Epting",
    "Grim Reaper returns. Proctor and the Gatherers menace from alternate realities. Sersi becomes unstable.",
    "Leads to: Avengers Epic Vol. 24.")

make_epic("avengers-epic-v25-gathering", "Avengers Epic Collection: The Gathering",
    "Avengers #367-377", 11, "speculation-crash", "Bob Harras", "Steve Epting/Mike Deodato",
    "Bloodties crossover with X-Men. Gatherers finale. Deathcry joins.",
    "Leads to: Avengers Epic Vol. 26.")

make_epic("avengers-epic-v26-taking-aim", "Avengers Epic Collection: Taking A.I.M.",
    "Avengers #378-388", 11, "speculation-crash", "Bob Harras/Terry Kavanagh", "Mike Deodato",
    "A.I.M. threatens. The Crossing begins — Tony Stark revealed as a traitor (later retconned). Lead-up to Onslaught.",
    "The controversial Crossing storyline. Leads to: Heroes Reborn.")

# Save part 1
with open("/tmp/editions_part1.json", "w") as f:
    json.dump(editions, f, indent=4)
print(f"Part 1 done: {len(editions)} editions (ASM, Ant-Man, Avengers)")
