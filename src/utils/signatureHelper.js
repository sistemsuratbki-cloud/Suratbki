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
 * Automatically trims white and transparent margins around a signature canvas
 * so the resulting image is tightly cropped around the actual ink strokes.
 */
function autoTrimCanvas(canvas) {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let hasInk = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        // Pixel is considered ink if alpha is sufficiently high and color is not pure/near white
        const isTransparent = a < 25;
        const isNearWhite = r > 240 && g > 240 && b > 240;

        if (!isTransparent && !isNearWhite) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          hasInk = true;
        }
      }
    }

    if (!hasInk || minX > maxX || minY > maxY) {
      return canvas;
    }

    // Add minimal safety padding (2%)
    const pad = Math.max(2, Math.round(Math.max(maxX - minX, maxY - minY) * 0.02));
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(width - cropX, (maxX - minX) + (pad * 2));
    const cropH = Math.min(height - cropY, (maxY - minY) + (pad * 2));

    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = cropW;
    trimmedCanvas.height = cropH;
    const trimmedCtx = trimmedCanvas.getContext('2d');
    trimmedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    return trimmedCanvas;
  } catch (e) {
    console.warn('Auto-trim canvas warning:', e);
    return canvas;
  }
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

          // First create canvas to draw original image
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = width;
          tempCanvas.height = height;
          const tempCtx = tempCanvas.getContext('2d');
          if (!tempCtx) {
            return resolve(e.target.result);
          }

          tempCtx.clearRect(0, 0, width, height);
          tempCtx.drawImage(img, 0, 0);

          // Auto-trim excess margins / whitespace around signature ink
          const trimmedCanvas = autoTrimCanvas(tempCanvas);
          const trimmedWidth = trimmedCanvas.width;
          const trimmedHeight = trimmedCanvas.height;

          // Calculate scaling ratio on trimmed signature
          const scale = Math.min(maxWidth / trimmedWidth, maxHeight / trimmedHeight, 1);
          const targetWidth = Math.round(trimmedWidth * scale);
          const targetHeight = Math.round(trimmedHeight * scale);

          const finalCanvas = document.createElement('canvas');
          finalCanvas.width = targetWidth;
          finalCanvas.height = targetHeight;

          const finalCtx = finalCanvas.getContext('2d');
          if (!finalCtx) {
            return resolve(e.target.result);
          }

          finalCtx.clearRect(0, 0, targetWidth, targetHeight);
          finalCtx.imageSmoothingEnabled = true;
          finalCtx.imageSmoothingQuality = 'high';
          finalCtx.drawImage(trimmedCanvas, 0, 0, targetWidth, targetHeight);

          // Determine export type
          const isJpg = file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');
          const outputType = isJpg ? 'image/jpeg' : 'image/png';
          const quality = isJpg ? 0.85 : undefined;

          const dataUrl = finalCanvas.toDataURL(outputType, quality);
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
