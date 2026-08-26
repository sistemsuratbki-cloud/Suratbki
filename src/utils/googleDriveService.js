/**
 * Google Drive Service Utility — Sistem Surat Tugas BKI Pontianak
 * 
 * Handles:
 * - Direct upload to Google Drive via Google Apps Script (GAS) Web App proxy
 * - Automatic folder structuring (Root / Year / Month / SP-Ship / Category)
 * - Connection testing / health check
 * - Storage configuration management (LocalStorage & Supabase sync)
 */

import { toast } from 'react-hot-toast';

const STORAGE_KEY_GDRIVE_CONFIG = 'st_gdrive_config';

/**
 * Retrieves the current Google Drive configuration
 */
export function getGoogleDriveConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_GDRIVE_CONFIG);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Error reading gdrive config:', e);
  }

  return {
    enabled: false,
    webAppUrl: '',
    rootFolder: 'BKI_DOKUMEN_SURAT',
    autoMigrate: false
  };
}

/**
 * Saves Google Drive configuration to local storage
 */
export function saveGoogleDriveConfig(config) {
  try {
    const merged = { ...getGoogleDriveConfig(), ...config };
    localStorage.setItem(STORAGE_KEY_GDRIVE_CONFIG, JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.error('Error saving gdrive config:', e);
    return null;
  }
}

/**
 * Converts a File object into a Base64 string
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file untuk upload Google Drive'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Format file tidak didukung'));
      }
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Tests connection to the Google Apps Script Web App
 */
export function testGoogleDriveConnection(webAppUrl) {
  return new Promise(async (resolve, reject) => {
    let url = (webAppUrl || getGoogleDriveConfig().webAppUrl || '').trim();
    url = url.replace(/[\r\n\t]/g, '').trim();

    if (!url) {
      return reject(new Error('URL Google Apps Script Web App belum diisi'));
    }

    if (!url.startsWith('https://script.google.com/')) {
      return reject(new Error('URL harus berawalan "https://script.google.com/macros/s/..."'));
    }

    if (url.includes('/edit')) {
      return reject(new Error('URL yang dimasukkan adalah URL Editor script, bukan Web App. Di Google Apps Script, klik Deploy > New Deployment > Pilih jenis "Web App" > Set Who has access: "Anyone" > Copy Web App URL.'));
    }

    if (url.endsWith('/dev') || url.includes('/dev?')) {
      return reject(new Error('URL berakhiran "/dev" adalah mode test developer dan terkunci login. Gunakan Web App URL berakhiran "/exec" dari menu Deploy > New deployment dengan akses "Anyone".'));
    }

    const startTime = Date.now();

    // Strategy 1: GET Ping Test (Most compatible with Google Apps Script CORS)
    try {
      const getUrl = url + (url.includes('?') ? '&' : '?') + 'action=ping&t=' + Date.now();
      const getRes = await fetch(getUrl, {
        method: 'GET',
        redirect: 'follow'
      });

      const getText = await getRes.text();
      let getData;
      try {
        getData = JSON.parse(getText);
      } catch (e) {}

      if (getData && getData.success) {
        const latencyMs = Date.now() - startTime;
        return resolve({
          success: true,
          message: getData.message || 'Koneksi ke Google Drive aktif!',
          latencyMs,
          userEmail: getData.userEmail || 'Akun Google'
        });
      }
    } catch (getErr) {
      console.warn('GET ping strategy fallback:', getErr);
    }

    // Strategy 2: POST Ping Test with text/plain
    try {
      const postRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({ action: 'ping' }),
        redirect: 'follow'
      });

      const text = await postRes.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        if (text.includes('accounts.google.com') || text.includes('ServiceLogin') || text.includes('<!DOCTYPE html>')) {
          return reject(new Error('Akses Google Drive ditolak (memerlukan login). Buka script.google.com > Deploy > Manage Deployments > Edit > Ubah "Who has access" menjadi "Anyone" (Siapa saja) > Klik Deploy.'));
        }
        return reject(new Error(`Respon Google Apps Script bukan JSON: ${text.substring(0, 120)}`));
      }

      const latencyMs = Date.now() - startTime;

      if (data && data.success) {
        return resolve({
          success: true,
          message: data.message || 'Koneksi ke Google Drive aktif!',
          latencyMs,
          userEmail: data.userEmail || 'Akun Google'
        });
      } else {
        return reject(new Error(data?.message || 'Respon Google Drive tidak sesuai format'));
      }
    } catch (err) {
      console.error('Google Drive ping failed:', err);
      if (err.message && err.message.includes('Failed to fetch')) {
        return reject(new Error('Akses Google Apps Script terblokir (Failed to fetch). Pastikan saat Deploy di Google Apps Script:\n1. Execute as: "Me" (Saya)\n2. Who has access: "Anyone" (Siapa saja)\n3. Gunakan URL berakhiran "/exec"'));
      }
      reject(new Error(`Gagal terhubung ke Google Drive: ${err.message || 'Periksa koneksi internet atau izin Web App'}`));
    }
  });
}

/**
 * Uploads a file directly to Google Drive via Google Apps Script Web App
 */
