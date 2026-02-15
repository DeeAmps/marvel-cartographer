#!/usr/bin/env python3
"""Part 2: AWC, Black Panther, Black Widow, Cap, Daredevil, Deadpool, Defenders, Doctor Strange."""
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

# AVENGERS WEST COAST
make_epic("awc-epic-v1-west-was-won", "Avengers West Coast Epic Collection: How the West Was Won",
    "West Coast Avengers Limited Series #1-4, West Coast Avengers #1-7", 11, "event-age",
    "Steve Englehart", "Al Milgrom",
    "Hawkeye leads a new West Coast team: Mockingbird, Wonder Man, Tigra, Iron Man (Rhodey). Team establishes in LA.",
    "Leads to: AWC Epic Vol. 2.")

make_epic("awc-epic-v2-lost-in-space-time", "Avengers West Coast Epic Collection: Lost in Space-Time",
    "West Coast Avengers #8-24", 17, "event-age", "Steve Englehart", "Al Milgrom",
    "The team is scattered across time. Old West adventure. Egyptian era. Firebird joins.",
    "Leads to: AWC Epic Vol. 3.")

make_epic("awc-epic-v3-tales-to-astonish", "Avengers West Coast Epic Collection: Tales to Astonish",
    "West Coast Avengers #25-37", 13, "event-age", "Steve Englehart", "Al Milgrom",
    "Zodiac attacks. Phantom Rider's dark obsession with Mockingbird. Night Shift debuts.",
    "Leads to: AWC Epic Vol. 4.")

make_epic("awc-epic-v4-vision-quest", "Avengers West Coast Epic Collection: Vision Quest",
    "West Coast Avengers #38-52", 15, "event-age", "John Byrne", "John Byrne",
    "Vision dismantled and rebuilt without emotions. Scarlet Witch's children revealed as Mephisto fragments. U.S. Agent replaces Cap.",
    "Seeds of Wanda's future breakdowns (Disassembled, House of M).", importance="essential")

make_epic("awc-epic-v5-darker-than-scarlet", "Avengers West Coast Epic Collection: Darker Than Scarlet",
    "West Coast Avengers #53-64", 12, "event-age", "John Byrne", "John Byrne/Paul Ryan",
    "Scarlet Witch goes insane after losing her children. Magneto manipulates her. Master Pandemonium.",
    "Seeds of Disassembled and House of M.", importance="essential")

make_epic("awc-epic-v6-california-screamin", "Avengers West Coast Epic Collection: California Screamin'",
    "Avengers West Coast #65-82", 18, "event-age", "Roy Thomas/Dann Thomas", "Paul Ryan/Dave Ross",
    "Renamed to Avengers West Coast. Pacific Overlords. Spider-Woman (Julia Carpenter) joins. Galactic Storm tie-in.",
    "Leads to: AWC Epic Vol. 7.")

make_epic("awc-epic-v7-ultron-unbound", "Avengers West Coast Epic Collection: Ultron Unbound",
    "Avengers West Coast #83-95", 13, "speculation-crash", "Roy Thomas/Dann Thomas", "Dave Ross",
    "Ultron's most devastating attack yet. Lethal Legion. The team faces final challenges before disbanding.",
    "Series concludes.")

# BLACK PANTHER
make_epic("bp-epic-v1-panthers-rage", "Black Panther Epic Collection: Panther's Rage",
    "Jungle Action #6-24", 19, "bronze-age", "Don McGregor", "Rich Buckler/Billy Graham",
    "The first major Black Panther solo saga. T'Challa returns to Wakanda to face Erik Killmonger. Groundbreaking in its scope and Afrocentric storytelling.",
    "Essential Black Panther reading. Precursor to modern BP runs.", importance="essential")

