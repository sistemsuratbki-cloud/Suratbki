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
    sarana:                item.sarana               || null,
    sarana_transportasi:   item.saranaTransportasi   || null,
    kategori_transportasi: item.kategoriTransportasi || null,
    kategori_perjalanan:   item.kategoriPerjalanan   || null,
    keterangan:            item.keterangan           || null,
    status:                item.status               || 'Menunggu Survei',
    approval_status:       item.approvalStatus       || 'Menunggu ACC',
    approval_date:         item.approvalDate         || null,
    approved_by:           item.approvedBy           || null,
    rejection_reason:      item.rejectionReason      || null,
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
    raw_data:              item,
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
    kacab_signature_url: settings.kacabSignatureUrl  || null,
    tat_luar_kota:       Number(settings.tatLuarKota) || null,
    raw_data:            settings,
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
// 8. REALTIME — per-tabel, callback spesifik per tabel
// ==============================================================================

/**
 * Subscribe ke perubahan realtime.
 * Menerima object callbacks per tabel:
 * {
 *   onSuratTugas, onKwitansi, onLaporan,
 *   onTariffs, onGradeTariffs, onAdminSettings, onUsers
 * }
 * Masing-masing dipanggil dengan (eventType, newRow, oldRow).
 * Jika hanya ingin satu callback global, gunakan onAny.
 */
export const subscribeToRealtimeChanges = (callbacks = {}) => {
  if (!supabase) return () => {};

  const {
    onSuratTugas,
    onKwitansi,
    onLaporan,
    onTariffs,
    onGradeTariffs,
    onAdminSettings,
    onUsers,
    onAny,
  } = callbacks;

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
