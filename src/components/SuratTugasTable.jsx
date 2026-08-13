import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, FileCheck, MapPin, User, Calendar, Anchor, Printer } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo, getStatusBadgeClass } from '../utils/formatters';
import { filterDataByRole } from '../utils/filterData';
import { SuratTugasModal } from './SuratTugasModal';
import { SuratTugasPrintModal } from './SuratTugasPrintModal';
import { ConfirmModal } from './ConfirmModal';

export const SuratTugasTable = () => {
  const { suratTugas, deleteSuratTugas } = useData();
  const { role, currentUser } = useAuth();

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

  // Filter list by role (surveyors only see their own assigned tasks)
  const roleFilteredList = filterDataByRole(suratTugas, currentUser, role, 'petugas');

  const filteredData = roleFilteredList.filter((item) => {
    const matchesSearch =
      item.nomor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.namaKapal && item.namaKapal.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.perihal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.petugas.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.lokasi && item.lokasi.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'Semua' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="card-section">
      <div className="card-header">
        <div className="card-title-group">
          <FileCheck size={22} color="var(--accent-primary)" />
          <div>
            <h2 className="card-title">
              {role === 'surveyor' ? `Surat Tugas Saya (${currentUser?.name})` : 'Daftar Surat Tugas BKI Pontianak'}
            </h2>
            <div className="card-subtitle">
              {role === 'surveyor'
                ? `Menampilkan penugasan kapal yang diberikan khusus untuk ${currentUser?.name}`
                : 'Kelola dan unduh/cetak dokumen Surat Tugas penugasan Class Surveyor BKI Pontianak'}
            </div>
          </div>
        </div>

        <div className="card-actions">
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Cari nama kapal, nomor, lokasi..."
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
              <span>Buat Surat Tugas Baru</span>
            </button>
          )}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nomor Surat</th>
              <th>Nama Kapal (Vessel)</th>
              <th>Perihal / Jenis Survei</th>
              <th>Class Surveyor</th>
              <th>Pelabuhan / Lokasi</th>
              <th>Periode Tanggal</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Aksi & Download</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="8" className="table-empty">
                  <div className="table-empty-icon">⚓</div>
                  <p>
                    {role === 'surveyor'
                      ? `Tidak ada penugasan survei kapal untuk ${currentUser?.name}.`
                      : 'Tidak ada data penugasan survei kapal yang sesuai dengan pencarian.'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {item.nomor}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: '#1e3a8a' }}>
                      <Anchor size={15} color="#1e3a8a" />
                      <span>{item.namaKapal || 'MV Samudra Jaya'}</span>
                    </div>
                  </td>
                  <td style={{ maxWidth: '260px' }}>
                    <div style={{ fontWeight: 600 }}>{item.perihal}</div>
                    {item.catatan && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {item.catatan}
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