make_epic("bp-epic-v2-revenge", "Black Panther Epic Collection: Revenge of the Black Panther",
    "Black Panther (1977) #1-15, Black Panther (1988) #1-4", 19, "bronze-age",
    "Jack Kirby/Peter B. Gillis", "Jack Kirby/Denys Cowan",
    "Kirby returns to write and draw Black Panther. King Solomon's Frog. The Sacred Water-Skin. Wild sci-fi adventure.",
    "Kirby's unique take on Black Panther.")

# BLACK WIDOW
make_epic("bw-epic-v1-beware", "Black Widow Epic Collection: Beware the Black Widow",
    "Amazing Adventures #1-8, Amazing Spider-Man #86, Daredevil #81-124 (select)", 20, "bronze-age",
    "Gary Friedrich/Gerry Conway", "Gene Colan/Don Heck",
    "Natasha's early solo adventures. San Francisco partnership with Daredevil. Establishing the Widow as a solo hero.",
    "Leads to: Black Widow's Daredevil partnership.")

# CAPTAIN AMERICA (vol 1, 3-6, 12-22)
make_epic("cap-epic-v1-lives-again", "Captain America Epic Collection: Captain America Lives Again",
    "Tales of Suspense #58-99, Captain America #100", 43, "birth-of-marvel",
    "Stan Lee", "Jack Kirby/Gene Colan",
    "Cap's Silver Age adventures in Tales of Suspense. Batroc debut (#75). Cosmic Cube saga. Red Skull schemes. Cap gets his own title with #100.",
    "Leads to: Cap Epic Vol. 2.", importance="essential")

make_epic("cap-epic-v3-bucky-reborn", "Captain America Epic Collection: Bucky Reborn",
    "Captain America #120-138", 19, "bronze-age", "Stan Lee/Gary Friedrich", "Gene Colan",
    "Falcon partnership deepens. AIM and MODOK. Diamond Head. Grey Gargoyle. Cap and Falcon become an inseparable team.",
    "Leads to: Cap Epic Vol. 4.")

make_epic("cap-epic-v4-hero-or-hoax", "Captain America Epic Collection: Hero or Hoax?",
    "Captain America #139-159", 21, "bronze-age", "Gary Friedrich/Steve Englehart", "Sal Buscema/John Romita Sr.",
    "Steve Englehart's run begins. 1950s Cap revealed. Falcon gains wings. Grey Gargoyle. Viper I.",
    "Leads to: Cap Epic Vol. 5.")

make_epic("cap-epic-v5-secret-empire", "Captain America Epic Collection: The Secret Empire",
    "Captain America #160-179", 20, "bronze-age", "Steve Englehart", "Sal Buscema",
    "Secret Empire storyline — Watergate allegory. The President is the villain (#175). Cap abandons his identity, becomes Nomad.",
    "One of the most politically important Cap stories.", importance="essential")

make_epic("cap-epic-v6-man-who-sold-us", "Captain America Epic Collection: The Man Who Sold the United States",
    "Captain America #180-200", 21, "bronze-age", "Steve Englehart/Jack Kirby", "Sal Buscema/Frank Robbins",
    "Cap returns to the shield. Jack Kirby returns to write and draw. Arnim Zola debut. Madbomb saga.",
    "Leads to: Cap Epic Vol. 7.")

make_epic("cap-epic-v12-society-serpents", "Captain America Epic Collection: Society of Serpents",
    "Captain America #302-317", 16, "rise-of-x-men", "Mark Gruenwald", "Paul Neary",
    "Mark Gruenwald's legendary run. Serpent Society saga. Armadillo. Flag-Smasher. Nomad (Jack Monroe) returns.",
    "Leads to: Cap Epic Vol. 13.")

make_epic("cap-epic-v13-justice-served", "Captain America Epic Collection: Justice is Served",
    "Captain America #318-332", 15, "event-age", "Mark Gruenwald", "Paul Neary/Tom Morgan",
    "Scourge of the Underworld murders villains. Cap hunts the killer. D-Man introduced. Serpent Society continues.",
    "Leads to: Cap Epic Vol. 14.")

