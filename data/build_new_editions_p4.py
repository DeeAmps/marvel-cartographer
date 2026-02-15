#!/usr/bin/env python3
"""Part 4: Moon Knight, New Mutants, PM&IF, Punisher, Silver Surfer, Thor, Thunderbolts, Wolverine, X-Factor, X-Force, X-Men, Modern Era, Premier Collections."""
import json

editions = []

def make_epic(slug, title, issues, count, era, writer, artist, synopsis, notes, importance="recommended", price=39.99):
    editions.append({
        "slug": slug, "title": title, "format": "epic_collection",
        "issues_collected": issues, "issue_count": count, "print_status": "in_print",
        "importance": importance, "era_slug": era,
        "creators": [{"name": writer, "role": "writer"}, {"name": artist, "role": "artist"}],
        "synopsis": synopsis, "connection_notes": notes,
        "cover_image_url": None, "isbn": None, "page_count": None, "cover_price": price
    })

def make_premier(slug, title, issues, count, era, writer, artist, synopsis, notes, importance, isbn=None):
    editions.append({
        "slug": slug, "title": title, "format": "premier_collection",
        "issues_collected": issues, "issue_count": count, "print_status": "in_print",
        "importance": importance, "era_slug": era,
        "creators": [{"name": writer, "role": "writer"}, {"name": artist, "role": "artist"}],
        "synopsis": synopsis, "connection_notes": notes,
        "cover_image_url": None, "isbn": isbn, "page_count": None, "cover_price": 14.99
    })

# MOON KNIGHT (vol 1, 3-5, 7)
make_epic("mk-epic-v1-bad-moon-rising", "Moon Knight Epic Collection: Bad Moon Rising",
    "Werewolf by Night #32-33, Marvel Spotlight #28-29, Hulk Magazine #11-15, #17-18, Moon Knight #1-4", 13,
    "rise-of-x-men", "Doug Moench", "Bill Sienkiewicz/Don Perlin",
    "Moon Knight's complete origin. Marc Spector, Steven Grant, Jake Lockley — the triple identity. Werewolf by Night debut. Bushman. Khonshu.",
    "Leads to: MK Epic Vol. 2.", importance="essential")

make_epic("mk-epic-v3-final-rest", "Moon Knight Epic Collection: Final Rest",
    "Moon Knight #24-38", 15, "rise-of-x-men", "Doug Moench", "Bill Sienkiewicz",
    "Sienkiewicz's art becomes increasingly experimental and expressionistic. Morpheus. Stained Glass Scarlet. The series reaches artistic heights.",
    "Sienkiewicz's finest work. Leads to: MK Epic Vol. 4.", importance="essential")

make_epic("mk-epic-v4-butchers-moon", "Moon Knight Epic Collection: Butcher's Moon",
    "Moon Knight (1985) #1-6, Marc Spector: Moon Knight #1-7", 13, "event-age",
    "Alan Zelenetz/Chuck Dixon", "Chris Warner/Sal Velluto",
    "Two Moon Knight revivals. The Fist of Khonshu limited series. Marc Spector series launch. Darker tone.",
    "Leads to: MK Epic Vol. 5.")

make_epic("mk-epic-v5-trial-marc-spector", "Moon Knight Epic Collection: The Trial of Marc Spector",
    "Marc Spector: Moon Knight #8-25", 18, "event-age", "Chuck Dixon/Charles Dixon", "Sal Velluto",
    "Moon Knight on trial. Punisher crossover. Acts of Vengeance. The multiple identities deepen.",
    "Leads to later Marc Spector issues.")

make_epic("mk-epic-v7-death-watch", "Moon Knight Epic Collection: Death Watch",
    "Marc Spector: Moon Knight #39-51", 13, "event-age", "Terry Kavanagh", "Gary Kwapisz/James Fry",
    "Infinity War crossover. Moon Knight faces his doppelganger. Midnight (cyborg). Series nears conclusion.",
    "Series concludes.")

# NEW MUTANTS
nm_epics = [
    (1, "Renewal", "Marvel Graphic Novel #4, New Mutants #1-12", 13, "rise-of-x-men", "Chris Claremont", "Bob McLeod/Sal Buscema",
     "Xavier forms a new class: Cannonball, Wolfsbane, Sunspot, Mirage, Karma. Origin graphic novel. Sentinels. Team Brood conflict.", "essential"),
    (2, "The Demon Bear Saga", "New Mutants #13-31", 19, "rise-of-x-men", "Chris Claremont", "Bill Sienkiewicz",
     "The Demon Bear Saga (#18-20) — Bill Sienkiewicz's groundbreaking, expressionistic art. Magik joins. Warlock debut. Legion debut (#25-28).", "essential"),
    (3, "Asgardian Wars", "New Mutants #32-44, X-Men/Alpha Flight #1-2, New Mutants Special #1", 16, "rise-of-x-men",
     "Chris Claremont", "Steve Leialoha/Bill Sienkiewicz",
     "The New Mutants in Asgard. Magik's Soulsword. Beyonder crossover (Secret Wars II). Karma returns.", "recommended"),
    (4, "Fallen Angels", "New Mutants #45-54, Fallen Angels #1-8", 18, "event-age", "Chris Claremont/Jo Duffy", "Jackson Guice/Kerry Gammill",
     "Mutant Massacre aftermath. Doug Ramsey's growing importance. Fallen Angels spinoff. The team deals with loss.", "recommended"),
    (5, "Sudden Death", "New Mutants #55-70", 16, "event-age", "Louise Simonson", "Bret Blevins/Rob Liefeld",
     "Louise Simonson takes over. Bird-Brain. Fall of the Mutants. Inferno crossover lead-in. The team changes dramatically.", "recommended"),
    (6, "Curse of the Valkyries", "New Mutants #71-85", 15, "event-age", "Louise Simonson", "Bret Blevins/Rob Liefeld",
     "Inferno crossover. Asgardian adventure. Freedom Force. Rob Liefeld arrives and begins transforming the book.", "recommended"),
    (7, "Cable", "New Mutants #86-94", 9, "event-age", "Louise Simonson", "Rob Liefeld",
     "Cable debuts (#87). Liefeld's dynamic art redefines the book. Domino. Deadpool first appearance (#98 context). The transformation into X-Force begins.", "essential"),
    (8, "The End of the Beginning", "New Mutants #95-100", 6, "event-age", "Louise Simonson", "Rob Liefeld",
     "X-Tinction Agenda crossover. Cameron Hodge. Series finale — New Mutants become X-Force. Warlock dies. Rahne leaves for Muir Island.", "recommended"),
]

