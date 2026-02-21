import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const editions = JSON.parse(readFileSync(resolve(__dirname, "..", "web", "data", "collected_editions.json"), "utf-8"));

const eras = [
  { slug: "birth-of-marvel", start: 1961, end: 1966 },
  { slug: "the-expansion", start: 1966, end: 1970 },
  { slug: "bronze-age", start: 1970, end: 1980 },
  { slug: "rise-of-x-men", start: 1975, end: 1985 },
  { slug: "event-age", start: 1985, end: 1992 },
  { slug: "speculation-crash", start: 1992, end: 1996 },
  { slug: "heroes-reborn-return", start: 1996, end: 1998 },
  { slug: "marvel-knights-ultimate", start: 1998, end: 2004 },
  { slug: "bendis-avengers", start: 2004, end: 2012 },
  { slug: "hickman-saga", start: 2009, end: 2015 },
  { slug: "all-new-all-different", start: 2015, end: 2018 },
  { slug: "dawn-of-krakoa", start: 2019, end: 2024 },
  { slug: "blood-hunt-doom", start: 2024, end: 2025 },
  { slug: "current-ongoings", start: 2025, end: 2026 },
];

// Known series launch years (the year in parentheses) mapped to approximate issue-to-year
// This helps determine when specific issues were published
const SERIES_YEAR_MAP = {
  // Silver Age
  "fantastic four (1961)": 1961, "amazing spider-man (1963)": 1963, "avengers (1963)": 1963,
  "x-men (1963)": 1963, "daredevil (1964)": 1964, "tales of suspense": 1959,
  "journey into mystery": 1952, "strange tales": 1951, "tales to astonish": 1959,
  "iron man (1968)": 1968, "captain america (1968)": 1968, "hulk (1968)": 1968,
  "silver surfer (1968)": 1968, "sub-mariner (1968)": 1968,
  // Bronze
  "amazing spider-man (1963)": 1963, "tomb of dracula": 1972, "luke cage": 1972,
  "iron fist (1975)": 1975, "master of kung fu": 1974,
  "defenders (1972)": 1972, "marvel team-up": 1972, "marvel two-in-one": 1974,
  // Late Bronze / Rise of X-Men
  "uncanny x-men (1963)": 1963, "new mutants (1983)": 1983,
  "alpha flight (1983)": 1983, "power pack": 1984,
  "spectacular spider-man (1976)": 1976, "thor (1966)": 1966,
  // Event Age
  "x-factor (1986)": 1986, "excalibur (1988)": 1988, "new warriors (1990)": 1990,
  "silver surfer (1987)": 1987, "punisher (1987)": 1987,
  "wolverine (1988)": 1988, "ghost rider (1990)": 1990,
  // Speculation
  "x-men (1991)": 1991, "x-force (1991)": 1991, "deadpool (1997)": 1997,
  "thunderbolts (1997)": 1997, "cable (1993)": 1993,
  // Heroes Reborn/Return
  "avengers (1996)": 1996, "fantastic four (1996)": 1996, "iron man (1996)": 1996,
  "captain america (1996)": 1996, "heroes reborn": 1996,
  "avengers (1998)": 1998, "fantastic four (1998)": 1998, "iron man (1998)": 1998,
  "captain america (1998)": 1998, "peter parker: spider-man (1999)": 1999,
  "thunderbolts (1997)": 1997,
  // Marvel Knights / Ultimate
  "daredevil (1998)": 1998, "black panther (1998)": 1998, "inhumans (1998)": 1998,
  "ultimate spider-man (2000)": 2000, "ultimates (2002)": 2002,
  "new x-men (2001)": 2001, "alias (2001)": 2001,
  "amazing spider-man (1999)": 1999,
  // Bendis Avengers
  "new avengers (2004)": 2004, "young avengers (2005)": 2005,
  "ms. marvel (2006)": 2006, "captain america (2004)": 2004,
  "iron man (2004)": 2004, "incredible hulk (2000)": 2000,
  "wolverine (2003)": 2003, "daredevil (1998)": 1998,
  "uncanny x-men (2006)": 2006, "astonishing x-men (2004)": 2004,
  "annihilation": 2006, "nova (2007)": 2007,
  "guardians of the galaxy (2008)": 2008,
  // Hickman
  "fantastic four (1998)": 1998, "ff (2011)": 2011,
  "avengers (2012)": 2012, "new avengers (2013)": 2013,
  "secret wars (2015)": 2015, "infinity (2013)": 2013,
  "uncanny x-men (2013)": 2013, "all-new x-men (2012)": 2012,
  "superior spider-man (2013)": 2013, "indestructible hulk (2012)": 2012,
  // ANAD
  "all-new all-different avengers (2015)": 2015, "invincible iron man (2015)": 2015,
  "amazing spider-man (2015)": 2015, "extraordinary x-men (2015)": 2015,
  "all-new wolverine (2015)": 2015, "vision (2015)": 2015,
  "black panther (2016)": 2016, "jessica jones (2016)": 2016,
  "champions (2016)": 2016, "mighty thor (2015)": 2015,
  "captain america: steve rogers (2016)": 2016,
  "amazing spider-man (2018)": 2018, "avengers (2018)": 2018,
  "immortal hulk (2018)": 2018, "venom (2018)": 2018,
  "fantastic four (2018)": 2018, "captain america (2018)": 2018,
  "tony stark: iron man (2018)": 2018,
  // Krakoa
  "x-men (2019)": 2019, "marauders (2019)": 2019, "excalibur (2019)": 2019,
  "new mutants (2019)": 2019, "x-force (2019)": 2019, "hellions (2020)": 2020,
  "cable (2020)": 2020, "s.w.o.r.d. (2020)": 2020,
  "x-men (2021)": 2021, "immortal x-men (2022)": 2022,
  "amazing spider-man (2022)": 2022, "avengers (2023)": 2023,
  "venom (2021)": 2021, "moon knight (2021)": 2021,
  "she-hulk (2022)": 2022, "iron man (2020)": 2020,
  // Blood Hunt / Doom
  "blood hunt": 2024, "one world under doom": 2024,
  "x-men (2024)": 2024, "uncanny x-men (2024)": 2024,
  "ultimate spider-man (2024)": 2024, "ultimates (2024)": 2024,
  // Current
  "amazing spider-man (2025)": 2025, "avengers (2025)": 2025,
};

