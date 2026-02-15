#!/usr/bin/env python3
"""Part 3: Excalibur, FF, Generation X, Ghost Rider, Hulk, Iron Fist, Iron Man, smaller series."""
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

# EXCALIBUR
for vol, sub, iss, cnt, syn in [
    (1, "The Sword is Drawn", "Excalibur Special Edition, Excalibur #1-11", 12, "Captain Britain, Nightcrawler, Kitty Pryde, Rachel Summers, and Meggan form Excalibur after the X-Men's apparent death. Widget and the Crazy Gang."),
    (2, "The Cross-Time Caper", "Excalibur #12-30", 19, "The team bounces across alternate realities in the Cross-Time Caper. Each world is a different genre pastiche. Satirical and wildly creative."),
    (3, "Girls School from Heck", "Excalibur #31-41", 11, "Girl's School from Heck storyline. Sat-Yr-9 impersonates Courtney Ross. Darkly comedic British superheroics."),
    (4, "Curiouser and Curiouser", "Excalibur #42-58", 17, "Alan Davis returns to write and draw. Team faces Necrom. The Phoenix Force. Captain Britain mythos deepened."),
    (5, "Days of Futures Yet to Come", "Excalibur #59-75", 17, "Days of Future Past sequel threads. Widget's origin. Rachel Summers' timeline explored. Alan Davis at his peak."),
    (8, "Battle for Britain", "Excalibur #104-115", 12, "Warren Ellis revitalizes the book. Pete Wisdom joins. Darker, more espionage-focused tone. The team faces Black Air."),
    (9, "You Are Cordially Invited", "Excalibur #116-125", 10, "Ben Raab era. Colossus joins. Captain Britain and Meggan's wedding. Series concludes."),
]:
    imp = "essential" if vol in [1, 4] else "recommended"
    make_epic(f"excalibur-epic-v{vol}-{sub.lower().replace(' ','-').replace(chr(39),'')}", f"Excalibur Epic Collection: {sub}",
        iss, cnt, "event-age" if vol <= 7 else "speculation-crash",
        "Chris Claremont/Alan Davis" if vol <= 5 else "Warren Ellis" if vol == 8 else "Ben Raab",
        "Alan Davis" if vol <= 5 else "Carlos Pacheco" if vol == 8 else "Dale Eaglesham",
        syn, f"Leads to: Excalibur Epic Vol. {vol+1}." if vol < 9 else "Series concludes.", importance=imp)

