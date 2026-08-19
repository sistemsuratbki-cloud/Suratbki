import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Printer,
  Calendar,
  RotateCcw,
  User,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo, cleanDocNumber, formatRupiah } from '../utils/formatters';
import { BukuAgendaPrintModal } from './BukuAgendaPrintModal';

export const BukuAgendaTable = () => {
  const { suratTugas, gradeTariffs, adminSettings } = useData();
  const { role, usersList } = useAuth();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [surveyorFilter, setSurveyorFilter] = useState('Semua');
  const [selectedMonth, setSelectedMonth] = useState('Semua');
  const [selectedYear, setSelectedYear] = useState('Semua');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('nomor_asc'); // nomor_asc, nomor_desc, tgl_desc, tgl_asc, kapal_asc, surveyor_asc
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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
    return usersList?.filter(u => u.role === 'surveyor' || u.role === 'admin' || u.role === 'developer' || u.role === 'kacab') || [];
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

    const isLuarKota = (item.kategoriPerjalanan || 'Luar Kota') === 'Luar Kota';
    const start = new Date(item.tglMulai);
    const end = new Date(item.tglSelesai);
    const timeDiff = end.getTime() - start.getTime();
    let hr = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    if (hr < 1 || isNaN(hr)) hr = 1;
    let mlm = Math.max(0, hr - 1);

    let hrLbr = Number(item.jumlahHariLibur) || 0;
    if (!item.jumlahHariLibur && !isNaN(start) && !isNaN(end)) {
      let cur = new Date(start);
      let countLibur = 0;
      while (cur <= end) {
        const day = cur.getDay();
        if (day === 0 || day === 6) countLibur++;
        cur.setDate(cur.getDate() + 1);
      }
      hrLbr = countLibur;
    }

    const surveyor = usersList?.find(u => u.name === item.petugas) || {};
    const surveyorGrade = item.pangkat || surveyor.grade || 'GRADE 6 A';
    const gradeData = (gradeTariffs || []).find(
      (g) => (g.grade || '').replace(/\s+/g, '').toUpperCase() === surveyorGrade.replace(/\s+/g, '').toUpperCase()
    ) || {};

    let sisaHariUangHarian = hr;
    if (item.tanpaUangHarian) {
      const deduct = item.hariTanpaUangHarian !== undefined ? Number(item.hariTanpaUangHarian) : hr;
      const validDeduct = Math.max(0, Math.min(deduct, hr));
      sisaHariUangHarian = hr - validDeduct;
    }

    const uangHarianRate = (item.tanpaUangHarian && sisaHariUangHarian === 0) ? 0 : (Number(item.uangHarian) || Number(gradeData.uangHarian) || 300000);
    const uangHarianTotal = uangHarianRate * sisaHariUangHarian;
    const uangHotelRate = Number(item.tiketHotel) || 0;
    const uangHotelTotal = uangHotelRate * mlm;
    const hrLbrTotal = (item.tanpaUangHarian && sisaHariUangHarian === 0) ? 0 : (hrLbr * uangHarianRate * 0.5);
    const tiketPesawatTaxi = Number(item.tiketPesawatTaxi) || Number(item.biayaTiket) || 0;
    const biayaTAT = item.tanpaTAT ? 0 : (Number(item.biayaTAT) || (isLuarKota ? Number(adminSettings?.tatLuarKota || 750000) : 0));
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
    selectedMonth !== 'Semua' ||
    selectedYear !== 'Semua' ||
    startDate !== '' ||
    endDate !== '' ||
    sortBy !== 'nomor_asc';

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
      // Surveyor filter
      if (surveyorFilter !== 'Semua' && item.petugas !== surveyorFilter) {
        return false;
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
      const matchesSearch =
        !searchTerm ||
        (item.nomor || '').toLowerCase().includes(searchLower) ||
        (item.namaKapal || '').toLowerCase().includes(searchLower) ||
        (item.lokasi || item.tempatSurvey || '').toLowerCase().includes(searchLower) ||
        (item.petugas || '').toLowerCase().includes(searchLower) ||
        (item.agenda || '').toLowerCase().includes(searchLower) ||
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
  }, [suratTugas, surveyorFilter, selectedMonth, selectedYear, startDate, endDate, searchTerm, sortBy]);

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
      { width: 18 },  // B: NOMOR SURAT
      { width: 28 },  // C: OBJEK/SURVEY
      { width: 20 },  // D: LOKASI SURVEY
      { width: 15 },  // E: TANGGAL PENGUASAAN - MULAI
      { width: 15 },  // F: TANGGAL PENGUASAAN - SELESAI
      { width: 18 },  // G: BIAYA
      { width: 20 },  // H: SURVEYOR
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
    ws.mergeCells('A1:H1');
    const titleCell = ws.getCell('A1');
    titleCell.value = 'BUKU AGENDA';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: '1E3A8A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 30;

    // Header Row 3 & 4
    ws.mergeCells('A3:A4');
    ws.getCell('A3').value = 'NO';

    ws.mergeCells('B3:B4');
    ws.getCell('B3').value = 'NOMOR SURAT';

    ws.mergeCells('C3:C4');
    ws.getCell('C3').value = 'OBJEK/SURVEY';

    ws.mergeCells('D3:D4');
    ws.getCell('D3').value = 'LOKASI SURVEY';

    ws.mergeCells('E3:F3');
    ws.getCell('E3').value = 'TANGGAL PENGUASAAN';

    ws.getCell('E4').value = 'MULAI';
    ws.getCell('F4').value = 'SELESAI';

    ws.mergeCells('G3:G4');
    ws.getCell('G3').value = 'BIAYA';

    ws.mergeCells('H3:H4');
    ws.getCell('H3').value = 'SURVEYOR';

    // Apply header styles
    ['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3', 'H3', 'A4', 'B4', 'C4', 'D4', 'E4', 'F4', 'G4', 'H4'].forEach(pos => {
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

      const row = ws.getRow(rowNum);
      row.values = [
        idx + 1,
        cleanDocNumber(item.nomor) || '-',
        item.namaKapal || '-',
        lokasi,
        tglMulai,
        tglSelesai,
        biaya,
        item.petugas || '-'
      ];

      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(7).numFmt = '#,##0';
      row.getCell(8).alignment = { horizontal: 'left', vertical: 'middle' };

      for (let c = 1; c <= 8; c++) {
        row.getCell(c).border = THIN_BORDER;
        row.getCell(c).font = { name: 'Calibri', size: 10 };
      }
      row.height = 20;
    });

    // Total Row
    const totalRowNum = filteredData.length + 5;
    ws.mergeCells(`A${totalRowNum}:F${totalRowNum}`);
    const totLabel = ws.getCell(`A${totalRowNum}`);
    totLabel.value = 'TOTAL BIAYA';
    totLabel.font = { name: 'Calibri', size: 10, bold: true };
    totLabel.alignment = { horizontal: 'center', vertical: 'middle' };

    const totBiaya = ws.getCell(`G${totalRowNum}`);
    totBiaya.value = totalBiayaAkumulasi;
    totBiaya.font = { name: 'Calibri', size: 10, bold: true };
    totBiaya.numFmt = '#,##0';
    totBiaya.alignment = { horizontal: 'right', vertical: 'middle' };

    for (let c = 1; c <= 8; c++) {
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
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.8fr) minmax(180px, 1.2fr) minmax(140px, 1fr) minmax(120px, 1fr)', gap: '0.75rem', alignItems: 'center' }}>
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
                <td colSpan={8} className="table-empty" style={{ padding: '2.5rem 1rem' }}>
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

                return (
                  <tr key={item.id || index}>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {index + 1}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>
                      {cleanDocNumber(item.nomor) || '-'}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.namaKapal || '-'}
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
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Print PDF Preview Modal */}
      <BukuAgendaPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        data={filteredData}
        currentPeriod={currentPeriodLabel}
      />
    </div>
  );
};