make_epic("cap-epic-v14-the-captain", "Captain America Epic Collection: The Captain",
    "Captain America #333-350", 18, "event-age", "Mark Gruenwald", "Kieron Dwyer/Tom Morgan",
    "Steve Rogers stripped of the Captain America identity. John Walker becomes Cap. Rogers becomes The Captain. Iconic 'Streets of Poison' arc.",
    "One of Gruenwald's best arcs.", importance="essential")

make_epic("cap-epic-v15-bloodstone-hunt", "Captain America Epic Collection: The Bloodstone Hunt",
    "Captain America #351-371", 21, "event-age", "Mark Gruenwald", "Kieron Dwyer",
    "Crossbones debut. The Bloodstone Hunt — globe-trotting adventure. Diamondback romance deepens. Acts of Vengeance crossover.",
    "Leads to: Cap Epic Vol. 16.")

make_epic("cap-epic-v16-streets-poison", "Captain America Epic Collection: Streets of Poison",
    "Captain America #372-386", 15, "event-age", "Mark Gruenwald", "Ron Lim",
    "Streets of Poison — Cap exposed to drugs, goes berserk. Super-Soldier serum removed. Daredevil crossover. Bullseye.",
    "Leads to: Cap Epic Vol. 17.")

make_epic("cap-epic-v17-superia-stratagem", "Captain America Epic Collection: The Superia Stratagem",
    "Captain America #387-397", 11, "event-age", "Mark Gruenwald", "Rik Levins",
    "Superia and the Femizons. Galactic Storm tie-in. Cap faces a female supremacist army.",
    "Leads to: Cap Epic Vol. 18.")

make_epic("cap-epic-v18-blood-and-glory", "Captain America Epic Collection: Blood and Glory",
    "Captain America #398-410", 13, "event-age", "Mark Gruenwald", "Rik Levins",
    "Infinity War crossover. Cap and Punisher team up in Blood and Glory. Operation: Galactic Storm aftermath.",
    "Leads to: Cap Epic Vol. 19.")

make_epic("cap-epic-v19-arena-of-death", "Captain America Epic Collection: Arena of Death",
    "Captain America #411-419", 9, "speculation-crash", "Mark Gruenwald", "Rik Levins/Dave Hoover",
    "Cap forced into arena combat. AIM's Cosmic Cube. Serpent Society returns. Fighting Chance arc begins.",
    "Leads to: Cap Epic Vol. 20.")

make_epic("cap-epic-v20-fighting-chance", "Captain America Epic Collection: Fighting Chance",
    "Captain America #420-430", 11, "speculation-crash", "Mark Gruenwald", "Dave Hoover",
    "Cap's Super-Soldier serum deteriorating. Armor era. Free Spirit and Jack Flag introduced.",
    "Leads to: Cap Epic Vol. 21.")

make_epic("cap-epic-v21-twilights-last-gleaming", "Captain America Epic Collection: Twilight's Last Gleaming",
    "Captain America #431-443", 13, "speculation-crash", "Mark Gruenwald", "Dave Hoover",
    "Cap faces his own mortality. Gruenwald's run concludes. Onslaught crossover lead-in.",
    "Leads to: Cap Epic Vol. 22.")

make_epic("cap-epic-v22-man-without-country", "Captain America Epic Collection: Man Without a Country",
    "Captain America #444-454", 11, "heroes-reborn-return", "Mark Waid", "Ron Garney",
    "Mark Waid and Ron Garney revitalize Captain America. Sharon Carter returns. Cap banished from America then returns.",
    "Budget alternative to Cap by Waid & Garney Omnibus.", importance="recommended")

# DAREDEVIL (vol 2-7, 12, 14-21)
make_epic("dd-epic-v2-mike-murdock", "Daredevil Epic Collection: Mike Murdock Must Die!",
    "Daredevil #22-41", 20, "birth-of-marvel", "Stan Lee", "Gene Colan",
    "Matt Murdock creates the 'Mike Murdock' fake twin brother identity. Gene Colan defines DD's visual style. Owl and Jester appear.",
    "Leads to: DD Epic Vol. 3.")