# FANTASTIC FOUR (vol 4-11, 17-25)
ff_epics = [
    (4, "The Mystery of the Black Panther", "Fantastic Four #52-67, Annual #4", 17, "the-expansion", "Stan Lee", "Jack Kirby",
     "Black Panther's full introduction. Inhumans saga continues. Klaw debut. Psycho-Man and Microverse. Him/Adam Warlock created (#66-67).", "essential"),
    (5, "The Name is Doom", "Fantastic Four #68-87, Annual #5-6", 22, "the-expansion", "Stan Lee", "Jack Kirby",
     "Doom steals Surfer's power. Annihilus debut (Annual #6). Crystal joins. Kirby's art at its most cosmic and experimental.", "essential"),
    (6, "At War with Atlantis", "Fantastic Four #88-104", 17, "bronze-age", "Stan Lee/Roy Thomas", "Jack Kirby/John Buscema",
     "Kirby's final FF issues. Namor conflict. The Monster from the Lost Lagoon. John Buscema takes over art.", "recommended"),
    (7, "Battle of the Behemoths", "Fantastic Four #105-125", 21, "bronze-age", "Roy Thomas/Stan Lee", "John Buscema/John Romita Sr.",
     "Crystal and Quicksilver's wedding. Over-Mind saga. Galactus returns. Air-Walker debut (#120).", "recommended"),
    (8, "Annihilus Revealed", "Fantastic Four #126-146", 21, "bronze-age", "Roy Thomas/Gerry Conway", "John Buscema/Rich Buckler",
     "FF goes to the Negative Zone. Annihilus scheme. Medusa replaces Sue. Thundra debut. Darkoth.", "recommended"),
    (9, "The Crusader Syndrome", "Fantastic Four #147-167", 21, "bronze-age", "Gerry Conway/Roy Thomas", "Rich Buckler/George Perez",
     "Counter-Earth saga. Impossible Man returns. George Perez arrives on art. Sub-Mariner crossover.", "recommended"),
    (10, "Counter-Earth Must Die", "Fantastic Four #168-191", 24, "bronze-age", "Roy Thomas/Len Wein", "George Perez/Sal Buscema",
     "Impossible Man World Tour. Galactus threatens Counter-Earth. George Perez's dynamic art. Salem's Seven.", "recommended"),
    (11, "Four No More", "Fantastic Four #192-214", 23, "rise-of-x-men", "Marv Wolfman/Doug Moench/Bill Mantlo", "Keith Pollard",
     "Nova joins temporarily. Namor alliance. Quasimodo. Terrax the Tamer debuts as Galactus's herald.", "supplemental"),
    (17, "All in the Family", "Fantastic Four #296-307", 12, "event-age", "Roger Stern", "John Buscema",
     "She-Hulk era. Crystal rejoins. Aron the rogue Watcher. Franklin Richards' growing powers.", "recommended"),
    (18, "The More Things Change", "Fantastic Four #308-320", 13, "event-age", "Steve Englehart", "Keith Pollard",
     "Inferno crossover. Crystal and Johnny Storm romance. Kang. Frightful Four. New Salem's Witches.", "supplemental"),
    (19, "The Dream is Dead", "Fantastic Four #321-333", 13, "event-age", "Steve Englehart", "Keith Pollard/Rich Buckler",
     "Secret Wars III tie-in. Beyonder. Alicia revealed as Skrull (Lyja). Dreamquest. Acts of Vengeance.", "supplemental"),
    (20, "Into the Time Stream", "Fantastic Four #334-346", 13, "event-age", "Walter Simonson", "Walter Simonson",
     "Walter Simonson's run. Time travel saga. New FF formation. Simonson brings cosmic grandeur.", "recommended"),
    (21, "The New Fantastic Four", "Fantastic Four #347-361", 15, "event-age", "Walter Simonson/Tom DeFalco", "Walter Simonson/Paul Ryan",
     "The New FF: Spider-Man, Wolverine, Hulk, Ghost Rider. Simonson's wild run continues. Paul Ryan era begins.", "recommended"),
    (22, "This Flame This Fury", "Fantastic Four #362-376", 15, "speculation-crash", "Tom DeFalco", "Paul Ryan",
     "DeFalco's long run. Psi-Lord (Franklin). Lyja pregnant. Occulus. Dark Raider.", "supplemental"),
    (23, "Nobody Gets Out Alive", "Fantastic Four #377-392", 16, "speculation-crash", "Tom DeFalco", "Paul Ryan",
     "Hyperstorm. Doom returns. Galactus. The team faces cosmic threats in the 90s.", "supplemental"),
    (24, "Atlantis Rising", "Fantastic Four #393-402", 10, "speculation-crash", "Tom DeFalco", "Paul Ryan",
     "Atlantis Rising crossover. Morgan Le Fay. Kristoff Vernard. Lead-up to Onslaught.", "supplemental"),
    (25, "Strange Days", "Fantastic Four #403-416", 14, "heroes-reborn-return", "Tom DeFalco/James Robinson", "Paul Ryan/Mike Wieringo",
     "Final pre-Heroes Reborn issues. Onslaught crossover. The FF sacrifices themselves. Series ends before relaunch.", "supplemental"),
]

for vol, sub, iss, cnt, era, wr, ar, syn, imp in ff_epics:
    make_epic(f"ff-epic-v{vol}-{sub.lower().replace(' ','-').replace(chr(39),'').replace(',','')}", f"Fantastic Four Epic Collection: {sub}",
        iss, cnt, era, wr, ar, syn, f"Leads to: FF Epic Vol. {vol+1}." if vol < 25 else "Leads to: Heroes Reborn.", importance=imp)

