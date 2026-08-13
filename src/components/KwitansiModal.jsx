import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useData } from '../context/DataContext';
import { calculateHonorFee } from '../utils/tariffData';
import { formatRupiah } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';

import { sanitizeFormData } from '../utils/security';

export const KwitansiModal = ({ isOpen, onClose, editItem = null }) => {
  const { suratTugas, addKwitansiHonor, updateKwitansiHonor } = useData();

  const [formData, setFormData] = useState({
    suratId: '',
    penerima: '',
    tarifDasar: 3500000,
    isCito: false,
    jumlah: 3500000,
    tglBayar: '',
    status: 'Belum Dibayar',
    catatan: ''
  });

  useEffect(() => {
    if (editItem) {
      setFormData({
        ...editItem,
        tarifDasar: editItem.tarifDasar || editItem.jumlah || 3500000,
        isCito: !!editItem.isCito
      });
    } else {
      const defaultSurat = suratTugas.length > 0 ? suratTugas[0] : null;
      const baseRate = defaultSurat?.tarifDasar || 3500000;
      const isCito = defaultSurat ? !!defaultSurat.isCito : false;
      const { totalHonor } = calculateHonorFee(baseRate, isCito);

      setFormData({
        suratId: defaultSurat ? defaultSurat.id : '',
        penerima: defaultSurat ? defaultSurat.petugas : '',
        tarifDasar: baseRate,
        isCito,
        jumlah: totalHonor,
        tglBayar: new Date().toISOString().split('T')[0],
        status: 'Belum Dibayar',
        catatan: isCito ? 'Honorarium CITO / Hari Libur (+50%)' : 'Honorarium Standar'
      });
    }
  }, [editItem, isOpen, suratTugas]);

  if (!isOpen) return null;

  const handleSuratChange = (suratId) => {
    const selectedSurat = suratTugas.find((s) => s.id === suratId);
    const baseRate = selectedSurat?.tarifDasar || 3500000;
    const isCito = selectedSurat ? !!selectedSurat.isCito : formData.isCito;
    const { totalHonor } = calculateHonorFee(baseRate, isCito);

    setFormData((prev) => ({
      ...prev,
      suratId,
      penerima: selectedSurat ? selectedSurat.petugas : prev.penerima,
      tarifDasar: baseRate,
      isCito,
      jumlah: totalHonor
    }));
  };

  const handleBaseRateChange = (newBaseRate) => {
    const rate = Number(newBaseRate) || 0;
    const { totalHonor } = calculateHonorFee(rate, formData.isCito);
    setFormData((prev) => ({
      ...prev,
      tarifDasar: rate,
      jumlah: totalHonor
    }));
  };

  const handleCitoToggle = (checked) => {
    const { totalHonor } = calculateHonorFee(formData.tarifDasar, checked);
    setFormData((prev) => ({
      ...prev,
      isCito: checked,
      jumlah: totalHonor
    }));
  };

  const { baseRate, citoSurcharge, totalHonor } = calculateHonorFee(formData.tarifDasar, formData.isCito);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.penerima || !formData.jumlah) {
      alert('Mohon isi Nama Penerima dan Jumlah Honor!');
      return;
    }

    const payload = sanitizeFormData({
      ...formData,
      tarifDasar: baseRate,
      jumlah: totalHonor
    });

    if (editItem) {
      updateKwitansiHonor(editItem.id, payload);
    } else {
      addKwitansiHonor(payload);
    }
    onClose();
  };

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" style={{ maxWidth: '650px' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">{editItem ? 'Ubah Kwitansi Honor' : 'Buat Kwitansi Honor Baru'}</h3>
            <button className="btn btn-secondary btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Pilih Surat Tugas Terkait</label>
                <select
                  className="form-select"
                  value={formData.suratId}
                  onChange={(e) => handleSuratChange(e.target.value)}
                >
                  <option value="">-- Tanpa Relasi Surat Tugas --</option>
                  {suratTugas.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.nomor} - {st.namaKapal || 'Kapal'} ({st.petugas})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nama Penerima Honor *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.penerima}
                  onChange={(e) => setFormData({ ...formData, penerima: e.target.value })}
                  placeholder="Contoh: Budi Santoso, ST"
                  required
                />
              </div>

              {/* Tariff Calculation Box */}
              <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color-strong)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Tarif Dasar Lokasi (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      step="100000"
                      className="form-input"
                      value={formData.tarifDasar}
                      onChange={(e) => handleBaseRateChange(e.target.value)}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.65rem 0.85rem',
                      background: formData.isCito ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-card-solid)',
                      border: `1.5px solid ${formData.isCito ? '#ef4444' : 'var(--border-color)'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      marginTop: '1.5rem'
                    }}
                    onClick={() => handleCitoToggle(!formData.isCito)}
                  >
                    <input
                      type="checkbox"
                      id="kwCitoCheck"
                      checked={formData.isCito}
                      onChange={(e) => handleCitoToggle(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="kwCitoCheck" style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: formData.isCito ? '#ef4444' : 'var(--text-primary)' }}>
                      CITO / Hari Libur (+50%)
                    </label>
                  </div>
                </div>

                {/* Dynamic Fee Calculation */}
                <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Tarif Dasar: {formatRupiah(baseRate)}</span>
                    {formData.isCito && (
                      <span style={{ color: '#ef4444', fontWeight: 700, marginLeft: '0.75rem' }}>
                        + CITO 50%: {formatRupiah(citoSurcharge)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: formData.isCito ? '#ef4444' : 'var(--status-completed-text)' }}>
                    Total Honor: {formatRupiah(totalHonor)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Tanggal Pembayaran</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.tglBayar}
                    onChange={(e) => setFormData({ ...formData, tglBayar: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status Pembayaran</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Belum Dibayar">Belum Dibayar</option>
                    <option value="Sudah Dibayar">Sudah Dibayar</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Catatan / Referensi Transaksi</label>
                <textarea
                  className="form-textarea"
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  placeholder="Nomor rekening, bank transfer, atau catatan approval..."
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary">
                <Save size={16} />
                Simpan Kwitansi
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
