import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Eye,
  Pencil,
  Ship
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatRupiah, cleanDocNumber, isDocumentLocked } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';
import { sanitizeFormData, validateFileUpload } from '../utils/security';
import MultiPhotoUpload from './MultiPhotoUpload';
import ShipDatabaseSearchSelect from './ShipDatabaseSearchSelect';
import SearchableLocationSelect from './SearchableLocationSelect';
import { getLocationCategory, findTariffByLocation } from '../utils/tariffData';

import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { ShipAttachmentsUpload } from './ShipAttachmentsUpload';
import { uploadUniversalFile } from '../utils/fileStorageHelper';
import { deleteFromGoogleDrive, isGoogleDriveUrl } from '../utils/googleDriveService';
import { MultiDocUpload } from './MultiDocUpload';
import { countHolidaysAndWeekendsInRange, checkHolidayOrWeekend } from '../utils/holidays';
import { filterDataByRole, findSurveyorUser } from '../utils/filterData';

export const PdsModal = ({ isOpen, onClose, editItem = null, onPrint = null }) => {
  const { suratTugas, laporanSurvei, createPdsFromSurvey, updateSuratTugas, adminSettings, tariffs, gradeTariffs, masterKapal, updateMasterKapal, addMasterKapal } = useData();
  const { usersList, currentUser, role } = useAuth();

  const isAdmin = role === 'admin' || role === 'developer' || role === 'kacab';
  const isFinance = role === 'finance' || role === 'keuangan';
  const isLocked = Boolean(editItem && isDocumentLocked(editItem, 3) && !editItem.isUnlockedByAdmin);

  const activeTariffs = tariffs && tariffs.length > 0 ? tariffs : [];
  const defaultLocation = activeTariffs[0]?.tujuan || activeTariffs[0]?.name || 'WAJOK';
  const defaultRate = activeTariffs[0]?.rate || 500000;

  const shipDatabase = masterKapal;

  const surveyorUsers = useMemo(
    () => (usersList || []).filter((u) => u.role === 'surveyor' || u.role === 'kacab'),
    [usersList]
  );

  // Available pending SPS items for linking (filtered by role)
  const availableSpsItems = useMemo(() => {
    const roleFilteredSurat = filterDataByRole(suratTugas || [], currentUser, role, 'petugas');
    return roleFilteredSurat.filter(
      (st) => (st.docType === 'SPS' || st.isSps || (!st.docType && st.status === 'Menunggu Survei')) && !st.pdsId && st.status !== 'Selesai'
    );
  }, [suratTugas, currentUser, role]);

  const [selectedSpsIds, setSelectedSpsIds] = useState([]);
  const [shipsDetail, setShipsDetail] = useState([]);
  const [isSpsDropboxOpen, setIsSpsDropboxOpen] = useState(false);
  const [spsSearchTerm, setSpsSearchTerm] = useState('');
  const spsContainerRef = useRef(null);

  // Generate noOrder SEKALI saat modal dibuka untuk PDS baru — tidak berubah saat re-render
  const generatedNoOrderRef = useRef(null);
  useEffect(() => {
    if (isOpen && !editItem) {
      generatedNoOrderRef.current = `RFQ${Date.now().toString().slice(-8)}`;
    }
    if (!isOpen) {
      generatedNoOrderRef.current = null;
    }
  }, [isOpen, editItem]);

  // State untuk Tambah Kapal Manual (Non-SPS)
  const [showManualAddShip, setShowManualAddShip] = useState(false);
  const [manualShipName, setManualShipName] = useState('');
  const [manualNoAgenda, setManualNoAgenda] = useState('');

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
    noCda: '5100010',
    noSo: '',
    noWbs: '',
    jumlahHariLibur: 0,
    tiketHotel: 0,
    tiketPesawatTaxi: 0,
    rincianTiket: [{ id: 1, keterangan: '', nominal: 0 }],
    rincianHotel: [{ id: 1, namaHotel: '', jumlahMalam: 1, tarifPerMalam: 0, totalBiaya: 0 }],
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
  const [isManualLokasi, setIsManualLokasi] = useState(false);

  // Initialize or load editItem
  useEffect(() => {
    if (editItem) {
      const editLoc = editItem.lokasi || editItem.tempatSurvey || defaultLocation;
      const matchedTariff = findTariffByLocation(editLoc, activeTariffs);
      const editCategory = editItem.kategoriPerjalanan || matchedTariff?.kategori || getLocationCategory(editLoc, activeTariffs);

      // Load ships detail if any
      let existingShips = editItem.shipsDetail || editItem.ships_detail || [];
      if (typeof existingShips === 'string') {
        try { existingShips = JSON.parse(existingShips); } catch (e) { existingShips = []; }
      }
      setShipsDetail(existingShips);
      setSelectedSpsIds(editItem.linkedSpsIds || editItem.linked_sps_ids || []);

      let existingFotoList = editItem.fotoList || editItem.foto_list || [];
      if (typeof existingFotoList === 'string') {
        try { existingFotoList = JSON.parse(existingFotoList); } catch (e) { existingFotoList = []; }
      }

      const rawVisitData = editItem.fileVisitData || editItem.file_visit_data || (editItem.fileVisitName && (editItem.fileVisitName.startsWith('http') || editItem.fileVisitName.startsWith('data:')) ? editItem.fileVisitName : '');
      const rawFotoData = editItem.fileFotoData || editItem.file_foto_data || (editItem.fileFotoName && (editItem.fileFotoName.startsWith('http') || editItem.fileFotoName.startsWith('data:')) ? editItem.fileFotoName : '');

      // Load or convert multi tiket
      let parsedTiket = [];
      if (Array.isArray(editItem.rincianTiket) && editItem.rincianTiket.length > 0) {
        parsedTiket = editItem.rincianTiket;
      } else if (typeof editItem.rincianTiket === 'string') {
        try { parsedTiket = JSON.parse(editItem.rincianTiket); } catch (e) { parsedTiket = []; }
      }
      if (parsedTiket.length === 0) {
        parsedTiket = [{
          id: 1,
          keterangan: (Number(editItem.tiketPesawatTaxi) > 0 || Number(editItem.biayaTiket) > 0) ? 'Tiket Pesawat / Transport' : '',
          nominal: Number(editItem.tiketPesawatTaxi) || Number(editItem.biayaTiket) || 0
        }];
      }

      // Load or convert multi hotel
      let parsedHotel = [];
      if (Array.isArray(editItem.rincianHotel) && editItem.rincianHotel.length > 0) {
        parsedHotel = editItem.rincianHotel;
      } else if (typeof editItem.rincianHotel === 'string') {
        try { parsedHotel = JSON.parse(editItem.rincianHotel); } catch (e) { parsedHotel = []; }
      }
      if (parsedHotel.length === 0) {
        const mlm = Math.max(1, (editItem.tglMulai && editItem.tglSelesai) ? Math.ceil((new Date(editItem.tglSelesai) - new Date(editItem.tglMulai)) / (1000 * 3600 * 24)) : 1);
        parsedHotel = [{
          id: 1,
          namaHotel: Number(editItem.tiketHotel) > 0 ? 'Hotel / Penginapan' : '',
          jumlahMalam: mlm,
          tarifPerMalam: Number(editItem.tiketHotel) || 0,
          totalBiaya: (Number(editItem.tiketHotel) || 0) * mlm
        }];
      }

      setFormData({
        ...editItem,
        nomor: cleanDocNumber(editItem.nomor || 'A 0    /SV.201/PK/KI-26'),
        namaKapal: editItem.namaKapal || '',
        pemohon: editItem.pemohon || '',
        jenisSurvey: (editItem.jenisSurvey || 'DINAS SURVEY KLAS').toUpperCase(),
        perihal: (editItem.perihal || 'DINAS SURVEY KLAS').toUpperCase(),
        lokasi: editLoc.toUpperCase(),
        tempatSurvey: editLoc.toUpperCase(),
        noOrder: editItem.noOrder || 'RFQ-0000',
        noCda: editItem.noCda || '5100010',
        noSo: editItem.noSo || '',
        noWbs: editItem.noWbs || '',
        jumlahHariLibur: editItem.jumlahHariLibur !== undefined ? Number(editItem.jumlahHariLibur) : 0,
        tiketHotel: Number(editItem.tiketHotel) || 0,
        tiketPesawatTaxi: Number(editItem.tiketPesawatTaxi) || Number(editItem.biayaTiket) || 0,
        rincianTiket: parsedTiket,
        rincianHotel: parsedHotel,
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
        fileFotoData: rawFotoData,
        fotoList: existingFotoList,
        fileVisitName: editItem.fileVisitName || '',
        fileVisitData: rawVisitData,
        fileTiketTransportName: editItem.fileTiketTransportName || editItem.fileTiketName || '',
        fileTiketTransportData: editItem.fileTiketTransportData || editItem.fileTiketData || '',
        fileKwitansiHotelName: editItem.fileKwitansiHotelName || '',
        fileKwitansiHotelData: editItem.fileKwitansiHotelData || '',
        status: editItem.status || 'Berjalan',
        catatan: editItem.catatan || '',
        visit: editItem.visit || '1',
        tembusan: editItem.tembusan || '1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026',
        isSmc: !!editItem.isSmc,
        noSuratSmc: editItem.noSuratSmc || '1857/KU.604/KI-21',
        noSap: editItem.noSap || '',
        jumlahPendamping: editItem.jumlahPendamping !== undefined ? Number(editItem.jumlahPendamping) : 2,
        tarifExpertise: editItem.tarifExpertise !== undefined ? Number(editItem.tarifExpertise) : 1500000
      });
    } else {
      const defaultSurveyor = (role === 'surveyor' || role === 'kacab')
        ? (currentUser?.name || surveyorUsers[0]?.name || '')
        : (surveyorUsers[0]?.name || '');
      const userGrade = (findSurveyorUser(surveyorUsers, defaultSurveyor) || {})?.grade || 'GRADE 6 A';
      const todayDate = new Date().toISOString().split('T')[0];

      const initialLoc = defaultLocation || 'WAJOK';
      const matchedInitial = findTariffByLocation(initialLoc, activeTariffs);
      const initialRate = matchedInitial ? Number(matchedInitial.rate) : defaultRate;
      const initialCategory = matchedInitial?.kategori || getLocationCategory(initialLoc, activeTariffs);

      setSelectedSpsIds([]);
      setShipsDetail([]);

      setFormData({
        nomor: 'A 0    /SV.201/PK/KI-26',
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
        noOrder: generatedNoOrderRef.current || `RFQ${Date.now().toString().slice(-8)}`,
        noCda: '5100010',
        noSo: '',
        noWbs: '',
        jumlahHariLibur: 0,
        tiketHotel: 0,
        tiketPesawatTaxi: 0,
        rincianTiket: [{ id: 1, keterangan: '', nominal: 0 }],
        rincianHotel: [{ id: 1, namaHotel: '', jumlahMalam: 1, tarifPerMalam: 0, totalBiaya: 0 }],
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
        tembusan: '1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026',
        isSmc: false,
        noSuratSmc: '1857/KU.604/KI-21',
        noSap: '',
        jumlahPendamping: 2,
        tarifExpertise: 1500000
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
      const firstAgenda = firstSps?.noAgenda || firstSps?.agenda || selectedItems.map((s) => s.noAgenda || s.agenda).filter(Boolean).join(', ') || '';
      const spsLoc = firstSps?.lokasi || firstSps?.tempatSurvey || formData.lokasi || '';
      const matchedTariff = findTariffByLocation(spsLoc, activeTariffs);
      const cat = matchedTariff?.kategori || getLocationCategory(spsLoc, activeTariffs);

      setFormData((prev) => ({
        ...prev,
        namaKapal: combinedNames,
        pemohon: firstSps?.pemohon || prev.pemohon,
        noAgenda: firstAgenda || prev.noAgenda,
        agenda: firstAgenda || prev.agenda,
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
      const firstAgenda = firstSps?.noAgenda || firstSps?.agenda || availableSpsItems.map((s) => s.noAgenda || s.agenda).filter(Boolean).join(', ') || '';
      const spsLoc = firstSps?.lokasi || firstSps?.tempatSurvey || formData.lokasi || '';
      const matchedTariff = findTariffByLocation(spsLoc, activeTariffs);
      const cat = matchedTariff?.kategori || getLocationCategory(spsLoc, activeTariffs);

      setFormData((prev) => ({
        ...prev,
        namaKapal: combinedNames,
        pemohon: firstSps?.pemohon || prev.pemohon,
        noAgenda: firstAgenda || prev.noAgenda,
        agenda: firstAgenda || prev.agenda,
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

  // Location Change (dari dropdown tariff)
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

  // Location Change Manual (input bebas, tarif diisi sendiri)
  const handleManualLocationChange = (field, value) => {
    setFormData((prev) => {
      const newLokasi = field === 'lokasi' ? String(value).toUpperCase() : prev.lokasi;
      const newKategori = field === 'kategoriPerjalanan' ? value : prev.kategoriPerjalanan;
      const newTarif = field === 'tarifDasar' ? Number(value) || 0 : prev.tarifDasar;
      const tat = newKategori === 'Luar Kota' && !prev.tanpaTAT ? Number(adminSettings?.tatLuarKota || 750000) : 0;

      return {
        ...prev,
        lokasi: newLokasi,
        tempatSurvey: newLokasi,
        kategoriPerjalanan: newKategori,
        tarifDasar: newTarif,
        biayaTAT: field === 'kategoriPerjalanan' ? tat : prev.biayaTAT,
        saranaTransportasi: newKategori === 'Dalam Kota' ? 'DARAT DAN AIR' : 'UDARA, DARAT DAN AIR'
      };
    });

    // Re-split biaya kapal jika ada perubahan tarif
    if (field === 'tarifDasar' && shipsDetail.length > 1) {
      const newRate = Number(value) || 0;
      const count = shipsDetail.length;
      const perShip = Math.floor(newRate / count);
      const remainder = newRate - (perShip * count);
      setShipsDetail(shipsDetail.map((s, idx) => ({
        ...s,
        biayaSurvei: idx === count - 1 ? perShip + remainder : perShip
      })));
    }
  };

  // Date Calculation: Days, Nights, Weekend & National Holidays
  const { totalDays, totalNights, autoHolidays, holidayDetails } = useMemo(() => {
    if (!formData.tglMulai || !formData.tglSelesai) {
      return { totalDays: 1, totalNights: 0, autoHolidays: 0, holidayDetails: [] };
    }
    const start = new Date(formData.tglMulai);
    const end = new Date(formData.tglSelesai);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
    const hr = diff > 0 ? diff : 1;
    const mlm = Math.max(0, hr - 1);

    const { count, details } = countHolidaysAndWeekendsInRange(formData.tglMulai, formData.tglSelesai);
    return { totalDays: hr, totalNights: mlm, autoHolidays: count, holidayDetails: details };
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

  // Surveyor change -> sync grade (Memoized to prevent re-creation)
  const handleSurveyorChange = useCallback((name) => {
    const user = findSurveyorUser(surveyorUsers, name);
    const grade = user?.grade || 'GRADE 6 A';
    setFormData((prev) => ({
      ...prev,
      petugas: name,
      pangkat: grade
    }));
  }, [surveyorUsers]);

  // Extract only calculation-relevant fields to prevent unnecessary recalculations
  const calculationInputs = useMemo(() => ({
    kategoriPerjalanan: formData.kategoriPerjalanan,
    pangkat: formData.pangkat,
    tarifDasar: formData.tarifDasar,
    rincianTiket: formData.rincianTiket,
    rincianHotel: formData.rincianHotel,
    tiketHotel: formData.tiketHotel,
    tiketPesawatTaxi: formData.tiketPesawatTaxi,
    jumlahHariLibur: formData.jumlahHariLibur,
    tanpaTAT: formData.tanpaTAT,
    biayaTAT: formData.biayaTAT,
    tanpaUangHarian: formData.tanpaUangHarian,
    hariTanpaUangHarian: formData.hariTanpaUangHarian,
    isSmc: formData.isSmc,
    jumlahPendamping: formData.jumlahPendamping,
    tarifExpertise: formData.tarifExpertise,
    biayaExpertise: formData.biayaExpertise
  }), [
    formData.kategoriPerjalanan,
    formData.pangkat,
    formData.tarifDasar,
    formData.rincianTiket,
    formData.rincianHotel,
    formData.tiketHotel,
    formData.tiketPesawatTaxi,
    formData.jumlahHariLibur,
    formData.tanpaTAT,
    formData.biayaTAT,
    formData.tanpaUangHarian,
    formData.hariTanpaUangHarian,
    formData.isSmc,
    formData.jumlahPendamping,
    formData.tarifExpertise,
    formData.biayaExpertise
  ]);

  // Honorarium and Expense Calculations
  const calculations = useMemo(() => {
    const isLuarKota = calculationInputs.kategoriPerjalanan === 'Luar Kota';
    const hr = totalDays;
    const mlm = totalNights;

    const gradeData = (gradeTariffs || []).find(
      (g) => (g.grade || '').replace(/\s+/g, '').toUpperCase() === (calculationInputs.pangkat || 'GRADE 6 A').replace(/\s+/g, '').toUpperCase()
    ) || {};

    let sisaHariUangHarian = hr;
    if (calculationInputs.tanpaUangHarian) {
      const deduct = calculationInputs.hariTanpaUangHarian !== undefined ? Number(calculationInputs.hariTanpaUangHarian) : hr;
      sisaHariUangHarian = Math.max(0, hr - Math.max(0, Math.min(deduct, hr)));
    }

    const uangHarianRate = calculationInputs.tanpaUangHarian && sisaHariUangHarian === 0 ? 0 : (Number(gradeData.uangHarian) || 300000);
    const uangHarianTotal = uangHarianRate * sisaHariUangHarian;
    
    // Multi Hotel Total
    const uangHotelTotal = (Array.isArray(calculationInputs.rincianHotel) && calculationInputs.rincianHotel.length > 0)
      ? calculationInputs.rincianHotel.reduce((sum, h) => sum + (Number(h.totalBiaya) || ((Number(h.jumlahMalam) || 1) * (Number(h.tarifPerMalam) || 0)) || (Number(h.nominal) || 0)), 0)
      : (Number(calculationInputs.tiketHotel) || 0) * mlm;

    const hrLibur = Number(calculationInputs.jumlahHariLibur) || 0;
    const hrLbrTotal = calculationInputs.tanpaUangHarian && sisaHariUangHarian === 0 ? 0 : hrLibur * uangHarianRate * 0.5;

    // Multi Tiket Transport Total
    const tiketTransport = (Array.isArray(calculationInputs.rincianTiket) && calculationInputs.rincianTiket.length > 0)
      ? calculationInputs.rincianTiket.reduce((sum, t) => sum + (Number(t.nominal) || 0), 0)
      : (Number(calculationInputs.tiketPesawatTaxi) || 0);

    const tat = calculationInputs.tanpaTAT ? 0 : Number(calculationInputs.biayaTAT || (isLuarKota ? (adminSettings?.tatLuarKota || 750000) : 0));
    const rateSK = Number(calculationInputs.tarifDasar) || 0;

    const biayaExpertise = calculationInputs.isSmc
      ? (Number(calculationInputs.jumlahPendamping !== undefined ? calculationInputs.jumlahPendamping : 2) * Number(calculationInputs.tarifExpertise !== undefined ? calculationInputs.tarifExpertise : 1500000))
      : (Number(calculationInputs.biayaExpertise) || 0);

    let totalBiaya = 0;
    if (isLuarKota) {
      totalBiaya = tiketTransport + tat + rateSK + uangHarianTotal + uangHotelTotal + hrLbrTotal + biayaExpertise;
    } else {
      totalBiaya = rateSK + uangHarianTotal + uangHotelTotal + hrLbrTotal + biayaExpertise;
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
      biayaExpertise,
      totalBiaya
    };
  }, [calculationInputs, totalDays, totalNights, gradeTariffs, adminSettings]);

  // Multi-Tiket Transport Handlers (Memoized)
  const handleAddTiket = useCallback(() => {
    setFormData((prev) => {
      const list = Array.isArray(prev.rincianTiket) ? [...prev.rincianTiket] : [];
      list.push({ id: Date.now(), keterangan: '', nominal: 0 });
      const total = list.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
      return { ...prev, rincianTiket: list, tiketPesawatTaxi: total };
    });
  }, []);

  const handleUpdateTiket = useCallback((index, field, value) => {
    setFormData((prev) => {
      const list = Array.isArray(prev.rincianTiket) ? [...prev.rincianTiket] : [];
      if (!list[index]) return prev;
      list[index] = { ...list[index], [field]: field === 'nominal' ? Number(value) || 0 : value };
      const total = list.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
      return { ...prev, rincianTiket: list, tiketPesawatTaxi: total };
    });
  }, []);

  const handleRemoveTiket = useCallback((index) => {
    setFormData((prev) => {
      let list = Array.isArray(prev.rincianTiket) ? prev.rincianTiket.filter((_, i) => i !== index) : [];
      if (list.length === 0) {
        list = [{ id: Date.now(), keterangan: '', nominal: 0 }];
      }
      const total = list.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
      return { ...prev, rincianTiket: list, tiketPesawatTaxi: total };
    });
  }, []);

  // Multi-Hotel Handlers (Memoized)
  const handleAddHotel = useCallback(() => {
    setFormData((prev) => {
      const list = Array.isArray(prev.rincianHotel) ? [...prev.rincianHotel] : [];
      list.push({ id: Date.now(), namaHotel: '', jumlahMalam: 1, tarifPerMalam: 0, totalBiaya: 0 });
      const total = list.reduce((sum, item) => sum + (Number(item.totalBiaya) || ((Number(item.jumlahMalam) || 1) * (Number(item.tarifPerMalam) || 0))), 0);
      return { ...prev, rincianHotel: list, tiketHotel: total };
    });
  }, []);

  const handleUpdateHotel = useCallback((index, field, value) => {
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
  }, []);

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
      const uploadRes = await uploadUniversalFile({
        file,
        folderContext: {
          subFolder: formData.noAgenda || formData.nomor || 'PDS',
          shipName: formData.namaKapal || '',
          category: fieldKey
        }
      });

      const url = uploadRes?.url || '';
      if (fieldKey === 'tiketTransport') setFormData((prev) => ({ ...prev, fileTiketTransportName: url }));
      if (fieldKey === 'kwitansiHotel') setFormData((prev) => ({ ...prev, fileKwitansiHotelName: url }));
      if (fieldKey === 'visit') setFormData((prev) => ({ ...prev, fileVisitName: url }));
    } catch (err) {
      console.warn('Fallback to base64 for file:', file.name, err);
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

    const totalTiketCalc = (Array.isArray(formData.rincianTiket) && formData.rincianTiket.length > 0)
      ? formData.rincianTiket.reduce((sum, t) => sum + (Number(t.nominal) || 0), 0)
      : Number(formData.tiketPesawatTaxi) || 0;

    const totalHotelCalc = (Array.isArray(formData.rincianHotel) && formData.rincianHotel.length > 0)
      ? formData.rincianHotel.reduce((sum, h) => sum + (Number(h.totalBiaya) || ((Number(h.jumlahMalam) || 1) * (Number(h.tarifPerMalam) || 0)) || (Number(h.nominal) || 0)), 0)
      : (Number(formData.tiketHotel) || 0) * totalNights;

    const payload = sanitizeFormData({
      ...formData,
      docType: 'PDS',
      isPds: true,
      jumlahEstimasi: calculations.totalBiaya,
      isSmc: !!formData.isSmc,
      noSuratSmc: formData.isSmc ? (formData.noSuratSmc || '1857/KU.604/KI-21') : '',
      noSap: formData.noSap || '',
      jumlahPendamping: formData.isSmc ? (Number(formData.jumlahPendamping) || 2) : 0,
      tarifExpertise: formData.isSmc ? (Number(formData.tarifExpertise) || 1500000) : 0,
      biayaExpertise: calculations.biayaExpertise || 0,
      tiketPesawatTaxi: totalTiketCalc,
      tiketHotel: (formData.rincianHotel && formData.rincianHotel.length > 0 && totalNights > 0) ? Math.round(totalHotelCalc / totalNights) : (Number(formData.tiketHotel) || 0),
      totalBiayaHotel: totalHotelCalc,
      rincianTiket: formData.rincianTiket || [],
      rincianHotel: formData.rincianHotel || [],
      biayaTiket: totalTiketCalc + totalHotelCalc,
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
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
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

              <fieldset disabled={isLocked} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0, width: '100%', maxWidth: '100%', opacity: isLocked ? 0.9 : 1 }}>
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
                              const isDef = !newPrefix || /^A[\s.]*0*$/i.test(newPrefix.trim());
                              const combined = isDef
                                ? `${newPrefix ? newPrefix.trim() : 'A 0'}    ${currentSuffix}`
                                : `${newPrefix.trim()} ${currentSuffix}`;
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
                              const isDef = !prefix || /^A[\s.]*0*$/i.test(prefix.trim());
                              const combined = isDef
                                ? `${prefix ? prefix.trim() : 'A 0'}    ${newSuffix}`
                                : `${prefix.trim()} ${newSuffix}`;
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
                  marginBottom: '1.25rem',
                  maxWidth: '100%',
                  boxSizing: 'border-box'
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
                    <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: '0.6rem' }}>
                      <table style={{ width: '100%', minWidth: '460px', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-card)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>No</th>
                          <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>Nama Kapal</th>
                          <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>No. Agenda</th>
                          {shipsDetail.length > 1 && (
                            <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)', width: '170px' }}>
                              Alokasi Biaya Survei (Rp) *
                            </th>
                          )}
                          <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)', textAlign: 'center', width: '40px' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const ShipRow = ({ sh, idx }) => {
                            const [editingNamaKapal, setEditingNamaKapal] = React.useState(false);
                            const [editNamaKapalVal, setEditNamaKapalVal] = React.useState(sh.namaKapal || '');
                            const saveEdit = (val) => {
                              const trimmed = val.trim().toUpperCase();
                              const updated = shipsDetail.map((s, i) => i === idx ? { ...s, namaKapal: trimmed } : s);
                              setShipsDetail(updated);
                              const mk = (masterKapal || []).find(k => k.namaKapal === sh.namaKapal);
                              if (mk && updateMasterKapal) updateMasterKapal(mk.id, { namaKapal: trimmed, noAgenda: sh.noAgenda || mk.noAgenda });
                              setEditingNamaKapal(false);
                            };
                            return (
                              <tr key={sh.spsId || idx}>
                                <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>{idx + 1}</td>
                                <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)', fontWeight: 800 }}>
                                  {editingNamaKapal ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <input
                                        type="text"
                                        className="form-input"
                                        autoFocus
                                        style={{ padding: '0.15rem 0.4rem', fontSize: '0.82rem', height: '28px', fontWeight: 700, maxWidth: '180px', textTransform: 'uppercase' }}
                                        value={editNamaKapalVal}
                                        onChange={(e) => setEditNamaKapalVal(e.target.value.toUpperCase())}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') saveEdit(editNamaKapalVal);
                                          if (e.key === 'Escape') setEditingNamaKapal(false);
                                        }}
                                      />
                                      <button type="button" onClick={() => saveEdit(editNamaKapalVal)} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
                                        ✓
                                      </button>
                                      <button type="button" onClick={() => setEditingNamaKapal(false)} style={{ background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '0.72rem' }}>
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>{sh.namaKapal}</span>
                                      <button type="button" onClick={() => { setEditNamaKapalVal(sh.namaKapal || ''); setEditingNamaKapal(true); }}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: '#94a3b8', display: 'inline-flex' }}
                                        title="Edit nama kapal">
                                        <Pencil size={12} />
                                      </button>
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>
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
                                      if (idx === 0) setFormData((prev) => ({ ...prev, noAgenda: val, agenda: val }));
                                    }}
                                  />
                                </td>
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
                            );
                          };
                          return shipsDetail.map((sh, idx) => <ShipRow key={sh.spsId || idx} sh={sh} idx={idx} />);
                        })()}
                      </tbody>
                    </table>
                  </div>

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
                  marginBottom: '1.25rem',
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  📋 RINCIAN SURVEI, LOKASI & TANGGAL
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 700 }}>Tempat Survey & Tarif SK *</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span className={`badge ${formData.kategoriPerjalanan === 'Luar Kota' ? 'badge-primary' : 'badge-success'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                          {formData.kategoriPerjalanan || 'Dalam Kota'}
                        </span>
                        {/* Toggle Manual Input */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsManualLokasi((prev) => !prev);
                            if (isManualLokasi) {
                              // Saat kembali ke dropdown, reset ke tariff pertama yang cocok
                              handleLocationChange(formData.lokasi);
                            }
                          }}
                          style={{
                            fontSize: '0.65rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '6px',
                            border: `1px solid ${isManualLokasi ? '#f59e0b' : 'var(--border-color)'}`,
                            background: isManualLokasi ? '#fef3c7' : 'var(--bg-secondary)',
                            color: isManualLokasi ? '#92400e' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontWeight: 700,
                            transition: 'all 0.15s'
                          }}
                        >
                          {isManualLokasi ? '✏️ Mode Manual' : '+ Input Manual'}
                        </button>
                      </div>
                    </label>

                    {/* Dropdown Mode (default) */}
                    {!isManualLokasi && (
                      <SearchableLocationSelect
                        activeTariffs={activeTariffs}
                        value={formData.lokasi}
                        onChange={(val) => handleLocationChange(val)}
                        getLocationCategory={getLocationCategory}
                        showRate={true}
                        formatRupiah={formatRupiah}
                        required
                      />
                    )}

                    {/* Manual Input Mode */}
                    {isManualLokasi && (
                      <div
                        style={{
                          border: '1.5px dashed #f59e0b',
                          borderRadius: '10px',
                          padding: '0.85rem 1rem',
                          background: 'rgba(254, 243, 199, 0.4)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem'
                        }}
                      >
                        <div style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          ✏️ Input lokasi dan tarif secara manual — tidak terikat daftar tarif baku
                        </div>

                        {/* Baris 1: Nama Lokasi + Kategori */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Nama Lokasi / Tujuan *</label>
                            <input
                              type="text"
                              className="form-input"
                              value={formData.lokasi}
                              onChange={(e) => handleManualLocationChange('lokasi', e.target.value)}
                              placeholder="Contoh: PELABUHAN KHUSUS PERTAMINA"
                              style={{ textTransform: 'uppercase' }}
                              required
                            />
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>Kategori Perjalanan *</label>
                            <select
                              className="form-select"
                              value={formData.kategoriPerjalanan || 'Dalam Kota'}
                              onChange={(e) => handleManualLocationChange('kategoriPerjalanan', e.target.value)}
                            >
                              <option value="Dalam Kota">📍 Dalam Kota</option>
                              <option value="Luar Kota">✈️ Luar Kota</option>
                            </select>
                          </div>
                        </div>

                        {/* Baris 2: Tarif Honorarium */}
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Tarif Honorarium SK (Rp) *</span>
                            <span style={{ fontWeight: 800, color: '#0284c7', fontSize: '0.82rem' }}>
                              {formatRupiah(Number(formData.tarifDasar) || 0)}
                            </span>
                          </label>
                          <input
                            type="number"
                            className="form-input"
                            value={formData.tarifDasar || ''}
                            onChange={(e) => handleManualLocationChange('tarifDasar', e.target.value)}
                            placeholder="Contoh: 750000"
                            min={0}
                            step={50000}
                            style={{ fontWeight: 700 }}
                          />
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
                            Nilai ini akan langsung masuk ke kalkulasi biaya di bawah
                          </div>
                        </div>
                      </div>
                    )}
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

                {/* Keterangan Otomatis Hari Libur / Akhir Pekan (+50% Uang Harian) */}
                {calculations.hrLibur > 0 && (
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
                        <span>Survei pada Hari Libur / Akhir Pekan ({calculations.hrLibur} Hari Terdeteksi)</span>
                        <span style={{ fontSize: '0.7rem', background: '#be123c', color: '#ffffff', padding: '0.1rem 0.45rem', borderRadius: '4px', fontWeight: 800 }}>
                          UANG HARIAN NAIK +50%
                        </span>
                      </div>
                      <div>
                        Uang harian per hari libur mendapat tambahan <strong>+50% (+{formatRupiah(calculations.uangHarianRate * 0.5)})</strong> → Total Uang Harian per hari libur menjadi <strong>{formatRupiah(calculations.uangHarianRate * 1.5)}</strong>.
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

              {/* Section 6: Biaya Transportasi & Hotel (Multi-Item) */}
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
                        Belum ada rincian tiket. Klik <b>+ Tambah Tiket</b> di atas jika ada tiket pesawat/transport PP.
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
                      {formatRupiah(calculations.tiketTransport)}
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
                    disabled={isLocked}
                    bucketName="lampiran"
                    folderContext={{
                      year: (formData.tglMulai || '').split('-')[0] || new Date().getFullYear().toString(),
                      subFolder: `${formData.noOrder || formData.agenda || 'PDS'}_${formData.namaKapal || 'KAPAL'}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
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
                      {formatRupiah(calculations.uangHotelTotal)}
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
                    disabled={isLocked}
                    bucketName="lampiran"
                    folderContext={{
                      year: (formData.tglMulai || '').split('-')[0] || new Date().getFullYear().toString(),
                      subFolder: `${formData.noOrder || formData.agenda || 'PDS'}_${formData.namaKapal || 'KAPAL'}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
                      category: '4_Kwitansi_Hotel'
                    }}
                    maxFileSize={3 * 1024 * 1024}
                  />
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
                  boxShadow: '0 4px 16px rgba(2, 132, 199, 0.06)',
                  maxWidth: '100%',
                  boxSizing: 'border-box'
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
                      Uang Harian ({calculations.hr} Hari{calculations.hrLibur > 0 ? ` • Termasuk ${calculations.hrLibur} Libur` : ''}):
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#9333ea' }}>
                      {formatRupiah(calculations.uangHarianTotal + (calculations.hrLbrTotal || 0))}
                    </div>
                    {calculations.hrLibur > 0 && !formData.tanpaUangHarian && (
                      <div style={{ fontSize: '0.7rem', color: '#be123c', fontWeight: 600, marginTop: '0.2rem' }}>
                        *Termasuk bonus +50% hari libur ({formatRupiah(calculations.hrLbrTotal)})
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
                  subFolder: `${formData.noOrder || formData.agenda || 'PDS'}_${formData.namaKapal || 'KAPAL'}`.replace(/[^a-zA-Z0-9_-]/g, '_')
                }}
                onSyncPrimaryFiles={({ fileVisitName, fileVisitData, fileFotoName, fileFotoData }) => {
                  setFormData((prev) => ({
                    ...prev,
                    ...(fileVisitName !== undefined && { fileVisitName, fileVisitData }),
                    ...(fileFotoName !== undefined && { fileFotoName, fileFotoData })
                  }));
                }}
                disabled={isLocked}
                onPreview={(previewObj) => setPreviewAttachment({ isOpen: true, ...previewObj })}
                fotoList={formData.fotoList || []}
                onChangeFotoList={(newList) => setFormData((prev) => ({ ...prev, fotoList: newList }))}
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
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ flexShrink: 0, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