# GENERATION X
for vol, sub, iss, cnt, era in [
    (1, "Back to School", "Generation X #1-9", 9, "speculation-crash"),
    (2, "Emplates Revenge", "Generation X #10-23", 14, "speculation-crash"),
    (3, "The Secret of M", "Generation X #24-32", 9, "heroes-reborn-return"),
    (4, "Pride and Penance", "Generation X #33-47", 15, "heroes-reborn-return"),
]:
    make_epic(f"genx-epic-v{vol}-{sub.lower().replace(' ','-').replace(chr(39),'')}", f"Generation X Epic Collection: {sub}",
        iss, cnt, era, "Scott Lobdell/Larry Hama", "Chris Bachalo/Tom Grummett",
        f"Generation X Vol. {vol}. The young mutant team at the Massachusetts Academy under Banshee and Emma Frost.",
        f"Leads to: Gen X Epic Vol. {vol+1}." if vol < 4 else "Series continues.")

# GHOST RIDER
make_epic("ghost-rider-epic-v1-hell-on-wheels", "Ghost Rider Epic Collection: Hell on Wheels",
    "Marvel Spotlight #5-12, Ghost Rider #1-11", 19, "bronze-age", "Gary Friedrich/Mike Ploog", "Mike Ploog/Jim Mooney",
    "Johnny Blaze becomes the Ghost Rider. Satan's bounty hunter on a flaming motorcycle. Horror/superhero hybrid.",
    "Leads to: Ghost Rider Epic Vol. 2.")

make_epic("ghost-rider-epic-v2-salvation-run", "Ghost Rider Epic Collection: The Salvation Run",
    "Ghost Rider #12-28", 17, "bronze-age", "Tony Isabella/Jim Shooter", "Frank Robbins/Don Heck",
    "Ghost Rider continues his tortured journey. Orb debut. Moondark. The Salvation Run.",
    "Leads to later Ghost Rider appearances.")

# INCREDIBLE HULK (vol 2-9, 13, 19-22, 24)
hulk_epics = [
    (2, "The Hulk Must Die", "Tales to Astonish #60-96", 37, "birth-of-marvel", "Stan Lee", "Jack Kirby/Steve Ditko/Gil Kane",
     "Hulk's Silver Age adventures in Tales to Astonish. Leader debut. Boomerang. The Stranger. Hulk vs. Namor.", "recommended"),
    (3, "The Leader Lives", "Tales to Astonish #97-101, Incredible Hulk #102-117", 22, "the-expansion", "Stan Lee/Gary Friedrich", "Herb Trimpe/Marie Severin",
     "Hulk gets his own title again. Leader schemes. Herb Trimpe defines the Hulk look. Space Parasite. Galaxy Master.", "recommended"),
    (4, "In the Hands of Hydra", "Incredible Hulk #118-137", 20, "bronze-age", "Roy Thomas/Herb Trimpe", "Herb Trimpe",
     "Hydra captures Hulk. Sandman. Abomination returns. The Inheritor. Doc Samson debut (#141 context).", "recommended"),
    (5, "Who Will Judge the Hulk", "Incredible Hulk #138-156", 19, "bronze-age", "Roy Thomas/Archie Goodwin", "Herb Trimpe",
     "Kang attacks. Hulk in the Microverse. Jarella's world. The Hulk's most tragic romance begins.", "recommended"),
    (6, "Crisis on Counter-Earth", "Incredible Hulk #157-178", 22, "bronze-age", "Archie Goodwin/Steve Gerber", "Herb Trimpe",
     "Counter-Earth. Adam Warlock crossover. Wendigo. Cobalt Man. The Hulk as wandering monster.", "recommended"),
    (7, "And Now the Wolverine", "Incredible Hulk #179-203", 25, "bronze-age", "Len Wein/Roger Stern", "Herb Trimpe/Sal Buscema",
     "Wolverine's first appearance (#181). Missing Link. Doc Samson. The Hulk faces his most dangerous foe yet — the little Canadian.", "essential"),
    (8, "The Curing of Dr Banner", "Incredible Hulk #201-226", 26, "bronze-age", "Len Wein/Roger Stern", "Sal Buscema",
     "Hulk in space. Jarella dies. Doc Samson tries to cure Banner. Captain Barracuda. The Hulk's tragic journey continues.", "recommended"),
    (9, "Kill or Be Killed", "Incredible Hulk #227-244", 18, "rise-of-x-men", "Roger Stern/Bill Mantlo", "Sal Buscema",
     "Moonstone debut. U-Foes. Hulk vs. Wonder Man. Bill Mantlo's run begins.", "recommended"),
    (13, "Crossroads", "Incredible Hulk #297-313", 17, "rise-of-x-men", "Bill Mantlo", "Sal Buscema",
     "Hulk exiled to the Crossroads dimension. Mindless savage Hulk wanders between worlds. Trippy and tragic.", "recommended"),
    (19, "Ghost of the Past", "Incredible Hulk #397-406", 10, "speculation-crash", "Peter David", "Gary Frank/Jan Duursema",
     "Ghost of the Past. Trauma. Peter David's acclaimed run continues with psychological depth.", "recommended"),
    (20, "Future Imperfect", "Incredible Hulk #407-419, Hulk: Future Imperfect #1-2", 15, "speculation-crash",
     "Peter David", "Gary Frank/George Perez",
     "Future Imperfect — Hulk travels to the future to face the Maestro, an evil future Hulk. George Perez art. A masterpiece.", "essential"),
    (21, "Fall of the Pantheon", "Incredible Hulk #420-435", 16, "speculation-crash", "Peter David", "Gary Frank",
     "Pantheon saga concludes. The Hulk's team of demigods falls apart. Onslaught crossover lead-in.", "recommended"),
    (22, "Ghosts of the Future", "Incredible Hulk #436-448", 13, "speculation-crash", "Peter David", "Adam Kubert/Liam Sharp",
     "Post-Onslaught. Hulk loses Banner. Savage Hulk rampages. Peter David's run nears its end.", "supplemental"),
    (24, "Lone and Level Sands", "Incredible Hulk #460-474", 15, "heroes-reborn-return", "Peter David/Joe Casey", "Adam Kubert",
     "Peter David's final Hulk issues. The merged Hulk faces existential crisis. Betty Banner dies. Devastating.", "recommended"),
]