for vol, sub, iss, cnt, era, wr, ar, syn, imp in nm_epics:
    make_epic(f"new-mutants-epic-v{vol}-{sub.lower().replace(' ','-').replace(chr(39),'')}", f"New Mutants Epic Collection: {sub}",
        iss, cnt, era, wr, ar, syn,
        f"Leads to: NM Epic Vol. {vol+1}." if vol < 8 else "Leads to: X-Force #1.", importance=imp)

# POWER MAN & IRON FIST
for vol, sub, iss, cnt in [
    (1, "Heroes for Hire", "Power Man and Iron Fist #50-70", 21),
    (2, "Revenge", "Power Man and Iron Fist #71-72, #74-89", 19),
    (3, "Doombringer", "Power Man and Iron Fist #90-107", 18),
    (4, "Hardball", "Power Man and Iron Fist #108-125", 18),
]:
    make_epic(f"pmif-epic-v{vol}-{sub.lower().replace(' ','-')}", f"Power Man and Iron Fist Epic Collection: {sub}",
        iss, cnt, "rise-of-x-men", "Mary Jo Duffy/Kurt Busiek" if vol > 2 else "Mary Jo Duffy/Chris Claremont",
        "Kerry Gammill/Ernie Chan", f"Luke Cage and Danny Rand as Heroes for Hire. Street-level adventures in 1980s New York. Vol. {vol} of the classic team-up series.",
        f"Leads to: PM&IF Epic Vol. {vol+1}." if vol < 4 else "Series concludes with #125.", importance="recommended" if vol == 1 else "supplemental")

# PUNISHER
pun_epics = [
    (2, "Circle of Blood", "Punisher (1986) #1-5, Punisher (1987) #1-10", 15, "event-age", "Steven Grant/Mike Baron", "Mike Zeck/Klaus Janson",
     "Circle of Blood limited series redefines Frank Castle. First ongoing launches. Jigsaw. Microchip. The definitive 80s Punisher.", "essential"),
    (3, "Kingpin Rules", "Punisher #11-25", 15, "event-age", "Mike Baron", "Whilce Portacio/Erik Larsen",
     "Kingpin conflict. Drug war storylines. Punisher's one-man war escalates. The series hits its stride.", "recommended"),
    (4, "Return to Big Nothing", "Punisher #26-34", 9, "event-age", "Mike Baron", "Bill Reinhold",
     "Return to Big Nothing. Punisher faces his past. Jigsaw returns. The war never ends.", "supplemental"),
    (5, "Jigsaw Puzzle", "Punisher #35-48", 14, "event-age", "Mike Baron/Chuck Dixon", "Mark Texeira",
     "Jigsaw Puzzle arc. Dixon takes over. Grittier urban crime stories. Punisher War Journal launches.", "recommended"),
    (7, "Capital Punishment", "Punisher #63-75", 13, "event-age", "Chuck Dixon", "Various",
     "Capital Punishment. Punisher in Washington DC. Political conspiracies. Series nears cancellation.", "supplemental"),
]

for vol, sub, iss, cnt, era, wr, ar, syn, imp in pun_epics:
    make_epic(f"punisher-epic-v{vol}-{sub.lower().replace(' ','-')}", f"Punisher Epic Collection: {sub}",
        iss, cnt, era, wr, ar, syn,
        f"Leads to: Punisher Epic Vol. {vol+1}." if vol < 7 else "Leads to: Punisher 2099 era.", importance=imp)

# SILVER SURFER
ss_epics = [
    (1, "When Galactus Calls", "Fantastic Four #48-50, #55-61, #72, #74-77, Silver Surfer #1-4", 21, "the-expansion",
     "Stan Lee", "Jack Kirby/John Buscema",
     "Galactus Trilogy plus early Silver Surfer solo. Surfer trapped on Earth. Mephisto tempts him. The definitive cosmic Marvel origin.", "essential"),
    (3, "Freedom", "Silver Surfer (1987) #1-14", 14, "event-age", "Steve Englehart", "Marshall Rogers",
     "Silver Surfer breaks free from Earth. Galactus. Elders of the Universe plot to kill Galactus. In-Betweener. Kree-Skrull War.", "recommended"),
    (4, "Parable", "Silver Surfer #15-23, Silver Surfer: Parable #1-2", 11, "event-age",
     "Steve Englehart/Stan Lee/Moebius", "Ron Lim/Moebius",
     "Silver Surfer: Parable by Lee & Moebius — a masterpiece. Galactus returns to Earth. Super-Skrull. Kree empire intrigue.", "essential"),
    (5, "Return of Thanos", "Silver Surfer #24-38", 15, "event-age", "Jim Starlin/Steve Englehart", "Ron Lim",
     "Thanos returns from the dead! Jim Starlin takes over. The Elders. Infinity Gems scattered. Direct lead-in to Thanos Quest.", "essential"),
    (6, "Thanos Quest", "Silver Surfer #39-50, Thanos Quest #1-2", 14, "event-age", "Jim Starlin", "Ron Lim",
     "Thanos Quest — Thanos collects all six Infinity Gems. Each gem stolen from an Elder. The direct prelude to Infinity Gauntlet.", "essential"),
    (7, "The Infinity Gauntlet", "Silver Surfer #51-66", 16, "event-age", "Jim Starlin/Ron Marz", "Ron Lim",
     "Infinity Gauntlet tie-in from Surfer's perspective. Surfer's POV of the cosmic event. Ron Marz takes over writing.", "recommended"),
    (8, "The Herald Ordeal", "Silver Surfer #67-75", 9, "event-age", "Ron Marz", "Ron Lim",
     "Herald Ordeal — Surfer must serve Galactus again. Infinity War tie-in. Nova (Frankie Raye). Morg debut.", "recommended"),
    (9, "Resurrection", "Silver Surfer #76-85", 10, "speculation-crash", "Ron Marz", "Ron Lim/Andy Smith",
     "Surfer resurrected after apparent death. Infinity Crusade tie-in. The series continues cosmic adventures.", "supplemental"),
    (13, "Inner Demons", "Silver Surfer #123-138", 16, "speculation-crash", "J.M. DeMatteis/George Perez", "Jon Muth/Various",
     "J.M. DeMatteis explores Surfer's inner psychology. Artistic experimentation. The series winds down.", "supplemental"),
    (14, "Sun Rise and Shadow Fall", "Silver Surfer #139-146", 8, "heroes-reborn-return", "J.M. DeMatteis/Tom DeFalco", "Various",
     "Final issues of the long-running series. Surfer faces his mortality. Series concludes with #146.", "supplemental"),
]