make_epic("dd-epic-v3-brother-take-my-hand", "Daredevil Epic Collection: Brother, Take My Hand",
    "Daredevil #42-63", 22, "the-expansion", "Stan Lee/Roy Thomas", "Gene Colan",
    "Stilt-Man returns. Mr. Fear. Captain America crossover. DD moves to San Francisco.",
    "Leads to: DD Epic Vol. 4.")

make_epic("dd-epic-v4-woman-called-widow", "Daredevil Epic Collection: A Woman Called Widow",
    "Daredevil #64-86", 23, "bronze-age", "Gerry Conway/Steve Gerber", "Gene Colan",
    "Black Widow partnership begins. San Francisco era. Mr. Fear returns. Electro. Purple Man.",
    "Leads to: DD Epic Vol. 5.")

make_epic("dd-epic-v5-going-out-west", "Daredevil Epic Collection: Going Out West",
    "Daredevil #87-107", 21, "bronze-age", "Gerry Conway/Steve Gerber", "Gene Colan/Bob Brown",
    "Black Widow leaves. Moondragon appears. Dark Messiah. Blue Talon. DD returns to New York.",
    "Leads to: DD Epic Vol. 6.")

make_epic("dd-epic-v6-watch-out-bullseye", "Daredevil Epic Collection: Watch Out for Bullseye",
    "Daredevil #108-132", 25, "bronze-age", "Marv Wolfman/Jim Shooter", "Bob Brown/Gil Kane",
    "Bullseye's first appearance (#131). Death-Stalker saga. Jester returns. The arrival of DD's deadliest foe.",
    "Bullseye's debut is a key moment. Leads to: DD Epic Vol. 7.", importance="essential")

make_epic("dd-epic-v7-concrete-jungle", "Daredevil Epic Collection: The Concrete Jungle",
    "Daredevil #133-154", 22, "rise-of-x-men", "Marv Wolfman/Roger McKenzie", "Sal Buscema/Gene Colan",
    "Paladin debut. Torpedo. Death of Death-Stalker. Gene Colan returns. Lead-up to Frank Miller's run.",
    "Leads to: DD by Frank Miller.")

make_epic("dd-epic-v12-claws", "Daredevil Epic Collection: It Comes with the Claws",
    "Daredevil #234-252", 19, "event-age", "Ann Nocenti", "John Romita Jr.",
    "Ann Nocenti and John Romita Jr. explore social issues. Typhoid Mary debut (#254 context). Mephisto. Inferno crossover.",
    "Budget alternative to DD by Nocenti Omnibus.")

make_epic("dd-epic-v14-heart-darkness", "Daredevil Epic Collection: Heart of Darkness",
    "Daredevil #271-282", 12, "event-age", "Ann Nocenti", "John Romita Jr.",
    "DD in Hell's Kitchen's darkest corners. Mephisto manipulations. Nocenti's socially conscious writing at its peak.",
    "Leads to: DD Epic Vol. 15.")

make_epic("dd-epic-v15-last-rites", "Daredevil Epic Collection: Last Rites",
    "Daredevil #283-300", 18, "event-age", "Ann Nocenti/D.G. Chichester", "Lee Weeks",
    "Last Rites — Kingpin's empire falls. Milestone #300 issue. D.G. Chichester takes over.",
    "Leads to: DD Epic Vol. 16.")

make_epic("dd-epic-v16-dead-mans-hand", "Daredevil Epic Collection: Dead Man's Hand",
    "Daredevil #301-311", 11, "event-age", "D.G. Chichester", "Scott McDaniel",
    "Dead Man's Hand crossover with Punisher and Nomad. The Hand returns. Kingpin rebuilds.",
    "Leads to: DD Epic Vol. 17.")

