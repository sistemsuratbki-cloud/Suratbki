import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  INITIAL_SURAT_TUGAS,
  INITIAL_KWITANSI_HONOR,
  INITIAL_LAPORAN_SURVEI
} from '../utils/initialData';
import { INITIAL_LOCATION_TARIFFS, INITIAL_GRADE_TARIFFS } from '../utils/tariffData';
import { DEFAULT_MASTER_KAPAL, mergeWithDefaultMasterKapal } from '../data/defaultMasterKapal';
import { cleanDocNumber } from '../utils/formatters';
import { isSameSurveyor } from '../utils/filterData';
import {
  fetchSuratTugasFromCloud,
  saveSuratTugasToCloud,
  deleteSuratTugasFromCloud,
  fetchKwitansiFromCloud,
  saveKwitansiToCloud,
  deleteKwitansiFromCloud,
  fetchLaporanFromCloud,
  saveLaporanToCloud,
  deleteLaporanFromCloud,
  fetchTariffsFromCloud,
  saveTariffToCloud,
  deleteTariffFromCloud,
  fetchGradeTariffsFromCloud,
  saveGradeTariffToCloud,
  deleteGradeTariffFromCloud,
  fetchAdminSettingsFromCloud,
  saveAdminSettingsToCloud,
  fetchMasterKapalFromCloud,
  saveMasterKapalToCloud,
  deleteMasterKapalFromCloud,
  fetchVisitSurveiFromCloud,
  saveVisitSurveiToCloud,
  deleteVisitSurveiFromCloud,
  clearOperationalDataFromCloud,
  subscribeToRealtimeChanges
} from '../lib/cloudSync';
import { deleteFromGoogleDrive, isGoogleDriveUrl } from '../utils/googleDriveService';

const deleteEntityFilesFromGoogleDrive = (item) => {
  if (!item || typeof item !== 'object') return;
  const urlsToDelete = [];

  const checkAndAdd = (val) => {
    if (!val) return;
    if (typeof val === 'string' && isGoogleDriveUrl(val)) {
      urlsToDelete.push(val);
    } else if (Array.isArray(val)) {
      val.forEach(v => {
        if (typeof v === 'string' && isGoogleDriveUrl(v)) urlsToDelete.push(v);
        else if (v && typeof v === 'object') {
          if (isGoogleDriveUrl(v.url)) urlsToDelete.push(v.url);
          if (isGoogleDriveUrl(v.data)) urlsToDelete.push(v.data);
        }
      });
    }
  };

  checkAndAdd(item.fileVisitData);
  checkAndAdd(item.fileVisitName);
  checkAndAdd(item.fileFotoData);
  checkAndAdd(item.fileFotoName);
  checkAndAdd(item.fileTiketTransportData);
  checkAndAdd(item.fileTiketTransportName);
  checkAndAdd(item.fileKwitansiHotelData);
  checkAndAdd(item.fileKwitansiHotelName);
  checkAndAdd(item.fotoList);

  if (Array.isArray(item.shipsDetail)) {
    item.shipsDetail.forEach(sh => {
      if (sh) {
        checkAndAdd(sh.fileVisitData);
        checkAndAdd(sh.fileVisitName);
        checkAndAdd(sh.fileFotoData);
        checkAndAdd(sh.fileFotoName);
      }
    });
  }

  const uniqueUrls = [...new Set(urlsToDelete)];
  uniqueUrls.forEach(url => {
    deleteFromGoogleDrive(url).catch(err => console.warn('Auto-delete GDrive file error:', err));
  });
};

const safeSetLocalStorage = (key, data) => {
  try {
    // OPTIMIZED: Always strip large base64 to reduce localStorage pressure
    const sanitized = JSON.parse(
      JSON.stringify(data, (k, v) => {
        // Keep essential signatures (small images)
        if (k === 'signatureUrl' || k === 'kacabSignatureUrl' || k === 'pembuatSignatureUrl' || k === 'signature') {
          return v;
        }
        // Strip large base64 (keep only Google Drive URLs and small data URLs)
        if (typeof v === 'string') {
          if (v.startsWith('http')) {
            return v; // Keep all HTTP/HTTPS URLs (Google Drive links)
          }
          if (v.startsWith('data:') && v.length > 10000) {
            // Large base64 (>10KB) stripped, small icons kept
            return '[STRIPPED_BASE64]';
          }
        }
        return v;
      })
    );
    localStorage.setItem(key, JSON.stringify(sanitized));
  } catch (e) {
    console.error(`LocalStorage write failed for ${key}:`, e);
    // If still fails after sanitization, clear old data
    try {
      localStorage.removeItem(key);
      console.warn(`Cleared ${key} to free space`);
    } catch (e2) {
      console.error(`Cannot clear ${key}:`, e2);
    }
  }
};

