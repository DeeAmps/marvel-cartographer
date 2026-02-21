#!/usr/bin/env node
/**
 * validate-event-editions.mjs
 *
 * Data-quality gate for event_editions.json.
 * Checks that every event→edition mapping is plausible by parsing issue
 * numbers from the event's `core_issues` and the edition's `issues_collected`,
 * then verifying overlap.
 *
 * Run:  node scripts/validate-event-editions.mjs
 * Exit: 0 if clean, 1 if any errors found.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, "../web/data");

const events = JSON.parse(readFileSync(resolve(dataDir, "events.json"), "utf8"));
const editions = JSON.parse(readFileSync(resolve(dataDir, "collected_editions.json"), "utf8"));
const eventEditions = JSON.parse(readFileSync(resolve(dataDir, "event_editions.json"), "utf8"));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const editionMap = new Map(editions.map((e) => [e.slug, e]));
const eventMap = new Map(events.map((e) => [e.slug, e]));

/** Normalise common series-name abbreviations so comparisons work. */
function normaliseSeries(raw) {
  let s = raw.trim().toLowerCase();
  // Strip parenthetical year
  s = s.replace(/\s*\(\d{4}\)\s*/g, " ").trim();
  // Common abbreviations
  const aliases = {
    ff: "fantastic four",
    asm: "amazing spider-man",
    uxm: "uncanny x-men",
    tasm: "amazing spider-man",
    ssm: "spectacular spider-man",
    mtio: "marvel two-in-one",
    msm: "marvel super-man",
    avx: "avengers vs. x-men",
    "avengers vs x-men": "avengers vs. x-men",
  };
  return aliases[s] || s;
}

/**
 * Parse an issues string like:
 *   "Fantastic Four #48-50, Silver Surfer #1-18, Annual #1"
 * into a set of {series, number} objects.
 *
 * Handles:
 *  - "Series #N-M"  (ranges)
 *  - "Series #N"    (single)
 *  - "Series #N, #M" (comma-separated in same series context)
 *  - "Annual #N"    (treated as separate)
 */
