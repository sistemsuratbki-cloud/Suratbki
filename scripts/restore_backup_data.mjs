import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://brqnkwvvasoqogoibejh.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJycW5rd3Z2YXNvcW9nb2liZWpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQ0NDY3NywiZXhwIjoyMTAzMDIwNjc3fQ.VrNNXaH-Um0mXswAUhkajBxK52OuTRS2YjibDfMlCiA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const RESTORE_SURAT_TUGAS = [
  {
    id: 'ST-BKI-2026-001',
    nomor: 'A 0    /SV.245/PK/KI-26',
    no_agenda: '001/2026',
    agenda: '001/2026',
    nama_kapal: 'KM MUTIARA LAUT',
    pemohon: 'PT. PELAYARAN NUSANTARA',
    doc_type: 'PDS',
    is_sps: false,
    is_pds: true,
    perihal: 'DINAS SURVEY KLAS',
    jenis_survey: 'Annual Survey',
    petugas: 'ALFIAN BONE PUTRA',
    pangkat: 'GRADE 6 A',
    jabatan: 'SURVEYOR',
    tempat_survey: 'PONTIANAK',
    lokasi: 'PONTIANAK',
    tgl_mulai: '2026-08-01',
    tgl_selesai: '2026-08-03',
    sarana_transportasi: 'DARAT DAN AIR',
    kategori_transportasi: 'Kendaraan Operasional',
    kategori_perjalanan: 'Dalam Kota',
    status: 'Selesai',
    approval_status: 'ACC',
    approval_date: '2026-08-03T10:00:00.000Z',
    approved_by: 'MUHSON NURROCHMAT',
    tarif_dasar: 3000000,
    uang_harian: 0,
    biaya_tiket: 0,
    jumlah_estimasi: 3000000,
    is_cito: false,
    catatan: 'Annual Survey KM Mutiara Laut Pontianak. Selesai dan disetujui.',
    raw_data: {
      id: 'ST-BKI-2026-001',
      nomor: 'A 0    /SV.245/PK/KI-26',
      noAgenda: '001/2026',
      namaKapal: 'KM MUTIARA LAUT',
      pemohon: 'PT. PELAYARAN NUSANTARA',
      docType: 'PDS',
      isPds: true,
      perihal: 'DINAS SURVEY KLAS',
      jenisSurvey: 'Annual Survey',
      petugas: 'ALFIAN BONE PUTRA',
      pangkat: 'GRADE 6 A',
      jabatan: 'SURVEYOR',
      tempatSurvey: 'PONTIANAK',
      lokasi: 'PONTIANAK',
      tglMulai: '2026-08-01',
      tglSelesai: '2026-08-03',
      tglSurat: '2026-08-01',
      tarifDasar: 3000000,
      jumlahEstimasi: 3000000,
      status: 'Selesai',
      approvalStatus: 'ACC',
      approvedBy: 'MUHSON NURROCHMAT',
      approvalDate: '2026-08-03T10:00:00.000Z'
    }
  },
  {
    id: 'ST-BKI-2026-002',
    nomor: 'A 0    /SV.246/PK/KI-26',
    no_agenda: '002/2026',
    agenda: '002/2026',
    nama_kapal: 'TB SAMUDERA JAYA',
    pemohon: 'PT. MARITIM SAMUDERA',
    doc_type: 'PDS',
    is_sps: false,
    is_pds: true,
    perihal: 'DINAS SURVEY KLAS',
    jenis_survey: 'Docking Survey',
    petugas: 'SANDI NANDARIANTO',
    pangkat: 'GRADE 5 C',
    jabatan: 'SURVEYOR',
    tempat_survey: 'BATAM',
    lokasi: 'BATAM',
    tgl_mulai: '2026-08-05',
    tgl_selesai: '2026-08-09',
    sarana_transportasi: 'UDARA DAN DARAT',
    kategori_transportasi: 'Pesawat Terbang',
    kategori_perjalanan: 'Luar Kota',
    status: 'Selesai',
    approval_status: 'ACC',
    approval_date: '2026-08-09T14:00:00.000Z',
    approved_by: 'MUHSON NURROCHMAT',
    tarif_dasar: 4500000,
    uang_harian: 0,
    biaya_tiket: 3300000,
    jumlah_estimasi: 7800000,
    is_cito: true,
    catatan: 'Docking Survey TB Samudera Jaya di Batam dengan surcharge CITO.',
    raw_data: {
      id: 'ST-BKI-2026-002',
      nomor: 'A 0    /SV.246/PK/KI-26',
      noAgenda: '002/2026',
      namaKapal: 'TB SAMUDERA JAYA',
      pemohon: 'PT. MARITIM SAMUDERA',
      docType: 'PDS',
      isPds: true,
      perihal: 'DINAS SURVEY KLAS',
      jenisSurvey: 'Docking Survey',
      petugas: 'SANDI NANDARIANTO',
      pangkat: 'GRADE 5 C',
      jabatan: 'SURVEYOR',
      tempatSurvey: 'BATAM',
      lokasi: 'BATAM',
      tglMulai: '2026-08-05',
      tglSelesai: '2026-08-09',
      tglSurat: '2026-08-05',
      tarifDasar: 4500000,
      biayaTiket: 3300000,
      jumlahEstimasi: 7800000,
      isCito: true,
      status: 'Selesai',
      approvalStatus: 'ACC',
      approvedBy: 'MUHSON NURROCHMAT',
      approvalDate: '2026-08-09T14:00:00.000Z'
    }
  },
  {
    id: 'ST-BKI-2026-003',
    nomor: 'A 0    /SV.247/PK/KI-26',
    no_agenda: '003/2026',
    agenda: '003/2026',
    nama_kapal: 'MV NUSANTARA EXPRESS',
    pemohon: 'PT. EXPRESS LOGISTIK',
    doc_type: 'PDS',
    is_sps: false,
    is_pds: true,
    perihal: 'DINAS SURVEY KLAS',
    jenis_survey: 'Intermediate',
    petugas: 'ANDRE GUNTUR',
    pangkat: 'GRADE 6 A',
    jabatan: 'SURVEYOR',
    tempat_survey: 'JAKARTA',
    lokasi: 'JAKARTA',
    tgl_mulai: '2026-08-15',
    tgl_selesai: '2026-08-20',
    sarana_transportasi: 'UDARA DAN DARAT',
    kategori_transportasi: 'Pesawat Terbang',
    kategori_perjalanan: 'Luar Kota',
    status: 'Berjalan',
    approval_status: 'Menunggu ACC',
    tarif_dasar: 3500000,
    uang_harian: 0,
    biaya_tiket: 2400000,
    jumlah_estimasi: 5900000,
    is_cito: false,
    catatan: 'Intermediate Survey MV Nusantara Express di Jakarta.',
    raw_data: {
      id: 'ST-BKI-2026-003',
      nomor: 'A 0    /SV.247/PK/KI-26',
      noAgenda: '003/2026',
      namaKapal: 'MV NUSANTARA EXPRESS',
      pemohon: 'PT. EXPRESS LOGISTIK',
      docType: 'PDS',
      isPds: true,
      perihal: 'DINAS SURVEY KLAS',
      jenisSurvey: 'Intermediate',
      petugas: 'ANDRE GUNTUR',
      pangkat: 'GRADE 6 A',
      jabatan: 'SURVEYOR',
      tempatSurvey: 'JAKARTA',
      lokasi: 'JAKARTA',
      tglMulai: '2026-08-15',
      tglSelesai: '2026-08-20',
      tglSurat: '2026-08-15',
      tarifDasar: 3500000,
      biayaTiket: 2400000,
      jumlahEstimasi: 5900000,
      status: 'Berjalan',
      approvalStatus: 'Menunggu ACC'
    }
  },
  {
    id: 'SPS-2026-001',
    nomor: null,
    no_agenda: '004/2026',
    agenda: '004/2026',
    nama_kapal: 'KM PELITA MARITIM',
    pemohon: 'PT. PELITA BAHARI',
    doc_type: 'SPS',
    is_sps: true,
    is_pds: false,
    perihal: 'DINAS SURVEY KLAS',
    jenis_survey: 'Renewal Survey',
    petugas: 'SEPTIAN AJI DEWANGKARA',
    pangkat: 'GRADE 5 C',
    jabatan: 'SURVEYOR',
    tempat_survey: 'SURABAYA',
    lokasi: 'SURABAYA',
    tgl_mulai: '2026-08-22',
    tgl_selesai: '2026-08-25',
    status: 'Menunggu Survei',
    approval_status: 'Menunggu ACC',
    is_paraf_sent: true,
    paraf_sent_at: '2026-08-22T08:00:00.000Z',
    paraf_sent_by: 'RENZA MUHARAM',
    tarif_dasar: 0,
    uang_harian: 0,
    jumlah_estimasi: 0,
    ships_list: [{ noAgenda: '004/2026', namaKapal: 'KM PELITA MARITIM' }],
    raw_data: {
      id: 'SPS-2026-001',
      noAgenda: '004/2026',
      namaKapal: 'KM PELITA MARITIM',
      pemohon: 'PT. PELITA BAHARI',
      docType: 'SPS',
      isSps: true,
      perihal: 'DINAS SURVEY KLAS',
      jenisSurvey: 'Renewal Survey',
      petugas: 'SEPTIAN AJI DEWANGKARA',
      pangkat: 'GRADE 5 C',
      tempatSurvey: 'SURABAYA',
      lokasi: 'SURABAYA',
      tglMulai: '2026-08-22',
      tglSelesai: '2026-08-25',
      tglSurat: '2026-08-22',
      status: 'Menunggu Survei',
      isParafSent: true,
      shipsList: [{ noAgenda: '004/2026', namaKapal: 'KM PELITA MARITIM' }]
    }
  },
  {
    id: 'SPS-2026-002',
    nomor: null,
    no_agenda: '005/2026',
    agenda: '005/2026',
    nama_kapal: 'TB KARTIKA 05',
    pemohon: 'PT. KARTIKA SAMUDRA',
    doc_type: 'SPS',
    is_sps: true,
    is_pds: false,
    perihal: 'DINAS SURVEY KLAS',
    jenis_survey: 'Annual Survey',
    petugas: 'ALFIAN BONE PUTRA',
    pangkat: 'GRADE 6 A',
    jabatan: 'SURVEYOR',
    tempat_survey: 'PONTIANAK',
    lokasi: 'PONTIANAK',
    tgl_mulai: '2026-08-25',
    tgl_selesai: '2026-08-28',
    status: 'Menunggu Survei',
    approval_status: 'Menunggu ACC',
    is_paraf_sent: false,
    tarif_dasar: 0,
    uang_harian: 0,
    jumlah_estimasi: 0,
    ships_list: [{ noAgenda: '005/2026', namaKapal: 'TB KARTIKA 05' }],
    raw_data: {
      id: 'SPS-2026-002',
      noAgenda: '005/2026',
      namaKapal: 'TB KARTIKA 05',
      pemohon: 'PT. KARTIKA SAMUDRA',
      docType: 'SPS',
      isSps: true,
      perihal: 'DINAS SURVEY KLAS',
      jenisSurvey: 'Annual Survey',
      petugas: 'ALFIAN BONE PUTRA',
      pangkat: 'GRADE 6 A',
      tempatSurvey: 'PONTIANAK',
      lokasi: 'PONTIANAK',
      tglMulai: '2026-08-25',
      tglSelesai: '2026-08-28',
      tglSurat: '2026-08-25',
      status: 'Menunggu Survei',
      isParafSent: false,
      shipsList: [{ noAgenda: '005/2026', namaKapal: 'TB KARTIKA 05' }]
    }
  }
];

