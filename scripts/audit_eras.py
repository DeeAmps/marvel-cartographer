#!/usr/bin/env python3
"""
Comprehensive era assignment audit for Marvel Cartographer.
Pulls all editions, determines correct era based on publication year
extracted from title/content, cross-references against era date ranges,
and generates SQL fixes.
"""

import json
import os
import re
import sys
import urllib.request

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

ERAS = [
    {"id": "eb1a7d39-e8d3-41f1-9ec2-74e2ec3d3be6", "slug": "birth-of-marvel", "name": "The Birth of Marvel", "number": 1, "year_start": 1961, "year_end": 1966},
    {"id": "a9fe2453-0328-4e72-88ac-01d5cbdef337", "slug": "the-expansion", "name": "The Expansion", "number": 2, "year_start": 1966, "year_end": 1970},
    {"id": "70d862f6-720f-46f0-ac11-b3171abd44c6", "slug": "bronze-age", "name": "The Bronze Age", "number": 3, "year_start": 1970, "year_end": 1980},
    {"id": "49fd3e6f-0cd3-48f5-abbe-7c90e59acfa6", "slug": "rise-of-x-men", "name": "The Rise of the X-Men", "number": 4, "year_start": 1975, "year_end": 1985},
    {"id": "93f0e7e8-0cc2-4f06-9090-6ad14520bece", "slug": "event-age", "name": "The Event Age", "number": 5, "year_start": 1985, "year_end": 1992},
    {"id": "f9559f37-f08a-4eec-a19d-8d63123d19d3", "slug": "speculation-crash", "name": "The Speculation Crash", "number": 6, "year_start": 1992, "year_end": 1996},
    {"id": "2b73f22c-6333-4928-97ba-78477e5acffe", "slug": "heroes-reborn-return", "name": "Heroes Reborn & Return", "number": 7, "year_start": 1996, "year_end": 1998},
    {"id": "f8924169-4590-4ef4-88e4-c9713a1540ab", "slug": "marvel-knights-ultimate", "name": "Marvel Knights & The Ultimate Era", "number": 8, "year_start": 1998, "year_end": 2004},
    {"id": "dfdb0620-290e-42c7-876a-cf3fec5001b3", "slug": "bendis-avengers", "name": "The Bendis Avengers Era", "number": 9, "year_start": 2004, "year_end": 2012},
    {"id": "fe75c870-3888-4405-9c8a-1f0341f19339", "slug": "hickman-saga", "name": "The Hickman Saga", "number": 10, "year_start": 2009, "year_end": 2016},
    {"id": "e8879226-9a97-4fdb-a2d8-484a3579385d", "slug": "all-new-all-different", "name": "All-New All-Different Marvel", "number": 11, "year_start": 2015, "year_end": 2018},
    {"id": "ef8c9832-e06d-4028-ae89-a2bb5eb13e1c", "slug": "dawn-of-krakoa", "name": "The Dawn of Krakoa", "number": 12, "year_start": 2019, "year_end": 2024},
    {"id": "93f854fe-cd0a-4070-9a30-1f671374200e", "slug": "blood-hunt-doom", "name": "Blood Hunt & One World Under Doom", "number": 13, "year_start": 2024, "year_end": 2025},
    {"id": "c4bffdc6-c943-432e-9b61-6b51387076bb", "slug": "current-ongoings", "name": "Current Ongoings", "number": 14, "year_start": 2025, "year_end": 2026},
]

ERA_BY_ID = {e["id"]: e for e in ERAS}
ERA_BY_SLUG = {e["slug"]: e for e in ERAS}


def supabase_get(path):
    """Fetch from Supabase REST API with pagination."""
    all_data = []
    offset = 0
    page_size = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{path}"
        sep = "&" if "?" in url else "?"
        url += f"{sep}offset={offset}&limit={page_size}"
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
        if not data:
            break
        all_data.extend(data)
        if len(data) < page_size:
            break
        offset += page_size
    return all_data


# ============================================================
# PUBLICATION YEAR EXTRACTION
# ============================================================

