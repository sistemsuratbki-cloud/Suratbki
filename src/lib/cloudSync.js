/**
 * Cloud Sync Service — Sistem Surat Tugas BKI Pontianak
 * 
 * Mengelola sinkronisasi data cloud secara DUAL SYNC:
 * 1. Google Sheets Database (via Google Apps Script Web App)
 * 2. MySQL Hostinger Database (via PHP REST API)
 * 3. Google Drive Attachment Storage
 * 
 * Prioritas Fetch: Hostinger MySQL (primary) → Google Sheets (secondary/fallback)
 * Prioritas Save/Delete: Kirim ke kedua backend secara paralel
 */

import {
  fetchGoogleSheetAllData,
  saveGoogleSheetItem,
  deleteGoogleSheetItem,
  syncAllToGoogleSheet
} from '../utils/googleSheetsService';
import {
  fetchHostingerAllData,
  saveHostingerItem,
  deleteHostingerItem,
  syncAllToHostinger,
  getHostingerConfig
} from '../utils/hostingerDbService';
import { uploadToGoogleDrive, deleteFromGoogleDrive } from '../utils/googleDriveService';

// ==============================================================================
// HELPERS
// ==============================================================================

const mapFromDb = (row) => {
  if (!row) return null;
  const raw = row.raw_data && typeof row.raw_data === 'object' ? row.raw_data : {};
  const merged = { ...raw, ...row };
  delete merged.raw_data;

  // Normalisasi field-field kunci
  if (row.tgl_mulai !== undefined && row.tgl_mulai !== null) merged.tglMulai = row.tgl_mulai;
  else if (raw.tglMulai !== undefined && raw.tglMulai !== null) merged.tglMulai = raw.tglMulai;

  if (row.tgl_selesai !== undefined && row.tgl_selesai !== null) merged.tglSelesai = row.tgl_selesai;
  else if (raw.tglSelesai !== undefined && raw.tglSelesai !== null) merged.tglSelesai = raw.tglSelesai;

  if (row.tgl_surat !== undefined && row.tgl_surat !== null) merged.tglSurat = row.tgl_surat;
  else if (raw.tglSurat !== undefined && raw.tglSurat !== null) merged.tglSurat = raw.tglSurat;

  if (row.nama_kapal !== undefined && row.nama_kapal !== null) merged.namaKapal = row.nama_kapal;
  else if (raw.namaKapal !== undefined && raw.namaKapal !== null) merged.namaKapal = raw.namaKapal;

  if (row.no_agenda !== undefined && row.no_agenda !== null) merged.noAgenda = row.no_agenda;
  else if (raw.noAgenda !== undefined && raw.noAgenda !== null) merged.noAgenda = raw.noAgenda;

  if (row.tempat_survey !== undefined && row.tempat_survey !== null) merged.tempatSurvey = row.tempat_survey;
  else if (raw.tempatSurvey !== undefined && raw.tempatSurvey !== null) merged.tempatSurvey = raw.tempatSurvey;

  if (row.jenis_survey !== undefined && row.jenis_survey !== null) merged.jenisSurvey = row.jenis_survey;
  else if (raw.jenisSurvey !== undefined && raw.jenisSurvey !== null) merged.jenisSurvey = raw.jenisSurvey;

  // Normalisasi status & approvalStatus
  const rawApproval = row.approval_status || raw.approvalStatus || merged.approvalStatus;
  if (rawApproval === 'ACC' || rawApproval === 'Sudah ACC' || rawApproval === 'Sudah di-ACC' || merged.status === 'Selesai') {
    merged.approvalStatus = 'ACC';
    merged.status = 'Selesai';
  } else if (rawApproval === 'Revisi' || rawApproval === 'Perlu Revisi') {
    merged.approvalStatus = 'Revisi';
  } else {
    merged.approvalStatus = rawApproval || 'Menunggu';
  }

  return merged;
};

/**
 * Cek apakah Hostinger aktif dan terkonfigurasi
 */
const isHostingerEnabled = () => {
  const config = getHostingerConfig();
  return config.enabled && !!config.apiUrl;
};

