/**
 * Signature Helper Utilities — Sistem Surat Tugas BKI Pontianak
 * 
 * Provides:
 * - Image compression & conversion to compact Base64 Data URL (crisp, transparent, < 30KB)
 * - Validation for signature URLs
 * - Safe image error handling
 */

/**
 * Validates whether a signature URL is usable and not placeholder/broken
 */
export function isValidSignature(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '[DATA_URL_ATTACHMENT]' || trimmed === 'null' || trimmed === 'undefined') {
    return false;
  }
  return trimmed.startsWith('data:image/') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/');
}

/**
 * Converts a File (image/png, image/jpeg, etc.) into a lightweight, compressed Data URL.
 * Preserves alpha transparency for PNG and resizes to max 400x200 while maintaining aspect ratio.
 * 
 * @param {File} file - User uploaded image file
 * @param {number} maxWidth - Maximum width (default: 400px)
 * @param {number} maxHeight - Maximum height (default: 200px)
 * @returns {Promise<string>} Base64 Data URL
 */
export function fileToSignatureDataUrl(file, maxWidth = 400, maxHeight = 200) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('Tidak ada file yang dipilih'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format file gambar tidak valid'));
      img.onload = () => {
        try {
          let { width, height } = img;

          // Calculate scaling ratio
          const scale = Math.min(maxWidth / width, maxHeight / height, 1);
          const targetWidth = Math.round(width * scale);
          const targetHeight = Math.round(height * scale);

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback to raw data URL if canvas is not supported
            return resolve(e.target.result);
          }

          // Clear with transparency
          ctx.clearRect(0, 0, targetWidth, targetHeight);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw scaled image
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Determine export type
          const isJpg = file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');
          const outputType = isJpg ? 'image/jpeg' : 'image/png';
          const quality = isJpg ? 0.85 : undefined;

          const dataUrl = canvas.toDataURL(outputType, quality);
          resolve(dataUrl);
        } catch (err) {
          console.warn('Canvas processing fallback to raw FileReader result:', err);
          resolve(e.target.result);
        }
      };
      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}
