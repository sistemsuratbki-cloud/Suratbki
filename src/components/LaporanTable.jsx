import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, ClipboardList, Anchor, User, Calendar, Printer, FileSpreadsheet, Lock, Unlock, Clock, Paperclip, Filter, CheckCircle2, Download, FileText, ChevronDown } from 'lucide-react';
import ExcelJS from 'exceljs';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo, getStatusBadgeClass, isEditWindowExpired, formatRupiah, cleanDocNumber } from '../utils/formatters';
import { LaporanModal } from './LaporanModal';
import { LaporanPrintModal } from './LaporanPrintModal';
import { ConfirmModal } from './ConfirmModal';

export const LaporanTable = () => {
  const { laporanSurvei, suratTugas, updateLaporanSurvei, deleteLaporanSurvei, requestEditApproval, approveEditRequest } = useData();
  const { role } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('Semua');
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPrintItem, setSelectedPrintItem] = useState(null);
  const [isPrintAllMode, setIsPrintAllMode] = useState(false);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [showExportMenu, setShowExportMenu] = useState(false);

  const canAddLaporan = role === 'admin' || role === 'surveyor' || role === 'kacab';
  const canEditLaporan = role === 'admin' || role === 'surveyor' || role === 'kacab';
  const canDelete = role === 'admin';

  const monthNames = [
    { value: '01', label: 'JANUARI' },
    { value: '02', label: 'FEBRUARI' },
    { value: '03', label: 'MARET' },
    { value: '04', label: 'APRIL' },
    { value: '05', label: 'MEI' },
    { value: '06', label: 'JUNI' },
    { value: '07', label: 'JULI' },
    { value: '08', label: 'AGUSTUS' },
    { value: '09', label: 'SEPTEMBER' },
    { value: '10', label: 'OKTOBER' },
    { value: '11', label: 'NOVEMBER' },
    { value: '12', label: 'DESEMBER' }
  ];

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
      deleteLaporanSurvei(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  const currentMonthLabel = selectedMonth === 'Semua'
    ? `TAHUN ${selectedYear}`
    : `BULAN ${monthNames.find(m => m.value === selectedMonth)?.label || 'MEI'} ${selectedYear}`;

  // Filter Data
  const filteredData = laporanSurvei.filter((item) => {
    const linkedSurat = suratTugas.find((s) => s.id === item.suratId);
    const dateStr = item.tglLapor || item.tanggal || linkedSurat?.tglMulai || '';

    // Month & Year Filter
    if (selectedMonth !== 'Semua') {
      if (dateStr) {
        const itemMonth = dateStr.substring(5, 7);
        if (itemMonth !== selectedMonth) return false;
      }
    }
    if (selectedYear !== 'Semua') {
      if (dateStr) {
        const itemYear = dateStr.substring(0, 4);
        if (itemYear !== selectedYear) return false;
      }
    }

    const namaKapal = item.namaKapal || (linkedSurat ? linkedSurat.namaKapal : '');
    const noAgenda = cleanDocNumber(item.noAgenda || item.nomor || (linkedSurat ? linkedSurat.nomor : ''));
    const namaSurvey = item.namaSurvey || item.jenisSurvey || (linkedSurat ? linkedSurat.jenisSurvey : '');
    const lokasi = item.lokasi || item.lokasiSurvey || (linkedSurat ? linkedSurat.lokasi : '');

    const matchesSearch =
      (item.petugas || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      namaKapal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      noAgenda.toLowerCase().includes(searchTerm.toLowerCase()) ||
      namaSurvey.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lokasi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.noSo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.noCda || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.noWbs || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  /* Total Nilai Calculation */
  const totalNilaiPerjalanan = filteredData.reduce((acc, curr) => {
    const val = Number(curr.nilai) || Number(curr.tarifDasar) || 0;
    return acc + val;
  }, 0);

  /* Helper to prepare export rows */
  const getPreparedRows = () => {
    const dataToExport = filteredData.length > 0 ? filteredData : laporanSurvei;
    return dataToExport.map((item, index) => {
      const linkedSurat = suratTugas.find((s) => s.id === item.suratId);
      const dateVal = item.tglLapor || item.tanggal || linkedSurat?.tglMulai || '';
      const dateFormatted = dateVal ? formatDateIndo(dateVal) : '-';
      const vesselName = (item.namaKapal || (linkedSurat ? linkedSurat.namaKapal : '-')).toUpperCase();
      const lokasi = item.lokasi || item.lokasiSurvey || (linkedSurat ? linkedSurat.lokasi : '-');
      const nilaiNum = Number(item.nilai) || Number(item.tarifDasar) || (linkedSurat ? linkedSurat.jumlahEstimasi : 0);
      const namaSurvey = (item.namaSurvey || item.jenisSurvey || (linkedSurat ? linkedSurat.jenisSurvey : 'DINAS SURVEY KLAS')).toUpperCase();
      const noAgenda = cleanDocNumber(item.noAgenda || (linkedSurat ? linkedSurat.nomor : '-'));
      const noCda = item.noCda || '-';
      const noSo = item.noSo || (linkedSurat ? linkedSurat.noOrder : '-');
      const noWbs = item.noWbs || '-';

      return {
        no: index + 1,
        tanggal: dateFormatted,
        namaKapal: vesselName,
        lokasi,
        nilai: nilaiNum,
        namaSurvey,
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

    // ── Column widths ──
    ws.columns = [
      { width: 6 },   // A: NO
      { width: 16 },  // B: TANGGAL
      { width: 26 },  // C: NAMA KAPAL
      { width: 22 },  // D: LOKASI SURVEY
      { width: 20 },  // E: NILAI
      { width: 28 },  // F: NAMA SURVEY
      { width: 26 },  // G: NO AGENDA
      { width: 18 },  // H: NO CDA
      { width: 20 },  // I: NO.SO
      { width: 22 },  // J: NO.WBS
    ];

    // ── Color palette ──
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

    // ── Row 1: Title ──
    const titleRow = ws.addRow(['DAFTAR PERJALANAN DINAS SURVEY']);
    ws.mergeCells('A1:J1');
    titleRow.height = 32;
    titleRow.getCell(1).font = { name: 'Calibri', size: 16, bold: true, color: { argb: WHITE } };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE } };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // ── Row 2: Subtitle ──
    const subtitleRow = ws.addRow(['CABANG MADYA KLAS PONTIANAK']);
    ws.mergeCells('A2:J2');
    subtitleRow.height = 24;
    subtitleRow.getCell(1).font = { name: 'Calibri', size: 12, bold: true, color: { argb: WHITE } };
    subtitleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MEDIUM_BLUE } };
    subtitleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // ── Row 3: Period ──
    const periodRow = ws.addRow([currentMonthLabel]);
    ws.mergeCells('A3:J3');
    periodRow.height = 22;
    periodRow.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: DARK_BLUE } };
    periodRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };
    periodRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // ── Row 4: Empty spacer ──
    ws.addRow([]);

    // ── Row 5: Header ──
    const headers = ['NO.', 'TANGGAL', 'NAMA KAPAL', 'LOKASI SURVEY', 'NILAI (Rp)', 'NAMA SURVEY', 'NO AGENDA', 'NO CDA', 'NO.SO', 'NO.WBS'];
    const headerRow = ws.addRow(headers);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'medium', color: { argb: DARK_BLUE } },
        left: { style: 'thin', color: { argb: WHITE } },
        bottom: { style: 'medium', color: { argb: GOLD } },
        right: { style: 'thin', color: { argb: WHITE } }
      };
    });

    // ── Data rows ──
    let sumNilai = 0;
    rows.forEach((r, idx) => {
      sumNilai += r.nilai;
      const dataRow = ws.addRow([
        r.no, r.tanggal, r.namaKapal, r.lokasi, r.nilai,
        r.namaSurvey, r.noAgenda, r.noCda, r.noSo, r.noWbs
      ]);
      dataRow.height = 22;

      const isEven = idx % 2 === 0;
      const bgColor = isEven ? LIGHT_BLUE : WHITE;

      dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 10, color: { argb: DARK_TEXT } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.border = thinBorder;

        if (colNumber === 1) {
          // NO — center
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 5) {
          // NILAI — right aligned, currency format
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        }
      });
    });

    // ── TOTAL row ──
    const totalRow = ws.addRow(['TOTAL', '', '', '', sumNilai, '', '', '', '', '']);
    totalRow.height = 26;
    ws.mergeCells(`A${totalRow.number}:D${totalRow.number}`);
    totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: DARK_BLUE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD_LIGHT } };
      cell.border = {
        top: { style: 'medium', color: { argb: GOLD } },
        left: { style: 'thin', color: { argb: BORDER_COLOR } },
        bottom: { style: 'medium', color: { argb: DARK_BLUE } },
        right: { style: 'thin', color: { argb: BORDER_COLOR } }
      };
      if (colNumber === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNumber === 5) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });

    // ── Footer info ──
    const footerRowNum = totalRow.number + 2;
    const footerRow = ws.getRow(footerRowNum);
    footerRow.getCell(1).value = `Diekspor pada: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    ws.mergeCells(`A${footerRowNum}:E${footerRowNum}`);
    footerRow.getCell(1).font = { name: 'Calibri', size: 9, italic: true, color: { argb: '888888' } };

    return { wb, count: rows.length };
  };

  /* Helper: Save ExcelJS workbook with native Save As dialog */
  const saveExcelWithPicker = async (wb, fileName) => {
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // Try File System Access API (opens native OS "Save As" dialog)
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'Excel Spreadsheet',
            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('showSaveFilePicker failed, trying fallback:', err);
      }
    }

    // Fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  /* 1. XLSX Export (styled) */
  const handleExportXLSX = async () => {
    setShowExportMenu(false);
    try {
      const { wb, count } = await createStyledWorkbook();
      if (count === 0) {
        alert('Belum ada data laporan perjalanan dinas survey untuk diekspor!');
        return;
      }

      const monthLabelSlug = selectedMonth === 'Semua' ? 'Semua_Bulan' : `Bulan_${selectedMonth}`;
      const fileName = `Daftar_Perjalanan_Dinas_Survey_BKI_${monthLabelSlug}_${selectedYear}.xlsx`;

      await saveExcelWithPicker(wb, fileName);
    } catch (err) {
      console.error('Export XLSX Error:', err);
      alert('Gagal mengekspor file Excel: ' + err.message);
    }
  };

  /* 2. XLS Export — same styled format as XLSX */
  const handleExportXLS = async () => {
    setShowExportMenu(false);
    try {
      const { wb, count } = await createStyledWorkbook();
      if (count === 0) {
        alert('Belum ada data laporan perjalanan dinas survey untuk diekspor!');
        return;
      }

      const monthLabelSlug = selectedMonth === 'Semua' ? 'Semua_Bulan' : `Bulan_${selectedMonth}`;
      const fileName = `Daftar_Perjalanan_Dinas_Survey_BKI_${monthLabelSlug}_${selectedYear}.xlsx`;

      await saveExcelWithPicker(wb, fileName);
    } catch (err) {
      console.error('Export XLS Error:', err);
      alert('Gagal mengekspor file XLS: ' + err.message);
    }
  };

  /* 3. CSV Export */
  const handleExportCSV = async () => {
    setShowExportMenu(false);
    try {
      const rows = getPreparedRows();
      if (rows.length === 0) {
        alert('Belum ada data laporan perjalanan dinas survey untuk diekspor!');
        return;
      }

      let csvContent = '\uFEFF'; // UTF-8 BOM for Excel
      csvContent += `"DAFTAR PERJALANAN DINAS SURVEY"\n`;
      csvContent += `"CABANG MADYA KLAS PONTIANAK"\n`;
      csvContent += `"${currentMonthLabel}"\n\n`;
      csvContent += `"NO.";"TANGGAL";"NAMA KAPAL";"LOKASI SURVEY";"NILAI";"NAMA SURVEY";"NO AGENDA";"NO CDA";"NO.SO";"NO.WBS"\n`;

      let sumNilai = 0;
      rows.forEach((r) => {
        sumNilai += r.nilai;
        csvContent += `"${r.no}";"${r.tanggal}";"${r.namaKapal}";"${r.lokasi}";"${r.nilai}";"${r.namaSurvey}";"${r.noAgenda}";"${r.noCda}";"${r.noSo}";"${r.noWbs}"\n`;
      });
      csvContent += `"TOTAL";"";"";"";"${sumNilai}";"";"";"";"";""\n`;

      const monthLabelSlug = selectedMonth === 'Semua' ? 'Semua_Bulan' : `Bulan_${selectedMonth}`;
      const fileName = `Daftar_Perjalanan_Dinas_Survey_BKI_${monthLabelSlug}_${selectedYear}.csv`;

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{ description: 'CSV File', accept: { 'text/csv': ['.csv'] } }]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
    } catch (err) {
      console.error('Export CSV Error:', err);
      alert('Gagal mengekspor CSV: ' + err.message);
    }
  };

  return (
    <div className="card-section">
      {/* Title & Filter Header */}
      <div className="card-header" style={{ alignItems: 'flex-start' }}>
        <div className="card-title-group">
          <ClipboardList size={24} color="var(--accent-primary)" />
          <div>
            <h2 className="card-title" style={{ fontSize: '1.25rem', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              DAFTAR PERJALANAN DINAS SURVEY
            </h2>
            <div className="card-subtitle" style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
              CABANG MADYA KLAS PONTIANAK — {currentMonthLabel}
            </div>
          </div>
        </div>

        <div className="card-actions" style={{ flexWrap: 'wrap', position: 'relative' }}>
          {/* Search Box */}
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Cari kapal, lokasi, nomor SO/WBS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Month Selector */}
          <select
            className="form-select"
            style={{ width: 'auto', fontWeight: 600 }}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="Semua">Semua Bulan</option>
            {monthNames.map((m) => (
              <option key={m.value} value={m.value}>
                Bulan {m.label}
              </option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            className="form-select"
            style={{ width: 'auto', fontWeight: 600 }}
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>

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
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
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
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
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
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
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

      {/* ====== 10 KOLOM TABEL RESMI ====== */}
      <div className="table-wrapper">
        <table className="data-table" style={{ fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ textAlign: 'center' }}>
              <th style={{ width: '45px', textAlign: 'center' }}>NO.</th>
              <th style={{ width: '100px', textAlign: 'center' }}>TANGGAL</th>
              <th style={{ minWidth: '160px', textAlign: 'left' }}>NAMA KAPAL</th>
              <th style={{ minWidth: '130px', textAlign: 'left' }}>LOKASI SURVEY</th>
              <th style={{ minWidth: '110px', textAlign: 'right' }}>NILAI</th>
              <th style={{ minWidth: '160px', textAlign: 'left' }}>NAMA SURVEY</th>
              <th style={{ minWidth: '140px', textAlign: 'left' }}>NO AGENDA</th>
              <th style={{ minWidth: '110px', textAlign: 'left' }}>NO CDA</th>
              <th style={{ minWidth: '110px', textAlign: 'left' }}>NO.SO</th>
              <th style={{ minWidth: '110px', textAlign: 'left' }}>NO.WBS</th>
              <th style={{ width: '100px', textAlign: 'center' }}>AKSI</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="11" className="table-empty" style={{ padding: '2.5rem 1rem' }}>
                  <Anchor size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <p style={{ fontWeight: 700 }}>Tidak ada data perjalanan dinas survey untuk periode ini.</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Data otomatis masuk ketika form pengisian survei disimpan, atau klik tombol "Tambah Data".</p>
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => {
                const linkedSurat = suratTugas.find((s) => s.id === item.suratId);
                const dateVal = item.tglLapor || item.tanggal || linkedSurat?.tglMulai;
                const vesselName = item.namaKapal || (linkedSurat ? linkedSurat.namaKapal : '-');
                const lokasi = item.lokasi || item.lokasiSurvey || (linkedSurat ? linkedSurat.lokasi : '-');
                const nilaiNum = Number(item.nilai) || Number(item.tarifDasar) || (linkedSurat ? linkedSurat.jumlahEstimasi : 0);
                const namaSurvey = item.namaSurvey || item.jenisSurvey || (linkedSurat ? linkedSurat.jenisSurvey : 'DINAS SURVEY KLAS');
                const noAgenda = cleanDocNumber(item.noAgenda || (linkedSurat ? linkedSurat.nomor : '-'));
                const noCda = item.noCda || '-';
                const noSo = item.noSo || (linkedSurat ? linkedSurat.noOrder : '-');
                const noWbs = item.noWbs || '-';

                return (
                  <tr key={item.id}>
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
                      {item.petugas && (
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          Surveyor: {item.petugas}
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
                      <div style={{ fontWeight: 600, textTransform: 'uppercase' }}>{namaSurvey}</div>
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
                        <button
                          className="btn btn-secondary btn-icon btn-sm"
                          onClick={() => handleOpenPrintSingle(item)}
                          title="Cetak Lembar Laporan"
                        >
                          <Printer size={14} />
                        </button>

                        {canEditLaporan && (
                          <button
                            className="btn btn-secondary btn-icon btn-sm"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Data"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            className="btn btn-danger btn-icon btn-sm"
                            onClick={() => promptDelete(item)}
                            title="Hapus Data"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredData.length > 0 && (
            <tfoot>
              <tr style={{ background: 'var(--bg-main)', fontWeight: 800 }}>
                <td colSpan="4" style={{ textAlign: 'right', padding: '0.75rem 1rem' }}>
                  TOTAL NILAI PERJALANAN DINAS ({filteredData.length} Kegiatan):
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
        allData={filteredData}
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
    </div>
  );
};