/**
 * Dual save: kirim ke Google Sheets dan Hostinger secara paralel.
 * Kegagalan salah satu tidak menghentikan yang lain.
 */
const dualSave = async (table, item) => {
  const promises = [
    saveGoogleSheetItem(table, item).catch(e => 
      console.warn(`[DualSync] GSheets save ${table} warning:`, e.message)
    )
  ];

  if (isHostingerEnabled()) {
    promises.push(
      saveHostingerItem(table, item).catch(e => 
        console.warn(`[DualSync] Hostinger save ${table} warning:`, e.message)
      )
    );
  }

  await Promise.allSettled(promises);
};

/**
 * Dual delete: hapus dari Google Sheets dan Hostinger secara paralel.
 */
const dualDelete = async (table, id) => {
  const promises = [
    deleteGoogleSheetItem(table, id).catch(e => 
      console.warn(`[DualSync] GSheets delete ${table} warning:`, e.message)
    )
  ];

  if (isHostingerEnabled()) {
    promises.push(
      deleteHostingerItem(table, id).catch(e => 
        console.warn(`[DualSync] Hostinger delete ${table} warning:`, e.message)
      )
    );
  }

  await Promise.allSettled(promises);
};

/**
 * Timeout wrapper untuk mencegah 408 timeout di LiteSpeed
 */
const withTimeout = (promise, timeoutMs = 5000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
};

/**
 * Dual fetch: ambil dari Hostinger (primary) lalu fallback ke Google Sheets.
 * Mengembalikan data dari sumber pertama yang berhasil.
 * OPTIMIZED: Added 5s timeout per source to prevent 408 errors
 */
const dualFetchTable = async (tableName) => {
  // 1. Coba dari Hostinger dulu (primary) - dengan timeout 5 detik
  if (isHostingerEnabled()) {
    try {
      const hData = await withTimeout(fetchHostingerAllData(), 5000);
      if (hData && Array.isArray(hData[tableName])) {
        return hData[tableName];
      }
      // Untuk admin_settings (object, bukan array)
      if (hData && tableName === 'admin_settings' && hData[tableName]) {
        return hData[tableName];
      }
    } catch (e) {
      console.warn(`[DualSync] Hostinger fetch ${tableName} fallback (timeout atau error):`, e.message);
    }
  }

  // 2. Fallback ke Google Sheets - dengan timeout 5 detik
  try {
    const gsData = await withTimeout(fetchGoogleSheetAllData(), 5000);
    if (gsData && tableName === 'admin_settings') {
      return gsData[tableName] || null;
    }
    if (gsData && Array.isArray(gsData[tableName])) {
      return gsData[tableName];
    }
  } catch (e) {
    console.warn(`[DualSync] GSheets fetch ${tableName} warning:`, e.message);
  }

  return null;
};

// ==============================================================================
// 1. SURAT TUGAS
// ==============================================================================

export async function fetchSuratTugasFromCloud() {
  try {
    const data = await dualFetchTable('surat_tugas');
    if (Array.isArray(data)) return data.map(mapFromDb);
  } catch (e) {
    console.warn('[CloudSync] fetchSuratTugas warning:', e.message);
  }
  return null;
}

export async function saveSuratTugasToCloud(item) {
  if (!item?.id) return;
  try {
    await dualSave('surat_tugas', item);
  } catch (err) {
    console.warn('[CloudSync] saveSuratTugas warning:', err.message);
  }
}

export async function deleteSuratTugasFromCloud(id) {
  if (!id) return;
  try {
    await dualDelete('surat_tugas', id);
  } catch (err) {
    console.warn('[CloudSync] deleteSuratTugas warning:', err.message);
  }
}

// ==============================================================================
// 2. KWITANSI HONOR
// ==============================================================================

export async function fetchKwitansiFromCloud() {
  try {
    const data = await dualFetchTable('kwitansi_honor');
    if (Array.isArray(data)) return data.map(mapFromDb);
  } catch (e) {
    console.warn('[CloudSync] fetchKwitansi warning:', e.message);
  }
  return null;
}