# Known run dates for major creators/series combinations
# Format: (pattern_in_slug_or_title, start_year, end_year)
KNOWN_RUNS = [
    # Silver/Golden Age (1961-1966)
    ("lee kirby", 1961, 1970),
    ("lee ditko", 1962, 1966),

    # Specific collected editions with known dates
    # Birth of Marvel era titles
    ("fantastic four omnibus vol. 1", 1961, 1963),
    ("fantastic four omnibus vol. 2", 1964, 1966),
    ("fantastic four omnibus vol. 3", 1966, 1968),
    ("amazing spider-man omnibus vol. 1", 1962, 1966),
    ("amazing spider-man omnibus vol. 2", 1966, 1969),
    ("avengers omnibus vol. 1", 1963, 1966),
    ("avengers omnibus vol. 2", 1966, 1968),
    ("mighty thor omnibus vol. 1", 1962, 1966),
    ("mighty thor omnibus vol. 2", 1966, 1968),
    ("uncanny x-men omnibus vol. 1 (original)", 1963, 1966),
    ("x-men omnibus vol. 1 (original)", 1963, 1966),
    ("x-men omnibus vol. 2 (original)", 1966, 1970),
    ("iron man omnibus vol. 1", 1963, 1968),
    ("iron man omnibus vol. 2", 1968, 1972),
    ("incredible hulk omnibus vol. 1", 1962, 1967),
    ("doctor strange by lee", 1963, 1966),
    ("nick fury, agent of s.h.i.e.l.d. omnibus", 1965, 1968),
    ("ant-man/giant-man", 1962, 1966),

    # Expansion era (1966-1970)
    ("fantastic four omnibus vol. 4", 1968, 1970),
    ("fantastic four omnibus vol. 5", 1970, 1972),
    ("avengers omnibus vol. 3", 1968, 1972),
    ("amazing spider-man omnibus vol. 3", 1969, 1973),
    ("mighty thor omnibus vol. 3", 1968, 1970),
    ("mighty thor omnibus vol. 4", 1970, 1974),
    ("silver surfer omnibus vol. 1", 1968, 1970),
    ("sub-mariner", 1966, 1970),
    ("namor, the sub-mariner epic collection: enter", 1966, 1968),
    ("captain america epic collection: captain america lives again", 1964, 1966),
    ("daredevil epic collection: the man without fear", 1964, 1966),
    ("daredevil epic collection: mike murdock", 1966, 1968),

    # Bronze Age (1970-1980)
    ("fantastic four omnibus vol. 6", 1972, 1975),
    ("avengers omnibus vol. 4 (englehart)", 1972, 1976),
    ("avengers omnibus vol. 5 (shooter", 1977, 1979),
    ("avengers omnibus vol. 6 (michelinie", 1979, 1981),
    ("amazing spider-man omnibus vol. 4", 1973, 1976),
    ("amazing spider-man omnibus vol. 5", 1976, 1979),
    ("mighty thor omnibus vol. 5", 1974, 1977),
    ("incredible hulk omnibus vol. 3", 1970, 1974),
    ("incredible hulk omnibus vol. 4", 1974, 1977),
    ("incredible hulk omnibus vol. 5", 1977, 1980),
    ("warlock by jim starlin", 1975, 1977),
    ("tomb of dracula", 1972, 1979),
    ("luke cage", 1972, 1978),
    ("iron fist", 1974, 1977),
    ("master of kung fu", 1973, 1979),
    ("howard the duck", 1976, 1979),
    ("defenders omnibus vol. 1", 1971, 1975),
    ("defenders omnibus vol. 2", 1975, 1978),
    ("defenders omnibus vol. 3", 1978, 1981),
    ("conan the barbarian", 1970, 1978),
    ("man-thing", 1972, 1975),
    ("ghost rider epic collection: hell on wheels", 1972, 1976),
    ("captain marvel by jim starlin", 1973, 1974),
    ("eternals by jack kirby", 1976, 1978),
    ("captain america by jack kirby omnibus", 1976, 1977),
    ("captain america by steve englehart", 1972, 1975),
    ("shang-chi, master of kung fu omnibus", 1973, 1979),
    ("spider-woman omnibus", 1978, 1983),
    ("power man and iron fist omnibus", 1978, 1982),
    ("iron man omnibus vol. 2", 1968, 1972),
    ("iron man: demon in a bottle", 1978, 1979),
    ("doctor strange omnibus vol. 2", 1972, 1976),
    ("daredevil omnibus vol. 2", 1970, 1975),
    ("marvel two-in-one omnibus vol. 1", 1974, 1978),
    ("marvel team-up omnibus", 1972, 1976),
    ("invaders omnibus", 1975, 1979),
    ("nova classic", 1976, 1979),
    ("werewolf by night", 1972, 1977),
    ("morbius", 1971, 1975),
    ("ms. marvel: the original years", 1977, 1979),
    ("deathlok", 1974, 1977),
    ("killraven", 1973, 1976),
    ("red sonja", 1975, 1979),
    ("machine man by jack kirby", 1977, 1978),
    ("marvel spotlight omnibus", 1971, 1977),
    ("giant-size marvel omnibus", 1974, 1975),
    ("marvel horror", 1970, 1975),
    ("what if? classic", 1977, 1984),
    ("omega the unknown", 1976, 1977),
    ("marvel two-in-one omnibus vol. 2", 1978, 1983),
    ("shogun warriors", 1979, 1980),

    # Rise of X-Men (1975-1985) — X-Men specific titles
    ("uncanny x-men omnibus vol. 1 (claremont)", 1975, 1978),
    ("uncanny x-men omnibus vol. 2 (claremont)", 1978, 1981),
    ("uncanny x-men omnibus vol. 3 (claremont)", 1981, 1984),
    ("uncanny x-men omnibus vol. 4 (claremont)", 1984, 1986),
    ("uncanny x-men omnibus vol. 5 (claremont)", 1986, 1988),
    ("new mutants omnibus vol. 1", 1982, 1985),
    ("new mutants omnibus vol. 2", 1985, 1987),
    ("daredevil by frank miller", 1979, 1983),
    ("fantastic four by john byrne omnibus vol. 1", 1981, 1984),
    ("fantastic four by john byrne omnibus vol. 2", 1984, 1986),
    ("thor by walt simonson", 1983, 1987),
    ("secret wars (1984)", 1984, 1985),
    ("alpha flight by john byrne", 1983, 1985),
    ("daredevil: born again", 1986, 1986),
    ("x-men: dark phoenix", 1980, 1980),
    ("x-men: god loves", 1982, 1982),
    ("wolverine by claremont & miller", 1982, 1982),
    ("spectacular spider-man omnibus vol. 1", 1976, 1980),
    ("spider-man by roger stern", 1981, 1984),
    ("avengers by roger stern", 1983, 1988),
    ("mighty thor omnibus vol. 6", 1977, 1980),
    ("captain america by mark gruenwald omnibus vol. 1", 1985, 1989),
    ("iron man by michelinie", 1978, 1982),
    ("power pack classic", 1984, 1986),
    ("rom: spaceknight", 1979, 1986),
    ("micronauts", 1979, 1984),
    ("cloak and dagger", 1982, 1987),
    ("captain britain omnibus", 1981, 1985),
    ("moon knight epic collection: bad moon rising", 1980, 1982),
    ("moon knight epic collection: final rest", 1982, 1984),
    ("moon knight epic collection: shadows of the moon", 1984, 1985),
    ("dazzler omnibus", 1981, 1986),
    ("vision and the scarlet witch", 1982, 1986),
    ("west coast avengers omnibus vol. 1", 1984, 1987),
    ("west coast avengers omnibus vol. 2", 1987, 1989),
    ("hawkeye by mark gruenwald", 1983, 1983),
    ("x-factor omnibus vol. 1 (original)", 1986, 1989),
    ("death of captain marvel", 1982, 1982),
    ("heroes for hire omnibus (power man and iron fist)", 1978, 1986),
    ("ka-zar the savage", 1981, 1984),
    ("punisher omnibus vol. 1", 1986, 1988),
    ("captain marvel: monica rambeau", 1982, 1989),
    ("silver surfer omnibus vol. 3", 1987, 1989),
    ("doctor strange omnibus vol. 3", 1980, 1987),
    ("new warriors classic omnibus", 1989, 1993),
    ("marvel super hero contest of champions", 1982, 1982),
    ("daredevil by ann nocenti", 1986, 1991),
    ("moon knight compendium", 1980, 1994),

    # Event Age (1985-1992)
    ("infinity gauntlet omnibus", 1990, 1991),
    ("infinity war omnibus", 1992, 1992),
    ("infinity crusade", 1993, 1993),
    ("x-men: inferno", 1988, 1989),
    ("x-men: mutant massacre", 1986, 1987),
    ("x-men: x-tinction agenda", 1990, 1991),
    ("x-men: x-cutioner's song", 1992, 1993),
    ("spider-man by michelinie & mcfarlane", 1987, 1990),
    ("spider-man by todd mcfarlane", 1988, 1991),
    ("spider-man: kraven's last hunt", 1987, 1987),
    ("acts of vengeance", 1989, 1990),
    ("avengers: under siege", 1986, 1987),
    ("avengers: galactic storm", 1992, 1992),
    ("excalibur by claremont", 1987, 1991),
    ("incredible hulk by peter david omnibus", 1987, 1998),
    ("iron man: armor wars", 1987, 1988),
    ("wolverine epic collection: madripoor", 1988, 1989),
    ("punisher war journal", 1988, 1992),
    ("secret wars ii", 1985, 1986),
    ("midnight sons", 1992, 1994),
    ("elektra by frank miller", 1981, 1986),
    ("elektra: assassin", 1986, 1987),
    ("squadron supreme", 1985, 1986),
    ("spider-man 2099 omnibus", 1992, 1996),
    ("new warriors classic vol. 2", 1991, 1993),
    ("sensational she-hulk by john byrne", 1989, 1993),
    ("quasar classic", 1989, 1994),
    ("darkhawk", 1991, 1995),
    ("sleepwalker", 1991, 1994),
    ("ghost rider: danny ketch", 1990, 1994),
    ("marc spector: moon knight", 1989, 1994),
    ("wolverine compendium", 1988, 1997),
    ("daredevil: the man without fear", 1993, 1994),
    ("silver surfer epic collection: return of thanos", 1988, 1989),
    ("silver surfer epic collection: thanos quest", 1990, 1990),
    ("silver surfer: parable", 1988, 1989),
    ("silver surfer: rebirth of thanos", 1990, 1990),
    ("namor the sub-mariner by john byrne", 1990, 1993),
    ("deadpool beginnings", 1991, 1993),
    ("miracleman omnibus", 1985, 1993),
    ("damage control", 1989, 1991),
    ("hulk: future imperfect", 1992, 1993),
    ("web of spider-man omnibus", 1985, 1991),
    ("wolverine: weapon x", 1991, 1991),
    ("x-factor by peter david omnibus vol. 1", 1991, 1993),
    ("x-factor by peter david omnibus vol. 2", 1993, 1995),
    ("x-force omnibus vol. 1", 1991, 1993),
    ("silver sable", 1992, 1995),
    ("speedball", 1988, 1989),
    ("wonder man classic", 1986, 1992),
    ("knights of pendragon", 1990, 1993),
    ("doctor strange epic collection: triumph and torment", 1988, 1989),

    # Speculation Crash (1992-1996)
    ("age of apocalypse", 1995, 1996),
    ("clone saga", 1994, 1996),
    ("onslaught", 1996, 1996),
    ("x-men epic collection: fatal attractions", 1993, 1994),
    ("x-men epic collection: phalanx covenant", 1994, 1995),
    ("x-men epic collection: legion quest", 1994, 1995),
    ("generation x", 1994, 1996),
    ("cable (1993)", 1993, 1996),
    ("force works", 1994, 1996),
    ("war machine (1994)", 1994, 1996),
    ("thunderstrike", 1993, 1995),
    ("marvel 2099", 1992, 1996),
    ("venom: lethal protector", 1993, 1994),
    ("maximum carnage", 1993, 1993),
    ("marvels", 1994, 1994),
    ("x-force by nicieza", 1993, 1996),

    # Heroes Reborn (1996-1998)
    ("heroes reborn", 1996, 1997),
    ("heroes return", 1997, 1998),
    ("thunderbolts by busiek", 1997, 2000),
    ("avengers by busiek", 1998, 2002),
    ("deadpool by joe kelly", 1997, 1999),
    ("peter parker: spider-man by mackie", 1997, 1999),
    ("ka-zar by mark waid", 1997, 1998),
    ("captain america by waid", 1998, 1999),
    ("thor by dan jurgens", 1998, 2004),
    ("iron man by busiek", 1998, 2000),

    # Marvel Knights (1998-2004)
    ("new x-men by morrison", 1998, 2004),
    ("daredevil by bendis", 2001, 2006),
    ("alias", 2001, 2004),
    ("avengers by busiek & pérez", 1998, 2002),
    ("punisher max by ennis", 2000, 2008),
    ("marvel knights", 1998, 2001),
    ("ultimate spider-man", 2000, 2009),
    ("ultimates by millar", 2002, 2007),
    ("runaways", 2003, 2007),
    ("black panther by christopher priest", 1998, 2003),
    ("inhumans by paul jenkins", 1998, 1999),
    ("fantastic four by waid", 2002, 2005),
    ("captain america by john ney rieber", 2002, 2003),
    ("exiles by judd winick", 2001, 2006),
    ("truth: red, white & black", 2003, 2003),
    ("the sentry", 2000, 2001),
    ("supreme power", 2003, 2005),
    ("x-statix", 2001, 2004),
    ("wolverine by rucka", 2003, 2004),
    ("wolverine by millar", 2004, 2005),
    ("wolverine epic collection: enemy of the state", 2004, 2005),
    ("hulk: the end", 2002, 2002),
    ("spider-man's tangled web", 2001, 2003),
    ("1602", 2003, 2004),
    ("jms", 2001, 2007),  # J. Michael Straczynski ASM run
    ("marvel premier collection: marvels", 1994, 1994),

    # Bendis Avengers (2004-2012)
    ("new avengers", 2004, 2010),
    ("civil war", 2006, 2007),
    ("secret invasion", 2008, 2009),
    ("dark avengers", 2009, 2010),
    ("siege", 2010, 2010),
    ("house of m", 2005, 2005),
    ("captain america by ed brubaker", 2005, 2012),
    ("annihilation", 2006, 2007),
    ("annihilation: conquest", 2007, 2008),
    ("guardians of the galaxy by dna", 2008, 2010),
    ("nova by abnett", 2007, 2010),
    ("planet hulk", 2006, 2007),
    ("world war hulk", 2007, 2008),
    ("invincible iron man by fraction", 2008, 2012),
    ("immortal iron fist", 2006, 2009),
    ("uncanny x-force by remender", 2010, 2012),
    ("astonishing x-men by whedon", 2004, 2008),
    ("x-men: messiah complex", 2007, 2008),
    ("x-men: messiah war", 2009, 2009),
    ("x-men: second coming", 2010, 2010),
    ("war of kings", 2009, 2009),
    ("realm of kings", 2010, 2010),
    ("the thanos imperative", 2010, 2010),
    ("thunderbolts by warren ellis", 2006, 2008),
    ("secret warriors omnibus", 2009, 2011),
    ("spider-man: one more day", 2007, 2008),
    ("spider-man: brand new day", 2008, 2010),
    ("fear itself", 2011, 2011),
    ("miles morales: spider-man omnibus vol. 1", 2011, 2013),
    ("ultimate comics", 2009, 2013),
    ("ultimatum", 2008, 2009),
    ("iron man: extremis", 2005, 2006),
    ("avengers vs. x-men", 2012, 2012),
    ("secret war", 2004, 2005),
    ("avengers disassembled", 2004, 2004),
    ("doctor strange: the oath", 2006, 2007),
    ("she-hulk by dan slott", 2004, 2009),
    ("young avengers by allan heinberg", 2005, 2006),
    ("nextwave", 2006, 2007),
    ("moon knight by charlie huston", 2006, 2009),
    ("ghost rider by jason aaron", 2006, 2009),
    ("captain britain and mi:13", 2008, 2009),
    ("incredible hercules", 2008, 2010),
    ("black panther by reginald hudlin", 2005, 2010),
    ("marvel zombies", 2005, 2009),
    ("chaos war", 2010, 2011),
    ("heroic age", 2010, 2011),
    ("kang: the saga", 2010, 2011),
    ("agents of atlas", 2006, 2009),
    ("punisher max by ennis omnibus vol. 2", 2004, 2008),

    # Hickman Saga (2009-2016) — overlaps with Bendis
    ("fantastic four by jonathan hickman", 2009, 2012),
    ("avengers by jonathan hickman", 2012, 2015),
    ("secret wars (2015)", 2015, 2016),
    ("s.h.i.e.l.d. by hickman", 2010, 2011),
    ("daredevil by mark waid", 2011, 2015),
    ("hawkeye by matt fraction", 2012, 2015),
    ("superior spider-man", 2013, 2014),
    ("all-new x-men by bendis", 2012, 2015),
    ("thor by jason aaron omnibus vol. 1", 2012, 2014),
    ("thor: god of thunder", 2012, 2014),
    ("infinity", 2013, 2013),
    ("original sin", 2014, 2014),
    ("age of ultron", 2013, 2013),
    ("avengers & x-men: axis", 2014, 2015),
    ("deadpool by posehn & duggan", 2012, 2015),
    ("moon knight by warren ellis", 2014, 2014),
    ("ms. marvel by g. willow wilson", 2014, 2019),
    ("guardians of the galaxy by bendis", 2013, 2015),
    ("spider-island", 2011, 2011),
    ("avengers: the children's crusade", 2010, 2012),
    ("fear itself", 2011, 2011),
    ("uncanny x-men by kieron gillen", 2011, 2012),
    ("avengers academy", 2010, 2013),
    ("avengers arena", 2012, 2014),
    ("loki: agent of asgard", 2014, 2015),
    ("she-hulk by charles soule", 2014, 2015),
    ("secret avengers", 2010, 2014),
    ("captain america: white", 2015, 2015),
    ("spider-verse", 2014, 2015),
    ("superior foes of spider-man", 2013, 2014),
    ("spider-man: family business", 2014, 2014),
    ("mighty avengers by al ewing", 2013, 2014),
    ("nova by loeb", 2013, 2015),
    ("daredevil: shadowland", 2010, 2011),

    # All-New All-Different (2015-2018)
    ("vision by tom king", 2015, 2016),
    ("civil war ii", 2016, 2017),
    ("secret empire", 2017, 2017),
    ("immortal hulk", 2018, 2021),
    ("venom by donny cates", 2018, 2021),
    ("ms. marvel omnibus vol. 1 (kamala khan)", 2014, 2019),
    ("infamous iron man", 2016, 2018),
    ("mighty thor by jason aaron", 2015, 2018),
    ("thor by jason aaron omnibus vol. 2", 2014, 2018),
    ("doctor strange by jason aaron", 2015, 2017),
    ("black panther by ta-nehisi coates", 2016, 2021),
    ("all-new wolverine", 2015, 2018),
    ("gwenpool", 2016, 2018),
    ("unbeatable squirrel girl", 2015, 2019),
    ("old man logan by jeff lemire", 2016, 2018),
    ("uncanny avengers by gerry duggan", 2015, 2017),
    ("power man and iron fist by david walker", 2016, 2017),
    ("silver surfer by dan slott", 2014, 2017),
    ("death of wolverine", 2014, 2014),
    ("spider-gwen", 2015, 2018),
    ("ultimates by al ewing", 2015, 2017),
    ("runaways by rainbow rowell", 2017, 2020),
    ("daredevil by charles soule", 2015, 2018),
    ("fantastic four by dan slott omnibus vol. 1", 2018, 2020),
    ("spider-man/deadpool", 2016, 2019),
    ("scarlet witch by james robinson", 2016, 2017),
    ("jessica jones by bendis", 2016, 2018),
    ("champions by mark waid", 2016, 2018),
    ("america by gabby rivera", 2017, 2018),
    ("moon knight by jeff lemire", 2016, 2017),
    ("black widow by waid & samnee", 2016, 2017),
    ("thanos wins by donny cates", 2017, 2018),
    ("avengers: no surrender", 2018, 2018),
    ("avengers by jason aaron omnibus vol. 1", 2018, 2020),
    ("inhumans vs. x-men", 2017, 2017),
    ("cosmic ghost rider", 2018, 2019),
    ("spider-verse/spider-geddon", 2018, 2019),
    ("west coast avengers by kelly thompson", 2018, 2019),
    ("a-force", 2015, 2016),
    ("captain america by mark waid (2017)", 2017, 2018),
    ("she-hulk by mariko tamaki", 2017, 2018),
    ("silk by robbie thompson", 2015, 2017),
    ("star-lord by chip zdarsky", 2016, 2017),
    ("ant-man by nick spencer", 2015, 2016),
    ("mockingbird by chelsea cain", 2016, 2016),
    ("new avengers by al ewing", 2015, 2016),
    ("all-new all-different avengers by mark waid", 2015, 2016),
    ("bucky barnes: the winter soldier", 2014, 2015),
    ("venom modern era compendium", 2018, 2021),
    ("nick spencer", 2018, 2021),  # ASM by Nick Spencer
    ("iron man by christopher cantwell", 2020, 2022),
    ("shang-chi by gene luen yang (2021)", 2021, 2022),
    ("strange by jed mackay (2022)", 2022, 2023),
    ("darkhold: pages from the book of sins (2021)", 2021, 2022),
    ("death of doctor strange", 2021, 2022),
    ("alien by phillip kennedy johnson", 2021, 2023),

    # Dawn of Krakoa (2019-2024)
    ("house of x / powers of x", 2019, 2019),
    ("dawn of x", 2019, 2020),
    ("x of swords", 2020, 2020),
    ("inferno by jonathan hickman", 2021, 2021),
    ("a.x.e.: judgment day", 2022, 2022),
    ("sins of sinister", 2023, 2023),
    ("fall of the house of x", 2024, 2024),
    ("rise of the powers of x", 2024, 2024),
    ("daredevil by chip zdarsky", 2019, 2024),
    ("venom by al ewing", 2021, 2023),
    ("thor by donny cates", 2020, 2022),
    ("moon knight by jed mackay", 2021, 2023),
    ("immortal x-men by kieron gillen", 2022, 2023),
    ("wolverine by benjamin percy", 2020, 2024),
    ("x-force by benjamin percy", 2019, 2024),
    ("marauders by gerry duggan", 2019, 2022),
    ("x-men by gerry duggan", 2021, 2023),
    ("x-men red by al ewing", 2022, 2023),
    ("king in black", 2020, 2021),
    ("war of the realms", 2019, 2019),
    ("empyre", 2020, 2020),
    ("absolute carnage", 2019, 2019),
    ("devil's reign", 2022, 2022),
    ("eternals by kieron gillen", 2021, 2022),
    ("captain america by ta-nehisi coates", 2018, 2021),
    ("captain america: sentinel of liberty", 2022, 2023),
    ("black widow by kelly thompson", 2020, 2022),
    ("captain marvel by kelly thompson", 2019, 2022),
    ("she-hulk by rainbow rowell", 2022, 2023),
    ("scarlet witch by steve orlando", 2023, 2024),
    ("amazing spider-man by zeb wells", 2022, 2024),
    ("spider-man: life story", 2019, 2019),
    ("history of the marvel universe", 2019, 2019),
    ("silver surfer: black", 2019, 2019),
    ("guardians of the galaxy by al ewing", 2020, 2021),
    ("guardians of the galaxy by donny cates", 2019, 2020),
    ("avengers by jed mackay", 2023, 2024),
    ("fantastic four by ryan north", 2022, 2024),
    ("fantastic four by dan slott omnibus vol. 2", 2020, 2022),

    # Blood Hunt & Doom (2024-2025) — very specific
    ("blood hunt", 2024, 2024),
    ("one world under doom", 2025, 2025),
    ("doctor doom (2024)", 2024, 2024),
    ("venom war", 2024, 2024),
    ("x-men: from the ashes", 2024, 2025),
    ("ultimate black panther", 2024, 2024),
    ("ultimate spider-man vol. 3", 2024, 2024),
    ("ultimate x-men vol. 1", 2024, 2024),
    ("exceptional x-men", 2024, 2025),
    ("uncanny x-men by gerry duggan vol. 1", 2024, 2024),
    ("immortal thor by al ewing", 2023, 2024),
    ("avengers by jed mackay vol. 2", 2024, 2025),
    ("daredevil by saladin ahmed", 2024, 2025),
    ("phoenix by stephanie phillips", 2024, 2025),
    ("forge (2024)", 2024, 2025),
    ("nyx", 2024, 2025),
    ("spider-boy by dan slott", 2023, 2024),
    ("wolverine: revenge", 2024, 2024),
    ("predator vs. wolverine", 2023, 2024),
    ("miles morales: spider-man by cody ziglar", 2022, 2024),
    ("deadpool by cody ziglar", 2024, 2024),
    ("nova by loveness", 2024, 2025),
    ("timeless by jed mackay", 2021, 2024),

    # Current Ongoings (2025-2026)
    ("armageddon", 2026, 2026),
    ("ultimate invasion", 2023, 2023),
    ("ultimate universe by hickman", 2023, 2025),
    ("ultimate spider-man by jonathan hickman", 2024, 2025),
    ("ultimates by deniz camp", 2024, 2025),
    ("storm by murewa ayodele", 2024, 2025),
    ("wolverine by saladin ahmed vol. 2", 2025, 2025),
    ("phases of the moon knight", 2025, 2025),
    ("sentinels by alex paknadel", 2025, 2025),
    ("x-men by jed mackay (2024)", 2024, 2025),
    ("uncanny x-men by gail simone", 2024, 2025),
    ("spectacular spider-man (2024)", 2024, 2025),
    ("fantastic four (2025)", 2025, 2025),
    ("captain america (2025)", 2025, 2025),
    ("iron man (2025)", 2025, 2025),
    ("thor (2025)", 2025, 2025),
    ("hulk (2025)", 2025, 2025),
]