for vol, sub, iss, cnt, era, wr, ar, syn, imp in ss_epics:
    make_epic(f"ss-epic-v{vol}-{sub.lower().replace(' ','-').replace(chr(39),'')}", f"Silver Surfer Epic Collection: {sub}",
        iss, cnt, era, wr, ar, syn,
        f"Leads to: SS Epic Vol. {vol+1}." if vol < 14 else "Series concludes.", importance=imp)

# THOR (vol 2-12, 16-24)
thor_epics = [
    (2, "When Titans Clash", "Journey into Mystery #110-125, Thor #126-130", 21, "birth-of-marvel", "Stan Lee", "Jack Kirby",
     "Tales of Asgard backups. Absorbing Man debut. Hercules first appears. Destroyer. Kirby's Asgard at its most mythic.", "essential"),
    (3, "The Wrath of Odin", "Thor #131-153", 23, "the-expansion", "Stan Lee", "Jack Kirby",
     "Ego the Living Planet. Rigellians. Ulik the Troll. Hela. The Wrecker. Kirby's cosmic artwork reaches new heights.", "essential"),
    (4, "To Wake the Mangog", "Thor #154-174", 21, "the-expansion", "Stan Lee", "Jack Kirby",
     "Mangog debuts — threatens to draw the Odinsword and destroy the universe. Galactus/Ego battle. Kirby's final Thor issues.", "essential"),
    (5, "The Fall of Asgard", "Thor #175-194", 20, "bronze-age", "Stan Lee/Gerry Conway", "Jack Kirby/John Buscema",
     "Surtur threatens Asgard. Thermal Man. Infinity. John Buscema takes over. Thor in the World Beyond.", "recommended"),
    (6, "Into the Dark Nebula", "Thor #195-216", 22, "bronze-age", "Gerry Conway/Len Wein", "John Buscema",
     "Durok the Demolisher. Mangog returns. Firelord debut. Destroyer. Buscema's legendary artwork defines the era.", "recommended"),
    (7, "Ulik Unchained", "Thor #217-241", 25, "bronze-age", "Len Wein/Roy Thomas", "John Buscema/Walt Simonson",
     "Ulik attacks. The Celestials arrive (#283 lead-in). Walt Simonson begins drawing. Roy Thomas writes cosmic mythology.", "recommended"),
    (8, "War of the Gods", "Thor #242-259", 18, "bronze-age", "Roy Thomas/Len Wein", "John Buscema",
     "Eternals Saga tie-in. Celestials. Korvac Saga crossover. Fourth Host of the Celestials threatens Earth.", "recommended"),
    (9, "Even an Immortal Can Die", "Thor #260-280", 21, "rise-of-x-men", "Roy Thomas/Mark Gruenwald", "John Buscema/Keith Pollard",
     "Stardust. Celestials judgment. Ragnarok approaches. The Eternals connection deepens.", "recommended"),
    (10, "The Eternals Saga", "Thor #281-302", 22, "rise-of-x-men", "Roy Thomas/Mark Gruenwald/Doug Moench", "Keith Pollard",
     "Eternals Saga conclusion. Celestials judged. Dazzler crossover. Doug Moench era begins. The transition between eras.", "supplemental"),
    (11, "A Kingdom Lost", "Thor #303-319", 17, "rise-of-x-men", "Doug Moench/Alan Zelenetz", "Keith Pollard/Bob Hall",
     "Fafnir. Hela schemes. Casket of Ancient Winters. Pre-Simonson setup.", "supplemental"),
    (12, "Runequest", "Thor #320-336", 17, "rise-of-x-men", "Alan Zelenetz/Doug Moench", "Bob Hall/Mark Bright",
     "Dracula crossover. Megatak. Possessor. The final pre-Simonson issues. Setting up the legendary run.", "supplemental"),
    (16, "War of the Pantheons", "Thor #383-400", 18, "event-age", "Tom DeFalco", "Ron Frenz",
     "Celestial saga. Seth attacks Asgard. Thor in armor. Egyptian gods vs. Norse gods. Milestone #400.", "recommended"),
    (17, "In Mortal Flesh", "Thor #401-418", 18, "event-age", "Tom DeFalco/Ron Frenz", "Ron Frenz",
     "Thor merged with Eric Masterson. New Warriors crossover. Loki schemes. Code Blue police unit.", "recommended"),
    (18, "The Black Galaxy", "Thor #419-436", 18, "event-age", "Tom DeFalco", "Ron Frenz/Pat Olliffe",
     "Black Galaxy Saga. Celestials. Stellaris. Infinity Gauntlet tie-in. Eric Masterson era deepens.", "recommended"),
    (19, "The Thor War", "Thor #437-450", 14, "event-age", "Tom DeFalco/Ron Frenz", "Pat Olliffe",
     "Thor War. Eric Masterson becomes Thunderstrike. The real Thor returns. Infinity War tie-in.", "recommended"),
    (20, "The Final Gauntlet", "Thor #451-467", 17, "speculation-crash", "Ron Marz/Warren Ellis", "Bruce Zick/Mike Deodato",
     "Worldengine saga begins. Godpack. High Evolutionary. Warren Ellis brief run. Thor's 90s evolution.", "supplemental"),
    (21, "Blood and Thunder", "Thor #468-475, Silver Surfer #86-88, Warlock Chronicles #6-8, Warlock and the Infinity Watch #23-25", 16,
     "speculation-crash", "Ron Marz", "Bruce Zick",
     "Blood and Thunder crossover. Thor goes mad. Thanos, Silver Surfer, Adam Warlock intervene. Cosmic event.", "recommended"),
    (22, "Hel on Earth", "Thor #476-490", 15, "speculation-crash", "Roy Thomas/Warren Ellis/William Messner-Loebs", "Mike Deodato",
     "Hel on Earth. Enchantress schemes. Red Norvell. The series in its declining 90s era.", "supplemental"),
    (23, "Worldengine", "Thor #491-502", 12, "heroes-reborn-return", "William Messner-Loebs", "Mike Deodato",
     "Worldengine saga concludes. Thor faces cosmic machinery threatening reality. Onslaught tie-in.", "supplemental"),
    (24, "The Lost Gods", "Journey into Mystery #503-513, Thor (1998) #1-2", 13, "heroes-reborn-return",
     "Tom DeFalco", "Deodato/Ladronn",
     "The Lost Gods — Asgardians become mortal with no memories. Journey into Mystery carries the story. Leads to Heroes Return Thor.", "supplemental"),
]

