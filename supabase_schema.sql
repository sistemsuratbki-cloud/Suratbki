-- ==============================================================================
-- SISTEM SURAT TUGAS BKI - SUPABASE DATABASE SCHEMA & REALTIME SETUP
-- ==============================================================================
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Skrip ini akan membuat tabel, index, RLS policy publik (agar anon key bisa read/write),
-- serta mengaktifkan Realtime Supabase untuk sinkronisasi live antar akun.
-- ==============================================================================

-- 1. TABEL USERS (Akun Pengguna Multi-Role)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'surveyor',
  grade TEXT DEFAULT 'GRADE 5 C',
  role_label TEXT DEFAULT 'Surveyor',
  avatar_bg TEXT DEFAULT '#10b981',
  signature_url TEXT,
  description TEXT,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL SURAT TUGAS (SPS & PDS)
CREATE TABLE IF NOT EXISTS public.surat_tugas (
  id TEXT PRIMARY KEY,
  nomor TEXT,
  no_agenda TEXT,
  agenda TEXT,
  nama_kapal TEXT,
  doc_type TEXT DEFAULT 'PDS', -- 'SPS' atau 'PDS'
  is_sps BOOLEAN DEFAULT FALSE,
  is_pds BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'Menunggu Survei',
  approval_status TEXT DEFAULT 'Menunggu ACC',
  approval_date TIMESTAMPTZ,
  approved_by TEXT,
  rejection_reason TEXT,
  petugas TEXT,
  tempat_survey TEXT,
  lokasi TEXT,
  tgl_mulai TEXT,
  tgl_selesai TEXT,
  sarana_transportasi TEXT,
  kategori_perjalanan TEXT,
  tarif_dasar NUMERIC DEFAULT 0,
  uang_harian NUMERIC DEFAULT 0,
  biaya_tiket NUMERIC DEFAULT 0,
  tiket_hotel NUMERIC DEFAULT 0,
  tiket_pesawat_taxi NUMERIC DEFAULT 0,
  jumlah_estimasi NUMERIC DEFAULT 0,
  batch_id TEXT,
  pds_id TEXT,
  linked_sps_ids JSONB DEFAULT '[]'::jsonb,
  ships_detail JSONB DEFAULT '[]'::jsonb,
  ships_list JSONB DEFAULT '[]'::jsonb,
  foto_list JSONB DEFAULT '[]'::jsonb,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL KWITANSI HONOR
CREATE TABLE IF NOT EXISTS public.kwitansi_honor (
  id TEXT PRIMARY KEY,
  surat_id TEXT,
  nomor_surat TEXT,
  nama_kapal TEXT,
  penerima TEXT,
  lokasi TEXT,
  tarif_dasar NUMERIC DEFAULT 0,
  biaya_tiket NUMERIC DEFAULT 0,
  tiket_hotel NUMERIC DEFAULT 0,
  tiket_pesawat_taxi NUMERIC DEFAULT 0,
  kategori_transportasi TEXT,
  jumlah NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Belum Dibayar',
  tgl_bayar TEXT,
  catatan TEXT,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL LAPORAN SURVEI
CREATE TABLE IF NOT EXISTS public.laporan_survei (
  id TEXT PRIMARY KEY,
  surat_id TEXT,
  tgl_lapor TEXT,
  tanggal TEXT,
  nama_kapal TEXT,
  lokasi TEXT,
  lokasi_survey TEXT,
  nilai NUMERIC DEFAULT 0,
  tarif_dasar NUMERIC DEFAULT 0,
  nama_survey TEXT,
  no_agenda TEXT,
  no_cda TEXT,
  no_so TEXT,
  no_wbs TEXT,
  petugas TEXT,
  is_cito BOOLEAN DEFAULT FALSE,
  hasil TEXT,
  status TEXT DEFAULT 'Terkirim',
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL TARIFFS (Tarif Lokasi Penugasan)
CREATE TABLE IF NOT EXISTS public.tariffs (
  id TEXT PRIMARY KEY,
  no INT,
  name TEXT NOT NULL,
  tujuan TEXT,
  rincian TEXT,
  rate NUMERIC DEFAULT 0,
  moda TEXT,
  kategori TEXT,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL GRADE TARIFFS (Uang Harian Grade)
CREATE TABLE IF NOT EXISTS public.grade_tariffs (
  id TEXT PRIMARY KEY,
  grade TEXT NOT NULL,
  uang_harian NUMERIC DEFAULT 0,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL ADMIN SETTINGS (Konfigurasi Kantor & Kepala Cabang)
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id TEXT PRIMARY KEY DEFAULT 'default_settings',
  kepala_cabang TEXT,
  nup TEXT,
  pembuat_daftar TEXT,
  nup_pembuat_daftar TEXT,
  nama_cabang TEXT,
  kacab_signature_url TEXT,
  tat_luar_kota NUMERIC,
  raw_data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) & IZINKAN AKSES ANON / AUTHENTICATED
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_tugas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kwitansi_honor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laporan_survei ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Kebijakan akses penuh untuk pengguna aplikasi (Anon Key)
DO $$
BEGIN
  -- users
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow public access') THEN
    CREATE POLICY "Allow public access" ON public.users FOR ALL USING (true) WITH CHECK (true);
  END IF;
  -- surat_tugas
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'surat_tugas' AND policyname = 'Allow public access') THEN
    CREATE POLICY "Allow public access" ON public.surat_tugas FOR ALL USING (true) WITH CHECK (true);
  END IF;
  -- kwitansi_honor
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kwitansi_honor' AND policyname = 'Allow public access') THEN
    CREATE POLICY "Allow public access" ON public.kwitansi_honor FOR ALL USING (true) WITH CHECK (true);
  END IF;
  -- laporan_survei
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'laporan_survei' AND policyname = 'Allow public access') THEN
    CREATE POLICY "Allow public access" ON public.laporan_survei FOR ALL USING (true) WITH CHECK (true);
  END IF;
  -- tariffs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tariffs' AND policyname = 'Allow public access') THEN
    CREATE POLICY "Allow public access" ON public.tariffs FOR ALL USING (true) WITH CHECK (true);
  END IF;
  -- grade_tariffs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'grade_tariffs' AND policyname = 'Allow public access') THEN
    CREATE POLICY "Allow public access" ON public.grade_tariffs FOR ALL USING (true) WITH CHECK (true);
  END IF;
  -- admin_settings
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_settings' AND policyname = 'Allow public access') THEN
    CREATE POLICY "Allow public access" ON public.admin_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==============================================================================
-- AKTIFKAN SUPABASE REALTIME REPLICATION
-- ==============================================================================
-- Memungkinkan perubahan data otomatis langsung sync di semua layar perangkat
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.surat_tugas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kwitansi_honor;
ALTER PUBLICATION supabase_realtime ADD TABLE public.laporan_survei;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tariffs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grade_tariffs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_settings;

-- ==============================================================================
-- BUAT STORAGE BUCKETS (JIKA BELUM ADA)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('surat-tugas', 'surat-tugas', true),
  ('lampiran', 'lampiran', true)
ON CONFLICT (id) DO NOTHING;

-- Izinkan upload/read storage untuk publik
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow public bucket access') THEN
    CREATE POLICY "Allow public bucket access" ON storage.objects FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
