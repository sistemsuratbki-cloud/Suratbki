import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, TrendingUp, RefreshCcw } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { GradeTariffModal } from './GradeTariffModal';
import { ConfirmModal } from './ConfirmModal';
import { formatRupiah } from '../utils/formatters';

export const GradeTariffManagementTable = () => {
  const { gradeTariffs, deleteGradeTariff, resetGradeTariffs } = useData();
  const { currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const promptDelete = (item) => {
    setItemToDelete(item);
    setIsConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteGradeTariff(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  const handleConfirmReset = () => {
    resetGradeTariffs();
    setIsConfirmResetOpen(false);
  };

  const filteredData = gradeTariffs.filter(
    (item) => item.grade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card-section">
      <div className="card-header">
        <div className="card-title-group">
          <TrendingUp size={22} color="var(--accent-primary)" />
          <div>
            <h2 className="card-title">Manajemen Uang Harian Berdasarkan Grade</h2>
            <div className="card-subtitle">Atur daftar Grade (Pangkat) dan nominal Uang Harian terkait</div>
          </div>
        </div>

        <div className="card-actions">
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Cari nama Grade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {currentUser?.role === 'developer' && (
            <button className="btn btn-secondary" onClick={() => setIsConfirmResetOpen(true)} title="Reset ke Default BKI (Khusus Developer)">
              <RefreshCcw size={16} />
              <span>Reset Data</span>
            </button>
          )}

          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} />
            <span>Tambah Grade Baru</span>
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Grade / Pangkat</th>
              <th>Nominal Uang Harian</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="4" className="table-empty">
                  <div className="table-empty-icon">💸</div>
                  <p>Tidak ada data Grade yang sesuai dengan pencarian Anda.</p>
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr key={item.id}>
                  <td style={{ width: '60px', color: 'var(--text-muted)' }}>{index + 1}</td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.grade}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>
                      {formatRupiah(item.uangHarian !== undefined && item.uangHarian !== null ? item.uangHarian : (item.uang_harian || 0))}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', width: '120px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                      <button className="btn btn-secondary btn-icon btn-sm" onClick={() => handleOpenEdit(item)} title="Ubah Grade">
                        <Edit2 size={15} />
                      </button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => promptDelete(item)} title="Hapus Grade">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <GradeTariffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editItem={editingItem}
      />

      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Konfirmasi Hapus Grade"
        message={itemToDelete ? `Apakah Anda yakin ingin menghapus Grade ${itemToDelete.grade} secara permanen?` : ''}
        confirmText="Ya, Hapus Grade"
        type="danger"
      />

      <ConfirmModal
        isOpen={isConfirmResetOpen}
        onClose={() => setIsConfirmResetOpen(false)}
        onConfirm={handleConfirmReset}
        title="Konfirmasi Reset Grade Uang Harian"
        message="Tindakan ini akan mengembalikan seluruh daftar Grade & Uang Harian ke kondisi default bawaan sistem. Masukkan password developer Anda untuk melanjutkan."
        confirmText="Ya, Reset Uang Harian"
        type="danger"
        requirePassword={true}
      />
    </div>
  );
};
