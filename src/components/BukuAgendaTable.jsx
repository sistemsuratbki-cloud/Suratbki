import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Printer,
  Calendar,
  RotateCcw,
  User,
  ArrowUpDown,
  FileSpreadsheet,
  Calculator,
  FileText,
  Paperclip,
  Eye,
  CheckCircle2,
  Anchor,
  FileCheck2,
  Camera,
  Plane,
  Receipt,
  X
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { toast } from 'react-hot-toast';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo, cleanDocNumber, formatRupiah, parseAttachmentFiles } from '../utils/formatters';
import { countHolidaysAndWeekendsInRange } from '../utils/holidays';
import { ModalPortal } from './ModalPortal';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { BukuAgendaPrintModal } from './BukuAgendaPrintModal';
import { SuratTugasPdsPrintModal } from './SuratTugasPdsPrintModal';
import { BiayaPdsPrintModal } from './BiayaPdsPrintModal';

export const BukuAgendaTable = () => {
  const { suratTugas, updateSuratTugas, laporanSurvei, kwitansiHonor, gradeTariffs, adminSettings } = useData();
  const { currentUser, role, usersList } = useAuth();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [surveyorFilter, setSurveyorFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua'); // Semua, Sudah Dicek, Selesai, Belum Dicek
  const [selectedMonth, setSelectedMonth] = useState('Semua');
  const [selectedYear, setSelectedYear] = useState('Semua');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('nomor_asc'); // nomor_asc, nomor_desc, tgl_desc, tgl_asc, kapal_asc, surveyor_asc
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPdsPrintModalOpen, setIsPdsPrintModalOpen] = useState(false);
  const [isBiayaPrintModalOpen, setIsBiayaPrintModalOpen] = useState(false);
  const [selectedPrintItem, setSelectedPrintItem] = useState(null);

  // Status Menu State
  const [activeStatusMenuId, setActiveStatusMenuId] = useState(null);

  // Lampiran Modal State
  const [lampiranModalItem, setLampiranModalItem] = useState(null);
  const [isLampiranModalOpen, setIsLampiranModalOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState({ isOpen: false, title: '', fileData: null, fileName: '' });

  // Close floating menus on global click
  useEffect(() => {
    const handleGlobalClick = () => setActiveStatusMenuId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Helper status agenda
  const getItemStatusAgenda = (item) => {
    if (item.statusAgenda) return item.statusAgenda;
    if (item.status === 'Selesai') return 'Selesai';
    if (item.isAgendaChecked) return 'Sudah Dicek';
    return 'Belum Dicek';
  };

  const resolvePdsItem = (item) => {
    if (!item) return null;
    if (item.docType === 'PDS' || item.isPds) return item;
    if (item.pdsId) {
      const parent = (suratTugas || []).find(st => st.id === item.pdsId);
      if (parent) return parent;
    }
    const parentByLink = (suratTugas || []).find(st => (st.isPds || st.docType === 'PDS') && Array.isArray(st.linkedSpsIds) && st.linkedSpsIds.includes(item.id));
    if (parentByLink) return parentByLink;
    return item;
  };

  const getPdsAttachments = (item) => {
    if (!item) return { totalCount: 0, shipAttachments: [], generalAttachments: [] };

    const isMultiShipPds =
      (item.docType === 'PDS' || item.isPds) &&
      ((Array.isArray(item.shipsDetail) && item.shipsDetail.length > 0) ||
        (Array.isArray(item.linkedSpsIds) && item.linkedSpsIds.length > 0));

    const shipAttachments = [];
    const generalAttachments = [];
    const addedFileKeys = new Set();

    if (isMultiShipPds) {
      // 1. Combined PDS with multiple ships in shipsDetail
      let parsedShipsDetail = item.shipsDetail || item.ships_detail;
      if (typeof parsedShipsDetail === 'string') {
        try {
          parsedShipsDetail = JSON.parse(parsedShipsDetail);
        } catch (e) {
          parsedShipsDetail = [];
        }
      }

      if (Array.isArray(parsedShipsDetail) && parsedShipsDetail.length > 0) {
        parsedShipsDetail.forEach((sh, sIdx) => {
          const shipName = (sh.namaKapal || sh.nama_kapal || `Kapal #${sIdx + 1}`).toUpperCase();
          const agenda = sh.noAgenda || sh.no_agenda || item.noAgenda || item.agenda || '-';
          const files = [];

          // Find exact matching child SPS or Laporan for this specific ship if available
          const matchingChildSps = (suratTugas || []).find(st =>
            (sh.id && st.id === sh.id) ||
            (Array.isArray(item.linkedSpsIds) && item.linkedSpsIds.includes(st.id) && st.namaKapal === sh.namaKapal)
          );

          const matchingChildLap = (laporanSurvei || []).find(lap =>
            (sh.id && lap.suratId === sh.id) ||
            (matchingChildSps && lap.suratId === matchingChildSps.id)
          );

          const visitFile =
            sh.fileVisitData ||
            sh.fileVisitName ||
            sh.file_visit_name ||
            sh.file_visit_data ||
            matchingChildSps?.fileVisitData ||
            matchingChildSps?.fileVisitName ||
            matchingChildLap?.fileVisitData ||
            matchingChildLap?.fileVisitName ||
            (sIdx === 0 ? (item.fileVisitData || item.fileVisitName || item.file_visit_name) : null);

          const selfieFile =
            sh.fileFotoData ||
            sh.fileFotoName ||
            sh.file_foto_name ||
            sh.file_foto_data ||
            matchingChildSps?.fileFotoData ||
            matchingChildSps?.fileFotoName ||
            matchingChildLap?.fileFotoData ||
            matchingChildLap?.fileFotoName ||
            (sIdx === 0 ? (item.fileFotoData || item.fileFotoName || item.file_foto_name) : null);

          if (visitFile && !addedFileKeys.has(`visit_${sIdx}_${visitFile}`)) {
            addedFileKeys.add(`visit_${sIdx}_${visitFile}`);
            files.push({
              type: 'visit',
              label: 'Formulir Visit Lapangan (PDF)',
              fileName: sh.fileVisitName || sh.file_visit_name || matchingChildSps?.fileVisitName || `Form_Visit_${shipName}.pdf`,
              fileData: visitFile
            });
          }

          if (selfieFile && !addedFileKeys.has(`selfie_${sIdx}_${selfieFile}`)) {
            addedFileKeys.add(`selfie_${sIdx}_${selfieFile}`);
            files.push({
              type: 'selfie',
              label: 'Foto Selfie Lapangan (PDF)',
              fileName: sh.fileFotoName || sh.file_foto_name || matchingChildSps?.fileFotoName || `Foto_Selfie_${shipName}.pdf`,
              fileData: selfieFile
            });
          }

          if (files.length > 0) {
            shipAttachments.push({ shipName, agenda, files });
          }
        });
      }
    } else {
      // 2. Individual survey row / SPS / Single Ship Report
      const matchingLap = (laporanSurvei || []).find(lap => lap.suratId === item.id || lap.id === item.id);
      const shipName = (item.namaKapal || item.nama_kapal || matchingLap?.namaKapal || 'SURVEI').toUpperCase();
      const agenda = item.noAgenda || item.no_agenda || item.agenda || matchingLap?.noAgenda || '-';
      const files = [];

      const visitFile =
        item.fileVisitData ||
        item.fileVisitName ||
        item.file_visit_name ||
        item.file_visit_data ||
        matchingLap?.fileVisitData ||
        matchingLap?.fileVisitName;

      const selfieFile =
        item.fileFotoData ||
        item.fileFotoName ||
        item.file_foto_name ||
        item.file_foto_data ||
        matchingLap?.fileFotoData ||
        matchingLap?.fileFotoName;

      if (visitFile && !addedFileKeys.has(`visit_${item.id}_${visitFile}`)) {
        addedFileKeys.add(`visit_${item.id}_${visitFile}`);
        files.push({
          type: 'visit',
          label: 'Formulir Visit Lapangan (PDF)',
          fileName: item.fileVisitName || item.file_visit_name || matchingLap?.fileVisitName || `Form_Visit_${shipName}.pdf`,
          fileData: visitFile
        });
      }

      if (selfieFile && !addedFileKeys.has(`selfie_${item.id}_${selfieFile}`)) {
        addedFileKeys.add(`selfie_${item.id}_${selfieFile}`);
        files.push({
          type: 'selfie',
          label: 'Foto Selfie Lapangan (PDF)',
          fileName: item.fileFotoName || item.file_foto_name || matchingLap?.fileFotoName || `Foto_Selfie_${shipName}.pdf`,
          fileData: selfieFile
        });
      }

      if (files.length > 0) {
        shipAttachments.push({ shipName, agenda, files });
      }
    }

    // 3. Travel receipts (Tiket, Hotel, Foto Lapangan) strictly for this item
    const matchingLap = (laporanSurvei || []).find(lap => lap.suratId === item.id || lap.id === item.id);
    const itemSources = [item, matchingLap].filter(Boolean);

    // Tiket Transport
    for (const src of itemSources) {
      const rawTiket =
        src.fileTiketTransportData ||
        src.fileTiketTransportName ||
        src.file_tiket_transport_name ||
        src.file_tiket_name ||
        src.fileTiketName;

      if (rawTiket) {
        const parsedTiket = parseAttachmentFiles(rawTiket, 'Tiket_Transport');
        parsedTiket.forEach((t, tIdx) => {
          const val = t.url || t.data;
          if (val && !addedFileKeys.has(`tiket_${val}`)) {
            addedFileKeys.add(`tiket_${val}`);
            generalAttachments.push({
              type: 'tiket',
              label: parsedTiket.length > 1 ? `Bukti Tiket Transportasi #${tIdx + 1}` : 'Bukti Tiket Transportasi (Pesawat/Taxi/BBM)',
              fileName: t.name || 'Tiket_Transport',
              fileData: val,
              files: parsedTiket
            });
          }
        });
        if (generalAttachments.some(g => g.type === 'tiket')) break;
      }
    }

    // Kwitansi Hotel
    for (const src of itemSources) {
      const rawHotel =
        src.fileKwitansiHotelData ||
        src.fileKwitansiHotelName ||
        src.file_kwitansi_hotel_name;

      if (rawHotel) {
        const parsedHotel = parseAttachmentFiles(rawHotel, 'Kwitansi_Hotel');
        parsedHotel.forEach((h, hIdx) => {
          const val = h.url || h.data;
          if (val && !addedFileKeys.has(`hotel_${val}`)) {
            addedFileKeys.add(`hotel_${val}`);
            generalAttachments.push({
              type: 'hotel',
              label: parsedHotel.length > 1 ? `Bukti Kwitansi Hotel #${hIdx + 1}` : 'Bukti Kwitansi Hotel / Penginapan',
              fileName: h.name || 'Kwitansi_Hotel',
              fileData: val,
              files: parsedHotel
            });
          }
        });
        if (generalAttachments.some(g => g.type === 'hotel')) break;
      }
    }

    // Foto Survei
    for (const src of itemSources) {
      let parsedFotoList = src.fotoList || src.foto_list;
      if (typeof parsedFotoList === 'string') {
        try {
          parsedFotoList = JSON.parse(parsedFotoList);
        } catch (e) {
          parsedFotoList = [];
        }
      }

      if (Array.isArray(parsedFotoList) && parsedFotoList.length > 0) {
        parsedFotoList.forEach((f, fIdx) => {
          const val = typeof f === 'string' ? f : f.url || f.data;
          if (val && !addedFileKeys.has(`foto_${val}`)) {
            addedFileKeys.add(`foto_${val}`);
            generalAttachments.push({
              type: 'foto_survey',
              label: `Foto Dokumentasi Survei #${fIdx + 1}`,
              fileName: typeof f === 'string' ? f : f.name || `Foto_${fIdx + 1}`,
              fileData: val
            });
          }
        });
      } else if (src.fileFotoData || src.file_foto_data) {
        const rawFotoData = src.fileFotoData || src.file_foto_data;
        const fotoUrls = typeof rawFotoData === 'string' ? rawFotoData.split('|||').map(s => s.trim()).filter(Boolean) : [];
        const rawFotoNames = (src.fileFotoName || src.file_foto_name || '').split(',').map(s => s.trim()).filter(Boolean);
        fotoUrls.forEach((fUrl, fIdx) => {
          if (fUrl && !addedFileKeys.has(`foto_${fUrl}`)) {
            addedFileKeys.add(`foto_${fUrl}`);
            generalAttachments.push({
              type: 'foto_survey',
              label: `Foto Dokumentasi Survei #${fIdx + 1}`,
              fileName: rawFotoNames[fIdx] || `Foto_${fIdx + 1}`,
              fileData: fUrl
            });
          }
        });
      }
    }

    const totalCount =
      shipAttachments.reduce((sum, s) => sum + s.files.length, 0) + generalAttachments.length;

    return { totalCount, shipAttachments, generalAttachments };
  };

  const handleOpenBiayaPrint = (item) => {
    setSelectedPrintItem(resolvePdsItem(item));
    setIsBiayaPrintModalOpen(true);
  };

  const handleOpenPdsPrint = (item) => {
    setSelectedPrintItem(resolvePdsItem(item));
    setIsPdsPrintModalOpen(true);
  };

  const handleOpenLampiran = (item) => {
    setLampiranModalItem(item);
    setIsLampiranModalOpen(true);
  };

  const monthNames = [
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = ['Semua', String(currentYear + 1), String(currentYear), String(currentYear - 1), String(currentYear - 2)];
    return Array.from(new Set(years));
  }, []);

  const surveyors = useMemo(() => {
    return usersList?.filter(u => u.role === 'surveyor' || u.role === 'kacab') || [];
  }, [usersList]);

  const formatDateDMY = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const calculateBiayaItem = (item) => {
    if (item.jumlahEstimasi && Number(item.jumlahEstimasi) > 0) {
      return Number(item.jumlahEstimasi);
    }

    const isLuarKota = (item.kategoriPerjalanan || '').toLowerCase().includes('luar') || item.kategoriPerjalanan === 'Luar Kota';
    const start = item.tglMulai ? new Date(item.tglMulai) : new Date();
    const end = item.tglSelesai ? new Date(item.tglSelesai) : start;
    const timeDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
    const hr = timeDiff > 0 ? timeDiff : 1;
    const mlm = Math.max(0, hr - 1);

    let hrLbr = 0;
    if (item.jumlahHariLibur !== undefined && item.jumlahHariLibur !== '' && !isNaN(Number(item.jumlahHariLibur))) {
      hrLbr = Number(item.jumlahHariLibur);
    } else {
      const { count } = countHolidaysAndWeekendsInRange(item.tglMulai, item.tglSelesai);
      hrLbr = count;
    }

    const surveyor = usersList?.find(u => u.name === item.petugas) || {};
    const surveyorGrade = item.pangkat || surveyor.grade || 'GRADE 6 A';
    const gradeData = (gradeTariffs || []).find(
      (g) => (g.grade || '').replace(/\s+/g, '').toUpperCase() === surveyorGrade.replace(/\s+/g, '').toUpperCase()
    ) || {};

    let sisaHariUangHarian = hr;
    if (item.tanpaUangHarian) {
      const deduct = item.hariTanpaUangHarian !== undefined ? Number(item.hariTanpaUangHarian) : hr;
      sisaHariUangHarian = Math.max(0, hr - Math.max(0, Math.min(deduct, hr)));
    }

    const uangHarianRate = (item.tanpaUangHarian && sisaHariUangHarian === 0)
      ? 0
      : (Number(item.uangHarian) || Number(gradeData.uangHarian) || 300000);
    const uangHarianTotal = uangHarianRate * sisaHariUangHarian;
    const uangHotelRate = Number(item.tiketHotel) || 0;
    const uangHotelTotal = uangHotelRate * mlm;
    const hrLbrTotal = (item.tanpaUangHarian && sisaHariUangHarian === 0) ? 0 : (hrLbr * uangHarianRate * 0.5);
    const tiketPesawatTaxi = Number(item.tiketPesawatTaxi) || Number(item.biayaTiket) || 0;
    const biayaTAT = item.tanpaTAT
      ? 0
      : (item.biayaTAT !== undefined && item.biayaTAT !== ''
          ? Number(item.biayaTAT)
          : (isLuarKota ? Number(adminSettings?.tatLuarKota || 750000) : 0));
    const rateSK = Number(item.tarifDasar) || 0;

    if (isLuarKota) {
      return tiketPesawatTaxi + biayaTAT + rateSK + uangHarianTotal + uangHotelTotal + hrLbrTotal;
    } else {
      return rateSK + uangHarianTotal + uangHotelTotal + hrLbrTotal;
    }
  };

  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'this_week') {
      const firstDay = new Date(today);
      firstDay.setDate(today.getDate() - today.getDay());
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'this_month') {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const lastDate = new Date(year, today.getMonth() + 1, 0).getDate();
      setStartDate(`${year}-${month}-01`);
      setEndDate(`${year}-${month}-${String(lastDate).padStart(2, '0')}`);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSurveyorFilter('Semua');
    setStatusFilter('Semua');
    setSelectedMonth('Semua');
    setSelectedYear('Semua');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSortBy('nomor_asc');
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    surveyorFilter !== 'Semua' ||
    statusFilter !== 'Semua' ||
    selectedMonth !== 'Semua' ||
    selectedYear !== 'Semua' ||
    startDate !== '' ||
    endDate !== '' ||
    sortBy !== 'nomor_asc';

  // Set status agenda (Sudah Dicek, Selesai, Belum Dicek)
  const handleSetStatusAgenda = async (item, newStatus) => {
    setActiveStatusMenuId(null);
    const isSelesai = newStatus === 'Selesai';
    const isSudahDicek = newStatus === 'Sudah Dicek';

    const payload = {
      ...item,
      statusAgenda: newStatus,
      isAgendaChecked: isSelesai || isSudahDicek,
      status: isSelesai ? 'Selesai' : (item.status === 'Selesai' ? 'Menunggu Survei' : (item.status || 'Menunggu Survei')),
      agendaCheckedAt: (isSelesai || isSudahDicek) ? new Date().toISOString() : null,
      agendaCheckedBy: (isSelesai || isSudahDicek) ? (currentUser?.name || currentUser?.username || 'Admin') : null
    };

    try {
      updateSuratTugas(item.id, payload);
      if (newStatus === 'Selesai') {
        toast.success(`Agenda ${cleanDocNumber(item.nomor)} diset: SELESAI ✅`);
      } else if (newStatus === 'Sudah Dicek') {
        toast.success(`Agenda ${cleanDocNumber(item.nomor)} diset: SUDAH DICEK 🔍`);
      } else {
        toast.info(`Agenda ${cleanDocNumber(item.nomor)} diset: BELUM DICEK ⏳`);
      }
    } catch (err) {
      console.error('Error updating agenda status:', err);
      toast.error('Gagal memperbarui status agenda');
    }
  };

  // Period label for export & printing
  const currentPeriodLabel = useMemo(() => {
    if (startDate && endDate) {
      return `PERIODE ${formatDateIndo(startDate).toUpperCase()} S/D ${formatDateIndo(endDate).toUpperCase()}`;
    }
    if (startDate) {
      return `SEJAK ${formatDateIndo(startDate).toUpperCase()}`;
    }
    if (selectedMonth !== 'Semua') {
      const mName = monthNames.find(m => m.value === selectedMonth)?.label?.toUpperCase() || '';
      return `BULAN ${mName} ${selectedYear !== 'Semua' ? selectedYear : ''}`;
    }
    if (selectedYear !== 'Semua') {
      return `TAHUN ${selectedYear}`;
    }
    return 'SEMUA PERIODE';
  }, [startDate, endDate, selectedMonth, selectedYear]);

  // Filter and Sort Data
  const filteredData = useMemo(() => {
    const result = suratTugas.filter((item) => {
      // Sumber data Buku Agenda berasal dari dokumen PDS (Perjalanan Dinas Surveyor)
      const isPds = item.docType === 'PDS' || item.isPds === true || (!item.docType && item.status !== 'Menunggu Survei' && !item.isSps);
      if (!isPds) {
        return false;
      }

      // Surveyor filter
      if (surveyorFilter !== 'Semua' && item.petugas !== surveyorFilter) {
        return false;
      }

      // Status filter (Semua, Selesai, Sudah Dicek, Belum Dicek)
      if (statusFilter !== 'Semua') {
        const currentStatus = getItemStatusAgenda(item);
        if (statusFilter === 'Selesai' && currentStatus !== 'Selesai') return false;
        if (statusFilter === 'Sudah Dicek' && currentStatus !== 'Sudah Dicek') return false;
        if (statusFilter === 'Belum Dicek' && currentStatus !== 'Belum Dicek') return false;
      }

      const itemDate = item.tglMulai || item.tglSelesai || '';

      // Month filter
      if (selectedMonth !== 'Semua' && itemDate) {
        const itemMonth = itemDate.substring(5, 7);
        const endMonth = item.tglSelesai ? item.tglSelesai.substring(5, 7) : itemMonth;
        if (itemMonth !== selectedMonth && endMonth !== selectedMonth) {
          return false;
        }
      }

      // Year filter
      if (selectedYear !== 'Semua' && itemDate) {
        const itemYear = itemDate.substring(0, 4);
        const endYear = item.tglSelesai ? item.tglSelesai.substring(0, 4) : itemYear;
        if (itemYear !== selectedYear && endYear !== selectedYear) {
          return false;
        }
      }

      // Date range filter
      if (startDate) {
        const itemEnd = item.tglSelesai || item.tglMulai || '';
        if (itemEnd && itemEnd < startDate) return false;
      }
      if (endDate) {
        const itemStart = item.tglMulai || item.tglSelesai || '';
        if (itemStart && itemStart > endDate) return false;
      }

      // Search
      const searchLower = searchTerm.toLowerCase();
      const shipsStr = Array.isArray(item.shipsDetail) ? item.shipsDetail.map(s => s.namaKapal).join(' ') : '';
      const matchesSearch =
        !searchTerm ||
        (item.nomor || '').toLowerCase().includes(searchLower) ||
        (item.namaKapal || '').toLowerCase().includes(searchLower) ||
        shipsStr.toLowerCase().includes(searchLower) ||
        (item.lokasi || item.tempatSurvey || '').toLowerCase().includes(searchLower) ||
        (item.petugas || '').toLowerCase().includes(searchLower) ||
        (item.agenda || item.noAgenda || '').toLowerCase().includes(searchLower) ||
        (item.noOrder || '').toLowerCase().includes(searchLower);

      return matchesSearch;
    });

    result.sort((a, b) => {
      const numA = (a.nomor || '').toLowerCase();
      const numB = (b.nomor || '').toLowerCase();
      const dateA = a.tglMulai || a.tglSelesai || '';
      const dateB = b.tglMulai || b.tglSelesai || '';

      switch (sortBy) {
        case 'nomor_asc':
          return numA.localeCompare(numB, undefined, { numeric: true });
        case 'nomor_desc':
          return numB.localeCompare(numA, undefined, { numeric: true });
        case 'tgl_asc':
          return dateA.localeCompare(dateB);
        case 'tgl_desc':
          return dateB.localeCompare(dateA);
        case 'kapal_asc':
          return (a.namaKapal || '').localeCompare(b.namaKapal || '');
        case 'surveyor_asc':
          return (a.petugas || '').localeCompare(b.petugas || '');
        default:
          return numA.localeCompare(numB, undefined, { numeric: true });
      }
    });

    return result;
  }, [suratTugas, surveyorFilter, statusFilter, selectedMonth, selectedYear, startDate, endDate, searchTerm, sortBy]);

  // Total Biaya Accumulation
  const totalBiayaAkumulasi = useMemo(() => {
    return filteredData.reduce((acc, item) => acc + calculateBiayaItem(item), 0);
  }, [filteredData]);

  // Export to Excel (Matching exact style from user's screenshot)
  const handleExportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'BKI Pontianak';
    wb.created = new Date();

    const ws = wb.addWorksheet('BUKU AGENDA', {
      pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true }
    });

    ws.columns = [
      { width: 6 },   // A: NO
      { width: 8 },   // B: SERI (A 0)
      { width: 22 },  // C: NOMOR SURAT (/SV...)
      { width: 28 },  // D: OBJEK/SURVEY
      { width: 20 },  // E: LOKASI SURVEY
      { width: 15 },  // F: TANGGAL PENGUASAAN - MULAI
      { width: 15 },  // G: TANGGAL PENGUASAAN - SELESAI
      { width: 18 },  // H: BIAYA
      { width: 20 },  // I: SURVEYOR
    ];

    const PRIMARY_BLUE = '4F81BD';
    const HEADER_FILL = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: PRIMARY_BLUE }
    };
    const HEADER_FONT = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    const THIN_BORDER = {
      top: { style: 'thin', color: { argb: 'D3D3D3' } },
      bottom: { style: 'thin', color: { argb: 'D3D3D3' } },
      left: { style: 'thin', color: { argb: 'D3D3D3' } },
      right: { style: 'thin', color: { argb: 'D3D3D3' } }
    };

    // Title Block
    ws.mergeCells('A1:I1');
    const titleCell = ws.getCell('A1');
    titleCell.value = 'BUKU AGENDA';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: '1E3A8A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 30;

    // Header Row 3 & 4
    ws.mergeCells('A3:A4');
    ws.getCell('A3').value = 'NO';

    ws.mergeCells('B3:C3');
    ws.getCell('B3').value = 'NOMOR SURAT';

    ws.getCell('B4').value = 'SERI';
    ws.getCell('C4').value = 'NOMOR';

    ws.mergeCells('D3:D4');
    ws.getCell('D3').value = 'OBJEK/SURVEY';

    ws.mergeCells('E3:E4');
    ws.getCell('E3').value = 'LOKASI SURVEY';

    ws.mergeCells('F3:G3');
    ws.getCell('F3').value = 'TANGGAL PENGUASAAN';

    ws.getCell('F4').value = 'MULAI';
    ws.getCell('G4').value = 'SELESAI';

    ws.mergeCells('H3:H4');
    ws.getCell('H3').value = 'BIAYA';

    ws.mergeCells('I3:I4');
    ws.getCell('I3').value = 'SURVEYOR';

    // Apply header styles
    ['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3', 'H3', 'I3', 'A4', 'B4', 'C4', 'D4', 'E4', 'F4', 'G4', 'H4', 'I4'].forEach(pos => {
      const c = ws.getCell(pos);
      c.fill = HEADER_FILL;
      c.font = HEADER_FONT;
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = THIN_BORDER;
    });

    ws.getRow(3).height = 24;
    ws.getRow(4).height = 22;

    // Add Data
    filteredData.forEach((item, idx) => {
      const rowNum = idx + 5;
      const tglMulai = formatDateDMY(item.tglMulai || item.tglSelesai);
      const tglSelesai = formatDateDMY(item.tglSelesai || item.tglMulai);
      const biaya = calculateBiayaItem(item);
      const lokasi = item.tempatSurvey || item.lokasi || '-';
      const cleanNomor = cleanDocNumber(item.nomor || '').trim();
      const slashIdx = cleanNomor.indexOf('/');
      const prefix = slashIdx !== -1 ? (cleanNomor.substring(0, slashIdx).trim() || 'A 0') : (cleanNomor || '-');
      const suffix = slashIdx !== -1 ? cleanNomor.substring(slashIdx) : '-';

      const row = ws.getRow(rowNum);
      row.values = [
        idx + 1,
        prefix,
        suffix,
        item.namaKapal || '-',
        lokasi,
        tglMulai,
        tglSelesai,
        biaya,
        item.petugas || '-'
      ];

      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(8).numFmt = '#,##0';
      row.getCell(9).alignment = { horizontal: 'left', vertical: 'middle' };

      for (let c = 1; c <= 9; c++) {
        row.getCell(c).border = THIN_BORDER;
        row.getCell(c).font = { name: 'Calibri', size: 10 };
      }
      row.height = 20;
    });

    // Total Row
    const totalRowNum = filteredData.length + 5;
    ws.mergeCells(`A${totalRowNum}:G${totalRowNum}`);
    const totLabel = ws.getCell(`A${totalRowNum}`);
    totLabel.value = 'TOTAL BIAYA';
    totLabel.font = { name: 'Calibri', size: 10, bold: true };
    totLabel.alignment = { horizontal: 'center', vertical: 'middle' };

    const totBiaya = ws.getCell(`H${totalRowNum}`);
    totBiaya.value = totalBiayaAkumulasi;
    totBiaya.font = { name: 'Calibri', size: 10, bold: true };
    totBiaya.numFmt = '#,##0';
    totBiaya.alignment = { horizontal: 'right', vertical: 'middle' };

    for (let c = 1; c <= 9; c++) {
      ws.getCell(totalRowNum, c).border = THIN_BORDER;
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Buku_Agenda_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div className="card-title-group">
          <BookOpen size={24} color="var(--accent-primary)" />
          <div>
            <h2 className="card-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>Buku Agenda</h2>
            <div className="card-subtitle" style={{ fontSize: '0.85rem' }}>
              Rekapitulasi nomor surat, objek/survey, lokasi, tanggal penugasan & biaya perjalanan dinas surveyor
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}
              title="Reset seluruh filter & sorting"
            >
              <RotateCcw size={14} />
              <span>Reset Filter</span>
            </button>
          )}

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#059669', color: '#ffffff', borderColor: '#059669' }}
            title="Export Buku Agenda ke format Excel"
          >
            <FileSpreadsheet size={15} />
            <span>Export Excel</span>
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsPrintModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="Cetak PDF Buku Agenda"
          >
            <Printer size={15} />
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* FILTER & SORTING TOOLBAR */}
      <div
        style={{
          background: 'var(--bg-main)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}
      >
        {/* Row 1: Search and Dropdowns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1.6fr) minmax(160px, 1.1fr) minmax(140px, 1fr) minmax(120px, 0.9fr) minmax(110px, 0.8fr)', gap: '0.65rem', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{
                paddingLeft: '2.3rem',
                height: '38px',
                fontSize: '0.85rem',
                width: '100%',
                background: 'var(--card-bg)'
              }}
              placeholder="Cari No. Surat, Nama Kapal, Lokasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Surveyor Dropdown */}
          <select
            className="form-select"
            style={{ height: '38px', fontSize: '0.85rem', width: '100%', background: 'var(--card-bg)' }}
            value={surveyorFilter}
            onChange={(e) => setSurveyorFilter(e.target.value)}
          >
            <option value="Semua">-- Semua Surveyor --</option>
            {surveyors.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            className="form-select"
            style={{ height: '38px', fontSize: '0.85rem', width: '100%', background: 'var(--card-bg)' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Semua">-- Semua Status --</option>
            <option value="Sudah Dicek">🔍 Sudah Dicek</option>
            <option value="Selesai">✅ Selesai</option>
            <option value="Belum Dicek">⏳ Belum Dicek</option>
          </select>

          {/* Month Selector */}
          <select
            className="form-select"
            style={{ height: '38px', fontSize: '0.85rem', width: '100%', background: 'var(--card-bg)' }}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="Semua">-- Semua Bulan --</option>
            {monthNames.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            className="form-select"
            style={{ height: '38px', fontSize: '0.85rem', width: '100%', background: 'var(--card-bg)' }}
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y === 'Semua' ? '-- Semua Tahun --' : `Tahun ${y}`}
              </option>
            ))}
          </select>
        </div>

        {/* Row 2: Quick Presets, Custom Date Range, & Total Summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Periode:</span>
              <div style={{ display: 'inline-flex', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '3px', gap: '3px' }}>
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'today', label: 'Hari Ini' },
                  { id: 'this_week', label: 'Minggu Ini' },
                  { id: 'this_month', label: 'Bulan Ini' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleDatePresetChange(p.id)}
                    style={{
                      border: 'none',
                      background: datePreset === p.id ? 'var(--accent-primary)' : 'transparent',
                      color: datePreset === p.id ? '#ffffff' : 'var(--text-secondary)',
                      fontWeight: datePreset === p.id ? 700 : 500,
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Multi-Date Inputs [ dd/mm/yyyy ] - [ dd/mm/yyyy ] */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <input
                type="date"
                className="form-input"
                style={{
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.78rem',
                  height: '30px',
                  borderRadius: '6px',
                  background: 'var(--card-bg)',
                  border: startDate ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)'
                }}
                value={startDate}
                onChange={(e) => {
                  setDatePreset('custom');
                  setStartDate(e.target.value);
                }}
                title="Tanggal Mulai"
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>-</span>
              <input
                type="date"
                className="form-input"
                style={{
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.78rem',
                  height: '30px',
                  borderRadius: '6px',
                  background: 'var(--card-bg)',
                  border: endDate ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)'
                }}
                value={endDate}
                onChange={(e) => {
                  setDatePreset('custom');
                  setEndDate(e.target.value);
                }}
                title="Tanggal Selesai"
              />
            </div>
          </div>

          {/* Total Biaya Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Total ({filteredData.length} Kegiatan):
            </span>
            <span
              style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: '#059669',
                background: 'rgba(5, 150, 105, 0.1)',
                padding: '0.3rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid rgba(5, 150, 105, 0.25)',
                letterSpacing: '0.02em'
              }}
            >
              {formatRupiah(totalBiayaAkumulasi)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Data Table Matching Screenshot */}
      <div className="table-wrapper">
        <table
          className="data-table"
          style={{
            fontSize: '0.88rem',
            borderCollapse: 'collapse',
            width: '100%'
          }}
        >
          <thead>
            <tr style={{ background: '#4f81bd', color: '#ffffff' }}>
              <th rowSpan={2} style={{ width: '45px', textAlign: 'center', background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5' }}>
                NO
              </th>
              <th
                rowSpan={2}
                onClick={() => setSortBy(sortBy === 'nomor_asc' ? 'nomor_desc' : 'nomor_asc')}
                style={{ cursor: 'pointer', background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5', width: '130px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span>NOMOR SURAT</span>
                  <ArrowUpDown size={12} color="#ffffff" />
                </div>
              </th>
              <th
                rowSpan={2}
                onClick={() => setSortBy(sortBy === 'kapal_asc' ? 'nomor_asc' : 'kapal_asc')}
                style={{ cursor: 'pointer', background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span>OBJEK/SURVEY</span>
                  <ArrowUpDown size={12} color="#ffffff" />
                </div>
              </th>
              <th rowSpan={2} style={{ background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5', width: '150px' }}>
                LOKASI SURVEY
              </th>
              <th colSpan={2} style={{ textAlign: 'center', background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5', width: '200px' }}>
                TANGGAL PENGUASAAN
              </th>
              <th rowSpan={2} style={{ textAlign: 'right', background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5', width: '130px' }}>
                BIAYA
              </th>
              <th
                rowSpan={2}
                onClick={() => setSortBy(sortBy === 'surveyor_asc' ? 'nomor_asc' : 'surveyor_asc')}
                style={{ cursor: 'pointer', background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5', width: '130px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span>SURVEYOR</span>
                  <ArrowUpDown size={12} color="#ffffff" />
                </div>
              </th>
              <th rowSpan={2} style={{ textAlign: 'center', background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5', width: '100px' }}>
                AKSI
              </th>
            </tr>
            <tr style={{ background: '#4f81bd', color: '#ffffff' }}>
              <th style={{ textAlign: 'center', fontSize: '0.78rem', background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5', width: '100px' }}>
                MULAI
              </th>
              <th style={{ textAlign: 'center', fontSize: '0.78rem', background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5', width: '100px' }}>
                SELESAI
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={9} className="table-empty" style={{ padding: '2.5rem 1rem' }}>
                  <div className="table-empty-icon" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📖</div>
                  <p style={{ fontWeight: 700 }}>Tidak ada data Buku Agenda yang sesuai dengan filter.</p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: '0.75rem' }}
                    >
                      Reset Filter
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => {
                const tglMulaiFormatted = formatDateDMY(item.tglMulai || item.tglSelesai);
                const tglSelesaiFormatted = formatDateDMY(item.tglSelesai || item.tglMulai);
                const biaya = calculateBiayaItem(item);
                const lokasi = item.tempatSurvey || item.lokasi || '-';
                const currentStatus = getItemStatusAgenda(item);
                const isSelesai = currentStatus === 'Selesai';
                const isSudahDicek = currentStatus === 'Sudah Dicek';
                const isMenuOpen = activeStatusMenuId === item.id;

                let rowBg = undefined;
                let borderLeftColor = 'transparent';
                let numColor = 'var(--text-secondary)';
                let docNoColor = 'var(--accent-primary)';

                if (isSelesai) {
                  rowBg = 'rgba(16, 185, 129, 0.12)';
                  borderLeftColor = '#10b981';
                  numColor = '#047857';
                  docNoColor = '#047857';
                } else if (isSudahDicek) {
                  rowBg = 'rgba(59, 130, 246, 0.10)';
                  borderLeftColor = '#3b82f6';
                  numColor = '#1d4ed8';
                  docNoColor = '#1d4ed8';
                }

                return (
                  <tr
                    key={item.id || index}
                    style={{
                      background: rowBg,
                      transition: 'background 0.25s ease'
                    }}
                    className={isSelesai ? 'row-checked-selesai' : isSudahDicek ? 'row-checked-dicek' : ''}
                  >
                    <td
                      style={{
                        textAlign: 'center',
                        fontWeight: 700,
                        color: numColor,
                        borderLeft: `4px solid ${borderLeftColor}`,
                        transition: 'all 0.25s ease'
                      }}
                    >
                      {index + 1}
                    </td>
                    <td style={{ fontWeight: 600, color: docNoColor, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{cleanDocNumber(item.nomor) || '-'}</span>
                        {isSelesai && (
                          <span
                            style={{
                              background: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #86efac',
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                            title={`Data selesai${item.agendaCheckedBy ? ` oleh ${item.agendaCheckedBy}` : ''}`}
                          >
                            <CheckCircle2 size={10} />
                            SELESAI
                          </span>
                        )}
                        {isSudahDicek && (
                          <span
                            style={{
                              background: '#dbeafe',
                              color: '#1d4ed8',
                              border: '1px solid #93c5fd',
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                            title={`Data sudah dicek${item.agendaCheckedBy ? ` oleh ${item.agendaCheckedBy}` : ''}`}
                          >
                            <FileCheck2 size={10} />
                            DICEK
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {Array.isArray(item.shipsDetail) && item.shipsDetail.length > 0
                        ? item.shipsDetail.map(s => s.namaKapal).filter(Boolean).join(', ')
                        : (item.namaKapal || '-')}
                    </td>
                    <td style={{ color: 'var(--text-primary)' }}>
                      {lokasi}
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {tglMulaiFormatted}
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {tglSelesaiFormatted}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>
                      {biaya > 0 ? Number(biaya).toLocaleString('id-ID') : '-'}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.petugas || '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem', alignItems: 'center' }}>
                        {/* Tombol Status Agenda Popover (Sudah Dicek, Selesai, Belum Dicek) */}
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            type="button"
                            className="btn btn-icon btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveStatusMenuId(isMenuOpen ? null : item.id);
                            }}
                            title={`Status Agenda: ${currentStatus} (Klik untuk ganti status)`}
                            style={{
                              background: isSelesai ? '#10b981' : isSudahDicek ? '#3b82f6' : 'var(--bg-main)',
                              color: isSelesai || isSudahDicek ? '#ffffff' : '#94a3b8',
                              borderColor: isSelesai ? '#10b981' : isSudahDicek ? '#3b82f6' : 'var(--border-color)',
                              boxShadow: isSelesai ? '0 1px 5px rgba(16, 185, 129, 0.4)' : isSudahDicek ? '0 1px 5px rgba(59, 130, 246, 0.4)' : 'none',
                              transform: isSelesai || isSudahDicek ? 'scale(1.05)' : 'scale(1)',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {isSelesai ? (
                              <CheckCircle2 size={15} />
                            ) : isSudahDicek ? (
                              <FileCheck2 size={15} />
                            ) : (
                              <CheckCircle2 size={15} />
                            )}
                          </button>

                          {/* Floating Popover Status Menu */}
                          {isMenuOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '6px',
                                zIndex: 100,
                                background: 'var(--card-bg, #ffffff)',
                                border: '1px solid var(--border-color, #e2e8f0)',
                                borderRadius: '8px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
                                padding: '6px',
                                minWidth: '155px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3px',
                                textAlign: 'left'
                              }}
                            >
                              <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-muted)', padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Pilih Status:
                              </div>

                              <button
                                type="button"
                                onClick={() => handleSetStatusAgenda(item, 'Sudah Dicek')}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  width: '100%',
                                  padding: '6px 8px',
                                  fontSize: '0.78rem',
                                  fontWeight: isSudahDicek ? 700 : 500,
                                  color: isSudahDicek ? '#1d4ed8' : 'var(--text-primary)',
                                  background: isSudahDicek ? '#eff6ff' : 'transparent',
                                  border: 'none',
                                  borderRadius: '5px',
                                  cursor: 'pointer',
                                  textAlign: 'left'
                                }}
                              >
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }}></span>
                                <span>🔍 Sudah Dicek</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetStatusAgenda(item, 'Selesai')}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  width: '100%',
                                  padding: '6px 8px',
                                  fontSize: '0.78rem',
                                  fontWeight: isSelesai ? 700 : 500,
                                  color: isSelesai ? '#15803d' : 'var(--text-primary)',
                                  background: isSelesai ? '#f0fdf4' : 'transparent',
                                  border: 'none',
                                  borderRadius: '5px',
                                  cursor: 'pointer',
                                  textAlign: 'left'
                                }}
                              >
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }}></span>
                                <span>✅ Selesai</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetStatusAgenda(item, 'Belum Dicek')}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  width: '100%',
                                  padding: '6px 8px',
                                  fontSize: '0.78rem',
                                  fontWeight: !isSelesai && !isSudahDicek ? 700 : 500,
                                  color: !isSelesai && !isSudahDicek ? '#64748b' : 'var(--text-primary)',
                                  background: !isSelesai && !isSudahDicek ? 'var(--bg-main)' : 'transparent',
                                  border: 'none',
                                  borderRadius: '5px',
                                  cursor: 'pointer',
                                  textAlign: 'left'
                                }}
                              >
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94a3b8', flexShrink: 0 }}></span>
                                <span>⏳ Belum Dicek</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Tombol Akses / Lihat Lampiran PDS */}
                        {(() => {
                          const attInfo = getPdsAttachments(item);
                          const hasFiles = attInfo.totalCount > 0;
                          return (
                            <button
                              type="button"
                              className="btn btn-secondary btn-icon btn-sm"
                              onClick={() => handleOpenLampiran(item)}
                              title={hasFiles ? `Lihat ${attInfo.totalCount} Lampiran PDS (Form Visit, Foto Selfie, dll)` : 'Lihat / Cek Lampiran PDS'}
                              style={{
                                background: hasFiles ? '#10b981' : 'var(--bg-main)',
                                color: hasFiles ? '#ffffff' : 'var(--text-secondary)',
                                borderColor: hasFiles ? '#10b981' : 'var(--border-color)',
                                position: 'relative'
                              }}
                            >
                              <Paperclip size={14} />
                              {hasFiles && (
                                <span
                                  style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-4px',
                                    background: '#ef4444',
                                    color: '#ffffff',
                                    fontSize: '0.6rem',
                                    fontWeight: 800,
                                    borderRadius: '50%',
                                    width: '14px',
                                    height: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    lineHeight: 1
                                  }}
                                >
                                  {attInfo.totalCount}
                                </span>
                              )}
                            </button>
                          );
                        })()}

                        <button
                          type="button"
                          className="btn btn-secondary btn-icon btn-sm"
                          onClick={() => handleOpenBiayaPrint(item)}
                          title="Cetak Rincian PDS (Biaya Perjalanan Dinas)"
                          style={{ background: '#0284c7', color: '#ffffff', borderColor: '#0284c7' }}
                        >
                          <Calculator size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon btn-sm"
                          onClick={() => handleOpenPdsPrint(item)}
                          title="Cetak Surat PDS (Surat Perintah Dinas)"
                        >
                          <FileText size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredData.length > 0 && (
            <tfoot>
              <tr style={{ fontWeight: 800, background: 'var(--bg-main)' }}>
                <td colSpan={6} style={{ textAlign: 'right', padding: '0.75rem 1rem' }}>
                  TOTAL BIAYA:
                </td>
                <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem', color: '#059669', fontSize: '0.95rem' }}>
                  {Number(totalBiayaAkumulasi).toLocaleString('id-ID')}
                </td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Print PDF Preview Modals */}
      <BukuAgendaPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        data={filteredData}
        currentPeriod={currentPeriodLabel}
      />

      <BiayaPdsPrintModal
        isOpen={isBiayaPrintModalOpen}
        onClose={() => setIsBiayaPrintModalOpen(false)}
        suratTugas={selectedPrintItem}
      />

      <SuratTugasPdsPrintModal
        isOpen={isPdsPrintModalOpen}
        onClose={() => setIsPdsPrintModalOpen(false)}
        suratTugas={selectedPrintItem}
      />

      {/* Modal Detail Lampiran PDS */}
      {isLampiranModalOpen && lampiranModalItem && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setIsLampiranModalOpen(false)}>
            <div
              className="modal-content"
              style={{ maxWidth: '640px', width: '95vw', maxHeight: '88vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="modal-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
                <div className="card-title-group">
                  <Paperclip size={20} style={{ color: '#10b981' }} />
                  <div>
                    <h3 className="modal-title" style={{ fontSize: '1rem', fontWeight: 800 }}>
                      Lampiran Dokumen PDS
                    </h3>
                    <div className="card-subtitle" style={{ fontSize: '0.74rem' }}>
                      {cleanDocNumber(lampiranModalItem.nomor)} • {lampiranModalItem.namaKapal} ({lampiranModalItem.petugas || 'Surveyor'})
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-icon"
                  onClick={() => setIsLampiranModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="modal-body" style={{ padding: '1.25rem', maxHeight: 'calc(88vh - 130px)', overflowY: 'auto' }}>
                {(() => {
                  const { totalCount, shipAttachments, generalAttachments } = getPdsAttachments(lampiranModalItem);

                  if (totalCount === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                        <Paperclip size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.35 }} />
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                          Belum Ada Lampiran
                        </h4>
                        <p style={{ fontSize: '0.78rem' }}>
                          Surveyor belum mengunggah Form Visit, Foto Selfie, ataupun bukti tiket perjalanan untuk PDS ini.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {/* Section 1: Lampiran Per Kapal */}
                      {shipAttachments.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Anchor size={14} />
                            <span>LAMPIRAN PER KAPAL (VISIT FORM & FOTO SELFIE)</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {shipAttachments.map((sAtt, sIdx) => (
                              <div
                                key={`ship-att-${sIdx}`}
                                style={{
                                  background: 'var(--bg-main)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: 'var(--radius-md)',
                                  padding: '0.85rem'
                                }}
                              >
                                <div style={{ fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.5rem', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>🚢 {sAtt.shipName}</span>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Agenda: {sAtt.agenda}</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                  {sAtt.files.map((file, fIdx) => (
                                    <div
                                      key={`file-${fIdx}`}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '0.45rem 0.65rem',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-sm)'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {file.type === 'visit' ? (
                                          <FileText size={14} color="#0284c7" />
                                        ) : (
                                          <Camera size={14} color="#7c3aed" />
                                        )}
                                        <span>{file.label}</span>
                                      </div>

                                      <button
                                        type="button"
                                        className="btn btn-sm"
                                        style={{
                                          padding: '0.2rem 0.55rem',
                                          fontSize: '0.72rem',
                                          background: file.type === 'visit' ? '#0284c7' : '#7c3aed',
                                          color: '#ffffff',
                                          border: 'none',
                                          borderRadius: '4px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.25rem',
                                          cursor: 'pointer'
                                        }}
                                        onClick={() => {
                                          setPreviewAttachment({
                                            isOpen: true,
                                            title: `${file.label} - ${sAtt.shipName}`,
                                            fileData: file.fileData,
                                            fileName: file.fileName
                                          });
                                        }}
                                      >
                                        <Eye size={12} />
                                        <span>Cek / Unduh</span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section 2: Bukti Perjalanan & Kwitansi */}
                      {generalAttachments.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Receipt size={14} />
                            <span>BUKTI BIAYA PERJALANAN & FOTO LAPANGAN</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {generalAttachments.map((gen, gIdx) => (
                              <div
                                key={`gen-${gIdx}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '0.5rem 0.75rem',
                                  background: 'var(--bg-main)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: 'var(--radius-sm)'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {gen.type === 'tiket' ? (
                                    <Plane size={14} color="#0284c7" />
                                  ) : gen.type === 'hotel' ? (
                                    <Receipt size={14} color="#d97706" />
                                  ) : (
                                    <Camera size={14} color="#059669" />
                                  )}
                                  <span>{gen.label}</span>
                                </div>

                                <button
                                  type="button"
                                  className="btn btn-sm btn-secondary"
                                  style={{
                                    padding: '0.2rem 0.55rem',
                                    fontSize: '0.72rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => {
                                    setPreviewAttachment({
                                      isOpen: true,
                                      title: gen.label,
                                      fileData: gen.fileData,
                                      fileName: gen.fileName
                                    });
                                  }}
                                >
                                  <Eye size={12} />
                                  <span>Cek / Unduh</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="modal-footer" style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsLampiranModalOpen(false)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Attachment Preview Modal */}
      <AttachmentPreviewModal
        isOpen={previewAttachment.isOpen}
        onClose={() => setPreviewAttachment({ isOpen: false, title: '', fileData: null, fileName: '' })}
        title={previewAttachment.title}
        fileData={previewAttachment.fileData}
        fileName={previewAttachment.fileName}
      />
    </div>
  );
};
