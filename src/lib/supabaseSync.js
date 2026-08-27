import { supabase } from './supabase';

// ==============================================================================
// HELPERS
// ==============================================================================

/**
 * Merge raw_data (JSON fallback) dengan kolom-kolom struktural dari DB row.
 * Kolom struktural menang atas raw_data untuk field yang sama.
 */
const mapFromDb = (row) => {
  if (!row) return null;
  const raw = row.raw_data && typeof row.raw_data === 'object' ? row.raw_data : {};
  const merged = { ...raw, ...row };
  delete merged.raw_data;

  // Normalisasi field-field kunci agar camelCase selalu sinkron
  if (row.tgl_mulai !== undefined && row.tgl_mulai !== null) merged.tglMulai = row.tgl_mulai;
  else if (raw.tglMulai !== undefined && raw.tglMulai !== null) merged.tglMulai = raw.tglMulai;

  if (row.tgl_selesai !== undefined && row.tgl_selesai !== null) merged.tglSelesai = row.tgl_selesai;
  else if (raw.tglSelesai !== undefined && raw.tglSelesai !== null) merged.tglSelesai = raw.tglSelesai;

  if (row.tgl_surat !== undefined && row.tgl_surat !== null) merged.tglSurat = row.tgl_surat;
  else if (raw.tglSurat !== undefined && raw.tglSurat !== null) merged.tglSurat = raw.tglSurat;
  else if (raw.tglPembuatan !== undefined && raw.tglPembuatan !== null) merged.tglSurat = raw.tglPembuatan;

  if (row.tgl_lapor !== undefined && row.tgl_lapor !== null) merged.tglLapor = row.tgl_lapor;
  else if (raw.tglLapor !== undefined && raw.tglLapor !== null) merged.tglLapor = raw.tglLapor;

  if (row.nama_kapal !== undefined && row.nama_kapal !== null) merged.namaKapal = row.nama_kapal;
  else if (raw.namaKapal !== undefined && raw.namaKapal !== null) merged.namaKapal = raw.namaKapal;

  if (row.no_agenda !== undefined && row.no_agenda !== null) merged.noAgenda = row.no_agenda;
  else if (raw.noAgenda !== undefined && raw.noAgenda !== null) merged.noAgenda = raw.noAgenda;

  if (row.tempat_survey !== undefined && row.tempat_survey !== null) merged.tempatSurvey = row.tempat_survey;
  else if (raw.tempatSurvey !== undefined && raw.tempatSurvey !== null) merged.tempatSurvey = raw.tempatSurvey;

  if (row.jenis_survey !== undefined && row.jenis_survey !== null) merged.jenisSurvey = row.jenis_survey;
  else if (raw.jenisSurvey !== undefined && raw.jenisSurvey !== null) merged.jenisSurvey = raw.jenisSurvey;

  if (row.kategori_perjalanan !== undefined && row.kategori_perjalanan !== null) merged.kategoriPerjalanan = row.kategori_perjalanan;
  else if (raw.kategoriPerjalanan !== undefined && raw.kategoriPerjalanan !== null) merged.kategoriPerjalanan = raw.kategoriPerjalanan;

  if (row.tarif_dasar !== undefined && row.tarif_dasar !== null) merged.tarifDasar = row.tarif_dasar;
  else if (raw.tarifDasar !== undefined && raw.tarifDasar !== null) merged.tarifDasar = raw.tarifDasar;

  if (row.jumlah_estimasi !== undefined && row.jumlah_estimasi !== null) merged.jumlahEstimasi = row.jumlah_estimasi;
  else if (raw.jumlahEstimasi !== undefined && raw.jumlahEstimasi !== null) merged.jumlahEstimasi = raw.jumlahEstimasi;

  // Normalisasi status & approvalStatus
  if (row.status !== undefined && row.status !== null) merged.status = row.status;
  else if (raw.status !== undefined && raw.status !== null) merged.status = raw.status;

  const rawApproval = row.approval_status || raw.approvalStatus || raw.approval_status;
  if (rawApproval === 'ACC' || rawApproval === 'Sudah ACC' || rawApproval === 'Sudah di-ACC' || merged.status === 'Selesai') {
    merged.approvalStatus = 'ACC';
    merged.status = 'Selesai';
    merged.approvalNote = '';
    merged.rejectionReason = '';
    merged.approvalDate = row.approval_date || raw.approvalDate || raw.approvalAt || null;
    merged.approvalAt = row.approval_date || raw.approvalAt || raw.approvalDate || null;
    merged.approvedBy = row.approved_by || raw.approvedBy || raw.approvalBy || null;
    merged.approvalBy = row.approved_by || raw.approvalBy || raw.approvedBy || null;
  } else if (rawApproval === 'Revisi' || rawApproval === 'Perlu Revisi') {
    merged.approvalStatus = 'Revisi';
    merged.approvalNote = row.rejection_reason || raw.approvalNote || raw.rejectionReason || '';
    merged.rejectionReason = row.rejection_reason || raw.rejectionReason || raw.approvalNote || '';
    merged.approvalDate = null;
    merged.approvalAt = null;
    merged.approvedBy = null;
    merged.approvalBy = null;
  } else {
    merged.approvalStatus = rawApproval || 'Menunggu';
    merged.approvalNote = '';
    merged.rejectionReason = '';
    merged.approvalDate = null;
    merged.approvalAt = null;
    merged.approvedBy = null;
    merged.approvalBy = null;
  }

  if (row.doc_type !== undefined && row.doc_type !== null) merged.docType = row.doc_type;
  else if (raw.docType !== undefined && raw.docType !== null) merged.docType = raw.docType;

  if (row.no_so !== undefined && row.no_so !== null) merged.noSo = row.no_so;
  else if (raw.noSo !== undefined && raw.noSo !== null) merged.noSo = raw.noSo;
  else merged.noSo = '';

  if (row.no_order !== undefined && row.no_order !== null) merged.noOrder = row.no_order;
  else if (raw.noOrder !== undefined && raw.noOrder !== null) merged.noOrder = raw.noOrder;
  else merged.noOrder = '';

  if (row.no_wbs !== undefined && row.no_wbs !== null) merged.noWbs = row.no_wbs;
  else if (raw.noWbs !== undefined) merged.noWbs = raw.noWbs;

  if (row.no_cda !== undefined && row.no_cda !== null) merged.noCda = row.no_cda;
  else if (raw.noCda !== undefined) merged.noCda = raw.noCda;

  // Normalisasi field TTD / signature agar camelCase selalu sinkron
  if (row.signature_url !== undefined && row.signature_url !== null) merged.signatureUrl = row.signature_url;
  else if (raw.signatureUrl !== undefined && raw.signatureUrl !== null) merged.signatureUrl = raw.signatureUrl;

  if (row.kacab_signature_url !== undefined && row.kacab_signature_url !== null) merged.kacabSignatureUrl = row.kacab_signature_url;
  else if (raw.kacabSignatureUrl !== undefined && raw.kacabSignatureUrl !== null) merged.kacabSignatureUrl = raw.kacabSignatureUrl;

  if (row.pembuat_signature_url !== undefined && row.pembuat_signature_url !== null) merged.pembuatSignatureUrl = row.pembuat_signature_url;
  else if (raw.pembuatSignatureUrl !== undefined && raw.pembuatSignatureUrl !== null) merged.pembuatSignatureUrl = raw.pembuatSignatureUrl;

  // Normalisasi field admin settings lainnya
  if (row.role_label !== undefined && row.role_label !== null) merged.roleLabel = row.role_label;
  else if (raw.roleLabel !== undefined) merged.roleLabel = raw.roleLabel;

  if (row.avatar_bg !== undefined && row.avatar_bg !== null) merged.avatarBg = row.avatar_bg;
  else if (raw.avatarBg !== undefined) merged.avatarBg = raw.avatarBg;

  if (row.kepala_cabang !== undefined && row.kepala_cabang !== null) merged.kepalaCabang = row.kepala_cabang;
  else if (raw.kepalaCabang !== undefined) merged.kepalaCabang = raw.kepalaCabang;

  if (row.pembuat_daftar !== undefined && row.pembuat_daftar !== null) merged.pembuatDaftar = row.pembuat_daftar;
  else if (raw.pembuatDaftar !== undefined) merged.pembuatDaftar = raw.pembuatDaftar;

  if (row.nup_pembuat_daftar !== undefined && row.nup_pembuat_daftar !== null) merged.nupPembuatDaftar = row.nup_pembuat_daftar;
  else if (raw.nupPembuatDaftar !== undefined) merged.nupPembuatDaftar = raw.nupPembuatDaftar;

  if (row.nama_cabang !== undefined && row.nama_cabang !== null) merged.namaCabang = row.nama_cabang;
  else if (raw.namaCabang !== undefined) merged.namaCabang = raw.namaCabang;

  if (row.tat_luar_kota !== undefined && row.tat_luar_kota !== null) merged.tatLuarKota = row.tat_luar_kota;
  else if (raw.tatLuarKota !== undefined) merged.tatLuarKota = raw.tatLuarKota;

  // Normalisasi shipsDetail
  if (row.ships_detail !== undefined && row.ships_detail !== null) {
    merged.shipsDetail = typeof row.ships_detail === 'string' ? (() => { try { return JSON.parse(row.ships_detail); } catch (e) { return []; } })() : row.ships_detail;
  } else if (raw.shipsDetail !== undefined) {
    merged.shipsDetail = raw.shipsDetail;
  }

  // Normalisasi fotoList (Batch Upload & Multi-Photo)
  if (row.foto_list !== undefined && row.foto_list !== null) {
    merged.fotoList = typeof row.foto_list === 'string' ? (() => { try { return JSON.parse(row.foto_list); } catch (e) { return []; } })() : row.foto_list;
  } else if (raw.fotoList !== undefined) {
    merged.fotoList = raw.fotoList;
  } else if (raw.foto_list !== undefined) {
    merged.fotoList = raw.foto_list;
  }

  // Normalisasi lampiran berkas (visit, selfie, tiket, hotel, fotoList)
  if (row.file_visit_name !== undefined && row.file_visit_name !== null) merged.fileVisitName = row.file_visit_name;
  else if (raw.fileVisitName !== undefined) merged.fileVisitName = raw.fileVisitName;

  if (row.file_visit_data !== undefined && row.file_visit_data !== null) merged.fileVisitData = row.file_visit_data;
  else if (raw.fileVisitData !== undefined) merged.fileVisitData = raw.fileVisitData;
  else if (merged.fileVisitName && (merged.fileVisitName.startsWith('http') || merged.fileVisitName.startsWith('data:'))) merged.fileVisitData = merged.fileVisitName;

  if (row.file_foto_name !== undefined && row.file_foto_name !== null) merged.fileFotoName = row.file_foto_name;
  else if (raw.fileFotoName !== undefined) merged.fileFotoName = raw.fileFotoName;

  if (row.file_foto_data !== undefined && row.file_foto_data !== null) merged.fileFotoData = row.file_foto_data;
  else if (raw.fileFotoData !== undefined) merged.fileFotoData = raw.fileFotoData;
  else if (merged.fileFotoName && (merged.fileFotoName.startsWith('http') || merged.fileFotoName.startsWith('data:'))) merged.fileFotoData = merged.fileFotoName;

  if (row.file_tiket_transport_name !== undefined && row.file_tiket_transport_name !== null) merged.fileTiketTransportName = row.file_tiket_transport_name;
  else if (row.file_tiket_name !== undefined && row.file_tiket_name !== null) merged.fileTiketTransportName = row.file_tiket_name;
  else if (raw.fileTiketTransportName !== undefined) merged.fileTiketTransportName = raw.fileTiketTransportName;
  else if (raw.fileTiketName !== undefined) merged.fileTiketTransportName = raw.fileTiketName;

  if (row.file_tiket_transport_data !== undefined && row.file_tiket_transport_data !== null) merged.fileTiketTransportData = row.file_tiket_transport_data;
  else if (raw.fileTiketTransportData !== undefined) merged.fileTiketTransportData = raw.fileTiketTransportData;
  else if (raw.fileTiketData !== undefined) merged.fileTiketTransportData = raw.fileTiketData;

  if (row.file_kwitansi_hotel_name !== undefined && row.file_kwitansi_hotel_name !== null) merged.fileKwitansiHotelName = row.file_kwitansi_hotel_name;
  else if (raw.fileKwitansiHotelName !== undefined) merged.fileKwitansiHotelName = raw.fileKwitansiHotelName;

  if (row.file_kwitansi_hotel_data !== undefined && row.file_kwitansi_hotel_data !== null) merged.fileKwitansiHotelData = row.file_kwitansi_hotel_data;
  else if (raw.fileKwitansiHotelData !== undefined) merged.fileKwitansiHotelData = raw.fileKwitansiHotelData;

  if (raw.rincianTiket !== undefined) merged.rincianTiket = raw.rincianTiket;
  if (raw.rincianHotel !== undefined) merged.rincianHotel = raw.rincianHotel;

  // Normalisasi field visit survei
  if (row.jam_berangkat !== undefined && row.jam_berangkat !== null) merged.jamBerangkat = row.jam_berangkat;
  else if (raw.jamBerangkat !== undefined) merged.jamBerangkat = raw.jamBerangkat;

  if (row.jam_selesai !== undefined && row.jam_selesai !== null) merged.jamSelesai = row.jam_selesai;
  else if (raw.jamSelesai !== undefined) merged.jamSelesai = raw.jamSelesai;

  if (row.ships !== undefined && row.ships !== null) merged.ships = row.ships;
  else if (raw.ships !== undefined) merged.ships = raw.ships;

  return merged;
};