const RESTORE_KWITANSI = [
  {
    id: 'KW-BKI-2026-001',
    surat_id: 'ST-BKI-2026-001',
    nomor_surat: 'A 0    /SV.245/PK/KI-26',
    nama_kapal: 'KM MUTIARA LAUT',
    penerima: 'ALFIAN BONE PUTRA',
    lokasi: 'PONTIANAK',
    tarif_dasar: 3000000,
    biaya_tiket: 0,
    tiket_hotel: 0,
    tiket_pesawat_taxi: 0,
    kategori_transportasi: 'Kendaraan Operasional',
    jumlah: 3000000,
    status: 'Sudah Dibayar',
    tgl_bayar: '2026-08-04',
    catatan: 'Honorarium Annual Survey KM Mutiara Laut Pontianak',
    raw_data: {
      id: 'KW-BKI-2026-001',
      suratId: 'ST-BKI-2026-001',
      nomorSurat: 'A 0    /SV.245/PK/KI-26',
      namaKapal: 'KM MUTIARA LAUT',
      penerima: 'ALFIAN BONE PUTRA',
      lokasi: 'PONTIANAK',
      tarifDasar: 3000000,
      biayaTiket: 0,
      jumlah: 3000000,
      status: 'Sudah Dibayar',
      tglBayar: '2026-08-04',
      catatan: 'Honorarium Annual Survey KM Mutiara Laut Pontianak'
    }
  },
  {
    id: 'KW-BKI-2026-002',
    surat_id: 'ST-BKI-2026-002',
    nomor_surat: 'A 0    /SV.246/PK/KI-26',
    nama_kapal: 'TB SAMUDERA JAYA',
    penerima: 'SANDI NANDARIANTO',
    lokasi: 'BATAM',
    tarif_dasar: 4500000,
    biaya_tiket: 3300000,
    tiket_hotel: 0,
    tiket_pesawat_taxi: 3300000,
    kategori_transportasi: 'Pesawat Terbang',
    jumlah: 7800000,
    status: 'Belum Dibayar',
    catatan: 'Honorarium Docking Survey CITO (+50%) + Reimbursment Tiket Batam',
    raw_data: {
      id: 'KW-BKI-2026-002',
      suratId: 'ST-BKI-2026-002',
      nomorSurat: 'A 0    /SV.246/PK/KI-26',
      namaKapal: 'TB SAMUDERA JAYA',
      penerima: 'SANDI NANDARIANTO',
      lokasi: 'BATAM',
      tarifDasar: 4500000,
      biayaTiket: 3300000,
      jumlah: 7800000,
      status: 'Belum Dibayar',
      catatan: 'Honorarium Docking Survey CITO (+50%) + Reimbursment Tiket Batam'
    }
  },
  {
    id: 'KW-BKI-2026-003',
    surat_id: 'ST-BKI-2026-003',
    nomor_surat: 'A 0    /SV.247/PK/KI-26',
    nama_kapal: 'MV NUSANTARA EXPRESS',
    penerima: 'ANDRE GUNTUR',
    lokasi: 'JAKARTA',
    tarif_dasar: 3500000,
    biaya_tiket: 2400000,
    tiket_hotel: 0,
    tiket_pesawat_taxi: 2400000,
    kategori_transportasi: 'Pesawat Terbang',
    jumlah: 5900000,
    status: 'Belum Dibayar',
    catatan: 'Honorarium Intermediate Survey + Reimbursment Tiket Jakarta',
    raw_data: {
      id: 'KW-BKI-2026-003',
      suratId: 'ST-BKI-2026-003',
      nomorSurat: 'A 0    /SV.247/PK/KI-26',
      namaKapal: 'MV NUSANTARA EXPRESS',
      penerima: 'ANDRE GUNTUR',
      lokasi: 'JAKARTA',
      tarifDasar: 3500000,
      biayaTiket: 2400000,
      jumlah: 5900000,
      status: 'Belum Dibayar',
      catatan: 'Honorarium Intermediate Survey + Reimbursment Tiket Jakarta'
    }
  }
];