export async function saveKwitansiToCloud(item) {
  if (!item?.id) return;
  try {
    await dualSave('kwitansi_honor', item);
  } catch (err) {
    console.warn('[CloudSync] saveKwitansi warning:', err.message);
  }
}

export async function deleteKwitansiFromCloud(id) {
  if (!id) return;
  try {
    await dualDelete('kwitansi_honor', id);
  } catch (err) {
    console.warn('[CloudSync] deleteKwitansi warning:', err.message);
  }
}

// ==============================================================================
// 3. LAPORAN SURVEI
// ==============================================================================

export async function fetchLaporanFromCloud() {
  try {
    const data = await dualFetchTable('laporan_survei');
    if (Array.isArray(data)) return data.map(mapFromDb);
  } catch (e) {
    console.warn('[CloudSync] fetchLaporan warning:', e.message);
  }
  return null;
}

export async function saveLaporanToCloud(item) {
  if (!item?.id) return;
  try {
    await dualSave('laporan_survei', item);
  } catch (err) {
    console.warn('[CloudSync] saveLaporan warning:', err.message);
  }
}

export async function deleteLaporanFromCloud(id) {
  if (!id) return;
  try {
    await dualDelete('laporan_survei', id);
  } catch (err) {
    console.warn('[CloudSync] deleteLaporan warning:', err.message);
  }
}

// ==============================================================================
// 4. TARIFS & GRADE TARIFS
// ==============================================================================

export async function fetchTariffsFromCloud() {
  try {
    const data = await dualFetchTable('tariffs');
    if (Array.isArray(data)) return data.map(mapFromDb);
  } catch (e) {
    console.warn('[CloudSync] fetchTariffs warning:', e.message);
  }
  return null;
}

export async function saveTariffToCloud(item) {
  if (!item?.id) return;
  try {
    await dualSave('tariffs', item);
  } catch (err) {
    console.warn('[CloudSync] saveTariff warning:', err.message);
  }
}

export async function deleteTariffFromCloud(id) {
  if (!id) return;
  try {
    await dualDelete('tariffs', id);
  } catch (err) {
    console.warn('[CloudSync] deleteTariff warning:', err.message);
  }
}

export async function fetchGradeTariffsFromCloud() {
  try {
    const data = await dualFetchTable('grade_tariffs');
    if (Array.isArray(data)) return data.map(mapFromDb);
  } catch (e) {
    console.warn('[CloudSync] fetchGradeTariffs warning:', e.message);
  }
  return null;
}

export async function saveGradeTariffToCloud(item) {
  if (!item?.id) return;
  try {
    await dualSave('grade_tariffs', item);
  } catch (err) {
    console.warn('[CloudSync] saveGradeTariff warning:', err.message);
  }
}

export async function deleteGradeTariffFromCloud(id) {
  if (!id) return;
  try {
    await dualDelete('grade_tariffs', id);
  } catch (err) {
    console.warn('[CloudSync] deleteGradeTariff warning:', err.message);
  }
}

// ==============================================================================
// 5. ADMIN SETTINGS
// ==============================================================================

export async function fetchAdminSettingsFromCloud() {
  try {
    const data = await dualFetchTable('admin_settings');
    if (data && typeof data === 'object') return mapFromDb(data);
  } catch (e) {
    console.warn('[CloudSync] fetchAdminSettings warning:', e.message);
  }
  return null;
}

export async function saveAdminSettingsToCloud(settings) {
  if (!settings) return;
  try {
    await dualSave('admin_settings', { id: 'default', ...settings });
  } catch (err) {
    console.warn('[CloudSync] saveAdminSettings warning:', err.message);
  }
}

// ==============================================================================
// 6. MASTER KAPAL
// ==============================================================================

export async function fetchMasterKapalFromCloud() {
  try {
    const data = await dualFetchTable('master_kapal');
    if (Array.isArray(data)) return data.map(mapFromDb);
  } catch (e) {
    console.warn('[CloudSync] fetchMasterKapal warning:', e.message);
  }
  return null;
}