for vol, sub, iss, cnt, era, wr, ar, syn, imp in hulk_epics:
    make_epic(f"hulk-epic-v{vol}-{sub.lower().replace(' ','-').replace(chr(39),'').replace(',','')}", f"Incredible Hulk Epic Collection: {sub}",
        iss, cnt, era, wr, ar, syn, f"Leads to: Hulk Epic Vol. {vol+1}." if vol < 24 else "Leads to: Hulk by Jeph Loeb.", importance=imp)

# IRON FIST
make_epic("iron-fist-epic-v1-fury", "Iron Fist Epic Collection: The Fury of Iron Fist",
    "Marvel Premiere #15-25, Iron Fist #1-15", 27, "bronze-age", "Roy Thomas/Chris Claremont", "Gil Kane/John Byrne",
    "Iron Fist's origin and complete solo series. Danny Rand avenges his father. Steel Serpent. Sabretooth debut (#14). Claremont and Byrne collaboration.",
    "Leads to: Power Man and Iron Fist.", importance="essential")

# IRON MAN
im_epics = [
    (1, "The Golden Avenger", "Tales of Suspense #39-72", 34, "birth-of-marvel", "Stan Lee", "Don Heck/Jack Kirby",
     "Iron Man's origin in Vietnam (later updated). Mandarin debut. Crimson Dynamo. Black Widow as villain. Tony Stark's playboy/hero double life.", "essential"),
    (2, "By Force of Arms", "Tales of Suspense #73-99, Iron Man and Sub-Mariner #1, Iron Man #1", 29, "the-expansion",
     "Stan Lee/Archie Goodwin", "Gene Colan",
     "Gene Colan's moody art redefines Iron Man. Titanium Man. Grey Gargoyle. Iron Man gets his own title.", "recommended"),
    (3, "The Man Who Killed Tony Stark", "Iron Man #2-24", 23, "the-expansion", "Archie Goodwin/Allyn Brodsky", "George Tuska",
     "Controller debut. Madame Masque introduced. MODOK. Tony fakes his death. Early Stark Industries drama.", "recommended"),
    (4, "The Fury of the Firebrand", "Iron Man #25-46", 22, "bronze-age", "Gerry Conway/Mike Friedrich", "George Tuska",
     "Firebrand debut. Guardsman. Yellow Claw. War Machine armor prototype. Anti-war themes.", "supplemental"),
    (5, "Battle Royal", "Iron Man #47-67", 21, "bronze-age", "Mike Friedrich/Bill Mantlo", "George Tuska/Arvell Jones",
     "Sunfire crossover. Mandarin returns. Ultimo. Alliance of Super-Villains. Tony's drinking hints begin.", "supplemental"),
    (6, "War of the Super Villains", "Iron Man #68-91", 24, "bronze-age", "Bill Mantlo/Gerry Conway", "George Tuska/Herb Trimpe",
     "Mandarin. Blizzard. Whiplash. Firebrand returns. Growing alcoholism subtext. Justin Hammer era approaching.", "supplemental"),
    (10, "The Enemy Within", "Iron Man #158-177", 20, "rise-of-x-men", "Dennis O'Neil/David Michelinie", "Luke McDonnell",
     "Tony's alcoholism fully explored. Jim Rhodes becomes Iron Man. One of the most important Iron Man eras.", "essential"),
    (11, "Duel of Iron", "Iron Man #178-195", 18, "rise-of-x-men", "Dennis O'Neil", "Luke McDonnell",
     "Rhodey as Iron Man continues. Obadiah Stane. Tony rebuilds from rock bottom. Silver Centurion armor debut.", "essential"),
    (13, "Stark Wars", "Iron Man #215-232", 18, "event-age", "David Michelinie/Bob Layton", "Mark Bright",
     "Armor Wars! Tony discovers his tech has been stolen and goes to war against every armored villain. Crosses lines. Legendary arc.", "essential"),
    (14, "Return of the Ghost", "Iron Man #233-244", 12, "event-age", "David Michelinie/Bob Layton", "Jackson Guice/Bob Layton",
     "Ghost returns. Acts of Vengeance crossover. Tony Stark faces corporate espionage and assassins.", "recommended"),
    (15, "Doom", "Iron Man #245-257", 13, "event-age", "David Michelinie/Bob Layton", "Bob Layton",
     "Doom and Iron Man clash. Armor Wars II lead-in. Tony's technology vs. magic. Fin Fang Foom.", "recommended"),
    (16, "War Games", "Iron Man #258-277", 20, "event-age", "John Byrne/Len Kaminski", "John Romita Jr.",
     "Armor Wars II. John Byrne's run. Living Armor. War Machine armor. Rhodey returns to action.", "recommended"),
    (17, "War Machine", "Iron Man #278-289", 12, "event-age", "Len Kaminski", "Kevin Hopgood",
     "War Machine era. Rhodey gets his own armor. Masters of Silence. The Mandarin's rings. Technology arms race.", "recommended"),
    (18, "Return of Tony Stark", "Iron Man #290-297, War Machine #1-7", 15, "speculation-crash",
     "Len Kaminski/Scott Benson", "Kevin Hopgood/Gabriel Gecko",
     "Tony Stark returns from apparent death. War Machine spins off into its own series.", "supplemental"),
    (20, "In the Hands of Evil", "Iron Man #310-318", 9, "speculation-crash", "Len Kaminski/Terry Kavanagh", "Tom Morgan/Hector Collazo",
     "Titanium Man returns. The Crossing lead-in. AIM plots. Tony faces espionage threats.", "supplemental"),
    (21, "The Crossing", "Iron Man #319-324, Avengers #390-395", 12, "speculation-crash",
     "Terry Kavanagh/Bob Harras", "Jim Cheung/Mike Deodato",
     "The Crossing — Tony Stark revealed as Kang's sleeper agent (later retconned by Heroes Reborn). Teen Tony from alternate timeline.", "supplemental"),
    (22, "Age of Innocence", "Iron Man #325-332", 8, "heroes-reborn-return", "Terry Kavanagh/Jim Lee", "Jim Cheung/Whilce Portacio",
     "Teen Tony era concludes. Onslaught crossover. Tony sacrifices himself. Leads to Heroes Reborn: Iron Man.", "supplemental"),
]