for vol, sub, iss, cnt, era, wr, ar, syn, imp in thor_epics:
    make_epic(f"thor-epic-v{vol}-{sub.lower().replace(' ','-').replace(chr(39),'').replace(',','')}", f"Thor Epic Collection: {sub}",
        iss, cnt, era, wr, ar, syn,
        f"Leads to: Thor Epic Vol. {vol+1}." if vol < 24 else "Leads to: Heroes Return Thor by Dan Jurgens.", importance=imp)

# THUNDERBOLTS
make_epic("tbolts-epic-v1-justice-like-lightning", "Thunderbolts Epic Collection: Justice, Like Lightning",
    "Thunderbolts #1-12, Incredible Hulk #449", 13, "heroes-reborn-return", "Kurt Busiek", "Mark Bagley",
    "The Thunderbolts are the Masters of Evil in disguise! Baron Zemo's greatest scheme. The twist in #1 is one of Marvel's best. Citizen V. Atlas. Songbird. Mach-1.",
    "One of the best Marvel reveals ever. Leads to: Tbolts Epic Vol. 2.", importance="essential")

make_epic("tbolts-epic-v2-wanted-dead-alive", "Thunderbolts Epic Collection: Wanted Dead or Alive",
    "Thunderbolts #13-25", 13, "heroes-reborn-return", "Kurt Busiek", "Mark Bagley",
    "The Thunderbolts choose heroism over villainy. Graviton. Charcoal. Hawkeye joins to lead them. Redemption arc.",
    "Leads to later Thunderbolts volumes.")

# WOLVERINE
wolv_epics = [
    (1, "Madripoor Nights", "Wolverine (1988) #1-16", 16, "event-age", "Chris Claremont", "John Buscema",
     "Wolverine's first ongoing. Madripoor adventures. Patch identity. Jessica Drew. Roughouse. Bloodscream. Claremont noir.", "essential"),
    (2, "Back to Basics", "Wolverine #17-30", 14, "event-age", "Archie Goodwin/Larry Hama", "John Byrne/Marc Silvestri",
     "Back to basics. Acts of Vengeance crossover. Roughouse and Bloodscream continue. Larry Hama arrives.", "recommended"),
    (3, "Blood and Claws", "Wolverine #31-44", 14, "event-age", "Larry Hama", "Marc Silvestri",
     "Larry Hama defines the modern Wolverine. Sabretooth. Lady Deathstrike. Weapon X hints. The definitive Wolverine run begins.", "essential"),
    (6, "Inner Fury", "Wolverine #69-75", 7, "speculation-crash", "Larry Hama", "Dwayne Turner/Adam Kubert",
     "Fatal Attractions aftermath. Wolverine without adamantium. Bone claws revealed. Inner Fury.", "recommended"),
    (7, "To the Bone", "Wolverine #76-86", 11, "speculation-crash", "Larry Hama", "Adam Kubert",
     "Wolverine adapts to bone claws. Lady Deathstrike. Cyber. Generation X crossover. Nostalgia kicks in.", "recommended"),
    (8, "The Dying Game", "Wolverine #87-100", 14, "speculation-crash", "Larry Hama", "Adam Kubert/Val Semeiks",
     "Onslaught lead-in. Wolverine's devolution. Genesis attempts to re-bond adamantium (#100). Wolverine becomes feral.", "recommended"),
    (9, "Tooth and Claw", "Wolverine #101-109", 9, "heroes-reborn-return", "Larry Hama", "Val Semeiks",
     "Feral Wolverine. Elektra helps him regain humanity. Ogun returns. Viper marriage. The recovery arc.", "supplemental"),
    (12, "Shadow of Apocalypse", "Wolverine #133-149", 17, "marvel-knights-ultimate", "Erik Larsen/Fabian Nicieza", "Jeff Matsuda/Roger Cruz",
     "Shadow of Apocalypse. Wolverine gets adamantium back. Apocalypse makes him Death (Horseman). Return to X-Men status quo.", "recommended"),
    (13, "Blood Debt", "Wolverine #150-158", 9, "marvel-knights-ultimate", "Larry Hama/Steve Skroce", "Steve Skroce",
     "Blood Debt — Wolverine returns to Japan. Shigen legacy. The Hand. Adamantium Wolverine back in action.", "supplemental"),
    (14, "Return of Weapon X", "Wolverine #159-172", 14, "marvel-knights-ultimate", "Frank Tieri", "Sean Chen",
     "Return to Weapon X. The Weapon X program hunts mutants. Sabretooth. Lady Deathstrike. Government black ops.", "recommended"),
    (15, "Law of the Jungle", "Wolverine #173-189", 17, "marvel-knights-ultimate", "Frank Tieri", "Sean Chen/Various",
     "Alpha Flight crossover. Wendigo. Native American mythology. Law of the Jungle. Series transitions to Marvel Knights era.", "supplemental"),
]

for vol, sub, iss, cnt, era, wr, ar, syn, imp in wolv_epics:
    make_epic(f"wolverine-epic-v{vol}-{sub.lower().replace(' ','-').replace(chr(39),'')}", f"Wolverine Epic Collection: {sub}",
        iss, cnt, era, wr, ar, syn,
        f"Leads to: Wolverine Epic Vol. {vol+1}." if vol < 15 else "Leads to: Wolverine by Mark Millar.", importance=imp)

