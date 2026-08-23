/**
 * Setup database Supabase: buat semua tabel via SQL Edge Function / REST.
 * Gunakan Supabase client dengan service role key untuk bypass RLS.
 *
 * Cara pakai:
 *   node scripts/setup-db.mjs
 *
 * Atau dengan password DB:
 *   $env:SUPABASE_DB_PASSWORD="your_password"; node scripts/setup-db.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = 'https://brqnkwvvasoqogoibejh.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJycW5rd3Z2YXNvcW9nb2liZWpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQ0NDY3NywiZXhwIjoyMTAzMDIwNjc3fQ.VrNNXaH-Um0mXswAUhkajBxK52OuTRS2YjibDfMlCiA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// ─── DDL per tabel (terpisah agar error satu tidak blok yang lain) ────────────

const STATEMENTS = [

// 0. Trigger function
`CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$`,

// 1. users
`CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
  name TEXT NOT NULL, email TEXT, phone TEXT, role TEXT NOT NULL DEFAULT 'surveyor',
  grade TEXT DEFAULT 'GRADE 5 C', role_label TEXT DEFAULT 'Surveyor',
  avatar_bg TEXT DEFAULT '#10b981', signature_url TEXT, description TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
`DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users`,
`CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()`,
`CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username)`,
`CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role)`,

// 2. surat_tugas
`CREATE TABLE IF NOT EXISTS public.surat_tugas (
  id TEXT PRIMARY KEY, nomor TEXT, no_agenda TEXT, agenda TEXT,
  nama_kapal TEXT, pemohon TEXT, no_order TEXT,
  doc_type TEXT NOT NULL DEFAULT 'PDS', is_sps BOOLEAN NOT NULL DEFAULT FALSE, is_pds BOOLEAN NOT NULL DEFAULT TRUE,
  perihal TEXT, jenis_survey TEXT, petugas TEXT, pangkat TEXT, jabatan TEXT DEFAULT 'SURVEYOR',
  tempat_survey TEXT, lokasi TEXT, tgl_mulai TEXT, tgl_selesai TEXT,
  sarana TEXT, sarana_transportasi TEXT, kategori_transportasi TEXT, kategori_perjalanan TEXT, keterangan TEXT,
  status TEXT NOT NULL DEFAULT 'Menunggu Survei', approval_status TEXT DEFAULT 'Menunggu ACC',
  approval_date TIMESTAMPTZ, approved_by TEXT, rejection_reason TEXT,
  is_paraf_sent BOOLEAN NOT NULL DEFAULT FALSE, paraf_sent_at TIMESTAMPTZ, paraf_sent_by TEXT,
  tarif_dasar NUMERIC NOT NULL DEFAULT 0, uang_harian NUMERIC NOT NULL DEFAULT 0,
  biaya_tiket NUMERIC NOT NULL DEFAULT 0, tiket_hotel NUMERIC NOT NULL DEFAULT 0,
  tiket_pesawat_taxi NUMERIC NOT NULL DEFAULT 0, jumlah_estimasi NUMERIC NOT NULL DEFAULT 0,
  no_cda TEXT, no_so TEXT, no_wbs TEXT, is_cito BOOLEAN NOT NULL DEFAULT FALSE, catatan TEXT,
  batch_id TEXT, pds_id TEXT,
  linked_sps_ids JSONB NOT NULL DEFAULT '[]', ships_detail JSONB NOT NULL DEFAULT '[]',
  ships_list JSONB NOT NULL DEFAULT '[]', foto_list JSONB NOT NULL DEFAULT '[]',
  file_tiket_name TEXT, file_foto_name TEXT, file_visit_name TEXT,
  file_kwitansi_hotel_name TEXT, file_tiket_transport_name TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
`DROP TRIGGER IF EXISTS trg_st_updated_at ON public.surat_tugas`,
`CREATE TRIGGER trg_st_updated_at BEFORE UPDATE ON public.surat_tugas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()`,
`CREATE INDEX IF NOT EXISTS idx_st_doc_type ON public.surat_tugas(doc_type)`,
`CREATE INDEX IF NOT EXISTS idx_st_status ON public.surat_tugas(status)`,
`CREATE INDEX IF NOT EXISTS idx_st_petugas ON public.surat_tugas(petugas)`,
`CREATE INDEX IF NOT EXISTS idx_st_tgl_mulai ON public.surat_tugas(tgl_mulai)`,
`CREATE INDEX IF NOT EXISTS idx_st_approval ON public.surat_tugas(approval_status)`,
`CREATE INDEX IF NOT EXISTS idx_st_created_at ON public.surat_tugas(created_at DESC)`,

// 3. kwitansi_honor
`CREATE TABLE IF NOT EXISTS public.kwitansi_honor (
  id TEXT PRIMARY KEY, surat_id TEXT, nomor_surat TEXT, nama_kapal TEXT, penerima TEXT, lokasi TEXT,
  tarif_dasar NUMERIC NOT NULL DEFAULT 0, biaya_tiket NUMERIC NOT NULL DEFAULT 0,
  tiket_hotel NUMERIC NOT NULL DEFAULT 0, tiket_pesawat_taxi NUMERIC NOT NULL DEFAULT 0,
  kategori_transportasi TEXT, jumlah NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Belum Dibayar', tgl_bayar TEXT, catatan TEXT,
  file_tiket_name TEXT, file_foto_name TEXT, file_foto_data TEXT,
  file_visit_name TEXT, file_kwitansi_hotel_name TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
`DROP TRIGGER IF EXISTS trg_kw_updated_at ON public.kwitansi_honor`,
`CREATE TRIGGER trg_kw_updated_at BEFORE UPDATE ON public.kwitansi_honor FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()`,
`CREATE INDEX IF NOT EXISTS idx_kw_surat_id ON public.kwitansi_honor(surat_id)`,
`CREATE INDEX IF NOT EXISTS idx_kw_status ON public.kwitansi_honor(status)`,
`CREATE INDEX IF NOT EXISTS idx_kw_created_at ON public.kwitansi_honor(created_at DESC)`,

// 4. laporan_survei
`CREATE TABLE IF NOT EXISTS public.laporan_survei (
  id TEXT PRIMARY KEY, surat_id TEXT, tgl_lapor TEXT, tanggal TEXT,
  nama_kapal TEXT, lokasi TEXT, lokasi_survey TEXT,
  nilai NUMERIC NOT NULL DEFAULT 0, tarif_dasar NUMERIC NOT NULL DEFAULT 0,
  nama_survey TEXT, no_agenda TEXT, no_cda TEXT, no_so TEXT, no_wbs TEXT,
  petugas TEXT, pangkat TEXT, is_cito BOOLEAN NOT NULL DEFAULT FALSE,
  hasil TEXT, status TEXT NOT NULL DEFAULT 'Terkirim',
  is_edit_requested BOOLEAN NOT NULL DEFAULT FALSE, edit_request_date TIMESTAMPTZ,
  is_unlocked_by_admin BOOLEAN NOT NULL DEFAULT FALSE, unlocked_at TIMESTAMPTZ,
  file_foto_name TEXT, file_foto_data TEXT, file_visit_name TEXT,
  file_tiket_transport_name TEXT, file_kwitansi_hotel_name TEXT,
  ships_detail JSONB NOT NULL DEFAULT '[]', foto_list JSONB NOT NULL DEFAULT '[]',
  raw_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
`DROP TRIGGER IF EXISTS trg_lap_updated_at ON public.laporan_survei`,
`CREATE TRIGGER trg_lap_updated_at BEFORE UPDATE ON public.laporan_survei FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()`,
`CREATE INDEX IF NOT EXISTS idx_lap_surat_id ON public.laporan_survei(surat_id)`,
`CREATE INDEX IF NOT EXISTS idx_lap_status ON public.laporan_survei(status)`,
`CREATE INDEX IF NOT EXISTS idx_lap_created_at ON public.laporan_survei(created_at DESC)`,

// 5. tariffs
`CREATE TABLE IF NOT EXISTS public.tariffs (
  id TEXT PRIMARY KEY, no INT, name TEXT NOT NULL, tujuan TEXT, rincian TEXT,
  rate NUMERIC NOT NULL DEFAULT 0, moda TEXT DEFAULT 'Darat', kategori TEXT DEFAULT 'Dalam Kota',
  raw_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
`DROP TRIGGER IF EXISTS trg_tariffs_updated_at ON public.tariffs`,
`CREATE TRIGGER trg_tariffs_updated_at BEFORE UPDATE ON public.tariffs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()`,
`CREATE INDEX IF NOT EXISTS idx_tariffs_name ON public.tariffs(name)`,

// 6. grade_tariffs
`CREATE TABLE IF NOT EXISTS public.grade_tariffs (
  id TEXT PRIMARY KEY, grade TEXT NOT NULL UNIQUE, uang_harian NUMERIC NOT NULL DEFAULT 0,
  raw_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
`DROP TRIGGER IF EXISTS trg_grade_updated_at ON public.grade_tariffs`,
`CREATE TRIGGER trg_grade_updated_at BEFORE UPDATE ON public.grade_tariffs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()`,

// 7. admin_settings
`CREATE TABLE IF NOT EXISTS public.admin_settings (
  id TEXT PRIMARY KEY DEFAULT 'default_settings',
  kepala_cabang TEXT, nup TEXT, pembuat_daftar TEXT, nup_pembuat_daftar TEXT,
  nama_cabang TEXT, kacab_signature_url TEXT, tat_luar_kota NUMERIC,
  raw_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,

// 8. RLS
`ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY`,
`ALTER TABLE public.surat_tugas    ENABLE ROW LEVEL SECURITY`,
`ALTER TABLE public.kwitansi_honor ENABLE ROW LEVEL SECURITY`,
`ALTER TABLE public.laporan_survei ENABLE ROW LEVEL SECURITY`,
`ALTER TABLE public.tariffs        ENABLE ROW LEVEL SECURITY`,
`ALTER TABLE public.grade_tariffs  ENABLE ROW LEVEL SECURITY`,
`ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY`,

`DROP POLICY IF EXISTS "allow_all_users" ON public.users`,
`CREATE POLICY "allow_all_users" ON public.users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)`,
`DROP POLICY IF EXISTS "allow_all_st" ON public.surat_tugas`,
`CREATE POLICY "allow_all_st" ON public.surat_tugas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)`,
`DROP POLICY IF EXISTS "allow_all_kw" ON public.kwitansi_honor`,
`CREATE POLICY "allow_all_kw" ON public.kwitansi_honor FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)`,
`DROP POLICY IF EXISTS "allow_all_lap" ON public.laporan_survei`,
`CREATE POLICY "allow_all_lap" ON public.laporan_survei FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)`,
`DROP POLICY IF EXISTS "allow_all_tariffs" ON public.tariffs`,
`CREATE POLICY "allow_all_tariffs" ON public.tariffs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)`,
`DROP POLICY IF EXISTS "allow_all_grade" ON public.grade_tariffs`,
`CREATE POLICY "allow_all_grade" ON public.grade_tariffs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)`,
`DROP POLICY IF EXISTS "allow_all_settings" ON public.admin_settings`,
`CREATE POLICY "allow_all_settings" ON public.admin_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)`,

// 9. Realtime
`ALTER PUBLICATION supabase_realtime ADD TABLE public.users`,
`ALTER PUBLICATION supabase_realtime ADD TABLE public.surat_tugas`,
`ALTER PUBLICATION supabase_realtime ADD TABLE public.kwitansi_honor`,
`ALTER PUBLICATION supabase_realtime ADD TABLE public.laporan_survei`,
`ALTER PUBLICATION supabase_realtime ADD TABLE public.tariffs`,
`ALTER PUBLICATION supabase_realtime ADD TABLE public.grade_tariffs`,
`ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_settings`,

// 10. Storage buckets (via Supabase client SDK)
];

// ─── Jalankan DDL via Supabase rpc exec_sql ──────────────────────────────────
// Supabase tidak punya endpoint SQL generik, tapi kita bisa pakai
// supabase.rpc() kalau ada fungsi exec_sql, atau jalankan per-tabel
// menggunakan workaround fetch ke /rest/v1/... untuk CREATE.
//
// Cara terbaik tanpa psql: pakai supabase-js .from().select() untuk verifikasi,
// dan jalankan DDL via fetch ke endpoint internal Supabase.

async function runSQL(sql, label) {
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql_query: sql }),
    });
    const text = await resp.text();
    if (resp.ok) {
      return { ok: true };
    }
    // Cek apakah error karena "already exists" — itu OK
    const body = JSON.parse(text || '{}');
    if (body?.code === '42P07' || body?.message?.includes('already exists')) {
      return { ok: true, skipped: true };
    }
    return { ok: false, error: body?.message || text };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function verifyTables() {
  const tables = ['users','surat_tugas','kwitansi_honor','laporan_survei','tariffs','grade_tariffs','admin_settings'];
  console.log('\n🔍 Verifikasi tabel...');
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error && error.code !== 'PGRST116') {
      console.log(`  ❌ ${t}: ${error.message}`);
    } else {
      console.log(`  ✅ ${t}`);
    }
  }
}

async function setupStorageBuckets() {
  const buckets = ['surat-tugas', 'lampiran', 'signatures'];
  console.log('\n🗂️  Setup storage buckets...');
  for (const b of buckets) {
    const { error } = await supabase.storage.createBucket(b, { public: true });
    if (!error || error.message?.includes('already exists')) {
      console.log(`  ✅ bucket: ${b}`);
    } else {
      console.log(`  ⚠️  bucket ${b}: ${error.message}`);
    }
  }
}

async function main() {
  console.log('🚀 Setup database Supabase BKI\n');
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   Project: brqnkwvvasoqogoibejh\n`);

  // Test koneksi
  const { error: pingErr } = await supabase.from('users').select('count').limit(0);
  const connected = !pingErr || pingErr.code === 'PGRST116' || pingErr.message?.includes('does not exist');

  if (!connected && pingErr) {
    console.error('❌ Tidak bisa konek ke Supabase:', pingErr.message);
  }

  // Coba jalankan DDL via exec_sql RPC (harus ada fungsi ini di DB)
  console.log('⏳ Menjalankan DDL statements...\n');
  let ok = 0, skipped = 0, failed = 0;

  for (let i = 0; i < STATEMENTS.length; i++) {
    const stmt = STATEMENTS[i].trim();
    const label = stmt.replace(/\s+/g, ' ').substring(0, 70);
    const result = await runSQL(stmt, label);
    if (result.ok && result.skipped) {
      process.stdout.write(`  ⏭️  [${i+1}/${STATEMENTS.length}] ${label}...\n`);
      skipped++;
    } else if (result.ok) {
      process.stdout.write(`  ✅ [${i+1}/${STATEMENTS.length}] ${label}...\n`);
      ok++;
    } else {
      process.stdout.write(`  ⚠️  [${i+1}/${STATEMENTS.length}] ${label}\n`);
      if (result.error && !result.error.includes('already exists') && !result.error.includes('42P07') && !result.error.includes('42710')) {
        process.stdout.write(`       Error: ${result.error.substring(0, 100)}\n`);
      }
      failed++;
    }
  }

  console.log(`\n📊 DDL: ${ok} OK, ${skipped} skipped, ${failed} warnings`);

  // Setup storage
  await setupStorageBuckets();

  // Verifikasi final
  await verifyTables();

  console.log('\n✅ Setup selesai!');
  console.log('   Jika ada tabel yang ❌, jalankan supabase_schema.sql manual di:');
  console.log('   https://supabase.com/dashboard/project/brqnkwvvasoqogoibejh/sql/new\n');
}

main().catch(console.error);
