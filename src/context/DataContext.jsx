import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_SURAT_TUGAS,
  INITIAL_KWITANSI_HONOR,
  INITIAL_LAPORAN_SURVEI
} from '../utils/initialData';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [suratTugas, setSuratTugas] = useState(() => {
    const saved = localStorage.getItem('st_surat_tugas');
    return saved ? JSON.parse(saved) : INITIAL_SURAT_TUGAS;
  });

  const [kwitansiHonor, setKwitansiHonor] = useState(() => {
    const saved = localStorage.getItem('st_kwitansi_honor');
    return saved ? JSON.parse(saved) : INITIAL_KWITANSI_HONOR;
  });

  const [laporanSurvei, setLaporanSurvei] = useState(() => {
    const saved = localStorage.getItem('st_laporan_survei');
    return saved ? JSON.parse(saved) : INITIAL_LAPORAN_SURVEI;
  });

  const [adminSettings, setAdminSettings] = useState(() => {
    const saved = localStorage.getItem('st_admin_settings');
    return saved
      ? JSON.parse(saved)
      : {
          kepalaCabang: 'MUHSON NURROCHMAT',
          nup: '48199-KI',
          namaCabang: 'CABANG MADYA KLAS PONTIANAK'
        };
  });

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('st_surat_tugas', JSON.stringify(suratTugas));
  }, [suratTugas]);

  useEffect(() => {
    localStorage.setItem('st_kwitansi_honor', JSON.stringify(kwitansiHonor));
  }, [kwitansiHonor]);

  useEffect(() => {
    localStorage.setItem('st_laporan_survei', JSON.stringify(laporanSurvei));
  }, [laporanSurvei]);

  useEffect(() => {
    localStorage.setItem('st_admin_settings', JSON.stringify(adminSettings));
  }, [adminSettings]);

  const updateAdminSettings = (newSettings) => {
    setAdminSettings((prev) => ({
      ...prev,
      ...newSettings
    }));
  };

  // CRUD Actions for Surat Tugas
  const addSuratTugas = (data) => {
    const newSurat = {
      ...data,
      id: `ST-${Date.now().toString().slice(-6)}`
    };
    setSuratTugas((prev) => [newSurat, ...prev]);
    return newSurat;
  };

  const updateSuratTugas = (id, updatedData) => {
    setSuratTugas((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedData } : item))
    );
  };

  const deleteSuratTugas = (id) => {
    setSuratTugas((prev) => prev.filter((item) => item.id !== id));
    // Also remove associated kwitansi & laporan
    setKwitansiHonor((prev) => prev.filter((item) => item.suratId !== id));
    setLaporanSurvei((prev) => prev.filter((item) => item.suratId !== id));
  };

  // CRUD Actions for Kwitansi Honor
  const addKwitansiHonor = (data) => {
    const newKwitansi = {
      ...data,
      id: `KW-${Date.now().toString().slice(-6)}`,
      jumlah: Number(data.jumlah) || 0
    };
    setKwitansiHonor((prev) => [newKwitansi, ...prev]);
    return newKwitansi;
  };

  const updateKwitansiHonor = (id, updatedData) => {
    setKwitansiHonor((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, ...updatedData, jumlah: Number(updatedData.jumlah) || item.jumlah }
          : item
      )
    );
  };

  const deleteKwitansiHonor = (id) => {
    setKwitansiHonor((prev) => prev.filter((item) => item.id !== id));
  };

  // CRUD Actions for Laporan Survei
  const addLaporanSurvei = (data) => {
    const newLaporan = {
      ...data,
      id: `LAP-${Date.now().toString().slice(-6)}`
    };
    setLaporanSurvei((prev) => [newLaporan, ...prev]);
    return newLaporan;
  };

  const updateLaporanSurvei = (id, updatedData) => {
    setLaporanSurvei((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedData } : item))
    );
  };

  const deleteLaporanSurvei = (id) => {
    setLaporanSurvei((prev) => prev.filter((item) => item.id !== id));
  };

  // Actions for 2-day edit approval window
  const requestEditApproval = (id) => {
    setLaporanSurvei((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, editRequested: true } : item
      )
    );
  };

  const approveEditRequest = (id) => {
    setLaporanSurvei((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isUnlockedByAdmin: true, editRequested: false } : item
      )
    );
  };

  const lockEditRequest = (id) => {
    setLaporanSurvei((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isUnlockedByAdmin: false, editRequested: false } : item
      )
    );
  };

  // Reset to Demo Data
  const resetDemoData = () => {
    setSuratTugas(INITIAL_SURAT_TUGAS);
    setKwitansiHonor(INITIAL_KWITANSI_HONOR);
    setLaporanSurvei(INITIAL_LAPORAN_SURVEI);
    localStorage.removeItem('st_surat_tugas');
    localStorage.removeItem('st_kwitansi_honor');
    localStorage.removeItem('st_laporan_survei');
  };

  return (
    <DataContext.Provider
      value={{
        suratTugas,
        kwitansiHonor,
        laporanSurvei,
        addSuratTugas,
        updateSuratTugas,
        deleteSuratTugas,
        addKwitansiHonor,
        updateKwitansiHonor,
        deleteKwitansiHonor,
        addLaporanSurvei,
        updateLaporanSurvei,
        deleteLaporanSurvei,
        requestEditApproval,
        approveEditRequest,
        lockEditRequest,
        resetDemoData,
        adminSettings,
        updateAdminSettings
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
