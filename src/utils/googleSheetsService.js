/**
 * Google Sheets Database Service — Sistem Surat Tugas BKI Pontianak
 * 
 * Mengelola sinkronisasi data tabel ke Google Sheets melalui Google Apps Script Web App:
 * - surat_tugas (SPS & PDS)
 * - kwitansi_honor
 * - laporan_survei
 * - tariffs & grade_tariffs
 * - master_kapal
 * - admin_settings
 * - users
 * - visit_survei
 */

import { getGoogleDriveConfig } from './googleDriveService';

const DEFAULT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxMYYfKw5rwpj_G1HoGh4lIXQxh6KI8mMZo7SEBWDQHTzoQbbGou1e8I58K3yer5xrSmg/exec';

export function getGoogleWorkspaceUrl() {
  try {
    const driveCfg = getGoogleDriveConfig();
    return (driveCfg?.webAppUrl || DEFAULT_WEB_APP_URL).trim();
  } catch (e) {
    return DEFAULT_WEB_APP_URL;
  }
}

let cachedDataPromise = null;
let lastCacheTime = 0;

/**
 * Mengambil seluruh data tabel dari Google Sheets (dengan caching multi-request 8 detik)
 */
export async function fetchGoogleSheetAllData(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedDataPromise && (now - lastCacheTime < 8000)) {
    return cachedDataPromise;
  }

  const url = getGoogleWorkspaceUrl();
  if (!url) return null;

  lastCacheTime = now;
  cachedDataPromise = (async () => {
    try {
      const targetUrl = url + (url.includes('?') ? '&' : '?') + 'action=getAllData&_t=' + Date.now();
      const res = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow'
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      if (json && json.success && json.data) {
        if (json.spreadsheetUrl) {
          try { localStorage.setItem('st_gdrive_spreadsheet_url', json.spreadsheetUrl); } catch (e) {}
        }
        return json.data;
      }
      return null;
    } catch (err) {
      console.warn('[GoogleSheets] Fetch all data warning:', err.message);
      return null;
    }
  })();

  return cachedDataPromise;
}

/**
 * Menyimpan / memperbarui satu item ke tab Google Sheet tertentu
 */
export async function saveGoogleSheetItem(table, item) {
  const url = getGoogleWorkspaceUrl();
  if (!url || !table || !item) return false;

  // Invalidate cache
  lastCacheTime = 0;
  cachedDataPromise = null;

  try {
    const payload = {
      action: 'saveItem',
      table,
      data: item
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const json = await res.json();
    return json?.success || false;
  } catch (err) {
    console.warn(`[GoogleSheets] Save item to ${table} error:`, err.message);
    return false;
  }
}

/**
 * Menghapus satu item dari tab Google Sheet tertentu
 */
export async function deleteGoogleSheetItem(table, id) {
  const url = getGoogleWorkspaceUrl();
  if (!url || !table || !id) return false;

  // Invalidate cache
  lastCacheTime = 0;
  cachedDataPromise = null;

  try {
    const payload = {
      action: 'deleteItem',
      table,
      id: String(id)
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const json = await res.json();
    return json?.success || false;
  } catch (err) {
    console.warn(`[GoogleSheets] Delete item from ${table} error:`, err.message);
    return false;
  }
}

/**
 * Sinkronisasi seluruh database sekaligus ke Google Sheets (Initial Seed / Backup)
 */
export async function syncAllToGoogleSheet(fullData) {
  const url = getGoogleWorkspaceUrl();
  if (!url) throw new Error('URL Google Apps Script belum dikonfigurasi');

  // Invalidate cache
  lastCacheTime = 0;
  cachedDataPromise = null;

  const payload = {
    action: 'syncAll',
    data: fullData
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow'
  });

  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  const json = await res.json();
  if (json && json.spreadsheetUrl) {
    try { localStorage.setItem('st_gdrive_spreadsheet_url', json.spreadsheetUrl); } catch (e) {}
  }
  return json;
}

/**
 * Mengambil link URL Google Spreadsheet yang aktif
 */
export function getSavedSpreadsheetUrl() {
  try {
    return localStorage.getItem('st_gdrive_spreadsheet_url') || '';
  } catch (e) {
    return '';
  }
}