for vol, sub, iss, cnt, era, wr, ar, syn, imp in im_epics:
    make_epic(f"iron-man-epic-v{vol}-{sub.lower().replace(' ','-').replace(chr(39),'').replace(',','')}", f"Iron Man Epic Collection: {sub}",
        iss, cnt, era, wr, ar, syn, f"Leads to: IM Epic Vol. {vol+1}." if vol < 22 else "Leads to: Heroes Reborn.", importance=imp)

# KILLRAVEN
make_epic("killraven-epic-v1-warrior-worlds", "Killraven Epic Collection: Warrior of the Worlds",
    "Amazing Adventures #18-39", 22, "bronze-age", "Don McGregor", "P. Craig Russell",
    "War of the Worlds future. Killraven leads resistance against Martian conquerors. P. Craig Russell's gorgeous painted art.",
    "Standalone cult classic.")

# LUKE CAGE
make_epic("luke-cage-epic-v1-retribution", "Luke Cage, Hero for Hire Epic Collection: Retribution",
    "Hero for Hire #1-23", 23, "bronze-age", "Archie Goodwin/Steve Englehart", "George Tuska/Billy Graham",
    "Luke Cage's origin. Wrongly convicted, gains unbreakable skin. Becomes Hero for Hire in Harlem. Diamondback. Chemistro.",
    "Leads to: Luke Cage Epic Vol. 2.", importance="essential")

