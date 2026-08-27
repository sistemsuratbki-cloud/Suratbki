-- ==============================================================================
-- SISTEM SURAT TUGAS BKI - SUPABASE DATABASE SCHEMA v2
-- ==============================================================================
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Aman dijalankan berulang kali (idempotent — IF NOT EXISTS / ON CONFLICT).
-- ==============================================================================

-- ============================================================
-- TRIGGER: auto-update kolom updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. TABEL USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id           TEXT PRIMARY KEY,
  username     TEXT UNIQUE NOT NULL,
  password     TEXT NOT NULL,
  name         TEXT NOT NULL,
  email        TEXT,
  phone        TEXT,
  role         TEXT NOT NULL DEFAULT 'surveyor',
  grade        TEXT DEFAULT 'GRADE 5 C',
  role_label   TEXT DEFAULT 'Surveyor',
  avatar_bg    TEXT DEFAULT '#10b981',
  signature_url TEXT,
  description  TEXT,
  raw_data     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_role     ON public.users(role);

-- ============================================================
-- 2. TABEL SURAT TUGAS (SPS & PDS)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.surat_tugas (
  id                   TEXT PRIMARY KEY,
  nomor                TEXT,
  no_agenda            TEXT,
  agenda               TEXT,
  nama_kapal           TEXT,
  pemohon              TEXT,
  no_order             TEXT,
  doc_type             TEXT NOT NULL DEFAULT 'PDS',
  is_sps               BOOLEAN NOT NULL DEFAULT FALSE,
  is_pds               BOOLEAN NOT NULL DEFAULT TRUE,
  perihal              TEXT,
  jenis_survey         TEXT,
  petugas              TEXT,
  pangkat              TEXT,
  jabatan              TEXT DEFAULT 'SURVEYOR',
  tempat_survey        TEXT,
  lokasi               TEXT,
  tgl_mulai            TEXT,
  tgl_selesai          TEXT,
  sarana               TEXT,
  sarana_transportasi  TEXT,
  kategori_transportasi TEXT,
  kategori_perjalanan  TEXT,
  keterangan           TEXT,
  status               TEXT NOT NULL DEFAULT 'Menunggu Survei',
  approval_status      TEXT DEFAULT 'Menunggu ACC',
  approval_date        TIMESTAMPTZ,
  approved_by          TEXT,
  rejection_reason     TEXT,
  is_paraf_sent        BOOLEAN NOT NULL DEFAULT FALSE,
  paraf_sent_at        TIMESTAMPTZ,
  paraf_sent_by        TEXT,
  tarif_dasar          NUMERIC NOT NULL DEFAULT 0,
  uang_harian          NUMERIC NOT NULL DEFAULT 0,
  biaya_tiket          NUMERIC NOT NULL DEFAULT 0,
  tiket_hotel          NUMERIC NOT NULL DEFAULT 0,
  tiket_pesawat_taxi   NUMERIC NOT NULL DEFAULT 0,
  jumlah_estimasi      NUMERIC NOT NULL DEFAULT 0,
  no_cda               TEXT,
  no_so                TEXT,
  no_wbs               TEXT,
  is_cito              BOOLEAN NOT NULL DEFAULT FALSE,
  catatan              TEXT,
  batch_id             TEXT,
  pds_id               TEXT,
  linked_sps_ids       JSONB NOT NULL DEFAULT '[]'::jsonb,
  ships_detail         JSONB NOT NULL DEFAULT '[]'::jsonb,
  ships_list           JSONB NOT NULL DEFAULT '[]'::jsonb,
  foto_list            JSONB NOT NULL DEFAULT '[]'::jsonb,
  file_tiket_name      TEXT,
  file_foto_name       TEXT,
  file_visit_name      TEXT,
  file_kwitansi_hotel_name TEXT,
  file_tiket_transport_name TEXT,
  raw_data             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_surat_tugas_updated_at ON public.surat_tugas;
CREATE TRIGGER trg_surat_tugas_updated_at
  BEFORE UPDATE ON public.surat_tugas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_st_doc_type      ON public.surat_tugas(doc_type);
CREATE INDEX IF NOT EXISTS idx_st_status        ON public.surat_tugas(status);
CREATE INDEX IF NOT EXISTS idx_st_petugas       ON public.surat_tugas(petugas);
CREATE INDEX IF NOT EXISTS idx_st_tgl_mulai     ON public.surat_tugas(tgl_mulai);
CREATE INDEX IF NOT EXISTS idx_st_approval      ON public.surat_tugas(approval_status);
CREATE INDEX IF NOT EXISTS idx_st_batch_id      ON public.surat_tugas(batch_id);
CREATE INDEX IF NOT EXISTS idx_st_pds_id        ON public.surat_tugas(pds_id);
CREATE INDEX IF NOT EXISTS idx_st_created_at    ON public.surat_tugas(created_at DESC);

-- ============================================================
-- 3. TABEL KWITANSI HONOR
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kwitansi_honor (
  id                    TEXT PRIMARY KEY,
  surat_id              TEXT,
  nomor_surat           TEXT,
  nama_kapal            TEXT,
  penerima              TEXT,
  lokasi                TEXT,
  tarif_dasar           NUMERIC NOT NULL DEFAULT 0,
  biaya_tiket           NUMERIC NOT NULL DEFAULT 0,
  tiket_hotel           NUMERIC NOT NULL DEFAULT 0,
  tiket_pesawat_taxi    NUMERIC NOT NULL DEFAULT 0,
  kategori_transportasi TEXT,
  jumlah                NUMERIC NOT NULL DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'Belum Dibayar',
  tgl_bayar             TEXT,
  catatan               TEXT,
  file_tiket_name       TEXT,
  file_foto_name        TEXT,
  file_foto_data        TEXT,
  file_visit_name       TEXT,
  file_kwitansi_hotel_name TEXT,
  raw_data              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_kwitansi_updated_at ON public.kwitansi_honor;
CREATE TRIGGER trg_kwitansi_updated_at
  BEFORE UPDATE ON public.kwitansi_honor
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_kw_surat_id   ON public.kwitansi_honor(surat_id);
CREATE INDEX IF NOT EXISTS idx_kw_penerima   ON public.kwitansi_honor(penerima);
CREATE INDEX IF NOT EXISTS idx_kw_status     ON public.kwitansi_honor(status);
CREATE INDEX IF NOT EXISTS idx_kw_created_at ON public.kwitansi_honor(created_at DESC);

-- ============================================================
-- 4. TABEL LAPORAN SURVEI
-- ============================================================
CREATE TABLE IF NOT EXISTS public.laporan_survei (
  id             TEXT PRIMARY KEY,
  surat_id       TEXT,
  tgl_lapor      TEXT,
  tanggal        TEXT,
  nama_kapal     TEXT,
  lokasi         TEXT,
  lokasi_survey  TEXT,
  nilai          NUMERIC NOT NULL DEFAULT 0,
  tarif_dasar    NUMERIC NOT NULL DEFAULT 0,
  nama_survey    TEXT,
  no_agenda      TEXT,
  no_cda         TEXT,
  no_so          TEXT,
  no_wbs         TEXT,
  petugas        TEXT,
  pangkat        TEXT,
  is_cito        BOOLEAN NOT NULL DEFAULT FALSE,
  hasil          TEXT,
  status         TEXT NOT NULL DEFAULT 'Terkirim',
  is_edit_requested   BOOLEAN NOT NULL DEFAULT FALSE,
  edit_request_date   TIMESTAMPTZ,
  is_unlocked_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at    TIMESTAMPTZ,
  file_foto_name TEXT,
  file_foto_data TEXT,
  file_visit_name TEXT,
  file_tiket_transport_name TEXT,
  file_kwitansi_hotel_name TEXT,
  ships_detail   JSONB NOT NULL DEFAULT '[]'::jsonb,
  foto_list      JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_laporan_updated_at ON public.laporan_survei;
CREATE TRIGGER trg_laporan_updated_at
  BEFORE UPDATE ON public.laporan_survei
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_lap_surat_id   ON public.laporan_survei(surat_id);
CREATE INDEX IF NOT EXISTS idx_lap_petugas    ON public.laporan_survei(petugas);
CREATE INDEX IF NOT EXISTS idx_lap_status     ON public.laporan_survei(status);
CREATE INDEX IF NOT EXISTS idx_lap_created_at ON public.laporan_survei(created_at DESC);

-- ============================================================
-- 5. TABEL TARIFFS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tariffs (
  id         TEXT PRIMARY KEY,
  no         INT,
  name       TEXT NOT NULL,
  tujuan     TEXT,
  rincian    TEXT,
  rate       NUMERIC NOT NULL DEFAULT 0,
  moda       TEXT DEFAULT 'Darat',
  kategori   TEXT DEFAULT 'Dalam Kota',
  raw_data   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_tariffs_updated_at ON public.tariffs;
CREATE TRIGGER trg_tariffs_updated_at
  BEFORE UPDATE ON public.tariffs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_tariffs_name ON public.tariffs(name);

-- ============================================================
-- 6. TABEL GRADE TARIFFS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.grade_tariffs (
  id          TEXT PRIMARY KEY,
  grade       TEXT NOT NULL UNIQUE,
  uang_harian NUMERIC NOT NULL DEFAULT 0,
  raw_data    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_grade_updated_at ON public.grade_tariffs;
CREATE TRIGGER trg_grade_updated_at
  BEFORE UPDATE ON public.grade_tariffs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 7. TABEL ADMIN SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id                    TEXT PRIMARY KEY DEFAULT 'default_settings',
  kepala_cabang         TEXT,
  nup                   TEXT,
  pembuat_daftar        TEXT,
  nup_pembuat_daftar    TEXT,
  nama_cabang           TEXT,
  kacab_signature_url   TEXT,
  tat_luar_kota         NUMERIC,
  raw_data              JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. TABEL VISIT SURVEI
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visit_survei (
  id                    TEXT PRIMARY KEY,
  nama                  TEXT,
  lokasi                TEXT,
  nama_kapal            TEXT,
  ships                 JSONB DEFAULT '[]'::jsonb,
  jam_berangkat         TEXT,
  durasi                NUMERIC DEFAULT 1,
  jam_selesai           TEXT,
  tanggal               TEXT,
  status                TEXT DEFAULT 'On Proses',
  keterangan            TEXT,
  raw_data              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_visit_updated_at ON public.visit_survei;
CREATE TRIGGER trg_visit_updated_at
  BEFORE UPDATE ON public.visit_survei
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_tugas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kwitansi_honor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laporan_survei ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tariffs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_tariffs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_survei   ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada, lalu buat ulang (idempotent)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['users','surat_tugas','kwitansi_honor','laporan_survei','tariffs','grade_tariffs','admin_settings','visit_survei']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow public access" ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY "Allow public access" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- REALTIME
-- ============================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.surat_tugas;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kwitansi_honor;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.laporan_survei;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tariffs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.grade_tariffs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_settings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.visit_survei;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('surat-tugas', 'surat-tugas', true),
  ('lampiran',    'lampiran',    true),
  ('signatures',  'signatures',  true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Allow public bucket access'
  ) THEN
    CREATE POLICY "Allow public bucket access"
      ON storage.objects FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;
