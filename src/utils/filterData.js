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