function parseIssues(text) {
  if (!text) return { series: new Set(), numbers: new Map() };

  const series = new Set();
  /** Map<normalisedSeries, Set<number>> */
  const numbers = new Map();

  // Normalise separators: semicolons and " and " to commas
  text = text.replace(/;\s*/g, ", ").replace(/\s+and\s+/gi, ", ");

  // Split on commas but respect parenthetical years
  const parts = text.split(/,(?![^(]*\))/);

  let currentSeries = null;

  for (let part of parts) {
    part = part.trim();
    if (!part) continue;

    // Skip vague entries
    if (/^(plus|related|tie-ins|crossover|miscellaneous|upcoming|ongoing|collected|various|multiple)/i.test(part)) continue;
    if (/material\)$/i.test(part)) continue;

    // Match "Series Name #N" or "Series Name #N-M"
    const fullMatch = part.match(/^(.+?)\s*#(\d+)(?:\s*-\s*(\d+))?/);
    if (fullMatch) {
      const serName = normaliseSeries(fullMatch[1]);
      currentSeries = serName;
      series.add(serName);
      const lo = parseInt(fullMatch[2], 10);
      const hi = fullMatch[3] ? parseInt(fullMatch[3], 10) : lo;
      if (!numbers.has(serName)) numbers.set(serName, new Set());
      const set = numbers.get(serName);
      for (let i = lo; i <= hi && i <= lo + 500; i++) set.add(i);
      continue;
    }

    // Match continuation "#N" or "#N-M" (uses currentSeries)
    const contMatch = part.match(/^#(\d+)(?:\s*-\s*(\d+))?/);
    if (contMatch && currentSeries) {
      const lo = parseInt(contMatch[1], 10);
      const hi = contMatch[2] ? parseInt(contMatch[2], 10) : lo;
      if (!numbers.has(currentSeries)) numbers.set(currentSeries, new Set());
      const set = numbers.get(currentSeries);
      for (let i = lo; i <= hi && i <= lo + 500; i++) set.add(i);
      continue;
    }

    // Match standalone number (e.g. "40" in "Silver Surfer #34-38, 40, 44-60")
    const standaloneNum = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (standaloneNum && currentSeries) {
      const lo = parseInt(standaloneNum[1], 10);
      const hi = standaloneNum[2] ? parseInt(standaloneNum[2], 10) : lo;
      if (!numbers.has(currentSeries)) numbers.set(currentSeries, new Set());
      const set = numbers.get(currentSeries);
      for (let i = lo; i <= hi && i <= lo + 500; i++) set.add(i);
      continue;
    }

    // Named one-shot — just add the series name
    const nameOnly = part.replace(/\s*\(\d{4}\)/, "").trim().toLowerCase();
    if (nameOnly.length > 2) {
      series.add(nameOnly);
      currentSeries = null; // reset
    }
  }

  return { series, numbers };
}

/**
 * Check if any issue numbers from `core` overlap with `edition`.
 * Returns { overlaps: boolean, details: string }
 */
function checkOverlap(coreParsed, editionParsed) {
  // Strategy 1: Check if any normalised series names match AND share issue numbers
  for (const [coreSer, coreNums] of coreParsed.numbers) {
    for (const [edSer, edNums] of editionParsed.numbers) {
      // Fuzzy series match: one contains the other
      if (coreSer === edSer || coreSer.includes(edSer) || edSer.includes(coreSer)) {
        const shared = [...coreNums].filter((n) => edNums.has(n));
        if (shared.length > 0) {
          return { overlaps: true, details: `${coreSer}: shared issues ${shared.slice(0, 5).join(",")}${shared.length > 5 ? "..." : ""}` };
        }
      }
    }
  }

  // Strategy 2: Check series name overlap even without numbers
  for (const cSer of coreParsed.series) {
    for (const eSer of editionParsed.series) {
      if (cSer === eSer || cSer.includes(eSer) || eSer.includes(cSer)) {
        // Series match but no number overlap — could be a naming match
        return { overlaps: true, details: `series name match: "${cSer}" ~ "${eSer}"` };
      }
    }
  }

  return { overlaps: false, details: "no series or issue overlap found" };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

let errors = 0;
let warnings = 0;
let skipped = 0;
let passed = 0;

console.log("=== Event-Edition Data Quality Validation ===\n");

// Check 1: All event slugs and edition slugs exist
console.log("--- Check 1: Slug existence ---");
for (const ee of eventEditions) {
  if (!eventMap.has(ee.event_slug)) {
    console.log(`  ERROR: event slug "${ee.event_slug}" not found in events.json`);
    errors++;
  }
  if (!editionMap.has(ee.edition_slug)) {
    console.log(`  ERROR: edition slug "${ee.edition_slug}" not found in collected_editions.json`);
    errors++;
  }
}

// Check 2: Every event has at least one mapping
console.log("\n--- Check 2: Event coverage ---");
const mappedEvents = new Set(eventEditions.map((ee) => ee.event_slug));
for (const event of events) {
  if (!mappedEvents.has(event.slug)) {
    console.log(`  WARNING: event "${event.slug}" (${event.name}) has no edition mappings`);
    warnings++;
  }
}

// Check 3: Reading order is sequential per event
console.log("\n--- Check 3: Reading order sequence ---");
const byEvent = new Map();
for (const ee of eventEditions) {
  if (!byEvent.has(ee.event_slug)) byEvent.set(ee.event_slug, []);
  byEvent.get(ee.event_slug).push(ee);
}
for (const [slug, entries] of byEvent) {
  const orders = entries.map((e) => e.reading_order).sort((a, b) => a - b);
  for (let i = 0; i < orders.length; i++) {
    if (orders[i] !== i + 1) {
      console.log(`  WARNING: "${slug}" reading_order not sequential: [${orders.join(",")}]`);
      warnings++;
      break;
    }
  }
}

// Check 4: At least one core edition per event
console.log("\n--- Check 4: Core edition presence ---");
for (const [slug, entries] of byEvent) {
  const hasCoreEdition = entries.some((e) => e.is_core);
  if (!hasCoreEdition) {
    console.log(`  WARNING: "${slug}" has no is_core=true edition`);
    warnings++;
  }
}

// Check 5: CORE editions actually contain the event's core issues (THE KEY CHECK)
console.log("\n--- Check 5: Core issue overlap validation ---");
for (const ee of eventEditions) {
  if (!ee.is_core) continue;

  const event = eventMap.get(ee.event_slug);
  const edition = editionMap.get(ee.edition_slug);
  if (!event || !edition) continue;

  const coreIssues = event.core_issues;
  const edIssues = edition.issues_collected;

  // Skip vague/upcoming entries
  if (!coreIssues || !edIssues) { skipped++; continue; }
  if (/^(upcoming|multiple|various)/i.test(edIssues)) { skipped++; continue; }
  if (/\(solicited\)/i.test(coreIssues)) { skipped++; continue; }
  if (/annual.*only|annuals\s*\(/i.test(coreIssues)) { skipped++; continue; }

  const coreParsed = parseIssues(coreIssues);
  const edParsed = parseIssues(edIssues);

  // If we couldn't extract any numbers from either side, skip
  if (coreParsed.numbers.size === 0 && coreParsed.series.size === 0) { skipped++; continue; }
  if (edParsed.numbers.size === 0 && edParsed.series.size === 0) { skipped++; continue; }

  const result = checkOverlap(coreParsed, edParsed);

  if (!result.overlaps) {
    console.log(`  ERROR: "${ee.event_slug}" CORE edition "${ee.edition_slug}" has NO overlap with core issues`);
    console.log(`         Core issues: ${coreIssues}`);
    console.log(`         Edition:     ${edIssues.slice(0, 100)}`);
    console.log(`         Parsed core series: ${[...coreParsed.series].join(", ")}`);
    console.log(`         Parsed ed series:   ${[...edParsed.series].join(", ")}`);
    console.log();
    errors++;
  } else {
    passed++;
  }
}

// Check 6: Duplicate mappings
console.log("\n--- Check 6: Duplicate mappings ---");
const seen = new Set();
for (const ee of eventEditions) {
  const key = `${ee.event_slug}::${ee.edition_slug}`;
  if (seen.has(key)) {
    console.log(`  ERROR: duplicate mapping "${ee.event_slug}" -> "${ee.edition_slug}"`);
    errors++;
  }
  seen.add(key);
}

// Check 7: Era consistency — event era should broadly match edition era
console.log("\n--- Check 7: Era consistency ---");
const eraOrder = new Map();
for (const era of JSON.parse(readFileSync(resolve(dataDir, "eras.json"), "utf8"))) {
  eraOrder.set(era.slug, era.number);
}
for (const ee of eventEditions) {
  const event = eventMap.get(ee.event_slug);
  const edition = editionMap.get(ee.edition_slug);
  if (!event || !edition) continue;
  const eventEra = eraOrder.get(event.era_slug);
  const edEra = eraOrder.get(edition.era_slug);
  if (eventEra != null && edEra != null) {
    const diff = Math.abs(eventEra - edEra);
    if (diff > 3) {
      console.log(`  WARNING: "${ee.event_slug}" (era ${event.era_slug}/#${eventEra}) -> "${ee.edition_slug}" (era ${edition.era_slug}/#${edEra}) — ${diff} eras apart`);
      warnings++;
    }
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\n=== SUMMARY ===");
console.log(`  Total mappings: ${eventEditions.length}`);
console.log(`  Events covered: ${mappedEvents.size} / ${events.length}`);
console.log(`  Core overlap checks passed: ${passed}`);
console.log(`  Core overlap checks skipped (vague data): ${skipped}`);
console.log(`  Errors: ${errors}`);
console.log(`  Warnings: ${warnings}`);

if (errors > 0) {
  console.log("\n❌ VALIDATION FAILED — fix errors above before deploying.");
  process.exit(1);
} else if (warnings > 0) {
  console.log("\n⚠️  Validation passed with warnings — review above.");
  process.exit(0);
} else {
  console.log("\n✅ All checks passed.");
  process.exit(0);
}
