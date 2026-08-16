import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, ClipboardList, Anchor, User, Calendar, Printer, FileSpreadsheet, Lock, Unlock, Clock, Paperclip, Filter, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
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

  /* Native Excel (.xlsx) Export using SheetJS */
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredData.length > 0 ? filteredData : laporanSurvei;

      if (dataToExport.length === 0) {
        alert('Belum ada data laporan perjalanan dinas survey untuk diekspor ke Excel!');
        return;
      }

      // Structure rows for sheet
      const wsData = [
        ['DAFTAR PERJALANAN DINAS SURVEY'],
        ['CABANG MADYA KLAS PONTIANAK'],
        [currentMonthLabel],
        [], // empty line
        [
          'NO.',
          'TANGGAL',
          'NAMA KAPAL',
          'LOKASI SURVEY',
          'NILAI',
          'NAMA SURVEY',
          'NO AGENDA',
          'NO CDA',
          'NO.SO',
          'NO.WBS'
        ]
      ];

      let sumNilai = 0;

      dataToExport.forEach((item, index) => {
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

        sumNilai += nilaiNum;

        wsData.push([
          index + 1,
          dateFormatted,
          vesselName,
          lokasi,
          nilaiNum,
          namaSurvey,
          noAgenda,
          noCda,
          noSo,
          noWbs
        ]);
      });

      // Add Total row
      wsData.push(['TOTAL', '', '', '', sumNilai, '', '', '', '', '']);

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Auto column widths
      ws['!cols'] = [
        { wch: 6 },  // NO.
        { wch: 16 }, // TANGGAL
        { wch: 25 }, // NAMA KAPAL
        { wch: 20 }, // LOKASI SURVEY
        { wch: 18 }, // NILAI
        { wch: 26 }, // NAMA SURVEY
        { wch: 24 }, // NO AGENDA
        { wch: 18 }, // NO CDA
        { wch: 18 }, // NO.SO
        { wch: 18 }  // NO.WBS
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Laporan Perjalanan Dinas');

      const fileName = `Daftar_Perjalanan_Dinas_Survey_BKI_${selectedMonth}_${selectedYear}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Export Excel Error:', err);
      alert('Gagal mengekspor Excel: ' + err.message);
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

        <div className="card-actions" style={{ flexWrap: 'wrap' }}>
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

          {/* Export Excel (Native XLSX) */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportExcel}
            title="Download Format Excel Resmi (.xlsx)"
            style={{ borderColor: '#10b981', color: '#10b981', fontWeight: 700 }}
          >
            <FileSpreadsheet size={15} color="#10b981" />
            <span>Export Excel (.xlsx)</span>
          </button>

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
        confirmLabel="Hapus Data"
        cancelLabel="Batal"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
};