make_epic("luke-cage-epic-v2-fire-this-time", "Luke Cage, Power Man Epic Collection: The Fire This Time",
    "Power Man #24-47", 24, "bronze-age", "Don McGregor/Marv Wolfman/Chris Claremont", "George Tuska/Lee Elias",
    "Renamed Power Man. Big Ben. Mace. Cockroach Hamilton. Luke navigates Harlem's criminal underworld.",
    "Leads to: Power Man and Iron Fist.")

# MARVEL TWO-IN-ONE
make_epic("mtio-epic-v1-cry-monster", "Marvel Two-in-One Epic Collection: Cry Monster",
    "Marvel Feature #11-12, Marvel Two-in-One #1-19", 21, "bronze-age", "Steve Gerber/Bill Mantlo", "Jim Starlin/Sal Buscema",
    "Thing team-up series. Classic pairings with every Marvel hero. Man-Thing. Thundra. Deathlok. Guardians of the Galaxy.",
    "Leads to: MTIO Epic Vol. 2.")

make_epic("mtio-epic-v2-two-against-hydra", "Marvel Two-in-One Epic Collection: Two Against Hydra",
    "Marvel Two-in-One #20, #22-36", 16, "bronze-age", "Bill Mantlo/Marv Wolfman", "Ron Wilson",
    "Thing teams with Spider-Man, Thor, Hulk and more. Hydra plot. Deathlok. Skull the Slayer.",
    "Leads to: MTIO Epic Vol. 3.")

make_epic("mtio-epic-v3-remembrance", "Marvel Two-in-One Epic Collection: Remembrance of Things Past",
    "Marvel Two-in-One #37-52", 16, "bronze-age", "Marv Wolfman/Ralph Macchio", "Ron Wilson/John Byrne",
    "Project Pegasus saga. Thing guards the energy facility. Quasar. Wundarr. Thundra. John Byrne draws key issues.",
    "Project Pegasus is a highlight.")

# MASTER OF KUNG FU
make_epic("mokf-epic-v1-weapon-of-soul", "Master of Kung Fu Epic Collection: Weapon of the Soul",
    "Special Marvel Edition #15-16, Master of Kung Fu #17-28", 14, "bronze-age",
    "Steve Englehart/Doug Moench", "Jim Starlin/Paul Gulacy",
    "Shang-Chi's origin. Son of Fu Manchu rebels against his father. Martial arts espionage thriller.",
    "Leads to: MoKF Epic Vol. 2.", importance="essential")

make_epic("mokf-epic-v2-fight-without-pity", "Master of Kung Fu Epic Collection: Fight Without Pity",
    "Master of Kung Fu #29-53", 25, "bronze-age", "Doug Moench", "Paul Gulacy",
    "Doug Moench and Paul Gulacy's legendary run. MI-6 espionage. Razor Fist. Brynocki. Cinematic fight choreography.",
    "One of Marvel's best Bronze Age runs.", importance="essential")