make_epic("dd-epic-v17-into-fire", "Daredevil Epic Collection: Into the Fire",
    "Daredevil #312-318", 7, "speculation-crash", "D.G. Chichester", "Scott McDaniel",
    "DD armored costume era. Identity crisis. The character goes through an extreme 90s makeover.",
    "Leads to: DD Epic Vol. 18.")

make_epic("dd-epic-v18-fall-from-grace", "Daredevil Epic Collection: Fall from Grace",
    "Daredevil #319-332", 14, "speculation-crash", "D.G. Chichester", "Scott McDaniel",
    "Fall from Grace — new costume, new attitude. Elektra returns. Venom cameo. Edge of the 90s excess.",
    "Leads to: DD Epic Vol. 19.")

make_epic("dd-epic-v19-root-of-evil", "Daredevil Epic Collection: Root of Evil",
    "Daredevil #333-344", 12, "speculation-crash", "D.G. Chichester/J.M. DeMatteis", "Ron Wagner",
    "Root of Evil storyline. DD faces inner demons. Series quality declines before the Marvel Knights relaunch.",
    "Leads to: DD Epic Vol. 20.")

make_epic("dd-epic-v20-purgatory-paradise", "Daredevil Epic Collection: Purgatory & Paradise",
    "Daredevil #345-364", 20, "heroes-reborn-return", "Karl Kesel/Joe Kelly", "Cary Nord",
    "Lighter tone era. DD fakes his death and returns. Mr. Fear. Stunt-Master. Lead-up to Marvel Knights relaunch.",
    "Leads to: DD Epic Vol. 21.")

make_epic("dd-epic-v21-widows-kiss", "Daredevil Epic Collection: Widow's Kiss",
    "Daredevil #365-380", 16, "marvel-knights-ultimate", "Joe Kelly/Scott Lobdell", "Ariel Olivetti",
    "Black Widow returns. Karen Page's final appearances. Lead-in to Kevin Smith's Marvel Knights Daredevil.",
    "Leads to: DD by Kevin Smith (Marvel Knights).")

# DEADPOOL
make_epic("deadpool-epic-v1-circle-chase", "Deadpool Epic Collection: The Circle Chase",
    "Deadpool: The Circle Chase #1-4, New Mutants #98, Deadpool (1994) #1-4", 9, "speculation-crash",
    "Fabian Nicieza/Mark Waid", "Joe Madureira/Ian Churchill",
    "Deadpool's first solo outings. The Circle Chase mini-series. The Merc with a Mouth finds his voice.",
    "Leads to: Deadpool Epic Vol. 2.")

make_epic("deadpool-epic-v2-mission-improbable", "Deadpool Epic Collection: Mission Improbable",
    "Deadpool (1997) #1-9", 9, "heroes-reborn-return", "Joe Kelly", "Ed McGuinness",
    "Joe Kelly's legendary Deadpool run begins. Fourth-wall breaking humor. Blind Al. Weasel. T-Ray. The run that defined Deadpool.",
    "Essential Deadpool. Leads to: Deadpool Epic Vol. 3.", importance="essential")

make_epic("deadpool-epic-v3-drowning-man", "Deadpool Epic Collection: The Drowning Man",
    "Deadpool (1997) #10-20", 11, "heroes-reborn-return", "Joe Kelly", "Ed McGuinness/Walter McDaniel",
    "Deadpool infiltrates the Avengers. Time travel adventure. Ajax appears. The series hits its comedic stride.",
    "Leads to: Deadpool Epic Vol. 4.")

make_epic("deadpool-epic-v4-dead-reckoning", "Deadpool Epic Collection: Dead Reckoning",
    "Deadpool (1997) #21-33", 13, "marvel-knights-ultimate", "Joe Kelly/Christopher Priest", "McGuinness/Diaz",
    "Kelly's run concludes. Christopher Priest takes over briefly. Deadpool faces existential crisis.",
    "Leads to: Deadpool Epic Vol. 5.")