const cleanEntityObject = (item) => {
  if (!item || typeof item !== 'object') return item;
  const cleaned = {};
  for (const [k, v] of Object.entries(item)) {
    cleaned[k] = typeof v === 'string' ? cleanDocNumber(v) : v;
  }
  // Normalisasi nama Septian jika tersimpan sebagai 'SEPTIAN AJI' / 'Septian Aji'
  if (cleaned.petugas && (cleaned.petugas.trim().toUpperCase() === 'SEPTIAN AJI' || cleaned.petugas.trim().toUpperCase() === 'SEPTIAN')) {
    cleaned.petugas = 'SEPTIAN AJI DEWANGKARA';
  }
  if (cleaned.penerima && (cleaned.penerima.trim().toUpperCase() === 'SEPTIAN AJI' || cleaned.penerima.trim().toUpperCase() === 'SEPTIAN')) {
    cleaned.penerima = 'SEPTIAN AJI DEWANGKARA';
  }
  if (Array.isArray(cleaned.shipsDetail)) {
    cleaned.shipsDetail = cleaned.shipsDetail.map((sh) => {
      if (!sh || typeof sh !== 'object') return sh;
      const shCleaned = { ...sh };
      if (shCleaned.petugas && (shCleaned.petugas.trim().toUpperCase() === 'SEPTIAN AJI' || shCleaned.petugas.trim().toUpperCase() === 'SEPTIAN')) {
        shCleaned.petugas = 'SEPTIAN AJI DEWANGKARA';
      }
      return shCleaned;
    });
  }
  return cleaned;
};

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [suratTugas, setSuratTugas] = useState(() => {
    const saved = localStorage.getItem('st_surat_tugas');
    const parsed = saved ? JSON.parse(saved) : INITIAL_SURAT_TUGAS;
    return Array.isArray(parsed) ? parsed.map(cleanEntityObject) : [];
  });

  const [kwitansiHonor, setKwitansiHonor] = useState(() => {
    const saved = localStorage.getItem('st_kwitansi_honor');
    const parsed = saved ? JSON.parse(saved) : INITIAL_KWITANSI_HONOR;
    return Array.isArray(parsed) ? parsed.map(cleanEntityObject) : [];
  });

  const [laporanSurvei, setLaporanSurvei] = useState(() => {
    const saved = localStorage.getItem('st_laporan_survei');
    const parsed = saved ? JSON.parse(saved) : INITIAL_LAPORAN_SURVEI;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        const cleaned = cleanEntityObject(item);
        if (!cleaned.noCda || cleaned.noCda.startsWith('CDA-')) {
          cleaned.noCda = '5100010';
        }
        if (cleaned.noSo === '3000255955' || cleaned.noSo?.startsWith('SO-') || cleaned.noSo?.startsWith('RFQ')) {
          cleaned.noSo = '';
        }
        if (cleaned.noWbs === '00578-PK-Z4-0426' || cleaned.noWbs?.startsWith('WBS.')) {
          cleaned.noWbs = '';
        }
        return cleaned;
      });
    }
    return [];
  });

  const [tariffs, setTariffs] = useState(() => {
    const saved = localStorage.getItem('st_tariffs_v2');
    return saved ? JSON.parse(saved) : INITIAL_LOCATION_TARIFFS;
  });

  const [gradeTariffs, setGradeTariffs] = useState(() => {
    const saved = localStorage.getItem('st_grade_tariffs');
    return saved ? JSON.parse(saved) : INITIAL_GRADE_TARIFFS;
  });

  const [masterKapal, setMasterKapal] = useState(() => {
    const saved = localStorage.getItem('st_master_kapal');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergeWithDefaultMasterKapal(parsed);
        }
      } catch (e) {}
    }
    return DEFAULT_MASTER_KAPAL;
  });

  const [adminSettings, setAdminSettings] = useState(() => {
    const saved = localStorage.getItem('st_admin_settings');
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      kepalaCabang: 'MUHSON NURROCHMAT',
      nup: '48199-KI',
      pembuatDaftar: 'RENZA MUHARAM',
      nupPembuatDaftar: '50382-KI',
      kacabSignatureUrl: '/signatures/kacab_muhson_signature.png',
      pembuatSignatureUrl: '/signatures/pembuat_renza_signature.png',
      tatLuarKota: 750000,
      ...parsed
    };
  });

  const [visitSurvei, setVisitSurvei] = useState(() => {
    const saved = localStorage.getItem('st_visit_survei');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    safeSetLocalStorage('st_visit_survei', visitSurvei);
  }, [visitSurvei]);

  // Sinkronisasi otomatis dokumen jika nama pengguna/surveyor diubah
  useEffect(() => {
    const handleUserRenamed = (e) => {
      const { oldName, newName } = e.detail || {};
      if (!oldName || !newName || oldName === newName) return;

      setSuratTugas((prev) => {
        let changed = false;
        const updated = prev.map((st) => {
          if (st.petugas && isSameSurveyor(st.petugas, oldName)) {
            changed = true;
            const newSt = { ...st, petugas: newName };
            saveSuratTugasToCloud(newSt).catch(() => {});
            return newSt;
          }
          return st;
        });
        if (changed) safeSetLocalStorage('st_surat_tugas', updated);
        return changed ? updated : prev;
      });

      setKwitansiHonor((prev) => {
        let changed = false;
        const updated = prev.map((kh) => {
          if (kh.penerima && isSameSurveyor(kh.penerima, oldName)) {
            changed = true;
            const newKh = { ...kh, penerima: newName };
            saveKwitansiToCloud(newKh).catch(() => {});
            return newKh;
          }
          return kh;
        });
        if (changed) safeSetLocalStorage('st_kwitansi_honor', updated);
        return changed ? updated : prev;
      });

      setLaporanSurvei((prev) => {
        let changed = false;
        const updated = prev.map((lp) => {
          if (lp.petugas && isSameSurveyor(lp.petugas, oldName)) {
            changed = true;
            const newLp = { ...lp, petugas: newName };
            saveLaporanToCloud(newLp).catch(() => {});
            return newLp;
          }
          return lp;
        });
        if (changed) safeSetLocalStorage('st_laporan_survei', updated);
        return changed ? updated : prev;
      });
    };

    window.addEventListener('st_user_renamed', handleUserRenamed);
    return () => window.removeEventListener('st_user_renamed', handleUserRenamed);
  }, []);

  // ====== 0. INITIAL CLOUD LOAD (SUPABASE) & REALTIME SYNC ======
  const refreshAllFromCloud = useCallback(async () => {
    try {
      // OPTIMIZED: Add timeout protection (15s total) to prevent 408 errors on LiteSpeed
      const fetchWithTimeout = Promise.race([
        Promise.all([
          fetchSuratTugasFromCloud(),
          fetchKwitansiFromCloud(),
          fetchLaporanFromCloud(),
          fetchTariffsFromCloud(),
          fetchGradeTariffsFromCloud(),
          fetchAdminSettingsFromCloud(),
          fetchMasterKapalFromCloud(),
          fetchVisitSurveiFromCloud()
        ]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cloud sync timeout - data loaded from cache')), 15000)
        )
      ]);

      const [cloudSurat, cloudKw, cloudLap, cloudTariffs, cloudGrades, cloudSettings, cloudKapal, cloudVisit] = await fetchWithTimeout;

      if (Array.isArray(cloudSurat)) {
        // Auto-heal orphan SPS: jika ada SPS yang memiliki pdsId mengarah ke PDS yang sudah tidak ada di database,
        // kembalikan statusnya ke 'Menunggu Survei' dan pdsId ke null agar tidak hilang/tersembunyi di UI.
        const pdsIdSet = new Set(
          cloudSurat
            .filter((s) => s && (s.docType === 'PDS' || s.isPds))
            .map((s) => s.id)
        );

        const healedSurat = cloudSurat.map((st) => {
          const isSps = st && (st.docType === 'SPS' || st.isSps);
          if (isSps && st.pdsId && !pdsIdSet.has(st.pdsId)) {
            console.warn(`[AutoHeal] Memulihkan SPS ${st.id} (${st.namaKapal}) karena PDS induknya (${st.pdsId}) sudah dihapus.`);
            const restored = { ...st, pdsId: null, status: 'Menunggu Survei' };
            saveSuratTugasToCloud(restored);
            return restored;
          }
          return st;
        });

        // MEMORY OPTIMIZATION: Limit to latest 50 items only (keep it simple, no setTimeout)
        const sortedSurat = healedSurat.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.tglMulai || 0);
          const dateB = new Date(b.createdAt || b.tglMulai || 0);
          return dateB - dateA; // Newest first
        });
        
        const limitedSurat = sortedSurat.slice(0, 50); // Only keep 50 latest
        const cleanedSurat = limitedSurat.map(cleanEntityObject);
        setSuratTugas(cleanedSurat);
        safeSetLocalStorage('st_surat_tugas', cleanedSurat);
      }
      if (Array.isArray(cloudKw)) {
        // Limit to 50 latest
        const sorted = cloudKw.sort((a, b) => new Date(b.tglBayar || 0) - new Date(a.tglBayar || 0));
        const limited = sorted.slice(0, 50);
        const cleanedKw = limited.map(cleanEntityObject);
        setKwitansiHonor(cleanedKw);
        safeSetLocalStorage('st_kwitansi_honor', cleanedKw);
      }
      if (Array.isArray(cloudLap)) {
        // Limit to 50 latest
        const sorted = cloudLap.sort((a, b) => new Date(b.tglLapor || 0) - new Date(a.tglLapor || 0));
        const limited = sorted.slice(0, 50);
        const cleanedLap = limited.map(cleanEntityObject);
        setLaporanSurvei(cleanedLap);
        safeSetLocalStorage('st_laporan_survei', cleanedLap);
      }
      if (Array.isArray(cloudTariffs) && cloudTariffs.length > 0) {
        setTariffs(cloudTariffs);
      }
      if (Array.isArray(cloudGrades) && cloudGrades.length > 0) {
        setGradeTariffs(cloudGrades);
      }
      if (cloudSettings && typeof cloudSettings === 'object') {
        setAdminSettings((prev) => ({ ...prev, ...cloudSettings }));
      }
      if (Array.isArray(cloudKapal) && cloudKapal.length > 0) {
        setMasterKapal(mergeWithDefaultMasterKapal(cloudKapal));
      }
      if (Array.isArray(cloudVisit)) {
        const sorted = cloudVisit.sort((a, b) => new Date(b.tanggalKunjungan || 0) - new Date(a.tanggalKunjungan || 0));
        const limited = sorted.slice(0, 50);
        setVisitSurvei(limited.map(cleanEntityObject));
        safeSetLocalStorage('st_visit_survei', limited);
      }
    } catch (e) {
      console.warn('Cloud sync load warning (loading from localStorage cache):', e);
      // FALLBACK: Load from localStorage cache if cloud sync times out
      try {
        const cachedSurat = localStorage.getItem('st_surat_tugas');
        const cachedKw = localStorage.getItem('st_kwitansi_honor');
        const cachedLap = localStorage.getItem('st_laporan_survei');
        const cachedVisit = localStorage.getItem('st_visit_survei');
        
        if (cachedSurat) {
          const parsed = JSON.parse(cachedSurat);
          if (Array.isArray(parsed)) setSuratTugas(parsed.map(cleanEntityObject));
        }
        if (cachedKw) {
          const parsed = JSON.parse(cachedKw);
          if (Array.isArray(parsed)) setKwitansiHonor(parsed.map(cleanEntityObject));
        }
        if (cachedLap) {
          const parsed = JSON.parse(cachedLap);
          if (Array.isArray(parsed)) setLaporanSurvei(parsed.map(cleanEntityObject));
        }
        if (cachedVisit) {
          const parsed = JSON.parse(cachedVisit);
          if (Array.isArray(parsed)) setVisitSurvei(parsed.map(cleanEntityObject));
        }
        console.log('Loaded data from localStorage cache successfully');
      } catch (cacheError) {
        console.error('Failed to load from cache:', cacheError);
      }
    }
  }, []);

  useEffect(() => {
    refreshAllFromCloud();

    // Subscribe to live cloud changes
    const unsubscribe = subscribeToRealtimeChanges(() => {
      refreshAllFromCloud();
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [refreshAllFromCloud]);

  // Sync to LocalStorage (Cleaned & Quota Safe) - DEBOUNCED to batch writes
  useEffect(() => {
    const timer = setTimeout(() => {
      const cleaned = suratTugas.map(cleanEntityObject);
      safeSetLocalStorage('st_surat_tugas', cleaned);
    }, 500); // Batch writes with 500ms delay
    return () => clearTimeout(timer);
  }, [suratTugas]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const cleaned = kwitansiHonor.map(cleanEntityObject);
      safeSetLocalStorage('st_kwitansi_honor', cleaned);
    }, 500);
    return () => clearTimeout(timer);
  }, [kwitansiHonor]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const cleaned = laporanSurvei.map(cleanEntityObject);
      safeSetLocalStorage('st_laporan_survei', cleaned);
    }, 500);
    return () => clearTimeout(timer);
  }, [laporanSurvei]);

  useEffect(() => {
    const timer = setTimeout(() => {
      safeSetLocalStorage('st_tariffs_v2', tariffs);
    }, 500);
    return () => clearTimeout(timer);
  }, [tariffs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      safeSetLocalStorage('st_grade_tariffs', gradeTariffs);
    }, 500);
    return () => clearTimeout(timer);
  }, [gradeTariffs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      safeSetLocalStorage('st_master_kapal', masterKapal);
    }, 500);
    return () => clearTimeout(timer);
  }, [masterKapal]);

  useEffect(() => {
    const timer = setTimeout(() => {
      safeSetLocalStorage('st_admin_settings', adminSettings);
    }, 500);
    return () => clearTimeout(timer);
  }, [adminSettings]);

  useEffect(() => {
    const timer = setTimeout(() => {
      safeSetLocalStorage('st_visit_survei', visitSurvei);
    }, 500);
    return () => clearTimeout(timer);
  }, [visitSurvei]);

  // Auto-sync / heal Kwitansi & Laporan only for PDS (Perjalanan Dinas Surveyor)
  // THROTTLED to prevent excessive re-processing on every suratTugas change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (suratTugas.length > 0) {
        let kwitansiUpdated = false;
        let laporanUpdated = false;
        const updatedKwitansiList = [...kwitansiHonor];
        let updatedLaporanList = [...laporanSurvei];

      // Only PDS items (or items that are already executed/not pending SPS) get Kwitansi & Laporan
      const pdsItems = suratTugas.filter(
        (st) => st.docType === 'PDS' || st.isPds === true || (!st.docType && st.status !== 'Menunggu Survei')
      );

      pdsItems.forEach((st) => {
        const baseRate = Number(st.tarifDasar) || 3000000;
        const ticketTransport = Number(st.tiketPesawatTaxi) || Number(st.biayaTiket) || 0;
        const ticketHotel = Number(st.tiketHotel) || 0;
        const totalTicket = ticketTransport + ticketHotel;
        const totalHonor = Number(st.jumlahEstimasi) || (baseRate + totalTicket);

        // 1. Check Kwitansi
        const existingKw = updatedKwitansiList.find((k) => k.suratId === st.id);
        if (!existingKw) {
          updatedKwitansiList.push(cleanEntityObject({
            id: `KW-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900) + 100}`,
            suratId: st.id,
            nomorSurat: cleanDocNumber(st.nomor),
            namaKapal: st.namaKapal,
            penerima: st.petugas,
            lokasi: st.tempatSurvey || st.lokasi,
            tarifDasar: baseRate,
            biayaTiket: totalTicket,
            tiketHotel: ticketHotel,
            tiketPesawatTaxi: ticketTransport,
            kategoriTransportasi: st.kategoriTransportasi || 'Pesawat Terbang',
            fileTiketName: st.fileTiketTransportName || st.fileTiketName || '',
            fileFotoName: st.fileFotoName || '',
            fileFotoData: st.fileFotoData || '',
            fotoList: st.fotoList || [],
            fileVisitName: st.fileVisitName || '',
            fileKwitansiHotelName: st.fileKwitansiHotelName || '',
            jumlah: totalHonor,
            status: 'Belum Dibayar',
            tglBayar: st.tglMulai || new Date().toISOString().split('T')[0],
            catatan: `Honorarium Standar (${st.tempatSurvey || st.lokasi})`
          }));
          kwitansiUpdated = true;
        }

        // 2. Check Laporan Survei (DISABLED - PDS sekarang include NO.SO/NO.WBS)
        // Laporan tidak lagi di-generate otomatis, semua data ada di PDS
        /*
        const isAcc = st.approvalStatus === 'ACC';
        const existingLap = updatedLaporanList.find((l) => l.suratId === st.id);

        if (isAcc) {
          if (!existingLap) {
            updatedLaporanList.push(cleanEntityObject({
              id: `LAP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900) + 100}`,
              suratId: st.id,
              tglLapor: st.tglMulai || new Date().toISOString().split('T')[0],
              tanggal: st.tglMulai || new Date().toISOString().split('T')[0],
              namaKapal: st.namaKapal,
              lokasi: st.tempatSurvey || st.lokasi,
              lokasiSurvey: st.tempatSurvey || st.lokasi,
              nilai: totalHonor,
              tarifDasar: baseRate,
              namaSurvey: st.jenisSurvey || st.perihal || 'DINAS SURVEY KLAS',
              noAgenda: cleanDocNumber(st.noAgenda || st.nomor),
              noCda: st.noCda || '5100010',
              noSo: st.noSo || '',
              noWbs: st.noWbs || '',
              petugas: st.petugas,
              isCito: !!st.isCito,
              hasil: st.catatan || `Survei kelaiklautan kapal ${st.namaKapal}`,
              status: 'Terkirim',
              fileFotoName: st.fileFotoName || '',
              fileFotoData: st.fileFotoData || '',
              fotoList: st.fotoList || [],
              fileVisitName: st.fileVisitName || '',
              fileTiketTransportName: st.fileTiketTransportName || st.fileTiketName || '',
              fileKwitansiHotelName: st.fileKwitansiHotelName || ''
            }));
            laporanUpdated = true;
          }
        } else {
          // Jika status belum ACC / diminta revisi, keluarkan dari Laporan Survei
          if (existingLap) {
            updatedLaporanList = updatedLaporanList.filter((l) => l.suratId !== st.id);
            laporanUpdated = true;
          }
        }
        */
      });

        if (kwitansiUpdated) {
          setKwitansiHonor(updatedKwitansiList.map(cleanEntityObject));
        }
        // laporanUpdated disabled - tidak lagi auto-sync Laporan
        /*
        if (laporanUpdated) {
          setLaporanSurvei(updatedLaporanList.map(cleanEntityObject));
        }
        */
      }
    }, 2000); // Throttle to max once per 2 seconds
    return () => clearTimeout(timer);
  }, [suratTugas, kwitansiHonor, laporanSurvei]);

  const updateAdminSettings = (newSettings) => {
    const merged = { ...adminSettings, ...newSettings };
    setAdminSettings(merged);
    saveAdminSettingsToCloud(merged);
  };

  // CRUD Actions for Tariffs / Biaya Lokasi
  const addTariff = (data) => {
    const newTariff = {
      ...data,
      id: data.id || `loc-${Date.now().toString().slice(-6)}`,
      name: data.tujuan || data.name,
      tujuan: data.tujuan || data.name,
      rincian: data.rincian || '',
      rate: Number(data.rate) || 0,
      moda: data.moda || 'Darat',
      no: tariffs.length + 1
    };
    setTariffs((prev) => [...prev, newTariff]);
    saveTariffToCloud(newTariff);
    return newTariff;
  };

  const updateTariff = (id, updatedData) => {
    setTariffs((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = {
            ...item,
            ...updatedData,
            name: updatedData.tujuan || updatedData.name || item.name,
            tujuan: updatedData.tujuan || updatedData.name || item.tujuan,
            rate: Number(updatedData.rate) !== undefined ? Number(updatedData.rate) : item.rate
          };
          saveTariffToCloud(updated);
          return updated;
        }
        return item;
      })
    );
  };

  const deleteTariff = (id) => {
    setTariffs((prev) => prev.filter((item) => item.id !== id));
    deleteTariffFromCloud(id);
  };

  const resetTariffs = () => {
    setTariffs(INITIAL_LOCATION_TARIFFS);
    localStorage.setItem('st_tariffs', JSON.stringify(INITIAL_LOCATION_TARIFFS));
  };

  // CRUD Actions for Grade / Uang Harian
  const addGradeTariff = (data) => {
    const newGrade = {
      ...data,
      id: data.id || `grd-${Date.now().toString().slice(-6)}`,
      uangHarian: Number(data.uangHarian) || 0
    };
    setGradeTariffs((prev) => [...prev, newGrade]);
    saveGradeTariffToCloud(newGrade);
    return newGrade;
  };

  const updateGradeTariff = (id, updatedData) => {
    setGradeTariffs((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = {
            ...item,
            ...updatedData,
            uangHarian: Number(updatedData.uangHarian) !== undefined ? Number(updatedData.uangHarian) : item.uangHarian
          };
          saveGradeTariffToCloud(updated);
          return updated;
        }
        return item;
      })
    );
  };

  const deleteGradeTariff = (id) => {
    setGradeTariffs((prev) => prev.filter((item) => item.id !== id));
    deleteGradeTariffFromCloud(id);
  };

  const resetGradeTariffs = () => {
    setGradeTariffs(INITIAL_GRADE_TARIFFS);
    localStorage.setItem('st_grade_tariffs', JSON.stringify(INITIAL_GRADE_TARIFFS));
  };

  // ====== CRUD MASTER KAPAL ======
  const addMasterKapal = (data) => {
    const noAgenda = (data.noAgenda || '').trim();
    // Check for duplicate noAgenda
    if (noAgenda) {
      const duplicate = masterKapal.find(
        (k) => (k.noAgenda || '').trim().toUpperCase() === noAgenda.toUpperCase()
      );
      if (duplicate) {
        return { success: false, error: 'duplicate', existingKapal: duplicate.namaKapal, noAgenda };
      }
    }
    const newKapal = {
      id: `kapal-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`,
      namaKapal:   (data.namaKapal   || '').trim().toUpperCase(),
      noAgenda:    noAgenda,
      pemohon:     (data.pemohon     || '').trim(),
      jenisSurvey: (data.jenisSurvey || '').trim(),
      createdAt: new Date().toISOString()
    };
    setMasterKapal((prev) => [...prev, newKapal]);
    saveMasterKapalToCloud(newKapal);
    return { success: true, data: newKapal };
  };

  const updateMasterKapal = (id, updatedData) => {
    const noAgenda = (updatedData.noAgenda !== undefined ? updatedData.noAgenda : '').trim();
    // Check for duplicate noAgenda (exclude current item)
    if (noAgenda) {
      const duplicate = masterKapal.find(
        (k) => k.id !== id && (k.noAgenda || '').trim().toUpperCase() === noAgenda.toUpperCase()
      );
      if (duplicate) {
        return { success: false, error: 'duplicate', existingKapal: duplicate.namaKapal, noAgenda };
      }
    }
    setMasterKapal((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = {
            ...item,
            namaKapal:   (updatedData.namaKapal   || item.namaKapal).trim().toUpperCase(),
            noAgenda:    (updatedData.noAgenda    !== undefined ? updatedData.noAgenda : item.noAgenda).trim(),
            pemohon:     (updatedData.pemohon     !== undefined ? updatedData.pemohon : (item.pemohon || '')).trim(),
            jenisSurvey: (updatedData.jenisSurvey !== undefined ? updatedData.jenisSurvey : (item.jenisSurvey || '')).trim()
          };
          saveMasterKapalToCloud(updated);
          return updated;
        }
        return item;
      })
    );
    return { success: true };
  };

  // Bulk import — skips duplicates and returns summary
  const addMasterKapalBatch = (dataArray) => {
    let added = 0;
    let skipped = 0;
    const skippedItems = [];
    const newItems = [];

    const currentAgendas = new Set(
      masterKapal.map((k) => (k.noAgenda || '').trim().toUpperCase()).filter(Boolean)
    );

    let counter = 0;
    for (const data of dataArray) {
      counter++;
      const noAgenda = (data.noAgenda || '').trim().toUpperCase();
      if (noAgenda && currentAgendas.has(noAgenda)) {
        skipped++;
        skippedItems.push({ namaKapal: data.namaKapal, noAgenda: data.noAgenda });
        continue;
      }
      const newKapal = {
        id: `kapal-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000) + counter}`,
        namaKapal:   (data.namaKapal   || '').trim().toUpperCase(),
        noAgenda:    (data.noAgenda    || '').trim(),
        pemohon:     (data.pemohon     || '').trim(),
        jenisSurvey: (data.jenisSurvey || '').trim(),
        createdAt: new Date().toISOString()
      };
      newItems.push(newKapal);
      if (noAgenda) currentAgendas.add(noAgenda);
      added++;
    }

    if (newItems.length > 0) {
      setMasterKapal((prev) => [...prev, ...newItems]);
      // Save all to cloud
      newItems.forEach((item) => saveMasterKapalToCloud(item));
    }

    return { added, skipped, skippedItems, total: dataArray.length };
  };

  const deleteMasterKapal = (id) => {
    setMasterKapal((prev) => prev.filter((item) => item.id !== id));
    deleteMasterKapalFromCloud(id);
  };

  // ====== AUTO-SYNC KAPAL KE MASTER_KAPAL DATABASE ======
  // Memastikan semua kapal dari PDS/SPS tersimpan di database kapal dan TIDAK terhapus
  const syncShipsToMasterKapal = useCallback((item) => {
    if (!item) return;
    const shipsToSync = [];

    // 1. Dari array shipsDetail
    if (Array.isArray(item.shipsDetail) && item.shipsDetail.length > 0) {
      item.shipsDetail.forEach((sh) => {
        const name = (sh.namaKapal || '').trim().toUpperCase();
        if (name && name !== '-' && name !== 'KAPAL') {
          shipsToSync.push({
            namaKapal: name,
            noAgenda: (sh.noAgenda && sh.noAgenda !== '-' ? sh.noAgenda : item.noAgenda || '').trim(),
            pemohon: (sh.pemohon || item.pemohon || '').trim(),
            jenisSurvey: (sh.jenisSurvey || item.jenisSurvey || '').trim()
          });
        }
      });
    }

    // 2. Dari array shipsList
    if (Array.isArray(item.shipsList) && item.shipsList.length > 0) {
      item.shipsList.forEach((sh) => {
        const name = (typeof sh === 'string' ? sh : sh.namaKapal || '').trim().toUpperCase();
        if (name && name !== '-' && name !== 'KAPAL') {
          shipsToSync.push({
            namaKapal: name,
            noAgenda: (item.noAgenda && item.noAgenda !== '-' ? item.noAgenda : '').trim(),
            pemohon: (item.pemohon || '').trim(),
            jenisSurvey: (item.jenisSurvey || '').trim()
          });
        }
      });
    }

    // 3. Dari namaKapal langsung (bisa multi kapal dengan pemisah koma, garis miring, atau titik koma)
    if (item.namaKapal) {
      const names = String(item.namaKapal)
        .split(/[,/;]/)
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s && s !== '-' && s !== 'KAPAL');

      names.forEach((name) => {
        shipsToSync.push({
          namaKapal: name,
          noAgenda: (item.noAgenda && item.noAgenda !== '-' ? item.noAgenda : item.agenda || '').trim(),
          pemohon: (item.pemohon || '').trim(),
          jenisSurvey: (item.jenisSurvey || item.perihal || '').trim()
        });
      });
    }

    // 4. Dari raw_data jika ada
    if (item.raw_data && typeof item.raw_data === 'object') {
      if (Array.isArray(item.raw_data.shipsDetail)) {
        item.raw_data.shipsDetail.forEach((sh) => {
          const name = (sh.namaKapal || '').trim().toUpperCase();
          if (name && name !== '-' && name !== 'KAPAL') {
            shipsToSync.push({
              namaKapal: name,
              noAgenda: (sh.noAgenda && sh.noAgenda !== '-' ? sh.noAgenda : '').trim(),
              pemohon: (sh.pemohon || '').trim(),
              jenisSurvey: (sh.jenisSurvey || '').trim()
            });
          }
        });
      }
    }

    if (shipsToSync.length === 0) return;

    setMasterKapal((prev) => {
      const updatedList = [...prev];
      let hasChange = false;

      shipsToSync.forEach((targetShip) => {
        const cleanName = targetShip.namaKapal;
        if (!cleanName) return;

        const existingIndex = updatedList.findIndex(
          (k) => (k.namaKapal || '').trim().toUpperCase() === cleanName
        );

        if (existingIndex === -1) {
          // Kapal baru -> simpan ke database master_kapal
          const cleanAgenda = targetShip.noAgenda && targetShip.noAgenda !== '-' ? targetShip.noAgenda : '';
          const newKapal = {
            id: `kapal-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 9000 + 1000)}`,
            namaKapal: cleanName,
            noAgenda: cleanAgenda,
            pemohon: targetShip.pemohon || '',
            jenisSurvey: targetShip.jenisSurvey || '',
            createdAt: new Date().toISOString()
          };
          updatedList.push(newKapal);
          saveMasterKapalToCloud(newKapal);
          hasChange = true;
        } else {
          // Kapal sudah ada -> lengkapi jika ada data yang masih kosong
          const existing = updatedList[existingIndex];
          const cleanAgenda = targetShip.noAgenda && targetShip.noAgenda !== '-' ? targetShip.noAgenda : '';
          const needsUpdate =
            (!existing.noAgenda && cleanAgenda) ||
            (!existing.pemohon && targetShip.pemohon) ||
            (!existing.jenisSurvey && targetShip.jenisSurvey);

          if (needsUpdate) {
            const updated = {
              ...existing,
              noAgenda: existing.noAgenda || cleanAgenda || '',
              pemohon: existing.pemohon || targetShip.pemohon || '',
              jenisSurvey: existing.jenisSurvey || targetShip.jenisSurvey || ''
            };
            updatedList[existingIndex] = updated;
            saveMasterKapalToCloud(updated);
            hasChange = true;
          }
        }
      });

      if (hasChange) {
        safeSetLocalStorage('st_master_kapal', updatedList);
      }
      return hasChange ? updatedList : prev;
    });
  }, []);

  // ====== VISIT SURVEI (LAYAR MONITOR & CLOUD SUPABASE) ======
  const addVisitSurvei = (data) => {
    const newVisit = cleanEntityObject({
      id: `visit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
      tanggal: data.tanggal || new Date().toISOString().split('T')[0],
      nama: (data.nama || '').trim(),
      lokasi: (data.lokasi || '').trim(),
      namaKapal: (data.namaKapal || '').trim().toUpperCase(),
      ships: Array.isArray(data.ships) ? data.ships : (data.namaKapal ? data.namaKapal.split(/\s*[\/,]\s*/).filter(Boolean) : []),
      durasi: (data.durasi !== undefined && data.durasi !== null && data.durasi !== '' && !isNaN(Number(data.durasi))) ? Number(data.durasi) : 0,
      jamBerangkat: (data.jamBerangkat || '').trim(),
      jamSelesai: (data.jamSelesai || '').trim(),
      status: data.status || 'Sedang Berjalan',
      keterangan: (data.keterangan || '').trim()
    });
    setVisitSurvei((prev) => [newVisit, ...prev]);
    saveVisitSurveiToCloud(newVisit);
    return newVisit;
  };

  const updateVisitSurvei = (id, updatedData) => {
    let updatedItem = null;
    setVisitSurvei((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          updatedItem = cleanEntityObject({ ...item, ...updatedData });
          return updatedItem;
        }
        return item;
      })
    );
    if (updatedItem) {
      saveVisitSurveiToCloud(updatedItem);
    }
  };

  const deleteVisitSurvei = (id) => {
    setVisitSurvei((prev) => {
      const updated = prev.filter((item) => String(item.id) !== String(id));
      safeSetLocalStorage('st_visit_survei', updated);
      return updated;
    });
    deleteVisitSurveiFromCloud(id);
  };

  // ====== 1. ADMIN INPUT SPS (Batch or Single Ship) ======
  const addSpsBatch = (baseData) => {
    console.log('[DataContext] addSpsBatch received baseData:', baseData);
    console.log('[DataContext] baseData.petugas value:', baseData.petugas);
    
    const cleaned = cleanEntityObject(baseData);
    console.log('[DataContext] After cleanEntityObject, cleaned.petugas:', cleaned.petugas);
    
    const batchId = `BATCH-${Date.now().toString().slice(-6)}`;

    let shipEntries = [];
    if (Array.isArray(cleaned.shipsList) && cleaned.shipsList.length > 0) {
      shipEntries = cleaned.shipsList.map((s, idx) => ({
        namaKapal: s.namaKapal.trim().toUpperCase(),
        noAgenda: s.noAgenda ? s.noAgenda.trim() : String(Math.floor(Math.random() * 900) + 100 + idx)
      }));
    } else {
      const rawShips = cleaned.namaKapal || '';
      const shipList = Array.isArray(rawShips)
        ? rawShips.filter(Boolean)
        : rawShips
            .split(',')
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean);

      const actualShips = shipList.length > 0 ? shipList : ['KAPAL SURVEY'];
      const baseAgendaNum = cleaned.noAgenda || cleaned.agenda || String(Math.floor(Math.random() * 800) + 100);
      const matchNum = String(baseAgendaNum).match(/(\d+)$/);
      const baseNumVal = matchNum ? parseInt(matchNum[1], 10) : 100;

      shipEntries = actualShips.map((shipName, idx) => ({
        namaKapal: shipName,
        noAgenda: matchNum ? String(baseAgendaNum).replace(/\d+$/, String(baseNumVal + idx)) : `${baseAgendaNum}-${idx + 1}`
      }));
    }

    const createdSpsItems = shipEntries.map((shipItem, idx) => {
      const spsId = `SPS-${Date.now().toString().slice(-6)}-${idx + 1}-${Math.floor(Math.random() * 90) + 10}`;

      const item = cleanEntityObject({
        ...cleaned,
        id: spsId,
        batchId: batchId,
        nomor: null,
        noAgenda: shipItem.noAgenda,
        agenda: shipItem.noAgenda,
        namaKapal: shipItem.namaKapal,
        docType: 'SPS',
        isSps: true,
        status: cleaned.status || 'Menunggu Survei',
        isParafSent: false,
        parafSentAt: null,
        parafSentBy: null,
        pdsId: null,
        createdAt: new Date().toISOString()
      });

      console.log(`[DataContext] Created SPS item ${idx}:`, item);
      console.log(`[DataContext] SPS item ${idx} petugas:`, item.petugas);

      saveSuratTugasToCloud(item);
      return item;
    });

    // Auto-sync new ships to masterKapal
    shipEntries.forEach((s) => {
      const shipName = s.namaKapal.trim().toUpperCase();
      if (shipName) {
        setMasterKapal((prev) => {
          const exists = prev.some((k) => (k.namaKapal || '').trim().toUpperCase() === shipName);
          if (!exists) {
            const newKapal = {
              id: `kapal-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 9000 + 1000)}`,
              namaKapal: shipName,
              noAgenda: s.noAgenda || '',
              pemohon: (cleaned.pemohon || '').trim(),
              jenisSurvey: (cleaned.jenisSurvey || '').trim(),
              createdAt: new Date().toISOString()
            };
            saveMasterKapalToCloud(newKapal);
            return [...prev, newKapal];
          }
          return prev;
        });
      }
    });

    setSuratTugas((prev) => {
      const next = [...createdSpsItems, ...prev];
      safeSetLocalStorage('st_surat_tugas', next);
      return next;
    });
    return createdSpsItems;
  };

  // Backward compatibility alias for addSuratTugas
  const addSuratTugas = (data) => {
    if (data.docType === 'SPS' || data.isSps || (!data.docType && data.status === 'Menunggu Survei')) {
      const items = addSpsBatch(data);
      return items[0];
    }

    const newId = `ST-${Date.now().toString().slice(-6)}`;
    const cleanedData = cleanEntityObject(data);
    const newSurat = {
      ...cleanedData,
      id: newId,
      docType: cleanedData.docType || 'PDS',
      isPds: true,
      nomor: cleanDocNumber(cleanedData.nomor)
    };
    setSuratTugas((prev) => {
      const next = [newSurat, ...prev];
      safeSetLocalStorage('st_surat_tugas', next);
      return next;
    });
    saveSuratTugasToCloud(newSurat);
    syncShipsToMasterKapal(newSurat);

    // ====== GENERATE KWITANSI & LAPORAN FOR THIS PDS ======
    const baseRate = Number(cleanedData.tarifDasar) || 3000000;
    const ticketTransport = Number(cleanedData.tiketPesawatTaxi) || Number(cleanedData.biayaTiket) || 0;
    const ticketHotel = Number(cleanedData.tiketHotel) || 0;
    const totalTicket = ticketTransport + ticketHotel;
    const totalHonor = Number(cleanedData.jumlahEstimasi) || (baseRate + totalTicket);

    const autoKwitansi = cleanEntityObject({
      id: `KW-${Date.now().toString().slice(-6)}`,
      suratId: newId,
      nomorSurat: cleanDocNumber(cleanedData.nomor),
      namaKapal: cleanedData.namaKapal,
      penerima: cleanedData.petugas,
      lokasi: cleanedData.tempatSurvey || cleanedData.lokasi,
      tarifDasar: baseRate,
      biayaTiket: totalTicket,
      tiketHotel: ticketHotel,
      tiketPesawatTaxi: ticketTransport,
      kategoriTransportasi: cleanedData.kategoriTransportasi || 'Pesawat Terbang',
      fileTiketName: cleanedData.fileTiketTransportName || cleanedData.fileTiketName || '',
      fileFotoName: cleanedData.fileFotoName || '',
      fileFotoData: cleanedData.fileFotoData || '',
      fotoList: cleanedData.fotoList || [],
      fileVisitName: cleanedData.fileVisitName || '',
      fileKwitansiHotelName: cleanedData.fileKwitansiHotelName || '',
      jumlah: totalHonor,
      status: 'Belum Dibayar',
      tglBayar: cleanedData.tglMulai || new Date().toISOString().split('T')[0],
      catatan: `Honorarium Standar (${cleanedData.tempatSurvey || cleanedData.lokasi})`
    });

    setKwitansiHonor((prev) => [autoKwitansi, ...prev]);
    saveKwitansiToCloud(autoKwitansi);

    // ====== AUTO-GENERATE LAPORAN DISABLED ======
    // PDS sekarang sudah include NO.SO/NO.WBS, tidak perlu generate Laporan terpisah
    /*
    const autoLaporan = cleanEntityObject({
      id: `LAP-${Date.now().toString().slice(-6)}`,
      suratId: newId,
      tglLapor: cleanedData.tglMulai || new Date().toISOString().split('T')[0],
      tanggal: cleanedData.tglMulai || new Date().toISOString().split('T')[0],
      namaKapal: cleanedData.namaKapal,
      lokasi: cleanedData.tempatSurvey || cleanedData.lokasi,
      lokasiSurvey: cleanedData.tempatSurvey || cleanedData.lokasi,
      nilai: totalHonor,
      tarifDasar: baseRate,
      namaSurvey: cleanedData.jenisSurvey || cleanedData.perihal || 'DINAS SURVEY KLAS',
      noAgenda: cleanDocNumber(cleanedData.noAgenda || cleanedData.nomor),
      noCda: cleanedData.noCda || '5100010',
      noSo: cleanedData.noSo || '',
      noWbs: cleanedData.noWbs || '',
      petugas: cleanedData.petugas,
      isCito: !!cleanedData.isCito,
      hasil: cleanedData.catatan || `Survei kelaiklautan kapal ${cleanedData.namaKapal}`,
      status: 'Terkirim',
      fileFotoName: cleanedData.fileFotoName || '',
      fileFotoData: cleanedData.fileFotoData || '',
      fotoList: cleanedData.fotoList || [],
      fileVisitName: cleanedData.fileVisitName || '',
      fileTiketTransportName: cleanedData.fileTiketTransportName || cleanedData.fileTiketName || '',
      fileKwitansiHotelName: cleanedData.fileKwitansiHotelName || ''
    });

    setLaporanSurvei((prev) => [autoLaporan, ...prev]);
    saveLaporanToCloud(autoLaporan);
    */

    return newSurat;
  };

  // ====== 2. SURVEYOR SIMPAN SURVEI & TERBITKAN PDS ======
  const createPdsFromSurvey = (surveyData, linkedSpsIds = []) => {
    const newPdsId = `PDS-${Date.now().toString().slice(-6)}`;
    const cleaned = cleanEntityObject(surveyData);

    const baseRate = Number(cleaned.tarifDasar) || 0;
    const ticketTransport = Number(cleaned.tiketPesawatTaxi) || Number(cleaned.biayaTiket) || 0;
    const ticketHotel = Number(cleaned.tiketHotel) || 0;
    const totalTicket = ticketTransport + ticketHotel;
    const totalHonor = Number(cleaned.jumlahEstimasi) || (baseRate + totalTicket);

    const resolvedShipsDetail = (Array.isArray(cleaned.shipsDetail) && cleaned.shipsDetail.length > 0)
      ? cleaned.shipsDetail
      : (Array.isArray(linkedSpsIds) && linkedSpsIds.length > 0)
        ? suratTugas.filter(st => linkedSpsIds.includes(st.id)).map(st => ({
            spsId: st.id,
            namaKapal: st.namaKapal,
            noAgenda: st.noAgenda || st.agenda || '-',
            noOrder: st.noOrder || cleaned.noOrder,
            pemohon: st.pemohon || cleaned.pemohon
          }))
        : [{
            namaKapal: cleaned.namaKapal || 'KAPAL',
            noAgenda: cleaned.noAgenda || cleaned.agenda || '-',
            noOrder: cleaned.noOrder || '-'
          }];

    const newPds = {
      ...cleaned,
      id: newPdsId,
      docType: 'PDS',
      isPds: true,
      nomor: cleanDocNumber(cleaned.nomor || 'A 0    /SV.201/PK/KI-26'),
      status: cleaned.status || 'Selesai',
      linkedSpsIds: Array.isArray(linkedSpsIds) ? linkedSpsIds : [linkedSpsIds].filter(Boolean),
      shipsDetail: resolvedShipsDetail,
      createdAt: new Date().toISOString()
    };

    saveSuratTugasToCloud(newPds);
    syncShipsToMasterKapal(newPds);

    // Update Surat Tugas state: Add new PDS and update status of linked SPS items
    setSuratTugas((prev) => {
      const updatedList = prev.map((item) => {
        if (linkedSpsIds.includes(item.id)) {
          const updatedSps = {
            ...item,
            status: 'Selesai',
            pdsId: newPdsId,
            tglMulai: cleaned.tglMulai || item.tglMulai,
            tglSelesai: cleaned.tglSelesai || item.tglSelesai,
            lokasi: cleaned.lokasi || item.lokasi
          };
          saveSuratTugasToCloud(updatedSps);
          return updatedSps;
        }
        return item;
      });
      const next = [newPds, ...updatedList];
      safeSetLocalStorage('st_surat_tugas', next);
      return next;
    });

    // 1. Generate 1 Kwitansi Honorarium for the combined PDS
    const newKwitansi = cleanEntityObject({
      id: `KW-${Date.now().toString().slice(-6)}`,
      suratId: newPdsId,
      nomorSurat: cleanDocNumber(newPds.nomor),
      namaKapal: newPds.namaKapal,
      penerima: newPds.petugas,
      lokasi: newPds.tempatSurvey || newPds.lokasi,
      tarifDasar: baseRate,
      biayaTiket: totalTicket,
      tiketHotel: ticketHotel,
      tiketPesawatTaxi: ticketTransport,
      kategoriTransportasi: newPds.kategoriTransportasi || 'Pesawat Terbang',
      fileTiketName: newPds.fileTiketTransportName || newPds.fileTiketName || '',
      fileFotoName: newPds.fileFotoName || '',
      fileFotoData: newPds.fileFotoData || '',
      fotoList: newPds.fotoList || [],
      fileVisitName: newPds.fileVisitName || '',
      fileKwitansiHotelName: newPds.fileKwitansiHotelName || '',
      jumlah: totalHonor,
      status: 'Belum Dibayar',
      shipsDetail: resolvedShipsDetail,
      tglBayar: newPds.tglMulai || new Date().toISOString().split('T')[0],
      catatan: `Honorarium Standar (${newPds.tempatSurvey || newPds.lokasi})`
    });
    setKwitansiHonor((prev) => [newKwitansi, ...prev]);
    saveKwitansiToCloud(newKwitansi);

    // ====== AUTO-GENERATE LAPORAN DISABLED ======
    // PDS sekarang sudah include NO.SO/NO.WBS, tidak perlu generate Laporan terpisah
    /*
    // 2. Generate 1 Laporan Perjalanan Dinas for the combined PDS HANYA jika sudah di-ACC
    if (newPds.approvalStatus === 'ACC') {
      const newLaporan = cleanEntityObject({
        id: `LAP-${Date.now().toString().slice(-6)}`,
        suratId: newPdsId,
        tglLapor: newPds.tglMulai || new Date().toISOString().split('T')[0],
        tanggal: newPds.tglMulai || new Date().toISOString().split('T')[0],
        namaKapal: newPds.namaKapal,
        lokasi: newPds.tempatSurvey || newPds.lokasi,
        lokasiSurvey: newPds.tempatSurvey || newPds.lokasi,
        nilai: totalHonor,
        tarifDasar: baseRate,
        namaSurvey: newPds.jenisSurvey || newPds.perihal || 'DINAS SURVEY KLAS',
        noAgenda: cleanDocNumber(newPds.noAgenda || newPds.nomor),
        noCda: newPds.noCda || '5100010',
        noSo: newPds.noSo || '',
        noWbs: newPds.noWbs || '',
        petugas: newPds.petugas,
        isCito: !!newPds.isCito,
        hasil: newPds.catatan || `Survei kelaiklautan kapal ${newPds.namaKapal}`,
        status: 'Terkirim',
        shipsDetail: resolvedShipsDetail,
        fileFotoName: newPds.fileFotoName || '',
        fileFotoData: newPds.fileFotoData || '',
        fotoList: newPds.fotoList || [],
        fileVisitName: newPds.fileVisitName || '',
        fileTiketTransportName: newPds.fileTiketTransportName || newPds.fileTiketName || '',
        fileKwitansiHotelName: newPds.fileKwitansiHotelName || ''
      });
      setLaporanSurvei((prev) => [newLaporan, ...prev]);
      saveLaporanToCloud(newLaporan);
    }
    */

    return newPds;
  };

  const updateSuratTugas = (id, updatedData) => {
    const cleanedData = cleanEntityObject(updatedData);
    let updatedItem = null;

    setSuratTugas((prev) => {
      const existing = prev.find((item) => item.id === id);
      const isPds = (cleanedData.docType || existing?.docType) === 'PDS' || cleanedData.isPds || existing?.isPds;

      // Pantau jika ada perubahan relasi SPS pada PDS saat diedit
      let newlyUnlinkedSpsIds = [];
      let newlyLinkedSpsIds = [];
      if (isPds && existing && Array.isArray(cleanedData.linkedSpsIds)) {
        const oldLinks = Array.isArray(existing.linkedSpsIds) ? existing.linkedSpsIds : [];
        const newLinks = cleanedData.linkedSpsIds;
        newlyUnlinkedSpsIds = oldLinks.filter((oid) => !newLinks.includes(oid));
        newlyLinkedSpsIds = newLinks.filter((nid) => !oldLinks.includes(nid));
      }

      const next = prev.map((item) => {
        if (item.id === id) {
          updatedItem = { ...item, ...cleanedData, nomor: cleanDocNumber(cleanedData.nomor || item.nomor) };
          saveSuratTugasToCloud(updatedItem);
          return updatedItem;
        }
        if (newlyUnlinkedSpsIds.includes(item.id)) {
          const unlinkedSps = { ...item, pdsId: null, pds_id: null, status: 'Menunggu Survei' };
          saveSuratTugasToCloud(unlinkedSps);
          return unlinkedSps;
        }
        if (newlyLinkedSpsIds.includes(item.id)) {
          const linkedSps = { ...item, pdsId: id, pds_id: id, status: 'Selesai' };
          saveSuratTugasToCloud(linkedSps);
          return linkedSps;
        }
        return item;
      });
      safeSetLocalStorage('st_surat_tugas', next);
      return next;
    });

    if (updatedItem) {
      syncShipsToMasterKapal(updatedItem);
    }

    // Auto-update linked Kwitansi Honor
    const baseRate = Number(cleanedData.tarifDasar) || 0;
    const ticketHotel = Number(cleanedData.tiketHotel) || 0;
    const ticketTransport = Number(cleanedData.tiketPesawatTaxi) || Number(cleanedData.biayaTiket) || 0;
    const totalTicket = ticketHotel + ticketTransport;
    const totalHonor = Number(cleanedData.jumlahEstimasi) || (baseRate + totalTicket);

    setKwitansiHonor((prev) => {
      const exists = prev.some((k) => k.suratId === id);
      if (exists) {
        return prev.map((k) => {
          if (k.suratId === id) {
            const updatedKw = cleanEntityObject({
              ...k,
              nomorSurat: cleanDocNumber(cleanedData.nomor || k.nomorSurat),
              namaKapal: cleanedData.namaKapal || k.namaKapal,
              penerima: cleanedData.petugas || k.penerima,
              lokasi: cleanedData.tempatSurvey || cleanedData.lokasi || k.lokasi,
              tarifDasar: baseRate,
              biayaTiket: totalTicket,
              tiketHotel: ticketHotel,
              tiketPesawatTaxi: ticketTransport,
              kategoriTransportasi: cleanedData.kategoriTransportasi || k.kategoriTransportasi,
              fileTiketName: cleanedData.fileTiketTransportName || cleanedData.fileTiketName || k.fileTiketName,
              fileFotoName: cleanedData.fileFotoName || k.fileFotoName,
              fileFotoData: cleanedData.fileFotoData || k.fileFotoData,
              fotoList: cleanedData.fotoList || k.fotoList,
              fileVisitName: cleanedData.fileVisitName || k.fileVisitName,
              fileKwitansiHotelName: cleanedData.fileKwitansiHotelName || k.fileKwitansiHotelName,
              jumlah: totalHonor
            });
            saveKwitansiToCloud(updatedKw);
            return updatedKw;
          }
          return k;
        });
      } else {
        const newKw = cleanEntityObject({
          id: `KW-${Date.now().toString().slice(-6)}`,
          suratId: id,
          nomorSurat: cleanDocNumber(cleanedData.nomor),
          namaKapal: cleanedData.namaKapal,
          penerima: cleanedData.petugas,
          lokasi: cleanedData.tempatSurvey || cleanedData.lokasi,
          tarifDasar: baseRate,
          biayaTiket: totalTicket,
          tiketHotel: ticketHotel,
          tiketPesawatTaxi: ticketTransport,
          kategoriTransportasi: cleanedData.kategoriTransportasi || 'Pesawat Terbang',
          fileTiketName: cleanedData.fileTiketTransportName || cleanedData.fileTiketName || '',
          fileFotoName: cleanedData.fileFotoName || '',
          fileFotoData: cleanedData.fileFotoData || '',
          fotoList: cleanedData.fotoList || [],
          fileVisitName: cleanedData.fileVisitName || '',
          fileKwitansiHotelName: cleanedData.fileKwitansiHotelName || '',
          jumlah: totalHonor,
          status: 'Belum Dibayar',
          tglBayar: cleanedData.tglMulai || new Date().toISOString().split('T')[0],
          catatan: `Honorarium Standar (${cleanedData.tempatSurvey || cleanedData.lokasi})`
        });
        saveKwitansiToCloud(newKw);
        return [newKw, ...prev];
      }
    });

    // ====== AUTO-UPDATE LAPORAN DISABLED ======
    // PDS sekarang sudah include NO.SO/NO.WBS, tidak perlu sync ke Laporan terpisah
    /*
    // Auto-update or create linked Laporan Survei ONLY if PDS is ACC
    const currentItem = suratTugas.find((s) => s.id === id) || {};
    const effectiveApproval = cleanedData.approvalStatus !== undefined ? cleanedData.approvalStatus : currentItem.approvalStatus;
    const isPdsDoc = currentItem.docType === 'PDS' || currentItem.isPds || cleanedData.docType === 'PDS' || cleanedData.isPds;
    const isAcc = effectiveApproval === 'ACC';

    setLaporanSurvei((prev) => {
      const exists = prev.some((l) => l.suratId === id);
      if (isPdsDoc) {
        if (isAcc) {
          if (exists) {
            return prev.map((l) => {
              if (l.suratId === id) {
                const updatedLap = cleanEntityObject({
                  ...l,
                  namaKapal: cleanedData.namaKapal || l.namaKapal,
                  lokasi: cleanedData.tempatSurvey || cleanedData.lokasi || l.lokasi,
                  lokasiSurvey: cleanedData.tempatSurvey || cleanedData.lokasi || l.lokasiSurvey,
                  nilai: totalHonor,
                  tarifDasar: baseRate,
                  namaSurvey: cleanedData.jenisSurvey || cleanedData.perihal || l.namaSurvey,
                  noAgenda: cleanDocNumber(cleanedData.noAgenda || cleanedData.nomor || l.noAgenda),
                  noCda: cleanedData.noCda || l.noCda || '5100010',
                  noSo: cleanedData.noSo || l.noSo || '',
                  petugas: cleanedData.petugas || l.petugas,
                  isCito: !!cleanedData.isCito,
                  tglLapor: cleanedData.tglMulai || l.tglLapor,
                  tanggal: cleanedData.tglMulai || l.tanggal,
                  fileFotoName: cleanedData.fileFotoName || l.fileFotoName,
                  fileFotoData: cleanedData.fileFotoData || l.fileFotoData,
                  fotoList: cleanedData.fotoList || l.fotoList,
                  fileVisitName: cleanedData.fileVisitName || l.fileVisitName,
                  fileTiketTransportName: cleanedData.fileTiketTransportName || cleanedData.fileTiketName || l.fileTiketTransportName,
                  fileKwitansiHotelName: cleanedData.fileKwitansiHotelName || l.fileKwitansiHotelName
                });
                saveLaporanToCloud(updatedLap);
                return updatedLap;
              }
              return l;
            });
          } else {
            const newLap = cleanEntityObject({
              id: `LAP-${Date.now().toString().slice(-6)}`,
              suratId: id,
              tglLapor: cleanedData.tglMulai || new Date().toISOString().split('T')[0],
              tanggal: cleanedData.tglMulai || new Date().toISOString().split('T')[0],
              namaKapal: cleanedData.namaKapal,
              lokasi: cleanedData.tempatSurvey || cleanedData.lokasi,
              lokasiSurvey: cleanedData.tempatSurvey || cleanedData.lokasi,
              nilai: totalHonor,
              tarifDasar: baseRate,
              namaSurvey: cleanedData.jenisSurvey || cleanedData.perihal || 'DINAS SURVEY KLAS',
              noAgenda: cleanDocNumber(cleanedData.noAgenda || cleanedData.nomor),
              noCda: cleanedData.noCda || '5100010',
              noSo: cleanedData.noSo || '',
              noWbs: cleanedData.noWbs || '',
              petugas: cleanedData.petugas,
              isCito: !!cleanedData.isCito,
              hasil: cleanedData.catatan || `Survei kelaiklautan kapal ${cleanedData.namaKapal}`,
              status: 'Terkirim',
              fileFotoName: cleanedData.fileFotoName || '',
              fileFotoData: cleanedData.fileFotoData || '',
              fotoList: cleanedData.fotoList || [],
              fileVisitName: cleanedData.fileVisitName || '',
              fileTiketTransportName: cleanedData.fileTiketTransportName || cleanedData.fileTiketName || '',
              fileKwitansiHotelName: cleanedData.fileKwitansiHotelName || ''
            });
            saveLaporanToCloud(newLap);
            return [newLap, ...prev];
          }
        } else {
          if (exists) {
            deleteLaporanFromCloud(id);
            return prev.filter((l) => l.suratId !== id);
          }
          return prev;
        }
      } else {
        if (exists) {
          return prev.map((l) => {
            if (l.suratId === id) {
              const updatedLap = cleanEntityObject({
                ...l,
                namaKapal: cleanedData.namaKapal || l.namaKapal,
                lokasi: cleanedData.tempatSurvey || cleanedData.lokasi || l.lokasi,
                lokasiSurvey: cleanedData.tempatSurvey || cleanedData.lokasi || l.lokasiSurvey,
                nilai: totalHonor,
                tarifDasar: baseRate,
                namaSurvey: cleanedData.jenisSurvey || cleanedData.perihal || l.namaSurvey,
                noAgenda: cleanDocNumber(cleanedData.noAgenda || cleanedData.nomor || l.noAgenda),
                petugas: cleanedData.petugas || l.petugas
              });
              saveLaporanToCloud(updatedLap);
              return updatedLap;
            }
            return l;
          });
        }
        return prev;
      }
    });
    */
  };

  const deleteSuratTugas = (id) => {
    const itemToDelete = suratTugas.find((item) => item.id === id);
    const isPds = itemToDelete && (itemToDelete.docType === 'PDS' || itemToDelete.isPds);
    const isSps = itemToDelete && (itemToDelete.docType === 'SPS' || itemToDelete.isSps);

    // 1. PASTIKAN NAMA KAPAL DARI DOKUMEN INI TETAP MASUK / TERSIMPAN DI DATABASE KAPAL (MASTER_KAPAL)
    // Nama kapal TIDAK AKAN HILANG, yang terhapus HANYA data surat/PDS-nya saja.
    if (itemToDelete) {
      syncShipsToMasterKapal(itemToDelete);
      deleteEntityFilesFromGoogleDrive(itemToDelete);
    }

    const relatedLaporan = laporanSurvei.filter((item) => item.suratId === id || item.id === id);
    const relatedKwitansi = kwitansiHonor.filter((item) => item.suratId === id || item.id === id);
    relatedLaporan.forEach(deleteEntityFilesFromGoogleDrive);
    relatedKwitansi.forEach(deleteEntityFilesFromGoogleDrive);

    // 2. JIKA YANG DIHAPUS ADALAH PDS:
    // SPS TERKAIT TIDAK BOLEH IKUT TERHAPUS ATAU HILANG!
    // KEMBALIKAN STATUS SPS KE 'Menunggu Survei' & HAPUS LINK pdsId-NYA
    let linkedSpsIdsToReset = [];
    if (isPds && itemToDelete) {
      const fromPdsLinks = Array.isArray(itemToDelete.linkedSpsIds) ? itemToDelete.linkedSpsIds : [];
      const fromPdsDbLinks = Array.isArray(itemToDelete.linked_sps_ids) ? itemToDelete.linked_sps_ids : [];
      linkedSpsIdsToReset = [...fromPdsLinks, ...fromPdsDbLinks];
    }

    setSuratTugas((prev) => {
      const next = prev
        .filter((item) => item.id !== id)
        .map((item) => {
          // Jika item ini adalah SPS yang terhubung ke PDS yang sedang dihapus
          const isLinkedSps =
            linkedSpsIdsToReset.includes(item.id) ||
            item.pdsId === id ||
            item.pds_id === id;

          if (isLinkedSps) {
            const restoredSps = {
              ...item,
              pdsId: null,
              pds_id: null,
              status: 'Menunggu Survei'
            };
            saveSuratTugasToCloud(restoredSps);
            return restoredSps;
          }

          // Jika yang dihapus adalah SPS dan item ini adalah parent PDS-nya
          if (isSps && itemToDelete?.pdsId && item.id === itemToDelete.pdsId) {
            const updatedLinked = (item.linkedSpsIds || []).filter((lid) => lid !== id);
            const updatedShipsDetail = Array.isArray(item.shipsDetail)
              ? item.shipsDetail.filter((sh) => sh.spsId !== id)
              : item.shipsDetail;
            const updatedPds = {
              ...item,
              linkedSpsIds: updatedLinked,
              shipsDetail: updatedShipsDetail
            };
            saveSuratTugasToCloud(updatedPds);
            return updatedPds;
          }

          return item;
        });

      safeSetLocalStorage('st_surat_tugas', next);
      return next;
    });

    setKwitansiHonor((prev) => prev.filter((item) => item.suratId !== id));
    setLaporanSurvei((prev) => prev.filter((item) => item.suratId !== id));
    deleteSuratTugasFromCloud(id);
    deleteKwitansiFromCloud(id);
    deleteLaporanFromCloud(id);
  };

  // CRUD Actions for Kwitansi Honor
  const addKwitansiHonor = (data) => {
    const cleaned = cleanEntityObject(data);
    const newKwitansi = {
      ...cleaned,
      id: `KW-${Date.now().toString().slice(-6)}`,
      jumlah: Number(cleaned.jumlah) || 0
    };
    setKwitansiHonor((prev) => [newKwitansi, ...prev]);
    saveKwitansiToCloud(newKwitansi);
    return newKwitansi;
  };

  const updateKwitansiHonor = (id, updatedData) => {
    const cleaned = cleanEntityObject(updatedData);
    setKwitansiHonor((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...cleaned, jumlah: Number(cleaned.jumlah) || item.jumlah };
          saveKwitansiToCloud(updated);
          return updated;
        }
        return item;
      })
    );
  };

  const deleteKwitansiHonor = (id) => {
    setKwitansiHonor((prev) => prev.filter((item) => item.id !== id));
    deleteKwitansiFromCloud(id);
  };

  // ====== DEPRECATED: Laporan Functions (Keep for backward compatibility) ======
  // NOTE: Sekarang PDS = Laporan. Functions ini hanya untuk edit data lama.
  const addLaporanSurvei = (data) => {
    const cleaned = cleanEntityObject(data);
    const newLaporan = {
      ...cleaned,
      id: `LAP-${Date.now().toString().slice(-6)}`
    };
    setLaporanSurvei((prev) => [newLaporan, ...prev]);
    saveLaporanToCloud(newLaporan);
    return newLaporan;
  };

  const updateLaporanSurvei = (id, updatedData) => {
    const cleaned = cleanEntityObject(updatedData);
    setLaporanSurvei((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...cleaned };
          saveLaporanToCloud(updated);
          return updated;
        }
        return item;
      })
    );
  };

  const deleteLaporanSurvei = (id) => {
    const itemToDelete = laporanSurvei.find((item) => item.id === id);
    if (itemToDelete) deleteEntityFilesFromGoogleDrive(itemToDelete);
    setLaporanSurvei((prev) => prev.filter((item) => item.id !== id));
    deleteLaporanFromCloud(id);
  };

  // Request & Approve Edit for locked laporan (24h SLA)
  const requestEditApproval = (id) => {
    setLaporanSurvei((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = {
            ...item,
            isEditRequested: true,
            editRequestDate: new Date().toISOString()
          };
          saveLaporanToCloud(updated);
          return updated;
        }
        return item;
      })
    );
  };

  const approveEditRequest = (id) => {
    setLaporanSurvei((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = {
            ...item,
            isEditRequested: false,
            isUnlockedByAdmin: true,
            unlockedAt: new Date().toISOString()
          };
          saveLaporanToCloud(updated);
          return updated;
        }
        return item;
      })
    );
  };

  // Hapus semua data operasional (SPS, PDS, Laporan, Kwitansi, Lampiran) baik lokal maupun di Cloud.
  // TETAP MENYIMPAN: Manajemen Tarif, Grade Tarif, Manajemen User, Database Kapal, dan Pengaturan Admin.
  const resetData = async () => {
    // 1. Clear operational states
    setSuratTugas([]);
    setKwitansiHonor([]);
    setLaporanSurvei([]);

    // 2. Clear operational localStorage
    localStorage.removeItem('st_surat_tugas');
    localStorage.removeItem('st_kwitansi_honor');
    localStorage.removeItem('st_laporan_survei');

    // 3. Clear from Cloud
    try {
      await clearOperationalDataFromCloud();
      console.log('[DataContext] Data SPS, PDS, Laporan, dan Kwitansi berhasil dibersihkan');
    } catch (error) {
      console.error('[DataContext] Error clearing operational data:', error);
    }
  };

  const resetDemoData = resetData;
  const clearAllDataKeepSettings = resetData;

  return (
    <DataContext.Provider
      value={{
        suratTugas,
        kwitansiHonor,
        laporanSurvei,
        tariffs,
        gradeTariffs,
        masterKapal,
        adminSettings,
        visitSurvei,
        addVisitSurvei,
        updateVisitSurvei,
        deleteVisitSurvei,
        updateAdminSettings,
        addTariff,
        updateTariff,
        deleteTariff,
        resetTariffs,
        addGradeTariff,
        updateGradeTariff,
        deleteGradeTariff,
        resetGradeTariffs,
        addMasterKapal,
        updateMasterKapal,
        deleteMasterKapal,
        addMasterKapalBatch,
        addSpsBatch,
        createPdsFromSurvey,
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
        resetData,
        resetDemoData,
        clearAllDataKeepSettings
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