/**
 * Retry sebuah async function sampai maxRetries kali dengan delay exponential.
 */
const withRetry = async (fn, maxRetries = 3, delayMs = 300) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
};

// ==============================================================================
// 1. SURAT TUGAS
// ==============================================================================

export const fetchSuratTugasFromCloud = async () => {
  if (!supabase) return null;
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('surat_tugas')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.warn('[DB] fetch surat_tugas:', error.message); return null; }
    return (data || []).map(mapFromDb);
  }).catch(() => null);
};

export const saveSuratTugasToCloud = async (item) => {
  if (!supabase || !item?.id) return;
  const isAcc = item.approvalStatus === 'ACC' || (item.status === 'Selesai' && item.approvalStatus !== 'Revisi');
  const isRev = item.approvalStatus === 'Revisi';

  const finalApprovalStatus = isAcc ? 'ACC' : isRev ? 'Revisi' : (item.approvalStatus || 'Menunggu ACC');
  const finalStatus = isAcc ? 'Selesai' : (item.status || 'Menunggu Survei');
  const finalApprovalNote = isRev ? (item.approvalNote || item.rejectionReason || '') : '';
  const finalRejectionReason = isRev ? (item.rejectionReason || item.approvalNote || null) : null;
  const finalApprovalBy = isAcc ? (item.approvalBy || item.approvedBy || null) : null;
  const finalApprovalAt = isAcc ? (item.approvalAt || item.approvalDate || new Date().toISOString()) : null;

  const payload = {
    id:                    String(item.id),
    nomor:                 item.nomor                || null,
    no_agenda:             item.noAgenda             || null,
    agenda:                item.agenda               || item.noAgenda || null,
    nama_kapal:            item.namaKapal            || null,
    pemohon:               item.pemohon              || null,
    no_order:              item.noOrder              || null,
    doc_type:              item.docType              || (item.isSps ? 'SPS' : 'PDS'),
    is_sps:                Boolean(item.isSps),
    is_pds:                Boolean(item.isPds),
    perihal:               item.perihal              || null,
    jenis_survey:          item.jenisSurvey          || null,
    petugas:               item.petugas              || null,
    pangkat:               item.pangkat              || null,
    jabatan:               item.jabatan              || 'SURVEYOR',
    tempat_survey:         item.tempatSurvey         || item.lokasi    || null,
    lokasi:                item.lokasi               || item.tempatSurvey || null,
    tgl_mulai:             item.tglMulai             || null,
    tgl_selesai:           item.tglSelesai           || null,
    tgl_surat:             item.tglSurat             || item.tglPembuatan || item.tglMulai || null,
    sarana:                item.sarana               || null,
    sarana_transportasi:   item.saranaTransportasi   || null,
    kategori_transportasi: item.kategoriTransportasi || null,
    kategori_perjalanan:   item.kategoriPerjalanan   || null,
    status:                finalStatus,
    approval_status:       finalApprovalStatus,
    approval_date:         finalApprovalAt,
    approved_by:           finalApprovalBy,
    rejection_reason:      finalRejectionReason,
    is_paraf_sent:         Boolean(item.isParafSent),
    paraf_sent_at:         item.parafSentAt          || null,
    paraf_sent_by:         item.parafSentBy          || null,
    tarif_dasar:           Number(item.tarifDasar)   || 0,
    uang_harian:           Number(item.uangHarian)   || 0,
    biaya_tiket:           Number(item.biayaTiket)   || 0,
    tiket_hotel:           Number(item.tiketHotel)   || 0,
    tiket_pesawat_taxi:    Number(item.tiketPesawatTaxi) || 0,
    jumlah_estimasi:       Number(item.jumlahEstimasi) || 0,
    no_cda:                item.noCda                || null,
    no_so:                 item.noSo                 || null,
    no_wbs:                item.noWbs                || null,
    is_cito:               Boolean(item.isCito),
    catatan:               item.catatan              || null,
    batch_id:              item.batchId              || null,
    pds_id:                item.pdsId                || null,
    linked_sps_ids:        Array.isArray(item.linkedSpsIds) ? item.linkedSpsIds : [],
    ships_detail:          Array.isArray(item.shipsDetail)  ? item.shipsDetail  : [],
    ships_list:            Array.isArray(item.shipsList)    ? item.shipsList    : [],
    foto_list:             Array.isArray(item.fotoList)     ? item.fotoList     : [],
    file_tiket_name:            item.fileTiketName            || null,
    file_foto_name:             item.fileFotoName             || null,
    file_visit_name:            item.fileVisitName            || null,
    file_kwitansi_hotel_name:   item.fileKwitansiHotelName    || null,
    file_tiket_transport_name:  item.fileTiketTransportName   || null,
    raw_data:              {
      ...item,
      approvalStatus: finalApprovalStatus,
      status: finalStatus,
      approvalNote: finalApprovalNote,
      rejectionReason: finalRejectionReason || '',
      approvalBy: finalApprovalBy,
      approvedBy: finalApprovalBy,
      approvalAt: finalApprovalAt,
      approvalDate: finalApprovalAt
    },
  };
  return withRetry(async () => {
    const { error } = await supabase
      .from('surat_tugas')
      .upsert(payload, { onConflict: 'id' });
    if (error) console.warn('[DB] save surat_tugas:', error.message);
  }).catch((e) => console.warn('[DB] save surat_tugas retry failed:', e.message));
};