const RESTORE_LAPORAN = [
  {
    id: 'LAP-BKI-2026-001',
    surat_id: 'ST-BKI-2026-001',
    nama_kapal: 'KM MUTIARA LAUT',
    petugas: 'ALFIAN BONE PUTRA',
    lokasi: 'PONTIANAK',
    lokasi_survey: 'PONTIANAK',
    nama_survey: 'Annual Survey',
    tgl_lapor: '2026-08-03',
    tanggal: '2026-08-03',
    nilai: 3000000,
    tarif_dasar: 3000000,
    is_cito: false,
    hasil: 'Pemeriksaan tahunan lambung dan permesinan KM MUTIARA LAUT sesuai standar BKI. Rekomendasi perpanjangan sertifikat klas disetujui.',
    status: 'Disetujui',
    raw_data: {
      id: 'LAP-BKI-2026-001',
      suratId: 'ST-BKI-2026-001',
      namaKapal: 'KM MUTIARA LAUT',
      petugas: 'ALFIAN BONE PUTRA',
      lokasi: 'PONTIANAK',
      namaSurvey: 'Annual Survey',
      tglLapor: '2026-08-03',
      isCito: false,
      hasil: 'Pemeriksaan tahunan lambung dan permesinan KM MUTIARA LAUT sesuai standar BKI. Rekomendasi perpanjangan sertifikat klas disetujui.',
      status: 'Disetujui'
    }
  },
  {
    id: 'LAP-BKI-2026-002',
    surat_id: 'ST-BKI-2026-002',
    nama_kapal: 'TB SAMUDERA JAYA',
    petugas: 'SANDI NANDARIANTO',
    lokasi: 'BATAM',
    lokasi_survey: 'BATAM',
    nama_survey: 'Docking Survey',
    tgl_lapor: '2026-08-10',
    tanggal: '2026-08-10',
    nilai: 4500000,
    tarif_dasar: 4500000,
    is_cito: true,
    hasil: '[⚡ CITO] Pelaksanaan survei docking dan pemeriksaan poros baling-baling TB SAMUDERA JAYA di Galangan Batam selesai dilaksanakan dengan baik.',
    status: 'Terkirim',
    raw_data: {
      id: 'LAP-BKI-2026-002',
      suratId: 'ST-BKI-2026-002',
      namaKapal: 'TB SAMUDERA JAYA',
      petugas: 'SANDI NANDARIANTO',
      lokasi: 'BATAM',
      namaSurvey: 'Docking Survey',
      tglLapor: '2026-08-10',
      isCito: true,
      hasil: '[⚡ CITO] Pelaksanaan survei docking dan pemeriksaan poros baling-baling TB SAMUDERA JAYA di Galangan Batam selesai dilaksanakan dengan baik.',
      status: 'Terkirim'
    }
  }
];

