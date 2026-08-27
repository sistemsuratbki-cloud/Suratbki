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
  X,
  CheckCheck,
  Check,
  MessageSquare,
  Clock,
  AlertTriangle,
  Ship,
  UploadCloud,
  Plus
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
import { TandaTerimaSmcPrintModal } from './TandaTerimaSmcPrintModal';
import { ShipAttachmentsUpload } from './ShipAttachmentsUpload';

export const BukuAgendaTable = () => {
  const { suratTugas, updateSuratTugas, laporanSurvei, kwitansiHonor, gradeTariffs, adminSettings } = useData();
  const { currentUser, role, usersList } = useAuth();
  const isAdminOrKacab = role === 'admin' || role === 'kacab' || role === 'developer';
  const isFinance = role === 'finance' || role === 'keuangan';
  const canAcc = isAdminOrKacab || isFinance;
  const canRevisi = isAdminOrKacab || isFinance;

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
  const [isSmcPrintModalOpen, setIsSmcPrintModalOpen] = useState(false);
  const [selectedPrintItem, setSelectedPrintItem] = useState(null);
  const [selectedSmcItem, setSelectedSmcItem] = useState(null);

  // Status Menu State
  const [activeStatusMenuId, setActiveStatusMenuId] = useState(null);

  // Checkbox Selection State
  const [selectedRowIds, setSelectedRowIds] = useState([]);

  // Lampiran Modal State
  const [lampiranModalItem, setLampiranModalItem] = useState(null);
  const [isLampiranModalOpen, setIsLampiranModalOpen] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState({ isOpen: false, title: '', fileData: null, fileName: '' });

  // Revisi Modal State
  const [isRevisiModalOpen, setIsRevisiModalOpen] = useState(false);
  const [revisiItem, setRevisiItem] = useState(null);
  const [revisiNote, setRevisiNote] = useState('');

  // ACC / Revisi Handlers
  const handleToggleAccPds = (item) => {
    const isCurrentlyAcc = item.approvalStatus === 'ACC';
    const updaterName = currentUser?.name || (isFinance ? 'Staff Keuangan' : (currentUser?.role === 'kacab' ? 'Kepala Cabang' : 'Admin'));
    if (isCurrentlyAcc) {
      updateSuratTugas(item.id, {
        approvalStatus: 'Menunggu',
        status: 'Berjalan',
        approvalNote: '',
        approvalBy: null,
        approvalAt: null
      });
      toast.info(`Status ACC untuk PDS ${item.namaKapal || ''} dibatalkan (Menunggu ACC).`);
    } else {
      updateSuratTugas(item.id, {
        approvalStatus: 'ACC',
        status: 'Selesai',
        approvalNote: '',
        approvalBy: updaterName,
        approvalAt: new Date().toISOString()
      });
      toast.success(`✅ PDS ${item.namaKapal || ''} telah di-ACC dan ditandai Selesai.`);
    }
  };

  const handleOpenRevisi = (item) => {
    setRevisiItem(item);
    setRevisiNote('');
    setIsRevisiModalOpen(true);
  };

  const handleSubmitRevisi = () => {
    if (!revisiItem) return;
    if (!revisiNote.trim()) {
      toast.error('Keterangan revisi wajib diisi.');
      return;
    }
    const updaterName = currentUser?.name || (isFinance ? 'Staff Keuangan' : 'Admin');
    updateSuratTugas(revisiItem.id, {
      approvalStatus: 'Revisi',
      approvalNote: revisiNote.trim(),
      approvalBy: updaterName,
      approvalAt: new Date().toISOString()
    });
    toast.success(`🔄 Revisi diminta untuk PDS ${revisiItem.namaKapal || ''}. Notifikasi akan muncul di dashboard surveyor.`);
    setIsRevisiModalOpen(false);
    setRevisiItem(null);
    setRevisiNote('');
  };

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
    if (!item) return { totalCount: 0, shipAttachments: [], generalAttachments: [], allKeys: [] };

    // Resolve target PDS
    const targetItem = resolvePdsItem(item) || item;

    const shipAttachments = [];
    const generalAttachments = [];
    const addedFileKeys = new Set();

    // 1. Resolve list of ships for this PDS
    let parsedShipsDetail = targetItem.shipsDetail || targetItem.ships_detail;
    if (typeof parsedShipsDetail === 'string') {
      try {
        parsedShipsDetail = JSON.parse(parsedShipsDetail);
      } catch (e) {
        parsedShipsDetail = [];
      }
    }

    // Fallback: parse from namaKapal if multiple ships separated by comma/slash
    if ((!Array.isArray(parsedShipsDetail) || parsedShipsDetail.length === 0) && targetItem.namaKapal) {
      const splitNames = targetItem.namaKapal.split(/[,/]/).map(s => s.trim()).filter(Boolean);
      if (splitNames.length > 0) {
        parsedShipsDetail = splitNames.map((name, idx) => ({
          namaKapal: name,
          noAgenda: targetItem.noAgenda || targetItem.agenda || '-',
          fileVisitData: idx === 0 ? (targetItem.fileVisitData || targetItem.fileVisitName) : '',
          fileFotoData: idx === 0 ? (targetItem.fileFotoData || targetItem.fileFotoName) : ''
        }));
      }
    }

    if (Array.isArray(parsedShipsDetail) && parsedShipsDetail.length > 0) {
      parsedShipsDetail.forEach((sh, sIdx) => {
        const shipName = (sh.namaKapal || sh.nama_kapal || `Kapal #${sIdx + 1}`).toUpperCase().trim();
        const agenda = sh.noAgenda || sh.no_agenda || targetItem.noAgenda || targetItem.agenda || '-';
        const files = [];

        // Find exact matching child SPS or Laporan for this specific ship
        const matchingChildSps = (suratTugas || []).find(st =>
          (sh.id && String(st.id) === String(sh.id)) ||
          (Array.isArray(targetItem.linkedSpsIds) && targetItem.linkedSpsIds.some(lid => String(lid) === String(st.id))) ||
          (st.namaKapal && String(st.namaKapal).trim().toUpperCase() === shipName)
        );

        const matchingChildLap = (laporanSurvei || []).find(lap =>
          (sh.id && String(lap.suratId) === String(sh.id)) ||
          (matchingChildSps && String(lap.suratId) === String(matchingChildSps.id)) ||
          (lap.namaKapal && String(lap.namaKapal).trim().toUpperCase() === shipName)
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
          (sIdx === 0 ? (targetItem.fileVisitData || targetItem.fileVisitName || targetItem.file_visit_name) : null);

        const selfieFile =
          sh.fileFotoData ||
          sh.fileFotoName ||
          sh.file_foto_name ||
          sh.file_foto_data ||
          matchingChildSps?.fileFotoData ||
          matchingChildSps?.fileFotoName ||
          matchingChildLap?.fileFotoData ||
          matchingChildLap?.fileFotoName ||
          (sIdx === 0 ? (targetItem.fileFotoData || targetItem.fileFotoName || targetItem.file_foto_name) : null);

        if (visitFile && !addedFileKeys.has(`visit_${sIdx}_${visitFile}`)) {
          addedFileKeys.add(`visit_${sIdx}_${visitFile}`);
          files.push({
            key: `ship_${sIdx}_visit_${shipName}`,
            type: 'visit',
            label: 'Formulir Visit Lapangan (PDF)',
            fileName: sh.fileVisitName || sh.file_visit_name || matchingChildSps?.fileVisitName || `Form_Visit_${shipName}.pdf`,
            fileData: visitFile
          });
        }

        if (selfieFile && !addedFileKeys.has(`selfie_${sIdx}_${selfieFile}`)) {
          addedFileKeys.add(`selfie_${sIdx}_${selfieFile}`);
          files.push({
            key: `ship_${sIdx}_selfie_${shipName}`,
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

    // 2. Travel receipts (Tiket, Hotel, Batch Foto Lapangan)
    const matchingLap = (laporanSurvei || []).find(lap => String(lap.suratId) === String(targetItem.id) || String(lap.id) === String(targetItem.id));
    const itemSources = [targetItem, matchingLap].filter(Boolean);

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
              key: `tiket_${tIdx}`,
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
              key: `hotel_${hIdx}`,
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

    // Batch Upload & Foto Dokumentasi
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
              key: `foto_${fIdx}`,
              type: 'foto_survey',
              label: (f && f.name) ? f.name : `Lampiran Dokumen #${fIdx + 1}`,
              fileName: typeof f === 'string' ? f : f.name || `Lampiran_${fIdx + 1}`,
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
              key: `foto_${fIdx}`,
              type: 'foto_survey',
              label: `Lampiran Dokumen #${fIdx + 1}`,
              fileName: rawFotoNames[fIdx] || `Lampiran_${fIdx + 1}`,
              fileData: fUrl
            });
          }
        });
      }
    }

    const totalCount =
      shipAttachments.reduce((sum, s) => sum + s.files.length, 0) + generalAttachments.length;

    const allKeys = [
      ...shipAttachments.flatMap(s => s.files.map(f => f.key)),
      ...generalAttachments.map(g => g.key)
    ].filter(Boolean);

    return { totalCount, shipAttachments, generalAttachments, allKeys };
  };

  const isAttachmentFileChecked = (item, fileKey) => {
    if (!item || !item.checkedAttachments || !fileKey) return false;
    if (Array.isArray(item.checkedAttachments)) {
      return item.checkedAttachments.includes(fileKey);
    }
    if (typeof item.checkedAttachments === 'object') {
      return !!item.checkedAttachments[fileKey];
    }
    return false;
  };

  const handleToggleAttachmentCheck = (item, fileKey, forceVal = null) => {
    if (!item || !fileKey) return;
    const currentChecked = Array.isArray(item.checkedAttachments)
      ? [...item.checkedAttachments]
      : typeof item.checkedAttachments === 'object' && item.checkedAttachments
      ? Object.keys(item.checkedAttachments).filter(k => item.checkedAttachments[k])
      : [];

    const isCurrentlyChecked = currentChecked.includes(fileKey);
    const nextVal = forceVal !== null ? forceVal : !isCurrentlyChecked;

    let updatedList;
    if (nextVal) {
      updatedList = Array.from(new Set([...currentChecked, fileKey]));
    } else {
      updatedList = currentChecked.filter(k => k !== fileKey);
    }

    updateSuratTugas(item.id, { checkedAttachments: updatedList });
    setLampiranModalItem(prev => (prev && prev.id === item.id ? { ...prev, checkedAttachments: updatedList } : prev));
  };

  const handleToggleAllAttachmentChecks = (item, allKeys) => {
    if (!item || !allKeys || allKeys.length === 0) return;
    const currentChecked = Array.isArray(item.checkedAttachments)
      ? item.checkedAttachments
      : [];
    const isAllChecked = allKeys.length > 0 && allKeys.every(k => currentChecked.includes(k));
    const nextList = isAllChecked ? [] : Array.from(new Set(allKeys));

    updateSuratTugas(item.id, { checkedAttachments: nextList });
    setLampiranModalItem(prev => (prev && prev.id === item.id ? { ...prev, checkedAttachments: nextList } : prev));
    if (isAllChecked) {
      toast.info('Checklist berkas telah direset');
    } else {
      toast.success('Semua berkas ditandai: Sudah Diperiksa ✅');
    }
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
    const uangHotelTotal = (Array.isArray(item.rincianHotel) && item.rincianHotel.length > 0)
      ? item.rincianHotel.reduce((sum, h) => sum + (Number(h.totalBiaya) || ((Number(h.jumlahMalam) || 1) * (Number(h.tarifPerMalam) || 0)) || (Number(h.nominal) || 0)), 0)
      : (Number(item.totalBiayaHotel) || (Number(item.tiketHotel) || 0) * mlm);
    const hrLbrTotal = (item.tanpaUangHarian && sisaHariUangHarian === 0) ? 0 : (hrLbr * uangHarianRate * 0.5);
    const tiketPesawatTaxi = (Array.isArray(item.rincianTiket) && item.rincianTiket.length > 0)
      ? item.rincianTiket.reduce((sum, t) => sum + (Number(t.nominal) || 0), 0)
      : (Number(item.tiketPesawatTaxi) || Number(item.biayaTiket) || 0);
    const biayaTAT = item.tanpaTAT
      ? 0
      : (item.biayaTAT !== undefined && item.biayaTAT !== ''
          ? Number(item.biayaTAT)
          : (isLuarKota ? Number(adminSettings?.tatLuarKota || 750000) : 0));
    const rateSK = Number(item.tarifDasar) || 0;

    const biayaExpertise = item.isSmc
      ? ((Number(item.jumlahPendamping) || 2) * (Number(item.tarifExpertise) || 1500000))
      : (Number(item.biayaExpertise) || 0);

    if (isLuarKota) {
      return tiketPesawatTaxi + biayaTAT + rateSK + uangHarianTotal + uangHotelTotal + hrLbrTotal + biayaExpertise;
    } else {
      return rateSK + uangHarianTotal + uangHotelTotal + hrLbrTotal + biayaExpertise;
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
    setSelectedRowIds([]);
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
      const tglMulaiA = a.tglMulai || a.tglLapor || a.tanggal || a.tglSelesai || '';
      const tglMulaiB = b.tglMulai || b.tglLapor || b.tanggal || b.tglSelesai || '';
      const tglSelesaiA = a.tglSelesai || a.tglMulai || a.tglLapor || a.tanggal || '';
      const tglSelesaiB = b.tglSelesai || b.tglMulai || b.tglLapor || b.tanggal || '';
      const biayaA = calculateBiayaItem(a);
      const biayaB = calculateBiayaItem(b);
      const lokasiA = (a.tempatSurvey || a.lokasi || a.lokasiSurvey || '').toLowerCase();
      const lokasiB = (b.tempatSurvey || b.lokasi || b.lokasiSurvey || '').toLowerCase();

      switch (sortBy) {
        case 'nomor_asc':
          return numA.localeCompare(numB, undefined, { numeric: true });
        case 'nomor_desc':
          return numB.localeCompare(numA, undefined, { numeric: true });
        case 'tgl_asc':
        case 'tgl_mulai_asc':
          return tglMulaiA.localeCompare(tglMulaiB);
        case 'tgl_desc':
        case 'tgl_mulai_desc':
          return tglMulaiB.localeCompare(tglMulaiA);
        case 'tgl_selesai_asc':
          return tglSelesaiA.localeCompare(tglSelesaiB);
        case 'tgl_selesai_desc':
          return tglSelesaiB.localeCompare(tglSelesaiA);
        case 'biaya_asc':
          return biayaA - biayaB;
        case 'biaya_desc':
          return biayaB - biayaA;
        case 'kapal_asc':
          return (a.namaKapal || '').localeCompare(b.namaKapal || '');
        case 'kapal_desc':
          return (b.namaKapal || '').localeCompare(a.namaKapal || '');
        case 'lokasi_asc':
          return lokasiA.localeCompare(lokasiB);
        case 'lokasi_desc':
          return lokasiB.localeCompare(lokasiA);
        case 'surveyor_asc':
          return (a.petugas || '').localeCompare(b.petugas || '');
        case 'surveyor_desc':
          return (b.petugas || '').localeCompare(a.petugas || '');
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

  // Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedRowIds.length === filteredData.length && filteredData.length > 0) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(filteredData.map((item) => item.id));
    }
  };

  const handleToggleSelectRow = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  // Export to Excel (Matching exact style from user's screenshot)
  const handleExportExcel = async () => {
    const targetData = selectedRowIds.length > 0 
      ? filteredData.filter(d => selectedRowIds.includes(d.id))
      : filteredData;

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
      { width: 15 },  // F: TANGGAL PENUGASAN - MULAI
      { width: 15 },  // G: TANGGAL PENUGASAN - SELESAI
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
    ws.getCell('F3').value = 'TANGGAL PENUGASAN';

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
    targetData.forEach((item, idx) => {
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {selectedRowIds.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(37, 99, 235, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(37, 99, 235, 0.25)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb' }}>
                ✓ {selectedRowIds.length} dipilih
              </span>
              <button
                type="button"
                onClick={() => setSelectedRowIds([])}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.1rem 0.4rem', fontSize: '0.72rem', height: 'auto', lineHeight: '1.2' }}
              >
                Batal
              </button>
            </div>
          )}

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
            title={selectedRowIds.length > 0 ? `Export ${selectedRowIds.length} item terpilih ke Excel` : 'Export seluruh Buku Agenda ke format Excel'}
          >
            <FileSpreadsheet size={15} />
            <span>{selectedRowIds.length > 0 ? `Export Terpilih (${selectedRowIds.length})` : 'Export Excel'}</span>
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsPrintModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title={selectedRowIds.length > 0 ? `Cetak ${selectedRowIds.length} item terpilih ke PDF` : 'Cetak PDF Buku Agenda'}
          >
            <Printer size={15} />
            <span>{selectedRowIds.length > 0 ? `Cetak Terpilih (${selectedRowIds.length})` : 'Cetak PDF'}</span>
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
            <option value="Belum Dicek">⏳ Belum Dicek</option>
            <option value="Sudah Dicek">🔍 Sudah Dicek</option>
            <option value="Selesai">✅ Selesai</option>
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
              <th rowSpan={2} style={{ width: '38px', textAlign: 'center', background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5' }}>
                <input
                  type="checkbox"
                  style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#2563eb' }}
                  checked={filteredData.length > 0 && selectedRowIds.length === filteredData.length}
                  onChange={handleToggleSelectAll}
                  title="Pilih Semua"
                />
              </th>
              <th rowSpan={2} style={{ width: '45px', textAlign: 'center', background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5' }}>
                NO
              </th>
              <th
                rowSpan={2}
                onClick={() => setSortBy(sortBy === 'nomor_asc' ? 'nomor_desc' : 'nomor_asc')}
                style={{ cursor: 'pointer', background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5', width: '130px', userSelect: 'none' }}
                title="Klik untuk mengurutkan nomor surat (A-Z / Z-A)"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ color: sortBy.startsWith('nomor') ? '#fef08a' : undefined, fontWeight: sortBy.startsWith('nomor') ? 800 : undefined }}>
                    NOMOR SURAT
                  </span>
                  <ArrowUpDown size={12} color={sortBy.startsWith('nomor') ? '#fef08a' : '#ffffff'} />
                </div>
              </th>
              <th
                rowSpan={2}
                onClick={() => setSortBy(sortBy === 'kapal_asc' ? 'kapal_desc' : 'kapal_asc')}
                style={{ cursor: 'pointer', background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5', userSelect: 'none' }}
                title="Klik untuk mengurutkan objek kapal (A-Z / Z-A)"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ color: sortBy.startsWith('kapal') ? '#fef08a' : undefined, fontWeight: sortBy.startsWith('kapal') ? 800 : undefined }}>
                    OBJEK/SURVEY
                  </span>
                  <ArrowUpDown size={12} color={sortBy.startsWith('kapal') ? '#fef08a' : '#ffffff'} />
                </div>
              </th>
              <th
                rowSpan={2}
                onClick={() => setSortBy(sortBy === 'lokasi_asc' ? 'lokasi_desc' : 'lokasi_asc')}
                style={{ cursor: 'pointer', background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5', width: '150px', userSelect: 'none' }}
                title="Klik untuk mengurutkan lokasi survey (A-Z / Z-A)"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ color: sortBy.startsWith('lokasi') ? '#fef08a' : undefined, fontWeight: sortBy.startsWith('lokasi') ? 800 : undefined }}>
                    LOKASI SURVEY
                  </span>
                  <ArrowUpDown size={12} color={sortBy.startsWith('lokasi') ? '#fef08a' : '#ffffff'} />
                </div>
              </th>
              <th
                colSpan={2}
                onClick={() => setSortBy(sortBy === 'tgl_mulai_desc' ? 'tgl_mulai_asc' : 'tgl_mulai_desc')}
                style={{ cursor: 'pointer', textAlign: 'center', background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5', width: '200px', userSelect: 'none' }}
                title="Klik untuk mengurutkan tanggal penugasan (Terbaru / Terlama)"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                  <span style={{ color: sortBy.startsWith('tgl') ? '#fef08a' : undefined, fontWeight: sortBy.startsWith('tgl') ? 800 : undefined }}>
                    TANGGAL PENUGASAN
                  </span>
                  <ArrowUpDown size={12} color={sortBy.startsWith('tgl') ? '#fef08a' : '#ffffff'} />
                </div>
              </th>
              <th
                rowSpan={2}
                onClick={() => setSortBy(sortBy === 'biaya_desc' ? 'biaya_asc' : 'biaya_desc')}
                style={{ cursor: 'pointer', textAlign: 'right', background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5', width: '130px', userSelect: 'none' }}
                title="Klik untuk mengurutkan biaya (Tertinggi / Terendah)"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                  <span style={{ color: sortBy.startsWith('biaya') ? '#fef08a' : undefined, fontWeight: sortBy.startsWith('biaya') ? 800 : undefined }}>
                    BIAYA
                  </span>
                  <ArrowUpDown size={12} color={sortBy.startsWith('biaya') ? '#fef08a' : '#ffffff'} />
                </div>
              </th>
              <th
                rowSpan={2}
                onClick={() => setSortBy(sortBy === 'surveyor_asc' ? 'surveyor_desc' : 'surveyor_asc')}
                style={{ cursor: 'pointer', background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5', width: '130px', userSelect: 'none' }}
                title="Klik untuk mengurutkan surveyor (A-Z / Z-A)"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ color: sortBy.startsWith('surveyor') ? '#fef08a' : undefined, fontWeight: sortBy.startsWith('surveyor') ? 800 : undefined }}>
                    SURVEYOR
                  </span>
                  <ArrowUpDown size={12} color={sortBy.startsWith('surveyor') ? '#fef08a' : '#ffffff'} />
                </div>
              </th>
              <th rowSpan={2} style={{ textAlign: 'center', background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5', width: '230px' }}>
                AKSI
              </th>
            </tr>
            <tr style={{ background: '#4f81bd', color: '#ffffff' }}>
              <th
                onClick={() => setSortBy(sortBy === 'tgl_mulai_asc' ? 'tgl_mulai_desc' : 'tgl_mulai_asc')}
                style={{ cursor: 'pointer', textAlign: 'center', fontSize: '0.78rem', background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5', width: '100px', userSelect: 'none' }}
                title="Klik untuk mengurutkan tanggal mulai (Terlama / Terbaru)"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                  <span style={{ color: sortBy.startsWith('tgl_mulai') ? '#fef08a' : undefined, fontWeight: sortBy.startsWith('tgl_mulai') ? 800 : undefined }}>
                    MULAI
                  </span>
                  <ArrowUpDown size={11} color={sortBy.startsWith('tgl_mulai') ? '#fef08a' : '#ffffff'} />
                </div>
              </th>
              <th
                onClick={() => setSortBy(sortBy === 'tgl_selesai_asc' ? 'tgl_selesai_desc' : 'tgl_selesai_asc')}
                style={{ cursor: 'pointer', textAlign: 'center', fontSize: '0.78rem', background: '#4f81bd', color: '#ffffff', border: '1px solid #3b6ea5', width: '100px', userSelect: 'none' }}
                title="Klik untuk mengurutkan tanggal selesai (Terlama / Terbaru)"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                  <span style={{ color: sortBy.startsWith('tgl_selesai') ? '#fef08a' : undefined, fontWeight: sortBy.startsWith('tgl_selesai') ? 800 : undefined }}>
                    SELESAI
                  </span>
                  <ArrowUpDown size={11} color={sortBy.startsWith('tgl_selesai') ? '#fef08a' : '#ffffff'} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={10} className="table-empty" style={{ padding: '2.5rem 1rem' }}>
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
                const isSelected = selectedRowIds.includes(item.id);
                const isMenuOpen = activeStatusMenuId === item.id;

                let rowBg = isSelected ? 'rgba(37, 99, 235, 0.08)' : undefined;
                let borderLeftColor = 'transparent';
                let numColor = 'var(--text-secondary)';
                let docNoColor = 'var(--accent-primary)';

                if (isSelesai) {
                  rowBg = isSelected ? 'rgba(16, 185, 129, 0.20)' : 'rgba(16, 185, 129, 0.12)';
                  borderLeftColor = '#10b981';
                  numColor = '#047857';
                  docNoColor = '#047857';
                } else if (isSudahDicek) {
                  rowBg = isSelected ? 'rgba(59, 130, 246, 0.18)' : 'rgba(59, 130, 246, 0.10)';
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
                        width: '38px',
                        borderLeft: `4px solid ${borderLeftColor}`,
                        transition: 'all 0.25s ease'
                      }} 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#2563eb' }}
                        checked={isSelected}
                        onChange={(e) => handleToggleSelectRow(item.id, e)}
                        title={`Pilih ${item.namaKapal || 'Item'}`}
                      />
                    </td>
                    <td
                      style={{
                        textAlign: 'center',
                        fontWeight: 700,
                        color: numColor,
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
                            </div>
                          )}
                        </div>

                        {/* Tombol Akses / Lihat Lampiran PDS */}
                        {(() => {
                          const attInfo = getPdsAttachments(item);
                          const hasFiles = attInfo.totalCount > 0;
                          const checkedCount = (attInfo.allKeys || []).filter(k => isAttachmentFileChecked(item, k)).length;
                          const isAllChecked = hasFiles && checkedCount === attInfo.totalCount;

                          return (
                            <button
                              type="button"
                              className="btn btn-secondary btn-icon btn-sm"
                              onClick={() => handleOpenLampiran(item)}
                              title={hasFiles ? `Lihat ${attInfo.totalCount} Lampiran PDS (${checkedCount}/${attInfo.totalCount} sudah diperiksa)` : 'Lihat / Cek Lampiran PDS'}
                              style={{
                                background: hasFiles ? (isAllChecked ? '#059669' : '#10b981') : 'var(--bg-main)',
                                color: hasFiles ? '#ffffff' : 'var(--text-secondary)',
                                borderColor: hasFiles ? (isAllChecked ? '#059669' : '#10b981') : 'var(--border-color)',
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
                                    background: isAllChecked ? '#16a34a' : '#ef4444',
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
                                  {isAllChecked ? '✓' : attInfo.totalCount}
                                </span>
                              )}
                            </button>
                          );
                        })()}

                        {/* ACC & Revisi Action Buttons untuk PDS */}
                        {canAcc ? (
                          (item.approvalStatus === 'ACC' || (item.status === 'Selesai' && item.approvalStatus !== 'Revisi')) ? (
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => handleToggleAccPds(item)}
                              title="PDS Sudah di-ACC (Klik untuk batalkan status ACC)"
                              style={{
                                background: '#ecfdf5',
                                color: '#047857',
                                border: '1px solid #a7f3d0',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.72rem',
                                padding: '0.25rem 0.55rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <CheckCheck size={13} color="#059669" />
                              <span>Sudah di-ACC</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => handleToggleAccPds(item)}
                              title="Klik untuk ACC / Menyetujui PDS ini"
                              style={{
                                background: '#059669',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.72rem',
                                padding: '0.25rem 0.6rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <CheckCircle2 size={13} />
                              <span>ACC PDS</span>
                            </button>
                          )
                        ) : (
                          (item.approvalStatus === 'ACC' || (item.status === 'Selesai' && item.approvalStatus !== 'Revisi')) ? (
                            <span
                              style={{
                                background: '#ecfdf5',
                                color: '#047857',
                                border: '1px solid #a7f3d0',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.7rem',
                                padding: '0.2rem 0.45rem',
                                fontWeight: 700
                              }}
                            >
                              <CheckCircle2 size={12} color="#059669" />
                              <span>Sudah ACC</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                background: '#fef3c7',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.7rem',
                                padding: '0.2rem 0.45rem',
                                fontWeight: 700
                              }}
                            >
                              <Clock size={12} color="#d97706" />
                              <span>Menunggu ACC</span>
                            </span>
                          )
                        )}

                        {canRevisi && (
                          <button
                            type="button"
                            className="btn btn-icon btn-sm"
                            onClick={() => handleOpenRevisi(item)}
                            title="Minta Revisi PDS"
                            style={{
                              background: item.approvalStatus === 'Revisi' ? '#fef3c7' : '#fffbeb',
                              color: '#b45309',
                              borderColor: item.approvalStatus === 'Revisi' ? '#fde68a' : '#fef08a'
                            }}
                          >
                            <MessageSquare size={14} />
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-secondary btn-icon btn-sm"
                          onClick={() => handleOpenBiayaPrint(item)}
                          title={
                            (item.isSmc || (item.perihal || '').toUpperCase().includes('SMC') || (item.jenisSurvey || '').toUpperCase().includes('SMC') || Number(item.biayaExpertise) > 0 || (item.noSap && item.noSap !== '-'))
                              ? 'Cetak Rincian Biaya PDS + Tanda Terima SMC (1 File PDF Gabungan)'
                              : 'Cetak Rincian PDS (Biaya Perjalanan Dinas)'
                          }
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
                <td colSpan={7} style={{ textAlign: 'right', padding: '0.75rem 1rem' }}>
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
        data={selectedRowIds.length > 0 ? filteredData.filter(d => selectedRowIds.includes(d.id)) : filteredData}
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

      <TandaTerimaSmcPrintModal
        isOpen={isSmcPrintModalOpen}
        onClose={() => setIsSmcPrintModalOpen(false)}
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
                  const { totalCount, shipAttachments, generalAttachments, allKeys } = getPdsAttachments(lampiranModalItem);
                  const checkedCount = allKeys.filter(k => isAttachmentFileChecked(lampiranModalItem, k)).length;
                  const isAllChecked = totalCount > 0 && checkedCount === totalCount;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {/* Progress & Quick Action Checklist Banner */}
                      {totalCount > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.65rem 0.9rem',
                            background: isAllChecked ? '#f0fdf4' : 'var(--bg-main)',
                            border: isAllChecked ? '1px solid #86efac' : '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            gap: '0.5rem',
                            flexWrap: 'wrap'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem' }}>
                            {isAllChecked ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#15803d', fontWeight: 800 }}>
                                <CheckCircle2 size={16} color="#16a34a" />
                                <span>Semua Berkas Sudah Diperiksa ({checkedCount}/{totalCount})</span>
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                <Clock size={15} color="#0284c7" />
                                <span>Status Pemeriksaan:</span>
                                <strong style={{ color: checkedCount > 0 ? '#15803d' : 'var(--text-primary)' }}>
                                  {checkedCount}
                                </strong>
                                <span>/ {totalCount} Berkas ({Math.round((checkedCount / totalCount) * 100)}%)</span>
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => handleToggleAllAttachmentChecks(lampiranModalItem, allKeys)}
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.25rem 0.65rem',
                              background: isAllChecked ? '#f8fafc' : '#10b981',
                              color: isAllChecked ? '#475569' : '#ffffff',
                              border: isAllChecked ? '1px solid #cbd5e1' : 'none',
                              borderRadius: '4px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              cursor: 'pointer'
                            }}
                          >
                            {isAllChecked ? <RotateCcw size={12} /> : <CheckCheck size={13} />}
                            <span>{isAllChecked ? 'Reset Cek' : 'Tandai Semua Selesai'}</span>
                          </button>
                        </div>
                      )}

                      {/* If totalCount === 0 */}
                      {totalCount === 0 && (
                        <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-muted)', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                          <Paperclip size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.35 }} />
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                            Belum Ada Lampiran Terdeteksi
                          </h4>
                          <p style={{ fontSize: '0.78rem', marginBottom: '0.75rem' }}>
                            Surveyor belum mengunggah Form Visit, Foto Selfie, ataupun bukti tiket perjalanan untuk PDS ini. Anda dapat mengunggahnya sekarang di bawah ini.
                          </p>
                        </div>
                      )}

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

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                  {sAtt.files.map((file, fIdx) => {
                                    const isChecked = isAttachmentFileChecked(lampiranModalItem, file.key);
                                    return (
                                      <div
                                        key={`file-${fIdx}`}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          padding: '0.5rem 0.75rem',
                                          background: isChecked ? '#f0fdf4' : 'var(--bg-card)',
                                          border: isChecked ? '1px solid #86efac' : '1px solid var(--border-color)',
                                          borderRadius: 'var(--radius-sm)',
                                          transition: 'all 0.2s ease'
                                        }}
                                      >
                                        <div
                                          onClick={() => handleToggleAttachmentCheck(lampiranModalItem, file.key)}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.55rem',
                                            fontSize: '0.76rem',
                                            fontWeight: 600,
                                            color: isChecked ? '#15803d' : 'var(--text-primary)',
                                            cursor: 'pointer',
                                            flex: 1,
                                            marginRight: '0.5rem'
                                          }}
                                          title={isChecked ? 'Klik untuk batal tanda periksa' : 'Klik untuk tandai sudah diperiksa'}
                                        >
                                          <div
                                            style={{
                                              width: '18px',
                                              height: '18px',
                                              borderRadius: '4px',
                                              background: isChecked ? '#16a34a' : 'transparent',
                                              border: isChecked ? '1.5px solid #16a34a' : '1.5px solid #94a3b8',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              flexShrink: 0,
                                              transition: 'all 0.15s ease'
                                            }}
                                          >
                                            {isChecked && <Check size={13} color="#ffffff" strokeWidth={3} />}
                                          </div>

                                          {file.type === 'visit' ? (
                                            <FileText size={15} color={isChecked ? '#16a34a' : '#0284c7'} />
                                          ) : (
                                            <Camera size={15} color={isChecked ? '#16a34a' : '#7c3aed'} />
                                          )}
                                          <span>{file.label}</span>

                                          {isChecked && (
                                            <span
                                              style={{
                                                fontSize: '0.64rem',
                                                fontWeight: 800,
                                                background: '#dcfce7',
                                                color: '#15803d',
                                                border: '1px solid #bbf7d0',
                                                borderRadius: '3px',
                                                padding: '1px 5px',
                                                marginLeft: '0.2rem'
                                              }}
                                            >
                                              ✓ Diperiksa
                                            </span>
                                          )}
                                        </div>

                                        <button
                                          type="button"
                                          className="btn btn-sm"
                                          style={{
                                            padding: '0.22rem 0.6rem',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            background: isChecked ? '#16a34a' : file.type === 'visit' ? '#0284c7' : '#7c3aed',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '4px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            cursor: 'pointer',
                                            flexShrink: 0
                                          }}
                                          onClick={() => {
                                            handleToggleAttachmentCheck(lampiranModalItem, file.key, true);
                                            setPreviewAttachment({
                                              isOpen: true,
                                              title: `${file.label} - ${sAtt.shipName}`,
                                              fileData: file.fileData,
                                              fileName: file.fileName
                                            });
                                          }}
                                        >
                                          <Eye size={12} />
                                          <span>{isChecked ? 'Cek / Unduh ✓' : 'Cek / Unduh'}</span>
                                        </button>
                                      </div>
                                    );
                                  })}
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

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            {generalAttachments.map((gen, gIdx) => {
                              const isChecked = isAttachmentFileChecked(lampiranModalItem, gen.key);
                              return (
                                <div
                                  key={`gen-${gIdx}`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.5rem 0.75rem',
                                    background: isChecked ? '#f0fdf4' : 'var(--bg-main)',
                                    border: isChecked ? '1px solid #86efac' : '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  <div
                                    onClick={() => handleToggleAttachmentCheck(lampiranModalItem, gen.key)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.55rem',
                                      fontSize: '0.76rem',
                                      fontWeight: 600,
                                      color: isChecked ? '#15803d' : 'var(--text-primary)',
                                      cursor: 'pointer',
                                      flex: 1,
                                      marginRight: '0.5rem'
                                    }}
                                    title={isChecked ? 'Klik untuk batal tanda periksa' : 'Klik untuk tandai sudah diperiksa'}
                                  >
                                    <div
                                      style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '4px',
                                        background: isChecked ? '#16a34a' : 'transparent',
                                        border: isChecked ? '1.5px solid #16a34a' : '1.5px solid #94a3b8',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      {isChecked && <Check size={13} color="#ffffff" strokeWidth={3} />}
                                    </div>

                                    {gen.type === 'tiket' ? (
                                      <Plane size={15} color={isChecked ? '#16a34a' : '#0284c7'} />
                                    ) : gen.type === 'hotel' ? (
                                      <Receipt size={15} color={isChecked ? '#16a34a' : '#d97706'} />
                                    ) : (
                                      <Camera size={15} color={isChecked ? '#16a34a' : '#059669'} />
                                    )}
                                    <span>{gen.label}</span>

                                    {isChecked && (
                                      <span
                                        style={{
                                          fontSize: '0.64rem',
                                          fontWeight: 800,
                                          background: '#dcfce7',
                                          color: '#15803d',
                                          border: '1px solid #bbf7d0',
                                          borderRadius: '3px',
                                          padding: '1px 5px',
                                          marginLeft: '0.2rem'
                                        }}
                                      >
                                        ✓ Diperiksa
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    className="btn btn-sm"
                                    style={{
                                      padding: '0.22rem 0.6rem',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      background: isChecked ? '#16a34a' : 'var(--accent-primary, #2563eb)',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      cursor: 'pointer',
                                      flexShrink: 0
                                    }}
                                    onClick={() => {
                                      handleToggleAttachmentCheck(lampiranModalItem, gen.key, true);
                                      setPreviewAttachment({
                                        isOpen: true,
                                        title: gen.label,
                                        fileData: gen.fileData,
                                        fileName: gen.fileName
                                      });
                                    }}
                                  >
                                    <Eye size={12} />
                                    <span>{isChecked ? 'Cek / Unduh ✓' : 'Cek / Unduh'}</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Section 3: Upload & Kelola Lampiran Secara Langsung */}
                      <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)' }}>
                        <button
                          type="button"
                          onClick={() => setShowUploadSection(!showUploadSection)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            fontWeight: 700,
                            background: showUploadSection ? '#eff6ff' : 'var(--bg-main)',
                            color: showUploadSection ? '#1e40af' : 'var(--text-primary)',
                            borderColor: showUploadSection ? '#bfdbfe' : 'var(--border-color)',
                            padding: '0.55rem',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        >
                          <UploadCloud size={16} color="#0284c7" />
                          <span>{showUploadSection ? 'Tutup Panel Unggah Lampiran' : '📤 Unggah / Tambah / Ganti Lampiran PDS'}</span>
                        </button>

                        {showUploadSection && (
                          <div style={{ marginTop: '0.85rem' }}>
                            <ShipAttachmentsUpload
                              shipsDetail={lampiranModalItem.shipsDetail || []}
                              onChangeShipsDetail={(updatedShips) => {
                                const updatedItem = { ...lampiranModalItem, shipsDetail: updatedShips };
                                setLampiranModalItem(updatedItem);
                                updateSuratTugas(lampiranModalItem.id, { shipsDetail: updatedShips });
                                toast.success('Lampiran kapal berhasil diperbarui!');
                              }}
                              defaultShipName={lampiranModalItem.namaKapal}
                              defaultAgenda={lampiranModalItem.noAgenda || lampiranModalItem.agenda}
                              folderContext={{
                                year: (lampiranModalItem.tglMulai || '').split('-')[0] || new Date().getFullYear().toString(),
                                subFolder: `${lampiranModalItem.nomor || 'PDS'}_${lampiranModalItem.namaKapal || 'KAPAL'}`.replace(/[^a-zA-Z0-9_-]/g, '_')
                              }}
                              onSyncPrimaryFiles={({ fileVisitName, fileVisitData, fileFotoName, fileFotoData }) => {
                                const payload = {
                                  ...(fileVisitName !== undefined && { fileVisitName, fileVisitData }),
                                  ...(fileFotoName !== undefined && { fileFotoName, fileFotoData })
                                };
                                const updatedItem = { ...lampiranModalItem, ...payload };
                                setLampiranModalItem(updatedItem);
                                updateSuratTugas(lampiranModalItem.id, payload);
                              }}
                              fotoList={lampiranModalItem.fotoList || []}
                              onChangeFotoList={(newList) => {
                                const updatedItem = { ...lampiranModalItem, fotoList: newList };
                                setLampiranModalItem(updatedItem);
                                updateSuratTugas(lampiranModalItem.id, { fotoList: newList });
                                toast.success('Batch lampiran berhasil diperbarui!');
                              }}
                              onPreview={(previewObj) => setPreviewAttachment({ isOpen: true, ...previewObj })}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="modal-footer" style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {canRevisi ? (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      const currentItem = lampiranModalItem;
                      setIsLampiranModalOpen(false);
                      handleOpenRevisi(currentItem);
                    }}
                    style={{
                      background: '#fffbeb',
                      color: '#b45309',
                      border: '1px solid #fde68a',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer'
                    }}
                  >
                    <MessageSquare size={14} />
                    <span>Minta Revisi PDS</span>
                  </button>
                ) : <div />}
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

      {/* Modal Minta Revisi PDS */}
      {isRevisiModalOpen && (
        <ModalPortal>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem'
            }}
            onClick={() => setIsRevisiModalOpen(false)}
          >
            <div
              style={{
                background: 'var(--bg-card, #ffffff)',
                borderRadius: 'var(--radius-lg, 12px)',
                padding: '1.5rem',
                width: '100%',
                maxWidth: '480px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <AlertTriangle size={20} color="#b45309" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Minta Revisi PDS (Buku Agenda)
                </h3>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Nomor PDS: <strong>{cleanDocNumber(revisiItem?.nomor) || '-'}</strong><br />
                Kapal: <strong>{revisiItem?.namaKapal || '-'}</strong><br />
                Surveyor: <strong>{revisiItem?.petugas || '-'}</strong>
              </div>

              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Keterangan Revisi <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Contoh: Lampiran belum lengkap, rincian biaya tiket perlu diperbaiki..."
                value={revisiNote}
                onChange={(e) => setRevisiNote(e.target.value)}
                style={{ width: '100%', fontSize: '0.85rem', resize: 'vertical', marginBottom: '1rem' }}
                autoFocus
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsRevisiModalOpen(false)}
                  style={{ fontSize: '0.82rem' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={handleSubmitRevisi}
                  style={{ fontSize: '0.82rem', background: '#f59e0b', color: '#ffffff', borderColor: '#f59e0b', fontWeight: 700 }}
                >
                  🔄 Kirim Revisi
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
      {/* Modal Cetak Tanda Terima SMC */}
      <TandaTerimaSmcPrintModal
        isOpen={isSmcPrintModalOpen}
        onClose={() => {
          setIsSmcPrintModalOpen(false);
          setSelectedSmcItem(null);
        }}
        suratTugas={selectedSmcItem}
      />
    </div>
  );
};