# Year extraction from title patterns
YEAR_PATTERNS = [
    r'\((\d{4})\)',           # (2024)
    r'\((\d{4})\s*[-–]\s*', # (2024 -
    r'[-–]\s*(\d{4})\)',     # - 2024)
]


def extract_year_from_title(title):
    """Try to extract a publication year from the title."""
    for pattern in YEAR_PATTERNS:
        match = re.search(pattern, title)
        if match:
            year = int(match.group(1))
            if 1960 <= year <= 2026:
                return year
    return None


def match_known_run(title, slug):
    """Match against known run database to get publication year range."""
    title_lower = title.lower()
    slug_lower = slug.lower()

    best_match = None
    best_match_len = 0

    for pattern, start, end in KNOWN_RUNS:
        pattern_lower = pattern.lower()
        if pattern_lower in title_lower or pattern_lower in slug_lower:
            if len(pattern) > best_match_len:
                best_match = (start, end)
                best_match_len = len(pattern)

    return best_match


def determine_correct_era(edition):
    """Determine the correct era for an edition based on publication dates."""
    title = edition.get("title", "")
    slug = edition.get("slug", "")
    issues = edition.get("issues_collected", "")
    synopsis = edition.get("synopsis", "")

    # Method 1: Match against known runs database (highest confidence)
    run_years = match_known_run(title, slug)
    if run_years:
        start_year, end_year = run_years
        # Use the midpoint or start for era placement
        pub_year = start_year
        return find_best_era(pub_year, end_year, title, slug, synopsis, "known_run")

    # Method 2: Extract year from title
    year = extract_year_from_title(title)
    if year:
        return find_best_era(year, year, title, slug, synopsis, "title_year")

    # Method 3: Extract year from issues_collected
    if issues:
        year = extract_year_from_title(issues)
        if year:
            return find_best_era(year, year, title, slug, synopsis, "issues_year")

    return None, "no_signal"


