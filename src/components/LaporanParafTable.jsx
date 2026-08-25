import React, { useState, useMemo } from 'react';
import {
  Search,
  Printer,
  Calendar,
  Clock,
  RotateCcw,
  Anchor,
  User,
  MapPin,
  FileText,
  ArrowUpDown,
  Phone,
  FileCheck,
  FileSpreadsheet,
  ChevronDown,
  Send,
  CheckCheck,
  CheckCircle2
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { toast } from 'react-hot-toast';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo, cleanDocNumber } from '../utils/formatters';
import { LampiranParafPrintModal } from './LampiranParafPrintModal';
import { SuratTugasPrintModal } from './SuratTugasPrintModal';
import { SpsModal } from './SpsModal';

export const LaporanParafTable = () => {
  const { suratTugas, updateSuratTugas } = useData();
  const { role, usersList, currentUser } = useAuth();

  // Status Tab: 'terkirim' (Default Laporan Paraf) vs 'menunggu' (Menunggu Kirim Surveyor)
  const [statusTab, setStatusTab] = useState('terkirim');

  // Search & Basic Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [surveyorFilter, setSurveyorFilter] = useState('Semua');

  // Multi-Month & Year Filter
  const [selectedMonth, setSelectedMonth] = useState('Semua');
  const [selectedYear, setSelectedYear] = useState('Semua');

  // Multi-Day / Custom Date Range Filter
  const [datePreset, setDatePreset] = useState('all'); // all, today, this_week, this_month, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting Option
  const [sortBy, setSortBy] = useState('tgl_desc'); // tgl_desc, tgl_asc, kapal_asc, kapal_desc, petugas_asc, nomor_asc

  // Modals
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPrintItem, setSelectedPrintItem] = useState(null);
  const [isSpsPrintModalOpen, setIsSpsPrintModalOpen] = useState(false);
  const [selectedSpsPrintItem, setSelectedSpsPrintItem] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Checkbox Selection State
  const [selectedRowIds, setSelectedRowIds] = useState([]);

  const canManage = role === 'admin' || role === 'developer' || role === 'kacab';
  const canPrintSps = role === 'admin' || role === 'developer' || role === 'kacab' || role === 'keuangan' || role === 'finance';

  const handlePrintSps = (item) => {
    setSelectedSpsPrintItem(item);
    setIsSpsPrintModalOpen(true);
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
    const list = usersList?.filter(u => u.role === 'surveyor' || u.role === 'kacab') || [];
    return list;
  }, [usersList]);

  // Calculate days difference
  const calculateDays = (start, end) => {
    if (!start) return 1;
    if (!end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s) || isNaN(e)) return 1;
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  };

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
    setSelectedRowIds([]);
  };

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

  const hasActiveFilters =
    searchTerm !== '' ||
    surveyorFilter !== 'Semua' ||
    selectedMonth !== 'Semua' ||
    selectedYear !== 'Semua' ||
    startDate !== '' ||
    endDate !== '' ||
    sortBy !== 'tgl_desc';

  // Period label for printing/exporting
  const currentPeriodLabel = useMemo(() => {
    if (startDate && endDate) {
      return `PERIODE ${formatDateIndo(startDate).toUpperCase()} S/D ${formatDateIndo(endDate).toUpperCase()}`;
    }
    if (startDate) {
      return `SEJAK ${formatDateIndo(startDate).toUpperCase()}`;
    }
    if (selectedMonth !== 'Semua') {
      const mName = monthNames.find(m => m.value === selectedMonth)?.label?.toUpperCase() || '';
      return `BULAN ${mName} ${selectedYear}`;
    }
    if (selectedYear !== 'Semua') {
      return `TAHUN ${selectedYear}`;
    }
    return 'SEMUA PERIODE';
  }, [startDate, endDate, selectedMonth, selectedYear]);

  const totalTerkirimCount = useMemo(() => {
    return suratTugas.filter((item) => {
      if (item.docType === 'PDS' || item.isPds) return false;
      const isVisit1 = !item.visit || item.visit === '1' || item.visit === 1 || item.visit === true || item.visit === 'Visit 1' || item.visit !== '2';
      if (!isVisit1) return false;
      return item.isParafSent === true || (item.isParafSent === undefined && item.status === 'Selesai');
    }).length;
  }, [suratTugas]);

  const totalMenungguCount = useMemo(() => {
    return suratTugas.filter((item) => {
      if (item.docType === 'PDS' || item.isPds) return false;
      const isVisit1 = !item.visit || item.visit === '1' || item.visit === 1 || item.visit === true || item.visit === 'Visit 1' || item.visit !== '2';
      if (!isVisit1) return false;
      return !item.isParafSent && item.status !== 'Selesai';
    }).length;
  }, [suratTugas]);

  const handleKirimParaf = (item) => {
    updateSuratTugas(item.id, {
      isParafSent: true,
      parafSentAt: new Date().toISOString(),
      parafSentBy: currentUser?.name || item.petugas
    });
    toast.success(`Laporan Paraf untuk kapal ${item.namaKapal} berhasil dikirim ke Laporan Paraf BKI!`);
  };

  const handleBatalkanKirimParaf = (item) => {
    updateSuratTugas(item.id, {
      isParafSent: false,
      parafSentAt: null,
      parafSentBy: null
    });
    toast.info(`Pengiriman Laporan Paraf untuk ${item.namaKapal} dibatalkan.`);
  };

  // Filter ONLY Visit Pertama items (`visit === '1' || visit === 1 || visit === true`)
  const filteredData = useMemo(() => {
    // 1. Filter
    const result = suratTugas.filter((item) => {
      // Hanya tampilkan dokumen per kapal (SPS individual), exclude gabungan multi-kapal (PDS)
      if (item.docType === 'PDS' || item.isPds) {
        return false;
      }

      // Must be Visit 1 (Visit Pertama)
      const isVisit1 = !item.visit || item.visit === '1' || item.visit === 1 || item.visit === true || item.visit === 'Visit 1' || item.visit !== '2';
      if (!isVisit1) return false;

      // Status Tab Filter (Terkirim vs Menunggu Pengiriman)
      const isSent = item.isParafSent === true || (item.isParafSent === undefined && item.status === 'Selesai');
      if (statusTab === 'terkirim' && !isSent) return false;
      if (statusTab === 'menunggu' && isSent) return false;

      // Surveyor Filter
      if (surveyorFilter !== 'Semua' && item.petugas !== surveyorFilter) {
        return false;
      }

      const itemDate = item.tglMulai || item.tglSelesai || '';

      // Month Filter
      if (selectedMonth !== 'Semua') {
        if (itemDate) {
          const itemMonth = itemDate.substring(5, 7);
          const endMonth = item.tglSelesai ? item.tglSelesai.substring(5, 7) : itemMonth;
          if (itemMonth !== selectedMonth && endMonth !== selectedMonth) {
            return false;
          }
        }
      }

      // Year Filter
      if (selectedYear !== 'Semua') {
        if (itemDate) {
          const itemYear = itemDate.substring(0, 4);
          const endYear = item.tglSelesai ? item.tglSelesai.substring(0, 4) : itemYear;
          if (itemYear !== selectedYear && endYear !== selectedYear) {
            return false;
          }
        }
      }

      // Multi-Day / Custom Date Range Filter
      if (startDate) {
        const itemEnd = item.tglSelesai || item.tglMulai || '';
        if (itemEnd && itemEnd < startDate) return false;
      }
      if (endDate) {
        const itemStart = item.tglMulai || item.tglSelesai || '';
        if (itemStart && itemStart > endDate) return false;
      }

      // Search Box Filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        (item.petugas || '').toLowerCase().includes(searchLower) ||
        (item.nomor || '').toLowerCase().includes(searchLower) ||
        (item.namaKapal || '').toLowerCase().includes(searchLower) ||
        (item.lokasi || '').toLowerCase().includes(searchLower) ||
        (item.perihal || '').toLowerCase().includes(searchLower) ||
        (item.jenisSurvey || '').toLowerCase().includes(searchLower) ||
        (item.pemohon || '').toLowerCase().includes(searchLower) ||
        (item.agenda || '').toLowerCase().includes(searchLower) ||
        (item.noOrder || '').toLowerCase().includes(searchLower);

      return matchesSearch;
    });

    // 2. Sort
    result.sort((a, b) => {
      const dateA = a.tglMulai || a.tglSelesai || '';
      const dateB = b.tglMulai || b.tglSelesai || '';
      const durA = calculateDays(a.tglMulai, a.tglSelesai);
      const durB = calculateDays(b.tglMulai, b.tglSelesai);
      const lokasiA = (a.tempatSurvey || a.lokasi || a.tujuan || '').toLowerCase();
      const lokasiB = (b.tempatSurvey || b.lokasi || b.tujuan || '').toLowerCase();

      switch (sortBy) {
        case 'tgl_asc':
          return dateA.localeCompare(dateB);
        case 'duration_desc':
          return durB - durA;
        case 'duration_asc':
          return durA - durB;
        case 'kapal_asc':
          return (a.namaKapal || '').localeCompare(b.namaKapal || '');
        case 'kapal_desc':
          return (b.namaKapal || '').localeCompare(a.namaKapal || '');
        case 'lokasi_asc':
          return lokasiA.localeCompare(lokasiB);
        case 'lokasi_desc':
          return lokasiB.localeCompare(lokasiA);
        case 'petugas_asc':
          return (a.petugas || '').localeCompare(b.petugas || '');
        case 'petugas_desc':
          return (b.petugas || '').localeCompare(a.petugas || '');
        case 'nomor_asc':
          return (a.nomor || '').localeCompare(b.nomor || '');
        case 'nomor_desc':
          return (b.nomor || '').localeCompare(a.nomor || '');
        case 'tgl_desc':
        default:
          return dateB.localeCompare(dateA);
      }
    });

    return result;
  }, [suratTugas, statusTab, surveyorFilter, selectedMonth, selectedYear, startDate, endDate, searchTerm, sortBy]);

  // Open Accumulated Print Modal (All filtered items)
  const handleOpenPrintAll = () => {
    setSelectedPrintItem(null);
    setIsPrintModalOpen(true);
  };

  // Open Single Print Modal
  const handleOpenPrintSingle = (item) => {
    setSelectedPrintItem(item);
    setIsPrintModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  // Export Excel Handlers
  const handleExportExcel = async () => {
    setShowExportMenu(false);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'BKI Pontianak';
    wb.created = new Date();

    const ws = wb.addWorksheet('Lampiran Paraf', {
      pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true }
    });

    ws.columns = [
      { width: 6 },   // A: NO
      { width: 26 },  // B: NAMA KAPAL
      { width: 22 },  // C: SURVEYOR
      { width: 16 },  // D: NO HP
      { width: 24 },  // E: JENIS SURVEY
      { width: 16 },  // F: TGL. SURVEY
      { width: 20 },  // G: LOKASI SURVEY
      { width: 18 },  // H: RFQ / NO. ORDER
    ];

    const DARK_BLUE = '1B3A5C';
    const MEDIUM_BLUE = '2E5B8A';
    const LIGHT_BLUE = 'E8F0FE';
    const WHITE = 'FFFFFF';
    const BORDER_COLOR = 'B0BEC5';

    const thinBorder = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } }
    };

    // Title
    ws.mergeCells('A1:H1');
    const titleCell = ws.getCell('A1');
    titleCell.value = 'LAMPIRAN PERMOHONAN PARAF PADA SURAT PENUGASAN';
    titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: WHITE } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 28;

    ws.mergeCells('A2:H2');
    const subCell = ws.getCell('A2');
    subCell.value = `PT. BIRO KLASIFIKASI INDONESIA (PERSERO) - CABANG MADYA KLAS PONTIANAK | ${currentPeriodLabel}`;
    subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: WHITE } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MEDIUM_BLUE } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 20;

    ws.addRow([]);

    // Table Header
    const headers = ['NO.', 'NAMA KAPAL', 'SURVEYOR', 'NO HP', 'JENIS SURVEY', 'TGL. SURVEY', 'LOKASI SURVEY', 'RFQ'];
    const hRow = ws.addRow(headers);
    hRow.height = 24;
    hRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: WHITE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Rows
    const targetData = selectedRowIds.length > 0
      ? filteredData.filter((item) => selectedRowIds.includes(item.id))
      : filteredData;

    targetData.forEach((item, idx) => {
      const surveyorPhone = usersList?.find((u) => u.name === item.petugas)?.phone || '-';
      const isEven = idx % 2 === 0;
      const row = ws.addRow([
        idx + 1,
        (item.namaKapal || '-').toUpperCase(),
        item.petugas || '-',
        surveyorPhone,
        (item.jenisSurvey || item.perihal || '-').toUpperCase(),
        formatDateIndo(item.tglMulai),
        (item.tempatSurvey || item.lokasi || '-').toUpperCase(),
        item.noOrder || '-'
      ]);
      row.height = 20;
      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Calibri', size: 9 };
        cell.border = thinBorder;
        if (!isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };
        }
        if (colNum === 1 || colNum === 4 || colNum === 6 || colNum === 8) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Paraf_BKI_${selectedMonth}_${selectedYear}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    setShowExportMenu(false);
    const targetData = selectedRowIds.length > 0
      ? filteredData.filter((item) => selectedRowIds.includes(item.id))
      : filteredData;

    const headers = ['No', 'Nama Kapal', 'Surveyor', 'No HP', 'Jenis Survey', 'Tgl Survey', 'Lokasi Survey', 'RFQ / No Order'];
    const rows = targetData.map((item, idx) => {
      const surveyorPhone = usersList?.find((u) => u.name === item.petugas)?.phone || '-';
      return [
        idx + 1,
        `"${(item.namaKapal || '').replace(/"/g, '""')}"`,
        `"${(item.petugas || '').replace(/"/g, '""')}"`,
        `"${surveyorPhone}"`,
        `"${(item.jenisSurvey || item.perihal || '').replace(/"/g, '""')}"`,
        `"${formatDateIndo(item.tglMulai)}"`,
        `"${(item.lokasi || '').replace(/"/g, '""')}"`,
        `"${(item.noOrder || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Paraf_BKI_${selectedMonth}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div className="card-title-group">
          <FileCheck size={22} color="#2563eb" />
          <div>
            <h2 className="card-title">Laporan Permohonan Paraf (Visit Pertama)</h2>
            <div className="card-subtitle">
              Akumulasi penugasan visit 1 per periode tanggal / bulan untuk pencetakan lampiran paraf resmi
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

          {/* Cetak PDF Button */}
          <button
            className="btn btn-primary btn-sm"
            onClick={handleOpenPrintAll}
            title={selectedRowIds.length > 0 ? `Download / Cetak PDF ${selectedRowIds.length} Laporan Paraf Terpilih` : 'Download / Cetak PDF Laporan Paraf Sesuai Periode'}
            style={{
              background: '#2563eb',
              borderColor: '#2563eb',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
            }}
          >
            <Printer size={15} />
            <span>{selectedRowIds.length > 0 ? `Cetak Terpilih (${selectedRowIds.length})` : 'Cetak PDF'}</span>
          </button>

          {/* Export Dropdown */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowExportMenu(!showExportMenu)}
              title="Pilih Format Export Excel"
              style={{ borderColor: '#10b981', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <FileSpreadsheet size={15} color="#10b981" />
              <span>{selectedRowIds.length > 0 ? `Export (${selectedRowIds.length})` : 'Export Excel'}</span>
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
                  minWidth: '200px',
                  padding: '0.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}
              >
                <button
                  onClick={handleExportExcel}
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
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Standar Office Modern</div>
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
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Universal UTF-8</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Switcher Tabs: Laporan Paraf Terkirim vs Menunggu Pengiriman Surveyor */}
      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.65rem' }}>
        <button
          type="button"
          onClick={() => setStatusTab('terkirim')}
          style={{
            padding: '0.45rem 0.95rem',
            borderRadius: '6px',
            border: 'none',
            fontWeight: 800,
            fontSize: '0.84rem',
            cursor: 'pointer',
            background: statusTab === 'terkirim' ? 'var(--accent-primary)' : 'var(--bg-main)',
            color: statusTab === 'terkirim' ? '#ffffff' : 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: statusTab === 'terkirim' ? '0 2px 5px rgba(2, 132, 199, 0.25)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <CheckCircle2 size={16} />
          <span>Laporan Paraf Terkirim</span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '0.1rem 0.45rem',
              borderRadius: '10px',
              background: statusTab === 'terkirim' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.07)',
              color: statusTab === 'terkirim' ? '#ffffff' : 'inherit'
            }}
          >
            {totalTerkirimCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusTab('menunggu')}
          style={{
            padding: '0.45rem 0.95rem',
            borderRadius: '6px',
            border: 'none',
            fontWeight: 800,
            fontSize: '0.84rem',
            cursor: 'pointer',
            background: statusTab === 'menunggu' ? '#f59e0b' : 'var(--bg-main)',
            color: statusTab === 'menunggu' ? '#ffffff' : 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: statusTab === 'menunggu' ? '0 2px 5px rgba(245, 158, 11, 0.25)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Clock size={16} />
          <span>Menunggu Pengiriman Surveyor</span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '0.1rem 0.45rem',
              borderRadius: '10px',
              background: statusTab === 'menunggu' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.07)',
              color: statusTab === 'menunggu' ? '#ffffff' : 'inherit'
            }}
          >
            {totalMenungguCount}
          </span>
        </button>
      </div>

      {/* COMPACT FILTER & SORTING TOOLBAR */}
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
              placeholder="Cari kapal, surveyor, pemohon, no surat..."
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

          {/* Sortir / Short Dropdown */}
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
              <option value="tgl_desc">📅 Tanggal Mulai (Terbaru)</option>
              <option value="tgl_asc">📅 Tanggal Mulai (Terlama)</option>
              <option value="kapal_asc">🚢 Nama Kapal (A - Z)</option>
              <option value="kapal_desc">🚢 Nama Kapal (Z - A)</option>
              <option value="lokasi_asc">📍 Lokasi Survey (A - Z)</option>
              <option value="lokasi_desc">📍 Lokasi Survey (Z - A)</option>
              <option value="petugas_asc">👤 Surveyor (A - Z)</option>
              <option value="petugas_desc">👤 Surveyor (Z - A)</option>
              <option value="nomor_asc">📄 Nomor Surat (A - Z)</option>
              <option value="nomor_desc">📄 Nomor Surat (Z - A)</option>
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
              Akumulasi Terpilih: <strong style={{ color: '#2563eb' }}>{filteredData.length}</strong> Kapal
            </span>
            <span>•</span>
            <span style={{ fontWeight: 600 }}>{currentPeriodLabel}</span>
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
          </div>

          <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
            Urutan:{' '}
            <span style={{ color: 'var(--accent-primary)' }}>
              {sortBy === 'tgl_desc' && 'Tanggal Terbaru'}
              {sortBy === 'tgl_asc' && 'Tanggal Terlama'}
              {sortBy === 'kapal_asc' && 'Kapal (A-Z)'}
              {sortBy === 'kapal_desc' && 'Kapal (Z-A)'}
              {sortBy === 'lokasi_asc' && 'Lokasi (A-Z)'}
              {sortBy === 'lokasi_desc' && 'Lokasi (Z-A)'}
              {sortBy === 'petugas_asc' && 'Surveyor (A-Z)'}
              {sortBy === 'petugas_desc' && 'Surveyor (Z-A)'}
              {sortBy === 'nomor_asc' && 'No.Surat (A-Z)'}
              {sortBy === 'nomor_desc' && 'No.Surat (Z-A)'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="table-wrapper">
        <table className="data-table" style={{ fontSize: '0.88rem' }}>
          <thead>
            <tr>
              <th style={{ width: '38px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#2563eb' }}
                  checked={filteredData.length > 0 && selectedRowIds.length === filteredData.length}
                  onChange={handleToggleSelectAll}
                  title="Pilih Semua"
                />
              </th>
              <th style={{ width: '45px', textAlign: 'center' }}>NO.</th>
              <th onClick={() => setSortBy(sortBy === 'kapal_asc' ? 'kapal_desc' : 'kapal_asc')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Klik untuk mengurutkan kapal">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ color: sortBy.startsWith('kapal') ? 'var(--accent-primary)' : undefined, fontWeight: sortBy.startsWith('kapal') ? 800 : undefined }}>NAMA KAPAL</span>
                  <ArrowUpDown size={12} color={sortBy.startsWith('kapal') ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                </div>
              </th>
              <th onClick={() => setSortBy(sortBy === 'petugas_asc' ? 'petugas_desc' : 'petugas_asc')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Klik untuk mengurutkan surveyor">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ color: sortBy.startsWith('petugas') ? 'var(--accent-primary)' : undefined, fontWeight: sortBy.startsWith('petugas') ? 800 : undefined }}>SURVEYOR</span>
                  <ArrowUpDown size={12} color={sortBy.startsWith('petugas') ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                </div>
              </th>
              <th style={{ textAlign: 'center' }}>NO HP</th>
              <th>JENIS SURVEY</th>
              <th onClick={() => setSortBy(sortBy === 'tgl_desc' ? 'tgl_asc' : 'tgl_desc')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Klik untuk mengurutkan tanggal">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ color: sortBy.startsWith('tgl') ? 'var(--accent-primary)' : undefined, fontWeight: sortBy.startsWith('tgl') ? 800 : undefined }}>TGL. SURVEY</span>
                  <ArrowUpDown size={12} color={sortBy.startsWith('tgl') ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                </div>
              </th>
              <th onClick={() => setSortBy(sortBy === 'lokasi_asc' ? 'lokasi_desc' : 'lokasi_asc')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Klik untuk mengurutkan lokasi (A - Z / Z - A)">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ color: sortBy.startsWith('lokasi') ? 'var(--accent-primary)' : undefined, fontWeight: sortBy.startsWith('lokasi') ? 800 : undefined }}>LOKASI</span>
                  <ArrowUpDown size={12} color={sortBy.startsWith('lokasi') ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                </div>
              </th>
              <th style={{ textAlign: 'center' }}>RFQ</th>
              <th style={{ textAlign: 'center', width: '160px' }}>AKSI</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={10} className="table-empty" style={{ padding: '2.5rem 1rem' }}>
                  <div className="table-empty-icon" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📑</div>
                  <p style={{ fontWeight: 700 }}>
                    {statusTab === 'terkirim'
                      ? 'Tidak ada data Laporan Paraf Terkirim untuk periode ini.'
                      : 'Tidak ada SPS yang menunggu pengiriman Laporan Paraf dari surveyor.'}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {statusTab === 'terkirim'
                      ? 'SPS yang baru dibuat oleh admin akan berada di tab "Menunggu Pengiriman Surveyor" sebelum dikirim.'
                      : 'Semua penugasan SPS telah dikirim ke Laporan Paraf Terkirim.'}
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
              filteredData.map((item, index) => {
                const isSelected = selectedRowIds.includes(item.id);
                const surveyorPhone = usersList?.find((u) => u.name === item.petugas)?.phone || item.noHp || '-';
                const tglFormatted = formatDateIndo(item.tglMulai || item.tglSelesai);
                const lokasi = (item.tempatSurvey || item.lokasi || item.tujuan || 'PONTIANAK').toUpperCase();
                const jenis = (item.jenisSurvey || item.perihal || '-').toUpperCase();
                const rfq = item.noOrder || item.agenda || '-';

                return (
                  <tr key={item.id || index} style={{ background: isSelected ? 'rgba(37, 99, 235, 0.08)' : undefined, transition: 'background 0.25s ease' }}>
                    <td style={{ textAlign: 'center', width: '38px' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#2563eb' }}
                        checked={isSelected}
                        onChange={(e) => handleToggleSelectRow(item.id, e)}
                        title={`Pilih ${item.namaKapal || 'Item'}`}
                      />
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {index + 1}
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
                        {item.namaKapal || '-'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.petugas || '-'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {surveyorPhone}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {jenis}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {tglFormatted}
                    </td>
                    <td style={{ textTransform: 'uppercase', fontWeight: 600, fontSize: '0.85rem' }}>
                      {lokasi}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.85rem' }}>
                      {rfq}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {/* Tombol Kirim Paraf jika belum terkirim */}
                        {statusTab === 'menunggu' || !item.isParafSent ? (
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{
                              padding: '0.2rem 0.6rem',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              background: '#0284c7',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleKirimParaf(item)}
                            title="Kirim Laporan Paraf (Masuk ke Laporan Paraf Terkirim)"
                          >
                            <Send size={12} />
                            <span>Kirim Paraf</span>
                          </button>
                        ) : (
                          (role === 'admin' || role === 'developer' || role === 'kacab') && (
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{
                                padding: '0.15rem 0.45rem',
                                fontSize: '0.68rem',
                                background: '#ecfdf5',
                                color: '#047857',
                                border: '1px solid #a7f3d0',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                cursor: 'pointer'
                              }}
                              onClick={() => handleBatalkanKirimParaf(item)}
                              title="Laporan Paraf Terkirim (Klik untuk batalkan pengiriman)"
                            >
                              <CheckCheck size={11} />
                              <span>Terkirim</span>
                            </button>
                          )
                        )}

                        {canPrintSps && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              whiteSpace: 'nowrap'
                            }}
                            onClick={() => handlePrintSps(item)}
                            title="Download / Cetak Dokumen SPS"
                          >
                            <Printer size={13} />
                            <span>SPS</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Accumulated / Single Print Modal */}
      <LampiranParafPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        suratTugas={selectedPrintItem}
        allData={selectedRowIds.length > 0 ? filteredData.filter((item) => selectedRowIds.includes(item.id)) : filteredData}
        currentPeriod={currentPeriodLabel}
      />

      <SuratTugasPrintModal
        isOpen={isSpsPrintModalOpen}
        onClose={() => {
          setIsSpsPrintModalOpen(false);
          setSelectedSpsPrintItem(null);
        }}
        suratTugas={selectedSpsPrintItem}
      />

      <SpsModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editItem={editingItem}
      />
    </div>
  );
};
