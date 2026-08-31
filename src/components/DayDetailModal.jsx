import { supabase } from '../lib/supabase';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
  X,
  Calendar,
  MapPin,
  User,
  FileText,
  CheckCircle2,
  Plus,
  Save,
  Anchor,
  Printer,
  Sparkles,
  Hash,
  Shield,
  Camera,
  FileCheck2,
  Plane,
  Receipt,
  Ticket,
  Trash2,
  Layers,
  Compass,
  AlertCircle,
  Calculator,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  Lock,
  Unlock,
  Edit2,
  AlertTriangle,
  CheckCircle,
  Eye,
  Send,
  CheckCheck,
  Clock,
  Ship
} from 'lucide-react';
import { formatDateIndo, getStatusBadgeClass, formatRupiah, cleanDocNumber, isDocumentLocked } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { getLocationCategory, findTariffByLocation } from '../utils/tariffData';
import { ModalPortal } from './ModalPortal';
import { SuratTugasPrintModal } from './SuratTugasPrintModal';
import { SuratTugasPdsPrintModal } from './SuratTugasPdsPrintModal';
import { BiayaPdsPrintModal } from './BiayaPdsPrintModal';
import { TandaTerimaSmcPrintModal } from './TandaTerimaSmcPrintModal';
import { LaporanPrintModal } from './LaporanPrintModal';
import { PdsModal } from './PdsModal';
import { ConfirmModal } from './ConfirmModal';
import { sanitizeFormData, validateFileUpload } from '../utils/security';
import MultiPhotoUpload from './MultiPhotoUpload';
import ShipDatabaseSearchSelect from './ShipDatabaseSearchSelect';
import SearchableLocationSelect from './SearchableLocationSelect';

import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { ShipAttachmentsUpload } from './ShipAttachmentsUpload';
import { deleteFromGoogleDrive, isGoogleDriveUrl } from '../utils/googleDriveService';
import { MultiDocUpload } from './MultiDocUpload';
import { countHolidaysAndWeekendsInRange, checkHolidayOrWeekend } from '../utils/holidays';
import { filterDataByRole } from '../utils/filterData';