export async function uploadToGoogleDrive({
  file,
  fileName = '',
  folderContext = {},
  webAppUrl = ''
}) {
  if (!file) {
    throw new Error('Tidak ada berkas yang dipilih');
  }

  const config = getGoogleDriveConfig();
  const targetUrl = (webAppUrl || config.webAppUrl || '').trim();

  if (!targetUrl) {
    throw new Error('Google Drive Web App URL belum dikonfigurasi di menu Pengaturan');
  }

  const base64Data = await fileToBase64(file);
  const now = new Date();
  
  const defaultYear = now.getFullYear().toString();
  const monthNames = ['01-Januari', '02-Februari', '03-Maret', '04-April', '05-Mei', '06-Juni', '07-Juli', '08-Agustus', '09-September', '10-Oktober', '11-November', '12-Desember'];
  const defaultMonth = monthNames[now.getMonth()];

  const payload = {
    action: 'uploadFile',
    rootFolder: folderContext.rootFolder || config.rootFolder || 'BKI_DOKUMEN_SURAT',
    year: folderContext.year || defaultYear,
    month: folderContext.month || defaultMonth,
    subFolder: folderContext.subFolder || folderContext.agenda || folderContext.namaKapal || 'UMUM',
    category: folderContext.category || folderContext.title || 'Dokumen_Lampiran',
    fileName: fileName || file.name,
    mimeType: file.type || 'application/octet-stream',
    base64Data
  };

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload),
    redirect: 'follow'
  });

  const text = await response.text();
  let resJson;
  try {
    resJson = JSON.parse(text);
  } catch (parseErr) {
    if (text.includes('accounts.google.com') || text.includes('ServiceLogin') || text.includes('<!DOCTYPE html>')) {
      throw new Error('Google Drive Web App memerlukan akses publik. Pastikan pengaturan "Who has access" diset ke "Anyone".');
    }
    throw new Error(`Respon Google Drive tidak valid: ${text.substring(0, 120)}`);
  }

  if (!resJson || !resJson.success) {
    throw new Error(resJson?.message || 'Gagal mengunggah berkas ke Google Drive');
  }

  return {
    id: resJson.fileId,
    name: resJson.fileName || file.name,
    url: resJson.viewUrl || resJson.url,
    viewUrl: resJson.viewUrl,
    downloadUrl: resJson.downloadUrl,
    directUrl: resJson.directUrl,
    thumbnailUrl: resJson.thumbnailUrl || `https://lh3.googleusercontent.com/d/${resJson.fileId}=s800`,
    folderUrl: resJson.folderUrl,
    size: resJson.size || file.size,
    mimeType: resJson.mimeType || file.type,
    storageProvider: 'gdrive',
    uploadedAt: resJson.uploadedAt || new Date().toISOString()
  };
}

/**
 * Deletes a file or multiple files from Google Drive via Google Apps Script Web App
 */
export async function deleteFromGoogleDrive(fileIdOrUrl, silent = false) {
  const config = getGoogleDriveConfig();
  const targetUrl = (config.webAppUrl || '').trim();

  if (!targetUrl || !config.enabled) {
    return { success: false, message: 'Google Drive tidak aktif' };
  }

  if (!fileIdOrUrl) {
    return { success: false, message: 'Tidak ada file untuk dihapus' };
  }

  const rawStr = typeof fileIdOrUrl === 'object' ? JSON.stringify(fileIdOrUrl) : String(fileIdOrUrl);
  
  // Extract all Google Drive file IDs from the string
  const ids = new Set();
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{20,})/g,
    /\/d\/([a-zA-Z0-9_-]{20,})/g,
    /id=([a-zA-Z0-9_-]{20,})/g,
    /([a-zA-Z0-9_-]{28,})/g // standalone drive file ID (usually ~33 chars)
  ];

  for (const regex of patterns) {
    const matches = rawStr.matchAll(regex);
    for (const m of matches) {
      if (m[1] && m[1].length >= 20 && !m[1].startsWith('http') && !m[1].includes(' ')) {
        ids.add(m[1]);
      }
    }
  }

  if (ids.size === 0) {
    return { success: false, message: 'ID file Google Drive tidak ditemukan' };
  }

  const results = [];
  for (const fileId of ids) {
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'deleteFile', fileId }),
        redirect: 'follow'
      });

      const text = await response.text();
      let resJson;
      try {
        resJson = JSON.parse(text);
      } catch (e) {
        resJson = { success: false, message: text.substring(0, 120) };
      }

      if (resJson?.success) {
        if (!silent) toast.success(`File Google Drive (${resJson.fileName || 'Lampiran'}) dipindahkan ke Sampah`);
      } else {
        console.warn('Google Drive delete error response:', resJson);
      }
      results.push(resJson);
    } catch (err) {
      console.warn('Google Drive delete network error:', err);
      results.push({ success: false, message: err.message });
    }
  }

  return {
    success: results.some(r => r?.success),
    results
  };
}

/**
 * Checks if a given URL string points to Google Drive
 */
export function isGoogleDriveUrl(url) {
  if (!url) return false;
  const str = typeof url === 'object' ? JSON.stringify(url) : String(url);
  return str.includes('drive.google.com') || str.includes('googleusercontent.com/d/') || str.includes('google.com/macros');
}

/**
 * Extracts Google Drive file ID from a URL
 */
export function extractGDriveFileId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                url.match(/id=([a-zA-Z0-9_-]+)/) ||
                url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}
