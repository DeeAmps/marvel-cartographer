#!/usr/bin/env node

/**
 * generate_edition_issues.js
 *
 * Reads collected_editions.json and parses the `issues_collected` field
 * for each edition into normalized individual issue records.
 *
 * Output: data/edition_issues.json
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Series abbreviation mappings
// ---------------------------------------------------------------------------
const ABBREVIATIONS = {
  'FF':       'Fantastic Four',
  'ASM':      'Amazing Spider-Man',
  'AF':       'Amazing Fantasy',
  'UXM':      'Uncanny X-Men',
  'NXM':      'New X-Men',
  'NM':       'New Mutants',
  'MTIO':     'Marvel Two-In-One',
  'PP:SM':    'Peter Parker: The Spectacular Spider-Man',
  'PPTSSM':   'Peter Parker: The Spectacular Spider-Man',
  'WCA':      'West Coast Avengers',
  'NA':       'New Avengers',
  'SW':       'Secret Wars',
  'GotG':     'Guardians of the Galaxy',
  'SSM':      'Spectacular Spider-Man',
  'USM':      'Ultimate Spider-Man',
  'DD':       'Daredevil',
  'WBN':      'Werewolf by Night',
  'GN':       'Graphic Novel',
  'OGN':      'Original Graphic Novel',
  'AvX':      'Avengers vs. X-Men',
};

// ---------------------------------------------------------------------------
// Patterns that should be silently skipped (not real issue references)
// ---------------------------------------------------------------------------
const SKIP_PATTERNS = [
  /^miscellaneous$/i,
  /^related$/i,
  /^related\s+(miniseries|tie-ins|tie.ins|material)$/i,
  /^specials$/i,
  /^plus\s/i,
  /^various\s/i,
  /^multiple\s/i,
  /^complete\s/i,
  /^full\s/i,
  /^collected\s+in\s+trades$/i,
  /^ongoing$/i,
  /^upcoming$/i,
  /^\d{4}\s+crossover/i,
  /^crossover\s+issues$/i,
  /^and\s+(related|others|extensive|crossovers)/i,
  /^extensive\s+crossover/i,
  /material$/i,
  /epilogues$/i,
  /one-shots?\s+and\s+minis$/i,
  /^Free Comic Book Day/i,
];

function isSkippable(seg) {
  return SKIP_PATTERNS.some(p => p.test(seg.trim()));
}

// ---------------------------------------------------------------------------
// Expand an abbreviation, preserving any year suffix like "(1998)"
// ---------------------------------------------------------------------------
function expandAbbreviation(raw) {
  // Match: ABBREV (YEAR) or just ABBREV
  const m = raw.match(/^([A-Za-z:.]+)\s*(\(\d{4}\))?$/);
  if (!m) return raw;

  const abbr = m[1];
  const yearSuffix = m[2] || '';

  if (ABBREVIATIONS[abbr]) {
    return (ABBREVIATIONS[abbr] + (yearSuffix ? ' ' + yearSuffix : '')).trim();
  }
  return raw;
}

// ---------------------------------------------------------------------------
// Clean up a segment: strip trailing "+ tie-ins", "+ crossovers", etc.
// Also strip trailing "+" (ongoing marker)
// ---------------------------------------------------------------------------
function cleanSegment(seg) {
  // Strip " + tie-ins", " + crossovers", etc.
  seg = seg.replace(/\s*\+\s*(tie-ins|crossovers|tie.ins|cross-overs|related)$/i, '');
  // Strip trailing "+" (ongoing indicator)
  seg = seg.replace(/\+$/, '').trim();
  // Strip trailing "(FrankenCastle)" or similar parenthetical notes
  seg = seg.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return seg;
}

// ---------------------------------------------------------------------------
// Parse an issue spec string that may contain ranges, singles, fractionals
// Returns array of issue numbers (integers)
// ---------------------------------------------------------------------------
function parseIssueSpec(spec) {
  const results = [];
  const parts = spec.split(/,\s*/);

  for (let part of parts) {
    part = part.replace(/^#/, '').trim();
    if (!part) continue;

    // Handle "ongoing" — skip
    if (/ongoing/i.test(part)) continue;

    // Range with fractional: "7.1-7.3" → 7
    const fracRangeMatch = part.match(/^(\d+)\.(\d+)\s*-\s*(\d+)\.(\d+)$/);
    if (fracRangeMatch) {
      const baseStart = parseInt(fracRangeMatch[1], 10);
      const subStart = parseInt(fracRangeMatch[2], 10);
      const baseEnd = parseInt(fracRangeMatch[3], 10);
      const subEnd = parseInt(fracRangeMatch[4], 10);
      // For fractional ranges like 7.1-7.3, create entries for each sub-issue
      if (baseStart === baseEnd) {
        for (let s = subStart; s <= subEnd; s++) {
          results.push({ number: baseStart, fractional: `${baseStart}.${s}` });
        }
      } else {
        // Cross-integer fractional range — just store the integer range
        for (let i = baseStart; i <= baseEnd; i++) {
          results.push({ number: i, fractional: null });
        }
      }
      continue;
    }

    // Range with fractional end: "1-5.1" → 1,2,3,4,5
    const fracEndRangeMatch = part.match(/^(\d+)\s*-\s*(\d+)\.(\d+)$/);
    if (fracEndRangeMatch) {
      const start = parseInt(fracEndRangeMatch[1], 10);
      const end = parseInt(fracEndRangeMatch[2], 10);
      for (let i = start; i <= end; i++) {
        results.push({ number: i, fractional: null });
      }
      continue;
    }

    // Integer range: "1-30"
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      for (let i = start; i <= end; i++) {
        results.push({ number: i, fractional: null });
      }
      continue;
    }

    // Fractional single: "5.1" or "0.1"
    const fracSingleMatch = part.match(/^(\d+)\.(\d+)$/);
    if (fracSingleMatch) {
      results.push({
        number: parseInt(fracSingleMatch[1], 10),
        fractional: part,
      });
      continue;
    }

    // Single with suffix: "10AI"
    const singleSuffixMatch = part.match(/^(\d+)([A-Za-z]+)$/);
    if (singleSuffixMatch) {
      results.push({ number: parseInt(singleSuffixMatch[1], 10), fractional: null });
      continue;
    }

    // Plain single: "1"
    const singleMatch = part.match(/^(\d+)$/);
    if (singleMatch) {
      results.push({ number: parseInt(singleMatch[1], 10), fractional: null });
      continue;
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Parse a single segment like "FF #1-30" or "Annual #1-2" or "Giant-Size X-Men #1"
// Returns an array of { series_name, issue_number, is_annual }
// ---------------------------------------------------------------------------
function parseSegment(segment, contextSeries) {
  segment = segment.trim();
  if (!segment) return [];

  // Skip unparseable descriptive entries
  if (isSkippable(segment)) return [];

  // Clean the segment (strip " + tie-ins" etc.)
  segment = cleanSegment(segment);
  if (!segment) return [];

  const results = [];

  // -----------------------------------------------------------------------
  // Case: bare "Annual" (no number) — inherits context series
  // -----------------------------------------------------------------------
  if (/^Annual$/i.test(segment)) {
    const annualSeries = (contextSeries || 'Unknown') + ' Annual';
    results.push({ series_name: annualSeries, issue_number: 1, is_annual: true });
    return results;
  }

  // -----------------------------------------------------------------------
  // Case: "Annual #N" or "Annual #N-M" (bare annual, inherits context series)
  // -----------------------------------------------------------------------
  const annualMatch = segment.match(/^Annual\s*#?(\d+)(?:\s*-\s*(\d+))?$/i);
  if (annualMatch) {
    const annualSeries = (contextSeries || 'Unknown') + ' Annual';
    const start = parseInt(annualMatch[1], 10);
    const end = annualMatch[2] ? parseInt(annualMatch[2], 10) : start;
    for (let i = start; i <= end; i++) {
      results.push({ series_name: annualSeries, issue_number: i, is_annual: true });
    }
    return results;
  }

  // -----------------------------------------------------------------------
  // Case: "Annual YYYY" (like "Annual 2001") — single annual by year
  // -----------------------------------------------------------------------
  const annualYearMatch = segment.match(/^Annual\s+(\d{4})$/i);
  if (annualYearMatch) {
    const annualSeries = (contextSeries || 'Unknown') + ' Annual';
    results.push({ series_name: annualSeries, issue_number: parseInt(annualYearMatch[1], 10), is_annual: true });
    return results;
  }

  // -----------------------------------------------------------------------
  // Case: "SERIES Annual #N" or "SERIES Annual #N-M"
  //   e.g. "Avengers Annual #7", "MTIO Annual #2", "FF Annual #5"
  // -----------------------------------------------------------------------
  const seriesAnnualMatch = segment.match(/^(.+?)\s+Annual\s*#?(\d+)(?:\s*-\s*(\d+))?$/i);
  if (seriesAnnualMatch) {
    const rawSeries = seriesAnnualMatch[1].trim();
    const expanded = expandAbbreviation(rawSeries);
    const annualSeries = expanded + ' Annual';
    const start = parseInt(seriesAnnualMatch[2], 10);
    const end = seriesAnnualMatch[3] ? parseInt(seriesAnnualMatch[3], 10) : start;
    for (let i = start; i <= end; i++) {
      results.push({ series_name: annualSeries, issue_number: i, is_annual: true });
    }
    return results;
  }

  // -----------------------------------------------------------------------
  // Case: Bare "#N-M" or "#N" (inherits contextSeries)
  //   e.g. "#500-524", "#6-20", "#226"
  // -----------------------------------------------------------------------
  const bareHashMatch = segment.match(/^#(.+)$/);
  if (bareHashMatch && contextSeries) {
    const issueNums = parseIssueSpec(bareHashMatch[1]);
    for (const iss of issueNums) {
      results.push({ series_name: contextSeries, issue_number: iss.number, is_annual: false });
    }
    return results;
  }

  // -----------------------------------------------------------------------
  // Case: "SERIES #N-M" or "SERIES #N" — the main pattern
  //   e.g. "FF #1-30", "Avengers #233", "FF (1998) #570-588"
  //   Also: "FF (2022) #1-ongoing" — treat as just issue #1
  // -----------------------------------------------------------------------
  const seriesIssueMatch = segment.match(/^(.+?)\s*#(.+)$/);
  if (seriesIssueMatch) {
    const rawSeries = seriesIssueMatch[1].trim();
    let issueSpec = seriesIssueMatch[2].trim();

    // Strip trailing "+" (ongoing indicator) from issue spec
    issueSpec = issueSpec.replace(/\+$/, '').trim();

    // Handle "N-ongoing" — treat as just issue N (we don't know the end)
    const ongoingMatch = issueSpec.match(/^(\d+)-ongoing$/i);
    if (ongoingMatch) {
      const expanded = expandAbbreviation(rawSeries);
      results.push({ series_name: expanded, issue_number: parseInt(ongoingMatch[1], 10), is_annual: false });
      return results;
    }

    const expanded = expandAbbreviation(rawSeries);
    const issueNums = parseIssueSpec(issueSpec);

    for (const iss of issueNums) {
      results.push({ series_name: expanded, issue_number: iss.number, is_annual: false });
    }

    return results;
  }

  // -----------------------------------------------------------------------
  // Case: bare number range "N-M" (inherits contextSeries)
  //   e.g. "226-233", "121-122", "215-250"
  // -----------------------------------------------------------------------
  const bareRangeMatch = segment.match(/^(\d+)\s*-\s*(\d+)$/);
  if (bareRangeMatch && contextSeries) {
    const start = parseInt(bareRangeMatch[1], 10);
    const end = parseInt(bareRangeMatch[2], 10);
    for (let i = start; i <= end; i++) {
      results.push({ series_name: contextSeries, issue_number: i, is_annual: false });
    }
    return results;
  }

  // -----------------------------------------------------------------------
  // Case: bare number "N" (inherits contextSeries)
  // -----------------------------------------------------------------------
  const bareNumberMatch = segment.match(/^(\d+)$/);
  if (bareNumberMatch && contextSeries) {
    results.push({
      series_name: contextSeries,
      issue_number: parseInt(bareNumberMatch[1], 10),
      is_annual: false,
    });
    return results;
  }

  // -----------------------------------------------------------------------
  // Case: one-shot titles — "Series/Series" format
  //   e.g. "Sentry/Fantastic Four" → 1 issue
  // -----------------------------------------------------------------------
  if (/^[A-Za-z]+\/[A-Za-z]/.test(segment) && !segment.includes('#')) {
    results.push({ series_name: segment, issue_number: 1, is_annual: false });
    return results;
  }

  // -----------------------------------------------------------------------
  // Case: named one-shots without issue numbers
  //   e.g. "Ignition", "Devastation", "Avengers Finale"
  //   Treat as issue 1 of a series named after the segment
  // -----------------------------------------------------------------------
  // Only if the segment looks like a proper name (starts with capital)
  if (/^[A-Z][A-Za-z\s':&.?!-]+$/.test(segment) && segment.split(/\s+/).length <= 10) {
    results.push({ series_name: segment, issue_number: 1, is_annual: false });
    return results;
  }

  // -----------------------------------------------------------------------
  // Case: Descriptive / unparseable — return empty
  // -----------------------------------------------------------------------
  return results;
}

// ---------------------------------------------------------------------------
// Smart segmentation: split issues_collected into logical segments
//
// The challenge is that commas serve double duty:
// - Separating different series: "FF #1-30, Avengers #1-30"
// - Separating bare numbers within a series: "Thing #10, 19, 23"
//
// Strategy: split by comma, then re-merge bare numbers and bare ranges
// back into their preceding series.
// ---------------------------------------------------------------------------
function smartSegment(issuesCollected) {
  // First, handle the em-dash (used for descriptive text like "all series")
  // Split on em-dash, take the first part if the rest is descriptive
  let cleaned = issuesCollected;
  const dashMatch = cleaned.match(/^(.*?)\s*\u2014\s*(.*)$/);
  if (dashMatch) {
    const afterDash = dashMatch[2].trim();
    // If the part after the dash is descriptive (no issue numbers), discard it
    if (!/#\d/.test(afterDash) && !/\d+-\d+/.test(afterDash)) {
      cleaned = dashMatch[1].trim();
    }
  }

  const rawParts = cleaned.split(/,\s*/);
  const segments = [];
  let lastSeriesPrefix = null;

  for (const part of rawParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Track the series prefix from segments that have "SERIES #..."
    const seriesMatch = trimmed.match(/^(.+?)\s*#/);
    if (seriesMatch) {
      lastSeriesPrefix = seriesMatch[1].trim();
    }

    // If this part is a bare number like "19" or "23", synthesize it
    if (/^\d+$/.test(trimmed) && lastSeriesPrefix) {
      segments.push(lastSeriesPrefix + ' #' + trimmed);
      continue;
    }

    // If this part is a bare range like "226-233" or "121-122"
    if (/^\d+\s*-\s*\d+$/.test(trimmed) && lastSeriesPrefix) {
      segments.push(lastSeriesPrefix + ' #' + trimmed);
      continue;
    }

    // If this part starts with "#" (bare hash ref), it inherits the last series
    if (/^#/.test(trimmed) && lastSeriesPrefix) {
      segments.push(lastSeriesPrefix + ' ' + trimmed);
      continue;
    }

    segments.push(trimmed);
  }

  return segments;
}

// ---------------------------------------------------------------------------
// Determine the "context series" from the first segment of issues_collected
// Used for bare "Annual #N" segments that lack a series prefix.
// ---------------------------------------------------------------------------
function getContextSeries(issuesCollected) {
  const firstPart = issuesCollected.split(',')[0].trim();
  // Try to extract series from "SERIES #..."
  const m = firstPart.match(/^(.+?)\s*#/);
  if (m) {
    return expandAbbreviation(m[1].trim());
  }
  // Try full name
  return expandAbbreviation(firstPart);
}

// ---------------------------------------------------------------------------
// Parse a full issues_collected string
// ---------------------------------------------------------------------------
function parseIssuesCollected(issuesCollected, editionSlug) {
  if (!issuesCollected) return [];

  // Skip completely unparseable strings
  const trimmed = issuesCollected.trim();
  if (/^upcoming$/i.test(trimmed)) return [];
  if (/^Complete .+ event$/i.test(trimmed)) return [];
  if (/^Multiple .+ titles/i.test(trimmed)) return [];
  if (/^Full .+ event$/i.test(trimmed)) return [];

  const contextSeries = getContextSeries(issuesCollected);
  const segments = smartSegment(issuesCollected);
  const allResults = [];
  const warnings = [];

  for (const seg of segments) {
    const parsed = parseSegment(seg, contextSeries);
    if (parsed.length === 0 && seg.trim().length > 0) {
      if (!isSkippable(seg.trim())) {
        warnings.push(`  Could not parse segment: "${seg}"`);
      }
    }
    for (const r of parsed) {
      allResults.push({
        edition_slug: editionSlug,
        ...r,
      });
    }
  }

  if (warnings.length > 0) {
    console.warn(`[WARN] ${editionSlug}: partial parse of "${issuesCollected}"`);
    for (const w of warnings) {
      console.warn(w);
    }
  }

  return allResults;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const dataDir = path.resolve(__dirname, '..', 'data');
  const inputPath = path.join(dataDir, 'collected_editions.json');
  const outputPath = path.join(dataDir, 'edition_issues.json');

  console.log(`Reading: ${inputPath}`);
  const raw = fs.readFileSync(inputPath, 'utf-8');
  const editions = JSON.parse(raw);

  console.log(`Found ${editions.length} editions.`);

  let totalIssues = 0;
  let totalEditions = 0;
  let skippedEditions = 0;
  const allIssues = [];

  for (const edition of editions) {
    const slug = edition.slug;
    const issuesCollected = edition.issues_collected;

    if (!issuesCollected || issuesCollected.trim() === '' || /^upcoming$/i.test(issuesCollected.trim())) {
      skippedEditions++;
      console.log(`[SKIP] ${slug}: "${issuesCollected || '(empty)'}"`);
      continue;
    }

    const issues = parseIssuesCollected(issuesCollected, slug);
    if (issues.length > 0) {
      totalEditions++;
      totalIssues += issues.length;
      allIssues.push(...issues);
    } else {
      skippedEditions++;
      console.log(`[SKIP] ${slug}: no parseable issues from "${issuesCollected}"`);
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Editions processed: ${totalEditions}`);
  console.log(`Editions skipped:   ${skippedEditions}`);
  console.log(`Total issues:       ${totalIssues}`);
  console.log(`Writing: ${outputPath}`);

  fs.writeFileSync(outputPath, JSON.stringify(allIssues, null, 2), 'utf-8');
  console.log(`Done. Wrote ${allIssues.length} issue records.`);
}

main();
