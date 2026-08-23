import { supabase } from './supabase';

/**
 * Helper to safely extract object from database row.
 * Combines structured columns with raw_data JSON fallback.
 */
const mapFromDb = (row) => {
  if (!row) return null;
  const raw = row.raw_data && typeof row.raw_data === 'object' ? row.raw_data : {};
  const merged = { ...raw, ...row };
  delete merged.raw_data;
  return merged;
};

/**
 * Format item into Supabase row with raw_data fallback.
 */
const mapToDb = (item) => {
  if (!item || typeof item !== 'object') return {};
  const id = item.id;
  return {
    id: String(id),
    raw_data: item,
    updated_at: new Date().toISOString()
  };
};

// ==============================================================================
// 1. SURAT TUGAS & SPS/PDS CLOUD SYNC
// ==============================================================================
export const fetchSuratTugasFromCloud = async () => {
  try {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('surat_tugas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch surat_tugas:', error.message);
      return null;
    }
    return (data || []).map(mapFromDb);
  } catch (err) {
    console.warn('Supabase fetch surat_tugas error:', err);
    return null;
  }
};

export const saveSuratTugasToCloud = async (item) => {
  try {
    if (!supabase || !item || !item.id) return;
    const payload = {
      id: String(item.id),
      nomor: item.nomor || null,
      no_agenda: item.noAgenda || null,
      agenda: item.agenda || item.noAgenda || null,
      nama_kapal: item.namaKapal || null,
      doc_type: item.docType || (item.isSps ? 'SPS' : 'PDS'),
      is_sps: Boolean(item.isSps),
      is_pds: Boolean(item.isPds),
      status: item.status || 'Menunggu Survei',
      approval_status: item.approvalStatus || 'Menunggu ACC',
      petugas: item.petugas || null,
      tempat_survey: item.tempatSurvey || item.lokasi || null,
      lokasi: item.lokasi || item.tempatSurvey || null,
      tgl_mulai: item.tglMulai || null,
      tgl_selesai: item.tglSelesai || null,
      sarana_transportasi: item.saranaTransportasi || null,
      kategori_perjalanan: item.kategoriPerjalanan || null,
      tarif_dasar: Number(item.tarifDasar) || 0,
      uang_harian: Number(item.uangHarian) || 0,
      biaya_tiket: Number(item.biayaTiket) || 0,
      tiket_hotel: Number(item.tiketHotel) || 0,
      tiket_pesawat_taxi: Number(item.tiketPesawatTaxi) || 0,
      jumlah_estimasi: Number(item.jumlahEstimasi) || 0,
      batch_id: item.batchId || null,
      pds_id: item.pdsId || null,
      linked_sps_ids: item.linkedSpsIds || [],
      ships_detail: item.shipsDetail || [],
      ships_list: item.shipsList || [],
      foto_list: item.fotoList || [],
      raw_data: item,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('surat_tugas').upsert(payload, { onConflict: 'id' });
    if (error) console.warn('Supabase save surat_tugas error:', error.message);
  } catch (err) {
    console.warn('Supabase save surat_tugas exception:', err);
  }
};

export const deleteSuratTugasFromCloud = async (id) => {
  try {
    if (!supabase || !id) return;
    const { error } = await supabase.from('surat_tugas').delete().eq('id', String(id));
    if (error) console.warn('Supabase delete surat_tugas error:', error.message);
  } catch (err) {
    console.warn('Supabase delete surat_tugas exception:', err);
  }
};

// ==============================================================================
// 2. KWITANSI HONOR CLOUD SYNC
// ==============================================================================
export const fetchKwitansiFromCloud = async () => {
  try {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('kwitansi_honor')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return null;
    return (data || []).map(mapFromDb);
  } catch (err) {
    return null;
  }
};

export const saveKwitansiToCloud = async (item) => {
  try {
    if (!supabase || !item || !item.id) return;
    const payload = {
      id: String(item.id),
      surat_id: item.suratId || null,
      nomor_surat: item.nomorSurat || null,
      nama_kapal: item.namaKapal || null,
      penerima: item.penerima || null,
      lokasi: item.lokasi || null,
      tarif_dasar: Number(item.tarifDasar) || 0,
      biaya_tiket: Number(item.biayaTiket) || 0,
      tiket_hotel: Number(item.tiketHotel) || 0,
      tiket_pesawat_taxi: Number(item.tiketPesawatTaxi) || 0,
      kategori_transportasi: item.kategoriTransportasi || null,
      jumlah: Number(item.jumlah) || 0,
      status: item.status || 'Belum Dibayar',
      tgl_bayar: item.tglBayar || null,
      catatan: item.catatan || null,
      raw_data: item,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('kwitansi_honor').upsert(payload, { onConflict: 'id' });
    if (error) console.warn('Supabase save kwitansi error:', error.message);
  } catch (err) {
    console.warn('Supabase save kwitansi exception:', err);
  }
};

export const deleteKwitansiFromCloud = async (id) => {
  try {
    if (!supabase || !id) return;
    await supabase.from('kwitansi_honor').delete().eq('id', String(id));
  } catch (err) {
    console.warn('Supabase delete kwitansi error:', err);
  }
};

// ==============================================================================
// 3. LAPORAN SURVEI CLOUD SYNC
// ==============================================================================
export const fetchLaporanFromCloud = async () => {
  try {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('laporan_survei')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return null;
    return (data || []).map(mapFromDb);
  } catch (err) {
    return null;
  }
};

export const saveLaporanToCloud = async (item) => {
  try {
    if (!supabase || !item || !item.id) return;
    const payload = {
      id: String(item.id),
      surat_id: item.suratId || null,
      tgl_lapor: item.tglLapor || item.tanggal || null,
      tanggal: item.tanggal || item.tglLapor || null,
      nama_kapal: item.namaKapal || null,
      lokasi: item.lokasi || item.lokasiSurvey || null,
      lokasi_survey: item.lokasiSurvey || item.lokasi || null,
      nilai: Number(item.nilai) || 0,
      tarif_dasar: Number(item.tarifDasar) || 0,
      nama_survey: item.namaSurvey || null,
      no_agenda: item.noAgenda || null,
      no_cda: item.noCda || null,
      no_so: item.noSo || null,
      no_wbs: item.noWbs || null,
      petugas: item.petugas || null,
      is_cito: Boolean(item.isCito),
      hasil: item.hasil || null,
      status: item.status || 'Terkirim',
      raw_data: item,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('laporan_survei').upsert(payload, { onConflict: 'id' });
    if (error) console.warn('Supabase save laporan error:', error.message);
  } catch (err) {
    console.warn('Supabase save laporan exception:', err);
  }
};

export const deleteLaporanFromCloud = async (id) => {
  try {
    if (!supabase || !id) return;
    await supabase.from('laporan_survei').delete().eq('id', String(id));
  } catch (err) {
    console.warn('Supabase delete laporan error:', err);
  }
};

// ==============================================================================
// 4. TARIFFS CLOUD SYNC
// ==============================================================================
export const fetchTariffsFromCloud = async () => {
  try {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('tariffs')
      .select('*')
      .order('no', { ascending: true });

    if (error || !data || data.length === 0) return null;
    return data.map(mapFromDb);
  } catch (err) {
    return null;
  }
};

export const saveTariffToCloud = async (item) => {
  try {
    if (!supabase || !item || !item.id) return;
    const payload = {
      id: String(item.id),
      no: item.no || null,
      name: item.name || item.tujuan || '',
      tujuan: item.tujuan || item.name || '',
      rincian: item.rincian || '',
      rate: Number(item.rate) || 0,
      moda: item.moda || 'Darat',
      kategori: item.kategori || 'Dalam Kota',
      raw_data: item,
      updated_at: new Date().toISOString()
    };
    await supabase.from('tariffs').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('Supabase save tariff error:', err);
  }
};

export const deleteTariffFromCloud = async (id) => {
  try {
    if (!supabase || !id) return;
    await supabase.from('tariffs').delete().eq('id', String(id));
  } catch (err) {
    console.warn('Supabase delete tariff error:', err);
  }
};

// ==============================================================================
// 5. GRADE TARIFFS CLOUD SYNC
// ==============================================================================
export const fetchGradeTariffsFromCloud = async () => {
  try {
    if (!supabase) return null;
    const { data, error } = await supabase.from('grade_tariffs').select('*');
    if (error || !data || data.length === 0) return null;
    return data.map(mapFromDb);
  } catch (err) {
    return null;
  }
};

export const saveGradeTariffToCloud = async (item) => {
  try {
    if (!supabase || !item || !item.id) return;
    const payload = {
      id: String(item.id),
      grade: item.grade || '',
      uang_harian: Number(item.uangHarian) || 0,
      raw_data: item,
      updated_at: new Date().toISOString()
    };
    await supabase.from('grade_tariffs').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('Supabase save grade tariff error:', err);
  }
};

export const deleteGradeTariffFromCloud = async (id) => {
  try {
    if (!supabase || !id) return;
    await supabase.from('grade_tariffs').delete().eq('id', String(id));
  } catch (err) {
    console.warn('Supabase delete grade tariff error:', err);
  }
};

// ==============================================================================
// 6. ADMIN SETTINGS CLOUD SYNC
// ==============================================================================
export const fetchAdminSettingsFromCloud = async () => {
  try {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('id', 'default_settings')
      .single();

    if (error || !data) return null;
    return mapFromDb(data);
  } catch (err) {
    return null;
  }
};

export const saveAdminSettingsToCloud = async (settings) => {
  try {
    if (!supabase || !settings) return;
    const payload = {
      id: 'default_settings',
      kepala_cabang: settings.kepalaCabang || null,
      nup: settings.nup || null,
      pembuat_daftar: settings.pembuatDaftar || null,
      nup_pembuat_daftar: settings.nupPembuatDaftar || null,
      nama_cabang: settings.namaCabang || null,
      kacab_signature_url: settings.kacabSignatureUrl || null,
      tat_luar_kota: Number(settings.tatLuarKota) || null,
      raw_data: settings,
      updated_at: new Date().toISOString()
    };
    await supabase.from('admin_settings').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('Supabase save admin settings error:', err);
  }
};

// ==============================================================================
// 7. USERS CLOUD SYNC
// ==============================================================================
export const fetchUsersFromCloud = async () => {
  try {
    if (!supabase) return null;
    const { data, error } = await supabase.from('users').select('*');
    if (error || !data || data.length === 0) return null;
    return data.map(mapFromDb);
  } catch (err) {
    return null;
  }
};

export const saveUserToCloud = async (user) => {
  try {
    if (!supabase || !user || !user.id) return;
    const payload = {
      id: String(user.id),
      username: user.username,
      password: user.password,
      name: user.name,
      email: user.email || null,
      phone: user.phone || null,
      role: user.role || 'surveyor',
      grade: user.grade || 'GRADE 5 C',
      role_label: user.roleLabel || 'Surveyor',
      avatar_bg: user.avatarBg || '#10b981',
      signature_url: user.signatureUrl || null,
      description: user.description || null,
      raw_data: user,
      updated_at: new Date().toISOString()
    };
    await supabase.from('users').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('Supabase save user error:', err);
  }
};

export const deleteUserFromCloud = async (id) => {
  try {
    if (!supabase || !id) return;
    await supabase.from('users').delete().eq('id', String(id));
  } catch (err) {
    console.warn('Supabase delete user error:', err);
  }
};

// ==============================================================================
// 8. REALTIME SUBSCRIPTION
// ==============================================================================
export const subscribeToRealtimeChanges = (onDataChange) => {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('schema-db-changes')
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
      console.log('⚡ Realtime Cloud Update:', payload.table, payload.eventType);
      if (typeof onDataChange === 'function') {
        onDataChange(payload);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