make_epic("deadpool-epic-v5-johnny-handsome", "Deadpool Epic Collection: Johnny Handsome",
    "Deadpool (1997) #34-45", 12, "marvel-knights-ultimate", "Christopher Priest/Buddy Scalera", "Paco Diaz",
    "Deadpool gets a new face. Agent X saga begins. The series transitions between creative teams.",
    "Leads to: Cable & Deadpool era.")

# DEFENDERS
make_epic("defenders-epic-v1-day-of-defenders", "Defenders Epic Collection: Day of the Defenders",
    "Marvel Feature #1-3, Defenders #1-11", 14, "bronze-age", "Roy Thomas/Steve Englehart", "Ross Andru/Sal Buscema",
    "The non-team forms: Hulk, Doctor Strange, Namor. Silver Surfer joins. Avengers/Defenders crossover setup.",
    "Leads to: Defenders Epic Vol. 2.")

make_epic("defenders-epic-v2-enter-headmen", "Defenders Epic Collection: Enter: The Headmen",
    "Defenders #12-25", 14, "bronze-age", "Steve Englehart/Len Wein", "Sal Buscema",
    "Headmen debut. Guardians of the Galaxy (original team) crossover. Son of Satan. Yellowjacket and Valkyrie.",
    "Leads to: Defenders Epic Vol. 3.")

make_epic("defenders-epic-v6-six-fingered-hand", "Defenders Epic Collection: The Six-Fingered Hand",
    "Defenders #92-109", 18, "rise-of-x-men", "J.M. DeMatteis", "Don Perlin",
    "The Six-Fingered Hand demon saga. J.M. DeMatteis explores cosmic horror and mysticism. Gargoyle joins.",
    "Leads to: Defenders Epic Vol. 7.")

make_epic("defenders-epic-v7-ashes-ashes", "Defenders Epic Collection: Ashes, Ashes",
    "Defenders #110-125", 16, "rise-of-x-men", "J.M. DeMatteis", "Don Perlin",
    "Squadron Supreme crossover. Elf with a Gun mystery. The team faces dissolution.",
    "Leads to: Defenders Epic Vol. 8.")

make_epic("defenders-epic-v8-new-defenders", "Defenders Epic Collection: The New Defenders",
    "Defenders #126-137", 12, "rise-of-x-men", "J.M. DeMatteis/Peter B. Gillis", "Don Perlin/Alan Kupperberg",
    "Beast, Angel, and Iceman from X-Men join. The New Defenders era begins. Team restructures.",
    "Leads to: Defenders Epic Vol. 9.")

make_epic("defenders-epic-v9-end-of-all-songs", "Defenders Epic Collection: The End of All Songs",
    "Defenders #138-152", 15, "rise-of-x-men", "Peter B. Gillis", "Don Perlin",
    "The Defenders' final saga. Series concludes. Angel, Beast, and Iceman move on to X-Factor.",
    "Series finale. Leads to: X-Factor Epic Vol. 1.")

# DOCTOR STRANGE
make_epic("ds-epic-v1-master-mystic-arts", "Doctor Strange Epic Collection: Master of the Mystic Arts",
    "Strange Tales #110-111, #114-146", 35, "birth-of-marvel", "Stan Lee", "Steve Ditko",
    "Doctor Strange's origin and early adventures by Lee and Ditko. Dormammu, Baron Mordo, the Ancient One. Ditko's psychedelic dimensions define the character.",
    "Essential. Leads to: DS Epic Vol. 2.", importance="essential")

make_epic("ds-epic-v2-i-dormammu", "Doctor Strange Epic Collection: I, Dormammu",
    "Strange Tales #147-168, Doctor Strange #169-179", 23, "the-expansion",
    "Roy Thomas/Dennis O'Neil", "Gene Colan/Dan Adkins",
    "Dormammu saga continues. Eternity. Strange gets his own title. Gene Colan brings gothic atmosphere.",
    "Leads to: DS Epic Vol. 3.")