# MS. MARVEL
make_epic("ms-marvel-epic-v1-this-woman-warrior", "Ms. Marvel Epic Collection: This Woman, This Warrior",
    "Ms. Marvel #1-14", 14, "bronze-age", "Gerry Conway/Chris Claremont", "John Buscema/Jim Mooney",
    "Carol Danvers gains powers from a Kree device. Becomes Ms. Marvel. Fights Scorpion, MODOK, Deathbird. Claremont takes over writing.",
    "Leads to: Ms. Marvel Epic Vol. 2.", importance="recommended")

make_epic("ms-marvel-epic-v2-woman-who-fell", "Ms. Marvel Epic Collection: The Woman Who Fell to Earth",
    "Ms. Marvel #15-23, Avengers Annual #10", 10, "rise-of-x-men", "Chris Claremont", "Jim Mooney/Dave Cockrum",
    "Carol joins the Avengers. Marcus/Immortus controversy (Avengers #200). Avengers Annual #10 — Rogue steals Carol's powers. Claremont addresses the Marcus controversy.",
    "Avengers Annual #10 is crucial for Carol and Rogue's histories.", importance="essential")

# NAMOR
make_epic("namor-epic-v1-enter-sub-mariner", "Namor, the Sub-Mariner Epic Collection: Enter the Sub-Mariner",
    "Tales to Astonish #70-76, #79-101, Sub-Mariner #1-3", 34, "birth-of-marvel",
    "Stan Lee/Roy Thomas", "Gene Colan/Bill Everett",
    "Namor's Silver Age adventures. Tales to Astonish backup feature through his own series. Attuma. Krang. Lady Dorma.",
    "Leads to: Namor Epic Vol. 2.")

make_epic("namor-epic-v3-who-strikes-atlantis", "Namor, the Sub-Mariner Epic Collection: Who Strikes for Atlantis?",
    "Sub-Mariner #4-27", 24, "bronze-age", "Roy Thomas", "John Buscema/Sal Buscema",
    "Namor's kingdom under siege. Tiger Shark. Llyra. Doctor Doom alliance. Namor as reluctant king.",
    "Leads to: Namor Epic Vol. 4.")

make_epic("namor-epic-v4-titans-three", "Namor, the Sub-Mariner Epic Collection: Titans Three",
    "Sub-Mariner #28-49", 22, "bronze-age", "Roy Thomas/Steve Gerber", "Sal Buscema",
    "Titans Three — Namor, Hulk, Silver Surfer. Atlantis-surface world conflicts. Venus. Namorita.",
    "Leads to: Defenders.")

# SGT. FURY
make_epic("sgt-fury-epic-v1-howling-commandos", "Sgt. Fury Epic Collection: The Howling Commandos",
    "Sgt. Fury and His Howling Commandos #1-19", 19, "birth-of-marvel", "Stan Lee", "Jack Kirby/Dick Ayers",
    "WWII adventures of Nick Fury and his Howling Commandos. Dum Dum Dugan. Gabe Jones. The foundation of Marvel's WWII mythology.",
    "Leads to: Sgt. Fury Epic Vol. 2.", importance="recommended")

make_epic("sgt-fury-epic-v2-berlin-breakout", "Sgt. Fury Epic Collection: Berlin Breakout",
    "Sgt. Fury and His Howling Commandos #20-36", 17, "birth-of-marvel", "Stan Lee", "Dick Ayers",
    "More WWII adventures. D-Day. Berlin missions. The Commandos face Nazi super-science.",
    "Leads to: Nick Fury, Agent of SHIELD.")

# SHE-HULK
make_epic("she-hulk-epic-v3-fourth-wall", "She-Hulk Epic Collection: Breaking the Fourth Wall",
    "Sensational She-Hulk #1-12", 12, "event-age", "John Byrne", "John Byrne",
    "John Byrne's legendary fourth-wall-breaking She-Hulk run. Jen talks to the reader, fights through comic panels. Wildly inventive.",
    "One of Marvel's most unique runs.", importance="essential")

