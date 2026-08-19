import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Navigation,
  Compass,
  Plane,
  Car,
  Ship,
  Sparkles
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatRupiah } from '../utils/formatters';
import { TariffModal } from './TariffModal';
import { ConfirmModal } from './ConfirmModal';

export const TariffManagementTable = () => {
  const { tariffs, deleteTariff, resetTariffs, adminSettings, updateAdminSettings } = useData();
  const { role, currentUser } = useAuth();

  // Role-Based Access Control: Admin, Kacab, and Keuangan/Finance only
  const canManageTariffs = role === 'admin' || role === 'developer' || role === 'kacab' || role === 'keuangan';

  const [searchTerm, setSearchTerm] = useState('');
  const [modaFilter, setModaFilter] = useState('Semua');
  const [kategoriFilter, setKategoriFilter] = useState('Luar Kota');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [tariffToDelete, setTariffToDelete] = useState(null);

  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  const [isEditingTat, setIsEditingTat] = useState(false);
  const [tatValue, setTatValue] = useState('');

  // If user lacks permission, show restricted notice
  if (!canManageTariffs) {
    return (
      <div className="card-section" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}
        >
          <ShieldAlert size={36} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Akses Terbatas
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0.5rem auto 1.5rem', fontSize: '0.9rem' }}>
          Halaman Pengelolaan Master Tarif Lokasi ini dibatasi khusus untuk <strong>Admin Utama</strong>,{' '}
          <strong>Kepala Cabang (Kacab)</strong>, dan <strong>Staff Finance / Keuangan</strong> PT. BKI Pontianak.
        </p>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Role Anda saat ini: <span className="badge badge-completed">{currentUser?.roleLabel || role}</span>
        </div>
      </div>
    );
  }

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const promptDelete = (item) => {
    setTariffToDelete(item);
    setIsConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (tariffToDelete) {
      deleteTariff(tariffToDelete.id);
      setTariffToDelete(null);
    }
  };

  const handleConfirmReset = () => {
    resetTariffs();
    alert('Master Tarif Lokasi berhasil dikembalikan ke standar 31 lokasi SK Cabang Madya Klas Pontianak!');
  };

  const getModaBadge = (moda) => {
    const m = (moda || '').toLowerCase();
    if (m.includes('udara')) {
      return (
        <span
          className="badge"
          style={{
            background: 'rgba(14, 165, 233, 0.15)',
            color: '#0284c7',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          <Plane size={12} />
          <span>Via Udara</span>
        </span>
      );
    }
    if (m.includes('darat') && !m.includes('air')) {
      return (
        <span
          className="badge"
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#059669',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          <Car size={12} />
          <span>Via Darat</span>
        </span>
      );
    }
    if (m.includes('speedboat')) {
      return (
        <span
          className="badge"
          style={{
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#d97706',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          <Ship size={12} />
          <span>Speedboat</span>
        </span>
      );
    }
    return (
      <span
        className="badge"
        style={{
          background: 'rgba(99, 102, 241, 0.15)',
          color: '#6366f1',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem'
        }}
      >
        <Ship size={12} />
        <span>{moda || 'Air / Darat'}</span>
      </span>
    );
  };

  // Filter and search logic
  const filteredData = (tariffs || []).filter((item) => {
    const matchesSearch =
      (item.tujuan && item.tujuan.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.rincian && item.rincian.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.moda && item.moda.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesModa =
      modaFilter === 'Semua' ||
      (modaFilter === 'Udara' && (item.moda || '').toLowerCase().includes('udara')) ||
      (modaFilter === 'Darat' && (item.moda || '').toLowerCase().includes('darat')) ||
      (modaFilter === 'Air' && ((item.moda || '').toLowerCase().includes('air') || (item.moda || '').toLowerCase().includes('speedboat')));

    const matchesKategori = (item.kategori || 'Luar Kota') === kategoriFilter;

    return matchesSearch && matchesModa && matchesKategori;
  });

  // Calculate statistics
  const totalLocations = tariffs.length;
  const rates = tariffs.map((t) => Number(t.rate) || 0);
  const minRate = rates.length > 0 ? Math.min(...rates) : 0;
  const maxRate = rates.length > 0 ? Math.max(...rates) : 0;
  const avgRate = rates.length > 0 ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Edit TAT Card Section */}
      <div className="card-section" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 className="card-title" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Navigation size={18} color="var(--accent-primary)" />
            Pengaturan Tarif Asal Tujuan (TAT)
          </h3>
          <div className="card-subtitle" style={{ marginTop: '0.2rem' }}>
            Biaya ini secara otomatis ditambahkan sebagai komponen transport untuk kategori Luar Kota
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isEditingTat ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Rp</span>
              <input
                type="number"
                className="form-input"
                style={{ width: '150px' }}
                value={tatValue}
                onChange={(e) => setTatValue(e.target.value)}
                autoFocus
                step="1000"
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  updateAdminSettings({ tatLuarKota: Number(tatValue) || 0 });
                  setIsEditingTat(false);
                }}
              >
                Simpan
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setIsEditingTat(false)}
              >
                Batal
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                {formatRupiah(adminSettings?.tatLuarKota ?? 750000)}
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setTatValue(adminSettings?.tatLuarKota ?? 750000);
                  setIsEditingTat(true);
                }}
                title="Ubah Tarif TAT"
              >
                <Edit2 size={15} />
                <span>Ubah Nominal</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card-section">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div className="card-title-group">
            <MapPin size={20} color="var(--accent-primary)" />
            <div>
              <h3 className="card-title">Daftar Wilayah & Tarif SK Cabang Pontianak</h3>
              <div className="card-subtitle">
                Menampilkan {filteredData.length} dari {tariffs.length} lokasi penugasan
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-main)', padding: '0.35rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button
              className={`btn ${kategoriFilter === 'Dalam Kota' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
              onClick={() => setKategoriFilter('Dalam Kota')}
            >
              Dalam Kota
            </button>
            <button
              className={`btn ${kategoriFilter === 'Luar Kota' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
              onClick={() => setKategoriFilter('Luar Kota')}
            >
              Luar Kota
            </button>
          </div>

          <div className="card-actions" style={{ flexWrap: 'wrap', gap: '0.65rem' }}>
            <div className="search-box">
              <Search className="search-icon" size={16} />
              <input
                type="text"
                className="form-input"
                placeholder="Cari nama tujuan, rincian perjalanan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '240px' }}
              />
            </div>

            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={modaFilter}
              onChange={(e) => setModaFilter(e.target.value)}
            >
              <option value="Semua">Semua Moda</option>
              <option value="Udara">✈️ Via Udara</option>
              <option value="Darat">🚗 Via Darat</option>
              <option value="Air">🚢 Via Air / Speedboat</option>
            </select>

            {currentUser?.role === 'developer' && (
              <button
                className="btn btn-secondary"
                onClick={() => setIsConfirmResetOpen(true)}
                title="Reset ke Standar SK 31 Lokasi BKI (Khusus Developer)"
              >
                <RotateCcw size={15} />
                <span>Reset Standar SK</span>
              </button>
            )}

            <button className="btn btn-primary" onClick={handleOpenAdd}>
              <Plus size={16} />
              <span>Tambah Tarif Lokasi</span>
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>No.</th>
                <th>Tujuan / Nama Lokasi</th>
                <th>Rincian Perjalanan</th>
                <th>Moda Transportasi</th>
                <th style={{ textAlign: 'right' }}>Transport Dalam Tugas</th>

                <th style={{ textAlign: 'right', width: '110px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    <div className="table-empty-icon">📍</div>
                    <p>Tidak ada data tarif lokasi yang sesuai dengan pencarian.</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => {
                  const rate = Number(item.rate) || 0;

                  const ribuanFormat = (rate / 1000).toLocaleString('id-ID');

                  return (
                    <tr key={item.id || `tariff-${index}`}>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>
                        {item.no || index + 1}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.925rem' }}>
                          {item.tujuan || item.name}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {item.rincian || '-'}
                        </div>
                      </td>
                      <td>{getModaBadge(item.moda)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.95rem' }}>
                          {formatRupiah(rate)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          ({ribuanFormat} ribuan)
                        </div>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            className="btn btn-secondary btn-icon btn-sm"
                            onClick={() => handleOpenEdit(item)}
                            title="Ubah Tarif Lokasi"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            className="btn btn-danger btn-icon btn-sm"
                            onClick={() => promptDelete(item)}
                            title="Hapus Tarif Lokasi"
                          >
                            <Trash2 size={15} />
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
      </div>

      <TariffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editItem={editingItem}
      />

      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Konfirmasi Hapus Tarif Lokasi"
        message={
          tariffToDelete
            ? `Apakah Anda yakin ingin menghapus tarif lokasi '${tariffToDelete.tujuan || tariffToDelete.name}' (${formatRupiah(tariffToDelete.rate)})?`
            : ''
        }
        confirmText="Ya, Hapus Tarif"
        type="danger"
      />

      <ConfirmModal
        isOpen={isConfirmResetOpen}
        onClose={() => setIsConfirmResetOpen(false)}
        onConfirm={handleConfirmReset}
        title="Konfirmasi Reset Master Tarif BKI"
        message="Tindakan ini akan mengembalikan seluruh daftar tarif ke standar resmi 31 lokasi SK Cabang Madya Klas Pontianak. Masukkan password developer Anda untuk melanjutkan."
        confirmText="Ya, Reset ke Standar SK"
        type="warning"
        requirePassword={true}
      />
    </div>
  );
};
