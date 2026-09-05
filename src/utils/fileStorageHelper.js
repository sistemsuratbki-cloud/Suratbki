/**
 * Universal File Storage Helper — Sistem Surat Tugas BKI Pontianak
 * 
 * Provides unified, resilient file uploading across:
 * 1. Google Drive (via Google Apps Script Web App proxy if enabled)
 * 2. Base64 Local Data URL (fallback / offline)
 */

import { getGoogleDriveConfig, uploadToGoogleDrive } from './googleDriveService';

/**
 * Converts a file to base64 data URL
 */
export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a file with smart fallback hierarchy:
 * Google Drive (if enabled AND URL valid) -> Base64 Local Data
 */
export async function uploadUniversalFile({
  file,
  folderContext = {},
  category = 'Dokumen'
}) {
  if (!file) {
    throw new Error('Tidak ada file yang dipilih');
  }

  const gdriveConfig = getGoogleDriveConfig();

  // Google Drive hanya dicoba jika URL bukan URL default yang sudah expired
  const EXPIRED_URL = 'AKfycbxMYYfKw5rwpj_G1HoGh4lIXQxh6KI8mMZo7SEBWDQHTzoQbbGou1e8I58K3yer5xrSmg';
  const isExpiredUrl = !gdriveConfig?.webAppUrl || gdriveConfig.webAppUrl.includes(EXPIRED_URL);

  if (gdriveConfig?.enabled && gdriveConfig?.webAppUrl && !isExpiredUrl) {
    try {
      const driveResult = await uploadToGoogleDrive({
        file,
        folderContext: {
          ...folderContext,
          category: folderContext.category || category
        }
      });

      if (driveResult?.url || driveResult?.viewUrl) {
        return {
          success: true,
          url: driveResult.url || driveResult.viewUrl,
          name: driveResult.name || file.name,
          storageProvider: 'gdrive',
          downloadUrl: driveResult.downloadUrl,
          thumbnailUrl: driveResult.thumbnailUrl,
          viewUrl: driveResult.viewUrl
        };
      }
    } catch (driveErr) {
      console.warn('[Storage] Google Drive upload failed, falling back to local base64:', driveErr);
    }
  }

  // 2. Fallback Base64 Data URL (Local / Offline)
  const base64 = await readFileAsBase64(file);
  return {
    success: true,
    url: base64,
    name: file.name,
    storageProvider: 'base64'
  };
}
