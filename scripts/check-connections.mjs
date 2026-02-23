import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(
  resolve(dirname(fileURLToPath(import.meta.url)), '..', 'web', 'package.json')
);
const { createClient } = require('@supabase/supabase-js');

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lines = readFileSync(resolve(PROJECT_ROOT, '.env'), 'utf-8').split('\n');
const env = {};
for (const line of lines) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const slug = process.argv[2] || 'ultimates-by-deniz-camp-all-power-to-the-people-tp-v2';

// Get the edition
const { data: ed } = await sb.from('collected_editions')
  .select('id, slug, title, issues_collected')
  .eq('slug', slug).single();

if (!ed) { console.log('Edition not found:', slug); process.exit(1); }
console.log('Edition:', ed.title);
console.log('  slug:', ed.slug);
console.log('  collects:', ed.issues_collected);
console.log('  id:', ed.id);

// Check connections where this is source
const { data: outgoing } = await sb.from('connections')
  .select('*, target:collected_editions!connections_target_id_fkey(slug, title)')
  .eq('source_type', 'edition').eq('source_id', ed.id);
console.log('\nOutgoing connections (What\'s Next):', outgoing?.length || 0);
(outgoing || []).forEach(c => console.log(`  → ${c.target?.title} (${c.connection_type}, str:${c.strength})`));

// Check connections where this is target
const { data: incoming } = await sb.from('connections')
  .select('*, source:collected_editions!connections_source_id_fkey(slug, title)')
  .eq('target_type', 'edition').eq('target_id', ed.id);
console.log('\nIncoming connections (What Came Before):', incoming?.length || 0);
(incoming || []).forEach(c => console.log(`  ← ${c.source?.title} (${c.connection_type}, str:${c.strength})`));

// Search for related editions (same series)
console.log('\n--- Searching for related Ultimates editions ---');
const { data: related } = await sb.from('collected_editions')
  .select('slug, title, issues_collected, print_status')
  .ilike('title', '%ultimates%camp%')
  .order('title');
console.log('Found', related?.length, 'related editions:');
(related || []).forEach(r => console.log(`  [${r.print_status}] ${r.title} (${r.slug})`));

// Also search broadly
const { data: related2 } = await sb.from('collected_editions')
  .select('slug, title, print_status')
  .ilike('title', '%ultimates%deniz%')
  .order('title');
if (related2?.length) {
  console.log('\nBroader "ultimates deniz" search:');
  related2.forEach(r => console.log(`  [${r.print_status}] ${r.title} (${r.slug})`));
}

// Also check for vol 1
const { data: vol1search } = await sb.from('collected_editions')
  .select('slug, title, print_status')
  .ilike('title', '%ultimates%vol%1%')
  .order('title');
if (vol1search?.length) {
  console.log('\n"ultimates vol 1" search:');
  vol1search.forEach(r => console.log(`  [${r.print_status}] ${r.title} (${r.slug})`));
}
