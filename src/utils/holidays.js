// Indonesian National Holidays and Weekend Utility for BKI Surat Tugas
export const INDONESIAN_HOLIDAYS = {
  // 2025
  '2025-01-01': 'Tahun Baru 2025 Masehi',
  '2025-01-27': 'Isra Mikraj Nabi Muhammad SAW',
  '2025-01-29': 'Tahun Baru Imlek 2576 Kongzili',
  '2025-03-29': 'Hari Suci Nyepi (Tahun Baru Saka 1947)',
  '2025-03-31': 'Hari Raya Idul Fitri 1446 H',
  '2025-04-01': 'Hari Raya Idul Fitri 1446 H',
  '2025-04-18': 'Wafat Yesus Kristus',
  '2025-04-20': 'Kebangkitan Yesus Kristus (Paskah)',
  '2025-05-01': 'Hari Buruh Internasional',
  '2025-05-12': 'Hari Raya Waisak 2569 BE',
  '2025-05-29': 'Kenaikan Yesus Kristus',
  '2025-06-01': 'Hari Lahir Pancasila',
  '2025-06-06': 'Hari Raya Idul Adha 1446 H',
  '2025-06-27': 'Tahun Baru Islam 1447 H',
  '2025-08-17': 'Proklamasi Kemerdekaan RI',
  '2025-09-05': 'Maulid Nabi Muhammad SAW',
  '2025-12-25': 'Kelahiran Yesus Kristus (Natal)',

  // 2026
  '2026-01-01': 'Tahun Baru 2026 Masehi',
  '2026-01-16': 'Isra Mikraj Nabi Muhammad SAW',
  '2026-02-17': 'Tahun Baru Imlek 2577 Kongzili',
  '2026-03-19': 'Hari Suci Nyepi (Tahun Baru Saka 1948)',
  '2026-03-20': 'Hari Raya Idul Fitri 1447 H',
  '2026-03-21': 'Hari Raya Idul Fitri 1447 H',
  '2026-04-03': 'Wafat Yesus Kristus',
  '2026-04-05': 'Kebangkitan Yesus Kristus (Paskah)',
  '2026-05-01': 'Hari Buruh Internasional',
  '2026-05-14': 'Kenaikan Yesus Kristus',
  '2026-05-27': 'Hari Raya Idul Adha 1447 H',
  '2026-05-31': 'Hari Raya Waisak 2570 BE',
  '2026-06-01': 'Hari Lahir Pancasila',
  '2026-06-16': 'Tahun Baru Islam 1448 H',
  '2026-08-17': 'Proklamasi Kemerdekaan RI ke-81',
  '2026-08-25': 'Maulid Nabi Muhammad SAW',
  '2026-12-25': 'Kelahiran Yesus Kristus (Natal)',

  // 2027
  '2027-01-01': 'Tahun Baru 2027 Masehi',
  '2027-05-01': 'Hari Buruh Internasional',
  '2027-06-01': 'Hari Lahir Pancasila',
  '2027-08-17': 'Proklamasi Kemerdekaan RI ke-82',
  '2027-12-25': 'Hari Raya Natal'
};

/**
 * Cek apakah sebuah tanggal tertentu adalah hari libur nasional atau akhir pekan (Sabtu/Minggu)
 * @param {string|Date} dateInput YYYY-MM-DD atau Date object
 * @returns {{ isHoliday: boolean, isWeekend: boolean, isHolidayOrWeekend: boolean, holidayName: string | null, dayName: string }}
 */
export const checkHolidayOrWeekend = (dateInput) => {
  if (!dateInput) {
    return { isHoliday: false, isWeekend: false, isHolidayOrWeekend: false, holidayName: null, dayName: '' };
  }

  let dObj;
  let dateStr = '';

  if (typeof dateInput === 'string') {
    dateStr = dateInput.split('T')[0];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      dObj = new Date(dateInput);
    }
  } else {
    dObj = new Date(dateInput);
    const y = dObj.getFullYear();
    const m = String(dObj.getMonth() + 1).padStart(2, '0');
    const d = String(dObj.getDate()).padStart(2, '0');
    dateStr = `${y}-${m}-${d}`;
  }

  if (isNaN(dObj.getTime())) {
    return { isHoliday: false, isWeekend: false, isHolidayOrWeekend: false, holidayName: null, dayName: '' };
  }

  const dayOfWeek = dObj.getDay(); // 0 = Minggu, 6 = Sabtu
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dayName = dayNames[dayOfWeek];

  const holidayName = INDONESIAN_HOLIDAYS[dateStr] || null;
  const isHoliday = Boolean(holidayName);

  return {
    isHoliday,
    isWeekend,
    isHolidayOrWeekend: isHoliday || isWeekend,
    holidayName,
    dayName
  };
};

/**
 * Hitung jumlah hari libur (Sabtu, Minggu, dan Libur Nasional) dalam rentang tanggal
 * @param {string} startDateStr YYYY-MM-DD
 * @param {string} endDateStr YYYY-MM-DD
 * @returns {{ count: number, details: Array<{ date: string, dayName: string, reason: string }> }}
 */
export const countHolidaysAndWeekendsInRange = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) {
    return { count: 0, details: [] };
  }

  const startParts = startDateStr.split('T')[0].split('-');
  const endParts = endDateStr.split('T')[0].split('-');

  if (startParts.length !== 3 || endParts.length !== 3) {
    return { count: 0, details: [] };
  }

  const start = new Date(parseInt(startParts[0], 10), parseInt(startParts[1], 10) - 1, parseInt(startParts[2], 10));
  const end = new Date(parseInt(endParts[0], 10), parseInt(endParts[1], 10) - 1, parseInt(endParts[2], 10));

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return { count: 0, details: [] };
  }

  let count = 0;
  const details = [];
  const cur = new Date(start);

  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    const curDateStr = `${y}-${m}-${d}`;

    const info = checkHolidayOrWeekend(curDateStr);
    if (info.isHolidayOrWeekend) {
      count++;
      let reason = '';
      if (info.isHoliday && info.isWeekend) {
        reason = `${info.dayName} (Akhir Pekan) & ${info.holidayName}`;
      } else if (info.isHoliday) {
        reason = `Hari Libur Nasional (${info.holidayName})`;
      } else {
        reason = `Akhir Pekan (${info.dayName})`;
      }

      details.push({
        date: curDateStr,
        dayName: info.dayName,
        reason
      });
    }

    cur.setDate(cur.getDate() + 1);
  }

  return { count, details };
};
