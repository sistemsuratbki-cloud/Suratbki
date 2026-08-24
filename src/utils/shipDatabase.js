/**
 * shipDatabase.js
 * Utility to extract, aggregate and search ship database from system state
 */

export const DEFAULT_MASTER_SHIPS = [];

/**
 * Extract unique list of all ships from suratTugas, laporanSurvei, and defaults
 */
export const extractShipDatabase = (suratTugas = [], laporanSurvei = []) => {
  const shipMap = new Map();

  // 1. Initial Defaults
  DEFAULT_MASTER_SHIPS.forEach(ship => {
    shipMap.set(ship.namaKapal.toUpperCase(), { ...ship });
  });

  // 2. Historical & Active Surat Tugas / SPS (higher priority for newest data)
  (suratTugas || []).forEach(st => {
    // Check if shipsDetail exists
    if (Array.isArray(st.shipsDetail) && st.shipsDetail.length > 0) {
      st.shipsDetail.forEach(sh => {
        const name = (sh.namaKapal || '').trim().toUpperCase();
        if (name) {
          const prev = shipMap.get(name) || {};
          shipMap.set(name, {
            namaKapal: name,
            noAgenda: sh.noAgenda || prev.noAgenda || '',
            lokasi: st.lokasi || st.tempatSurvey || prev.lokasi || 'WAJOK',
            noOrder: sh.noOrder || st.noOrder || prev.noOrder || '',
            jenisSurvey: st.jenisSurvey || prev.jenisSurvey || '',
            petugas: st.petugas || prev.petugas || '',
            spsId: sh.spsId || (st.docType === 'SPS' || st.isSps ? st.id : null)
          });
        }
      });
    }

    // Direct namaKapal
    if (st.namaKapal) {
      const names = String(st.namaKapal).split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      names.forEach(name => {
        const prev = shipMap.get(name) || {};
        shipMap.set(name, {
          namaKapal: name,
          noAgenda: st.noAgenda || st.agenda || prev.noAgenda || '',
          lokasi: st.lokasi || st.tempatSurvey || prev.lokasi || 'WAJOK',
          noOrder: st.noOrder || prev.noOrder || '',
          jenisSurvey: st.jenisSurvey || prev.jenisSurvey || '',
          petugas: st.petugas || prev.petugas || '',
          spsId: st.docType === 'SPS' || st.isSps ? st.id : null
        });
      });
    }
  });

  // 3. Historical Laporan Survei
  (laporanSurvei || []).forEach(lap => {
    if (lap.namaKapal) {
      const names = String(lap.namaKapal).split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      names.forEach(name => {
        const prev = shipMap.get(name) || {};
        shipMap.set(name, {
          namaKapal: name,
          noAgenda: lap.noAgenda || prev.noAgenda || '',
          lokasi: lap.lokasi || lap.lokasiSurvey || prev.lokasi || 'WAJOK',
          noOrder: lap.noOrder || prev.noOrder || '',
          jenisSurvey: lap.namaSurvey || prev.jenisSurvey || '',
          petugas: lap.petugas || prev.petugas || '',
          spsId: prev.spsId || null
        });
      });
    }
  });

  return Array.from(shipMap.values());
};
