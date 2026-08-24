export const cleanDocNumber = (val) => {
  if (!val || typeof val !== 'string') return val || '';
  return val
    .replace(/&#x2F;/gi, '/')
    .replace(/&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
};

export const extractAgendaNumber = (docNumber) => {
  if (!docNumber) return '-';
  const match = String(docNumber).match(/\b[A-Z]+\.(\d+)\b/i);
  if (match) return match[1];
  const trimmed = String(docNumber).trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  return docNumber;
};

export const formatRupiah = (number) => {
  if (number === undefined || number === null || isNaN(number)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(number);
};

export const formatDateIndo = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
};

export const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'Belum Mulai':
    case 'Belum Dibayar':
    case 'Draf':
      return 'badge-pending';
    case 'Berjalan':
    case 'Terkirim':
      return 'badge-running';
    case 'Selesai':
    case 'Sudah Dibayar':
    case 'Disetujui':
      return 'badge-completed';
    default:
      return 'badge-pending';
  }
};

export const isEditWindowExpired = (dateString, maxDays = 3) => {
  if (!dateString) return false;
  const reportDate = new Date(dateString);
  if (isNaN(reportDate.getTime())) return false;

  const now = new Date();
  const date1 = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate());
  const date2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = date2.getTime() - date1.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

  return diffDays > maxDays;
};

export const isDocumentLocked = (item, maxDays = 3) => {
  if (!item) return false;
  if (item.isUnlockedByAdmin) return false;
  if (item.isLockedManually) return true;

  const dateStr = item.tglLapor || item.createdAt || item.submittedAt || item.tglSelesai || item.tglMulai;
  return isEditWindowExpired(dateStr, maxDays);
};

export const terbilang = (angka) => {
  if (angka === 0) return 'nol';
  
  const huruf = [
    '', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'
  ];
  
  let result = '';
  
  if (angka < 12) {
    result = huruf[angka];
  } else if (angka < 20) {
    result = terbilang(angka - 10) + ' belas';
  } else if (angka < 100) {
    result = terbilang(Math.floor(angka / 10)) + ' puluh' + (angka % 10 > 0 ? ' ' + terbilang(angka % 10) : '');
  } else if (angka < 200) {
    result = 'seratus' + (angka - 100 > 0 ? ' ' + terbilang(angka - 100) : '');
  } else if (angka < 1000) {
    result = terbilang(Math.floor(angka / 100)) + ' ratus' + (angka % 100 > 0 ? ' ' + terbilang(angka % 100) : '');
  } else if (angka < 2000) {
    result = 'seribu' + (angka - 1000 > 0 ? ' ' + terbilang(angka - 1000) : '');
  } else if (angka < 1000000) {
    result = terbilang(Math.floor(angka / 1000)) + ' ribu' + (angka % 1000 > 0 ? ' ' + terbilang(angka % 1000) : '');
  } else if (angka < 1000000000) {
    result = terbilang(Math.floor(angka / 1000000)) + ' juta' + (angka % 1000000 > 0 ? ' ' + terbilang(angka % 1000000) : '');
  } else if (angka < 1000000000000) {
    result = terbilang(Math.floor(angka / 1000000000)) + ' miliar' + (angka % 1000000000 > 0 ? ' ' + terbilang(angka % 1000000000) : '');
  } else if (angka < 1000000000000000) {
    result = terbilang(Math.floor(angka / 1000000000000)) + ' triliun' + (angka % 1000000000000 > 0 ? ' ' + terbilang(angka % 1000000000000) : '');
  }
  
  return result.trim();
};

export const parseAttachmentFiles = (fileDataOrName, fallbackName = 'Lampiran') => {
  if (!fileDataOrName) return [];
  if (Array.isArray(fileDataOrName)) {
    return fileDataOrName.filter(Boolean).map((f, idx) => {
      if (typeof f === 'string') {
        const cleanStr = f.split('?')[0];
        const decoded = decodeURIComponent(cleanStr.split('/').pop() || `${fallbackName}_${idx + 1}`);
        return { name: decoded, url: f, data: f };
      }
      return {
        name: f.name || `${fallbackName}_${idx + 1}`,
        url: f.url || f.data || '',
        data: f.data || f.url || ''
      };
    });
  }
  if (typeof fileDataOrName === 'string') {
    const trimmed = fileDataOrName.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter(Boolean).map((f, idx) => {
            if (typeof f === 'string') {
              const cleanStr = f.split('?')[0];
              const decoded = decodeURIComponent(cleanStr.split('/').pop() || `${fallbackName}_${idx + 1}`);
              return { name: decoded, url: f, data: f };
            }
            return {
              name: f.name || `${fallbackName}_${idx + 1}`,
              url: f.url || f.data || '',
              data: f.data || f.url || ''
            };
          });
        }
      } catch (e) {
        // Fallback to string
      }
    }
    if (trimmed.includes('|||')) {
      const parts = trimmed.split('|||').map(p => p.trim()).filter(Boolean);
      return parts.map((part, idx) => ({
        name: `${fallbackName}_${idx + 1}`,
        url: part,
        data: part
      }));
    }
    const cleanStr = trimmed.split('?')[0];
    const decoded = decodeURIComponent(cleanStr.split('/').pop() || fallbackName);
    return [{ name: decoded, url: trimmed, data: trimmed }];
  }
  return [];
};

export const serializeAttachmentFiles = (files) => {
  if (!Array.isArray(files) || files.length === 0) return '';
  const cleanFiles = files.filter(f => f && (f.url || f.data || f.name));
  if (cleanFiles.length === 0) return '';
  if (cleanFiles.length === 1) {
    return cleanFiles[0].url || cleanFiles[0].data || cleanFiles[0].name || '';
  }
  return JSON.stringify(cleanFiles);
};