export const deleteSuratTugasFromCloud = async (id) => {
  if (!supabase || !id) return;
  return withRetry(async () => {
    const { error } = await supabase.from('surat_tugas').delete().eq('id', String(id));
    if (error) console.warn('[DB] delete surat_tugas:', error.message);
  }).catch(() => {});
};

// ==============================================================================
// 2. KWITANSI HONOR
// ==============================================================================

export const fetchKwitansiFromCloud = async () => {
  if (!supabase) return null;
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('kwitansi_honor')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.warn('[DB] fetch kwitansi:', error.message); return null; }
    return (data || []).map(mapFromDb);
  }).catch(() => null);
};

export const saveKwitansiToCloud = async (item) => {
  if (!supabase || !item?.id) return;
  const payload = {
    id:                    String(item.id),
    surat_id:              item.suratId              || null,
    nomor_surat:           item.nomorSurat           || null,
    nama_kapal:            item.namaKapal            || null,
    penerima:              item.penerima             || null,
    lokasi:                item.lokasi               || null,
    tarif_dasar:           Number(item.tarifDasar)   || 0,
    biaya_tiket:           Number(item.biayaTiket)   || 0,
    tiket_hotel:           Number(item.tiketHotel)   || 0,
    tiket_pesawat_taxi:    Number(item.tiketPesawatTaxi) || 0,
    kategori_transportasi: item.kategoriTransportasi || null,
    jumlah:                Number(item.jumlah)       || 0,
    status:                item.status               || 'Belum Dibayar',
    tgl_bayar:             item.tglBayar             || null,
    catatan:               item.catatan              || null,
    file_tiket_name:           item.fileTiketName           || null,
    file_foto_name:            item.fileFotoName            || null,
    file_visit_name:           item.fileVisitName           || null,
    file_kwitansi_hotel_name:  item.fileKwitansiHotelName   || null,
    raw_data:              item,
  };
  return withRetry(async () => {
    const { error } = await supabase
      .from('kwitansi_honor')
      .upsert(payload, { onConflict: 'id' });
    if (error) console.warn('[DB] save kwitansi:', error.message);
  }).catch((e) => console.warn('[DB] save kwitansi retry failed:', e.message));
};