def find_best_era(start_year, end_year, title, slug, synopsis, method):
    """Given a year range, find the best-matching era.

    The key insight: eras overlap. We need to pick the THEMATICALLY correct era,
    not just any era whose date range includes the year.

    Priority rules:
    1. For overlapping eras, prefer the more specific/thematic one
    2. X-Men titles during 1975-1985 go to rise-of-x-men
    3. Non-X-Men titles during 1975-1980 go to bronze-age
    4. Non-X-Men titles during 1980-1985 go to rise-of-x-men (it's the dominant era)
    5. Hickman-specific titles go to hickman-saga even if they overlap with bendis-avengers
    """
    title_lower = title.lower()
    slug_lower = slug.lower()
    text = f"{title_lower} {slug_lower} {(synopsis or '').lower()}"

    # Special handling for overlapping eras

    # Bronze Age vs Rise of X-Men overlap (1975-1980)
    if 1975 <= start_year <= 1980:
        is_xmen = any(kw in text for kw in [
            "x-men", "x-force", "new mutants", "wolverine", "claremont",
            "magneto", "phoenix", "dark phoenix", "nightcrawler", "storm",
            "cyclops", "colossus", "kitty pryde", "shadowcat"
        ])
        is_ff_byrne = "byrne" in text and "fantastic four" in text
        is_simonson_thor = "simonson" in text and "thor" in text
        is_secret_wars = "secret wars" in text and "1984" in text

        if is_xmen:
            return ERA_BY_SLUG["rise-of-x-men"]["id"], method
        elif is_ff_byrne or is_simonson_thor or is_secret_wars:
            return ERA_BY_SLUG["rise-of-x-men"]["id"], method
        elif end_year <= 1980:
            return ERA_BY_SLUG["bronze-age"]["id"], method
        else:
            return ERA_BY_SLUG["rise-of-x-men"]["id"], method

    # Rise of X-Men vs Event Age overlap (1985)
    if 1980 < start_year <= 1985:
        return ERA_BY_SLUG["rise-of-x-men"]["id"], method

    # Bendis Avengers vs Hickman Saga overlap (2009-2012)
    if 2009 <= start_year <= 2012:
        is_hickman = any(kw in text for kw in [
            "hickman", "fantastic four by jonathan hickman", "ff by hickman",
            "s.h.i.e.l.d. by hickman", "secret warriors"
        ])
        is_hickman_adjacent = any(kw in text for kw in [
            "daredevil by mark waid", "hawkeye by fraction", "hawkeye by matt fraction",
            "superior spider-man", "all-new x-men", "thor by jason aaron",
            "god of thunder", "deadpool by posehn", "moon knight by warren ellis",
            "ms. marvel by g. willow wilson", "spider-island",
            "avengers academy", "avengers arena", "age of ultron",
        ])
        if start_year >= 2012 or is_hickman or is_hickman_adjacent:
            return ERA_BY_SLUG["hickman-saga"]["id"], method
        else:
            return ERA_BY_SLUG["bendis-avengers"]["id"], method

    # Hickman Saga vs All-New All-Different overlap (2015-2016)
    if 2015 <= start_year <= 2016:
        is_hickman = any(kw in text for kw in [
            "secret wars (2015)", "secret wars: battleworld", "hickman"
        ])
        if is_hickman:
            return ERA_BY_SLUG["hickman-saga"]["id"], method
        else:
            return ERA_BY_SLUG["all-new-all-different"]["id"], method

    # All-New All-Different vs Dawn of Krakoa overlap (2018-2019)
    if start_year == 2018:
        is_krakoa = any(kw in text for kw in [
            "house of x", "powers of x", "krakoa", "dawn of x"
        ])
        if is_krakoa:
            return ERA_BY_SLUG["dawn-of-krakoa"]["id"], method
        else:
            return ERA_BY_SLUG["all-new-all-different"]["id"], method

    # Dawn of Krakoa vs Blood Hunt overlap (2024)
    if start_year == 2024:
        is_blood_hunt_doom = any(kw in text for kw in [
            "blood hunt", "one world under doom", "doctor doom (2024)",
            "venom war", "from the ashes", "exceptional x-men",
        ])
        is_current = any(kw in text for kw in [
            "armageddon", "(2025)",
        ])
        if is_current:
            return ERA_BY_SLUG["current-ongoings"]["id"], method
        elif is_blood_hunt_doom:
            return ERA_BY_SLUG["blood-hunt-doom"]["id"], method
        else:
            # 2024 titles that started in Krakoa era stay there
            is_krakoa_era = any(kw in text for kw in [
                "fall of the house of x", "rise of the powers of x",
                "fall of x", "krakoa", "x-men: before the fall",
            ])
            if is_krakoa_era:
                return ERA_BY_SLUG["dawn-of-krakoa"]["id"], method
            # Default 2024 to blood-hunt-doom
            return ERA_BY_SLUG["blood-hunt-doom"]["id"], method

    # Simple year-to-era mapping for non-overlapping ranges
    if start_year <= 1966:
        return ERA_BY_SLUG["birth-of-marvel"]["id"], method
    elif start_year <= 1970:
        return ERA_BY_SLUG["the-expansion"]["id"], method
    elif start_year <= 1974:
        return ERA_BY_SLUG["bronze-age"]["id"], method
    # 1975-1985 handled above
    elif start_year <= 1992:
        return ERA_BY_SLUG["event-age"]["id"], method
    elif start_year <= 1996:
        return ERA_BY_SLUG["speculation-crash"]["id"], method
    elif start_year <= 1998:
        return ERA_BY_SLUG["heroes-reborn-return"]["id"], method
    elif start_year <= 2004:
        return ERA_BY_SLUG["marvel-knights-ultimate"]["id"], method
    elif start_year <= 2008:
        return ERA_BY_SLUG["bendis-avengers"]["id"], method
    # 2009-2012 handled above
    elif start_year <= 2014:
        return ERA_BY_SLUG["hickman-saga"]["id"], method
    # 2015-2016 handled above
    elif start_year <= 2018:
        return ERA_BY_SLUG["all-new-all-different"]["id"], method
    elif start_year <= 2023:
        return ERA_BY_SLUG["dawn-of-krakoa"]["id"], method
    # 2024 handled above
    elif start_year >= 2025:
        return ERA_BY_SLUG["current-ongoings"]["id"], method

    return None, method


