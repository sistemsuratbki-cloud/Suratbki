import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_SURAT_TUGAS,
  INITIAL_KWITANSI_HONOR,
  INITIAL_LAPORAN_SURVEI
} from '../utils/initialData';
import { INITIAL_LOCATION_TARIFFS, INITIAL_GRADE_TARIFFS } from '../utils/tariffData';
import { cleanDocNumber } from '../utils/formatters';

const cleanEntityObject = (item) => {
  if (!item || typeof item !== 'object') return item;
  const cleaned = {};
  for (const [k, v] of Object.entries(item)) {
    cleaned[k] = typeof v === 'string' ? cleanDocNumber(v) : v;
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

  const [adminSettings, setAdminSettings] = useState(() => {
    const saved = localStorage.getItem('st_admin_settings');
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      kepalaCabang: 'MUHSON NURROCHMAT',
      nup: '48199-KI',
      pembuatDaftar: 'RENZA MUHARAM',
      nupPembuatDaftar: '50382-KI',
      namaCabang: 'CABANG MADYA KLAS PONTIANAK',
      kacabSignatureUrl: '/signatures/kacab_muhson_signature.png',
      tatLuarKota: 750000,
      ...parsed
    };
  });

  // Sync to LocalStorage (Cleaned)
  useEffect(() => {
    const cleaned = suratTugas.map(cleanEntityObject);
    localStorage.setItem('st_surat_tugas', JSON.stringify(cleaned));
  }, [suratTugas]);

  useEffect(() => {
    const cleaned = kwitansiHonor.map(cleanEntityObject);
    localStorage.setItem('st_kwitansi_honor', JSON.stringify(cleaned));
  }, [kwitansiHonor]);

  useEffect(() => {
    const cleaned = laporanSurvei.map(cleanEntityObject);
    localStorage.setItem('st_laporan_survei', JSON.stringify(cleaned));
  }, [laporanSurvei]);

  useEffect(() => {
    localStorage.setItem('st_tariffs_v2', JSON.stringify(tariffs));
  }, [tariffs]);

  useEffect(() => {
    localStorage.setItem('st_grade_tariffs', JSON.stringify(gradeTariffs));
  }, [gradeTariffs]);

  useEffect(() => {
    localStorage.setItem('st_admin_settings', JSON.stringify(adminSettings));
  }, [adminSettings]);

  // Auto-sync / heal Kwitansi & Laporan only for PDS (Perjalanan Dinas Surveyor)
  useEffect(() => {
    if (suratTugas.length > 0) {
      let kwitansiUpdated = false;
      let laporanUpdated = false;
      const updatedKwitansiList = [...kwitansiHonor];
      const updatedLaporanList = [...laporanSurvei];

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

        // 2. Check Laporan Survei
        const existingLap = updatedLaporanList.find((l) => l.suratId === st.id);
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
            noSo: st.noSo || st.noOrder || `SO-${new Date().getFullYear()}/${Date.now().toString().slice(-5)}`,
            noWbs: st.noWbs || `WBS.BKI.PTK.${new Date().getFullYear()}.${Date.now().toString().slice(-3)}`,
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
      });

      if (kwitansiUpdated) {
        setKwitansiHonor(updatedKwitansiList.map(cleanEntityObject));
      }
      if (laporanUpdated) {
        setLaporanSurvei(updatedLaporanList.map(cleanEntityObject));
      }
    }
  }, [suratTugas]);

  const updateAdminSettings = (newSettings) => {
    setAdminSettings((prev) => ({
      ...prev,
      ...newSettings
    }));
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
    return newTariff;
  };

  const updateTariff = (id, updatedData) => {
    setTariffs((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              ...updatedData,
              name: updatedData.tujuan || updatedData.name || item.name,
              tujuan: updatedData.tujuan || updatedData.name || item.tujuan,
              rate: Number(updatedData.rate) !== undefined ? Number(updatedData.rate) : item.rate
            }
          : item
      )
    );
  };

  const deleteTariff = (id) => {
    setTariffs((prev) => prev.filter((item) => item.id !== id));
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
    return newGrade;
  };

  const updateGradeTariff = (id, updatedData) => {
    setGradeTariffs((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              ...updatedData,
              uangHarian: Number(updatedData.uangHarian) !== undefined ? Number(updatedData.uangHarian) : item.uangHarian
            }
          : item
      )
    );
  };

  const deleteGradeTariff = (id) => {
    setGradeTariffs((prev) => prev.filter((item) => item.id !== id));
  };

  const resetGradeTariffs = () => {
    setGradeTariffs(INITIAL_GRADE_TARIFFS);
    localStorage.setItem('st_grade_tariffs', JSON.stringify(INITIAL_GRADE_TARIFFS));
  };

  // ====== 1. ADMIN INPUT SPS (Batch or Single Ship) ======
  // Menerbitkan dokumen SPS per kapal sesuai inputan Admin (TIDAK ADA NO SURAT di SPS)
  const addSpsBatch = (baseData) => {
    const cleaned = cleanEntityObject(baseData);
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

      return cleanEntityObject({
        ...cleaned,
        id: spsId,
        batchId: batchId,
        nomor: null, // SPS tidak memiliki No Surat
        noAgenda: shipItem.noAgenda,
        agenda: shipItem.noAgenda,
        namaKapal: shipItem.namaKapal,
        docType: 'SPS',
        isSps: true,
        status: cleaned.status || 'Menunggu Survei',
        pdsId: null,
        createdAt: new Date().toISOString()
      });
    });

    setSuratTugas((prev) => [...createdSpsItems, ...prev]);
    return createdSpsItems;
  };

  // Backward compatibility alias for addSuratTugas
  const addSuratTugas = (data) => {
    // If it's explicitly an SPS or contains multiple ships, use addSpsBatch
    if (data.docType === 'SPS' || data.isSps || (!data.docType && data.status === 'Menunggu Survei')) {
      const items = addSpsBatch(data);
      return items[0];
    }

    // Direct PDS / Surat Tugas creation
    const newId = `ST-${Date.now().toString().slice(-6)}`;
    const cleanedData = cleanEntityObject(data);
    const newSurat = {
      ...cleanedData,
      id: newId,
      docType: cleanedData.docType || 'PDS',
      isPds: true,
      nomor: cleanDocNumber(cleanedData.nomor)
    };
    setSuratTugas((prev) => [newSurat, ...prev]);

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
      noSo: cleanedData.noSo || cleanedData.noOrder || `SO-${new Date().getFullYear()}/${Date.now().toString().slice(-5)}`,
      noWbs: cleanedData.noWbs || `WBS.BKI.PTK.${new Date().getFullYear()}.${Date.now().toString().slice(-3)}`,
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

    return newSurat;
  };

  // ====== 2. SURVEYOR SIMPAN SURVEI & TERBITKAN PDS ======
  // Menerbitkan 1 PDS untuk gabungan kapal yang disurvei di lokasi/dermaga yang sama
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
      nomor: cleanDocNumber(cleaned.nomor || `A 0    /SV.${Math.floor(Math.random() * 900) + 100}/PK/KI-26`),
      status: cleaned.status || 'Berjalan',
      linkedSpsIds: Array.isArray(linkedSpsIds) ? linkedSpsIds : [linkedSpsIds].filter(Boolean),
      shipsDetail: resolvedShipsDetail,
      createdAt: new Date().toISOString()
    };

    // Update Surat Tugas state: Add new PDS and update status of linked SPS items
    setSuratTugas((prev) => {
      const updatedList = prev.map((item) => {
        if (linkedSpsIds.includes(item.id)) {
          return {
            ...item,
            status: 'Selesai',
            pdsId: newPdsId,
            tglMulai: cleaned.tglMulai || item.tglMulai,
            tglSelesai: cleaned.tglSelesai || item.tglSelesai,
            lokasi: cleaned.lokasi || item.lokasi
          };
        }
        return item;
      });
      return [newPds, ...updatedList];
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

    // 2. Generate 1 Laporan Perjalanan Dinas for the combined PDS
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
      noSo: newPds.noSo || newPds.noOrder || `SO-${new Date().getFullYear()}/${Date.now().toString().slice(-5)}`,
      noWbs: newPds.noWbs || `WBS.BKI.PTK.${new Date().getFullYear()}.${Date.now().toString().slice(-3)}`,
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

    return newPds;
  };

  const updateSuratTugas = (id, updatedData) => {
    const cleanedData = cleanEntityObject(updatedData);
    setSuratTugas((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...cleanedData, nomor: cleanDocNumber(cleanedData.nomor || item.nomor) } : item))
    );

    // Auto-update linked Kwitansi Honor
    const baseRate = Number(cleanedData.tarifDasar) || 0;
    const ticketHotel = Number(cleanedData.tiketHotel) || 0;
    const ticketTransport = Number(cleanedData.tiketPesawatTaxi) || Number(cleanedData.biayaTiket) || 0;
    const totalTicket = ticketHotel + ticketTransport;
    const totalHonor = Number(cleanedData.jumlahEstimasi) || (baseRate + totalTicket);

    setKwitansiHonor((prev) => {
      const exists = prev.some((k) => k.suratId === id);
      if (exists) {
        return prev.map((k) =>
          k.suratId === id
            ? cleanEntityObject({
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
              })
            : k
        );
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
        return [newKw, ...prev];
      }
    });

    // Auto-update or create linked Laporan Survei
    setLaporanSurvei((prev) => {
      const exists = prev.some((l) => l.suratId === id);
      if (exists) {
        return prev.map((l) =>
          l.suratId === id
            ? cleanEntityObject({
                ...l,
                namaKapal: cleanedData.namaKapal || l.namaKapal,
                lokasi: cleanedData.tempatSurvey || cleanedData.lokasi || l.lokasi,
                lokasiSurvey: cleanedData.tempatSurvey || cleanedData.lokasi || l.lokasiSurvey,
                nilai: totalHonor,
                tarifDasar: baseRate,
                namaSurvey: cleanedData.jenisSurvey || cleanedData.perihal || l.namaSurvey,
                noAgenda: cleanDocNumber(cleanedData.noAgenda || cleanedData.nomor || l.noAgenda),
                noCda: cleanedData.noCda || l.noCda || '5100010',
                noSo: cleanedData.noSo || cleanedData.noOrder || l.noSo,
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
              })
            : l
        );
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
          noSo: cleanedData.noSo || cleanedData.noOrder || `SO-${new Date().getFullYear()}/${Date.now().toString().slice(-5)}`,
          noWbs: cleanedData.noWbs || `WBS.BKI.PTK.${new Date().getFullYear()}.${Date.now().toString().slice(-3)}`,
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
        return [newLap, ...prev];
      }
    });
  };

  const deleteSuratTugas = (id) => {
    setSuratTugas((prev) => prev.filter((item) => item.id !== id));
    setKwitansiHonor((prev) => prev.filter((item) => item.suratId !== id));
    setLaporanSurvei((prev) => prev.filter((item) => item.suratId !== id));
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
    return newKwitansi;
  };

  const updateKwitansiHonor = (id, updatedData) => {
    const cleaned = cleanEntityObject(updatedData);
    setKwitansiHonor((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, ...cleaned, jumlah: Number(cleaned.jumlah) || item.jumlah }
          : item
      )
    );
  };

  const deleteKwitansiHonor = (id) => {
    setKwitansiHonor((prev) => prev.filter((item) => item.id !== id));
  };

  // CRUD Actions for Laporan Survei
  const addLaporanSurvei = (data) => {
    const cleaned = cleanEntityObject(data);
    const newLaporan = {
      ...cleaned,
      id: `LAP-${Date.now().toString().slice(-6)}`
    };
    setLaporanSurvei((prev) => [newLaporan, ...prev]);
    return newLaporan;
  };

  const updateLaporanSurvei = (id, updatedData) => {
    const cleaned = cleanEntityObject(updatedData);
    setLaporanSurvei((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...cleaned } : item))
    );
  };

  const deleteLaporanSurvei = (id) => {
    setLaporanSurvei((prev) => prev.filter((item) => item.id !== id));
  };

  // Request & Approve Edit for locked laporan (24h SLA)
  const requestEditApproval = (id) => {
    setLaporanSurvei((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isEditRequested: true,
              editRequestDate: new Date().toISOString()
            }
          : item
      )
    );
  };

  const approveEditRequest = (id) => {
    setLaporanSurvei((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isEditRequested: false,
              isUnlockedByAdmin: true,
              unlockedAt: new Date().toISOString()
            }
          : item
      )
    );
  };

  const resetDemoData = () => {
    setSuratTugas([]);
    setKwitansiHonor([]);
    setLaporanSurvei([]);
    setTariffs(INITIAL_LOCATION_TARIFFS);
    setGradeTariffs(INITIAL_GRADE_TARIFFS);
    localStorage.removeItem('st_surat_tugas');
    localStorage.removeItem('st_kwitansi_honor');
    localStorage.removeItem('st_laporan_survei');
    localStorage.removeItem('st_tariffs');
    localStorage.removeItem('st_grade_tariffs');
  };

  return (
    <DataContext.Provider
      value={{
        suratTugas,
        kwitansiHonor,
        laporanSurvei,
        tariffs,
        gradeTariffs,
        adminSettings,
        updateAdminSettings,
        addTariff,
        updateTariff,
        deleteTariff,
        resetTariffs,
        addGradeTariff,
        updateGradeTariff,
        deleteGradeTariff,
        resetGradeTariffs,
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
        resetDemoData
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
