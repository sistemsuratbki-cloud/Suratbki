export const filterDataByRole = (list = [], currentUser = null, role = null, fieldName = 'petugas') => {
  if (!role || role === 'admin' || role === 'kacab' || role === 'keuangan') {
    return list; // Full visibility for Admin, Kacab, and Keuangan
  }

  if (role === 'surveyor' && currentUser && currentUser.name) {
    const surveyorFullName = currentUser.name.toLowerCase();
    const surveyorFirstName = surveyorFullName.split(' ')[0].toLowerCase();

    return list.filter((item) => {
      const targetVal = (item[fieldName] || item.penerima || '').toLowerCase();
      return targetVal.includes(surveyorFullName) || targetVal.includes(surveyorFirstName);
    });
  }

  return list;
};
