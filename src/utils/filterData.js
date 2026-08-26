export const filterDataByRole = (list = [], currentUser = null, role = null, fieldName = 'petugas') => {
  if (!role || role === 'admin' || role === 'developer' || role === 'keuangan') {
    return list; // Full visibility for Admin, Developer, and Keuangan
  }

  if ((role === 'surveyor' || role === 'kacab') && currentUser && currentUser.name) {
    const surveyorFullName = currentUser.name.toLowerCase();
    const surveyorFirstName = surveyorFullName.split(' ')[0].toLowerCase();

    return list.filter((item) => {
      const targetVal = (item[fieldName] || item.penerima || '').toLowerCase();
      return targetVal.includes(surveyorFullName) || targetVal.includes(surveyorFirstName);
    });
  }

  return list;
};
