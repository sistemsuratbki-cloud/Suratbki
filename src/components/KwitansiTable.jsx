import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Receipt, Printer, Plane } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo, formatRupiah, getStatusBadgeClass } from '../utils/formatters';
import { KwitansiModal } from './KwitansiModal';
import { KwitansiPrintModal } from './KwitansiPrintModal';
import { ConfirmModal } from './ConfirmModal';

export const KwitansiTable = () => {
  const { kwitansiHonor, suratTugas, updateKwitansiHonor, deleteKwitansiHonor } = useData();
  const { role } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printItem, setPrintItem] = useState(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const canManageFinance = role === 'admin' || role === 'keuangan';
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
    setPrintItem(item);
    setIsPrintModalOpen(true);
  };

  const handleToggleStatus = (item) => {
    if (!canManageFinance) return;
    const newStatus = item.status === 'Sudah Dibayar' ? 'Belum Dibayar' : 'Sudah Dibayar';
    updateKwitansiHonor(item.id, {
      ...item,
      status: newStatus,
      tglBayar: newStatus === 'Sudah Dibayar' ? new Date().toISOString().split('T')[0] : item.tglBayar
    });
  };

  const promptDelete = (item) => {
    setItemToDelete(item);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteKwitansiHonor(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  const filteredData = kwitansiHonor.filter((item) => {
    const linkedSurat = suratTugas.find((s) => s.id === item.suratId);
    const suratNomor = linkedSurat ? linkedSurat.nomor : '';
    const namaKapal = linkedSurat ? linkedSurat.namaKapal : '';

    const matchesSearch =
      item.penerima.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      namaKapal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      suratNomor.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'Semua' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="card-section">
      <div className="card-header">
        <div className="card-title-group">
          <Receipt size={22} color="var(--accent-primary)" />
          <div>
            <h2 className="card-title">Daftar Kwitansi Honor Marine Surveyor</h2>
            <div className="card-subtitle">Kalkulasi tarif pelabuhan, surcharge CITO / Hari Libur (+50%), & status pembayaran</div>
          </div>
        </div>

        <div className="card-actions">
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Cari penerima, kapal, no kwitansi..."
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
            <option value="Belum Dibayar">Belum Dibayar</option>
            <option value="Sudah Dibayar">Sudah Dibayar</option>
          </select>

          {canManageFinance && (
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              <Plus size={16} />
              <span>Buat Kwitansi</span>
            </button>
          )}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID Kwitansi</th>
              <th>Surat / Kapal Terkait</th>
              <th>Penerima Honor</th>
              <th>Kategori Tarif</th>
              <th>Total Honor (Rp)</th>
              <th>Tgl Bayar</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="8" className="table-empty">
                  <div className="table-empty-icon">💸</div>
                  <p>Tidak ada kwitansi honor yang sesuai dengan kriteria filter.</p>
                </td>
              </tr>
            ) : (
              filteredData.map((item) => {
                const linkedSurat = suratTugas.find((s) => s.id === item.suratId);
                const isCito = item.isCito || (linkedSurat && linkedSurat.isCito);

                return (
                  <tr key={item.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.id}
                      </span>
                    </td>
                    <td style={{ maxWidth: '280px' }}>
                      {linkedSurat ? (
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.825rem', color: '#1e3a8a' }}>
                            🚢 {linkedSurat.namaKapal || 'MV Samudra Jaya'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {linkedSurat.nomor}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Tanpa Surat Tugas</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.penerima}</div>
                    </td>
                    <td>
                      {isCito ? (
                        <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                          ⚡ CITO / Libur (+50%)
                        </span>
                      ) : (
                        <span className="badge badge-completed" style={{ fontSize: '0.7rem' }}>
                          Tarif Standar
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: isCito ? '#dc2626' : 'var(--status-completed-text)', fontSize: '0.95rem' }}>
                        {formatRupiah(item.jumlah)}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {item.tglBayar ? formatDateIndo(item.tglBayar) : '-'}
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleStatus(item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: canManageFinance ? 'pointer' : 'default',
                          padding: 0
                        }}
                        title={canManageFinance ? 'Klik untuk mengubah status pembayaran / approval' : 'Status pembayaran'}
                      >
                        <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                          <span className="badge-dot" />
                          {item.status}
                        </span>
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        {canManageFinance && item.status !== 'Sudah Dibayar' && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem', background: '#059669', borderColor: '#059669' }}
                            onClick={() => handleToggleStatus(item)}
                            title="Setujui & Tandai Sudah Dibayar oleh Keuangan"
                          >
                            <span>Approve</span>
                          </button>
                        )}

                        <button
                          className="btn btn-secondary btn-icon btn-sm"
                          onClick={() => handleOpenPrint(item)}
                          title="Cetak Kwitansi Honorarium"
                        >
                          <Printer size={15} />
                        </button>
                        {canManageFinance && (
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
                        {item.fileTiketTransportData && (
                          <a
                            href={item.fileTiketTransportData}
                            download={item.fileTiketTransportName || 'tiket'}
                            className="btn btn-secondary btn-icon btn-sm"
                            title={`Unduh Tiket: ${item.fileTiketTransportName}`}
                            style={{ borderColor: '#0284c7', color: '#0284c7' }}
                          >
                            <Plane size={15} />
                          </a>
                        )}
                        {item.fileKwitansiHotelData && (
                          <a
                            href={item.fileKwitansiHotelData}
                            download={item.fileKwitansiHotelName || 'hotel'}
                            className="btn btn-secondary btn-icon btn-sm"
                            title={`Unduh Kwitansi Hotel: ${item.fileKwitansiHotelName}`}
                            style={{ borderColor: '#059669', color: '#059669' }}
                          >
                            <Receipt size={15} />
                          </a>
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

      {canManageFinance && (
        <KwitansiModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editItem={editingItem}
        />
      )}

      <KwitansiPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        kwitansi={printItem}
        suratTugasList={suratTugas}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Konfirmasi Hapus Kwitansi Honor"
        message={itemToDelete ? `Apakah Anda yakin ingin menghapus Kwitansi Honor ${itemToDelete.id} atas nama ${itemToDelete.penerima}?` : ''}
        confirmText="Ya, Hapus Kwitansi"
        type="danger"
      />
    </div>
  );
};