export const deleteKwitansiFromCloud = async (id) => {
  if (!supabase || !id) return;
  return withRetry(async () => {
    const { error } = await supabase.from('kwitansi_honor').delete().eq('id', String(id));
    if (error) console.warn('[DB] delete kwitansi:', error.message);
  }).catch(() => {});
};

// ==============================================================================
// 3. LAPORAN SURVEI
// ==============================================================================

export const fetchLaporanFromCloud = async () => {
  if (!supabase) return null;
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('laporan_survei')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.warn('[DB] fetch laporan:', error.message); return null; }
    return (data || []).map(mapFromDb);
  }).catch(() => null);
};

export const saveLaporanToCloud = async (item) => {
  if (!supabase || !item?.id) return;
  const payload = {
    id:             String(item.id),
    surat_id:       item.suratId        || null,
    tgl_lapor:      item.tglLapor       || item.tanggal  || null,
    tanggal:        item.tanggal        || item.tglLapor || null,
    nama_kapal:     item.namaKapal      || null,
    lokasi:         item.lokasi         || item.lokasiSurvey || null,
    lokasi_survey:  item.lokasiSurvey   || item.lokasi       || null,
    nilai:          Number(item.nilai)  || 0,
    tarif_dasar:    Number(item.tarifDasar) || 0,
    nama_survey:    item.namaSurvey     || null,
    no_agenda:      item.noAgenda       || null,
    no_cda:         item.noCda          || null,
    no_so:          item.noSo           || null,
    no_wbs:         item.noWbs          || null,
    petugas:        item.petugas        || null,
    pangkat:        item.pangkat        || null,
    is_cito:        Boolean(item.isCito),
    hasil:          item.hasil          || null,
    status:         item.status         || 'Terkirim',
    is_edit_requested:    Boolean(item.isEditRequested),
    edit_request_date:    item.editRequestDate     || null,
    is_unlocked_by_admin: Boolean(item.isUnlockedByAdmin),
    unlocked_at:          item.unlockedAt          || null,
    file_foto_name:              item.fileFotoName             || null,
    file_visit_name:             item.fileVisitName            || null,
    file_tiket_transport_name:   item.fileTiketTransportName   || null,
    file_kwitansi_hotel_name:    item.fileKwitansiHotelName    || null,
    ships_detail:   Array.isArray(item.shipsDetail) ? item.shipsDetail : [],
    foto_list:      Array.isArray(item.fotoList)    ? item.fotoList    : [],
    raw_data:       item,
  };
  return withRetry(async () => {
    const { error } = await supabase
      .from('laporan_survei')
      .upsert(payload, { onConflict: 'id' });
    if (error) console.warn('[DB] save laporan:', error.message);
  }).catch((e) => console.warn('[DB] save laporan retry failed:', e.message));
};

