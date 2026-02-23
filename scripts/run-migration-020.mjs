#!/usr/bin/env node

/**
 * Run migration 020_add_cover_variants.sql against Supabase.
 * Uses the REST API to add the cover_variants column.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

// Load .env
const envPath = resolve(PROJECT_ROOT, '.env');
const lines = readFileSync(envPath, 'utf-8').split('\n');
const env = {};
for (const line of lines) {
  const t = line.trim();
  if (t.length === 0 || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i === -1) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  console.log('Adding cover_variants column to collected_editions...');

  // Use PostgREST to check if column already exists by selecting it
  const checkUrl = `${SUPABASE_URL}/rest/v1/collected_editions?select=cover_variants&limit=1`;
  const checkRes = await fetch(checkUrl, {
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
  });

  if (checkRes.ok) {
    console.log('Column cover_variants already exists. Migration already applied.');
    const sample = await checkRes.json();
    console.log('Sample value:', JSON.stringify(sample[0]?.cover_variants));
    return;
  }

  // Column doesn't exist — need to run migration via SQL
  // Try the Supabase SQL endpoint (available on hosted Supabase)
  console.log('Column does not exist yet. Attempting to add via SQL...');

  // Method: Use supabase CLI to push the migration
  const { execSync } = await import('child_process');
  try {
    const result = execSync(
      `supabase db push --db-url "${env.SUPABASE_DB_URL || ''}" 2>&1`,
      { cwd: PROJECT_ROOT, encoding: 'utf-8', timeout: 30000 }
    );
    console.log(result);
  } catch (e) {
    console.log('supabase db push failed or not configured. Trying psql...');

    // Alternative: direct psql if we have a DB URL
    if (env.SUPABASE_DB_URL) {
      try {
        const sql = readFileSync(resolve(PROJECT_ROOT, 'supabase/migrations/020_add_cover_variants.sql'), 'utf-8');
        const result = execSync(
          `psql "${env.SUPABASE_DB_URL}" -c "${sql.replace(/"/g, '\\"')}"`,
          { encoding: 'utf-8', timeout: 15000 }
        );
        console.log(result);
      } catch (e2) {
        console.log('psql also failed:', e2.message);
        console.log('\nPlease run this SQL manually in the Supabase SQL Editor:');
        console.log(readFileSync(resolve(PROJECT_ROOT, 'supabase/migrations/020_add_cover_variants.sql'), 'utf-8'));
      }
    } else {
      console.log('\nNo SUPABASE_DB_URL in .env.');
      console.log('Please run this SQL in the Supabase SQL Editor (https://supabase.com/dashboard):');
      console.log('');
      console.log(readFileSync(resolve(PROJECT_ROOT, 'supabase/migrations/020_add_cover_variants.sql'), 'utf-8'));
    }
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