# X-FACTOR
xf_epics = [
    (1, "Genesis and Apocalypse", "X-Factor #1-9, Avengers #263", 10, "event-age", "Bob Layton/Louise Simonson", "Jackson Guice/Keith Pollard",
     "Original X-Men reunite: Cyclops, Jean Grey, Beast, Angel, Iceman. Apocalypse debuts. Mutant Massacre crossover begins.", "essential"),
    (3, "Angel of Death", "X-Factor #21-36", 16, "event-age", "Louise Simonson", "Walter Simonson",
     "Angel transformed into Archangel by Apocalypse. Fall of the Mutants. X-Factor goes public. Simonson's explosive art.", "essential"),
    (4, "Judgement War", "X-Factor #37-50", 14, "event-age", "Louise Simonson", "Walter Simonson/Paul Smith",
     "Judgement War on alien world. Celestials. Inferno crossover. Baby Nathan Christopher Summers (future Cable).", "recommended"),
    (7, "All-New All-Different X-Factor", "X-Factor #71-83", 13, "event-age", "Peter David", "Larry Stroman",
     "Peter David reinvents X-Factor as government-sponsored team. Havok, Polaris, Multiple Man, Strong Guy, Wolfsbane, Quicksilver. Humor and pathos.", "essential"),
    (8, "X-Aminations", "X-Factor #84-100", 17, "event-age", "Peter David", "Joe Quesada/Jan Duursema",
     "X-Cutioner's Song crossover. Genosha. Peter David's humor shines. Multiple Man's dupes. Strong Guy's heart condition.", "recommended"),
    (9, "Afterlives", "X-Factor #101-111", 11, "speculation-crash", "Todd DeZago/J.M. DeMatteis", "Jan Duursema/Bryan Hitch",
     "Post-Peter David transition. Havok struggles with leadership. Fatale. The Random truth. Age of Apocalypse prelude.", "supplemental"),
    (10, "Wreaking Havok", "X-Factor #112-126", 15, "speculation-crash", "Howard Mackie", "Jeff Matsuda/Eric Battle",
     "Dark Beast infiltrates. Havok joins the Dark Beast's team. Onslaught tie-in. Series concludes.", "supplemental"),
]

for vol, sub, iss, cnt, era, wr, ar, syn, imp in xf_epics:
    make_epic(f"x-factor-epic-v{vol}-{sub.lower().replace(' ','-')}", f"X-Factor Epic Collection: {sub}",
        iss, cnt, era, wr, ar, syn,
        f"Leads to: X-Factor Epic Vol. {vol+1}." if vol < 10 else "Series concludes.", importance=imp)

# X-FORCE
xfo_epics = [
    (1, "Under the Gun", "X-Force #1-15", 15, "speculation-crash", "Fabian Nicieza/Rob Liefeld", "Rob Liefeld",
     "X-Force launches from New Mutants. Cable leads. Shatterstar. Feral. Domino revealed as Copycat. Liefeld's explosive 90s energy.", "recommended"),
    (2, "X-Cutioners Song", "X-Force #16-19, Uncanny X-Men #294-297, X-Factor #84-86, X-Men #14-16", 16,
     "speculation-crash", "Fabian Nicieza/Peter David/Scott Lobdell", "Greg Capullo/Brandon Peterson",
     "X-Cutioner's Song crossover. Stryfe's plan. Cable vs. Stryfe. Professor X shot. Legacy Virus introduced.", "recommended"),
    (3, "Assault on Graymalkin", "X-Force #20-26, Cable #1-4", 11, "speculation-crash", "Fabian Nicieza", "Greg Capullo/Art Thibert",
     "Cable's space station Graymalkin. SHIELD confrontation. Reignfire saga begins. Cable solo series launches.", "supplemental"),
    (4, "Toy Soldiers", "X-Force #27-39", 13, "speculation-crash", "Fabian Nicieza", "Matt Broome/Tony Daniel",
     "Toy Soldiers. Arcade. Phalanx Covenant crossover. Rictor and Shatterstar dynamics. The team matures.", "supplemental"),
    (7, "Zero Tolerance", "X-Force #67-84", 18, "heroes-reborn-return", "John Francis Moore", "Adam Pollina/Jim Cheung",
     "Zero Tolerance crossover. Bastion's Sentinels. John Francis Moore revitalizes the series with road trip format.", "recommended"),
    (8, "Armageddon Now", "X-Force #85-100, X-Force (2001) #116-129", 31, "heroes-reborn-return",
     "John Francis Moore/Peter Milligan", "Jim Cheung/Mike Allred",
     "Series finale and relaunch as X-Statix precursor. Peter Milligan and Mike Allred completely reinvent the concept.", "recommended"),
]

for vol, sub, iss, cnt, era, wr, ar, syn, imp in xfo_epics:
    make_epic(f"x-force-epic-v{vol}-{sub.lower().replace(' ','-').replace(chr(39),'')}", f"X-Force Epic Collection: {sub}",
        iss, cnt, era, wr, ar, syn,
        f"Leads to: X-Force Epic Vol. {vol+1}." if vol < 8 else "Leads to: X-Statix.", importance=imp)

# X-MEN (vol 2-4, 9-10, 12, 17, 19-23)
xm_epics = [
    (2, "Lonely Are the Hunted", "X-Men #24-45", 22, "birth-of-marvel", "Roy Thomas", "Werner Roth",
     "Mimic joins. Banshee debut (#28). Juggernaut returns. Havok and Polaris introduced. Roy Thomas era.", "recommended"),
    (3, "The Sentinels Live", "X-Men #46-66", 21, "the-expansion", "Roy Thomas/Arnold Drake", "Don Heck/Werner Roth/Neal Adams",
     "Sentinels saga. Neal Adams arrives and reinvents X-Men visually. Havok and Polaris origin. Sauron debut. The series' artistic peak before cancellation.", "essential"),
    (4, "Its Always Darkest Before the Dawn", "X-Men #67-93", 27, "bronze-age", "Roy Thomas/Chris Claremont", "Various",
     "Reprint era. Secret X-Men stories. Brief new stories. #94 begins the new era with Giant-Size X-Men #1 team. Thunderbird dies.", "supplemental"),
    (9, "The Brood Saga", "Uncanny X-Men #154-167", 14, "rise-of-x-men", "Chris Claremont", "Dave Cockrum/Paul Smith",
     "The Brood Saga — Aliens-style horror as X-Men are implanted with Brood embryos. Binary (Carol Danvers) debuts. Wolverine's most savage moments.", "essential"),
    (10, "God Loves Man Kills", "Uncanny X-Men #168-175, Marvel Graphic Novel #5", 9, "rise-of-x-men",
     "Chris Claremont", "Paul Smith/Brent Anderson",
     "God Loves, Man Kills — Reverend Stryker's anti-mutant crusade. Inspired X2 film. Kitty Pryde's famous 'N-word' speech. Rogue joins.", "essential"),
    (12, "The Gift", "Uncanny X-Men #189-198", 10, "rise-of-x-men", "Chris Claremont", "John Romita Jr.",
     "Lifedeath — Storm loses her powers. Kulan Gath. Nimrod arrives. Forge and Storm's relationship. Rachel Summers (Phoenix II).", "recommended"),
    (17, "Dissolution and Rebirth", "Uncanny X-Men #248-267", 20, "event-age", "Chris Claremont", "Jim Lee/Marc Silvestri",
     "Jim Lee arrives. X-Men go through the Siege Perilous. Team scattered worldwide. Jubilee joins. Lady Mandarin Psylocke. Shadow King.", "essential"),
    (19, "Mutant Genesis", "X-Men (1991) #1-3, Uncanny X-Men #278-280", 6, "event-age",
     "Chris Claremont/Jim Lee", "Jim Lee/Whilce Portacio",
     "X-Men #1 — the best-selling comic book of all time (8.1 million copies). Blue and Gold teams. Magneto in space. Claremont's final arc.", "essential"),
    (20, "Bishops Crossing", "Uncanny X-Men #281-288, X-Men #4-9", 14, "event-age",
     "Jim Lee/Whilce Portacio/Scott Lobdell", "Whilce Portacio/Jim Lee",
     "Bishop arrives from the future. Trevor Fitzroy. Omega Red debut. Post-Claremont era begins.", "recommended"),
    (21, "The X-Cutioners Song", "Uncanny X-Men #289-296, X-Men #10-16", 14, "event-age",
     "Scott Lobdell/Fabian Nicieza", "Brandon Peterson/Andy Kubert",
     "X-Cutioner's Song crossover. Stryfe's plan against Cable and the X-Men. Legacy Virus introduced.", "recommended"),
    (22, "Legacies", "Uncanny X-Men #297-300, X-Men #17-20", 8, "speculation-crash",
     "Scott Lobdell/Fabian Nicieza", "Brandon Peterson/Andy Kubert",
     "Legacy Virus fallout. Upstarts. Fitzroy. Mikhail Rasputin. Illyana Rasputin dies of Legacy Virus.", "recommended"),
    (23, "Fatal Attractions", "Uncanny X-Men #301-306, X-Men #21-25, Wolverine #75", 12, "speculation-crash",
     "Scott Lobdell/Fabian Nicieza/Larry Hama", "John Romita Jr./Andy Kubert/Adam Kubert",
     "Fatal Attractions — Magneto rips the adamantium from Wolverine's skeleton (#25). Xavier mindwipes Magneto. One of the most iconic X-Men moments.", "essential"),
]