export async function saveMasterKapalToCloud(item) {
  if (!item?.id) return;
  try {
    await dualSave('master_kapal', item);
  } catch (err) {
    console.warn('[CloudSync] saveMasterKapal warning:', err.message);
  }
}

export async function deleteMasterKapalFromCloud(id) {
  if (!id) return;
  try {
    await dualDelete('master_kapal', id);
  } catch (err) {
    console.warn('[CloudSync] deleteMasterKapal warning:', err.message);
  }
}

// ==============================================================================
// 7. USERS
// ==============================================================================

export async function fetchUsersFromCloud() {
  try {
    const data = await dualFetchTable('users');
    if (Array.isArray(data)) return data.map(mapFromDb);
  } catch (e) {
    console.warn('[CloudSync] fetchUsers warning:', e.message);
  }
  return null;
}

export async function saveUserToCloud(item) {
  const id = item?.id || item?.username;
  if (!id) return;
  try {
    await dualSave('users', { id, ...item });
  } catch (err) {
    console.warn('[CloudSync] saveUser warning:', err.message);
  }
}

export async function deleteUserFromCloud(id) {
  if (!id) return;
  try {
    await dualDelete('users', id);
  } catch (err) {
    console.warn('[CloudSync] deleteUser warning:', err.message);
  }
}

// ==============================================================================
// 8. VISIT SURVEI
// ==============================================================================

export async function fetchVisitSurveiFromCloud() {
  try {
    const data = await dualFetchTable('visit_survei');
    if (Array.isArray(data)) return data.map(mapFromDb);
  } catch (e) {
    console.warn('[CloudSync] fetchVisitSurvei warning:', e.message);
  }
  return null;
}

export async function saveVisitSurveiToCloud(item) {
  if (!item?.id) return;
  try {
    await dualSave('visit_survei', item);
  } catch (err) {
    console.warn('[CloudSync] saveVisitSurvei warning:', err.message);
  }
}

export async function deleteVisitSurveiFromCloud(id) {
  if (!id) return;
  try {
    await dualDelete('visit_survei', id);
  } catch (err) {
    console.warn('[CloudSync] deleteVisitSurvei warning:', err.message);
  }
}

// ==============================================================================
// 9. CLEANUP & REALTIME POLLING
// ==============================================================================

export const clearOperationalDataFromCloud = async () => {
  const emptyData = {
    surat_tugas: [],
    kwitansi_honor: [],
    laporan_survei: [],
    visit_survei: []
  };

  const promises = [];
  if (isHostingerEnabled()) {
    promises.push(
      syncAllToHostinger(emptyData).catch(e =>
        console.warn('[CloudSync] Hostinger clear operational data warning:', e.message)
      )
    );
  }

  promises.push(
    syncAllToGoogleSheet(emptyData).catch(e =>
      console.warn('[CloudSync] GSheets clear operational data warning:', e.message)
    )
  );

  await Promise.allSettled(promises);
};

export const subscribeToRealtimeChanges = (callbacks = {}) => {
  const config = typeof callbacks === 'function' ? { onAny: callbacks } : (callbacks || {});

  const checkSync = async () => {
    try {
      let data = null;
      if (isHostingerEnabled()) {
        data = await fetchHostingerAllData(true);
      }
      if (!data) {
        data = await fetchGoogleSheetAllData(true);
      }

      if (data && typeof config.onAny === 'function') {
        config.onAny('all', 'REFRESH', data);
      }
    } catch (e) {}
  };

  // Polling berkala setiap 15 detik
  const intervalId = setInterval(checkSync, 15000);

  // Auto-sync saat aplikasi dibuka kembali / tab di-fokuskan
  const handleVisibility = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      checkSync();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', checkSync);
  }

  return () => {
    clearInterval(intervalId);
    if (typeof window !== 'undefined') {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', checkSync);
    }
  };
};

export async function syncPendingData() {
  return true;
}

export async function uploadAttachmentToCloud(file, folderContext) {
  return await uploadToGoogleDrive({ file, folderContext });
}

export async function deleteAttachmentFromCloud(fileIdOrUrl) {
  return await deleteFromGoogleDrive(fileIdOrUrl);
}
