import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '.env.local');

let env = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...vals] = trimmed.split('=');
      if (key) {
        env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
}

const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('==============================================');
console.log('       STATUS KONEKSI SUPABASE CLOUD          ');
console.log('==============================================');
console.log('Supabase URL :', supabaseUrl || 'TIDAK DITEMUKAN');
console.log('Supabase Key :', supabaseAnonKey ? `DITEMUKAN (${supabaseAnonKey.slice(0, 10)}...)` : 'TIDAK DITEMUKAN');
console.log('----------------------------------------------');

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Konfigurasi Supabase tidak lengkap di .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runCheck() {
  const tables = [
    'users',
    'surat_tugas',
    'kwitansi_honor',
    'laporan_survei',
    'tariffs',
    'grade_tariffs',
    'admin_settings',
    'master_kapal'
  ];

  let successCount = 0;

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(3);
      if (error) {
        if (error.code === '42P01') {
          console.log(`⚠️  Tabel [${table.padEnd(16)}]: BELUM DIBUAT di Supabase (Code: 42P01)`);
        } else {
          console.log(`❌ Tabel [${table.padEnd(16)}]: ERROR -> ${error.message} (${error.code})`);
        }
      } else {
        successCount++;
        console.log(`✅ Tabel [${table.padEnd(16)}]: TERHUBUNG (Sample baris: ${data?.length || 0})`);
      }
    } catch (e) {
      console.log(`❌ Tabel [${table.padEnd(16)}]: EXCEPTION -> ${e.message}`);
    }
  }

  console.log('----------------------------------------------');
  console.log(`Hasil: ${successCount} dari ${tables.length} tabel terhubung & siap digunakan.`);
  console.log('==============================================');
}

runCheck();