for vol, sub, iss, cnt, era, wr, ar, syn, imp in xm_epics:
    make_epic(f"xm-epic-v{vol}-{sub.lower().replace(' ','-').replace(chr(39),'').replace(',','')}", f"X-Men Epic Collection: {sub}",
        iss, cnt, era, wr, ar, syn,
        f"Leads to: X-Men Epic Vol. {vol+1}." if vol < 23 else "Leads to: X-Men Epic Vol. 24.", importance=imp)

# MODERN ERA EPICS
modern_epics = [
    ("annihilation-epic", "Annihilation Epic Collection: Annihilation Day", "Annihilation: Prologue, Annihilation #1-6, Nova #1-4, Silver Surfer #1-4, Super-Skrull #1-4, Ronan #1-4", 23,
     "bendis-avengers", "Keith Giffen/Dan Abnett/Andy Lanning", "Andrea DiVito/Scott Kolins", "The Annihilation Wave destroys the Kree homeworld. Nova leads the resistance. The cosmic renaissance begins.", "essential"),
    ("asm-modern-epic-coming-home", "Amazing Spider-Man Modern Era Epic Collection: Coming Home", "Amazing Spider-Man (1999) #30-45", 16,
     "marvel-knights-ultimate", "J. Michael Straczynski", "John Romita Jr.", "JMS reinvents Spider-Man. Morlun debut. Ezekiel. Totemic spider mythology. Aunt May discovers Peter's secret.", "essential"),
    ("astonishing-xm-epic-v1-gifted", "Astonishing X-Men Epic Collection: Gifted", "Astonishing X-Men #1-12", 12,
     "bendis-avengers", "Joss Whedon", "John Cassaday", "Whedon and Cassaday's acclaimed run. Mutant cure. Colossus returns from the dead. Danger Room sentience.", "essential"),
    ("astonishing-xm-epic-v2-unstoppable", "Astonishing X-Men Epic Collection: Unstoppable", "Astonishing X-Men #13-24, Giant-Size Astonishing X-Men #1", 13,
     "bendis-avengers", "Joss Whedon", "John Cassaday", "Breakworld saga. Kitty Pryde's sacrifice. The bullet. One of the most acclaimed modern X-Men runs.", "essential"),
    ("cap-modern-epic-winter-soldier", "Captain America Modern Era Epic Collection: The Winter Soldier", "Captain America (2004) #1-17", 17,
     "bendis-avengers", "Ed Brubaker", "Steve Epting", "Bucky is alive as the Winter Soldier. Brubaker reinvents Cap as espionage thriller. Red Skull. Cosmic Cube. Landmark modern run.", "essential"),
    ("cap-modern-epic-death-dream", "Captain America Modern Era Epic Collection: Death of the Dream", "Captain America #18-30", 13,
     "bendis-avengers", "Ed Brubaker", "Steve Epting/Mike Perkins", "Civil War aftermath. Captain America assassinated on courthouse steps. Bucky takes up the shield. Sharon Carter brainwashed.", "essential"),
    ("dark-avengers-epic", "Dark Avengers Epic Collection: Osborn's Reign", "Dark Avengers #1-16, Dark Reign: The List one-shots", 20,
     "bendis-avengers", "Brian Michael Bendis", "Mike Deodato", "Norman Osborn leads his Dark Avengers — villains in hero costumes. Sentry unhinged. Ares. Daken as Wolverine. Venom as Spider-Man.", "recommended"),
    ("dd-modern-epic-underboss", "Daredevil Modern Era Epic Collection: Underboss", "Daredevil (1998) #16-31", 16,
     "marvel-knights-ultimate", "Brian Michael Bendis", "Alex Maleev", "Bendis and Maleev redefine DD as noir crime fiction. Vanessa Fisk dies. Kingpin dethroned. Identity exposed to tabloid.", "essential"),
    ("dd-modern-epic-out", "Daredevil Modern Era Epic Collection: Out", "Daredevil (1998) #32-50", 19,
     "marvel-knights-ultimate", "Brian Michael Bendis", "Alex Maleev", "Matt Murdock outed as DD by tabloid. Trial of the Century. Milla Donovan. White Tiger murdered. Bendis at his peak.", "essential"),
    ("dd-modern-epic-king-hells-kitchen", "Daredevil Modern Era Epic Collection: King of Hell's Kitchen", "Daredevil (1998) #51-65", 15,
     "marvel-knights-ultimate", "Brian Michael Bendis", "Alex Maleev", "Matt declares himself Kingpin of Hell's Kitchen. Yakuza. FBI. The most controversial DD arc. Leads to prison.", "essential"),
    ("dd-modern-epic-cell-block-d", "Daredevil Modern Era Epic Collection: The Devil in Cell Block D", "Daredevil (1998) #82-94", 13,
     "bendis-avengers", "Ed Brubaker", "Michael Lark", "Brubaker and Lark. Matt in prison. Foggy seemingly killed. Punisher. DD fights for survival in Ryker's Island.", "essential"),
    ("deadpool-cable-epic", "Deadpool & Cable Epic Collection: Ballistic Bromance", "Cable & Deadpool #1-18", 18,
     "bendis-avengers", "Fabian Nicieza", "Mark Brooks/Patrick Zircher", "Cable and Deadpool forced to share a teleportation link. Odd couple team-up. Nicieza's humor with Cable's gravitas.", "recommended"),
    ("gotg-modern-epic-v1", "Guardians of the Galaxy Modern Era Epic Collection: Somebody's Got to Do It", "Guardians of the Galaxy (2008) #1-12", 12,
     "bendis-avengers", "Dan Abnett/Andy Lanning", "Paul Pelletier", "Star-Lord assembles: Gamora, Drax, Rocket Raccoon, Groot, Adam Warlock, Quasar. Post-Annihilation: Conquest. Knowhere base.", "essential"),
    ("gotg-modern-epic-v2", "Guardians of the Galaxy Modern Era Epic Collection: War of Kings", "Guardians of the Galaxy (2008) #13-25", 13,
     "bendis-avengers", "Dan Abnett/Andy Lanning", "Brad Walker/Wes Craig", "War of Kings tie-in. The Fault opens. Magus returns. Thanos resurrected. Realm of Kings. DnA cosmic at its peak.", "essential"),
    ("im-modern-epic-worlds-most-wanted", "Iron Man Modern Era Epic Collection: World's Most Wanted", "Invincible Iron Man (2008) #1-19", 19,
     "bendis-avengers", "Matt Fraction", "Salvador Larroca", "Dark Reign. Tony Stark erases his brain to keep the Registration database from Osborn. Running from HAMMER across the world.", "essential"),
    ("im-modern-epic-stark-disassembled", "Iron Man Modern Era Epic Collection: Stark Disassembled", "Invincible Iron Man #20-33", 14,
     "bendis-avengers", "Matt Fraction", "Salvador Larroca", "Tony Stark reboots his brain. Pepper Potts as Rescue. Heroic Age begins. The restoration of Tony Stark.", "recommended"),
    ("loki-epic-v1-journey-into-mystery", "Loki Epic Collection: Journey into Mystery", "Journey into Mystery #622-636", 15,
     "hickman-saga", "Kieron Gillen", "Doug Braithwaite/Rich Elson", "Kid Loki! Reborn as a child. Fear Itself tie-in. Loki schemes to save Asgard while everyone suspects the worst. Beloved run.", "essential"),
    ("loki-epic-v2-everything-burns", "Loki Epic Collection: Everything Burns", "Journey into Mystery #637-645, Mighty Thor #18-22", 12,
     "hickman-saga", "Kieron Gillen", "Carmine Di Giandomenico", "Everything Burns crossover with Mighty Thor. Surtur. The tragic conclusion of Kid Loki's story. Heartbreaking.", "essential"),
    ("miles-morales-epic-v1", "Miles Morales: Spider-Man Epic Collection: Hero in Training", "Ultimate Comics Spider-Man #1-12", 12,
     "hickman-saga", "Brian Michael Bendis", "Sara Pichelli", "Miles Morales becomes Spider-Man after Peter Parker's death (Ultimate Universe). Origin. Uncle Aaron. A new era of Spider-Man.", "essential"),
    ("new-avengers-epic-v1-assembled", "New Avengers Epic Collection: Assembled", "Avengers #500-503, New Avengers #1-10", 14,
     "bendis-avengers", "Brian Michael Bendis", "David Finch", "Avengers Disassembled — Scarlet Witch destroys the Avengers. Breakout at the Raft forms the New Avengers. Sentry. Spider-Woman. Luke Cage.", "essential"),
    ("new-avengers-epic-v2-civil-war", "New Avengers Epic Collection: Civil War", "New Avengers #11-25, New Avengers: Illuminati", 16,
     "bendis-avengers", "Brian Michael Bendis", "Leinil Francis Yu", "Civil War from the anti-registration perspective. The New Avengers go underground. Illuminati revealed: Iron Man, Reed, Strange, Namor, Xavier, Black Bolt.", "essential"),
    ("nxm-epic-e-is-extinction", "New X-Men Epic Collection: E Is for Extinction", "New X-Men #114-126", 13,
     "marvel-knights-ultimate", "Grant Morrison", "Frank Quitely/Ethan Van Sciver", "Morrison reinvents the X-Men. Cassandra Nova destroys Genosha. Xorn. Jean's Phoenix manifestation. Revolutionary.", "essential"),
    ("spider-girl-epic-v1", "Spider-Girl Epic Collection: Legacy", "Spider-Girl #1-12, What If #105", 13,
     "heroes-reborn-return", "Tom DeFalco", "Pat Olliffe", "May 'Mayday' Parker, Peter and MJ's daughter, becomes Spider-Girl in an alternate future. Fun, classic-style superhero stories.", "recommended"),
    ("ult-ff-epic-v1", "Ultimate Fantastic Four Epic Collection: The Fantastic", "Ultimate Fantastic Four #1-18", 18,
     "marvel-knights-ultimate", "Brian Michael Bendis/Mark Millar", "Adam Kubert", "The Ultimate Universe FF. Teen geniuses. The N-Zone. Doctor Doom reimagined. Nihil. Fresh modern take.", "recommended"),
    ("ult-spider-man-epic-v1", "Ultimate Spider-Man Epic Collection: Learning Curve", "Ultimate Spider-Man #1-13", 13,
     "marvel-knights-ultimate", "Brian Michael Bendis", "Mark Bagley", "The modern Spider-Man origin. Peter Parker in the 21st century. Green Goblin. Kingpin. The definitive Ultimate title.", "essential"),
    ("ult-xm-epic-v1", "Ultimate X-Men Epic Collection: The Tomorrow Children", "Ultimate X-Men #1-12", 12,
     "marvel-knights-ultimate", "Mark Millar", "Adam Kubert/Andy Kubert", "Millar's edgy Ultimate X-Men. Magneto as terrorist. Brotherhood attacks. Weapon X program. Sentinel attacks.", "recommended"),
    ("ultimates-epic-v1", "The Ultimates Epic Collection: Super-Human", "The Ultimates #1-13", 13,
     "marvel-knights-ultimate", "Mark Millar", "Bryan Hitch", "The Ultimates — the Avengers reimagined as a government black-ops team. Widescreen action. Directly inspired the MCU Avengers films.", "essential"),
]