export const DayDetailModal = ({
  isOpen,
  onClose,
  selectedDate,
  tasksOnDate = [],
  kwitansiList = [],
  laporanList = [],
  onSave = null
}) => {
  const { currentUser, usersList, role } = useAuth();
  const isAdmin = role === 'admin' || role === 'developer' || role === 'kacab';
  const isFinance = role === 'finance' || role === 'keuangan';
  const canAcc = isAdmin || isFinance;
  const {
    suratTugas: allSuratTugas,
    createPdsFromSurvey,
    updateSuratTugas,
    deleteSuratTugas,
    updateKwitansiHonor,
    kwitansiHonor,
    adminSettings,
    tariffs,
    gradeTariffs,
    masterKapal,
    addMasterKapal
  } = useData();

  const activeTariffs = tariffs && tariffs.length > 0 ? tariffs : [];
  const surveyorUsers = useMemo(
    () => (usersList || []).filter((u) => u.role === 'surveyor' || u.role === 'kacab'),
    [usersList]
  );

  const defaultLoc = activeTariffs.find((t) => (t.kategori || getLocationCategory(t.name, activeTariffs)) === 'Dalam Kota') || activeTariffs[0];
  const defaultLocName = defaultLoc?.tujuan || defaultLoc?.name || 'WAJOK';
  const defaultLocRate = defaultLoc ? Number(defaultLoc.rate) : 500000;

  const shipDatabase = masterKapal;

  // Available pending SPS items across assignments (strictly filtered by role)
  const availableSpsItems = useMemo(() => {
    const roleFilteredSurat = filterDataByRole(allSuratTugas || [], currentUser, role, 'petugas');
    return roleFilteredSurat.filter(
      (st) => (st.docType === 'SPS' || st.isSps || (!st.docType && st.status === 'Menunggu Survei')) && !st.pdsId && st.status !== 'Selesai'
    );
  }, [allSuratTugas, currentUser, role]);

  const [activeTab, setActiveTab] = useState('view');
  const [selectedSpsIds, setSelectedSpsIds] = useState([]);
  const [shipsDetail, setShipsDetail] = useState([]);
  const [isSpsDropboxOpen, setIsSpsDropboxOpen] = useState(false);
  const [spsSearchTerm, setSpsSearchTerm] = useState('');
  const spsContainerRef = useRef(null);

  // State untuk Tambah Kapal Manual (Non-SPS)
  const [showManualAddShip, setShowManualAddShip] = useState(false);
  const [manualShipName, setManualShipName] = useState('');
  const [manualNoAgenda, setManualNoAgenda] = useState('');

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

  const [printSuratItem, setPrintSuratItem] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printPdsItem, setPrintPdsItem] = useState(null);
  const [isPdsPrintModalOpen, setIsPdsPrintModalOpen] = useState(false);
  const [isBiayaPrintModalOpen, setIsBiayaPrintModalOpen] = useState(false);
  const [printBiayaItem, setPrintBiayaItem] = useState(null);
  const [printSmcItem, setPrintSmcItem] = useState(null);
  const [isSmcPrintModalOpen, setIsSmcPrintModalOpen] = useState(false);

  // Attachment Preview Modal State
  const [previewAttachment, setPreviewAttachment] = useState({ isOpen: false, title: '', fileData: null, fileName: '' });
  const [printLaporanItem, setPrintLaporanItem] = useState(null);
  const [isLaporanPrintModalOpen, setIsLaporanPrintModalOpen] = useState(false);
  const [editingPdsItem, setEditingPdsItem] = useState(null);
  const [isEditPdsModalOpen, setIsEditPdsModalOpen] = useState(false);

  const [isUploadingTiket, setIsUploadingTiket] = useState(false);
  const [isUploadingHotel, setIsUploadingHotel] = useState(false);
  const [isUploadingVisit, setIsUploadingVisit] = useState(false);

  const formattedDate = selectedDate ? formatDateIndo(selectedDate) : '';

  const [formData, setFormData] = useState({
    nomor: '',
    namaKapal: '',
    pemohon: '',
    jenisSurvey: 'DINAS SURVEY KLAS',
    perihal: 'DINAS SURVEY KLAS',
    petugas: '',
    pangkat: 'GRADE 6 A',
    jabatan: 'SURVEYOR',
    lokasi: defaultLocName,
    tempatSurvey: defaultLocName,
    tarifDasar: defaultLocRate,
    noAgenda: '',
    noOrder: 'RFQ-0000',
    tiketHotel: 0,
    tiketPesawatTaxi: 0,
    rincianTiket: [{ id: 1, keterangan: '', nominal: 0 }],
    rincianHotel: [{ id: 1, namaHotel: '', jumlahMalam: 1, tarifPerMalam: 0, totalBiaya: 0 }],
    kategoriTransportasi: 'Pesawat Terbang',
    kategoriPerjalanan: 'Dalam Kota',
    saranaTransportasi: 'DARAT DAN AIR',
    keteranganLain: 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
    kepalaCabang: adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
    nup: adminSettings?.nup || '48199-KI',
    fileFotoName: '',
    fileFotoData: '',
    fotoList: [],
    fileVisitName: '',
    fileTiketTransportName: '',
    fileKwitansiHotelName: '',
    tglMulai: '',
    tglSelesai: '',
    jumlahHariLibur: 0,
    status: 'Berjalan',
    catatan: '',
    isCito: false,
    visit: '1',
    tanpaTAT: false,
    biayaTAT: 0,
    tanpaUangHarian: false,
    hariTanpaUangHarian: 0,
    tembusan: '1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026',
    isSmc: false,
    noSuratSmc: '1857/KU.604/KI-21',
    noSap: '',
    jumlahPendamping: 2,
    tarifExpertise: 1500000
  });

  // Separate tasks on selected date into Pending SPS vs Completed/Active PDS (role filtered)
  const { pendingSpsList, pdsList } = useMemo(() => {
    const sps = [];
    const pds = [];
    const roleFilteredSurat = filterDataByRole(allSuratTugas || [], currentUser, role, 'petugas');
    const roleFilteredTasksOnDate = filterDataByRole(tasksOnDate || [], currentUser, role, 'petugas');
    const pool = (roleFilteredSurat && roleFilteredSurat.length > 0) ? roleFilteredSurat : roleFilteredTasksOnDate;
    const formattedDateStr = selectedDate ? (selectedDate.includes('T') ? selectedDate.split('T')[0] : selectedDate) : '';

    pool.forEach((st) => {
      const isDateMatch = formattedDateStr && (
        (st.tglMulai && st.tglSelesai && formattedDateStr >= st.tglMulai && formattedDateStr <= st.tglSelesai) ||
        st.tglMulai === formattedDateStr ||
        st.tglSelesai === formattedDateStr ||
        st.tglSurat === formattedDateStr
      );

      if (!isDateMatch) return;

      const isPds = st.docType === 'PDS' || st.isPds;
      const isSps = st.docType === 'SPS' || st.isSps || (!st.docType && st.status === 'Menunggu Survei');

      if (isPds) {
        pds.push(st);
      } else if (isSps && !st.pdsId && st.status !== 'Selesai') {
        sps.push(st);
      }
    });

    return { pendingSpsList: sps, pdsList: pds };
  }, [allSuratTugas, tasksOnDate, selectedDate, currentUser, role]);

  const hasExistingPds = pdsList.length > 0;
  const effectiveActiveTab = hasExistingPds ? 'view' : activeTab;

  // Jika sudah ada 1 PDS pada tanggal ini, batasi agar tidak bisa membuka tab input PDS baru
  useEffect(() => {
    if (hasExistingPds && activeTab === 'input') {
      setActiveTab('view');
    }
  }, [hasExistingPds, activeTab]);

  useEffect(() => {
    if (isOpen && selectedDate) {
      const formatted = selectedDate.includes('T') ? selectedDate.split('T')[0] : selectedDate;
      const defaultSurveyor = (role === 'surveyor' || role === 'kacab')
        ? (currentUser?.name || surveyorUsers[0]?.name || '')
        : (surveyorUsers[0]?.name || '');
      const userGrade = surveyorUsers.find((u) => u.name === defaultSurveyor)?.grade || 'GRADE 6 A';

      setFormData((prev) => ({
        ...prev,
        nomor: 'A 0    /SV.201/PK/KI-26',
        tglMulai: formatted,
        tglSelesai: formatted,
        petugas: defaultSurveyor,
        pangkat: userGrade,
        kategoriPerjalanan: 'Dalam Kota',
        kategoriTransportasi: 'Pesawat Terbang',
        tiketHotel: 0,
        tiketPesawatTaxi: 0,
        rincianTiket: [{ id: 1, keterangan: '', nominal: 0 }],
        rincianHotel: [{ id: 1, namaHotel: '', jumlahMalam: 1, tarifPerMalam: 0, totalBiaya: 0 }],
        jumlahHariLibur: 0,
        isCito: false,
        visit: '1',
        isSmc: false,
        noSuratSmc: '1857/KU.604/KI-21',
        noSap: '',
        jumlahPendamping: 2,
        tarifExpertise: 1500000,
        namaKapal: '',
        jenisSurvey: 'DINAS SURVEY KLAS',
        noAgenda: '',
        noOrder: 'RFQ260825',
        saranaTransportasi: 'DARAT DAN AIR'
      }));
      setSelectedSpsIds([]);
      setShipsDetail([]);
    }
  }, [isOpen, selectedDate]);

  // Handle Surveyor Change
  const handleSurveyorChange = (val) => {
    const user = surveyorUsers.find((u) => u.name === val);
    setFormData((prev) => ({
      ...prev,
      petugas: val,
      pangkat: user?.grade || 'GRADE 6 A'
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



  // Toggle SPS selection
  const handleToggleSelectSps = (sps) => {
    if (!sps || !sps.id) return;
    const isSelected = selectedSpsIds.includes(sps.id);
    let newIds = [];
    if (isSelected) {
      newIds = selectedSpsIds.filter((id) => id !== sps.id);
    } else {
      newIds = [...selectedSpsIds, sps.id];
    }
    setSelectedSpsIds(newIds);

    const allSpsPool = allSuratTugas || [];
    const selectedItems = allSpsPool.filter((st) => st && newIds.includes(st.id));
    const newShipsDetail = selectedItems.map((st) => ({
      spsId: st.id,
      namaKapal: st.namaKapal || '',
      noAgenda: st.noAgenda || st.agenda || '',
      noOrder: st.noOrder || formData.noOrder || 'RFQ-0000',
      pemohon: st.pemohon || formData.pemohon || ''
    }));
    setShipsDetail(newShipsDetail);

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

    // Lokasi TIDAK di-auto-fill dari database kapal karena kapal bisa pindah dok sewaktu-waktu
    setFormData((prev) => ({
      ...prev,
      namaKapal: combinedNames,
      noAgenda: foundShip.noAgenda || prev.noAgenda,
      noOrder: foundShip.noOrder || prev.noOrder
    }));
  };

  // Tambah Kapal Manual (Non-SPS) & Sinkron ke Database Kapal Cloud
  const handleAddManualShipToPds = (e) => {
    if (e) e.preventDefault();
    const cleanName = String(manualShipName || '').trim().toUpperCase();
    const cleanAgenda = String(manualNoAgenda || '').trim().toUpperCase();

    if (!cleanName) {
      toast.error('Nama Kapal wajib diisi!');
      return;
    }
    if (!cleanAgenda) {
      toast.error('No. Agenda wajib diisi!');
      return;
    }

    // 1. Cek duplikat di dalam daftar kapal PDS ini
    const existsInPds = shipsDetail.some(
      (s) => (s.noAgenda || '').trim().toUpperCase() === cleanAgenda
    );
    if (existsInPds) {
      toast.error(`No. Agenda "${cleanAgenda}" sudah ada di dalam daftar PDS ini!`);
      return;
    }

    // 2. Cek duplikat di dalam Master Database Kapal (masterKapal)
    const duplicateInMaster = (masterKapal || []).find(
      (k) => (k.noAgenda || '').trim().toUpperCase() === cleanAgenda
    );
    if (duplicateInMaster) {
      toast.error(
        `No. Agenda "${cleanAgenda}" sudah digunakan oleh kapal "${duplicateInMaster.namaKapal}" di Database Kapal! Tidak dapat menambahkan data dengan No. Agenda duplikat.`,
        { duration: 5000 }
      );
      return;
    }

    // 3. Simpan ke Master Database Kapal (Otomatis Sync ke Supabase Cloud)
    if (addMasterKapal) {
      const result = addMasterKapal({
        namaKapal: cleanName,
        noAgenda: cleanAgenda,
        jenisSurvey: 'TAHUNAN'
      });

      if (result && !result.success && result.error === 'duplicate') {
        toast.error(
          `No. Agenda "${cleanAgenda}" sudah digunakan oleh kapal "${result.existingKapal}" di Database Kapal!`,
          { duration: 5000 }
        );
        return;
      }
    }

    // 4. Masukkan ke shipsDetail PDS saat ini
    const newShipItem = {
      namaKapal: cleanName,
      noAgenda: cleanAgenda,
      noOrder: formData.noOrder || 'RFQ-0000',
      pemohon: formData.pemohon || '',
      spsId: null
    };

    const updatedDetails = [...shipsDetail, newShipItem];
    setShipsDetail(updatedDetails);

    const combinedNames = updatedDetails.map((s) => s.namaKapal).filter(Boolean).join(', ');
    setFormData((prev) => ({
      ...prev,
      namaKapal: combinedNames,
      noAgenda: prev.noAgenda || cleanAgenda,
      agenda: prev.agenda || cleanAgenda
    }));

    toast.success(`Kapal "${cleanName}" (${cleanAgenda}) berhasil ditambahkan ke PDS dan tersinkron ke Database Kapal!`);
    setManualShipName('');
    setManualNoAgenda('');
    setShowManualAddShip(false);
  };

  const handleRemoveShipFromDetail = (namaKapal) => {
    const removedShip = shipsDetail.find((s) => s.namaKapal === namaKapal);
    if (removedShip) {
      if (isGoogleDriveUrl(removedShip.fileVisitData || removedShip.fileVisitName)) {
        deleteFromGoogleDrive(removedShip.fileVisitData || removedShip.fileVisitName).catch(console.warn);
      }
      if (isGoogleDriveUrl(removedShip.fileFotoData || removedShip.fileFotoName)) {
        deleteFromGoogleDrive(removedShip.fileFotoData || removedShip.fileFotoName).catch(console.warn);
      }
    }
    const updated = shipsDetail.filter((s) => s.namaKapal !== namaKapal);
    setShipsDetail(updated);
    setFormData((prev) => ({
      ...prev,
      namaKapal: updated.map((s) => s.namaKapal).join(', ')
    }));
  };

  // Date & Weekend/Holiday Calculation
  const { totalDays, totalNights, autoHolidays, holidayDetails } = useMemo(() => {
    if (!formData.tglMulai || !formData.tglSelesai) {
      return { totalDays: 1, totalNights: 0, autoHolidays: 0, holidayDetails: [] };
    }
    const start = new Date(formData.tglMulai);
    const end = new Date(formData.tglSelesai);
    const timeDiff = end.getTime() - start.getTime();
    let days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    if (days < 1 || isNaN(days)) days = 1;
    const nights = Math.max(0, days - 1);

    const { count, details } = countHolidaysAndWeekendsInRange(formData.tglMulai, formData.tglSelesai);
    return { totalDays: days, totalNights: nights, autoHolidays: count, holidayDetails: details };
  }, [formData.tglMulai, formData.tglSelesai]);

  // Sync automatic holidays count when dates change
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      jumlahHariLibur: autoHolidays
    }));
  }, [autoHolidays]);

  const effectiveHolidays = formData.jumlahHariLibur !== undefined && formData.jumlahHariLibur !== '' ? Number(formData.jumlahHariLibur) : autoHolidays;

  // Real-time Tariff & Cost Calculation
  const calculations = useMemo(() => {
    const userGrade = formData.pangkat || 'GRADE 6 A';
    const gradeData =
      (gradeTariffs || []).find(
        (g) => (g.grade || '').replace(/\s+/g, '').toUpperCase() === userGrade.replace(/\s+/g, '').toUpperCase()
      ) || {};

    const isLuarKota = formData.kategoriPerjalanan === 'Luar Kota';
    const tarifDasarLokasi = Number(formData.tarifDasar) || 0;
    
    // Multi Tiket Total
    const totalTiket = (Array.isArray(formData.rincianTiket) && formData.rincianTiket.length > 0)
      ? formData.rincianTiket.reduce((sum, t) => sum + (Number(t.nominal) || 0), 0)
      : (Number(formData.tiketPesawatTaxi) || 0);

    // Multi Hotel Total
    const totalHotel = (Array.isArray(formData.rincianHotel) && formData.rincianHotel.length > 0)
      ? formData.rincianHotel.reduce((sum, h) => sum + (Number(h.totalBiaya) || ((Number(h.jumlahMalam) || 1) * (Number(h.tarifPerMalam) || 0)) || (Number(h.nominal) || 0)), 0)
      : (Number(formData.tiketHotel) || 0) * Math.max(1, totalDays - 1);

    const biayaTAT = !formData.tanpaTAT && isLuarKota ? Number(formData.biayaTAT || adminSettings?.tatLuarKota || 750000) : 0;

    let sisaHari = totalDays;
    if (formData.tanpaUangHarian) {
      const deduct = formData.hariTanpaUangHarian !== undefined ? Number(formData.hariTanpaUangHarian) : totalDays;
      sisaHari = Math.max(0, totalDays - Math.min(deduct, totalDays));
    }

    const uangHarianPerHari = formData.tanpaUangHarian && sisaHari === 0 ? 0 : (Number(gradeData.uangHarian) || 300000);
    const tambahanLibur = formData.tanpaUangHarian && sisaHari === 0 ? 0 : effectiveHolidays * (uangHarianPerHari * 0.5);
    const totalUangHarian = (uangHarianPerHari * sisaHari) + tambahanLibur;

    const biayaExpertise = formData.isSmc
      ? (Number(formData.jumlahPendamping !== undefined ? formData.jumlahPendamping : 2) * Number(formData.tarifExpertise !== undefined ? formData.tarifExpertise : 1500000))
      : (Number(formData.biayaExpertise) || 0);

    const totalBiaya = isLuarKota
      ? (tarifDasarLokasi + totalTiket + totalHotel + biayaTAT + totalUangHarian + biayaExpertise)
      : (tarifDasarLokasi + totalHotel + totalUangHarian + biayaExpertise);

    return {
      uangHarianPerHari,
      tambahanLibur,
      totalUangHarian,
      biayaTAT,
      totalTiket,
      totalHotel,
      tarifDasarLokasi,
      biayaExpertise,
      totalBiaya
    };
  }, [formData, totalDays, effectiveHolidays, gradeTariffs, adminSettings]);

  // Multi-Tiket Transport Handlers
  const handleAddTiket = () => {
    setFormData((prev) => {
      const list = Array.isArray(prev.rincianTiket) ? [...prev.rincianTiket] : [];
      list.push({ id: Date.now(), keterangan: '', nominal: 0 });
      const total = list.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
      return { ...prev, rincianTiket: list, tiketPesawatTaxi: total };
    });
  };

  const handleUpdateTiket = (index, field, value) => {
    setFormData((prev) => {
      const list = Array.isArray(prev.rincianTiket) ? [...prev.rincianTiket] : [];
      if (!list[index]) return prev;
      list[index] = { ...list[index], [field]: field === 'nominal' ? Number(value) || 0 : value };
      const total = list.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
      return { ...prev, rincianTiket: list, tiketPesawatTaxi: total };
    });
  };

  const handleRemoveTiket = (index) => {
    setFormData((prev) => {
      let list = Array.isArray(prev.rincianTiket) ? prev.rincianTiket.filter((_, i) => i !== index) : [];
      if (list.length === 0) {
        list = [{ id: Date.now(), keterangan: '', nominal: 0 }];
      }
      const total = list.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
      return { ...prev, rincianTiket: list, tiketPesawatTaxi: total };
    });
  };

  // Multi-Hotel Handlers
  const handleAddHotel = () => {
    setFormData((prev) => {
      const list = Array.isArray(prev.rincianHotel) ? [...prev.rincianHotel] : [];
      list.push({ id: Date.now(), namaHotel: '', jumlahMalam: 1, tarifPerMalam: 0, totalBiaya: 0 });
      const total = list.reduce((sum, item) => sum + (Number(item.totalBiaya) || ((Number(item.jumlahMalam) || 1) * (Number(item.tarifPerMalam) || 0))), 0);
      return { ...prev, rincianHotel: list, tiketHotel: total };
    });
  };

  const handleUpdateHotel = (index, field, value) => {
    setFormData((prev) => {
      const list = Array.isArray(prev.rincianHotel) ? [...prev.rincianHotel] : [];
      if (!list[index]) return prev;
      const current = { ...list[index], [field]: (field === 'jumlahMalam' || field === 'tarifPerMalam' || field === 'totalBiaya') ? Number(value) || 0 : value };
      if (field === 'jumlahMalam' || field === 'tarifPerMalam') {
        current.totalBiaya = (Number(current.jumlahMalam) || 1) * (Number(current.tarifPerMalam) || 0);
      }
      list[index] = current;
      const total = list.reduce((sum, item) => sum + (Number(item.totalBiaya) || ((Number(item.jumlahMalam) || 1) * (Number(item.tarifPerMalam) || 0))), 0);
      return { ...prev, rincianHotel: list, tiketHotel: total };
    });
  };

  const handleRemoveHotel = (index) => {
    setFormData((prev) => {
      let list = Array.isArray(prev.rincianHotel) ? prev.rincianHotel.filter((_, i) => i !== index) : [];
      if (list.length === 0) {
        list = [{ id: Date.now(), namaHotel: '', jumlahMalam: 1, tarifPerMalam: 0, totalBiaya: 0 }];
      }
      const total = list.reduce((sum, item) => sum + (Number(item.totalBiaya) || ((Number(item.jumlahMalam) || 1) * (Number(item.tarifPerMalam) || 0))), 0);
      return { ...prev, rincianHotel: list, tiketHotel: total };
    });
  };

  const targetEstimasiTotal = calculations.totalBiaya;

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

  // Upload file handlers
  const handleFileUpload = async (e, fieldKey) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFileUpload(file, 3 * 1024 * 1024);
    if (!validation.isValid) {
      toast.error(validation.message);
      e.target.value = '';
      return;
    }

    if (fieldKey === 'tiketTransport') setIsUploadingTiket(true);
    if (fieldKey === 'kwitansiHotel') setIsUploadingHotel(true);
    if (fieldKey === 'visit') setIsUploadingVisit(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${fieldKey}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const mimeType = file.type || (fileExt.toLowerCase() === 'pdf' ? 'application/pdf' : 'image/jpeg');
      // Convert File to ArrayBuffer to prevent multipart form-data corruption
      const fileBuffer = await file.arrayBuffer();
      const { data, error } = await supabase.storage.from('surat-tugas').upload(filePath, fileBuffer, { contentType: mimeType, cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from('surat-tugas').getPublicUrl(filePath);
      const url = publicUrlData?.publicUrl || filePath;

      if (fieldKey === 'tiketTransport') setFormData((prev) => ({ ...prev, fileTiketTransportName: url }));
      if (fieldKey === 'kwitansiHotel') setFormData((prev) => ({ ...prev, fileKwitansiHotelName: url }));
      if (fieldKey === 'visit') setFormData((prev) => ({ ...prev, fileVisitName: url }));
    } catch (err) {
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

  const handleSaveSurvey = (e) => {
    e.preventDefault();

    if (!formData.nomor || !formData.nomor.trim()) {
      toast.error('Nomor Surat PDS wajib diisi!');
      return;
    }

    if (!formData.namaKapal || !formData.namaKapal.trim()) {
      toast.error('Nama Kapal wajib diisi!');
      return;
    }

    if (shipsDetail.length > 1 && !isPembagianValid) {
      const selisih = Math.abs(selisihPembagian);
      const statusText = selisihPembagian < 0 ? 'kurang' : 'lebih';
      toast.error(`Gagal Terbitkan PDS! Total alokasi biaya kapal (${formatRupiah(totalPembagianKapal)}) ${statusText} ${formatRupiah(selisih)} dari estimasi biaya surat tugas (${formatRupiah(targetEstimasiTotal)}). Mohon sesuaikan nominal pembagian biaya agar pas.`);
      return;
    }

    const totalTiketCalc = (Array.isArray(formData.rincianTiket) && formData.rincianTiket.length > 0)
      ? formData.rincianTiket.reduce((sum, t) => sum + (Number(t.nominal) || 0), 0)
      : Number(formData.tiketPesawatTaxi) || 0;

    const totalHotelCalc = (Array.isArray(formData.rincianHotel) && formData.rincianHotel.length > 0)
      ? formData.rincianHotel.reduce((sum, h) => sum + (Number(h.totalBiaya) || ((Number(h.jumlahMalam) || 1) * (Number(h.tarifPerMalam) || 0)) || (Number(h.nominal) || 0)), 0)
      : (Number(formData.tiketHotel) || 0) * Math.max(1, totalDays - 1);

    const payload = sanitizeFormData({
      ...formData,
      docType: 'PDS',
      isPds: true,
      isSmc: !!formData.isSmc,
      noSuratSmc: formData.isSmc ? (formData.noSuratSmc || '1857/KU.604/KI-21') : '',
      noSap: formData.noSap || '',
      jumlahPendamping: formData.isSmc ? (Number(formData.jumlahPendamping) || 2) : 0,
      tarifExpertise: formData.isSmc ? (Number(formData.tarifExpertise) || 1500000) : 0,
      biayaExpertise: calculations.biayaExpertise || 0,
      uangHarian: calculations.uangHarianPerHari,
      totalUangHarian: calculations.totalUangHarian,
      jumlahEstimasi: calculations.totalBiaya,
      estimasiBiayaTotal: calculations.totalBiaya,
      tiketPesawatTaxi: totalTiketCalc,
      tiketHotel: (formData.rincianHotel && formData.rincianHotel.length > 0 && totalDays > 1) ? Math.round(totalHotelCalc / (totalDays - 1)) : (Number(formData.tiketHotel) || 0),
      totalBiayaHotel: totalHotelCalc,
      rincianTiket: formData.rincianTiket || [],
      rincianHotel: formData.rincianHotel || [],
      biayaTiket: totalTiketCalc + totalHotelCalc,
      fotoList: formData.fotoList || [],
      fileVisitName: formData.fileVisitName || '',
      fileVisitData: formData.fileVisitData || '',
      fileFotoName: formData.fileFotoName || '',
      fileFotoData: formData.fileFotoData || '',
      linkedSpsIds: selectedSpsIds,
      shipsDetail: shipsDetail.length > 0 ? shipsDetail.map((s, idx) => ({
        ...s,
        ...(idx === 0 && {
          fileVisitName: s.fileVisitName || formData.fileVisitName || '',
          fileVisitData: s.fileVisitData || formData.fileVisitData || '',
          fileFotoName: s.fileFotoName || formData.fileFotoName || '',
          fileFotoData: s.fileFotoData || formData.fileFotoData || ''
        })
      })) : [
        {
          namaKapal: formData.namaKapal.toUpperCase(),
          noAgenda: formData.noAgenda || '-',
          noOrder: formData.noOrder || '-',
          biayaSurvei: calculations.totalBiaya,
          fileVisitName: formData.fileVisitName || '',
          fileVisitData: formData.fileVisitData || '',
          fileFotoName: formData.fileFotoName || '',
          fileFotoData: formData.fileFotoData || ''
        }
      ]
    });

    const newPds = createPdsFromSurvey(payload, selectedSpsIds);
    if (newPds) {
      toast.success(`Dokumen PDS resmi berhasil diterbitkan untuk kapal ${formData.namaKapal}!`);
      if (onSave) onSave(newPds);
      onClose();
    }
  };

  const handleOpenPrint = (item) => {
    setPrintSuratItem(item);
    setIsPrintModalOpen(true);
  };

  const handleOpenPdsPrint = (item) => {
    setPrintPdsItem(item);
    setIsPdsPrintModalOpen(true);
  };

  const handleOpenBiayaPrint = (item) => {
    setPrintBiayaItem(item);
    setIsBiayaPrintModalOpen(true);
  };

  const handleOpenSmcPrint = (item) => {
    setPrintSmcItem(item);
    setIsSmcPrintModalOpen(true);
  };

  const handleOpenLaporanPrint = (item) => {
    setPrintLaporanItem(item);
    setIsLaporanPrintModalOpen(true);
  };

  const canDelete = role === 'admin' || role === 'developer';

  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const promptDelete = (item) => {
    setItemToDelete(item);
    setIsConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteSuratTugas(itemToDelete.id);
      toast.success(`Data ${itemToDelete.namaKapal || 'perjalanan dinas'} berhasil dihapus.`);
      setItemToDelete(null);
      setIsConfirmDeleteOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="modal-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <div className="card-title-group">
              <Calendar size={22} style={{ color: 'var(--accent-primary)' }} />
              <div>
                <h3 className="modal-title" style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                  Survei Kapal BKI • Tanggal {formattedDate}
                </h3>
                <div className="card-subtitle" style={{ fontSize: '0.75rem' }}>
                  {pdsList.length} Dokumen PDS Terbit & Terlaksana
                </div>
              </div>
            </div>
            <button className="btn btn-secondary btn-icon" onClick={onClose} type="button">
              <X size={18} />
            </button>
          </div>

          {/* Tab Navigation (Hanya muncul jika belum ada PDS pada hari ini) */}
          {!hasExistingPds && (
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
              <button
                className="btn"
                style={{
                  flex: 1,
                  borderRadius: 0,
                  borderBottom: activeTab === 'view' ? '3px solid var(--accent-primary)' : 'none',
                  background: activeTab === 'view' ? 'var(--bg-card)' : 'transparent',
                  color: activeTab === 'view' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: 700,
                  padding: '0.65rem 1rem'
                }}
                onClick={() => setActiveTab('view')}
              >
                <Calendar size={16} />
                <span>Daftar Tugas & Kapal ({pdsList.length})</span>
              </button>
              <button
                className="btn"
                style={{
                  flex: 1,
                  borderRadius: 0,
                  borderBottom: activeTab === 'input' ? '3px solid var(--accent-primary)' : 'none',
                  background: activeTab === 'input' ? 'var(--bg-card)' : 'transparent',
                  color: activeTab === 'input' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: 700,
                  padding: '0.65rem 1rem'
                }}
                onClick={() => setActiveTab('input')}
              >
                <Plus size={16} />
                <span>+ Input Perjalanan Dinas (PDS)</span>
              </button>
            </div>
          )}

          {/* Modal Body */}
          <div className="modal-body" style={{ maxHeight: 'calc(92vh - 140px)', overflowY: 'auto', padding: '1.25rem' }}>
            {effectiveActiveTab === 'view' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* 1. SEKSI PDS RESMI YANG TELAH TERBIT */}
                <div
                  className="no-print"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileCheck2 size={18} color="#059669" />
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        📄 Dokumen PDS Terbit & Terlaksana
                      </h4>
                      <span className="badge" style={{ background: 'rgba(5, 150, 105, 0.15)', color: '#059669', fontWeight: 700 }}>
                        {pdsList.length} PDS
                      </span>
                    </div>

                    {!hasExistingPds && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            isSmc: false
                          }));
                          setActiveTab('input');
                        }}
                        style={{ fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        <Plus size={14} />
                        <span>Input PDS Baru</span>
                      </button>
                    )}
                  </div>

                  {pdsList.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Belum ada dokumen PDS yang diterbitkan pada tanggal ini. Klik <strong>"+ Input Perjalanan Dinas (PDS)"</strong> untuk membuat baru.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {pdsList.map((pds) => (
                        <div
                          key={pds.id}
                          style={{
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                                <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 800 }}>
                                  PDS: {cleanDocNumber(pds.nomor || pds.id)}
                                </span>

                                {(() => {
                                  const isLocked = isDocumentLocked(pds, 3);
                                  if (isLocked) {
                                    return (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                          fontSize: '0.68rem',
                                          fontWeight: 700,
                                          background: '#fef3c7',
                                          color: '#b45309',
                                          border: '1px solid #fde68a',
                                          padding: '0.1rem 0.4rem',
                                          borderRadius: '4px'
                                        }}
                                        title="Terkunci otomatis: Melewati batas 3 hari pengisian"
                                      >
                                        <Lock size={11} /> Terkunci (3 Hari)
                                      </span>
                                    );
                                  }
                                  if (pds.isUnlockedByAdmin) {
                                    return (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                          fontSize: '0.68rem',
                                          fontWeight: 700,
                                          background: '#ecfdf5',
                                          color: '#047857',
                                          border: '1px solid #a7f3d0',
                                          padding: '0.1rem 0.4rem',
                                          borderRadius: '4px'
                                        }}
                                        title="Akses edit dibuka khusus oleh Admin"
                                      >
                                        <Unlock size={11} /> Akses Dibuka
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}

                                {/* Status & Approval Badge */}
                                {pds.approvalStatus === 'ACC' ? (
                                  <span
                                    className="badge"
                                    style={{
                                      background: '#dcfce7',
                                      color: '#15803d',
                                      border: '1px solid #86efac',
                                      fontWeight: 800,
                                      padding: '0.15rem 0.55rem',
                                      fontSize: '0.7rem',
                                      borderRadius: '9999px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem'
                                    }}
                                    title={`Disetujui & Selesai oleh ${pds.approvalBy || 'Admin'}`}
                                  >
                                    <CheckCircle2 size={12} />
                                    <span>Selesai (ACC)</span>
                                  </span>
                                ) : pds.approvalStatus === 'Revisi' ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      background: '#fef3c7',
                                      color: '#b45309',
                                      border: '1px solid #fde68a',
                                      padding: '0.15rem 0.45rem',
                                      borderRadius: '4px'
                                    }}
                                    title={`Perlu revisi: ${pds.approvalNote || ''}`}
                                  >
                                    <AlertTriangle size={11} /> Perlu Revisi
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      background: '#f1f5f9',
                                      color: '#475569',
                                      border: '1px solid #cbd5e1',
                                      padding: '0.15rem 0.45rem',
                                      borderRadius: '4px'
                                    }}
                                    title="Menunggu ACC / Persetujuan dari Admin"
                                  >
                                    <Clock size={11} /> Menunggu ACC
                                  </span>
                                )}
                              </div>

                              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                                🚢 {pds.namaKapal}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                                📍 {pds.lokasi || pds.tempatSurvey} ({pds.kategoriPerjalanan || 'Dalam Kota'}) • 👤 {pds.petugas}
                              </div>

                              {/* Banner Revisi — muncul di dashboard surveyor */}
                              {pds.approvalStatus === 'Revisi' && pds.approvalNote && (
                                <div
                                  style={{
                                    marginTop: '0.5rem',
                                    padding: '0.6rem 0.75rem',
                                    background: 'linear-gradient(135deg, #fef3c7, #fffbeb)',
                                    border: '1.5px solid #f59e0b',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.5rem'
                                  }}
                                >
                                  <AlertTriangle size={16} color="#d97706" style={{ marginTop: '1px', flexShrink: 0 }} />
                                  <div>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#92400e', marginBottom: '0.15rem' }}>
                                      ⚠️ Revisi dari {pds.approvalBy || 'Admin'}:
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: '#78350f', lineHeight: 1.4 }}>
                                      {pds.approvalNote}
                                    </div>
                                    <button
                                      type="button"
                                      className="btn btn-sm"
                                      style={{
                                        marginTop: '0.4rem',
                                        padding: '0.2rem 0.6rem',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        background: '#f59e0b',
                                        color: '#ffffff',
                                        borderColor: '#f59e0b',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                      }}
                                      onClick={() => {
                                        setEditingPdsItem(pds);
                                        setIsEditPdsModalOpen(true);
                                      }}
                                    >
                                      <Edit2 size={12} />
                                      <span>Edit & Perbaiki</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                              {(() => {
                                const isSmcPds = !!(pds.isSmc || (pds.perihal || '').toUpperCase().includes('SMC') || (pds.jenisSurvey || '').toUpperCase().includes('SMC') || Number(pds.biayaExpertise) > 0 || (pds.noSap && pds.noSap !== '-'));
                                return (
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.74rem', fontWeight: 700, background: '#0284c7', color: '#ffffff', borderColor: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                    onClick={() => handleOpenBiayaPrint(pds)}
                                    title={
                                      isSmcPds
                                        ? 'Download / Cetak PDF Rincian Biaya + Tanda Terima SMC (1 File PDF Gabungan)'
                                        : 'Download / Cetak PDF Rincian Biaya Perjalanan Dinas'
                                    }
                                  >
                                    <Calculator size={13} />
                                    <span>{isSmcPds ? 'Rincian dan SMC' : 'Rincian Biaya'}</span>
                                  </button>
                                );
                              })()}

                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.74rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                onClick={() => handleOpenPdsPrint(pds)}
                                title="Cetak Surat Tugas PDS"
                              >
                                <FileText size={13} />
                                <span>Cetak PDS</span>
                              </button>

                              {canAcc && (
                                (pds.approvalStatus === 'ACC' || (pds.status === 'Selesai' && pds.approvalStatus !== 'Revisi')) ? (
                                  <button
                                    type="button"
                                    className="btn btn-sm"
                                    style={{
                                      padding: '0.25rem 0.6rem',
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      background: '#ecfdf5',
                                      color: '#047857',
                                      border: '1px solid #a7f3d0',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                      updateSuratTugas(pds.id, {
                                        approvalStatus: 'Menunggu',
                                        status: 'Berjalan',
                                        approvalNote: '',
                                        approvalBy: null,
                                        approvedBy: null,
                                        approvalAt: null,
                                        approvalDate: null
                                      });
                                      toast.info(`Status ACC untuk PDS ${pds.namaKapal || ''} dibatalkan (Menunggu ACC).`);
                                    }}
                                    title="PDS Sudah di-ACC (Klik untuk batalkan status ACC)"
                                  >
                                    <CheckCheck size={13} color="#059669" />
                                    <span>Sudah di-ACC</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-success btn-sm"
                                    style={{
                                      padding: '0.25rem 0.6rem',
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      background: '#059669',
                                      color: '#ffffff',
                                      borderColor: '#059669',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                      updateSuratTugas(pds.id, {
                                        approvalStatus: 'ACC',
                                        status: 'Selesai',
                                        approvalNote: '',
                                        approvalBy: currentUser?.name || (isFinance ? 'Staff Keuangan' : (currentUser?.role === 'kacab' ? 'Kepala Cabang' : 'Admin')),
                                        approvedBy: currentUser?.name || (isFinance ? 'Staff Keuangan' : (currentUser?.role === 'kacab' ? 'Kepala Cabang' : 'Admin')),
                                        approvalAt: new Date().toISOString(),
                                        approvalDate: new Date().toISOString()
                                      });
                                      toast.success(`✅ PDS ${pds.namaKapal || ''} telah di-ACC dan ditandai Selesai.`);
                                    }}
                                    title="ACC / Setujui PDS ini agar masuk ke Laporan PDS"
                                  >
                                    <CheckCircle size={13} />
                                    <span>ACC PDS</span>
                                  </button>
                                )
                              )}

                              {/* Tombol Edit PDS dengan Pengecekan Kunci 3 Hari */}
                              {(() => {
                                const isLocked = isDocumentLocked(pds, 3);
                                const canEditPds = !isLocked || pds.isUnlockedByAdmin;

                                if (!canEditPds) {
                                  return (
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => {
                                        setEditingPdsItem(pds);
                                        setIsEditPdsModalOpen(true);
                                      }}
                                      style={{
                                        padding: '0.25rem 0.6rem',
                                        fontSize: '0.74rem',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        background: '#fffbeb',
                                        color: '#b45309',
                                        borderColor: '#fde68a'
                                      }}
                                      title="Dokumen Terkunci: Klik untuk melihat detail dokumen (Mode Hanya Lihat / Read-Only)."
                                    >
                                      <Lock size={13} color="#d97706" />
                                      <span>Lihat (Terkunci)</span>
                                    </button>
                                  );
                                }

                                return (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{
                                      padding: '0.25rem 0.6rem',
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.25rem'
                                    }}
                                    onClick={() => {
                                      setEditingPdsItem(pds);
                                      setIsEditPdsModalOpen(true);
                                    }}
                                    title="Edit Data Dokumen PDS"
                                  >
                                    <Edit2 size={13} />
                                    <span>Edit PDS</span>
                                  </button>
                                );
                              })()}

                              {/* Tombol Buka Kunci / Kunci untuk Admin/Kacab */}
                              {(role === 'admin' || role === 'developer' || role === 'kacab') && (
                                <button
                                  type="button"
                                  className={`btn btn-sm ${pds.isUnlockedByAdmin ? 'btn-success' : isDocumentLocked(pds, 3) ? 'btn-warning' : 'btn-secondary'}`}
                                  style={{
                                    padding: '0.25rem 0.6rem',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    ...(pds.isUnlockedByAdmin
                                      ? { background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }
                                      : isDocumentLocked(pds, 3)
                                      ? { background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }
                                      : {})
                                  }}
                                  onClick={() => {
                                    const newStatus = !pds.isUnlockedByAdmin;
                                    updateSuratTugas(pds.id, {
                                      isUnlockedByAdmin: newStatus,
                                      unlockedAt: newStatus ? new Date().toISOString() : null,
                                      unlockedBy: newStatus ? currentUser?.name : null
                                    });
                                    if (newStatus) {
                                      toast.success(`🔓 Kunci dibuka untuk ${pds.namaKapal || 'PDS'}. Surveyor dapat mengedit.`);
                                    } else {
                                      toast.info(`🔒 Dokumen ${pds.namaKapal || ''} dikunci kembali.`);
                                    }
                                  }}
                                  title={pds.isUnlockedByAdmin ? 'Kunci Kembali Dokumen' : isDocumentLocked(pds, 3) ? 'Buka Kunci Dokumen (Admin Unlock)' : 'Buka Kunci Akses Pengeditan'}
                                >
                                  {pds.isUnlockedByAdmin ? <Lock size={13} /> : <Unlock size={13} />}
                                  <span>{pds.isUnlockedByAdmin ? 'Kunci' : 'Buka Kunci'}</span>
                                </button>
                              )}

                              {/* Tombol Hapus Dokumen PDS */}
                              {canDelete && (
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  style={{
                                    padding: '0.25rem 0.6rem',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    background: '#ef4444',
                                    borderColor: '#ef4444',
                                    color: '#ffffff'
                                  }}
                                  onClick={() => promptDelete(pds)}
                                  title="Hapus Dokumen PDS ini"
                                >
                                  <Trash2 size={13} />
                                  <span>Hapus</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* TAB 2: INPUT PERJALANAN DINAS SURVEYOR (PDS) */
              <form onSubmit={handleSaveSurvey}>
                {/* Banner Header Form PDS */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(5, 150, 105, 0.08) 100%)',
                    border: '1px solid var(--accent-primary)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.75rem 1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={18} color="var(--accent-primary)" />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        Input Perjalanan Dinas Surveyor (PDS)
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Penomoran Surat Resmi & Kalkulasi Biaya Perjalanan Dinas
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 1: Nomor Surat PDS & Surveyor */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 800, color: 'var(--accent-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Nomor Surat PDS (Resmi BKI) *</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        Prefix & Nomor Terpisah
                      </span>
                    </label>
                    {(() => {
                      const rawNomor = formData.nomor ?? 'A 0    /SV.201/PK/KI-26';
                      const cleanNomor = cleanDocNumber(rawNomor);
                      const slashIdx = cleanNomor.indexOf('/');
                      const prefix = slashIdx !== -1 ? cleanNomor.substring(0, slashIdx).trim() : cleanNomor.trim();
                      const suffix = slashIdx !== -1 ? cleanNomor.substring(slashIdx).trim() : '/SV.201/PK/KI-26';

                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', gap: '0.5rem' }}>
                          <div>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="A 0 (Kosong)"
                              value={prefix}
                              onChange={(e) => {
                                const newPrefix = e.target.value;
                                const currentSuffix = suffix.startsWith('/') ? suffix : '/' + suffix;
                                const combined = newPrefix ? `${newPrefix}    ${currentSuffix}` : `        ${currentSuffix}`;
                                setFormData({ ...formData, nomor: combined });
                              }}
                              style={{ fontWeight: 800, textAlign: 'center', color: 'var(--accent-primary)', letterSpacing: '0.05em' }}
                              title="Prefix Nomor Surat (Contoh: A 0, A0, atau kosongkan untuk diisi manual pensil)"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="/SV.201/PK/KI-26"
                              value={suffix}
                              onChange={(e) => {
                                let newSuffix = e.target.value;
                                if (newSuffix && !newSuffix.startsWith('/')) {
                                  newSuffix = '/' + newSuffix;
                                }
                                const combined = prefix ? `${prefix}    ${newSuffix}` : `        ${newSuffix}`;
                                setFormData({ ...formData, nomor: combined });
                              }}
                              required
                              style={{ fontWeight: 800, letterSpacing: '0.02em' }}
                              title="Nomor Surat & Klasifikasi (Contoh: /SV.201/PK/KI-26)"
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Marine Surveyor *
                    </label>
                    {role === 'surveyor' || role === 'kacab' || role === 'kacap' ? (
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

                {/* Section Quick Preset: Tombol Isi SMC / Statutory (Flag State Expertise) */}
                <div
                  style={{
                    background: formData.isSmc ? 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)' : '#f8fafc',
                    border: formData.isSmc ? '1.5px solid #10b981' : '1px dashed #cbd5e1',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1rem',
                    marginBottom: '1.25rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const newSmc = !formData.isSmc;
                          setFormData((prev) => ({
                            ...prev,
                            isSmc: newSmc,
                            perihal: newSmc ? 'AUDIT SMC / STATUTORY NON KONVENSI' : prev.perihal,
                            jenisSurvey: newSmc ? 'AUDIT SMC / STATUTORY NON KONVENSI' : prev.jenisSurvey,
                            noSap: newSmc ? '' : prev.noSap,
                            jumlahPendamping: newSmc ? 2 : (prev.jumlahPendamping || 2),
                            tarifExpertise: 1500000
                          }));
                          if (newSmc) {
                            toast.success('Mode Audit SMC & Expertise Pendamping Syahbandar Aktif');
                          }
                        }}
                        className="btn btn-sm"
                        style={{
                          background: formData.isSmc ? '#059669' : '#ffffff',
                          color: formData.isSmc ? '#ffffff' : '#059669',
                          border: '1.5px solid #059669',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          boxShadow: formData.isSmc ? '0 2px 8px rgba(5, 150, 105, 0.25)' : 'none'
                        }}
                      >
                        <Ship size={15} />
                        <span>{formData.isSmc ? '✓ Mode Audit SMC Aktif' : '+ Isi SMC (Audit Statutory)'}</span>
                      </button>

                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {formData.isSmc
                          ? 'Form disesuaikan untuk Tanda Terima Expertise Petugas Flag State / Syahbandar.'
                          : 'Klik untuk mengisi data SMC & Expertise Pendamping Syahbandar.'}
                      </span>
                    </div>
                  </div>

                  {/* Form Rincian SMC jika Aktif */}
                  {formData.isSmc && (
                    <div
                      style={{
                        marginTop: '0.85rem',
                        paddingTop: '0.85rem',
                        borderTop: '1px dashed #6ee7b7',
                        display: 'grid',
                        gridTemplateColumns: '1.4fr 1.1fr 1fr 1.2fr 1.3fr',
                        gap: '0.75rem',
                        alignItems: 'flex-end'
                      }}
                    >
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.76rem' }}>
                          No. Dasar Surat SMC
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Contoh: 1857/KU.604/KI-21"
                          value={formData.noSuratSmc || ''}
                          onChange={(e) => setFormData({ ...formData, noSuratSmc: e.target.value })}
                          style={{ fontWeight: 700, height: '32px', fontSize: '0.82rem' }}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.76rem' }}>
                          No. SAP (Bisa Diisi Manual)
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Contoh: 5100010"
                          value={formData.noSap || ''}
                          onChange={(e) => setFormData({ ...formData, noSap: e.target.value })}
                          style={{ fontWeight: 700, height: '32px', fontSize: '0.82rem' }}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.76rem' }}>
                          Jml Pendamping
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <input
                            type="number"
                            min="1"
                            max="15"
                            className="form-input"
                            value={formData.jumlahPendamping !== undefined ? formData.jumlahPendamping : 2}
                            onChange={(e) => setFormData({ ...formData, jumlahPendamping: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            style={{ fontWeight: 800, textAlign: 'center', height: '32px', fontSize: '0.85rem', color: '#047857' }}
                          />
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Org</span>
                        </div>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Lock size={11} color="#047857" />
                          <span>Tarif (Terkunci)</span>
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value="Rp 1.500.000 / org"
                          readOnly
                          style={{
                            fontWeight: 800,
                            height: '32px',
                            fontSize: '0.82rem',
                            color: '#047857',
                            background: '#f8fafc',
                            cursor: 'not-allowed',
                            border: '1px solid #cbd5e1'
                          }}
                        />
                      </div>

                      <div
                        style={{
                          background: '#ffffff',
                          padding: '0.4rem 0.65rem',
                          borderRadius: '6px',
                          border: '1px solid #a7f3d0',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          height: '32px',
                          boxSizing: 'border-box'
                        }}
                      >
                        <span style={{ fontSize: '0.65rem', color: '#047857', fontWeight: 700 }}>
                          Total ({formData.jumlahPendamping || 2} x 1,5 jt):
                        </span>
                        <strong style={{ fontSize: '0.85rem', color: '#047857' }}>
                          {formatRupiah((Number(formData.jumlahPendamping) || 2) * 1500000)}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2: Dropbox Pemilihan Kapal dari SPS yang Ditugaskan Admin */}
                {availableSpsItems.length > 0 && (
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
                                  handleToggleSelectSps(sps);
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
                                  onClick={() => handleToggleSelectSps(sps)}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <label className="form-label" style={{ fontWeight: 800, color: 'var(--accent-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Anchor size={16} />
                      <span>Daftar Kapal & No. Agenda Perjalanan Dinas:</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <button
                        type="button"
                        onClick={() => setShowManualAddShip((prev) => !prev)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.3rem 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: showManualAddShip ? '#e2e8f0' : 'rgba(2, 132, 199, 0.12)',
                          color: showManualAddShip ? '#334155' : 'var(--accent-primary)',
                          border: '1px solid rgba(2, 132, 199, 0.3)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        <Plus size={13} />
                        {showManualAddShip ? 'Tutup Form Manual' : '+ Tambah Kapal Manual (Non-SPS)'}
                      </button>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {shipsDetail.length > 0 ? `${shipsDetail.length} kapal terhubung` : 'Database Kapal Aktif'}
                      </span>
                    </div>
                  </div>

                  {/* Form Tambah Kapal Manual (Jika Dibuka) */}
                  {showManualAddShip && (
                    <div
                      style={{
                        marginBottom: '0.75rem',
                        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.06) 0%, rgba(56, 189, 248, 0.1) 100%)',
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius-sm, 8px)',
                        border: '1.5px dashed var(--accent-primary)',
                        animation: 'fadeIn 0.2s ease-in-out'
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Ship size={16} />
                        <span>Tambah Kapal Manual & Simpan Permanen ke Database (Data Lampau / Non-SPS):</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr auto', gap: '0.6rem', alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                            Nama Kapal <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Contoh: KM CITRA RAYA"
                            value={manualShipName}
                            onChange={(e) => setManualShipName(e.target.value.toUpperCase())}
                            style={{ height: '34px', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: 700 }}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                            No. Agenda <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Contoh: 00450PK26"
                            value={manualNoAgenda}
                            onChange={(e) => setManualNoAgenda(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddManualShipToPds();
                              }
                            }}
                            style={{ height: '34px', fontSize: '0.82rem', fontWeight: 700 }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddManualShipToPds}
                          className="btn btn-primary"
                          style={{
                            height: '34px',
                            padding: '0 1rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <Plus size={14} /> Tambah ke PDS & Database
                        </button>
                      </div>
                      <p style={{ margin: '0.45rem 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        💡 <em>Kapal baru akan otomatis dimasukkan ke PDS ini dan terdaftar di Database Kapal Cloud. Jika No. Agenda sudah ada, sistem akan menolak duplikat.</em>
                      </p>
                    </div>
                  )}

                  {/* Dropdown Pemilihan Cepat dari Database */}
                  <div style={{ marginBottom: '0.75rem', background: 'var(--bg-card)', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Sparkles size={14} color="var(--accent-primary)" />
                      <span>Pilih dari Database Riwayat Kapal (Otomatis Isi No. Agenda & Lokasi):</span>
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
                            <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>No. Order</th>
                            {shipsDetail.length > 1 && (
                              <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)', width: '170px' }}>
                                Alokasi Biaya Survei (Rp) *
                              </th>
                            )}
                            <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shipsDetail.map((sh, idx) => (
                            <tr key={`${sh.namaKapal}-${idx}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '6px 8px', fontWeight: 600 }}>{idx + 1}</td>
                              <td style={{ padding: '6px 8px', fontWeight: 800, color: 'var(--text-primary)' }}>🚢 {sh.namaKapal}</td>
                              <td style={{ padding: '6px 8px' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ padding: '0.15rem 0.4rem', fontSize: '0.78rem', height: '28px', fontWeight: 700, color: 'var(--accent-primary)', maxWidth: '140px' }}
                                  value={sh.noAgenda || ''}
                                  placeholder="No. Agenda..."
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const updated = shipsDetail.map((s, i) => (i === idx ? { ...s, noAgenda: val } : s));
                                    setShipsDetail(updated);
                                    if (idx === 0) {
                                      setFormData((prev) => ({ ...prev, noAgenda: val, agenda: val }));
                                    }
                                  }}
                                />
                              </td>
                              <td style={{ padding: '6px 8px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{sh.noOrder || formData.noOrder}</td>
                              {shipsDetail.length > 1 && (
                                <td style={{ padding: '6px 8px' }}>
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
                              <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveShipFromDetail(sh.namaKapal)}
                                  className="btn btn-secondary btn-icon"
                                  style={{ padding: '2px', height: '24px', width: '24px', color: 'var(--danger-color)' }}
                                  title="Hapus kapal ini dari penugasan PDS"
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

                {/* Section 4: Objek Survei, Jenis Survei, Lokasi & Tanggal */}
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
                      <SearchableLocationSelect
                        activeTariffs={activeTariffs}
                        value={formData.lokasi}
                        onChange={(val) => handleLocationChange(val)}
                        getLocationCategory={getLocationCategory}
                        showRate={true}
                        formatRupiah={formatRupiah}
                        required
                      />
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
                        max={totalDays}
                        className="form-input"
                        style={{ fontWeight: 700 }}
                        placeholder="0"
                        value={formData.jumlahHariLibur}
                        onChange={(e) => setFormData({ ...formData, jumlahHariLibur: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      />
                    </div>
                  </div>

                  {/* Keterangan Otomatis Hari Libur / Akhir Pekan (+50% Uang Harian) */}
                  {effectiveHolidays > 0 && (
                    <div
                      style={{
                        background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
                        border: '1.5px solid #fecdd3',
                        borderRadius: '10px',
                        padding: '0.75rem 1rem',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        boxShadow: '0 2px 6px rgba(225, 29, 72, 0.06)'
                      }}
                    >
                      <span style={{ fontSize: '1.35rem', lineHeight: 1 }}>🎉</span>
                      <div style={{ fontSize: '0.8rem', color: '#9f1239', lineHeight: 1.5, flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.2rem', color: '#881337', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>Survei pada Hari Libur / Akhir Pekan ({effectiveHolidays} Hari Terdeteksi)</span>
                          <span style={{ fontSize: '0.7rem', background: '#be123c', color: '#ffffff', padding: '0.1rem 0.45rem', borderRadius: '4px', fontWeight: 800 }}>
                            UANG HARIAN NAIK +50%
                          </span>
                        </div>
                        <div>
                          Uang harian per hari libur mendapat tambahan <strong>+50% (+{formatRupiah(calculations.uangHarianPerHari * 0.5)})</strong> → Total Uang Harian per hari libur menjadi <strong>{formatRupiah(calculations.uangHarianPerHari * 1.5)}</strong>.
                        </div>
                        {holidayDetails && holidayDetails.length > 0 && (
                          <div style={{ marginTop: '0.35rem', fontSize: '0.74rem', background: 'rgba(255, 255, 255, 0.7)', padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px dashed #fda4af', color: '#4c0519', fontWeight: 600 }}>
                            📅 <strong>Rincian Hari Libur:</strong> {holidayDetails.map((h, i) => `${h.date} - ${h.reason}`).join(' • ')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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
                          max={totalDays}
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

                {/* Section 5: Biaya Tiket Transportasi & Hotel (Multi-Item) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  {/* Tiket Transportasi Multi-Item */}
                  <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                        <Plane size={16} color="#0284c7" />
                        <span>Rincian Tiket Pesawat / Transport</span>
                      </label>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleAddTiket}
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', borderColor: '#0284c7', color: '#0284c7' }}
                      >
                        <Plus size={13} />
                        Tambah Tiket
                      </button>
                    </div>

                    {/* List of Tiket Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {(!formData.rincianTiket || formData.rincianTiket.length === 0) ? (
                        <div style={{ padding: '0.75rem', textAlign: 'center', background: 'var(--bg-main)', borderRadius: '6px', border: '1px dashed var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Belum ada rincian tiket. Klik <b>+ Tambah Tiket</b> jika ada tiket pesawat/transport PP.
                        </div>
                      ) : (
                        formData.rincianTiket.map((tiket, idx) => (
                          <div
                            key={tiket.id || idx}
                            style={{
                              padding: '0.6rem',
                              background: 'rgba(2, 132, 199, 0.04)',
                              border: '1px solid rgba(2, 132, 199, 0.2)',
                              borderRadius: '6px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.4rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', width: '20px' }}>#{idx + 1}</span>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="Keterangan (cth: Tiket Berangkat / Tiket Pulang / Taxi)"
                                value={tiket.keterangan || ''}
                                onChange={(e) => handleUpdateTiket(idx, 'keterangan', e.target.value)}
                                style={{ flex: 1, fontSize: '0.82rem', padding: '0.35rem 0.5rem' }}
                              />
                              <button
                                type="button"
                                className="btn btn-icon btn-sm"
                                onClick={() => handleRemoveTiket(idx)}
                                title="Hapus baris tiket"
                                style={{ color: '#ef4444', borderColor: 'transparent', padding: '4px' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Rp</span>
                                <input
                                  type="number"
                                  min="0"
                                  className="form-input"
                                  placeholder="0"
                                  value={tiket.nominal || ''}
                                  onChange={(e) => handleUpdateTiket(idx, 'nominal', e.target.value)}
                                  style={{ flex: 1, fontWeight: 700, fontSize: '0.85rem', padding: '0.35rem 0.5rem' }}
                                />
                              </div>
                              <span style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 700, minWidth: '100px', textAlign: 'right' }}>
                                {formatRupiah(Number(tiket.nominal) || 0)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Total Summary of Tiket */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'rgba(2, 132, 199, 0.12)', borderRadius: '6px', border: '1px solid rgba(2, 132, 199, 0.3)' }}>
                      <span style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: 700 }}>
                        Total Biaya Tiket ({formData.rincianTiket?.length || 0} Tiket):
                      </span>
                      <span style={{ fontSize: '0.92rem', color: '#0284c7', fontWeight: 800 }}>
                        {formatRupiah(calculations.totalTiket)}
                      </span>
                    </div>

                    {/* Attachment Upload */}
                    <MultiDocUpload
                      value={formData.fileTiketTransportName}
                      onChange={(val) => setFormData((prev) => ({ ...prev, fileTiketTransportName: val }))}
                      onPreview={setPreviewAttachment}
                      title="Bukti Tiket Transportasi / Boarding Pass"
                      label="Tiket Pesawat / Transport"
                      icon={Plane}
                      color="#0284c7"
                      bucketName="surat-tugas"
                      folderContext={{
                        year: (formData.tglMulai || '').split('-')[0] || new Date().getFullYear().toString(),
                        subFolder: `${formData.noOrder || formData.agenda || 'SP'}_${formData.namaKapal || 'KAPAL'}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
                        category: '3_Tiket_Transport'
                      }}
                      maxFileSize={3 * 1024 * 1024}
                    />
                  </div>

                  {/* Hotel / Penginapan Multi-Item */}
                  <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                        <Receipt size={16} color="#059669" />
                        <span>Rincian Hotel / Penginapan</span>
                      </label>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleAddHotel}
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', borderColor: '#059669', color: '#059669' }}
                      >
                        <Plus size={13} />
                        Tambah Hotel
                      </button>
                    </div>

                    {/* List of Hotel Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {(!formData.rincianHotel || formData.rincianHotel.length === 0) ? (
                        <div style={{ padding: '0.75rem', textAlign: 'center', background: 'var(--bg-main)', borderRadius: '6px', border: '1px dashed var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Belum ada rincian hotel. Klik <b>+ Tambah Hotel</b> di atas jika ada biaya menginap.
                        </div>
                      ) : (
                        formData.rincianHotel.map((hotel, idx) => (
                          <div
                            key={hotel.id || idx}
                            style={{
                              padding: '0.6rem',
                              background: 'rgba(5, 150, 105, 0.04)',
                              border: '1px solid rgba(5, 150, 105, 0.2)',
                              borderRadius: '6px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.4rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', width: '20px' }}>#{idx + 1}</span>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="Nama Hotel / Keterangan (cth: Hotel Mercure)"
                                value={hotel.namaHotel || ''}
                                onChange={(e) => handleUpdateHotel(idx, 'namaHotel', e.target.value)}
                                style={{ flex: 1, fontSize: '0.82rem', padding: '0.35rem 0.5rem' }}
                              />
                              <button
                                type="button"
                                className="btn btn-icon btn-sm"
                                onClick={() => handleRemoveHotel(idx)}
                                title="Hapus baris hotel"
                                style={{ color: '#ef4444', borderColor: 'transparent', padding: '4px' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '0.4rem', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <input
                                  type="number"
                                  min="1"
                                  className="form-input"
                                  placeholder="Mlm"
                                  value={hotel.jumlahMalam || ''}
                                  onChange={(e) => handleUpdateHotel(idx, 'jumlahMalam', e.target.value)}
                                  style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem 0.4rem', textAlign: 'center' }}
                                  title="Jumlah Malam"
                                />
                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>mlm</span>
                              </div>
                              <div>
                                <input
                                  type="number"
                                  min="0"
                                  className="form-input"
                                  placeholder="Tarif / Mlm (Rp)"
                                  value={hotel.tarifPerMalam || ''}
                                  onChange={(e) => handleUpdateHotel(idx, 'tarifPerMalam', e.target.value)}
                                  style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem 0.4rem' }}
                                  title="Tarif per Malam"
                                />
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 800 }}>
                                  {formatRupiah(Number(hotel.totalBiaya) || ((Number(hotel.jumlahMalam) || 1) * (Number(hotel.tarifPerMalam) || 0)))}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Total Summary of Hotel */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'rgba(5, 150, 105, 0.12)', borderRadius: '6px', border: '1px solid rgba(5, 150, 105, 0.3)' }}>
                      <span style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 700 }}>
                        Total Biaya Hotel:
                      </span>
                      <span style={{ fontSize: '0.92rem', color: '#059669', fontWeight: 800 }}>
                        {formatRupiah(calculations.totalHotel)}
                      </span>
                    </div>

                    {/* Attachment Upload */}
                    <MultiDocUpload
                      value={formData.fileKwitansiHotelName}
                      onChange={(val) => setFormData((prev) => ({ ...prev, fileKwitansiHotelName: val }))}
                      onPreview={setPreviewAttachment}
                      title="Bukti Kwitansi Hotel / Penginapan"
                      label="Kwitansi Hotel"
                      icon={Receipt}
                      color="#059669"
                      bucketName="surat-tugas"
                      folderContext={{
                        year: (formData.tglMulai || '').split('-')[0] || new Date().getFullYear().toString(),
                        subFolder: `${formData.noOrder || formData.agenda || 'SP'}_${formData.namaKapal || 'KAPAL'}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
                        category: '4_Kwitansi_Hotel'
                      }}
                      maxFileSize={3 * 1024 * 1024}
                    />
                  </div>
                </div>

                {/* Section 5: Kalkulasi Otomatis Biaya Lokasi & Honorarium */}
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
                        {totalDays} Hari ({totalNights} Malam)
                      </div>
                    </div>

                    {/* Row 2 */}
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Honorarium Surveyor:</div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0284c7' }}>
                        {formatRupiah(calculations.tarifDasarLokasi || 0)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Biaya Tiket Pesawat / Transport:</div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#059669' }}>
                        {formatRupiah(calculations.totalTiket || 0)}
                      </div>
                    </div>

                    {/* Row 3: Biaya Hotel & TAT (TAT hanya muncul jika Luar Kota) */}
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Biaya Hotel ({totalNights} Malam):</div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#059669' }}>
                        {formatRupiah(calculations.totalHotel || 0)}
                      </div>
                    </div>
                    {formData.kategoriPerjalanan === 'Luar Kota' ? (
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>Transport Asal Tujuan (TAT):</div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: formData.tanpaTAT ? '#94a3b8' : '#d97706' }}>
                          {formData.tanpaTAT ? 'Rp 0 (Tanpa TAT)' : formatRupiah(calculations.biayaTAT || 0)}
                        </div>
                      </div>
                    ) : (
                      <div />
                    )}

                    {/* Row 4 */}
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.2rem' }}>
                        Uang Harian ({totalDays} Hari{effectiveHolidays > 0 ? ` • Termasuk ${effectiveHolidays} Libur` : ''}):
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#9333ea' }}>
                        {formatRupiah(calculations.totalUangHarian || 0)}
                      </div>
                      {effectiveHolidays > 0 && !formData.tanpaUangHarian && (
                        <div style={{ fontSize: '0.7rem', color: '#be123c', fontWeight: 600, marginTop: '0.2rem' }}>
                          *Termasuk bonus +50% hari libur ({formatRupiah(calculations.tambahanLibur)})
                        </div>
                      )}
                    </div>

                    {/* Row 5: Biaya Expertise Flag State (SMC) jika Aktif */}
                    {(formData.isSmc || calculations.biayaExpertise > 0) && (
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#047857', marginBottom: '0.2rem', fontWeight: 700 }}>
                          Biaya Expertise Flag State (SMC):
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#047857' }}>
                          {formatRupiah(calculations.biayaExpertise)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600, marginTop: '0.2rem' }}>
                          *{formData.jumlahPendamping || 2} Pendamping x Rp 1.500.000
                        </div>
                      </div>
                    )}
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
                  folderContext={{
                    year: (formData.tglMulai || '').split('-')[0] || new Date().getFullYear().toString(),
                    subFolder: `${formData.noOrder || formData.agenda || 'SP'}_${formData.namaKapal || 'KAPAL'}`.replace(/[^a-zA-Z0-9_-]/g, '_')
                  }}
                  onSyncPrimaryFiles={({ fileVisitName, fileVisitData, fileFotoName, fileFotoData }) => {
                    setFormData((prev) => ({
                      ...prev,
                      ...(fileVisitName !== undefined && { fileVisitName, fileVisitData }),
                      ...(fileFotoName !== undefined && { fileFotoName, fileFotoData })
                    }));
                  }}
                  disabled={false}
                  onPreview={(previewObj) => setPreviewAttachment({ isOpen: true, ...previewObj })}
                  fotoList={formData.fotoList || []}
                  onChangeFotoList={(newList) => setFormData((prev) => ({ ...prev, fotoList: newList }))}
                />

                {/* Footer Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('view')}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Save size={16} />
                    <span>Terbitkan Dokumen PDS</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Print Modals */}
      <SuratTugasPrintModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} suratTugas={printSuratItem} />
      <SuratTugasPdsPrintModal isOpen={isPdsPrintModalOpen} onClose={() => setIsPdsPrintModalOpen(false)} suratTugas={printPdsItem} />
      <BiayaPdsPrintModal isOpen={isBiayaPrintModalOpen} onClose={() => setIsBiayaPrintModalOpen(false)} suratTugas={printBiayaItem} />
      <TandaTerimaSmcPrintModal isOpen={isSmcPrintModalOpen} onClose={() => setIsSmcPrintModalOpen(false)} suratTugas={printSmcItem} />
      <LaporanPrintModal isOpen={isLaporanPrintModalOpen} onClose={() => setIsLaporanPrintModalOpen(false)} laporan={printLaporanItem} />

      {/* Embedded PDS Edit Modal */}
      {isEditPdsModalOpen && (
        <PdsModal
          isOpen={isEditPdsModalOpen}
          onClose={() => {
            setIsEditPdsModalOpen(false);
            setEditingPdsItem(null);
          }}
          editItem={editingPdsItem}
          onPrint={handleOpenPdsPrint}
        />
      )}

      {/* Attachment Preview Modal */}
      <AttachmentPreviewModal
        isOpen={previewAttachment.isOpen}
        onClose={() => setPreviewAttachment({ isOpen: false, title: '', fileData: null, fileName: '' })}
        title={previewAttachment.title}
        fileData={previewAttachment.fileData}
        fileName={previewAttachment.fileName}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        title="Hapus Data Tugas / PDS"
        message={`Apakah Anda yakin ingin menghapus dokumen "${itemToDelete?.namaKapal || 'ini'}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus Data"
        cancelText="Batal"
        type="danger"
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setIsConfirmDeleteOpen(false);
          setItemToDelete(null);
        }}
      />
    </ModalPortal>
  );
};
