import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, ClipboardList, Check, Anchor, User, Calendar, Printer, FileSpreadsheet, Lock, Unlock, Clock } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo, getStatusBadgeClass, isEditWindowExpired } from '../utils/formatters';
import { LaporanModal } from './LaporanModal';
import { LaporanPrintModal } from './LaporanPrintModal';
import { SuratTugasPrintModal } from './SuratTugasPrintModal';
import { ConfirmModal } from './ConfirmModal';

export const LaporanTable = () => {
  const { laporanSurvei, suratTugas, updateLaporanSurvei, deleteLaporanSurvei, requestEditApproval, approveEditRequest } = useData();
  const { role } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPrintItem, setSelectedPrintItem] = useState(null);

  const [isSuratPrintModalOpen, setIsSuratPrintModalOpen] = useState(false);
  const [selectedSuratPrintItem, setSelectedSuratPrintItem] = useState(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [itemToRequest, setItemToRequest] = useState(null);

  const canAddLaporan = role === 'admin' || role === 'surveyor' || role === 'kacab';
  const canEditLaporan = role === 'admin' || role === 'surveyor' || role === 'kacab';
  const canApprove = role === 'admin' || role === 'kacab';
  const canDelete = role === 'admin';

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handlePromptRequestEdit = (item) => {
    setItemToRequest(item);
    setIsRequestModalOpen(true);
  };

  const handleConfirmRequestEdit = () => {
    if (itemToRequest) {
      requestEditApproval(itemToRequest.id);
      setItemToRequest(null);
      setIsRequestModalOpen(false);
    }
  };

  const handleOpenPrint = (item) => {
    setSelectedPrintItem(item);
    setIsPrintModalOpen(true);
  };

  const handleApprove = (item) => {
    if (!canApprove) return;
    updateLaporanSurvei(item.id, {
      ...item,
      status: 'Disetujui'
    });
  };

  const handleStatusAdvance = (item) => {
    let nextStatus = item.status;
    if (role === 'surveyor') {
      nextStatus = item.status === 'Draf' ? 'Terkirim' : 'Draf';
    } else if (canApprove) {
      if (item.status === 'Draf') nextStatus = 'Terkirim';
      else if (item.status === 'Terkirim') nextStatus = 'Disetujui';
      else if (item.status === 'Disetujui') nextStatus = 'Draf';
    }

    updateLaporanSurvei(item.id, {
      ...item,
      status: nextStatus
    });
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

  const filteredData = laporanSurvei.filter((item) => {
    const linkedSurat = suratTugas.find((s) => s.id === item.suratId);
    const suratNomor = linkedSurat ? linkedSurat.nomor : '';
    const namaKapal = item.namaKapal || (linkedSurat ? linkedSurat.namaKapal : '');

    const matchesSearch =
      item.petugas.toLowerCase().includes(searchTerm.toLowerCase()) ||
      namaKapal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.hasil.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      suratNomor.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'Semua' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  /* Export Laporan to Beautiful Formatted Excel (.xls) Function */
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      alert('Tidak ada data laporan untuk diexport!');
      return;
    }

    const currentDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const rowsHtml = filteredData
      .map((item, index) => {
        const linkedSurat = suratTugas.find((s) => s.id === item.suratId);
        const vesselName = item.namaKapal || (linkedSurat ? linkedSurat.namaKapal : 'MV Samudra Jaya 08');
        const suratNomor = linkedSurat ? linkedSurat.nomor : 'Tanpa Surat Tugas';
        const perihal = linkedSurat ? linkedSurat.perihal : 'Survei Kelayakan Kapal';
        const bgClass = index % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f8fafc;';

        let statusStyle = 'background-color: #e2e8f0; color: #475569;';
        if (item.status === 'Disetujui') {
          statusStyle = 'background-color: #d1fae5; color: #047857; font-weight: bold;';
        } else if (item.status === 'Terkirim') {
          statusStyle = 'background-color: #fef3c7; color: #b45309; font-weight: bold;';
        }

        return `
          <tr style="${bgClass}">
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold;">${item.id}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold; color: #003366;">${vesselName}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">${suratNomor}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">${perihal}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 600;">${item.petugas}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${formatDateIndo(item.tglLapor)}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; max-width: 350px;">${item.hasil || '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">
              <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; ${statusStyle}">
                ${item.status}
              </span>
            </td>
          </tr>
        `;
      })
      .join('');

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Laporan Survei BKI</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Arial', sans-serif; color: #0f172a; }
        </style>
      </head>
      <body>
        <div style="margin-bottom: 15px;">
          <h2 style="color: #003366; margin: 0; padding-bottom: 4px; font-size: 18px;">PT BIRO KLASIFIKASI INDONESIA (PERSERO) — CABANG PONTIANAK</h2>
          <h3 style="color: #1e3a8a; margin: 0; font-size: 14px; font-weight: normal;">REKAPITULASI LAPORAN HASIL SURVEI KELAISAN KAPAL</h3>
          <p style="color: #64748b; font-size: 12px; margin-top: 4px;">Tanggal Export: <strong>${currentDate}</strong> | Total Laporan: <strong>${filteredData.length} Data</strong></p>
        </div>

        <table style="border-collapse: collapse; width: 100%; font-size: 13px; font-family: Arial, sans-serif;">
          <thead>
            <tr style="background-color: #003366; color: #ffffff; font-weight: bold; text-align: center;">
              <th style="border: 1px solid #001f3f; padding: 10px; width: 110px;">ID LAPORAN</th>
              <th style="border: 1px solid #001f3f; padding: 10px; width: 180px;">NAMA KAPAL (VESSEL)</th>
              <th style="border: 1px solid #001f3f; padding: 10px; width: 180px;">NOMOR SURAT TUGAS</th>
              <th style="border: 1px solid #001f3f; padding: 10px; width: 220px;">PERIHAL SURVEI</th>
              <th style="border: 1px solid #001f3f; padding: 10px; width: 160px;">MARINE SURVEYOR</th>
              <th style="border: 1px solid #001f3f; padding: 10px; width: 130px;">TGL PELAPORAN</th>
              <th style="border: 1px solid #001f3f; padding: 10px; width: 350px;">TEMUAN & HASIL INSPEKSI</th>
              <th style="border: 1px solid #001f3f; padding: 10px; width: 130px;">STATUS WORKFLOW</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Survei_BKI_Pontianak_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="card-section">
      <div className="card-header">
        <div className="card-title-group">
          <ClipboardList size={22} color="var(--accent-primary)" />
          <div>
            <h2 className="card-title">Laporan Survei Kelayakan Kapal</h2>
            <div className="card-subtitle">Pantau, serahkan, dan verifikasi persetujuan hasil inspeksi kapal</div>
          </div>
        </div>

        <div className="card-actions">
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Cari nama kapal, surveyor, hasil..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Semua">Semua Status</option>
            <option value="Draf">Draf</option>
            <option value="Terkirim">Terkirim</option>
            <option value="Disetujui">Disetujui</option>
          </select>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportExcel}
            title="Download Laporan Format Excel Berwarna (.xls)"
            style={{ borderColor: '#10b981', color: '#10b981', fontWeight: 700 }}
          >
            <FileSpreadsheet size={15} color="#10b981" />
            <span>Export Excel</span>
          </button>

          {canAddLaporan && (
            <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
              <Plus size={16} />
              <span>Catat Laporan</span>
            </button>
          )}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID Laporan</th>
              <th>Nama Kapal (Vessel)</th>
              <th>Surat Tugas Terkait</th>
              <th>Marine Surveyor</th>
              <th>Tgl Pelaporan</th>
              <th>Temuan & Hasil Inspeksi</th>
              <th>Status Workflow</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="8" className="table-empty">
                  <div className="table-empty-icon">⚓</div>
                  <p>Tidak ada laporan survei kapal yang ditemukan.</p>
                </td>
              </tr>
            ) : (
              filteredData.map((item) => {
                const linkedSurat = suratTugas.find((s) => s.id === item.suratId);
                const vesselName = item.namaKapal || (linkedSurat ? linkedSurat.namaKapal : 'MV Samudra Jaya 08');

                return (
                  <tr key={item.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.id}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: '#1e3a8a' }}>
                        <Anchor size={15} color="#1e3a8a" />
                        <span>{vesselName}</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: '240px' }}>
                      {linkedSurat ? (
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--accent-primary)' }}>
                            {linkedSurat.nomor}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {linkedSurat.perihal}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Tanpa Surat Tugas</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <User size={14} color="var(--text-secondary)" />
                        <span style={{ fontWeight: 600 }}>{item.petugas}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                        <Calendar size={13} color="var(--text-muted)" />
                        <span>{formatDateIndo(item.tglLapor)}</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: '320px' }}>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          color: 'var(--text-primary)',
                          background: 'var(--bg-main)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          lineHeight: '1.4'
                        }}
                      >
                        {item.hasil}
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => handleStatusAdvance(item)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        title="Klik untuk memperbarui status laporan"
                      >
                        <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                          <span className="badge-dot" />
                          {item.status}
                        </span>
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button
                          className="btn btn-secondary btn-icon btn-sm"
                          onClick={() => handleOpenPrint(item)}
                          title="Cetak / Download PDF Laporan"
                        >
                          <Printer size={15} color="var(--accent-primary)" />
                        </button>

                        {canApprove && item.status !== 'Disetujui' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleApprove(item)}
                            title="Setujui Laporan Ini"
                            style={{ background: '#10b981', borderColor: '#10b981' }}
                          >
                            <Check size={14} />
                            <span>Setujui</span>
                          </button>
                        )}

                        {canEditLaporan && (
                          <>
                            {role === 'surveyor' && isEditWindowExpired(item.tglLapor) && !item.isUnlockedByAdmin ? (
                              item.editRequested ? (
                                <span
                                  className="badge"
                                  style={{
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    color: '#d97706',
                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                    fontSize: '0.725rem',
                                    padding: '0.3rem 0.55rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem'
                                  }}
                                  title="Permintaan edit telah dikirim ke Admin. Menunggu persetujuan."
                                >
                                  <Clock size={13} />
                                  <span>Menunggu Approval Admin</span>
                                </span>
                              ) : (
                                <button
                                  className="btn btn-secondary btn-icon btn-sm"
                                  onClick={() => handlePromptRequestEdit(item)}
                                  title="Batas waktu edit mandiri (2 hari) telah berakhir. Klik untuk Minta Izin Edit ke Admin"
                                  style={{ borderColor: '#ef4444', color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)' }}
                                >
                                  <Lock size={15} color="#ef4444" />
                                </button>
                              )
                            ) : (
                              <button
                                className="btn btn-secondary btn-icon btn-sm"
                                onClick={() => handleOpenEdit(item)}
                                title="Ubah Data Laporan Survei"
                              >
                                <Edit2 size={15} />
                              </button>
                            )}

                            {canApprove && item.editRequested && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => approveEditRequest(item.id)}
                                title="Setujui dan Buka Kunci Edit Surveyor"
                                style={{ background: '#f59e0b', borderColor: '#f59e0b', fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                              >
                                <Unlock size={14} />
                                <span>Setujui Edit Surveyor</span>
                              </button>
                            )}
                          </>
                        )}

                        {canDelete && (
                          <button
                            className="btn btn-danger btn-icon btn-sm"
                            onClick={() => promptDelete(item)}
                            title="Hapus Data"
                          >
                            <Trash2 size={15} />
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

      {canEditLaporan && (
        <LaporanModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editItem={editingItem}
          onPrintSuratTugas={(surat) => {
            setSelectedSuratPrintItem(surat);
            setIsSuratPrintModalOpen(true);
          }}
        />
      )}

      <LaporanPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        laporan={selectedPrintItem}
        suratTugas={suratTugas}
      />

      <SuratTugasPrintModal
        isOpen={isSuratPrintModalOpen}
        onClose={() => setIsSuratPrintModalOpen(false)}
        suratTugas={selectedSuratPrintItem}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Konfirmasi Hapus Laporan Survei"
        message={itemToDelete ? `Apakah Anda yakin ingin menghapus Laporan Survei ${itemToDelete.id} untuk kapal ${itemToDelete.namaKapal || ''}?` : ''}
        confirmText="Ya, Hapus Laporan"
        type="danger"
      />

      <ConfirmModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onConfirm={handleConfirmRequestEdit}
        title="Minta Persetujuan Edit (Batas 2 Hari Lewat)"
        message={itemToRequest ? `Laporan survei ${itemToRequest.id} (${itemToRequest.namaKapal}) telah melebihi batas waktu edit mandiri (2 hari). Kirim permintaan ke Admin/Kacab untuk membuka kunci edit?` : ''}
        confirmText="Kirim Permintaan ke Admin"
        type="warning"
      />
    </div>
  );
};