async function run() {
  console.log('🚀 Memulihkan data cadangan ke Supabase...');

  // 1. Surat Tugas
  console.log('📥 Memulihkan surat_tugas...');
  for (const item of RESTORE_SURAT_TUGAS) {
    const { error } = await supabase.from('surat_tugas').upsert(item, { onConflict: 'id' });
    if (error) console.error(`  ❌ Error surat_tugas ${item.id}:`, error.message);
    else console.log(`  ✅ Berhasil surat_tugas: ${item.id} (${item.nama_kapal})`);
  }

  // 2. Kwitansi
  console.log('📥 Memulihkan kwitansi_honor...');
  for (const item of RESTORE_KWITANSI) {
    const { error } = await supabase.from('kwitansi_honor').upsert(item, { onConflict: 'id' });
    if (error) console.error(`  ❌ Error kwitansi_honor ${item.id}:`, error.message);
    else console.log(`  ✅ Berhasil kwitansi_honor: ${item.id} (${item.nama_kapal})`);
  }

  // 3. Laporan
  console.log('📥 Memulihkan laporan_survei...');
  for (const item of RESTORE_LAPORAN) {
    const { error } = await supabase.from('laporan_survei').upsert(item, { onConflict: 'id' });
    if (error) console.error(`  ❌ Error laporan_survei ${item.id}:`, error.message);
    else console.log(`  ✅ Berhasil laporan_survei: ${item.id} (${item.nama_kapal})`);
  }

  console.log('\n🎉 Pemulihan data ke Supabase selesai!');
}

run().catch(console.error);