for slug, title, iss, cnt, era, wr, ar, syn, imp in modern_epics:
    make_epic(slug, title, iss, cnt, era, wr, ar, syn,
        "See related omnibus for expanded content." if imp == "essential" else "Standalone epic collection.",
        importance=imp)

# ============================================================
# PREMIER COLLECTIONS (all 11)
# ============================================================
make_premier("premier-dd-born-again", "Marvel Premier Collection: Daredevil — Born Again",
    "Daredevil #226-233", 8, "event-age", "Frank Miller", "David Mazzucchelli",
    "Kingpin destroys Matt Murdock's life. Karen Page sells his identity for drugs. Matt's descent and redemption. One of the greatest superhero stories ever told.",
    "Budget entry point. See also: DD by Miller & Janson Omnibus.", "essential", "978-1302965983")

make_premier("premier-bp-nation", "Marvel Premier Collection: Black Panther — A Nation Under Our Feet",
    "Black Panther (2016) #1-12", 12, "all-new-all-different", "Ta-Nehisi Coates", "Brian Stelfreeze",
    "T'Challa faces a populist revolution in Wakanda. Coates brings literary depth to the Black Panther. The Midnight Angels. Political allegory.",
    "Budget entry point for modern Black Panther.", "recommended", "978-1302964856")

