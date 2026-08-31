import React, { useState, useMemo } from 'react';
import {
  Clock, Plus, Search, Filter, Monitor, Edit2, Trash2, CheckCircle,
  MapPin, Anchor, UserCheck, Calendar, Hourglass, Check, RotateCcw,
  FileSpreadsheet, Printer
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { VisitSurveiModal, calculateEndTime, autoDetectStatus } from './VisitSurveiModal';
import { VisitSurveiPrintModal } from './VisitSurveiPrintModal';
import { formatDateIndo } from '../utils/formatters';
import toast from 'react-hot-toast';

export const VisitSurveiTable = ({ onOpenMonitor }) => {
  const { visitSurvei = [], addVisitSurvei, updateVisitSurvei, deleteVisitSurvei } = useData();
  const { role, currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua'); // 'Semua', 'On Proses', 'Selesai'
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const isSuperUser = role === 'admin' || role === 'kacab' || role === 'kacap' || role === 'developer' || role === 'monitor' || role === 'finance' || role === 'keuangan';

  // Filter berdasarkan Role Pengguna (Kacab & Admin lihat semua, Surveyor lihat miliknya sendiri)
  const roleFilteredData = useMemo(() => {
    if (isSuperUser) return visitSurvei || [];
    if (!currentUser?.name) return visitSurvei || [];
    const surveyorFullName = currentUser.name.toLowerCase().trim();
    const surveyorFirstName = surveyorFullName.split(' ')[0].trim();
    return (visitSurvei || []).filter((v) => {
      const name = (v.nama || '').toLowerCase().trim();
      return name.includes(surveyorFullName) || name.includes(surveyorFirstName) || surveyorFullName.includes(name);
    });
  }, [visitSurvei, isSuperUser, currentUser]);

  const filteredData = useMemo(() => {
    return roleFilteredData.filter((item) => {
      // 1. Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        (item.nama || '').toLowerCase().includes(searchLower) ||
        (item.namaKapal || '').toLowerCase().includes(searchLower) ||
        (item.lokasi || '').toLowerCase().includes(searchLower) ||
        (item.keterangan || '').toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // 2. Status calculation
      const end = item.jamSelesai || calculateEndTime(item.jamBerangkat, item.durasi || 3);
      const computedStatus = item.status === 'Selesai' ? 'Selesai' : autoDetectStatus(item.tanggal, item.jamBerangkat, end);

      if (statusFilter !== 'Semua' && computedStatus !== statusFilter) {
        return false;
      }

      // 3. Date filter
      if (dateFilter === 'today') {
        const itemDate = item.tanggal || todayStr;
        if (itemDate !== todayStr) return false;
      }

      return true;
    });
  }, [roleFilteredData, searchTerm, statusFilter, dateFilter, todayStr]);

  const handleSave = (data) => {
    if (editingItem) {
      updateVisitSurvei(editingItem.id, data);
    } else {
      addVisitSurvei(data);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus catatan visit survei ini?')) {
      deleteVisitSurvei(id);
      toast.success('Catatan visit survei berhasil dihapus');
    }
  };

  const handleMarkSelesai = (item) => {
    updateVisitSurvei(item.id, { status: 'Selesai' });
    toast.success(`Visit survei untuk kapal ${item.namaKapal} ditandai selesai`);
  };

  // Export ke Excel (Format Resmi Buku Agenda Aktivitas Survei)
  const handleExportExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'PT Biro Klasifikasi Indonesia (Persero) Cabang Pontianak';
      wb.created = new Date();

      const ws = wb.addWorksheet('BUKU AGENDA SURVEI', {
        pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true }
      });

      ws.columns = [
        { width: 6 },   // A: NO
        { width: 26 },  // B: SURVEYOR BERTUGAS
        { width: 32 },  // C: NAMA KAPAL
        { width: 22 },  // D: LOKASI SURVEI
        { width: 18 },  // E: TANGGAL VISIT
        { width: 16 },  // F: JAM BERANGKAT
        { width: 16 },  // G: JAM SELESAI
        { width: 34 },  // H: KETERANGAN / LAPORAN
        { width: 16 },  // I: STATUS
      ];

      const HEADER_FILL = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '0F172A' }
      };
      const HEADER_FONT = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      const THIN_BORDER = {
        top: { style: 'thin', color: { argb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
        left: { style: 'thin', color: { argb: 'CBD5E1' } },
        right: { style: 'thin', color: { argb: 'CBD5E1' } }
      };

      // 1. Judul Header
      ws.mergeCells('A1:I1');
      const titleCell = ws.getCell('A1');
      titleCell.value = 'BUKU AGENDA AKTIVITAS SURVEI';
      titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: '0F172A' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 28;

      // Subtitle
      ws.mergeCells('A2:I2');
      const subTitleCell = ws.getCell('A2');
      subTitleCell.value = 'PT. BIRO KLASIFIKASI INDONESIA (PERSERO) CABANG MADYA KLAS PONTIANAK';
      subTitleCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '475569' } };
      subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(2).height = 20;

      ws.addRow([]); // Baris kosong 3

      // Header Tabel Baris 4
      const headerRow = ws.getRow(4);
      headerRow.height = 26;
      const headers = [
        'NO',
        'SURVEYOR BERTUGAS',
        'NAMA KAPAL',
        'LOKASI SURVEI',
        'TANGGAL VISIT',
        'JAM BERANGKAT',
        'JAM SELESAI',
        'KETERANGAN / LAPORAN',
        'STATUS'
      ];

      headers.forEach((h, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = h;
        cell.fill = HEADER_FILL;
        cell.font = HEADER_FONT;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = THIN_BORDER;
      });

      // Data Rows
      filteredData.forEach((item, index) => {
        const end = item.jamSelesai || calculateEndTime(item.jamBerangkat, item.durasi || 3);
        const statusReal = item.status === 'Selesai' ? 'Selesai' : autoDetectStatus(item.tanggal, item.jamBerangkat, end);
        const tglDisplay = item.tanggal ? formatDateIndo(item.tanggal) : '-';

        const row = ws.addRow([
          index + 1,
          item.nama || '-',
          (item.namaKapal || '-').toUpperCase(),
          item.lokasi || '-',
          tglDisplay,
          item.jamBerangkat ? `${item.jamBerangkat} WIB` : '-',
          end ? `${end} WIB` : '-',
          item.keterangan || 'Visit Lapangan',
          statusReal
        ]);

        row.height = 22;
        row.alignment = { vertical: 'middle' };
        row.font = { name: 'Calibri', size: 10 };

        // Rata Tengah untuk Kolom Tertentu
        [1, 4, 5, 6, 7, 9].forEach((colIdx) => {
          row.getCell(colIdx).alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // Tebalkan Nama Surveyor & Kapal
        row.getCell(2).font = { name: 'Calibri', size: 10, bold: true };
        row.getCell(3).font = { name: 'Calibri', size: 10, bold: true };

        // Warna Status
        if (statusReal === 'Selesai') {
          row.getCell(9).font = { name: 'Calibri', size: 10, bold: true, color: { argb: '059669' } };
        } else {
          row.getCell(9).font = { name: 'Calibri', size: 10, bold: true, color: { argb: '0284C7' } };
        }

        // Terapkan Border
        for (let c = 1; c <= 9; c++) {
          row.getCell(c).border = THIN_BORDER;
        }
      });

      // Buat Buffer & Download File
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Buku_Agenda_Aktivitas_Survei_BKI_${todayStr}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);

      toast.success('Buku Agenda Aktivitas Survei berhasil diexport ke Excel (.xlsx)!');
    } catch (err) {
      console.error('Error exporting excel:', err);
      toast.error('Gagal mengekspor data ke Excel');
    }
  };

  const onProsesCount = roleFilteredData.filter((v) => {
    const end = v.jamSelesai || calculateEndTime(v.jamBerangkat, v.durasi || 3);
    return v.status !== 'Selesai' && autoDetectStatus(v.tanggal, v.jamBerangkat, end) === 'On Proses';
  }).length;

  const selesaiCount = roleFilteredData.filter((v) => {
    const end = v.jamSelesai || calculateEndTime(v.jamBerangkat, v.durasi || 3);
    return v.status === 'Selesai' || autoDetectStatus(v.tanggal, v.jamBerangkat, end) === 'Selesai';
  }).length;

  return (
    <div className="card">
      {/* Card Header */}
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div className="card-title-group">
          <div className="card-icon" style={{ background: 'rgba(2, 132, 199, 0.15)', color: '#0284c7' }}>
            <Clock size={22} />
          </div>
          <div>
            <h2 className="card-title">Daftar Visit Survei Lapangan</h2>
            <div className="card-subtitle">
              {isSuperUser
                ? 'Kelola dan pantau seluruh aktivitas kunjungan survei real-time di Layar Monitor'
                : 'Input laporan kunjungan survei lapangan untuk pemantauan real-time Kepala Cabang'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          {/* Tombol Export Excel */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 700,
              color: '#059669',
              borderColor: 'rgba(16, 185, 129, 0.4)'
            }}
            title="Export Buku Agenda Aktivitas Survei ke Excel (.xlsx)"
          >
            <FileSpreadsheet size={16} />
            <span>Export Excel</span>
          </button>

          {/* Tombol Cetak / PDF */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsPrintModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 700,
              color: '#0284c7',
              borderColor: 'rgba(56, 189, 248, 0.4)'
            }}
            title="Cetak Buku Agenda Aktivitas Survei Format PDF A4 Landscape"
          >
            <Printer size={16} />
            <span>Cetak / PDF</span>
          </button>

          {isSuperUser && onOpenMonitor && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onOpenMonitor}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 700,
                color: '#6366f1',
                borderColor: 'rgba(99, 102, 241, 0.4)'
              }}
              title="Buka tampilan Layar Monitor TV penuh (Khusus Kepala Cabang & Admin)"
            >
              <Monitor size={16} />
              <span>Buka Layar Monitor</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
            }}
          >
            <Plus size={16} />
            <span>Catat Visit Survei Baru</span>
          </button>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div
        style={{
          background: 'var(--bg-main)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        {/* Search */}
        <div className="search-box" style={{ flex: '1 1 260px', maxWidth: '400px' }}>
          <Search className="search-icon" size={15} />
          <input
            type="text"
            className="form-input"
            placeholder="Cari nama surveyor, kapal, lokasi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.2rem', height: '36px' }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${statusFilter === 'Semua' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter('Semua')}
            style={{ fontSize: '0.78rem', fontWeight: 700 }}
          >
            Semua ({visitSurvei.length})
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setStatusFilter('On Proses')}
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              background: statusFilter === 'On Proses' ? '#0284c7' : 'var(--bg-card)',
              color: statusFilter === 'On Proses' ? '#ffffff' : '#0284c7',
              border: '1px solid #0284c7'
            }}
          >
            🔵 On Proses ({onProsesCount})
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setStatusFilter('Selesai')}
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              background: statusFilter === 'Selesai' ? '#059669' : 'var(--bg-card)',
              color: statusFilter === 'Selesai' ? '#ffffff' : '#059669',
              border: '1px solid #059669'
            }}
          >
            🟢 Selesai ({selesaiCount})
          </button>

          <div style={{ width: 1, height: 24, background: 'var(--border-color)', margin: '0 0.25rem' }} />

          <button
            type="button"
            className={`btn btn-sm ${dateFilter === 'today' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')}
            style={{ fontSize: '0.78rem', fontWeight: 600 }}
          >
            📅 {dateFilter === 'today' ? 'Hari Ini Saja' : 'Semua Tanggal'}
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="table-wrapper" style={{ marginTop: '0.75rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
        <table className="data-table" style={{ borderCollapse: 'collapse', width: '100%', minWidth: '950px' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ width: '45px', textAlign: 'center', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>NO</th>
              <th style={{ textAlign: 'left', fontWeight: 800, color: 'var(--text-primary)', minWidth: '180px', whiteSpace: 'nowrap' }}>SURVEYOR BERTUGAS</th>
              <th style={{ textAlign: 'left', fontWeight: 800, color: 'var(--text-primary)', minWidth: '180px', whiteSpace: 'nowrap' }}>NAMA KAPAL</th>
              <th style={{ textAlign: 'center', fontWeight: 800, color: 'var(--text-primary)', minWidth: '130px', whiteSpace: 'nowrap' }}>LOKASI SURVEI</th>
              <th style={{ textAlign: 'center', fontWeight: 800, color: 'var(--text-primary)', minWidth: '130px', whiteSpace: 'nowrap' }}>TANGGAL</th>
              <th style={{ textAlign: 'center', fontWeight: 800, color: 'var(--text-primary)', minWidth: '140px', whiteSpace: 'nowrap' }}>WAKTU VISIT</th>
              <th style={{ textAlign: 'left', fontWeight: 800, color: 'var(--text-primary)', minWidth: '160px', whiteSpace: 'nowrap' }}>KETERANGAN</th>
              <th style={{ textAlign: 'center', fontWeight: 800, color: 'var(--text-primary)', minWidth: '110px', whiteSpace: 'nowrap' }}>STATUS</th>
              <th style={{ textAlign: 'center', width: '110px', minWidth: '110px', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>AKSI</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={9} className="table-empty">
                  <div className="table-empty-icon">🕒</div>
                  <p>Tidak ada data visit survei yang sesuai dengan filter.</p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setEditingItem(null);
                      setIsModalOpen(true);
                    }}
                    style={{ marginTop: '0.5rem' }}
                  >
                    + Tambah Visit Survei
                  </button>
                </td>
              </tr>
            ) : (
              filteredData.map((item, idx) => {
                const end = item.jamSelesai || calculateEndTime(item.jamBerangkat, item.durasi || 3);
                const computedStatus = item.status === 'Selesai' ? 'Selesai' : autoDetectStatus(item.tanggal, item.jamBerangkat, end);
                const isOnProses = computedStatus === 'On Proses';
                const tglDisplay = item.tanggal ? formatDateIndo(item.tanggal) : formatDateIndo(todayStr);

                return (
                  <tr key={item.id} style={{ height: '42px' }}>
                    {/* 1. NO */}
                    <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {idx + 1}
                    </td>

                    {/* 2. SURVEYOR BERTUGAS */}
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {item.nama}
                      </span>
                    </td>

                    {/* 3. NAMA KAPAL */}
                    <td>
                      <span style={{ textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {item.namaKapal}
                      </span>
                    </td>

                    {/* 4. LOKASI SURVEI */}
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-secondary)' }}>
                        {item.lokasi || 'PONTIANAK'}
                      </span>
                    </td>

                    {/* 5. TANGGAL */}
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {tglDisplay}
                      </span>
                    </td>

                    {/* 6. WAKTU VISIT */}
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                        {item.jamBerangkat || '08:00'} - {end || '17:00'} WIB
                      </span>
                    </td>

                    {/* 7. KETERANGAN */}
                    <td>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {item.keterangan || 'Visit Lapangan'}
                      </span>
                    </td>

                    {/* 8. STATUS */}
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          color: isOnProses ? '#0284c7' : '#059669'
                        }}
                      >
                        {isOnProses ? 'On Proses' : 'Selesai'}
                      </span>
                    </td>

                    {/* 9. AKSI */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem' }}>
                        {isOnProses && (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => handleMarkSelesai(item)}
                            title="Tandai visit selesai sekarang"
                            style={{
                              background: '#ecfdf5',
                              color: '#047857',
                              border: '1px solid #a7f3d0',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.45rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem'
                            }}
                          >
                            <Check size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon btn-sm"
                          onClick={() => {
                            setEditingItem(item);
                            setIsModalOpen(true);
                          }}
                          title="Edit Catatan Visit"
                          style={{ padding: '0.25rem 0.45rem' }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-icon btn-sm"
                          onClick={() => handleDelete(item.id)}
                          title="Hapus Catatan Visit"
                          style={{ padding: '0.25rem 0.45rem' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Edit / Tambah Visit */}
      <VisitSurveiModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        initialData={editingItem}
        isEdit={!!editingItem}
        onSave={handleSave}
      />

      {/* Modal Cetak PDF Buku Agenda Aktivitas Survei */}
      <VisitSurveiPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        data={filteredData}
        title="BUKU AGENDA AKTIVITAS SURVEI"
      />
    </div>
  );
};