make_epic("she-hulk-epic-v4-cosmic-squish", "She-Hulk Epic Collection: The Cosmic Squish Principle",
    "Sensational She-Hulk #13-30", 18, "event-age", "John Byrne/Steve Gerber", "John Byrne/Various",
    "Byrne's run continues. Howard the Duck crossover. Blonde Phantom. Meta-humor peaks. Steve Gerber guest writes.",
    "Leads to later Sensational issues.")

# CARNAGE
make_epic("carnage-epic-v1-born-in-blood", "Carnage Epic Collection: Born in Blood",
    "Amazing Spider-Man #361-363, #378-380, Spectacular Spider-Man #201-203, Web of Spider-Man #101-103", 12,
    "speculation-crash", "David Michelinie/J.M. DeMatteis", "Mark Bagley/Sal Buscema",
    "Carnage's complete early saga. Born from Venom symbiote and serial killer Cletus Kasady. Maximum Carnage begins.",
    "Leads to: Carnage Epic Vol. 2.", importance="recommended")

# MORBIUS
make_epic("morbius-epic-v1-living-vampire", "Morbius Epic Collection: The Living Vampire",
    "Fear #20-26, Adventure into Fear #27-31, Marvel Team-Up #3-4, Giant-Size Super-Heroes #1", 13,
    "bronze-age", "Steve Gerber/Doug Moench", "Gil Kane/P. Craig Russell",
    "Morbius the Living Vampire's solo adventures. A scientist cursed with a pseudo-vampiric condition. Horror/superhero hybrid.",
    "Standalone horror classic.")

# VENOM
make_epic("venom-epic-v1-symbiosis", "Venom Epic Collection: Symbiosis",
    "Amazing Spider-Man #258, #300, #315-317, #332-333, #346-347, #374-375", 10,
    "event-age", "David Michelinie/Tom DeFalco", "Todd McFarlane/Erik Larsen/Mark Bagley",
    "The complete Venom origin and early appearances from ASM. Symbiote's origin, Eddie Brock's transformation, key confrontations.",
    "Essential for Venom's origin.", importance="essential")

make_epic("venom-epic-v2-lethal-protector", "Venom Epic Collection: Lethal Protector",
    "Venom: Lethal Protector #1-6, Venom: Funeral Pyre #1-3", 9,
    "speculation-crash", "David Michelinie", "Mark Bagley/Tom Lyle",
    "Venom's first solo series. Eddie Brock relocates to San Francisco. Five symbiote offspring spawn. Venom becomes an anti-hero.",
    "Leads to: Venom mini-series era.")

# HAWKEYE
make_epic("hawkeye-epic-v1-avenging-archer", "Hawkeye Epic Collection: The Avenging Archer",
    "Hawkeye Limited Series #1-4, Solo Avengers #1-5", 9, "rise-of-x-men",
    "Mark Gruenwald", "Mark Gruenwald",
    "Hawkeye's first solo limited series. Clint Barton as a standalone hero. Mockingbird partnership deepens.",
    "Leads to: Hawkeye Epic Vol. 2.")

make_epic("hawkeye-epic-v2-way-of-arrow", "Hawkeye Epic Collection: The Way of the Arrow",
    "Solo Avengers #6-20, Avengers Spotlight #21-40", 35, "event-age",
    "Tom DeFalco/Various", "Al Milgrom/Various",
    "Solo Avengers anthology format. Hawkeye leads each issue with backup stories featuring other Avengers. US Agent. Hank Pym.",
    "Anthology format showcases multiple Avengers.")

# GUARDIANS OF THE GALAXY (CLASSIC)
make_epic("gotg-classic-epic-v1-earth-shall-overcome", "Guardians of the Galaxy Epic Collection: Earth Shall Overcome",
    "Marvel Presents #3-12, Marvel Two-in-One #4-5", 12, "bronze-age",
    "Steve Gerber", "Al Milgrom",
    "The original Guardians of the Galaxy from the 31st century: Vance Astro, Yondu, Charlie-27, Martinex, Nikki. Badoon invasion.",
    "The original GOTG team. Leads to: GOTG Epic Vol. 2.")

with open("/tmp/editions_part3.json", "w") as f:
    json.dump(editions, f, indent=4)
print(f"Part 3 done: {len(editions)} editions")