make_premier("premier-cap-winter-soldier", "Marvel Premier Collection: Captain America — The Winter Soldier",
    "Captain America (2004) #1-9, #11-14", 13, "bendis-avengers", "Ed Brubaker", "Steve Epting",
    "Bucky Barnes is alive as the Winter Soldier, a brainwashed Soviet assassin. Brubaker reinvents Cap as an espionage thriller. Red Skull. Cosmic Cube.",
    "Budget entry point. See also: Cap by Brubaker Omnibus Vol. 1.", "essential", "978-1302964863")

make_premier("premier-ff-solve-everything", "Marvel Premier Collection: Fantastic Four — Solve Everything",
    "Fantastic Four (1998) #570-588", 19, "hickman-saga", "Jonathan Hickman", "Dale Eaglesham/Steve Epting",
    "Council of Reeds — infinite Reed Richards across the multiverse. War of Four Cities. Johnny Storm dies (#587). Personally curated by Hickman.",
    "Budget entry point for Hickman FF. See also: FF Hickman Omnibus Vol. 1.", "essential", "9781302964870")

make_premier("premier-civil-war", "Marvel Premier Collection: Civil War",
    "Civil War #1-7", 7, "bendis-avengers", "Mark Millar", "Steve McNiven",
    "Superhero Registration Act splits the Marvel Universe. Iron Man vs. Captain America. Spider-Man unmasks. Cap surrenders. Marvel's most impactful modern event.",
    "Budget entry point. See also: Civil War TPB/Omnibus.", "essential", "9781302965549")

make_premier("premier-old-man-logan", "Marvel Premier Collection: Wolverine — Old Man Logan",
    "Wolverine (1988) #66-72, Wolverine: Old Man Logan Giant-Size #1", 8, "bendis-avengers",
    "Mark Millar", "Steve McNiven",
    "Alternate future. Wolverine hasn't popped his claws in 50 years. Villains won. Blind Hawkeye road trip across a broken America. Hulk Gang. Brutal and beautiful.",
    "Budget entry point. Standalone story.", "recommended", "9781302965587")

make_premier("premier-hawkeye", "Marvel Premier Collection: Hawkeye — My Life As A Weapon",
    "Hawkeye (2012) #1-11, Young Avengers Presents #6", 12, "hickman-saga",
    "Matt Fraction", "David Aja",
    "Hawkeye off-duty. Clint Barton and Kate Bishop vs. the Tracksuit Mafia. Aja's innovative layouts. Pizza Dog issue (#11). Eisner-winning masterpiece.",
    "Budget entry point. See also: Hawkeye by Fraction & Aja Omnibus.", "essential", "9781302965556")

make_premier("premier-vision", "Marvel Premier Collection: The Vision",
    "Vision (2015) #1-12", 12, "all-new-all-different", "Tom King", "Gabriel Hernandez Walta",
    "Vision creates a synthetic family and moves to the suburbs. Suburban horror meets superhero pathos. One of Marvel's greatest limited series.",
    "Standalone masterpiece. Essential reading.", "essential")

make_premier("premier-planet-hulk", "Marvel Premier Collection: Planet Hulk",
    "Incredible Hulk #92-105, Giant-Size Hulk #1", 15, "bendis-avengers", "Greg Pak", "Carlo Pagulayan/Aaron Lopresti",
    "Hulk exiled to alien planet Sakaar. Becomes a gladiator king. Caiera. The Warbound. Leads directly to World War Hulk.",
    "Budget entry point. See also: Planet Hulk Omnibus.", "essential")

make_premier("premier-punisher-welcome-back", "Marvel Premier Collection: Punisher — Welcome Back, Frank",
    "Punisher (2000) #1-12", 12, "marvel-knights-ultimate", "Garth Ennis", "Steve Dillon",
    "Ennis and Dillon redefine the Punisher with dark humor and ultraviolence. Ma Gnucci. The Russian. Mr. Bumpo. Spacker Dave. The definitive modern Punisher.",
    "Budget entry point. See also: Punisher by Ennis Omnibus.", "recommended")

make_premier("premier-spider-men", "Marvel Premier Collection: Spider-Men — Worlds Collide",
    "Spider-Men #1-5, Spider-Men II #1-5", 10, "hickman-saga", "Brian Michael Bendis", "Sara Pichelli",
    "Peter Parker meets Miles Morales for the first time. 616 and Ultimate universes collide. Multiverse implications. Pichelli's stunning art.",
    "Budget entry point for Miles/Peter crossover.", "recommended")

with open("/tmp/editions_part4.json", "w") as f:
    json.dump(editions, f, indent=4)
print(f"Part 4 done: {len(editions)} editions")