export const deleteLaporanFromCloud = async (id) => {
  if (!supabase || !id) return;
  return withRetry(async () => {
    const { error } = await supabase.from('laporan_survei').delete().eq('id', String(id));
    if (error) console.warn('[DB] delete laporan:', error.message);
  }).catch(() => {});
};

// ==============================================================================
// 4. TARIFFS
// ==============================================================================

export const fetchTariffsFromCloud = async () => {
  if (!supabase) return null;
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('tariffs')
      .select('*')
      .order('no', { ascending: true });
    if (error || !data?.length) return null;
    return data.map(mapFromDb);
  }).catch(() => null);
};

export const saveTariffToCloud = async (item) => {
  if (!supabase || !item?.id) return;
  const payload = {
    id:       String(item.id),
    no:       item.no       || null,
    name:     item.name     || item.tujuan || '',
    tujuan:   item.tujuan   || item.name   || '',
    rincian:  item.rincian  || '',
    rate:     Number(item.rate) || 0,
    moda:     item.moda     || 'Darat',
    kategori: item.kategori || 'Dalam Kota',
    raw_data: item,
  };
  return withRetry(async () => {
    const { error } = await supabase.from('tariffs').upsert(payload, { onConflict: 'id' });
    if (error) console.warn('[DB] save tariff:', error.message);
  }).catch(() => {});
};

