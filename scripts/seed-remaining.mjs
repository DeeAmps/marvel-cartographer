import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');

// Parse .env
const envFile = readFileSync(join(ROOT, '.env'), 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal,resolution=merge-duplicates',
};

async function upsert(table, data, onConflict, batchSize = 500) {
  let total = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const url = `${SUPABASE_URL}/rest/v1/${table}${onConflict ? `?on_conflict=${onConflict}` : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`  Error upserting ${table} batch ${i}: ${err}`);
      // Log first failing item for debugging
      if (batch.length > 0) {
        console.error(`  First item in batch:`, JSON.stringify(batch[0]).slice(0, 200));
      }
    } else {
      total += batch.length;
    }
  }
  return total;
}

function readData(filename) {
  return JSON.parse(readFileSync(join(DATA_DIR, filename), 'utf-8'));
}

async function seedTrivia() {
  console.log('\n=== Seeding trivia_questions ===');
  const raw = readData('trivia.json');
  const rows = raw.map((t) => ({
    id: t.id,
    question: t.question,
    answer: t.answer,
    source_issue: t.source_issue || null,
    category: t.category,
    difficulty: t.difficulty,
    tags: t.tags || [],
  }));
  // Delete existing and re-insert (trivia uses integer IDs, not slugs)
  const delRes = await fetch(`${SUPABASE_URL}/rest/v1/trivia_questions?id=gt.0`, {
    method: 'DELETE',
    headers: { ...headers, 'Prefer': 'return=minimal' },
  });
  if (!delRes.ok) console.error('  Delete failed:', await delRes.text());

  const count = await upsert('trivia_questions', rows, null);
  console.log(`  Seeded: ${count} trivia questions`);
}

async function seedHandbook() {
  console.log('\n=== Seeding handbook_entries ===');
  const raw = readData('handbook_entries.json');
  const rows = raw.map((h) => ({
    slug: h.slug,
    entry_type: h.entry_type,
    name: h.name,
    core_concept: h.core_concept || null,
    canon_confidence: h.canon_confidence || null,
    description: h.description || null,
    tags: h.tags || [],
    source_citations: h.source_citations || [],
    related_edition_slugs: h.related_edition_slugs || [],
    related_event_slugs: h.related_event_slugs || [],
    related_conflict_slugs: h.related_conflict_slugs || [],
    related_handbook_slugs: h.related_handbook_slugs || [],
    status_by_era: h.status_by_era || [],
    retcon_history: h.retcon_history || [],
    data: h.data || {},
  }));
  const count = await upsert('handbook_entries', rows, 'slug');
  console.log(`  Seeded: ${count} handbook entries`);
}

async function seedIssues() {
  console.log('\n=== Seeding issues ===');
  const raw = readData('issues.json');
  const rows = raw.map((i) => ({
    slug: i.slug,
    series: i.series,
    issue_number: String(i.issue_number),
    publication_date: i.publication_date || null,
    title: i.title || null,
    importance: i.importance || 'recommended',
    first_appearances: i.first_appearances || [],
    tags: i.tags || [],
  }));
  const count = await upsert('issues', rows, 'slug');
  console.log(`  Seeded: ${count} issues`);
}

async function main() {
  console.log('Seeding remaining tables...');
  console.log(`Supabase URL: ${SUPABASE_URL}`);

  await seedTrivia();
  await seedHandbook();
  await seedIssues();

  console.log('\nDone.');
}

main().catch(console.error);
