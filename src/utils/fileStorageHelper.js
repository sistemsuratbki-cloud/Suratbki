/**
 * Universal File Storage Helper — Sistem Surat Tugas BKI Pontianak
 * 
 * Provides unified, resilient file uploading across:
 * 1. Google Drive (via Google Apps Script Web App proxy if enabled)
 * 2. Supabase Storage (buckets: 'lampiran', 'surat-tugas', 'attachments')
 * 3. Base64 Local Data URL (fallback)
 */

import { supabase } from '../lib/supabase';
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
 * Google Drive (if enabled) -> Supabase Storage -> Base64
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

  // 1. Prioritaskan Google Drive jika aktif
  if (gdriveConfig?.enabled && gdriveConfig?.webAppUrl) {
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
      console.warn('[Storage] Google Drive upload failed, falling back to Supabase Storage:', driveErr);
    }
  }

  // 2. Unggah ke Supabase Storage
  if (supabase) {
    const fileExt = file.name.split('.').pop() || 'bin';
    const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `uploads/${new Date().getFullYear()}/${cleanFileName}`;
    const mimeType = file.type || (fileExt.toLowerCase() === 'pdf' ? 'application/pdf' : 'image/jpeg');

    const bucketsToTry = ['lampiran', 'surat-tugas', 'attachments'];
    for (const bucketName of bucketsToTry) {
      try {
        const fileBuffer = await file.arrayBuffer();
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from(bucketName)
          .upload(filePath, fileBuffer, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: true
          });

        if (!uploadErr && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);

          if (publicUrlData?.publicUrl) {
            return {
              success: true,
              url: publicUrlData.publicUrl,
              name: file.name,
              storageProvider: 'supabase',
              bucket: bucketName,
              path: filePath
            };
          }
        }
      } catch (bucketErr) {
        console.warn(`[Storage] Bucket ${bucketName} upload attempt error:`, bucketErr);
      }
    }
  }

  // 3. Fallback Base64 Data URL
  const base64 = await readFileAsBase64(file);
  return {
    success: true,
    url: base64,
    name: file.name,
    storageProvider: 'base64'
  };
}
