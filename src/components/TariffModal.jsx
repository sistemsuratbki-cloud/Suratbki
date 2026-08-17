import React, { useState, useEffect } from 'react';
import { X, Save, MapPin, DollarSign, Navigation, Sparkles } from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatRupiah } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';
import { sanitizeFormData } from '../utils/security';

export const TariffModal = ({ isOpen, onClose, editItem = null }) => {
  const { addTariff, updateTariff, tariffs } = useData();

  const [formData, setFormData] = useState({
    tujuan: '',
    rincian: '',
    rate: 2000000,
    moda: 'Darat',
    kategori: 'Luar Kota'
  });

  useEffect(() => {
    if (editItem) {
      setFormData({
        tujuan: editItem.tujuan || editItem.name || '',
        rincian: editItem.rincian || '',
        rate: editItem.rate || 0,
        moda: editItem.moda || 'Darat',
        kategori: editItem.kategori || 'Luar Kota'
      });
    } else {
      setFormData({
        tujuan: '',
        rincian: '',
        rate: 2000000,
        moda: 'Darat',
        kategori: 'Luar Kota'
      });
    }
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  const numericRate = Number(formData.rate) || 0;

  const ribuanFormat = (numericRate / 1000).toLocaleString('id-ID');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.tujuan.trim()) {
      alert('Mohon isi Nama Tujuan / Lokasi Penugasan!');
      return;
    }

    if (numericRate <= 0) {
      alert('Mohon isi Nominal Tarif Biaya Transportasi yang valid!');
      return;
    }

    const payload = sanitizeFormData({
      ...formData,
      tujuan: formData.tujuan.trim(),
      rincian: formData.rincian.trim(),
      name: formData.tujuan.trim(),
      rate: numericRate,
      moda: formData.moda,
      kategori: formData.kategori
    });

    if (editItem) {
      updateTariff(editItem.id, payload);
    } else {
      addTariff(payload);
    }

    onClose();
  };

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          style={{ maxWidth: '600px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'var(--accent-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <MapPin size={20} color="var(--accent-primary)" />
              </div>
              <div>
                <h3 className="modal-title" style={{ fontSize: '1.15rem' }}>
                  {editItem ? 'Ubah Tarif & Biaya Lokasi' : 'Tambah Tarif Lokasi Penugasan'}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Cabang Madya Klas Pontianak • PT. Biro Klasifikasi Indonesia
                </div>
              </div>
            </div>
            <button className="btn btn-secondary btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Tujuan / Nama Lokasi Penugasan *
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.tujuan}
                  onChange={(e) => setFormData({ ...formData, tujuan: e.target.value })}
                  placeholder="Contoh: Kediuk (Via Udara) atau Teluk Keramat"
                  required
                  autoFocus
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Nama lokasi yang akan dipilih saat pembuatan Surat Tugas & Kwitansi
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Rincian Perjalanan *
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.rincian}
                  onChange={(e) => setFormData({ ...formData, rincian: e.target.value })}
                  placeholder="Contoh: Ketapang - Kediuk atau Pontianak - Tayan"
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Rute asal dan tujuan keberangkatan dinas surveyor
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Kategori Perjalanan *
                  </label>
                  <select
                    className="form-select"
                    value={formData.kategori}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                  >
                    <option value="Dalam Kota">Dalam Kota</option>
                    <option value="Luar Kota">Luar Kota</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Moda Transportasi Utama *
                  </label>
                  <select
                    className="form-select"
                    value={formData.moda}
                    onChange={(e) => setFormData({ ...formData, moda: e.target.value })}
                  >
                    <option value="Udara">✈️ Via Udara (Pesawat)</option>
                    <option value="Darat">🚗 Via Darat (Mobil/Travel)</option>
                    <option value="Air">🚢 Via Air / Laut</option>
                    <option value="Speedboat / Air">🚤 Speedboat / Air</option>
                    <option value="Air / Darat">🚢/🚗 Darat & Air (Kombinasi)</option>
                    <option value="Darat / Air">🚗/🚢 Air & Darat (Kombinasi)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Biaya Transport Dalam Tugas (Rp) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className="form-input"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: Number(e.target.value) || 0 })}
                    placeholder="Contoh: 3000000"
                    required
                  />
                </div>
              </div>

              {/* Real-time Tariff & CITO Calculation Card */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  border: '1.5px solid var(--border-color-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-primary)', fontWeight: 800, fontSize: '0.85rem' }}>
                  <Sparkles size={16} />
                  <span>Kalkulasi Otomatis Tarif Surat Keputusan (SK) BKI</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                  <div style={{ background: 'var(--bg-card-solid)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                      Tarif Standar (Hari Kerja)
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                      {formatRupiah(numericRate)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 700, marginTop: '0.1rem' }}>
                      ({ribuanFormat} ribuan)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary">
                <Save size={16} />
                <span>{editItem ? 'Simpan Perubahan Tarif' : 'Tambah Tarif Lokasi'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
