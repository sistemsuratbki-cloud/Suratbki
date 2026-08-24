import { supabase } from '../lib/supabase';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Save,
  Anchor,
  Ticket,
  Printer,
  Sparkles,
  MapPin,
  Calendar,
  FileText,
  Camera,
  FileCheck2,
  Plane,
  Receipt,
  Trash2,
  Layers,
  Calculator,
  AlertCircle,
  Clock,
  Plus,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  Lock,
  Unlock,
  Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatRupiah, cleanDocNumber, isDocumentLocked } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';
import { sanitizeFormData, validateFileUpload } from '../utils/security';
import MultiPhotoUpload from './MultiPhotoUpload';
import ShipDatabaseSearchSelect from './ShipDatabaseSearchSelect';
import { getLocationCategory, findTariffByLocation } from '../utils/tariffData';
import { extractShipDatabase } from '../utils/shipDatabase';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { ShipAttachmentsUpload } from './ShipAttachmentsUpload';

export const PdsModal = ({ isOpen, onClose, editItem = null, onPrint = null }) => {
  const { suratTugas, laporanSurvei, createPdsFromSurvey, updateSuratTugas, adminSettings, tariffs, gradeTariffs } = useData();
  const { usersList, currentUser, role } = useAuth();

  const isAdmin = role === 'admin' || role === 'developer' || role === 'kacab';
  const isLocked = Boolean(editItem && isDocumentLocked(editItem, 3) && !editItem.isUnlockedByAdmin);

  const activeTariffs = tariffs && tariffs.length > 0 ? tariffs : [];
  const defaultLocation = activeTariffs[0]?.tujuan || activeTariffs[0]?.name || 'WAJOK';
  const defaultRate = activeTariffs[0]?.rate || 500000;

  const shipDatabase = useMemo(
    () => extractShipDatabase(suratTugas, laporanSurvei),
    [suratTugas, laporanSurvei]
  );

  const surveyorUsers = useMemo(
    () => (usersList || []).filter((u) => u.role === 'surveyor' || u.role === 'kacab'),
    [usersList]
  );

  // Available pending SPS items for linking
  const availableSpsItems = useMemo(() => {
    return (suratTugas || []).filter(
      (st) => (st.docType === 'SPS' || st.isSps || (!st.docType && st.status === 'Menunggu Survei')) && !st.pdsId && st.status !== 'Selesai'
    );
  }, [suratTugas]);

  const [selectedSpsIds, setSelectedSpsIds] = useState([]);
  const [shipsDetail, setShipsDetail] = useState([]);
  const [isSpsDropboxOpen, setIsSpsDropboxOpen] = useState(false);
  const [spsSearchTerm, setSpsSearchTerm] = useState('');
  const spsContainerRef = useRef(null);

  // Attachment Preview Modal State
  const [previewAttachment, setPreviewAttachment] = useState({ isOpen: false, title: '', fileData: null, fileName: '' });

  // Close SPS Dropbox when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (spsContainerRef.current && !spsContainerRef.current.contains(e.target)) {
        setIsSpsDropboxOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSpsItems = useMemo(() => {
    if (!spsSearchTerm.trim()) return availableSpsItems;
    const term = spsSearchTerm.toLowerCase();
    return availableSpsItems.filter(
      (sps) =>
        (sps.namaKapal || '').toLowerCase().includes(term) ||
        (sps.noAgenda || sps.agenda || '').toLowerCase().includes(term) ||
        (sps.lokasi || sps.tempatSurvey || '').toLowerCase().includes(term) ||
        (sps.petugas || '').toLowerCase().includes(term)
    );
  }, [availableSpsItems, spsSearchTerm]);

  const [formData, setFormData] = useState({
    nomor: '',
    namaKapal: '',
    pemohon: '',
    jenisSurvey: 'DINAS SURVEY KLAS',
    perihal: 'DINAS SURVEY KLAS',
    lokasi: defaultLocation,
    tempatSurvey: defaultLocation,
    tglMulai: '',
    tglSelesai: '',
    noOrder: 'RFQ-0000',
    jumlahHariLibur: 0,
    tiketHotel: 0,
    tiketPesawatTaxi: 0,
    petugas: '',
    pangkat: 'GRADE 6 A',
    jabatan: 'SURVEYOR',
    tarifDasar: defaultRate,
    isCito: false,
    biayaTiket: 0,
    kategoriTransportasi: 'Pesawat Terbang',
    kategoriPerjalanan: 'Dalam Kota',
    saranaTransportasi: 'DARAT DAN AIR',
    keteranganLain: 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
    kepalaCabang: adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
    nup: adminSettings?.nup || '48199-KI',
    biayaTAT: 0,
    tanpaTAT: false,
    tanpaUangHarian: false,
    hariTanpaUangHarian: 0,
    // Uploads
    fileFotoName: '',
    fileFotoData: '',
    fotoList: [],
    fileVisitName: '',
    fileTiketTransportName: '',
    fileKwitansiHotelName: '',
    status: 'Berjalan',
    catatan: '',
    visit: '1',
    tembusan: '1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026'
  });

  const [isUploadingTiket, setIsUploadingTiket] = useState(false);
  const [isUploadingHotel, setIsUploadingHotel] = useState(false);
  const [isUploadingVisit, setIsUploadingVisit] = useState(false);

  // Initialize or load editItem
  useEffect(() => {
    if (editItem) {
      const editLoc = editItem.lokasi || editItem.tempatSurvey || defaultLocation;
      const matchedTariff = findTariffByLocation(editLoc, activeTariffs);
      const editCategory = editItem.kategoriPerjalanan || matchedTariff?.kategori || getLocationCategory(editLoc, activeTariffs);

      // Load ships detail if any
      const existingShips = editItem.shipsDetail || [];
      setShipsDetail(existingShips);
      setSelectedSpsIds(editItem.linkedSpsIds || []);

      setFormData({
        ...editItem,
        nomor: cleanDocNumber(editItem.nomor || `A 0    /SV.${Math.floor(Math.random() * 900) + 100}/PK/KI-26`),
        namaKapal: editItem.namaKapal || '',
        pemohon: editItem.pemohon || '',
        jenisSurvey: (editItem.jenisSurvey || 'DINAS SURVEY KLAS').toUpperCase(),
        perihal: (editItem.perihal || 'DINAS SURVEY KLAS').toUpperCase(),
        lokasi: editLoc.toUpperCase(),
        tempatSurvey: editLoc.toUpperCase(),
        noOrder: editItem.noOrder || 'RFQ-0000',
        jumlahHariLibur: editItem.jumlahHariLibur !== undefined ? Number(editItem.jumlahHariLibur) : 0,
        tiketHotel: Number(editItem.tiketHotel) || 0,
        tiketPesawatTaxi: Number(editItem.tiketPesawatTaxi) || Number(editItem.biayaTiket) || 0,
        kategoriPerjalanan: editCategory,
        pangkat: editItem.pangkat || 'GRADE 6 A',
        jabatan: editItem.jabatan || 'SURVEYOR',
        saranaTransportasi: editItem.saranaTransportasi || (editCategory === 'Dalam Kota' ? 'DARAT DAN AIR' : 'UDARA, DARAT DAN AIR'),
        tarifDasar: Number(editItem.tarifDasar) || (matchedTariff ? Number(matchedTariff.rate) : defaultRate),
        tanpaTAT: !!editItem.tanpaTAT,
        biayaTAT: editItem.biayaTAT !== undefined ? Number(editItem.biayaTAT) : (editCategory === 'Luar Kota' ? Number(adminSettings?.tatLuarKota || 750000) : 0),
        tanpaUangHarian: !!editItem.tanpaUangHarian,
        hariTanpaUangHarian: Number(editItem.hariTanpaUangHarian) || 0,
        fileFotoName: editItem.fileFotoName || '',
        fileFotoData: editItem.fileFotoData || '',
        fotoList: editItem.fotoList || [],
        fileVisitName: editItem.fileVisitName || '',
        fileTiketTransportName: editItem.fileTiketTransportName || editItem.fileTiketName || '',
        fileKwitansiHotelName: editItem.fileKwitansiHotelName || '',
        status: editItem.status || 'Berjalan',
        catatan: editItem.catatan || '',
        visit: editItem.visit || '1',
        tembusan: editItem.tembusan || '1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026'
      });
    } else {
      const nextNum = String(Math.floor(Math.random() * 900) + 100);
      const defaultSurveyor = currentUser?.name || surveyorUsers[0]?.name || 'ALFIAN BONE PUTRA';
      const userGrade = surveyorUsers.find((u) => u.name === defaultSurveyor)?.grade || 'GRADE 6 A';
      const todayDate = new Date().toISOString().split('T')[0];

      const initialLoc = defaultLocation || 'WAJOK';
      const matchedInitial = findTariffByLocation(initialLoc, activeTariffs);
      const initialRate = matchedInitial ? Number(matchedInitial.rate) : defaultRate;
      const initialCategory = matchedInitial?.kategori || getLocationCategory(initialLoc, activeTariffs);

      setSelectedSpsIds([]);
      setShipsDetail([]);

      setFormData({
        nomor: `A 0    /SV.${nextNum}/PK/KI-26`,
        namaKapal: '',
        pemohon: '',
        jenisSurvey: 'DINAS SURVEY KLAS',
        perihal: 'DINAS SURVEY KLAS',
        petugas: defaultSurveyor,
        pangkat: userGrade,
        jabatan: 'SURVEYOR',
        lokasi: initialLoc.toUpperCase(),
        tempatSurvey: initialLoc.toUpperCase(),
        tarifDasar: initialRate,
        tglMulai: todayDate,
        tglSelesai: todayDate,
        noOrder: `RFQ260${String(Math.floor(Math.random() * 900) + 100)}`,
        jumlahHariLibur: 0,
        tiketHotel: 0,
        tiketPesawatTaxi: 0,
        kategoriTransportasi: 'Pesawat Terbang',
        kategoriPerjalanan: initialCategory,
        saranaTransportasi: initialCategory === 'Dalam Kota' ? 'DARAT DAN AIR' : 'UDARA, DARAT DAN AIR',
        keteranganLain: 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
        kepalaCabang: adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
        nup: adminSettings?.nup || '48199-KI',
        biayaTAT: initialCategory === 'Luar Kota' ? Number(adminSettings?.tatLuarKota || 750000) : 0,
        tanpaTAT: false,
        tanpaUangHarian: false,
        hariTanpaUangHarian: 0,
        fileFotoName: '',
        fileFotoData: '',
        fotoList: [],
        fileVisitName: '',
        fileTiketTransportName: '',
        fileKwitansiHotelName: '',
        status: 'Berjalan',
        catatan: '',
        visit: '1',
        tembusan: '1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026'
      });
    }
  }, [editItem, isOpen, defaultLocation, defaultRate, currentUser, surveyorUsers, adminSettings]);

  // Handle SPS Selection
  const handleToggleSps = (sps) => {
    if (!sps || !sps.id) return;
    const isSelected = selectedSpsIds.includes(sps.id);
    let newIds = [];
    if (isSelected) {
      newIds = selectedSpsIds.filter((id) => id !== sps.id);
    } else {
      newIds = [...selectedSpsIds, sps.id];
    }
    setSelectedSpsIds(newIds);

    const allSpsPool = suratTugas || [];
    const selectedItems = allSpsPool.filter((st) => st && newIds.includes(st.id));
    const newShipsDetail = selectedItems.map((st) => ({
      spsId: st.id,
      namaKapal: st.namaKapal || '',
      noAgenda: st.noAgenda || st.agenda || '',
      noOrder: st.noOrder || formData.noOrder || 'RFQ-0000',
      pemohon: st.pemohon || formData.pemohon || ''
    }));
    setShipsDetail(newShipsDetail);

    // Auto update combined namaKapal, lokasi, pemohon
    if (selectedItems.length > 0) {
      const combinedNames = selectedItems.map((s) => s.namaKapal).filter(Boolean).join(', ');
      const firstSps = selectedItems[0];
      const spsLoc = firstSps?.lokasi || firstSps?.tempatSurvey || formData.lokasi || '';
      const matchedTariff = findTariffByLocation(spsLoc, activeTariffs);
      const cat = matchedTariff?.kategori || getLocationCategory(spsLoc, activeTariffs);

      setFormData((prev) => ({
        ...prev,
        namaKapal: combinedNames,
        pemohon: firstSps?.pemohon || prev.pemohon,
        lokasi: spsLoc ? String(spsLoc).toUpperCase() : prev.lokasi,
        tempatSurvey: spsLoc ? String(spsLoc).toUpperCase() : prev.tempatSurvey,
        tarifDasar: matchedTariff ? Number(matchedTariff.rate) : prev.tarifDasar,
        kategoriPerjalanan: cat,
        saranaTransportasi: cat === 'Dalam Kota' ? 'DARAT DAN AIR' : 'UDARA, DARAT DAN AIR',
        biayaTAT: cat === 'Luar Kota' && !prev.tanpaTAT ? Number(adminSettings?.tatLuarKota || 750000) : 0,
        tglMulai: firstSps?.tglMulai || prev.tglMulai,
        tglSelesai: firstSps?.tglSelesai || firstSps?.tglMulai || prev.tglSelesai,
        petugas: firstSps?.petugas || prev.petugas
      }));
    }
  };

  const handleSelectAllSps = () => {
    const allIds = availableSpsItems.map((s) => s.id);
    setSelectedSpsIds(allIds);

    const newShipsDetail = availableSpsItems.map((st) => ({
      spsId: st.id,
      namaKapal: st.namaKapal || '',
      noAgenda: st.noAgenda || st.agenda || '',
      noOrder: st.noOrder || formData.noOrder || 'RFQ-0000',
      pemohon: st.pemohon || formData.pemohon || ''
    }));
    setShipsDetail(newShipsDetail);

    if (availableSpsItems.length > 0) {
      const combinedNames = availableSpsItems.map((s) => s.namaKapal).filter(Boolean).join(', ');
      const firstSps = availableSpsItems[0];
      const spsLoc = firstSps?.lokasi || firstSps?.tempatSurvey || formData.lokasi || '';
      const matchedTariff = findTariffByLocation(spsLoc, activeTariffs);
      const cat = matchedTariff?.kategori || getLocationCategory(spsLoc, activeTariffs);

      setFormData((prev) => ({
        ...prev,
        namaKapal: combinedNames,
        pemohon: firstSps?.pemohon || prev.pemohon,
        lokasi: spsLoc ? String(spsLoc).toUpperCase() : prev.lokasi,
        tempatSurvey: spsLoc ? String(spsLoc).toUpperCase() : prev.tempatSurvey,
        tarifDasar: matchedTariff ? Number(matchedTariff.rate) : prev.tarifDasar,
        kategoriPerjalanan: cat,
        saranaTransportasi: cat === 'Dalam Kota' ? 'DARAT DAN AIR' : 'UDARA, DARAT DAN AIR',
        biayaTAT: cat === 'Luar Kota' && !prev.tanpaTAT ? Number(adminSettings?.tatLuarKota || 750000) : 0,
        tglMulai: firstSps?.tglMulai || prev.tglMulai,
        tglSelesai: firstSps?.tglSelesai || firstSps?.tglMulai || prev.tglSelesai,
        petugas: firstSps?.petugas || prev.petugas
      }));
    }
  };

  const handleClearAllSps = () => {
    setSelectedSpsIds([]);
    setShipsDetail([]);
    setFormData((prev) => ({
      ...prev,
      namaKapal: ''
    }));
  };

  // Select ship directly from database (Auto-fills No Agenda, Lokasi, No Order - exclude pemohon)
  const handleSelectShipFromDatabase = (foundShip) => {
    if (!foundShip) return;

    const shipNameUpper = String(foundShip.namaKapal || '').trim().toUpperCase();
    if (!shipNameUpper) return;

    const exists = shipsDetail.some((s) => String(s.namaKapal || '').trim().toUpperCase() === shipNameUpper);
    let updatedDetails = [];

    if (exists) {
      updatedDetails = shipsDetail.map((s) =>
        String(s.namaKapal || '').trim().toUpperCase() === shipNameUpper
          ? { ...s, noAgenda: foundShip.noAgenda, noOrder: foundShip.noOrder }
          : s
      );
    } else {
      updatedDetails = [
        ...shipsDetail,
        {
          namaKapal: shipNameUpper,
          noAgenda: foundShip.noAgenda || '',
          noOrder: foundShip.noOrder || formData.noOrder || 'RFQ-0000',
          pemohon: formData.pemohon || '',
          spsId: foundShip.spsId || null
        }
      ];
    }
    setShipsDetail(updatedDetails);

    const combinedNames = updatedDetails.map((s) => s.namaKapal).filter(Boolean).join(', ');
    const firstShip = updatedDetails[0];

    // Lokasi TIDAK di-auto-fill dari database kapal karena kapal bisa pindah dok sewaktu-waktu
    setFormData((prev) => ({
      ...prev,
      namaKapal: combinedNames,
      noAgenda: firstShip?.noAgenda || foundShip.noAgenda || prev.noAgenda,
      noOrder: foundShip.noOrder || prev.noOrder
    }));
  };

  const handleDirectShipNameChange = (val) => {
    const upperVal = String(val || '').toUpperCase();
    const match = (shipDatabase || []).find((s) => String(s?.namaKapal || '').trim().toUpperCase() === upperVal.trim());

    // Lokasi TIDAK di-auto-fill dari database kapal karena kapal bisa pindah dok sewaktu-waktu
    if (match) {
      setFormData((prev) => ({
        ...prev,
        namaKapal: upperVal,
        noAgenda: match.noAgenda || prev.noAgenda,
        noOrder: match.noOrder || prev.noOrder
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        namaKapal: upperVal
      }));
    }
  };

  const handleRemoveShipFromDetail = (namaKapal) => {
    const updated = shipsDetail.filter((s) => s.namaKapal !== namaKapal);
    setShipsDetail(updated);
    setFormData((prev) => ({
      ...prev,
      namaKapal: updated.map((s) => s.namaKapal).join(', ')
    }));
  };

  // Location Change
  const handleLocationChange = (locName) => {
    const matched = findTariffByLocation(locName, activeTariffs);
    const newRate = matched ? Number(matched.rate) : formData.tarifDasar;
    const newCategory = matched?.kategori || getLocationCategory(locName, activeTariffs);
    const tat = newCategory === 'Luar Kota' && !formData.tanpaTAT ? Number(adminSettings?.tatLuarKota || 750000) : 0;

    setFormData((prev) => ({
      ...prev,
      lokasi: locName.toUpperCase(),
      tempatSurvey: locName.toUpperCase(),
      tarifDasar: newRate,
      kategoriPerjalanan: newCategory,
      biayaTAT: tat,
      saranaTransportasi: newCategory === 'Dalam Kota' ? 'DARAT DAN AIR' : 'UDARA, DARAT DAN AIR'
    }));

    // Re-adjust split fees evenly if multiple ships exist
    if (shipsDetail.length > 1) {
      const count = shipsDetail.length;
      const perShip = Math.floor(newRate / count);
      const remainder = newRate - (perShip * count);
      setShipsDetail(shipsDetail.map((s, idx) => ({
        ...s,
        biayaSurvei: idx === count - 1 ? perShip + remainder : perShip
      })));
    }
  };

  // Date Calculation: Days, Nights, Weekend holidays
  const { totalDays, totalNights, autoHolidays } = useMemo(() => {
    if (!formData.tglMulai || !formData.tglSelesai) {
      return { totalDays: 1, totalNights: 0, autoHolidays: 0 };
    }
    const start = new Date(formData.tglMulai);
    const end = new Date(formData.tglSelesai);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
    const hr = diff > 0 ? diff : 1;
    const mlm = Math.max(0, hr - 1);

    let hLibur = 0;
    if (!isNaN(start) && !isNaN(end)) {
      const cur = new Date(start);
      while (cur <= end) {
        const day = cur.getDay();
        if (day === 0 || day === 6) hLibur++;
        cur.setDate(cur.getDate() + 1);
      }
    }

    return { totalDays: hr, totalNights: mlm, autoHolidays: hLibur };
  }, [formData.tglMulai, formData.tglSelesai]);

  // Sync automatic holidays count when dates change if not edited
  useEffect(() => {
    if (!editItem) {
      setFormData((prev) => ({
        ...prev,
        jumlahHariLibur: autoHolidays
      }));
    }
  }, [autoHolidays, editItem]);

  // Surveyor change -> sync grade
  const handleSurveyorChange = (name) => {
    const user = surveyorUsers.find((u) => u.name === name);
    const grade = user?.grade || 'GRADE 6 A';
    setFormData((prev) => ({
      ...prev,
      petugas: name,
      pangkat: grade
    }));
  };

  // Honorarium and Expense Calculations
  const calculations = useMemo(() => {
    const isLuarKota = formData.kategoriPerjalanan === 'Luar Kota';
    const hr = totalDays;
    const mlm = totalNights;

    const gradeData = (gradeTariffs || []).find(
      (g) => (g.grade || '').replace(/\s+/g, '').toUpperCase() === (formData.pangkat || 'GRADE 6 A').replace(/\s+/g, '').toUpperCase()
    ) || {};

    let sisaHariUangHarian = hr;
    if (formData.tanpaUangHarian) {
      const deduct = formData.hariTanpaUangHarian !== undefined ? Number(formData.hariTanpaUangHarian) : hr;
      sisaHariUangHarian = Math.max(0, hr - Math.max(0, Math.min(deduct, hr)));
    }

    const uangHarianRate = formData.tanpaUangHarian && sisaHariUangHarian === 0 ? 0 : (Number(gradeData.uangHarian) || 300000);
    const uangHarianTotal = uangHarianRate * sisaHariUangHarian;
    const uangHotelRate = Number(formData.tiketHotel) || 0;
    const uangHotelTotal = uangHotelRate * mlm;

    const hrLibur = Number(formData.jumlahHariLibur) || 0;
    const hrLbrTotal = formData.tanpaUangHarian && sisaHariUangHarian === 0 ? 0 : hrLibur * uangHarianRate * 0.5;

    const tiketTransport = Number(formData.tiketPesawatTaxi) || 0;
    const tat = formData.tanpaTAT ? 0 : Number(formData.biayaTAT || (isLuarKota ? (adminSettings?.tatLuarKota || 750000) : 0));
    const rateSK = Number(formData.tarifDasar) || 0;

    let totalBiaya = 0;
    if (isLuarKota) {
      totalBiaya = tiketTransport + tat + rateSK + uangHarianTotal + uangHotelTotal + hrLbrTotal;
    } else {
      totalBiaya = rateSK + uangHarianTotal + uangHotelTotal + hrLbrTotal;
    }

    return {
      hr,
      mlm,
      hrLibur,
      uangHarianRate,
      uangHarianTotal,
      uangHotelTotal,
      hrLbrTotal,
      tiketTransport,
      tat,
      rateSK,
      totalBiaya
    };
  }, [formData, totalDays, totalNights, gradeTariffs, adminSettings]);

  const targetEstimasiTotal = calculations.totalBiaya;

  // Helper for multi-ship fee split from total estimasi biaya
  const handleAutoSplitTariff = () => {
    if (shipsDetail.length === 0) return;
    const count = shipsDetail.length;
    const totalEstimasi = Number(targetEstimasiTotal) || 0;
    const perShip = Math.floor(totalEstimasi / count);
    const remainder = totalEstimasi - (perShip * count);

    const updated = shipsDetail.map((s, idx) => ({
      ...s,
      biayaSurvei: idx === count - 1 ? perShip + remainder : perShip
    }));
    setShipsDetail(updated);
    toast.success(`Estimasi biaya surat tugas ${formatRupiah(totalEstimasi)} berhasil dibagi rata ke ${count} kapal.`);
  };

  const totalPembagianKapal = useMemo(() => {
    if (shipsDetail.length <= 1) return targetEstimasiTotal;
    return shipsDetail.reduce((sum, s) => sum + (Number(s.biayaSurvei) || 0), 0);
  }, [shipsDetail, targetEstimasiTotal]);

  const selisihPembagian = totalPembagianKapal - targetEstimasiTotal;
  const isPembagianValid = shipsDetail.length <= 1 || selisihPembagian === 0;

  // File Upload Handlers with Security & Size Validation
  const handleFileUpload = async (fieldKey, file) => {
    if (!file) return;

    const validation = validateFileUpload(file, 3 * 1024 * 1024);
    if (!validation.isValid) {
      toast.error(validation.message);
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${fieldKey}_${Date.now()}.${fileExt}`;
    const filePath = `pds/${fileName}`;

    if (fieldKey === 'tiketTransport') setIsUploadingTiket(true);
    if (fieldKey === 'kwitansiHotel') setIsUploadingHotel(true);
    if (fieldKey === 'visit') setIsUploadingVisit(true);

    try {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase.storage.from('lampiran').upload(filePath, file);
      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from('lampiran').getPublicUrl(filePath);
      const url = publicUrlData.publicUrl;

      if (fieldKey === 'tiketTransport') setFormData((prev) => ({ ...prev, fileTiketTransportName: url }));
      if (fieldKey === 'kwitansiHotel') setFormData((prev) => ({ ...prev, fileKwitansiHotelName: url }));
      if (fieldKey === 'visit') setFormData((prev) => ({ ...prev, fileVisitName: url }));
    } catch (err) {
      console.warn('Fallback to base64 for file:', file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (fieldKey === 'tiketTransport') setFormData((prev) => ({ ...prev, fileTiketTransportName: reader.result }));
        if (fieldKey === 'kwitansiHotel') setFormData((prev) => ({ ...prev, fileKwitansiHotelName: reader.result }));
        if (fieldKey === 'visit') setFormData((prev) => ({ ...prev, fileVisitName: reader.result }));
      };
      reader.readAsDataURL(file);
    } finally {
      if (fieldKey === 'tiketTransport') setIsUploadingTiket(false);
      if (fieldKey === 'kwitansiHotel') setIsUploadingHotel(false);
      if (fieldKey === 'visit') setIsUploadingVisit(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (editItem && isDocumentLocked(editItem, 3)) {
      toast.error('Dokumen ini terkunci (melewati batas 3 hari pengisian). Buka kunci terlebih dahulu untuk menyimpan perubahan.');
      return;
    }

    if (!formData.nomor || !formData.nomor.trim()) {
      alert('Nomor Surat PDS wajib diisi!');
      return;
    }

    if (!formData.namaKapal || !formData.namaKapal.trim()) {
      alert('Nama Kapal wajib diisi!');
      return;
    }

    // Validation for multi-ship fee splitting
    if (shipsDetail.length > 1 && !isPembagianValid) {
      const selisih = Math.abs(selisihPembagian);
      const statusText = selisihPembagian < 0 ? 'kurang' : 'lebih';
      toast.error(`Gagal Terbitkan PDS! Total alokasi biaya kapal (${formatRupiah(totalPembagianKapal)}) ${statusText} ${formatRupiah(selisih)} dari estimasi biaya surat tugas (${formatRupiah(targetEstimasiTotal)}). Mohon sesuaikan nominal pembagian biaya agar pas.`);
      return;
    }

    const payload = sanitizeFormData({
      ...formData,
      docType: 'PDS',
      isPds: true,
      jumlahEstimasi: calculations.totalBiaya,
      biayaTiket: Number(formData.tiketPesawatTaxi) + Number(formData.tiketHotel),
      linkedSpsIds: selectedSpsIds,
      shipsDetail: shipsDetail.length > 0 ? shipsDetail : [
        {
          namaKapal: formData.namaKapal.toUpperCase(),
          noAgenda: formData.noAgenda || '-',
          noOrder: formData.noOrder || '-',
          biayaSurvei: calculations.totalBiaya
        }
      ]
    });

    if (editItem) {
      // Jika PDS sebelumnya berstatus Revisi, reset approval agar admin bisa review ulang
      if (editItem.approvalStatus === 'Revisi') {
        payload.approvalStatus = null;
        payload.approvalNote = '';
        payload.approvalBy = null;
        payload.approvalAt = null;
      }
      updateSuratTugas(editItem.id, payload);
    } else {
      createPdsFromSurvey(payload, selectedSpsIds);
    }

    onClose();
  };

  return (
    <ModalPortal>
      <div 
        className="modal-overlay" 
        onClick={onClose} 
        style={{ 
          padding: '0.5rem',
          alignItems: 'flex-start',
          paddingTop: '2vh'
        }}
      >
        <div
          className="modal-content"
          style={{ 
            maxWidth: '1200px !important', 
            width: '98vw !important', 
            height: 'auto !important',
            maxHeight: '96vh !important',
            display: 'flex !important',
            flexDirection: 'column !important',
            margin: '0 auto !important'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="modal-header" style={{ flexShrink: 0 }}>
            <div className="card-title-group">
              <FileText size={24} style={{ color: 'var(--accent-primary)' }} />
              <div>
                <h3 className="modal-title">
                  {editItem ? (isLocked ? 'Lihat Perjalanan Dinas Surveyor (PDS) — [Terkunci]' : 'Edit Perjalanan Dinas Surveyor (PDS)') : 'Input Perjalanan Dinas Surveyor (PDS)'}
                </h3>
                <div className="card-subtitle">
                  {isLocked ? 'Mode Lihat Data (Read-Only) — Dokumen Terkunci' : 'Penomoran Surat Resmi & Kalkulasi Biaya Perjalanan Dinas'}
                </div>
              </div>
            </div>
            <button className="btn btn-secondary btn-icon" onClick={onClose} type="button">
              <X size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="modal-body" style={{ flex: '1 1 auto', overflowY: 'auto', padding: '1.5rem', minHeight: 0 }}>
            <form onSubmit={handleSubmit}>
              {/* Lock Warning Banner */}
              {isLocked && (
                <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#991b1b', fontSize: '0.84rem' }}>
                  <Lock size={20} color="#dc2626" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#b91c1c' }}>Dokumen Terkunci (Batas 3 Hari):</strong> Seluruh field dinonaktifkan (mode hanya lihat). Untuk mengubah data, silakan buka kunci terlebih dahulu melalui tombol <strong>[Buka Kunci Dokumen]</strong> di bawah oleh Admin / Kacab.
                  </div>
                </div>
              )}
              {editItem?.isUnlockedByAdmin && (
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#047857', fontSize: '0.82rem' }}>
                  <Unlock size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Akses Dibuka oleh Admin:</strong> Dokumen ini dapat diedit kembali oleh Surveyor.
                  </div>
                </div>
              )}

              <fieldset disabled={isLocked} style={{ border: 'none', padding: 0, margin: 0, opacity: isLocked ? 0.9 : 1 }}>
              {/* Section 1: Nomor Surat PDS & Surveyor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>
                    Nomor Surat PDS (Resmi BKI) *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="A 0    /SV.XXX/PK/KI-26"
                    value={formData.nomor}
                    onChange={(e) => setFormData({ ...formData, nomor: cleanDocNumber(e.target.value) })}
                    required
                    style={{ fontWeight: 800, letterSpacing: '0.02em' }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Marine Surveyor *
                  </label>
                  {role === 'surveyor' ? (
                    <input
                      type="text"
                      className="form-input"
                      value={formData.petugas || currentUser?.name || ''}
                      readOnly
                      style={{
                        background: 'var(--bg-main)',
                        cursor: 'not-allowed',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        borderColor: 'var(--border-color)'
                      }}
                      title="Nama surveyor terkunci sesuai akun login surveyor"
                    />
                  ) : (
                    <select
                      className="form-select"
                      value={formData.petugas}
                      onChange={(e) => handleSurveyorChange(e.target.value)}
                      required
                    >
                      {surveyorUsers.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Pangkat / Grade
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.pangkat}
                    readOnly
                    style={{ background: 'var(--bg-main)', color: 'var(--text-secondary)' }}
                  />
                </div>
              </div>

              {/* Section 2: Dropbox Pemilihan Kapal dari SPS yang Ditugaskan Admin */}
              {!editItem && availableSpsItems.length > 0 && (
                <div
                  ref={spsContainerRef}
                  style={{
                    position: 'relative',
                    background: 'var(--bg-main)',
                    border: '1.5px solid var(--accent-primary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1rem',
                    marginBottom: '1.25rem',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Layers size={16} />
                      <span>Pilih Kapal dari SPS yang Ditugaskan Admin (Opsional):</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {selectedSpsIds.length > 0 && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            background: 'var(--accent-primary)',
                            color: '#ffffff',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px'
                          }}
                        >
                          {selectedSpsIds.length} Terpilih
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-muted)',
                          background: 'var(--bg-card)',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        {availableSpsItems.length} Tersedia
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                    Klik dropbox di bawah untuk memilih satu atau beberapa penugasan SPS guna mengunci No. Agenda masing-masing kapal secara otomatis.
                  </div>

                  {/* Dropbox Trigger Box */}
                  <div
                    onClick={() => setIsSpsDropboxOpen(!isSpsDropboxOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-card)',
                      border: `1.5px solid ${isSpsDropboxOpen ? 'var(--accent-primary)' : 'var(--border-color-strong)'}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.45rem 0.75rem',
                      cursor: 'pointer',
                      minHeight: '38px',
                      transition: 'all 0.15s ease',
                      boxShadow: isSpsDropboxOpen ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center', flex: 1 }}>
                      {selectedSpsIds.length === 0 ? (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Sparkles size={14} color="var(--accent-primary)" />
                          <span>-- 📦 Klik untuk Memilih Kapal dari SPS Admin (Multi-Pilih) --</span>
                        </span>
                      ) : (
                        availableSpsItems
                          .filter((sps) => selectedSpsIds.includes(sps.id))
                          .map((sps) => (
                            <span
                              key={sps.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSps(sps);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                background: 'rgba(2, 132, 199, 0.12)',
                                color: 'var(--accent-primary)',
                                border: '1px solid rgba(2, 132, 199, 0.3)',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '5px',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}
                              title="Klik untuk membatalkan pilihan ini"
                            >
                              <span>🚢 {sps.namaKapal}</span>
                              <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>({sps.noAgenda || sps.agenda || '-'})</span>
                              <X size={12} style={{ cursor: 'pointer' }} />
                            </span>
                          ))
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginLeft: '0.5rem' }}>
                      {selectedSpsIds.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearAllSps();
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '0.1rem 0.3rem',
                            borderRadius: '3px'
                          }}
                          title="Bersihkan semua pilihan"
                        >
                          Reset
                        </button>
                      )}
                      {isSpsDropboxOpen ? <ChevronUp size={16} color="var(--accent-primary)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                    </div>
                  </div>

                  {/* Dropdown Menu Overlay */}
                  {isSpsDropboxOpen && (
                    <div
                      style={{
                        marginTop: '0.5rem',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                        padding: '0.75rem',
                        zIndex: 10
                      }}
                    >
                      {/* Search and Action Bar */}
                      <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '0.6rem', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Cari nama kapal, no. agenda, atau lokasi..."
                            value={spsSearchTerm}
                            onChange={(e) => setSpsSearchTerm(e.target.value)}
                            style={{ paddingLeft: '2rem', fontSize: '0.78rem', height: '32px' }}
                            autoFocus
                          />
                          {spsSearchTerm && (
                            <button
                              type="button"
                              onClick={() => setSpsSearchTerm('')}
                              style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleSelectAllSps}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.72rem', height: '32px', whiteSpace: 'nowrap', padding: '0 0.6rem' }}
                        >
                          Pilih Semua
                        </button>
                        <button
                          type="button"
                          onClick={handleClearAllSps}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.72rem', height: '32px', whiteSpace: 'nowrap', padding: '0 0.6rem' }}
                        >
                          Batal
                        </button>
                      </div>

                      {/* List of SPS Cards */}
                      <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '0.2rem' }}>
                        {filteredSpsItems.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            Tidak ada data SPS yang cocok dengan pencarian.
                          </div>
                        ) : (
                          filteredSpsItems.map((sps) => {
                            const isChecked = selectedSpsIds.includes(sps.id);
                            return (
                              <div
                                key={sps.id}
                                onClick={() => handleToggleSps(sps)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '0.45rem 0.65rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: `1px solid ${isChecked ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                  background: isChecked ? 'rgba(2, 132, 199, 0.08)' : 'var(--bg-main)',
                                  cursor: 'pointer',
                                  transition: 'all 0.12s ease'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}}
                                    style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)', width: '15px', height: '15px' }}
                                  />
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.82rem', color: isChecked ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                                      <Anchor size={13} color={isChecked ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                                      <span>{sps.namaKapal}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.12rem' }}>
                                      <span style={{ fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(2, 132, 199, 0.1)', padding: '0.05rem 0.35rem', borderRadius: '3px' }}>
                                        Agenda: {sps.noAgenda || sps.agenda || '-'}
                                      </span>
                                      <span>•</span>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                        <MapPin size={11} />
                                        {sps.lokasi}
                                      </span>
                                      {sps.petugas && (
                                        <>
                                          <span>•</span>
                                          <span>{sps.petugas}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {isChecked && (
                                  <div style={{ display: 'flex', alignItems: 'center', color: 'var(--accent-primary)', fontSize: '0.72rem', fontWeight: 700, gap: '0.2rem' }}>
                                    <Check size={14} />
                                    <span>Terpilih</span>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer Info */}
                      <div style={{ marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <span>💡 Menggabungkan beberapa kapal akan mengelompokkan survei dalam 1 lembar PDS.</span>
                        <button
                          type="button"
                          onClick={() => setIsSpsDropboxOpen(false)}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}
                        >
                          Selesai
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Section 3: Daftar Kapal & No. Agenda Terhubung */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  border: '1.5px solid var(--border-color-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <label className="form-label" style={{ fontWeight: 800, color: 'var(--accent-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Anchor size={16} />
                    <span>Daftar Kapal & No. Agenda Perjalanan Dinas:</span>
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {shipsDetail.length > 0 ? `${shipsDetail.length} kapal terhubung` : 'Database Kapal Aktif'}
                  </span>
                </div>

                {/* Dropdown Pemilihan Cepat dari Database / Riwayat Kapal */}
                <div style={{ marginBottom: '0.75rem', background: 'var(--bg-card)', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Sparkles size={14} color="var(--accent-primary)" />
                    <span>Pilih dari Database / Riwayat Kapal (Otomatis Isi No. Agenda):</span>
                  </div>
                    <ShipDatabaseSearchSelect
                      shipDatabase={shipDatabase}
                      onSelect={(foundShip) => handleSelectShipFromDatabase(foundShip)}
                      placeholder="-- 🚢 Ketik nama kapal / no. agenda untuk mencari dari database --"
                    />
                  </div>

                {/* Table of Selected Ships from Database / SPS */}
                {shipsDetail.length > 0 ? (
                  <div>
                    <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse', marginBottom: '0.6rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-card)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>No</th>
                          <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>Nama Kapal</th>
                          <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>No. Agenda</th>
                          <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>No. Order / RFQ</th>
                          {shipsDetail.length > 1 && (
                            <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)', width: '170px' }}>
                              Alokasi Biaya Survei (Rp) *
                            </th>
                          )}
                          <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)', textAlign: 'center', width: '40px' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shipsDetail.map((sh, idx) => (
                          <tr key={sh.spsId || idx}>
                            <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>{idx + 1}</td>
                            <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)', fontWeight: 800 }}>{sh.namaKapal}</td>
                            <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)', color: 'var(--accent-primary)', fontWeight: 700 }}>
                              <input
                                type="text"
                                className="form-input"
                                style={{ padding: '0.15rem 0.4rem', fontSize: '0.78rem', height: '26px' }}
                                value={sh.noAgenda || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setShipsDetail(shipsDetail.map((s, i) => (i === idx ? { ...s, noAgenda: val } : s)));
                                }}
                              />
                            </td>
                            <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>{sh.noOrder || '-'}</td>
                            {shipsDetail.length > 1 && (
                              <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>
                                <input
                                  type="number"
                                  min="0"
                                  className="form-input"
                                  style={{ padding: '0.15rem 0.4rem', fontSize: '0.8rem', height: '28px', fontWeight: 800, color: '#0284c7' }}
                                  value={sh.biayaSurvei !== undefined ? sh.biayaSurvei : ''}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    setShipsDetail(shipsDetail.map((s, i) => (i === idx ? { ...s, biayaSurvei: val } : s)));
                                  }}
                                />
                              </td>
                            )}
                            <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-danger btn-icon btn-sm"
                                style={{ padding: '2px 6px' }}
                                onClick={() => handleRemoveShipFromDetail(sh.namaKapal)}
                                title="Hapus kapal ini dari daftar"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Multi-Ship Split Calculation Banner */}
                    {shipsDetail.length > 1 && (
                      <div style={{ background: 'var(--bg-card)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.45rem' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                            Estimasi Biaya Surat Tugas: <span style={{ color: '#0284c7', fontWeight: 800 }}>{formatRupiah(targetEstimasiTotal)}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                              Total Dialokasikan: <span style={{ color: isPembagianValid ? '#059669' : '#dc2626', fontWeight: 800 }}>{formatRupiah(totalPembagianKapal)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleAutoSplitTariff}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem', fontWeight: 700, background: '#0284c7', color: '#ffffff', borderColor: '#0284c7' }}
                              title="Bagi rata estimasi biaya ke semua kapal"
                            >
                              ⚡ Bagi Rata Otomatis
                            </button>
                          </div>
                        </div>

                        {isPembagianValid ? (
                          <div style={{ fontSize: '0.78rem', color: '#047857', background: '#ecfdf5', padding: '0.4rem 0.75rem', borderRadius: '4px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                            <Check size={14} />
                            <span>Total pembagian biaya survei telah SESUAI dengan estimasi biaya surat tugas ({formatRupiah(targetEstimasiTotal)}).</span>
                          </div>
                        ) : selisihPembagian < 0 ? (
                          <div style={{ fontSize: '0.78rem', color: '#b91c1c', background: '#fef2f2', padding: '0.4rem 0.75rem', borderRadius: '4px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                            <AlertCircle size={14} />
                            <span>⚠️ Total alokasi masih KURANG {formatRupiah(Math.abs(selisihPembagian))} dari estimasi biaya surat tugas. Dokumen PDS tidak dapat diterbitkan sebelum nominal pas.</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.78rem', color: '#b91c1c', background: '#fef2f2', padding: '0.4rem 0.75rem', borderRadius: '4px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                            <AlertCircle size={14} />
                            <span>⚠️ Total alokasi MELEBIHI {formatRupiah(selisihPembagian)} dari estimasi biaya surat tugas. Dokumen PDS tidak dapat diterbitkan sebelum nominal pas.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg-card)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      🚢 Pilih kapal dari <strong>Dropdown Database Kapal</strong> di atas atau melalui <strong>Dropbox SPS Admin</strong>.
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      * Pendaftaran/input kapal baru hanya dilakukan melalui form <strong>SPS Admin</strong>.
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Tanggal, Lokasi, Hari Libur & Opsi Uang Harian */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  border: '1.5px solid var(--border-color-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  📋 RINCIAN SURVEI, LOKASI & TANGGAL
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700 }}>Tempat Survey & Tarif SK *</span>
                      <span className={`badge ${formData.kategoriPerjalanan === 'Luar Kota' ? 'badge-primary' : 'badge-success'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                        {formData.kategoriPerjalanan || 'Dalam Kota'}
                      </span>
                    </label>
                    <select
                      className="form-select"
                      value={formData.lokasi}
                      onChange={(e) => handleLocationChange(e.target.value)}
                      required
                    >
                      <optgroup label="📍 DALAM KOTA (PONTIANAK & SEKITARNYA)">
                        {activeTariffs
                          .filter((t) => (t.kategori || getLocationCategory(t.name, activeTariffs)) === 'Dalam Kota')
                          .map((t, idx) => (
                            <option key={`dk-${idx}`} value={t.tujuan || t.name}>
                              {t.tujuan || t.name} - {formatRupiah(t.rate)}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="✈️ LUAR KOTA">
                        {activeTariffs
                          .filter((t) => (t.kategori || getLocationCategory(t.name, activeTariffs)) === 'Luar Kota')
                          .map((t, idx) => (
                            <option key={`lk-${idx}`} value={t.tujuan || t.name}>
                              {t.tujuan || t.name} - {formatRupiah(t.rate)}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 0.8fr', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={14} color="var(--accent-primary)" />
                      <span>Tgl Berangkat *</span>
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.tglMulai}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({
                          ...formData,
                          tglMulai: val,
                          tglSelesai: formData.tglSelesai && formData.tglSelesai < val ? val : formData.tglSelesai || val
                        });
                      }}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={14} color="var(--accent-primary)" />
                      <span>Tgl Kembali *</span>
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.tglSelesai}
                      min={formData.tglMulai}
                      onChange={(e) => setFormData({ ...formData, tglSelesai: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>
                      Hari Libur (Jml)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={calculations.hr}
                      className="form-input"
                      style={{ fontWeight: 700 }}
                      placeholder="0"
                      value={formData.jumlahHariLibur}
                      onChange={(e) => setFormData({ ...formData, jumlahHariLibur: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                    />
                  </div>
                </div>

                  {/* Option Tanpa Uang Harian (Pindahan & Rapi) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={formData.tanpaUangHarian}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData({
                            ...formData,
                            tanpaUangHarian: checked,
                            hariTanpaUangHarian: checked ? Math.max(1, Number(formData.hariTanpaUangHarian) || 1) : 0
                          });
                        }}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        Tanpa Uang Harian (Akomodasi / Konsumsi Penuh Ditanggung Klien)
                      </span>
                    </label>

                    {formData.tanpaUangHarian && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <span>Potong:</span>
                        <input
                          type="number"
                          min="1"
                          max={calculations.hr}
                          className="form-input"
                          style={{ width: '55px', height: '28px', padding: '0.1rem 0.35rem', fontSize: '0.8rem', textAlign: 'center', fontWeight: 700 }}
                          value={formData.hariTanpaUangHarian || 1}
                          onChange={(e) => setFormData({ ...formData, hariTanpaUangHarian: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        />
                        <span>Hari</span>
                      </div>
                    )}
                  </div>

                  {/* Option Tanpa TAT (Hanya tampil untuk Luar Kota) */}
                  {formData.kategoriPerjalanan === 'Luar Kota' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.6rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', cursor: 'pointer', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={formData.tanpaTAT || false}
                          onChange={(e) => setFormData({ ...formData, tanpaTAT: e.target.checked })}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          Tanpa Biaya Transport Asal Tujuan (TAT Luar Kota)
                        </span>
                      </label>
                      {!formData.tanpaTAT && (
                        <span style={{ fontSize: '0.78rem', color: '#d97706', fontWeight: 700 }}>
                          {formatRupiah(adminSettings?.tatLuarKota || 750000)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

              {/* Section 6: Biaya Transportasi, Hotel & TAT */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                {/* Tiket Transportasi */}
                <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Plane size={15} color="var(--accent-primary)" />
                    <span>Tiket Pesawat / Transport (Rp)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="0"
                    value={formData.tiketPesawatTaxi}
                    onChange={(e) => setFormData({ ...formData, tiketPesawatTaxi: Number(e.target.value) })}
                    style={{ fontWeight: 700, marginBottom: '0.5rem' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Bukti Tiket / Boarding Pass (Maks. 3 MB):
                  </div>
                  {isAdmin ? (
                    formData.fileTiketTransportName ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-sm)' }}>
                        <span style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Check size={13} color="#059669" /> Bukti tiket terlampir
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
                          onClick={() => setPreviewAttachment({
                            isOpen: true,
                            title: 'Bukti Tiket Transportasi / Boarding Pass',
                            fileData: formData.fileTiketTransportName,
                            fileName: 'Bukti_Tiket_Transportasi'
                          })}
                        >
                          <Eye size={12} />
                          <span>Cek Lampiran</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ padding: '0.45rem 0.65rem', background: 'var(--bg-main)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        Belum ada lampiran dari surveyor
                      </div>
                    )
                  ) : (
                    <>
                      <input
                        type="file"
                        className="form-input"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileUpload('tiketTransport', e.target.files[0])}
                        style={{ fontSize: '0.75rem' }}
                      />
                      {formData.fileTiketTransportName && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                          <span style={{ fontSize: '0.72rem', color: '#10b981' }}>✓ Bukti tiket terlampir</span>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.1rem 0.35rem', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                            onClick={() => setPreviewAttachment({
                              isOpen: true,
                              title: 'Bukti Tiket Transportasi / Boarding Pass',
                              fileData: formData.fileTiketTransportName,
                              fileName: 'Bukti_Tiket_Transportasi'
                            })}
                          >
                            <Eye size={11} /> Cek
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Hotel / Penginapan */}
                <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Receipt size={15} color="var(--accent-primary)" />
                    <span>Biaya Hotel / Malam (Rp)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="0"
                    value={formData.tiketHotel}
                    onChange={(e) => setFormData({ ...formData, tiketHotel: Number(e.target.value) })}
                    style={{ fontWeight: 700, marginBottom: '0.5rem' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Total Hotel ({calculations.mlm} Malam): <strong>{formatRupiah(calculations.uangHotelTotal)}</strong> • (Maks. 3 MB)
                  </div>
                  {isAdmin ? (
                    formData.fileKwitansiHotelName ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-sm)' }}>
                        <span style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Check size={13} color="#059669" /> Kwitansi hotel terlampir
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
                          onClick={() => setPreviewAttachment({
                            isOpen: true,
                            title: 'Bukti Kwitansi Hotel / Penginapan',
                            fileData: formData.fileKwitansiHotelName,
                            fileName: 'Kwitansi_Hotel'
                          })}
                        >
                          <Eye size={12} />
                          <span>Cek Lampiran</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ padding: '0.45rem 0.65rem', background: 'var(--bg-main)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        Belum ada lampiran dari surveyor
                      </div>
                    )
                  ) : (
                    <>
                      <input
                        type="file"
                        className="form-input"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileUpload('kwitansiHotel', e.target.files[0])}
                        style={{ fontSize: '0.75rem' }}
                      />
                      {formData.fileKwitansiHotelName && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                          <span style={{ fontSize: '0.72rem', color: '#10b981' }}>✓ Kwitansi hotel terlampir</span>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.1rem 0.35rem', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                            onClick={() => setPreviewAttachment({
                              isOpen: true,
                              title: 'Bukti Kwitansi Hotel / Penginapan',
                              fileData: formData.fileKwitansiHotelName,
                              fileName: 'Kwitansi_Hotel'
                            })}
                          >
                            <Eye size={11} /> Cek
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Section 7: Kalkulasi Otomatis Biaya Lokasi & Honorarium */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(240, 249, 255, 0.95) 0%, rgba(238, 242, 255, 0.8) 100%)',
                  border: '1.5px solid #bfdbfe',
                  borderRadius: '16px',
                  padding: '1.25rem 1.5rem',
                  marginBottom: '1.5rem',
                  boxShadow: '0 4px 16px rgba(2, 132, 199, 0.06)'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.6rem', borderBottom: '1px solid rgba(2, 132, 199, 0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.95rem', color: '#1e3a8a' }}>
                    <Sparkles size={16} color="#0284c7" />
                    <span>Kalkulasi Otomatis Biaya Lokasi & Honorarium</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
                    Sistem Pintar BKI
                  </div>
                </div>

                {/* Grid Body (2 columns) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem 2rem', marginBottom: '1.25rem' }}>
                  {/* Row 1 */}
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Kategori & Lokasi:</div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                      {formData.kategoriPerjalanan || 'Dalam Kota'} - {formData.lokasi || 'WAJOK'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Lama Perjalanan Dinas:</div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                      {calculations.hr} Hari ({calculations.mlm} Malam)
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Honorarium Surveyor:</div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0284c7' }}>
                      {formatRupiah(calculations.rateSK)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Biaya Tiket Pesawat / Transport:</div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#059669' }}>
                      {formatRupiah(calculations.tiketTransport)}
                    </div>
                  </div>

                  {/* Row 3: Biaya Hotel & TAT (TAT hanya muncul jika Luar Kota) */}
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Biaya Hotel ({calculations.mlm} Malam):</div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#059669' }}>
                      {formatRupiah(calculations.uangHotelTotal)}
                    </div>
                  </div>
                  {formData.kategoriPerjalanan === 'Luar Kota' ? (
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Transport Asal Tujuan (TAT):</div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: formData.tanpaTAT ? '#94a3b8' : '#d97706' }}>
                        {formData.tanpaTAT ? 'Rp 0 (Tanpa TAT)' : formatRupiah(calculations.tat)}
                      </div>
                    </div>
                  ) : (
                    <div />
                  )}

                  {/* Row 4 */}
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>
                      Uang Harian ({calculations.hr} Hari{calculations.hrLibur > 0 ? ` + ${calculations.hrLibur} Libur` : ''}):
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#9333ea' }}>
                      {formatRupiah(calculations.uangHarianTotal + (calculations.hrLbrTotal || 0))}
                    </div>
                  </div>
                </div>

                {/* Dotted Divider & Total */}
                <div
                  style={{
                    borderTop: '1.5px dashed #93c5fd',
                    paddingTop: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                    Total Estimasi Biaya (Surat Tugas):
                  </div>
                  <div style={{ fontWeight: 900, fontSize: '1.45rem', color: '#1e3a8a' }}>
                    {formatRupiah(calculations.totalBiaya)}
                  </div>
                </div>
              </div>

              {/* Section: Upload Bukti Visit & Foto Selfie Per Kapal (PDF Maks. 3 MB) */}
              <ShipAttachmentsUpload
                shipsDetail={shipsDetail}
                onChangeShipsDetail={(updated) => setShipsDetail(updated)}
                defaultShipName={formData.namaKapal}
                defaultAgenda={formData.noAgenda}
                onSyncPrimaryFiles={({ fileVisitName, fileVisitData, fileFotoName, fileFotoData }) => {
                  setFormData((prev) => ({
                    ...prev,
                    ...(fileVisitName !== undefined && { fileVisitName, fileVisitData }),
                    ...(fileFotoName !== undefined && { fileFotoName, fileFotoData })
                  }));
                }}
                disabled={isAdmin}
                onPreview={(previewObj) => setPreviewAttachment({ isOpen: true, ...previewObj })}
              />

              {/* Section 10: Hasil Survei / Catatan Lapangan */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Catatan / Hasil Survei Lapangan
                </label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Masukkan ringkasan pelaksanaan survei kelaiklautan kapal..."
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                />
              </div>
              </fieldset>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <div>
                  {(role === 'admin' || role === 'developer' || role === 'kacab') && editItem && (
                    <button
                      type="button"
                      onClick={() => {
                        const newStatus = !editItem.isUnlockedByAdmin;
                        updateSuratTugas(editItem.id, {
                          isUnlockedByAdmin: newStatus,
                          unlockedAt: newStatus ? new Date().toISOString() : null,
                          unlockedBy: newStatus ? currentUser?.name : null
                        });
                        if (newStatus) {
                          toast.success('🔓 Kunci dokumen dibuka. Dokumen dapat diedit kembali.');
                        } else {
                          toast.info('🔒 Dokumen berhasil dikunci kembali.');
                        }
                      }}
                      className={`btn ${editItem.isUnlockedByAdmin ? 'btn-secondary' : 'btn-warning'} btn-sm`}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                    >
                      {editItem.isUnlockedByAdmin ? <Lock size={14} /> : <Unlock size={14} />}
                      <span>{editItem.isUnlockedByAdmin ? 'Kunci Kembali Dokumen' : 'Buka Kunci Dokumen (Admin)'}</span>
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>
                    {isLocked ? 'Tutup' : 'Batal'}
                  </button>
                  {isLocked ? (
                    <button
                      type="button"
                      disabled
                      className="btn btn-secondary"
                      style={{ opacity: 0.65, cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '0.45rem', background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca', fontWeight: 700 }}
                      title="Dokumen terkunci (hanya bisa dilihat). Buka kunci dokumen untuk mengedit."
                    >
                      <Lock size={16} color="#dc2626" />
                      <span>Terkunci (Hanya Lihat)</span>
                    </button>
                  ) : (
                    <button type="submit" className="btn btn-primary">
                      <Save size={16} />
                      <span>{editItem ? 'Simpan Perubahan PDS' : 'Terbitkan Perjalanan Dinas (PDS)'}</span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Attachment Preview Modal */}
      <AttachmentPreviewModal
        isOpen={previewAttachment.isOpen}
        onClose={() => setPreviewAttachment({ isOpen: false, title: '', fileData: null, fileName: '' })}
        title={previewAttachment.title}
        fileData={previewAttachment.fileData}
        fileName={previewAttachment.fileName}
      />
    </ModalPortal>
  );
};
