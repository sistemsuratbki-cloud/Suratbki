import React, { useState } from 'react';
import { Plus, Search, Eye, Edit2, Trash2, FileText, User, Calendar, MapPin, Anchor, Printer } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo, getStatusBadgeClass, cleanDocNumber } from '../utils/formatters';
import { SuratTugasModal } from './SuratTugasModal';
import { SuratTugasPrintModal } from './SuratTugasPrintModal';
import { ConfirmModal } from './ConfirmModal';

export const SuratTugasTable = () => {
  const { suratTugas, deleteSuratTugas } = useData();
  const { role } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPrintItem, setSelectedPrintItem] = useState(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const canManage = role === 'admin' || role === 'kacab';
  const canDelete = role === 'admin';

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleOpenPrint = (item) => {
    setSelectedPrintItem(item);
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

  const filteredData = suratTugas.filter((item) => {
    const matchesSearch =
      (item.petugas || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.nomor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.namaKapal || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.lokasi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.perihal || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'Semua' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="card-section">
      <div className="card-header">
        <div className="card-title-group">
          <FileText size={22} color="var(--accent-primary)" />
          <div>
            <h2 className="card-title">Daftar Surat Penunjukan Survey (SPS)</h2>
            <div className="card-subtitle">Kelola penugasan marine surveyor dan status operasional</div>
          </div>
        </div>

        <div className="card-actions">
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Cari nomor surat, surveyor, kapal, lokasi..."
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
            <option value="Belum Mulai">Belum Mulai</option>
            <option value="Berjalan">Berjalan</option>
            <option value="Selesai">Selesai</option>
          </select>

          {canManage && (
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              <Plus size={16} />
              <span>Buat SPS Baru</span>
            </button>
          )}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nomor Surat</th>
              <th>Nama Kapal / Pemohon</th>
              <th>Perihal / Agenda</th>
              <th>Petugas Surveyor</th>
              <th>Lokasi Survey</th>
              <th>Periode Pelaksanaan</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="8" className="table-empty">
                  <div className="table-empty-icon">📄</div>
                  <p>Tidak ada Surat Penunjukan Survey yang sesuai dengan filter.</p>
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {cleanDocNumber(item.nomor)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      <Anchor size={15} color="var(--accent-primary)" />
                      <span>{item.namaKapal || 'MV Samudra Jaya'}</span>
                    </div>
                    {item.pemohon && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Pemohon: {item.pemohon}
                      </div>
                    )}
                  </td>
                  <td style={{ maxWidth: '260px' }}>
                    <div style={{ fontWeight: 600 }}>{item.jenisSurvey || item.perihal}</div>
                    {item.agenda && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Agenda: {item.agenda}
                      </div>
                    )}
                    {item.noOrder && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 600, marginTop: '0.1rem' }}>
                        No.Order: {item.noOrder}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <User size={14} color="var(--text-secondary)" />
                      <span>{item.petugas}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={14} color="var(--text-secondary)" />
                      <span>{item.lokasi || '-'}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                      <Calendar size={13} color="var(--text-muted)" />
                      <span>{formatDateIndo(item.tglMulai)} s/d {formatDateIndo(item.tglSelesai)}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                      <span className="badge-dot" />
                      {item.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                      <button
                        className="btn btn-primary btn-icon btn-sm"
                        onClick={() => handleOpenPrint(item)}
                        title="Download / Cetak PDF Surat Tugas BKI"
                      >
                        <Printer size={15} />
                      </button>

                      {canManage && (
                        <button
                          className="btn btn-secondary btn-icon btn-sm"
                          onClick={() => handleOpenEdit(item)}
                          title="Ubah Data"
                        >
                          <Edit2 size={15} />
                        </button>
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {canManage && (
        <SuratTugasModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editItem={editingItem}
          onPrint={(item) => handleOpenPrint(item)}
        />
      )}

      <SuratTugasPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        suratTugas={selectedPrintItem}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Konfirmasi Hapus Surat Tugas"
        message={itemToDelete ? `Apakah Anda yakin ingin menghapus Surat Tugas ${itemToDelete.nomor} untuk kapal ${itemToDelete.namaKapal}? Kwitansi & Laporan terkait juga akan dihapus.` : ''}
        confirmText="Ya, Hapus Surat Tugas"
        type="danger"
      />
    </div>
  );
};