export const deleteTariffFromCloud = async (id) => {
  if (!supabase || !id) return;
  return withRetry(async () => {
    await supabase.from('tariffs').delete().eq('id', String(id));
  }).catch(() => {});
};

// ==============================================================================
// 5. GRADE TARIFFS
// ==============================================================================

export const fetchGradeTariffsFromCloud = async () => {
  if (!supabase) return null;
  return withRetry(async () => {
    const { data, error } = await supabase.from('grade_tariffs').select('*');
    if (error || !data?.length) return null;
    return data.map(mapFromDb);
  }).catch(() => null);
};

export const saveGradeTariffToCloud = async (item) => {
  if (!supabase || !item?.id) return;
  const payload = {
    id:          String(item.id),
    grade:       item.grade       || '',
    uang_harian: Number(item.uangHarian) || 0,
    raw_data:    item,
  };
  return withRetry(async () => {
    const { error } = await supabase.from('grade_tariffs').upsert(payload, { onConflict: 'id' });
    if (error) console.warn('[DB] save grade_tariff:', error.message);
  }).catch(() => {});
};

export const deleteGradeTariffFromCloud = async (id) => {
  if (!supabase || !id) return;
  return withRetry(async () => {
    await supabase.from('grade_tariffs').delete().eq('id', String(id));
  }).catch(() => {});
};

// ==============================================================================
// 6. ADMIN SETTINGS
// ==============================================================================

export const fetchAdminSettingsFromCloud = async () => {
  if (!supabase) return null;
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('id', 'default_settings')
      .maybeSingle();
    if (error || !data) return null;
    return mapFromDb(data);
  }).catch(() => null);
};

export const saveAdminSettingsToCloud = async (settings) => {
  if (!supabase || !settings) return;
  const payload = {
    id:                  'default_settings',
    kepala_cabang:       settings.kepalaCabang      || null,
    nup:                 settings.nup               || null,
    pembuat_daftar:      settings.pembuatDaftar      || null,
    nup_pembuat_daftar:  settings.nupPembuatDaftar   || null,
    nama_cabang:         settings.namaCabang         || null,
    kacab_signature_url:   settings.kacabSignatureUrl    || null,
    pembuat_signature_url: settings.pembuatSignatureUrl  || null,
    tat_luar_kota:         Number(settings.tatLuarKota)  || null,
    raw_data:              settings,
  };
  return withRetry(async () => {
    const { error } = await supabase
      .from('admin_settings')
      .upsert(payload, { onConflict: 'id' });
    if (error) console.warn('[DB] save admin_settings:', error.message);
  }).catch(() => {});
};

