/**
 * Jalankan schema SQL ke Supabase via direct PostgreSQL connection.
 * Cara pakai: node scripts/run-schema.mjs
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Supabase PostgreSQL connection string
// Format: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
// Direct (non-pooled): postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
const PROJECT_REF    = 'brqnkwvvasoqogoibejh';
const DB_PASSWORD    = process.env.SUPABASE_DB_PASSWORD || '';
const CONNECTION_STR = `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`;

const schemaPath = join(__dirname, '..', 'supabase_schema.sql');
const fullSQL    = readFileSync(schemaPath, 'utf-8');

async function main() {
  if (!DB_PASSWORD) {
    console.error('❌ Set environment variable SUPABASE_DB_PASSWORD terlebih dahulu.');
    console.error('   Dapatkan dari: Supabase Dashboard → Settings → Database → Database password');
    process.exit(1);
  }

  const client = new Client({ connectionString: CONNECTION_STR, ssl: { rejectUnauthorized: false } });

  try {
    console.log('🔌 Connecting ke Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected!\n');

    console.log('📦 Menjalankan schema SQL...');
    await client.query(fullSQL);
    console.log('✅ Schema berhasil dijalankan!');

    // Verifikasi tabel
    const { rows } = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    console.log('\n📋 Tabel yang tersedia di database:');
    rows.forEach(r => console.log(`   • ${r.tablename}`));

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
