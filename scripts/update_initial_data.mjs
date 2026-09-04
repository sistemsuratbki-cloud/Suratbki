import fs from 'fs';

const data = JSON.parse(fs.readFileSync('database_export_hostinger.json', 'utf-8'));

const cleanSurat = data.surat_tugas.map((s) => {
  const raw = s.raw_data || {};
  return {
    id: s.id,
    nomor: s.nomor || raw.nomor || null,
    noAgenda: s.no_agenda || raw.noAgenda || null,
    agenda: s.agenda || raw.agenda || null,
    namaKapal: s.nama_kapal || raw.namaKapal || '',
    pemohon: s.pemohon || raw.pemohon || '',
    docType: s.doc_type || raw.docType || 'PDS',
    isSps: s.is_sps ?? raw.isSps ?? (s.doc_type === 'SPS'),
    isPds: s.is_pds ?? raw.isPds ?? (s.doc_type === 'PDS'),
    perihal: s.perihal || raw.perihal || 'DINAS SURVEY KLAS',
    jenisSurvey: s.jenis_survey || raw.jenisSurvey || '',
    petugas: s.petugas || raw.petugas || '',
    pangkat: s.pangkat || raw.pangkat || '',
    jabatan: s.jabatan || raw.jabatan || 'SURVEYOR',
    tempatSurvey: s.tempat_survey || raw.tempatSurvey || s.lokasi || '',
    lokasi: s.lokasi || raw.lokasi || s.tempat_survey || '',
    tglMulai: s.tgl_mulai || raw.tglMulai || '',
    tglSelesai: s.tgl_selesai || raw.tglSelesai || '',
    saranaTransportasi: s.sarana_transportasi || raw.saranaTransportasi || '',
    kategoriTransportasi: s.kategori_transportasi || raw.kategoriTransportasi || '',
    kategoriPerjalanan: s.kategori_perjalanan || raw.kategoriPerjalanan || '',
    status: s.status || raw.status || 'Menunggu Survei',
    approvalStatus: s.approval_status || raw.approvalStatus || 'Menunggu ACC',
    approvalDate: s.approval_date || raw.approvalDate || null,
    approvedBy: s.approved_by || raw.approvedBy || null,
    tarifDasar: Number(s.tarif_dasar || raw.tarifDasar || 0),
    uangHarian: Number(s.uang_harian || raw.uangHarian || 0),
    biayaTiket: Number(s.biaya_tiket || raw.biayaTiket || 0),
    tiketHotel: Number(s.tiket_hotel || raw.tiketHotel || 0),
    tiketPesawatTaxi: Number(s.tiket_pesawat_taxi || raw.tiketPesawatTaxi || 0),
    jumlahEstimasi: Number(s.jumlah_estimasi || raw.jumlahEstimasi || 0),
    isCito: Boolean(s.is_cito ?? raw.isCito),
    catatan: s.catatan || raw.catatan || '',
    shipsList: s.ships_list || raw.shipsList || [],
    shipsDetail: s.ships_detail || raw.shipsDetail || [],
    isParafSent: Boolean(s.is_paraf_sent ?? raw.isParafSent)
  };
});

const cleanKw = data.kwitansi_honor.map((k) => {
  const raw = k.raw_data || {};
  return {
    id: k.id,
    suratId: k.surat_id || raw.suratId || '',
    nomorSurat: k.nomor_surat || raw.nomorSurat || '',
    namaKapal: k.nama_kapal || raw.namaKapal || '',
    penerima: k.penerima || raw.penerima || '',
    lokasi: k.lokasi || raw.lokasi || '',
    tarifDasar: Number(k.tarif_dasar || raw.tarifDasar || 0),
    biayaTiket: Number(k.biaya_tiket || raw.biayaTiket || 0),
    tiketHotel: Number(k.tiket_hotel || raw.tiketHotel || 0),
    tiketPesawatTaxi: Number(k.tiket_pesawat_taxi || raw.tiketPesawatTaxi || 0),
    kategoriTransportasi: k.kategori_transportasi || raw.kategoriTransportasi || '',
    jumlah: Number(k.jumlah || raw.jumlah || 0),
    status: k.status || raw.status || 'Belum Dibayar',
    tglBayar: k.tgl_bayar || raw.tglBayar || '',
    catatan: k.catatan || raw.catatan || ''
  };
});

const cleanLap = data.laporan_survei.map((l) => {
  const raw = l.raw_data || {};
  return {
    id: l.id,
    suratId: l.surat_id || raw.suratId || '',
    namaKapal: l.nama_kapal || raw.namaKapal || '',
    petugas: l.petugas || raw.petugas || '',
    lokasi: l.lokasi || raw.lokasi || '',
    lokasiSurvey: l.lokasi_survey || raw.lokasiSurvey || '',
    namaSurvey: l.nama_survey || raw.namaSurvey || '',
    tglLapor: l.tgl_lapor || raw.tglLapor || '',
    tanggal: l.tanggal || raw.tanggal || '',
    nilai: Number(l.nilai || raw.nilai || 0),
    tarifDasar: Number(l.tarif_dasar || raw.tarifDasar || 0),
    isCito: Boolean(l.is_cito ?? raw.isCito),
    hasil: l.hasil || raw.hasil || '',
    status: l.status || raw.status || 'Terkirim'
  };
});

const fileContent = `// Data default awal sistem - Standalone / Hostinger Mode
export const INITIAL_SURAT_TUGAS = ${JSON.stringify(cleanSurat, null, 2)};

export const INITIAL_KWITANSI_HONOR = ${JSON.stringify(cleanKw, null, 2)};

export const INITIAL_LAPORAN_SURVEI = ${JSON.stringify(cleanLap, null, 2)};
`;

fs.writeFileSync('src/utils/initialData.js', fileContent, 'utf-8');
console.log('✅ Berhasil memperbarui src/utils/initialData.js');