// For each era, print all editions with a flag if they might be wrong
const eraArg = process.argv[2];

for (const era of eras) {
  if (eraArg && era.slug !== eraArg) continue;

  const eraEditions = editions.filter(e => e.era_slug === era.slug);
  console.log(`\n${"=".repeat(80)}`);
  console.log(`ERA: ${era.slug} (${era.start}-${era.end}) — ${eraEditions.length} editions`);
  console.log(`${"=".repeat(80)}`);

  for (const e of eraEditions) {
    const issues = (e.issues_collected || "").toLowerCase();
    const title = (e.title || "");

    // Try to detect the content year from series year in issues_collected
    let flag = "";
    const yearMatches = [...issues.matchAll(/\((\d{4})\)/g)];
    if (yearMatches.length > 0) {
      const years = yearMatches.map(m => parseInt(m[1]));
      const maxYear = Math.max(...years);
      const minYear = Math.min(...years);

      // Estimate actual publication year based on series launch + issue numbers
      // Simple heuristic: if ALL series years are outside the era range, flag it
      const allOutside = years.every(y => y > era.end || y < era.start - 5);
      // But many series span decades (ASM 1963 runs to 2012), so also check issue numbers

      if (maxYear > era.end + 2) {
        flag = `⚠️  SERIES YEAR ${maxYear} > ERA END ${era.end}`;
      } else if (minYear < era.start - 10 && !title.toLowerCase().includes("omnibus") && !title.toLowerCase().includes("epic")) {
        // Old series in a newer era — could be fine for reprints
      }
    }

    // Check for obvious name mismatches
    const tl = title.toLowerCase();
    if (era.slug === "dawn-of-krakoa" && !tl.includes("x-men") && !tl.includes("krakoa")) {
      // Non-X titles in Krakoa era — check if they're 2019-2024 content
      const seriesYears = [...issues.matchAll(/\((\d{4})\)/g)].map(m => parseInt(m[1]));
      if (seriesYears.length > 0 && seriesYears.every(y => y < 2018)) {
        flag = `⚠️  PRE-2018 CONTENT IN KRAKOA`;
      }
    }

    if (era.slug === "blood-hunt-doom") {
      const seriesYears = [...issues.matchAll(/\((\d{4})\)/g)].map(m => parseInt(m[1]));
      if (seriesYears.length > 0 && seriesYears.every(y => y < 2023)) {
        flag = `⚠️  PRE-2023 CONTENT IN BLOOD-HUNT-DOOM`;
      }
    }

    if (era.slug === "current-ongoings") {
      const seriesYears = [...issues.matchAll(/\((\d{4})\)/g)].map(m => parseInt(m[1]));
      if (seriesYears.length > 0 && seriesYears.every(y => y < 2025)) {
        flag = `⚠️  PRE-2025 CONTENT IN CURRENT-ONGOINGS`;
      }
    }

    console.log(`  ${flag ? flag.padEnd(45) : "".padEnd(3)}${e.slug}`);
    if (flag) {
      console.log(`     TITLE: ${title}`);
      console.log(`     ISSUES: ${issues.substring(0, 100)}`);
    }
  }
}