// ==============================================================================
// 7. USERS
// ==============================================================================

export const fetchUsersFromCloud = async () => {
  if (!supabase) return null;
  return withRetry(async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (error || !data?.length) return null;
    return data.map(mapFromDb);
  }).catch(() => null);
};

export const saveUserToCloud = async (user) => {
  if (!supabase || !user?.id) return;
  const payload = {
    id:            String(user.id),
    username:      user.username,
    password:      user.password,
    name:          user.name,
    email:         user.email         || null,
    phone:         user.phone         || null,
    role:          user.role          || 'surveyor',
    grade:         user.grade         || 'GRADE 5 C',
    role_label:    user.roleLabel     || 'Surveyor',
    avatar_bg:     user.avatarBg      || '#10b981',
    signature_url: user.signatureUrl  || null,
    description:   user.description   || null,
    raw_data:      user,
  };
  return withRetry(async () => {
    const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
    if (error) console.warn('[DB] save user:', error.message);
  }).catch(() => {});
};

export const deleteUserFromCloud = async (id) => {
  if (!supabase || !id) return;
  return withRetry(async () => {
    await supabase.from('users').delete().eq('id', String(id));
  }).catch(() => {});
};

// ==============================================================================
// 8. MASTER KAPAL
// ==============================================================================

export const fetchMasterKapalFromCloud = async () => {
  if (!supabase) return null;
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('master_kapal')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) { console.warn('[DB] fetch master_kapal:', error.message); return null; }
    return (data || []).map((row) => {
      const raw = row.raw_data && typeof row.raw_data === 'object' ? row.raw_data : {};
      return {
        id:          row.id          || raw.id,
        namaKapal:   row.nama_kapal   || raw.namaKapal   || '',
        noAgenda:    row.no_agenda    || raw.noAgenda    || '',
        pemohon:     row.pemohon      || raw.pemohon     || '',
        jenisSurvey: row.jenis_survey || raw.jenisSurvey || '',
        createdAt:   row.created_at   || raw.createdAt   || null,
      };
    });
  }).catch(() => null);
};

export const saveMasterKapalToCloud = async (item) => {
  if (!supabase || !item?.id) return;
  const payload = {
    id:         String(item.id),
    nama_kapal: item.namaKapal || '',
    no_agenda:  item.noAgenda  || '',
    pemohon:    item.pemohon   || '',
    raw_data:   item,
  };
  return withRetry(async () => {
    const { error } = await supabase
      .from('master_kapal')
      .upsert(payload, { onConflict: 'id' });
    if (error) console.warn('[DB] save master_kapal:', error.message);
  }).catch((e) => console.warn('[DB] save master_kapal retry failed:', e.message));
};

export const deleteMasterKapalFromCloud = async (id) => {
  if (!supabase || !id) return;
  return withRetry(async () => {
    const { error } = await supabase.from('master_kapal').delete().eq('id', String(id));
    if (error) console.warn('[DB] delete master_kapal:', error.message);
  }).catch(() => {});
};

// ==============================================================================
// 9. VISIT SURVEI
// ==============================================================================

export const fetchVisitSurveiFromCloud = async () => {
  if (!supabase) return null;
  return withRetry(async () => {
    // 1. Coba dari tabel dedicated visit_survei
    const { data, error } = await supabase
      .from('visit_survei')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map(mapFromDb);
    }

    // 2. Fallback cek dari admin_settings.raw_data.visit_survei_list
    const { data: settingsData, error: sErr } = await supabase
      .from('admin_settings')
      .select('raw_data')
      .eq('id', 'default_settings')
      .maybeSingle();

    if (!sErr && settingsData?.raw_data?.visit_survei_list !== undefined) {
      const list = settingsData.raw_data.visit_survei_list;
      return Array.isArray(list) ? list.map(mapFromDb) : [];
    }

    if (!error && Array.isArray(data)) {
      return data.map(mapFromDb);
    }

    return [];
  }).catch(() => null);
};

