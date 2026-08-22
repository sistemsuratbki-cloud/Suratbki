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
  Eye
} from 'lucide-react';
import { formatDateIndo, getStatusBadgeClass, formatRupiah, cleanDocNumber, isDocumentLocked } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { getLocationCategory, findTariffByLocation } from '../utils/tariffData';
import { ModalPortal } from './ModalPortal';
import { SuratTugasPrintModal } from './SuratTugasPrintModal';
import { SuratTugasPdsPrintModal } from './SuratTugasPdsPrintModal';
import { BiayaPdsPrintModal } from './BiayaPdsPrintModal';
import { LaporanPrintModal } from './LaporanPrintModal';
import { PdsModal } from './PdsModal';
import { sanitizeFormData } from '../utils/security';
import MultiSurveySelect from './MultiSurveySelect';
import MultiPhotoUpload from './MultiPhotoUpload';
import ShipDatabaseSearchSelect from './ShipDatabaseSearchSelect';
import { extractShipDatabase } from '../utils/shipDatabase';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';

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
  const {
    suratTugas: allSuratTugas,
    createPdsFromSurvey,
    updateSuratTugas,
    updateKwitansiHonor,
    kwitansiHonor,
    adminSettings,
    tariffs,
    gradeTariffs
  } = useData();

  const activeTariffs = tariffs && tariffs.length > 0 ? tariffs : [];
  const surveyorUsers = useMemo(
    () => (usersList || []).filter((u) => u.role === 'surveyor' || u.role === 'kacab'),
    [usersList]
  );

  const defaultLoc = activeTariffs.find((t) => (t.kategori || getLocationCategory(t.name, activeTariffs)) === 'Dalam Kota') || activeTariffs[0];
  const defaultLocName = defaultLoc?.tujuan || defaultLoc?.name || 'WAJOK';
  const defaultLocRate = defaultLoc ? Number(defaultLoc.rate) : 500000;

  const shipDatabase = useMemo(
    () => extractShipDatabase(allSuratTugas, laporanList),
    [allSuratTugas, laporanList]
  );

  // Available pending SPS items across all assignments
  const availableSpsItems = useMemo(() => {
    return (allSuratTugas || []).filter(
      (st) => (st.docType === 'SPS' || st.isSps || (!st.docType && st.status === 'Menunggu Survei')) && !st.pdsId && st.status !== 'Selesai'
    );
  }, [allSuratTugas]);

  const [activeTab, setActiveTab] = useState('view');
  const [selectedSpsIds, setSelectedSpsIds] = useState([]);
  const [shipsDetail, setShipsDetail] = useState([]);
  const [isSpsDropboxOpen, setIsSpsDropboxOpen] = useState(false);
  const [spsSearchTerm, setSpsSearchTerm] = useState('');
  const spsContainerRef = useRef(null);

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
    jenisSurvey: '',
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
    tembusan: '1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026'
  });

  // Separate tasks on selected date into Pending SPS vs Completed/Active PDS
  const { pendingSpsList, pdsList } = useMemo(() => {
    const sps = [];
    const pds = [];

    tasksOnDate.forEach((st) => {
      const isPds = st.docType === 'PDS' || st.isPds;
      const isSps = st.docType === 'SPS' || st.isSps || (!st.docType && st.status === 'Menunggu Survei');

      if (isPds) {
        pds.push(st);
      } else if (isSps && !st.pdsId && st.status !== 'Selesai') {
        sps.push(st);
      }
    });

    return { pendingSpsList: sps, pdsList: pds };
  }, [tasksOnDate]);

  useEffect(() => {
    if (isOpen && selectedDate) {
      const formatted = selectedDate.includes('T') ? selectedDate.split('T')[0] : selectedDate;
      const defaultSurveyor = currentUser?.name || surveyorUsers[0]?.name || 'ALFIAN BONE PUTRA';
      const userGrade = surveyorUsers.find((u) => u.name === defaultSurveyor)?.grade || 'GRADE 6 A';
      const nextNum = String(Math.floor(Math.random() * 900) + 100);

      setFormData((prev) => ({
        ...prev,
        nomor: `A 0    /SV.${nextNum}/PK/KI-26`,
        tglMulai: formatted,
        tglSelesai: formatted,
        petugas: defaultSurveyor,
        pangkat: userGrade,
        kategoriPerjalanan: 'Dalam Kota',
        kategoriTransportasi: 'Pesawat Terbang',
        tiketHotel: 0,
        tiketPesawatTaxi: 0,
        jumlahHariLibur: 0,
        isCito: false,
        visit: '1',
        namaKapal: '',
        jenisSurvey: '',
        noAgenda: '',
        noOrder: `RFQ260${nextNum}`,
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

  const handleAutoSplitTariff = () => {
    if (shipsDetail.length === 0) return;
    const count = shipsDetail.length;
    const rateSK = Number(formData.tarifDasar) || 0;
    const perShip = Math.floor(rateSK / count);
    const remainder = rateSK - (perShip * count);

    const updated = shipsDetail.map((s, idx) => ({
      ...s,
      biayaSurvei: idx === count - 1 ? perShip + remainder : perShip
    }));
    setShipsDetail(updated);
    toast.success(`Tarif lokasi ${formatRupiah(rateSK)} berhasil dibagi rata ke ${count} kapal.`);
  };

  const targetTarifLokasi = Number(formData.tarifDasar) || 0;
  const totalPembagianKapal = useMemo(() => {
    if (shipsDetail.length <= 1) return targetTarifLokasi;
    return shipsDetail.reduce((sum, s) => sum + (Number(s.biayaSurvei) || 0), 0);
  }, [shipsDetail, targetTarifLokasi]);

  const selisihPembagian = totalPembagianKapal - targetTarifLokasi;
  const isPembagianValid = shipsDetail.length <= 1 || selisihPembagian === 0;

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

  const handleRemoveShipFromDetail = (namaKapal) => {
    const updated = shipsDetail.filter((s) => s.namaKapal !== namaKapal);
    setShipsDetail(updated);
    setFormData((prev) => ({
      ...prev,
      namaKapal: updated.map((s) => s.namaKapal).join(', ')
    }));
  };

  // Date & Weekend Calculation
  const { totalDays, totalNights, autoHolidays } = useMemo(() => {
    if (!formData.tglMulai || !formData.tglSelesai) {
      return { totalDays: 1, totalNights: 0, autoHolidays: 0 };
    }
    const start = new Date(formData.tglMulai);
    const end = new Date(formData.tglSelesai);
    const timeDiff = end.getTime() - start.getTime();
    let days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    if (days < 1 || isNaN(days)) days = 1;
    const nights = Math.max(0, days - 1);

    let countLibur = 0;
    if (!isNaN(start) && !isNaN(end)) {
      const cur = new Date(start);
      while (cur <= end) {
        const d = cur.getDay();
        if (d === 0 || d === 6) countLibur++;
        cur.setDate(cur.getDate() + 1);
      }
    }
    return { totalDays: days, totalNights: nights, autoHolidays: countLibur };
  }, [formData.tglMulai, formData.tglSelesai]);

  const effectiveHolidays = formData.jumlahHariLibur !== undefined ? Number(formData.jumlahHariLibur) : autoHolidays;

  // Real-time Tariff & Cost Calculation
  const calculations = useMemo(() => {
    const userGrade = formData.pangkat || 'GRADE 6 A';
    const gradeData =
      (gradeTariffs || []).find(
        (g) => (g.grade || '').replace(/\s+/g, '').toUpperCase() === userGrade.replace(/\s+/g, '').toUpperCase()
      ) || {};

    const isLuarKota = formData.kategoriPerjalanan === 'Luar Kota';
    const tarifDasarLokasi = Number(formData.tarifDasar) || 0;
    const totalTiket = Number(formData.tiketPesawatTaxi) || 0;
    const totalHotel = Number(formData.tiketHotel) || 0;
    const biayaTAT = !formData.tanpaTAT && isLuarKota ? Number(formData.biayaTAT || adminSettings?.tatLuarKota || 750000) : 0;

    let sisaHari = totalDays;
    if (formData.tanpaUangHarian) {
      const deduct = formData.hariTanpaUangHarian !== undefined ? Number(formData.hariTanpaUangHarian) : totalDays;
      sisaHari = Math.max(0, totalDays - Math.min(deduct, totalDays));
    }

    const uangHarianPerHari = formData.tanpaUangHarian && sisaHari === 0 ? 0 : (Number(gradeData.uangHarian) || 300000);
    const tambahanLibur = formData.tanpaUangHarian && sisaHari === 0 ? 0 : effectiveHolidays * (uangHarianPerHari * 0.5);
    const totalUangHarian = (uangHarianPerHari * sisaHari) + tambahanLibur;

    const totalBiaya = isLuarKota
      ? (tarifDasarLokasi + totalTiket + totalHotel + biayaTAT + totalUangHarian)
      : (tarifDasarLokasi + totalHotel + totalUangHarian);

    return {
      uangHarianPerHari,
      tambahanLibur,
      totalUangHarian,
      biayaTAT,
      totalTiket,
      totalHotel,
      tarifDasarLokasi,
      totalBiaya
    };
  }, [formData, totalDays, effectiveHolidays, gradeTariffs, adminSettings]);

  // Upload file handlers
  const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

  const handleFileUpload = async (e, fieldKey) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Ukuran file "${file.name}" melebihi batas maksimum 3 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB). Mohon gunakan file di bawah 3 MB.`);
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

      const { data, error } = await supabase.storage.from('surat-tugas').upload(filePath, file, { cacheControl: '3600', upsert: false });

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

    const cleanJenis = (formData.jenisSurvey || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s.toUpperCase() !== 'DINAS SURVEY KLAS');

    if (cleanJenis.length === 0) {
      toast.error('Jenis Survey wajib dipilih (minimal 1 jenis survei)!');
      return;
    }

    if (shipsDetail.length > 1 && !isPembagianValid) {
      const selisih = Math.abs(selisihPembagian);
      const statusText = selisihPembagian < 0 ? 'kurang' : 'lebih';
      toast.error(`Gagal Terbitkan PDS! Total alokasi biaya kapal (${formatRupiah(totalPembagianKapal)}) ${statusText} ${formatRupiah(selisih)} dari tarif lokasi (${formatRupiah(targetTarifLokasi)}). Mohon sesuaikan nominal pembagian biaya agar pas.`);
      return;
    }

    const payload = sanitizeFormData({
      ...formData,
      docType: 'PDS',
      isPds: true,
      uangHarian: calculations.uangHarianPerHari,
      totalUangHarian: calculations.totalUangHarian,
      jumlahEstimasi: calculations.totalBiaya,
      estimasiBiayaTotal: calculations.totalBiaya,
      biayaTiket: Number(formData.tiketPesawatTaxi) + Number(formData.tiketHotel),
      linkedSpsIds: selectedSpsIds,
      shipsDetail: shipsDetail.length > 0 ? shipsDetail : [
        {
          namaKapal: formData.namaKapal.toUpperCase(),
          noAgenda: formData.noAgenda || '-',
          noOrder: formData.noOrder || '-',
          biayaSurvei: targetTarifLokasi
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

  const handleOpenLaporanPrint = (item) => {
    setPrintLaporanItem(item);
    setIsLaporanPrintModalOpen(true);
  };

  const handleMarkPdsCompleted = (pds) => {
    updateSuratTugas(pds.id, { status: 'Selesai' });
    const relatedKwitansi = kwitansiHonor.find((k) => k.suratId === pds.id);
    if (relatedKwitansi) {
      updateKwitansiHonor(relatedKwitansi.id, { status: 'Lunas' });
    }
    toast.success(`Penugasan PDS ${pds.namaKapal} ditandai selesai.`);
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" style={{ maxWidth: '920px', width: '95vw', maxHeight: '92vh' }} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="modal-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <div className="card-title-group">
              <Calendar size={22} style={{ color: 'var(--accent-primary)' }} />
              <div>
                <h3 className="modal-title" style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                  Survei Kapal BKI • Tanggal {formattedDate}
                </h3>
                <div className="card-subtitle" style={{ fontSize: '0.75rem' }}>
                  {pendingSpsList.length} SPS Menunggu Survei • {pdsList.length} PDS Terlaksana
                </div>
              </div>
            </div>
            <button className="btn btn-secondary btn-icon" onClick={onClose} type="button">
              <X size={18} />
            </button>
          </div>

          {/* Tab Navigation */}
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
              <span>Daftar Tugas & Kapal ({tasksOnDate.length})</span>
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

          {/* Modal Body */}
          <div className="modal-body" style={{ maxHeight: 'calc(92vh - 140px)', overflowY: 'auto', padding: '1.25rem' }}>
            {activeTab === 'view' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* 1. SEKSI PDS RESMI YANG TELAH TERBIT */}
                <div
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

                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setActiveTab('input')}
                      style={{ fontSize: '0.75rem', fontWeight: 700 }}
                    >
                      <Plus size={14} />
                      <span>Input PDS Baru</span>
                    </button>
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

                                {pds.status === 'Selesai' ? (
                                  <span
                                    className="badge"
                                    style={{
                                      background: 'rgba(16, 185, 129, 0.15)',
                                      color: '#059669',
                                      fontWeight: 800,
                                      padding: '0.15rem 0.55rem',
                                      fontSize: '0.7rem',
                                      borderRadius: '9999px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem'
                                    }}
                                  >
                                    <CheckCircle2 size={12} />
                                    <span>Selesai</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-sm"
                                    style={{
                                      padding: '0.15rem 0.6rem',
                                      fontSize: '0.7rem',
                                      fontWeight: 800,
                                      background: '#10b981',
                                      color: '#ffffff',
                                      borderColor: '#10b981',
                                      borderRadius: '9999px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => handleMarkPdsCompleted(pds)}
                                  >
                                    <CheckCircle2 size={12} />
                                    <span>Tandai Selesai</span>
                                  </button>
                                )}

                                {/* Approval Badge */}
                                {pds.approvalStatus === 'ACC' && (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      background: '#dcfce7',
                                      color: '#15803d',
                                      border: '1px solid #86efac',
                                      padding: '0.1rem 0.4rem',
                                      borderRadius: '4px'
                                    }}
                                    title={`Disetujui oleh ${pds.approvalBy || 'Admin'}`}
                                  >
                                    <CheckCircle size={11} /> Disetujui
                                  </span>
                                )}
                                {pds.approvalStatus === 'Revisi' && (
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
                                  >
                                    <AlertTriangle size={11} /> Perlu Revisi
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
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.74rem', fontWeight: 700, background: '#0284c7', color: '#ffffff', borderColor: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                onClick={() => handleOpenBiayaPrint(pds)}
                                title="Download / Cetak PDF Rincian Biaya Perjalanan Dinas"
                              >
                                <Calculator size={13} />
                                <span>Rincian Biaya</span>
                              </button>

                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.74rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                onClick={() => handleOpenPdsPrint(pds)}
                                title="Cetak Surat Tugas PDS"
                              >
                                <FileText size={13} />
                                <span>Cetak PDS</span>
                              </button>

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
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. SEKSI ANTRIAN SPS (DARI ADMIN) */}
                {pendingSpsList.length > 0 && (
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.25rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Layers size={18} color="var(--accent-primary)" />
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          📋 Penugasan SPS dari Admin
                        </h4>
                        <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04', fontWeight: 700 }}>
                          {pendingSpsList.length} SPS
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {pendingSpsList.map((sps) => (
                        <div
                          key={sps.id}
                          style={{
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.75rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                              🚢 {sps.namaKapal}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Agenda: <strong>{sps.noAgenda || sps.agenda || '-'}</strong> • 📍 {sps.lokasi || sps.tempatSurvey} • 👤 {sps.petugas}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '0.75rem', fontWeight: 700 }}
                            onClick={() => {
                              handleToggleSelectSps(sps);
                              setActiveTab('input');
                            }}
                          >
                            <span>Buat PDS Kapal Ini</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                            {u.name} ({u.roleLabel || u.role})
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <label className="form-label" style={{ fontWeight: 800, color: 'var(--accent-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Anchor size={16} />
                      <span>Daftar Kapal & No. Agenda Perjalanan Dinas:</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {shipsDetail.length > 0 ? `${shipsDetail.length} kapal terhubung` : 'Database Kapal Aktif'}
                    </span>
                  </div>

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
                                <span style={{ background: 'rgba(2, 132, 199, 0.1)', color: 'var(--accent-primary)', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                                  {sh.noAgenda || '-'}
                                </span>
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
                              Tarif Lokasi SK ({formData.lokasi}): <span style={{ color: '#0284c7', fontWeight: 800 }}>{formatRupiah(targetTarifLokasi)}</span>
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
                                title="Bagi rata tarif lokasi ke semua kapal"
                              >
                                ⚡ Bagi Rata Otomatis
                              </button>
                            </div>
                          </div>

                          {isPembagianValid ? (
                            <div style={{ fontSize: '0.78rem', color: '#047857', background: '#ecfdf5', padding: '0.4rem 0.75rem', borderRadius: '4px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                              <Check size={14} />
                              <span>Total pembagian biaya survei telah SESUAI dengan tarif lokasi ({formatRupiah(targetTarifLokasi)}).</span>
                            </div>
                          ) : selisihPembagian < 0 ? (
                            <div style={{ fontSize: '0.78rem', color: '#b91c1c', background: '#fef2f2', padding: '0.4rem 0.75rem', borderRadius: '4px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                              <AlertCircle size={14} />
                              <span>⚠️ Total alokasi masih KURANG {formatRupiah(Math.abs(selisihPembagian))} dari tarif lokasi. Dokumen PDS tidak dapat diterbitkan sebelum nominal pas.</span>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.78rem', color: '#b91c1c', background: '#fef2f2', padding: '0.4rem 0.75rem', borderRadius: '4px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                              <AlertCircle size={14} />
                              <span>⚠️ Total alokasi MELEBIHI {formatRupiah(selisihPembagian)} dari tarif lokasi. Dokumen PDS tidak dapat diterbitkan sebelum nominal pas.</span>
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>
                        Jenis Survey *
                      </label>
                      <MultiSurveySelect
                        value={formData.jenisSurvey}
                        onChange={(val) => setFormData({ ...formData, jenisSurvey: val })}
                        placeholder="-- PILIH JENIS SURVEY (BISA LEBIH DARI 1) --"
                      />
                    </div>

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
                        max={totalDays}
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

                {/* Section 5: Biaya Tiket Transportasi & Hotel */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  {/* Tiket Transportasi */}
                  <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Plane size={15} color="var(--accent-primary)" />
                      <span>Biaya Tiket Pesawat / Transport (Rp)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      placeholder="0"
                      value={formData.tiketPesawatTaxi || ''}
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
                          onChange={(e) => handleFileUpload(e, 'tiketTransport')}
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
                      <span>Biaya Hotel / Penginapan (Rp) /malam</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      placeholder="0"
                      value={formData.tiketHotel || ''}
                      onChange={(e) => setFormData({ ...formData, tiketHotel: Number(e.target.value) })}
                      style={{ fontWeight: 700, marginBottom: '0.5rem' }}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                      Unggah Kwitansi Hotel / Penginapan (Maks. 3 MB):
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
                          onChange={(e) => handleFileUpload(e, 'kwitansiHotel')}
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
                        Uang Harian ({totalDays} Hari{effectiveHolidays > 0 ? ` + ${effectiveHolidays} Libur` : ''}):
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#9333ea' }}>
                        {formatRupiah(calculations.totalUangHarian || 0)}
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

                {/* Section 6: Upload Dokumen / Foto Bukti */}
                <div
                  style={{
                    background: 'var(--bg-main)',
                    border: '1.5px solid var(--border-color-strong)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    marginBottom: '1.25rem'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Camera size={16} />
                    <span>{isAdmin ? 'BUKTI PERJALANAN DINAS DARI SURVEYOR' : 'UPLOAD BUKTI PERJALANAN DINAS (OPSIONAL)'}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                        <Plane size={13} style={{ display: 'inline', marginRight: '4px' }} />
                        Bukti Tiket Transportasi (Pesawat/Taxi/BBM)
                      </label>
                      {isAdmin ? (
                        formData.fileTiketTransportName ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Check size={13} color="#059669" /> File tiket terlampir
                            </span>
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
                              onClick={() => {
                                const file = formData.fileTiketTransportName;
                                if (file && (file.startsWith('http') || file.startsWith('data:'))) {
                                  window.open(file, '_blank');
                                } else {
                                  toast.info('File tiket terlampir oleh surveyor.');
                                }
                              }}
                            >
                              <Eye size={12} />
                              <span>Cek</span>
                            </button>
                          </div>
                        ) : (
                          <div style={{ padding: '0.45rem 0.65rem', background: 'var(--bg-main)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                            Belum ada lampiran tiket dari surveyor
                          </div>
                        )
                      ) : (
                        <>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileUpload(e, 'tiketTransport')}
                            className="form-input"
                            style={{ fontSize: '0.75rem', padding: '0.3rem' }}
                          />
                          {formData.fileTiketTransportName && (
                            <div style={{ fontSize: '0.7rem', color: '#059669', marginTop: '0.2rem' }}>✓ File tiket terlampir</div>
                          )}
                        </>
                      )}
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                        <Receipt size={13} style={{ display: 'inline', marginRight: '4px' }} />
                        Bukti Kwitansi Hotel / Penginapan
                      </label>
                      {isAdmin ? (
                        formData.fileKwitansiHotelName ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Check size={13} color="#059669" /> File kwitansi terlampir
                            </span>
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
                              onClick={() => {
                                const file = formData.fileKwitansiHotelName;
                                if (file && (file.startsWith('http') || file.startsWith('data:'))) {
                                  window.open(file, '_blank');
                                } else {
                                  toast.info('File kwitansi terlampir oleh surveyor.');
                                }
                              }}
                            >
                              <Eye size={12} />
                              <span>Cek</span>
                            </button>
                          </div>
                        ) : (
                          <div style={{ padding: '0.45rem 0.65rem', background: 'var(--bg-main)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                            Belum ada lampiran kwitansi dari surveyor
                          </div>
                        )
                      ) : (
                        <>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileUpload(e, 'kwitansiHotel')}
                            className="form-input"
                            style={{ fontSize: '0.75rem', padding: '0.3rem' }}
                          />
                          {formData.fileKwitansiHotelName && (
                            <div style={{ fontSize: '0.7rem', color: '#059669', marginTop: '0.2rem' }}>✓ File kwitansi terlampir</div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                      <Camera size={13} style={{ display: 'inline', marginRight: '4px' }} />
                      Foto-Foto Pelaksanaan Survei Lapangan
                    </label>
                    <MultiPhotoUpload
                      fotoList={formData.fotoList || []}
                      onChange={(list) => setFormData({ ...formData, fotoList: list })}
                      disabled={isAdmin}
                    />
                  </div>
                </div>

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
    </ModalPortal>
  );
};
