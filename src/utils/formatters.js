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
    month: 'short',
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

export const isEditWindowExpired = (dateString, maxDays = 2) => {
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