export const saveVisitSurveiToCloud = async (item) => {
  if (!supabase || !item?.id) return;
  const payload = {
    id:            String(item.id),
    nama:          item.nama          || null,
    lokasi:        item.lokasi        || null,
    nama_kapal:    item.namaKapal     || null,
    ships:         Array.isArray(item.ships) ? item.ships : [],
    jam_berangkat: item.jamBerangkat  || null,
    durasi:        Number(item.durasi) || 1,
    jam_selesai:   item.jamSelesai    || null,
    tanggal:       item.tanggal       || null,
    status:        item.status        || 'On Proses',
    keterangan:    item.keterangan    || null,
    raw_data:      item,
  };

  return withRetry(async () => {
    // A. Simpan ke tabel visit_survei jika ada
    await supabase.from('visit_survei').upsert(payload, { onConflict: 'id' });

    // B. Simpan juga ke admin_settings agar 100% realtime & tersinkronisasi di semua client
    try {
      const { data: currentSettings } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('id', 'default_settings')
        .maybeSingle();

      const existingRaw = currentSettings?.raw_data || {};
      const existingList = Array.isArray(existingRaw.visit_survei_list) ? existingRaw.visit_survei_list : [];
      const updatedList = [item, ...existingList.filter((v) => String(v.id) !== String(item.id))];

      await supabase
        .from('admin_settings')
        .upsert({
          id: 'default_settings',
          raw_data: {
            ...existingRaw,
            visit_survei_list: updatedList
          }
        }, { onConflict: 'id' });
    } catch (fallbackErr) {
      // ignore
    }
  }).catch((e) => console.warn('[DB] save visit_survei retry failed:', e.message));
};

export const deleteVisitSurveiFromCloud = async (id) => {
  if (!supabase || !id) return;
  const idStr = String(id);
  return withRetry(async () => {
    // A. Hapus dari tabel visit_survei
    await supabase.from('visit_survei').delete().eq('id', idStr);

    // B. Hapus dari admin_settings
    try {
      const { data: currentSettings } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('id', 'default_settings')
        .maybeSingle();

      const existingRaw = currentSettings?.raw_data || {};
      const existingList = Array.isArray(existingRaw.visit_survei_list) ? existingRaw.visit_survei_list : [];
      const updatedList = existingList.filter((v) => String(v.id) !== idStr);

      await supabase
        .from('admin_settings')
        .upsert({
          id: 'default_settings',
          raw_data: {
            ...existingRaw,
            visit_survei_list: updatedList
          }
        }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[DB] delete visit from admin_settings error:', e);
    }
  }).catch((err) => console.warn('[DB] delete visit_survei retry failed:', err));
};

// ==============================================================================
// 10. CLEAR OPERATIONAL DATA (SPS, PDS, LAPORAN, KWITANSI, VISIT SURVEI)
// ==============================================================================

export const clearOperationalDataFromCloud = async () => {
  if (!supabase) return;
  return withRetry(async () => {
    await Promise.all([
      supabase.from('surat_tugas').delete().neq('id', '___safe_keep___'),
      supabase.from('kwitansi_honor').delete().neq('id', '___safe_keep___'),
      supabase.from('laporan_survei').delete().neq('id', '___safe_keep___'),
      supabase.from('visit_survei').delete().neq('id', '___safe_keep___')
    ]);
  }).catch((e) => console.warn('[DB] clear operational data failed:', e.message));
};

// ==============================================================================
// 11. REALTIME — per-tabel, callback spesifik per tabel
// ==============================================================================

/**
 * Subscribe ke perubahan realtime.
 * Menerima object callbacks per tabel:
 * {
 *   onSuratTugas, onKwitansi, onLaporan,
 *   onTariffs, onGradeTariffs, onAdminSettings, onUsers, onMasterKapal, onVisitSurvei
 * }
 * Masing-masing dipanggil dengan (eventType, newRow, oldRow).
 * Jika hanya ingin satu callback global, gunakan onAny.
 */
export const subscribeToRealtimeChanges = (callbacks = {}) => {
  if (!supabase) return () => {};

  const config = typeof callbacks === 'function' ? { onAny: callbacks } : (callbacks || {});

  const {
    onSuratTugas,
    onKwitansi,
    onLaporan,
    onTariffs,
    onGradeTariffs,
    onAdminSettings,
    onUsers,
    onMasterKapal,
    onVisitSurvei,
    onAny,
  } = config;

  const handle = (table, specificCb) => (payload) => {
    const { eventType, new: newRow, old: oldRow } = payload;
    if (typeof specificCb === 'function') specificCb(eventType, newRow, oldRow);
    if (typeof onAny === 'function') onAny(table, eventType, newRow, oldRow);
  };

  const channel = supabase
    .channel('db-realtime-v2')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'surat_tugas' },
        handle('surat_tugas', onSuratTugas))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'kwitansi_honor' },
        handle('kwitansi_honor', onKwitansi))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'laporan_survei' },
        handle('laporan_survei', onLaporan))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tariffs' },
        handle('tariffs', onTariffs))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'grade_tariffs' },
        handle('grade_tariffs', onGradeTariffs))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_settings' },
        handle('admin_settings', onAdminSettings))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' },
        handle('users', onUsers))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'master_kapal' },
        handle('master_kapal', onMasterKapal))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'visit_survei' },
        handle('visit_survei', onVisitSurvei))
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Connected ✓');
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('[Realtime] Channel error — will retry automatically');
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
};

