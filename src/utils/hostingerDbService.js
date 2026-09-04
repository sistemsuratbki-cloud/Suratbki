/**
 * Hostinger MySQL Database Service — Sistem Surat Tugas BKI Pontianak
 * 
 * Mengelola komunikasi dengan PHP REST API di Hostinger untuk sinkronisasi
 * data tabel ke MySQL Database:
 * - users, surat_tugas, kwitansi_honor, laporan_survei
 * - tariffs, grade_tariffs, master_kapal, admin_settings, visit_survei
 */

const STORAGE_KEY_HOSTINGER_CONFIG = 'st_hostinger_config';

/**
 * Mengambil konfigurasi Hostinger dari localStorage
 */
export function getHostingerConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_HOSTINGER_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        enabled: parsed.enabled ?? false,
        apiUrl: (parsed.apiUrl || '').trim(),
        lastSync: parsed.lastSync || null,
        lastSyncStatus: parsed.lastSyncStatus || null
      };
    }
  } catch (e) {
    console.warn('[Hostinger] Error reading config:', e);
  }

  return {
    enabled: false,
    apiUrl: '',
    lastSync: null,
    lastSyncStatus: null
  };
}

/**
 * Menyimpan konfigurasi Hostinger ke localStorage
 */
export function saveHostingerConfig(config) {
  try {
    const merged = { ...getHostingerConfig(), ...config };
    localStorage.setItem(STORAGE_KEY_HOSTINGER_CONFIG, JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.error('[Hostinger] Error saving config:', e);
    return null;
  }
}

/**
 * Mendapatkan URL API Hostinger yang aktif
 */
export function getHostingerApiUrl() {
  const config = getHostingerConfig();
  return (config.enabled && config.apiUrl) ? config.apiUrl : '';
}

/**
 * Test koneksi ke API Hostinger
 */
export async function testHostingerConnection(apiUrl) {
  const url = (apiUrl || getHostingerApiUrl() || '').trim();

  if (!url) {
    throw new Error('URL API Hostinger belum diisi');
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('URL harus diawali dengan http:// atau https://');
  }

  const startTime = Date.now();

  try {
    const targetUrl = url + (url.includes('?') ? '&' : '?') + 'action=ping&_t=' + Date.now();
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Respon API bukan JSON: ${text.substring(0, 120)}`);
    }

    const latencyMs = Date.now() - startTime;

    if (data && data.success) {
      return {
        success: true,
        message: data.message || 'Koneksi ke MySQL Hostinger aktif!',
        latencyMs,
        database: data.database || '',
        server: data.server || 'Hostinger MySQL'
      };
    } else {
      throw new Error(data?.message || 'Respon API tidak sesuai format');
    }
  } catch (err) {
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      throw new Error('Tidak dapat terhubung ke API Hostinger. Pastikan:\n1. URL API benar (contoh: https://domain.com/api/api.php)\n2. File api.php sudah di-upload ke Hostinger\n3. CORS sudah dikonfigurasi dengan benar');
    }
    throw err;
  }
}

/**
 * Mengambil seluruh data tabel dari MySQL Hostinger
 */
let cachedHostingerData = null;
let lastHostingerCacheTime = 0;

export async function fetchHostingerAllData(forceRefresh = false) {
  const url = getHostingerApiUrl();
  if (!url) return null;

  const now = Date.now();
  if (!forceRefresh && cachedHostingerData && (now - lastHostingerCacheTime < 8000)) {
    return cachedHostingerData;
  }

  lastHostingerCacheTime = now;

  try {
    const targetUrl = url + (url.includes('?') ? '&' : '?') + 'action=getAllData&_t=' + Date.now();
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();

    if (json && json.success && json.data) {
      cachedHostingerData = json.data;
      return json.data;
    }
    return null;
  } catch (err) {
    console.warn('[Hostinger] Fetch all data warning:', err.message);
    return null;
  }
}

/**
 * Menyimpan / memperbarui satu item ke tabel MySQL Hostinger
 */
export async function saveHostingerItem(table, item) {
  const url = getHostingerApiUrl();
  if (!url || !table || !item) return false;

  // Invalidate cache
  lastHostingerCacheTime = 0;
  cachedHostingerData = null;

  try {
    const payload = {
      action: 'saveItem',
      table,
      data: item
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    return json?.success || false;
  } catch (err) {
    console.warn(`[Hostinger] Save item to ${table} error:`, err.message);
    return false;
  }
}

/**
 * Menghapus satu item dari tabel MySQL Hostinger
 */
export async function deleteHostingerItem(table, id) {
  const url = getHostingerApiUrl();
  if (!url || !table || !id) return false;

  // Invalidate cache
  lastHostingerCacheTime = 0;
  cachedHostingerData = null;

  try {
    const payload = {
      action: 'deleteItem',
      table,
      id: String(id)
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    return json?.success || false;
  } catch (err) {
    console.warn(`[Hostinger] Delete item from ${table} error:`, err.message);
    return false;
  }
}

/**
 * Sinkronisasi seluruh database sekaligus ke MySQL Hostinger (Bulk Import)
 */
export async function syncAllToHostinger(fullData) {
  const url = getHostingerApiUrl();
  if (!url) throw new Error('URL API Hostinger belum dikonfigurasi');

  // Invalidate cache
  lastHostingerCacheTime = 0;
  cachedHostingerData = null;

  const payload = {
    action: 'syncAll',
    data: fullData
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  const json = await res.json();

  if (json && json.success) {
    // Update last sync timestamp
    saveHostingerConfig({
      lastSync: new Date().toISOString(),
      lastSyncStatus: 'success'
    });
  }

  return json;
}

/**
 * Mengambil statistik jumlah record per tabel
 */
export async function fetchHostingerStats() {
  const url = getHostingerApiUrl();
  if (!url) return null;

  try {
    const targetUrl = url + (url.includes('?') ? '&' : '?') + 'action=stats&_t=' + Date.now();
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const json = await res.json();
    return json?.success ? json : null;
  } catch (err) {
    console.warn('[Hostinger] Fetch stats error:', err.message);
    return null;
  }
}