def main():
    print("=" * 80)
    print("MARVEL CARTOGRAPHER — ERA ASSIGNMENT AUDIT")
    print("=" * 80)

    # Fetch all editions
    print("\nFetching all editions from Supabase...")
    editions = supabase_get("editions_full?select=id,slug,title,era_id,era_slug,era_name,issues_collected,synopsis,connection_notes")
    print(f"Found {len(editions)} editions")

    changes = []
    no_signal = []
    confirmed_correct = []

    for ed in editions:
        current_era_id = ed.get("era_id")
        current_era_slug = ed.get("era_slug", "")
        current_era = ERA_BY_SLUG.get(current_era_slug, ERA_BY_ID.get(current_era_id, {}))

        correct_era_id, method = determine_correct_era(ed)

        if correct_era_id is None:
            no_signal.append(ed)
            continue

        correct_era = ERA_BY_ID.get(correct_era_id, {})

        if correct_era_id != current_era_id:
            changes.append({
                "id": ed["id"],
                "slug": ed["slug"],
                "title": ed["title"],
                "current_era": current_era.get("slug", "unknown"),
                "current_era_name": current_era.get("name", "unknown"),
                "correct_era": correct_era.get("slug", "unknown"),
                "correct_era_name": correct_era.get("name", "unknown"),
                "correct_era_id": correct_era_id,
                "method": method,
            })
        else:
            confirmed_correct.append({
                "slug": ed["slug"],
                "title": ed["title"],
                "era": current_era.get("slug", "unknown"),
            })

    # Report
    print(f"\n{'=' * 80}")
    print(f"AUDIT RESULTS")
    print(f"{'=' * 80}")
    print(f"Total editions:     {len(editions)}")
    print(f"Confirmed correct:  {len(confirmed_correct)}")
    print(f"Need changes:       {len(changes)}")
    print(f"No signal (manual): {len(no_signal)}")

    if changes:
        print(f"\n{'=' * 80}")
        print(f"PROPOSED CHANGES ({len(changes)})")
        print(f"{'=' * 80}")

        # Group by current era -> correct era
        by_move = {}
        for c in changes:
            key = f"{c['current_era']} -> {c['correct_era']}"
            by_move.setdefault(key, []).append(c)

        for move, items in sorted(by_move.items()):
            print(f"\n--- {move} ({len(items)} editions) ---")
            for item in sorted(items, key=lambda x: x["title"]):
                print(f"  [{item['method']:12s}] {item['title']}")

    if no_signal:
        print(f"\n{'=' * 80}")
        print(f"NO SIGNAL — NEED MANUAL REVIEW ({len(no_signal)})")
        print(f"{'=' * 80}")
        for ed in sorted(no_signal, key=lambda x: x.get("era_slug", "") + x["title"]):
            current_era = ERA_BY_SLUG.get(ed.get("era_slug", ""), ERA_BY_ID.get(ed.get("era_id"), {}))
            print(f"  [{current_era.get('slug', 'unknown'):25s}] {ed['title']}")

    # Write changes to JSON for review
    output = {
        "total_editions": len(editions),
        "confirmed_correct": len(confirmed_correct),
        "changes_needed": len(changes),
        "no_signal": len(no_signal),
        "changes": changes,
        "no_signal_editions": [{"slug": e["slug"], "title": e["title"], "current_era": ERA_BY_SLUG.get(e.get("era_slug", ""), {}).get("slug", "unknown")} for e in no_signal],
    }

    with open("/Users/danielbennin/Desktop/Marvel Complete/marvel-cartographer/scripts/audit_results.json", "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nFull results written to scripts/audit_results.json")
    return output


if __name__ == "__main__":
    main()
