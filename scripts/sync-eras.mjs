#!/usr/bin/env node

/**
 * sync-eras.mjs
 *
 * Syncs era names, descriptions, and subtitles from web/data/eras.json
 * to the Supabase database. Updates existing rows by slug.
 *
 * Usage:
 *   node scripts/sync-eras.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(
  resolve(dirname(fileURLToPath(import.meta.url)), '..', 'web', 'package.json')
);
const { createClient } = require('@supabase/supabase-js');

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// Load .env
function loadEnv() {
  const envPath = resolve(PROJECT_ROOT, '.env');
  if (!existsSync(envPath)) {
    console.error('ERROR: .env file not found at', envPath);
    process.exit(1);
  }
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const erasPath = resolve(PROJECT_ROOT, 'web', 'data', 'eras.json');
  const eras = JSON.parse(readFileSync(erasPath, 'utf-8'));

  console.log(`Syncing ${eras.length} eras to Supabase...\n`);

  let updated = 0;
  let errors = 0;

  for (const era of eras) {
    const { data, error } = await supabase
      .from('eras')
      .update({
        name: era.name,
        subtitle: era.subtitle || null,
        description: era.description || null,
      })
      .eq('slug', era.slug)
      .select('slug, name');

    if (error) {
      console.error(`  ERROR updating "${era.slug}":`, error.message);
      errors++;
    } else if (data && data.length > 0) {
      console.log(`  Updated: ${data[0].slug} → "${data[0].name}"`);
      updated++;
    } else {
      console.warn(`  WARN: No row found for slug "${era.slug}"`);
    }
  }

  console.log(`\nDone. Updated: ${updated}, Errors: ${errors}`);
}

main().catch(console.error);
