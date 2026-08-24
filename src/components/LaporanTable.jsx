import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ClipboardList,
  Anchor,
  User,
  Calendar,
  Printer,
  FileSpreadsheet,
  Lock,
  Unlock,
  Clock,
  Paperclip,
  Filter,
  CheckCircle2,
  Download,
  FileText,
  ChevronDown,
  Camera,
  Eye,
  X,
  ArrowUpDown,
  RotateCcw,
  FileCheck2,
  Plane,
  Receipt
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo, getStatusBadgeClass, isEditWindowExpired, formatRupiah, cleanDocNumber, extractAgendaNumber } from '../utils/formatters';
import { LaporanModal } from './LaporanModal';
import { LaporanPrintModal } from './LaporanPrintModal';
import { ConfirmModal } from './ConfirmModal';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';

export const LaporanTable = () => {
  // UPDATED: Gunakan suratTugas (PDS) sebagai data source, bukan laporanSurvei
  const { suratTugas, updateSuratTugas, deleteSuratTugas, requestEditApproval, approveEditRequest } = useData();
  const { role, usersList } = useAuth();

  // Search & Basic Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [surveyorFilter, setSurveyorFilter] = useState('Semua');

  // Multi-Month & Year Filter
  const [selectedMonth, setSelectedMonth] = useState('Semua');
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

  // Multi-Day / Custom Date Range Filter
  const [datePreset, setDatePreset] = useState('all'); // all, today, this_week, this_month, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting Option (Sort / Short Multi Hari & Tanggal)
  const [sortBy, setSortBy] = useState('tgl_desc'); // tgl_desc, tgl_asc, nilai_desc, nilai_asc, kapal_asc, kapal_desc, petugas_asc, agenda_asc

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPrintItem, setSelectedPrintItem] = useState(null);
  const [isPrintAllMode, setIsPrintAllMode] = useState(false);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [viewPhotosItem, setViewPhotosItem] = useState(null);
  const [previewFullImage, setPreviewFullImage] = useState(null);
  const [previewAttachment, setPreviewAttachment] = useState({ isOpen: false, title: '', fileData: null, fileName: '' });

  const isFinance = role === 'finance' || role === 'keuangan';
  const canAddLaporan = role === 'admin' || role === 'developer' || role === 'surveyor' || role === 'kacab' || isFinance;
  const canEditLaporan = role === 'admin' || role === 'developer' || role === 'surveyor' || role === 'kacab' || isFinance;
  const canDelete = role === 'admin' || role === 'developer';

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
    const list = usersList?.filter(u => u.role === 'surveyor' || u.role === 'kacab') || [];
    return list;
  }, [usersList]);

  // Handle Quick Date Preset Changes
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
    setSelectedMonth('Semua');
    setSelectedYear(String(new Date().getFullYear()));
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSortBy('tgl_desc');
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    surveyorFilter !== 'Semua' ||
    selectedMonth !== 'Semua' ||
    selectedYear !== 'Semua' ||
    startDate !== '' ||
    endDate !== '' ||
    sortBy !== 'tgl_desc';

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleOpenPrintSingle = (item) => {
    setSelectedPrintItem(item);
    setIsPrintAllMode(false);
    setIsPrintModalOpen(true);
  };

  const handleOpenPrintAll = () => {
    setSelectedPrintItem(null);
    setIsPrintAllMode(true);
    setIsPrintModalOpen(true);
  };

  const promptDelete = (item) => {
    setItemToDelete(item);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteSuratTugas(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  const currentMonthLabel = selectedMonth === 'Semua'
    ? `TAHUN ${selectedYear}`
    : `BULAN ${monthNames.find(m => m.value === selectedMonth)?.label?.toUpperCase() || 'MEI'} ${selectedYear}`;

  // Filter & Sort Data
  const filteredData = useMemo(() => {
    // 1. Filter PDS items only (tidak include SPS yang pending)
    const pdsItems = suratTugas.filter(
      (item) => item.docType === 'PDS' || item.isPds === true || (!item.docType && item.status !== 'Menunggu Survei')
    );
    
    const result = pdsItems.filter((item) => {
      // Item sendiri adalah PDS, tidak perlu linkedSurat lagi
      // Hanya tampilkan PDS yang sudah di-ACC oleh Admin
      if (item.approvalStatus !== 'ACC') {
        return false;
      }

      const dateStr = item.tglLapor || item.tanggal || item.tglMulai || '';

      // Month & Year Filter
      if (selectedMonth !== 'Semua') {
        if (dateStr) {
          const itemMonth = dateStr.substring(5, 7);
          const endMonth = item.tglSelesai ? item.tglSelesai.substring(5, 7) : itemMonth;
          if (itemMonth !== selectedMonth && endMonth !== selectedMonth) return false;
        }
      }
      if (selectedYear !== 'Semua') {
        if (dateStr) {
          const itemYear = dateStr.substring(0, 4);
          const endYear = item.tglSelesai ? item.tglSelesai.substring(0, 4) : itemYear;
          if (itemYear !== selectedYear && endYear !== selectedYear) return false;
        }
      }

      // Multi-Day / Custom Date Range Filter
      if (startDate) {
        const itemEnd = item.tglSelesai || dateStr;
        if (itemEnd && itemEnd < startDate) return false;
      }
      if (endDate) {
        const itemStart = dateStr;
        if (itemStart && itemStart > endDate) return false;
      }

      // Surveyor Filter
      const surveyorName = item.petugas || '';
      if (surveyorFilter !== 'Semua' && surveyorName !== surveyorFilter) {
        return false;
      }

      // Search Filter
      const searchLower = searchTerm.toLowerCase();
      const namaKapal = item.namaKapal || '';
      const noAgenda = cleanDocNumber(item.noAgenda || item.nomor || '');
      const namaSurvey = item.namaSurvey || item.jenisSurvey || item.perihal || '';
      const lokasi = item.lokasi || item.lokasiSurvey || item.tempatSurvey || '';

      const matchesSearch =
        !searchTerm ||
        surveyorName.toLowerCase().includes(searchLower) ||
        namaKapal.toLowerCase().includes(searchLower) ||
        noAgenda.toLowerCase().includes(searchLower) ||
        namaSurvey.toLowerCase().includes(searchLower) ||
        lokasi.toLowerCase().includes(searchLower) ||
        (item.noSo || '').toLowerCase().includes(searchLower) ||
        (item.noCda || '').toLowerCase().includes(searchLower) ||
        (item.noWbs || '').toLowerCase().includes(searchLower);

      return matchesSearch;
    });

    // 2. Sort (Short / Sortir)
    result.sort((a, b) => {
      const linkedSuratA = suratTugas.find((s) => s.id === a.suratId);
      const linkedSuratB = suratTugas.find((s) => s.id === b.suratId);

      const dateA = a.tglLapor || a.tanggal || linkedSuratA?.tglMulai || '';
      const dateB = b.tglLapor || b.tanggal || linkedSuratB?.tglMulai || '';

      const valA = Number(a.nilai) || Number(a.tarifDasar) || (linkedSuratA ? linkedSuratA.jumlahEstimasi : 0) || 0;
      const valB = Number(b.nilai) || Number(b.tarifDasar) || (linkedSuratB ? linkedSuratB.jumlahEstimasi : 0) || 0;

      const kapalA = (a.namaKapal || (linkedSuratA ? linkedSuratA.namaKapal : '')).toLowerCase();
      const kapalB = (b.namaKapal || (linkedSuratB ? linkedSuratB.namaKapal : '')).toLowerCase();

      const petugasA = (a.petugas || linkedSuratA?.petugas || '').toLowerCase();
      const petugasB = (b.petugas || linkedSuratB?.petugas || '').toLowerCase();

      const agendaA = (a.noAgenda || a.nomor || linkedSuratA?.nomor || '').toLowerCase();
      const agendaB = (b.noAgenda || b.nomor || linkedSuratB?.nomor || '').toLowerCase();

      switch (sortBy) {
        case 'tgl_asc':
          return dateA.localeCompare(dateB);
        case 'nilai_desc':
          return valB - valA;
        case 'nilai_asc':
          return valA - valB;
        case 'kapal_asc':
          return kapalA.localeCompare(kapalB);
        case 'kapal_desc':
          return kapalB.localeCompare(kapalA);
        case 'petugas_asc':
          return petugasA.localeCompare(petugasB);
        case 'petugas_desc':
          return petugasB.localeCompare(petugasA);
        case 'agenda_asc':
          return agendaA.localeCompare(agendaB);
        case 'agenda_desc':
          return agendaB.localeCompare(agendaA);
        case 'tgl_desc':
        default:
          return dateB.localeCompare(dateA);
      }
    });

    return result;
  }, [suratTugas, selectedMonth, selectedYear, startDate, endDate, surveyorFilter, searchTerm, sortBy]);

  // Pecah / Pisahkan nama kapal dan nominal untuk PDS multi-kapal
  const flattenedData = useMemo(() => {
    const list = [];
    filteredData.forEach((item) => {
      const linkedSurat = suratTugas.find((s) => s.id === item.suratId);
      const shipsDetail = (Array.isArray(item.shipsDetail) && item.shipsDetail.length > 0)
        ? item.shipsDetail
        : (linkedSurat && Array.isArray(linkedSurat.shipsDetail) && linkedSurat.shipsDetail.length > 0)
          ? linkedSurat.shipsDetail
          : null;

      const totalNilai = Number(item.nilai) || Number(item.tarifDasar) || (linkedSurat ? Number(linkedSurat.jumlahEstimasi) : 0) || 0;

      if (shipsDetail && shipsDetail.length > 0) {
        shipsDetail.forEach((sh, sIdx) => {
          const splitNilai = sh.biayaSurvei !== undefined && sh.biayaSurvei !== '' && Number(sh.biayaSurvei) > 0
            ? Number(sh.biayaSurvei)
            : Math.round(totalNilai / shipsDetail.length);

          list.push({
            ...item,
            _flatKey: `${item.id || 'lap'}-ship-${sIdx}`,
            namaKapal: (sh.namaKapal || item.namaKapal || '-').toUpperCase(),
            nilai: splitNilai,
            noAgenda: sh.noAgenda || item.noAgenda || (linkedSurat ? linkedSurat.nomor : '-'),
            noSo: sh.noOrder || item.noSo || (linkedSurat ? linkedSurat.noSo : '-'),
            originalItem: item,
            isSplitChild: shipsDetail.length > 1,
            splitIndex: sIdx,
            totalShips: shipsDetail.length
          });
        });
      } else {
        const rawName = item.namaKapal || (linkedSurat ? linkedSurat.namaKapal : '');
        const shipNames = String(rawName || '').split(',').map((s) => s.trim()).filter(Boolean);

        if (shipNames.length > 1) {
          const perShipNilai = Math.round(totalNilai / shipNames.length);
          shipNames.forEach((sName, sIdx) => {
            list.push({
              ...item,
              _flatKey: `${item.id || 'lap'}-ship-${sIdx}`,
              namaKapal: sName.toUpperCase(),
              nilai: perShipNilai,
              originalItem: item,
              isSplitChild: true,
              splitIndex: sIdx,
              totalShips: shipNames.length
            });
          });
        } else {
          list.push({
            ...item,
            _flatKey: item.id || Math.random().toString(),
            namaKapal: (rawName || '-').toUpperCase(),
            nilai: totalNilai,
            originalItem: item,
            isSplitChild: false
          });
        }
      }
    });

    return list;
  }, [filteredData, suratTugas]);

  /* Total Nilai Calculation */
  const totalNilaiPerjalanan = useMemo(() => {
    return flattenedData.reduce((acc, curr) => acc + (Number(curr.nilai) || 0), 0);
  }, [flattenedData]);

  /* Helper to prepare export rows */
  const getPreparedRows = () => {
    return flattenedData.map((item, index) => {
      // Item sudah PDS langsung
      const dateVal = item.tglLapor || item.tanggal || item.tglMulai || '';
      const dateFormatted = dateVal ? formatDateIndo(dateVal) : '-';
      const vesselName = (item.namaKapal || '-').toUpperCase();
      const lokasi = item.lokasi || item.lokasiSurvey || item.tempatSurvey || '-';
      const nilaiNum = Number(item.nilai) || Number(item.jumlahEstimasi) || 0;
      const namaSurveyor = (item.petugas || '-').toUpperCase();
      const noAgendaRaw = cleanDocNumber(item.noAgenda || item.nomor || '-');
      const noAgenda = extractAgendaNumber(noAgendaRaw);
      const noCda = (!item.noCda || item.noCda === '-' || item.noCda.startsWith('CDA-')) ? '5100010' : item.noCda;
      const noSo = item.noSo && !item.noSo.startsWith('RFQ') && !item.noSo.startsWith('SO-') && item.noSo !== '3000255955'
        ? item.noSo
        : '-';
      const noWbs = item.noWbs || '-';

      return {
        no: index + 1,
        tanggal: dateFormatted,
        namaKapal: vesselName,
        lokasi,
        nilai: nilaiNum,
        namaSurvey: namaSurveyor,
        namaSurveyor,
        noAgenda,
        noCda,
        noSo,
        noWbs
      };
    });
  };

  /* Build styled ExcelJS workbook */
  const createStyledWorkbook = async () => {
    const rows = getPreparedRows();
    const wb = new ExcelJS.Workbook();
    wb.creator = 'BKI Pontianak';
    wb.created = new Date();

    const ws = wb.addWorksheet('Perjalanan Dinas', {
      pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true }
    });

    // Column widths
    ws.columns = [
      { width: 6 },   // A: NO
      { width: 16 },  // B: TANGGAL
      { width: 26 },  // C: NAMA KAPAL
      { width: 22 },  // D: LOKASI SURVEY
      { width: 20 },  // E: NILAI
      { width: 28 },  // F: NAMA SURVEYOR
      { width: 26 },  // G: NO AGENDA
      { width: 18 },  // H: NO CDA
      { width: 20 },  // I: NO.SO
      { width: 22 },  // J: NO.WBS
    ];

    // Color palette
    const DARK_BLUE = '1B3A5C';
    const MEDIUM_BLUE = '2E5B8A';
    const LIGHT_BLUE = 'E8F0FE';
    const GOLD = 'F5B041';
    const GOLD_LIGHT = 'FFF3CD';
    const WHITE = 'FFFFFF';
    const DARK_TEXT = '1A1A1A';
    const BORDER_COLOR = 'B0BEC5';

    const thinBorder = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } }
    };

    // 1. Title Block
    ws.mergeCells('A1:J1');
    const titleCell = ws.getCell('A1');
    titleCell.value = 'LAPORAN REALISASI BIAYA PERJALANAN DINAS SURVEYOR';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: WHITE } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 32;

    ws.mergeCells('A2:J2');
    const subCell = ws.getCell('A2');
    subCell.value = `PT. BIRO KLASIFIKASI INDONESIA (PERSERO) - CABANG PONTIANAK | PERIODE: ${currentMonthLabel}`;
    subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: WHITE } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MEDIUM_BLUE } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 20;

    ws.addRow([]);
    ws.getRow(3).height = 8;

    // 2. Table Headers
    const headers = [
      'NO.',
      'TANGGAL',
      'NAMA KAPAL',
      'LOKASI SURVEY',
      'NILAI (Rp)',
      'NAMA SURVEYOR',
      'NO AGENDA',
      'NO CDA',
      'NO.SO',
      'NO.WBS'
    ];

    const headerRow = ws.addRow(headers);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: WHITE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'medium', color: { argb: DARK_BLUE } },
        left: { style: 'thin', color: { argb: '3A608F' } },
        bottom: { style: 'medium', color: { argb: DARK_BLUE } },
        right: { style: 'thin', color: { argb: '3A608F' } }
      };
    });

    // 3. Data Rows
    let totalNilai = 0;
    rows.forEach((r, idx) => {
      totalNilai += r.nilai;
      const isEven = idx % 2 === 0;
      const row = ws.addRow([
        r.no,
        r.tanggal,
        r.namaKapal,
        r.lokasi,
        r.nilai,
        r.namaSurvey,
        r.noAgenda,
        r.noCda,
        r.noSo,
        r.noWbs
      ]);
      row.height = 22;

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 9, color: { argb: DARK_TEXT } };
        cell.border = thinBorder;
        if (!isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };
        }

        // Alignments & formats
        if (colNumber === 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
        else if (colNumber === 2) cell.alignment = { horizontal: 'center', vertical: 'middle' };
        else if (colNumber === 3) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: DARK_TEXT } };
        }
        else if (colNumber === 4) cell.alignment = { horizontal: 'left', vertical: 'middle' };
        else if (colNumber === 5) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
          cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: DARK_BLUE } };
        }
        else if (colNumber === 6) cell.alignment = { horizontal: 'left', vertical: 'middle' };
        else if (colNumber === 7) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          cell.font = { name: 'Calibri', size: 8.5, color: { argb: '555555' } };
        }
        else if (colNumber >= 8 && colNumber <= 10) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          cell.font = { name: 'Calibri', size: 8.5, color: { argb: '333333' } };
        }
      });
    });

    // 4. Total Summary Row
    const totalRowIndex = ws.rowCount + 1;
    ws.mergeCells(`A${totalRowIndex}:D${totalRowIndex}`);
    const totalLabelCell = ws.getCell(`A${totalRowIndex}`);
    totalLabelCell.value = `TOTAL REALISASI (${rows.length} KEGIATAN):`;
    totalLabelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: DARK_BLUE } };
    totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

    const totalValCell = ws.getCell(`E${totalRowIndex}`);
    totalValCell.value = totalNilai;
    totalValCell.numFmt = '#,##0';
    totalValCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: DARK_BLUE } };
    totalValCell.alignment = { horizontal: 'right', vertical: 'middle' };

    const totalRow = ws.getRow(totalRowIndex);
    totalRow.height = 24;
    totalRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD_LIGHT } };
      cell.border = {
        top: { style: 'medium', color: { argb: GOLD } },
        bottom: { style: 'double', color: { argb: DARK_BLUE } },
        left: { style: 'thin', color: { argb: BORDER_COLOR } },
        right: { style: 'thin', color: { argb: BORDER_COLOR } }
      };
    });

    // 5. Signature Block
    const sigStart = totalRowIndex + 2;
    ws.addRow([]);

    ws.mergeCells(`G${sigStart}:J${sigStart}`);
    const sigDateCell = ws.getCell(`G${sigStart}`);
    sigDateCell.value = `Pontianak, ${formatDateIndo(new Date().toISOString().split('T')[0])}`;
    sigDateCell.font = { name: 'Calibri', size: 9, italic: true };
    sigDateCell.alignment = { horizontal: 'center' };

    ws.mergeCells(`G${sigStart + 1}:J${sigStart + 1}`);
    const sigTitleCell = ws.getCell(`G${sigStart + 1}`);
    sigTitleCell.value = 'PT. BIRO KLASIFIKASI INDONESIA (PERSERO)\nCABANG PONTIANAK';
    sigTitleCell.font = { name: 'Calibri', size: 9, bold: true };
    sigTitleCell.alignment = { horizontal: 'center', wrapText: true };
    ws.getRow(sigStart + 1).height = 28;

    ws.mergeCells(`G${sigStart + 5}:J${sigStart + 5}`);
    const sigNameCell = ws.getCell(`G${sigStart + 5}`);
    sigNameCell.value = 'MUHSON NURROCHMAT';
    sigNameCell.font = { name: 'Calibri', size: 10, bold: true, underline: true };
    sigNameCell.alignment = { horizontal: 'center' };

    ws.mergeCells(`G${sigStart + 6}:J${sigStart + 6}`);
    const sigNupCell = ws.getCell(`G${sigStart + 6}`);
    sigNupCell.value = 'Kepala Cabang / NUP: 48199-KI';
    sigNupCell.font = { name: 'Calibri', size: 8.5, color: { argb: '555555' } };
    sigNupCell.alignment = { horizontal: 'center' };

    return wb;
  };

  /* Export Handlers */
  const handleExportXLSX = async () => {
    setShowExportMenu(false);
    const wb = await createStyledWorkbook();
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Perjalanan_Dinas_BKI_${selectedMonth}_${selectedYear}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportXLS = async () => {
    setShowExportMenu(false);
    const rows = getPreparedRows();
    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Perjalanan Dinas</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
      <body>
        <table border="1">
          <tr style="background-color: #1B3A5C; color: #FFFFFF; font-weight: bold;">
            <th colspan="10" style="font-size: 14pt; text-align: center; height: 35px;">LAPORAN REALISASI BIAYA PERJALANAN DINAS SURVEYOR</th>
          </tr>
          <tr style="background-color: #2E5B8A; color: #FFFFFF;">
            <th colspan="10" style="text-align: center;">PT. BIRO KLASIFIKASI INDONESIA (PERSERO) CABANG PONTIANAK - ${currentMonthLabel}</th>
          </tr>
          <tr style="background-color: #1B3A5C; color: #FFFFFF; font-weight: bold;">
            <th>NO.</th><th>TANGGAL</th><th>NAMA KAPAL</th><th>LOKASI SURVEY</th><th>NILAI</th><th>NAMA SURVEYOR</th><th>NO AGENDA</th><th>NO CDA</th><th>NO.SO</th><th>NO.WBS</th>
          </tr>
    `;

    let total = 0;
    rows.forEach((r, idx) => {
      total += r.nilai;
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#E8F0FE';
      tableHtml += `
        <tr style="background-color: ${bg};">
          <td style="text-align: center;">${r.no}</td>
          <td style="text-align: center;">${r.tanggal}</td>
          <td style="font-weight: bold;">${r.namaKapal}</td>
          <td>${r.lokasi}</td>
          <td style="text-align: right; font-weight: bold;">${r.nilai}</td>
          <td>${r.namaSurvey}</td>
          <td>${r.noAgenda}</td>
          <td>${r.noCda}</td>
          <td>${r.noSo}</td>
          <td>${r.noWbs}</td>
        </tr>
      `;
    });

    tableHtml += `
          <tr style="background-color: #FFF3CD; font-weight: bold;">
            <td colspan="4" style="text-align: right;">TOTAL:</td>
            <td style="text-align: right;">${total}</td>
            <td colspan="5"></td>
          </tr>
        </table>
      </body></html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Perjalanan_Dinas_BKI_${selectedMonth}_${selectedYear}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    setShowExportMenu(false);
    const rows = getPreparedRows();
    const headers = ['No', 'Tanggal', 'Nama Kapal', 'Lokasi Survey', 'Nilai (Rp)', 'Nama Surveyor', 'No Agenda', 'No CDA', 'No SO', 'No WBS'];
    const csvRows = [headers.join(',')];

    rows.forEach((r) => {
      const values = [
        r.no,
        `"${r.tanggal}"`,
        `"${r.namaKapal.replace(/"/g, '""')}"`,
        `"${r.lokasi.replace(/"/g, '""')}"`,
        r.nilai,
        `"${r.namaSurvey.replace(/"/g, '""')}"`,
        `"${r.noAgenda.replace(/"/g, '""')}"`,
        `"${r.noCda.replace(/"/g, '""')}"`,
        `"${r.noSo.replace(/"/g, '""')}"`,
        `"${r.noWbs.replace(/"/g, '""')}"`
      ];
      csvRows.push(values.join(','));
    });

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Perjalanan_Dinas_BKI_${selectedMonth}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div className="card-title-group">
          <ClipboardList size={22} color="var(--accent-primary)" />
          <div>
            <h2 className="card-title">Laporan Perjalanan Dinas Surveyor</h2>
            <div className="card-subtitle">
              Rekapitulasi resmi penugasan, nilai honorarium, sortir multi-hari & multi-bulan
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
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

          {/* Cetak Rekap Button */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleOpenPrintAll}
            title="Cetak format cetak tabel resmi"
            style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', fontWeight: 700 }}
          >
            <Printer size={15} />
            <span>Cetak Rekap</span>
          </button>

          {/* Export Dropdown Group */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowExportMenu(!showExportMenu)}
              title="Pilih Format Export Excel"
              style={{ borderColor: '#10b981', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <FileSpreadsheet size={15} color="#10b981" />
              <span>Export Excel</span>
              <ChevronDown size={14} />
            </button>

            {showExportMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.35rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 50,
                  minWidth: '220px',
                  padding: '0.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}
              >
                <button
                  onClick={handleExportXLSX}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    width: '100%',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <FileSpreadsheet size={16} color="#10b981" />
                  <div>
                    <div>Format Excel (.xlsx)</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Standar Office Modern</div>
                  </div>
                </button>

                <button
                  onClick={handleExportXLS}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    width: '100%',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <FileSpreadsheet size={16} color="#0284c7" />
                  <div>
                    <div>Format Excel (.xls)</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Biner BIFF8 Kompatibel</div>
                  </div>
                </button>

                <button
                  onClick={handleExportCSV}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    width: '100%',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <FileText size={16} color="#8b5cf6" />
                  <div>
                    <div>Format CSV (.csv)</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Universal UTF-8 Format</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {canAddLaporan && (
            <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
              <Plus size={16} />
              <span>Tambah Data</span>
            </button>
          )}
        </div>
      </div>

      {/* COMPACT FILTER & SORTING TOOLBAR (MULTI-HARI, MULTI-BULAN & TAHUN) */}
      <div
        style={{
          background: 'var(--bg-main)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '0.55rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem'
        }}
      >
        {/* Row 1: Search, Surveyor & Sort Dropdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1.2fr', gap: '0.5rem', alignItems: 'center' }}>
          {/* Search Box */}
          <div className="search-box" style={{ width: '100%' }}>
            <Search className="search-icon" size={14} />
            <input
              type="text"
              className="form-input"
              placeholder="Cari kapal, surveyor, agenda, CDA, SO, WBS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', fontSize: '0.78rem', padding: '0.25rem 0.5rem 0.25rem 2rem', height: '32px' }}
            />
          </div>

          {/* Surveyor Filter */}
          <div>
            <select
              className="form-select"
              value={surveyorFilter}
              onChange={(e) => setSurveyorFilter(e.target.value)}
              style={{ width: '100%', fontSize: '0.78rem', padding: '0.25rem 0.5rem', height: '32px' }}
            >
              <option value="Semua">👤 Semua Surveyor</option>
              {surveyors.map((s) => (
                <option key={s.id} value={s.name}>
                  👤 {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sortir / Short Selector */}
          <div>
            <select
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%',
                borderColor: 'var(--accent-primary)',
                fontWeight: 600,
                color: 'var(--accent-primary)',
                fontSize: '0.78rem',
                padding: '0.25rem 0.5rem',
                height: '32px'
              }}
            >
              <option value="tgl_desc">📅 Tanggal (Terbaru ke Terlama)</option>
              <option value="tgl_asc">📅 Tanggal (Terlama ke Terbaru)</option>
              <option value="nilai_desc">💰 Nilai (Tertinggi)</option>
              <option value="nilai_asc">💰 Nilai (Terendah)</option>
              <option value="kapal_asc">🚢 Nama Kapal (A - Z)</option>
              <option value="kapal_desc">🚢 Nama Kapal (Z - A)</option>
              <option value="petugas_asc">👤 Surveyor (A - Z)</option>
              <option value="petugas_desc">👤 Surveyor (Z - A)</option>
              <option value="agenda_asc">📄 No. Agenda (A - Z)</option>
              <option value="agenda_desc">📄 No. Agenda (Z - A)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Multi-Bulan, Tahun, & Rentang Multi-Hari */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            paddingTop: '0.4rem',
            borderTop: '1px solid var(--border-color)'
          }}
        >
          {/* Month & Year Controls */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={13} color="var(--accent-primary)" />
              <span>Bulan:</span>
            </span>

            <select
              className="form-select"
              style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: '28px' }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="Semua">Semua Bulan</option>
              {monthNames.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              className="form-select"
              style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: '28px' }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y === 'Semua' ? 'Semua Tahun' : `Tahun ${y}`}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Multi-Hari Controls */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={13} color="#059669" />
              <span>Rentang Hari:</span>
            </span>

            {/* Quick Presets */}
            <div style={{ display: 'inline-flex', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', padding: '1px' }}>
              <button
                type="button"
                onClick={() => handleDatePresetChange('all')}
                style={{
                  background: datePreset === 'all' ? 'var(--accent-primary)' : 'transparent',
                  color: datePreset === 'all' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '2px',
                  padding: '0.15rem 0.4rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => handleDatePresetChange('today')}
                style={{
                  background: datePreset === 'today' ? 'var(--accent-primary)' : 'transparent',
                  color: datePreset === 'today' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '2px',
                  padding: '0.15rem 0.4rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => handleDatePresetChange('this_week')}
                style={{
                  background: datePreset === 'this_week' ? 'var(--accent-primary)' : 'transparent',
                  color: datePreset === 'this_week' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '2px',
                  padding: '0.15rem 0.4rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Minggu Ini
              </button>
              <button
                type="button"
                onClick={() => handleDatePresetChange('this_month')}
                style={{
                  background: datePreset === 'this_month' ? 'var(--accent-primary)' : 'transparent',
                  color: datePreset === 'this_month' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '2px',
                  padding: '0.15rem 0.4rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Bulan Ini
              </button>
            </div>

            {/* Custom Multi-Date Inputs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <input
                type="date"
                className="form-input"
                style={{ padding: '0.15rem 0.35rem', fontSize: '0.75rem', width: 'auto', height: '28px' }}
                value={startDate}
                onChange={(e) => {
                  setDatePreset('custom');
                  setStartDate(e.target.value);
                }}
                title="Tanggal Dari"
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>-</span>
              <input
                type="date"
                className="form-input"
                style={{ padding: '0.15rem 0.35rem', fontSize: '0.75rem', width: 'auto', height: '28px' }}
                value={endDate}
                onChange={(e) => {
                  setDatePreset('custom');
                  setEndDate(e.target.value);
                }}
                title="Tanggal Sampai"
              />
            </div>
          </div>
        </div>

        {/* Row 3: Filter Summary Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: 'var(--text-secondary)',
            background: 'var(--bg-card)',
            padding: '0.3rem 0.6rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span>
              Menampilkan: <strong style={{ color: 'var(--text-primary)' }}>{filteredData.length}</strong> Kegiatan
            </span>
            <span>•</span>
            <span>
              Total: <strong style={{ color: 'var(--accent-primary)' }}>{formatRupiah(totalNilaiPerjalanan)}</strong>
            </span>
            {selectedMonth !== 'Semua' && (
              <>
                <span>•</span>
                <span className="badge" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                  Bulan {monthNames.find((m) => m.value === selectedMonth)?.label}
                </span>
              </>
            )}
            {selectedYear !== 'Semua' && (
              <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed', fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                Tahun {selectedYear}
              </span>
            )}
            {(startDate || endDate) && (
              <span className="badge" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669', fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                {startDate ? formatDateIndo(startDate) : 'Awal'} - {endDate ? formatDateIndo(endDate) : 'Akhir'}
              </span>
            )}
          </div>

          <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
            Urutan:{' '}
            <span style={{ color: 'var(--accent-primary)' }}>
              {sortBy === 'tgl_desc' && 'Tanggal Terbaru'}
              {sortBy === 'tgl_asc' && 'Tanggal Terlama'}
              {sortBy === 'nilai_desc' && 'Nilai Tertinggi'}
              {sortBy === 'nilai_asc' && 'Nilai Terendah'}
              {sortBy === 'kapal_asc' && 'Kapal (A-Z)'}
              {sortBy === 'kapal_desc' && 'Kapal (Z-A)'}
              {sortBy === 'petugas_asc' && 'Surveyor (A-Z)'}
              {sortBy === 'petugas_desc' && 'Surveyor (Z-A)'}
              {sortBy === 'agenda_asc' && 'No. Agenda (A-Z)'}
              {sortBy === 'agenda_desc' && 'No. Agenda (Z-A)'}
            </span>
          </div>
        </div>
      </div>

      {/* ====== 10 KOLOM TABEL RESMI ====== */}
      <div className="table-wrapper">
        <table className="data-table" style={{ fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ textAlign: 'center' }}>
              <th style={{ width: '45px', textAlign: 'center' }}>NO.</th>
              <th
                onClick={() => setSortBy(sortBy === 'tgl_desc' ? 'tgl_asc' : 'tgl_desc')}
                style={{ width: '110px', textAlign: 'center', cursor: 'pointer' }}
                title="Klik untuk mengurutkan tanggal"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                  <span>TANGGAL</span>
                  <ArrowUpDown size={12} color="var(--text-muted)" />
                </div>
              </th>
              <th
                onClick={() => setSortBy(sortBy === 'kapal_asc' ? 'kapal_desc' : 'kapal_asc')}
                style={{ minWidth: '160px', textAlign: 'left', cursor: 'pointer' }}
                title="Klik untuk mengurutkan kapal"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span>NAMA KAPAL</span>
                  <ArrowUpDown size={12} color="var(--text-muted)" />
                </div>
              </th>
              <th style={{ minWidth: '130px', textAlign: 'left' }}>LOKASI SURVEY</th>
              <th
                onClick={() => setSortBy(sortBy === 'nilai_desc' ? 'nilai_asc' : 'nilai_desc')}
                style={{ minWidth: '110px', textAlign: 'right', cursor: 'pointer' }}
                title="Klik untuk mengurutkan nilai"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                  <span>NILAI</span>
                  <ArrowUpDown size={12} color="var(--text-muted)" />
                </div>
              </th>
              <th style={{ minWidth: '160px', textAlign: 'left' }}>NAMA SURVEYOR</th>
              <th
                onClick={() => setSortBy(sortBy === 'agenda_asc' ? 'agenda_desc' : 'agenda_asc')}
                style={{ minWidth: '140px', textAlign: 'left', cursor: 'pointer' }}
                title="Klik untuk mengurutkan no. agenda"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span>NO AGENDA</span>
                  <ArrowUpDown size={12} color="var(--text-muted)" />
                </div>
              </th>
              <th style={{ minWidth: '110px', textAlign: 'left' }}>NO CDA</th>
              <th style={{ minWidth: '110px', textAlign: 'left' }}>NO.SO</th>
              <th style={{ minWidth: '110px', textAlign: 'left' }}>NO.WBS</th>
              <th style={{ width: '100px', textAlign: 'center' }}>AKSI</th>
            </tr>
          </thead>
          <tbody>
            {flattenedData.length === 0 ? (
              <tr>
                <td colSpan="11" className="table-empty" style={{ padding: '2.5rem 1rem' }}>
                  <Anchor size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <p style={{ fontWeight: 700 }}>Tidak ada data perjalanan dinas survey untuk filter ini.</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Data otomatis masuk ketika formulir survei disimpan, atau klik tombol "Tambah Data".
                  </p>
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
              flattenedData.map((item, index) => {
                // Item sudah PDS langsung, tidak perlu linkedSurat
                const dateVal = item.tglLapor || item.tanggal || item.tglMulai;
                const vesselName = item.namaKapal || '-';
                const lokasi = item.lokasi || item.lokasiSurvey || item.tempatSurvey || '-';
                const nilaiNum = Number(item.nilai) || Number(item.jumlahEstimasi) || 0;
                const namaSurvey = item.namaSurvey || item.jenisSurvey || item.perihal || 'DINAS SURVEY KLAS';
                const noAgendaRaw = cleanDocNumber(item.noAgenda || item.nomor || '-');
                const noAgenda = extractAgendaNumber(noAgendaRaw);
                const noCda = (!item.noCda || item.noCda === '-' || item.noCda.startsWith('CDA-')) ? '5100010' : item.noCda;
                const noSo = item.noSo && !item.noSo.startsWith('RFQ') && !item.noSo.startsWith('SO-') && item.noSo !== '3000255955' 
                  ? item.noSo 
                  : '-';
                const noWbs = item.noWbs || '-';

                return (
                  <tr key={item._flatKey || item.id || index}>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {index + 1}
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {formatDateIndo(dateVal)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                        {vesselName}
                      </div>
                      {item.isSplitChild && (
                        <div style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 600 }}>
                          (Kapal {item.splitIndex + 1} dari {item.totalShips})
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{lokasi}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>
                      {formatRupiah(nilaiNum)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, textTransform: 'uppercase' }}>
                        {item.petugas || '-'}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{noAgenda}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.775rem' }}>{noCda}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#0284c7' }}>{noSo}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{noWbs}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem' }}>
                        {canEditLaporan && (
                          <button
                            className="btn btn-secondary btn-icon btn-sm"
                            onClick={() => handleOpenEdit(item.originalItem || item)}
                            title="Edit Data"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            className="btn btn-danger btn-icon btn-sm"
                            onClick={() => promptDelete(item.originalItem || item)}
                            title="Hapus Data"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}

                        {(() => {
                          const targetItem = item.originalItem || item;
                          const photos = (Array.isArray(targetItem.fotoList) && targetItem.fotoList.length > 0)
                            ? targetItem.fotoList
                            : (targetItem.fileFotoData || targetItem.fileFotoName)
                              ? (targetItem.fileFotoName || '').split(',').map((name, i) => ({
                                  name: name.trim(),
                                  data: (targetItem.fileFotoData || '').split('|||')[i] || targetItem.fileFotoData || ''
                                })).filter(p => p.name || p.data)
                              : [];

                          if (photos.length === 0) return null;

                          return (
                            <button
                              type="button"
                              onClick={() => setViewPhotosItem({ ...targetItem, parsedPhotos: photos })}
                              className="btn btn-secondary btn-icon btn-sm"
                              title={`Lihat / Unduh ${photos.length} Foto Dokumentasi`}
                              style={{ borderColor: '#0284c7', color: '#0284c7', position: 'relative' }}
                            >
                              <Camera size={14} />
                              {photos.length > 1 && (
                                <span
                                  style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-4px',
                                    background: '#0284c7',
                                    color: '#ffffff',
                                    fontSize: '0.6rem',
                                    fontWeight: 800,
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  {photos.length}
                                </span>
                              )}
                            </button>
                          );
                        })()}

                        {((item.originalItem || item).fileVisitData || (item.originalItem || item).fileVisitName) && (
                          <button
                            type="button"
                            onClick={() => {
                              const targetItem = item.originalItem || item;
                              setPreviewAttachment({
                                isOpen: true,
                                title: 'Formulir Kunjungan Lapangan (Visit Form)',
                                fileData: targetItem.fileVisitData || targetItem.fileVisitName,
                                fileName: targetItem.fileVisitName || 'Form_Visit'
                              });
                            }}
                            className="btn btn-secondary btn-icon btn-sm"
                            title={`Lihat Form Visit: ${(item.originalItem || item).fileVisitName || 'Terlampir'}`}
                            style={{ borderColor: '#059669', color: '#059669' }}
                          >
                            <FileCheck2 size={14} />
                          </button>
                        )}

                        {((item.originalItem || item).fileTiketTransportData || (item.originalItem || item).fileTiketTransportName) && (
                          <button
                            type="button"
                            onClick={() => {
                              const targetItem = item.originalItem || item;
                              setPreviewAttachment({
                                isOpen: true,
                                title: 'Bukti Tiket Transportasi',
                                fileData: targetItem.fileTiketTransportData || targetItem.fileTiketTransportName,
                                fileName: targetItem.fileTiketTransportName || 'Tiket_Transport'
                              });
                            }}
                            className="btn btn-secondary btn-icon btn-sm"
                            title={`Lihat Tiket: ${(item.originalItem || item).fileTiketTransportName || 'Terlampir'}`}
                            style={{ borderColor: '#7c3aed', color: '#7c3aed' }}
                          >
                            <Plane size={14} />
                          </button>
                        )}

                        {((item.originalItem || item).fileKwitansiHotelData || (item.originalItem || item).fileKwitansiHotelName) && (
                          <button
                            type="button"
                            onClick={() => {
                              const targetItem = item.originalItem || item;
                              setPreviewAttachment({
                                isOpen: true,
                                title: 'Bukti Kwitansi Hotel / Penginapan',
                                fileData: targetItem.fileKwitansiHotelData || targetItem.fileKwitansiHotelName,
                                fileName: targetItem.fileKwitansiHotelName || 'Kwitansi_Hotel'
                              });
                            }}
                            className="btn btn-secondary btn-icon btn-sm"
                            title={`Lihat Kwitansi Hotel: ${(item.originalItem || item).fileKwitansiHotelName || 'Terlampir'}`}
                            style={{ borderColor: '#d97706', color: '#d97706' }}
                          >
                            <Receipt size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {flattenedData.length > 0 && (
            <tfoot>
              <tr style={{ background: 'var(--bg-main)', fontWeight: 800 }}>
                <td colSpan="4" style={{ textAlign: 'right', padding: '0.75rem 1rem' }}>
                  TOTAL NILAI PERJALANAN DINAS ({flattenedData.length} Kegiatan):
                </td>
                <td style={{ textAlign: 'right', padding: '0.75rem', color: 'var(--accent-primary)', fontSize: '0.95rem' }}>
                  {formatRupiah(totalNilaiPerjalanan)}
                </td>
                <td colSpan="6"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Gallery Modal */}
      {viewPhotosItem && (
        <div
          onClick={() => setViewPhotosItem(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-modal)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color-strong)',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--bg-card-solid)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                <Camera size={18} color="#0284c7" />
                <span>Foto Dokumentasi: {viewPhotosItem.namaKapal}</span>
                <span style={{ fontSize: '0.75rem', background: 'rgba(2, 132, 199, 0.15)', color: '#0284c7', padding: '0.1rem 0.5rem', borderRadius: '12px', fontWeight: 800 }}>
                  {viewPhotosItem.parsedPhotos?.length || 0} Foto
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewPhotosItem(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.2rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
              {(viewPhotosItem.parsedPhotos || []).map((photo, pIdx) => {
                const isPdf = photo.name?.toLowerCase().endsWith('.pdf');
                return (
                  <div
                    key={pIdx}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem'
                    }}
                  >
                    <div
                      onClick={() => photo.data && setPreviewFullImage(photo)}
                      style={{
                        width: '100%',
                        height: '100px',
                        borderRadius: '4px',
                        background: 'var(--bg-main)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        cursor: photo.data ? 'pointer' : 'default',
                        position: 'relative'
                      }}
                    >
                      {isPdf ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                          <FileText size={32} color="#ef4444" />
                          <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 800 }}>PDF</span>
                        </div>
                      ) : photo.data ? (
                        <img
                          src={photo.data}
                          alt={photo.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      ) : (
                        <Camera size={28} color="var(--text-muted)" />
                      )}

                      {photo.data && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.3)',
                            opacity: 0,
                            transition: 'opacity 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                        >
                          <Eye size={18} />
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={photo.name}>
                      {photo.name || `Foto ${pIdx + 1}`}
                    </div>

                    {photo.data && (
                      <a
                        href={photo.data}
                        download={photo.name || `foto_${pIdx + 1}`}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', width: '100%' }}
                      >
                        <Download size={12} />
                        <span>Unduh</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Full Lightbox */}
      {previewFullImage && (
        <div
          onClick={() => setPreviewFullImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-modal)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{previewFullImage.name}</span>
              <button type="button" onClick={() => setPreviewFullImage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '75vh', overflow: 'auto' }}>
              <img src={previewFullImage.data} alt={previewFullImage.name} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
            </div>
          </div>
        </div>
      )}

      <LaporanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editItem={editingItem}
      />

      <LaporanPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        laporan={selectedPrintItem}
        isPrintAll={isPrintAllMode}
        allData={flattenedData}
        currentPeriod={currentMonthLabel}
        totalNilai={totalNilaiPerjalanan}
        suratTugas={suratTugas}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Hapus Data Perjalanan Dinas"
        message={`Apakah Anda yakin ingin menghapus data perjalanan dinas untuk kapal "${itemToDelete?.namaKapal || 'ini'}"?`}
        confirmText="Hapus Data"
        cancelText="Batal"
        type="danger"
        onConfirm={handleConfirmDelete}
        onClose={() => setIsConfirmOpen(false)}
      />

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
