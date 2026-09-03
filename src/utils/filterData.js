/**
 * Cari objek user surveyor dari usersList dengan toleransi nama lengkap/panggilan/username.
 */
export const findSurveyorUser = (usersList = [], name = '') => {
  if (!Array.isArray(usersList) || !name) return null;
  const searchName = String(name).trim().toLowerCase();
  if (!searchName || searchName === 'semua' || searchName === '-') return null;

  // 1. Exact name match (case-insensitive)
  let found = usersList.find((u) => (u.name || '').trim().toLowerCase() === searchName);
  if (found) return found;

  // 2. Substring match (e.g. "septian aji dewangkara" contains "septian aji" or vice-versa)
  found = usersList.find((u) => {
    const uName = (u.name || '').trim().toLowerCase();
    return uName && (uName.includes(searchName) || searchName.includes(uName));
  });
  if (found) return found;

  // 3. Exact username match
  found = usersList.find((u) => (u.username || '').trim().toLowerCase() === searchName);
  if (found) return found;

  // 4. Known key matching for BKI Pontianak surveyors & staff
  if (searchName.includes('septian')) {
    found = usersList.find((u) => (u.name || '').toLowerCase().includes('septian') || u.username === 'septian');
    if (found) return found;
  }
  if (searchName.includes('bone') || searchName.includes('alfian')) {
    found = usersList.find((u) => (u.name || '').toLowerCase().includes('bone') || (u.name || '').toLowerCase().includes('alfian') || u.username === 'bone');
    if (found) return found;
  }
  if (searchName.includes('sandi')) {
    found = usersList.find((u) => (u.name || '').toLowerCase().includes('sandi') || u.username === 'sandi');
    if (found) return found;
  }
  if (searchName.includes('andre')) {
    found = usersList.find((u) => (u.name || '').toLowerCase().includes('andre') || u.username === 'andre');
    if (found) return found;
  }
  if (searchName.includes('muhson')) {
    found = usersList.find((u) => (u.name || '').toLowerCase().includes('muhson') || u.username === 'muhson');
    if (found) return found;
  }

  return null;
};

/**
 * Cek apakah dua nama surveyor merepresentasikan surveyor yang sama.
 * Mendukung variasi seperti:
 * - "SEPTIAN AJI" <=> "SEPTIAN AJI DEWANGKARA"
 * - "ALFIAN BONE" <=> "ALFIAN BONE PUTRA"
 * - "SANDI" <=> "SANDI NANDARIANTO"
 * - "ANDRE" <=> "ANDRE WIJAYA"
 */
export const isSameSurveyor = (nameA, nameB, usersList = []) => {
  if (!nameA || !nameB) return false;
  if (nameA === 'Semua' || nameB === 'Semua' || !nameB) return true;

  const a = String(nameA).trim().toLowerCase();
  const b = String(nameB).trim().toLowerCase();
  if (a === b) return true;

  // Bersihkan prefiks/gelar umum jika ada
  const cleanA = a.replace(/^(surveyor|bpk\.?|bapak)\s+/i, '').replace(/,\s*s\.?t\.?/i, '').trim();
  const cleanB = b.replace(/^(surveyor|bpk\.?|bapak)\s+/i, '').replace(/,\s*s\.?t\.?/i, '').trim();
  if (cleanA === cleanB) return true;

  // Substring containment (misal: "septian aji dewangkara" mengandung "septian aji")
  if (cleanA.length >= 3 && cleanB.length >= 3) {
    if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;
  }

  // Cek kata kunci surveyor BKI Pontianak
  const getSurveyorKey = (val) => {
    if (val.includes('septian')) return 'septian';
    if (val.includes('bone') || val.includes('alfian')) return 'bone';
    if (val.includes('sandi')) return 'sandi';
    if (val.includes('andre')) return 'andre';
    if (val.includes('muhson')) return 'muhson';
    return null;
  };

  const keyA = getSurveyorKey(cleanA);
  const keyB = getSurveyorKey(cleanB);
  if (keyA && keyB && keyA === keyB) return true;

  // Cek pencocokan ID user melalui usersList jika tersedia
  if (Array.isArray(usersList) && usersList.length > 0) {
    const uA = findSurveyorUser(usersList, cleanA);
    const uB = findSurveyorUser(usersList, cleanB);
    if (uA && uB && uA.id === uB.id) return true;
  }

  // Token word matching jika minimal 2 kata signifikan sama
  const wordsA = cleanA.split(/\s+/).filter((w) => w.length >= 3);
  const wordsB = cleanB.split(/\s+/).filter((w) => w.length >= 3);
  const common = wordsA.filter((w) => wordsB.includes(w));
  if (common.length >= 2) return true;

  return false;
};

export const isItemBelongsToUser = (item, currentUser, role, fieldName = 'petugas') => {
  if (!item) return false;
  // Roles with global full access everywhere
  if (!role || role === 'admin' || role === 'developer' || role === 'keuangan' || role === 'finance' || role === 'monitor') {
    return true;
  }

  // Both surveyor and kacab/kacap see their own personal tasks/documents
  if ((role === 'surveyor' || role === 'kacab' || role === 'kacap') && currentUser) {
    const fullName = (currentUser.name || '').trim().toLowerCase();
    const username = (currentUser.username || '').trim().toLowerCase();
    const firstName = fullName ? fullName.split(' ')[0].trim() : '';

    const candidates = [
      item[fieldName],
      item.petugas,
      item.namaPetugas,
      item.penerima,
      item.nama,
      item.surveyor,
      item.surveyorPelaksana,
      item.assignedTo,
      item.createdBy,
      item.user,
      item.username
    ].filter(Boolean).map(v => String(v).trim().toLowerCase());

    // Also inspect shipsDetail if item has multiple ships
    if (Array.isArray(item.shipsDetail)) {
      item.shipsDetail.forEach(sh => {
        if (sh.petugas) candidates.push(String(sh.petugas).trim().toLowerCase());
        if (sh.surveyor) candidates.push(String(sh.surveyor).trim().toLowerCase());
        if (sh.namaPetugas) candidates.push(String(sh.namaPetugas).trim().toLowerCase());
      });
    }

    return candidates.some(val => {
      if (!val) return false;
      if (fullName && isSameSurveyor(val, fullName)) return true;
      if (fullName && (val === fullName || val.includes(fullName) || fullName.includes(val))) return true;
      if (username && (val === username || val.includes(username))) return true;
      if (firstName && firstName.length >= 3 && (val === firstName || val.includes(firstName))) return true;
      return false;
    });
  }

  return true;
};

export const filterDataByRole = (list = [], currentUser = null, role = null, fieldName = 'petugas') => {
  if (!Array.isArray(list)) return [];
  if (!role || role === 'admin' || role === 'developer' || role === 'keuangan' || role === 'finance' || role === 'monitor') {
    return list; // Full visibility for Admin, Developer, Keuangan, and Monitor
  }

  if (role === 'surveyor' || role === 'kacab' || role === 'kacap') {
    return list.filter((item) => isItemBelongsToUser(item, currentUser, role, fieldName));
  }

  return list;
};