make_epic("ds-epic-v3-separate-reality", "Doctor Strange Epic Collection: A Separate Reality",
    "Doctor Strange #180-183, Marvel Premiere #3-14, Doctor Strange (1974) #1-5", 22, "bronze-age",
    "Steve Englehart", "Frank Brunner",
    "Steve Englehart and Frank Brunner's acclaimed run. Shuma-Gorath. Silver Dagger. Psychedelic cosmic horror at its peak.",
    "One of the greatest DS runs. Leads to: DS Epic Vol. 4.", importance="essential")

make_epic("ds-epic-v4-alone-against-eternity", "Doctor Strange Epic Collection: Alone Against Eternity",
    "Doctor Strange (1974) #6-28", 23, "bronze-age", "Steve Englehart/Marv Wolfman", "Gene Colan",
    "Strange faces cosmic threats alone. Gene Colan's moody artwork. Clea's expanded role.",
    "Leads to: DS Epic Vol. 5.")

make_epic("ds-epic-v5-reality-war", "Doctor Strange Epic Collection: The Reality War",
    "Doctor Strange (1974) #29-51", 23, "bronze-age", "Roger Stern/Ralph Macchio", "Tom Sutton/Marshall Rogers",
    "Reality War. Dweller-in-Darkness. Roger Stern writes. Strange faces threats to the fabric of reality itself.",
    "Leads to later DS volumes.")

make_epic("ds-epic-v8-triumph-torment", "Doctor Strange Epic Collection: Triumph and Torment",
    "Doctor Strange, Sorcerer Supreme #1-13, Doctor Strange & Doctor Doom: Triumph and Torment GN", 14, "event-age",
    "Peter B. Gillis/Roger Stern", "Richard Case/Mike Mignola",
    "New Sorcerer Supreme series launches. Triumph and Torment with Doctor Doom is a masterpiece — Doom and Strange journey to Hell to save Doom's mother.",
    "Triumph and Torment is essential. Leads to: DS Epic Vol. 9.", importance="essential")

make_epic("ds-epic-v9-vampiric-verses", "Doctor Strange Epic Collection: The Vampiric Verses",
    "Doctor Strange, Sorcerer Supreme #14-33", 20, "event-age", "Roy Thomas/Dann Thomas", "Jackson Guice",
    "Vampires invade. Infinity Gauntlet tie-in. Strange faces mystical and cosmic threats simultaneously.",
    "Leads to: DS Epic Vol. 10.")

make_epic("ds-epic-v10-infinity-war", "Doctor Strange Epic Collection: Infinity War",
    "Doctor Strange, Sorcerer Supreme #34-47", 14, "event-age", "Roy Thomas/Dann Thomas", "Geof Isherwood",
    "Infinity War crossover. Strange faces his evil doppelganger. Dimensional exploration.",
    "Leads to: DS Epic Vol. 11.")

make_epic("ds-epic-v11-nightmare-bleecker", "Doctor Strange Epic Collection: Nightmare on Bleecker Street",
    "Doctor Strange, Sorcerer Supreme #48-61", 14, "speculation-crash",
    "Roy Thomas/Len Kaminski", "Geof Isherwood",
    "Nightmare attacks the Sanctum Sanctorum. Countess of fear. The series enters the 90s era.",
    "Leads to: DS Epic Vol. 12.")

make_epic("ds-epic-v13-afterlife", "Doctor Strange Epic Collection: Afterlife",
    "Doctor Strange, Sorcerer Supreme #76-90", 15, "speculation-crash",
    "David Quinn", "Mark Buckingham",
    "Strange faces death and rebirth. The series in its final years. Strange Lost. Mystical threats continue.",
    "Series concludes.")

with open("/tmp/editions_part2.json", "w") as f:
    json.dump(editions, f, indent=4)
print(f"Part 2 done: {len(editions)} editions (AWC, BP, BW, Cap, DD, Deadpool, Defenders, Dr. Strange)")
