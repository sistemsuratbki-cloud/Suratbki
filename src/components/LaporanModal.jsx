import React, { useState, useEffect } from 'react';
import { X, Save, Anchor, Printer, Lock } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { isEditWindowExpired } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';

export const LaporanModal = ({ isOpen, onClose, editItem = null, onPrintSuratTugas = null }) => {
  const { suratTugas, addLaporanSurvei, updateLaporanSurvei, updateSuratTugas, updateKwitansiHonor, kwitansiHonor, requestEditApproval } = useData();
  const { role } = useAuth();

  const [formData, setFormData] = useState({
    suratId: '',
    namaKapal: '',
    petugas: '',
    tglLapor: '',
    isCito: false,
    hasil: '',
    status: 'Draf'
  });

  useEffect(() => {
    if (editItem) {
      setFormData({
        ...editItem,
        isCito: !!editItem.isCito
      });
    } else {
      const defaultSurat = suratTugas.length > 0 ? suratTugas[0] : null;
      setFormData({
        suratId: defaultSurat ? defaultSurat.id : '',
        namaKapal: defaultSurat ? (defaultSurat.namaKapal || '') : '',
        petugas: defaultSurat ? defaultSurat.petugas : '',
        tglLapor: new Date().toISOString().split('T')[0],
        isCito: defaultSurat ? !!defaultSurat.isCito : false,
        hasil: '',
        status: 'Draf'
      });
    }
  }, [editItem, isOpen, suratTugas]);

  if (!isOpen) return null;

  const isExpired = editItem ? isEditWindowExpired(editItem.tglLapor) : false;
  const isLockedForSurveyor = role === 'surveyor' && isExpired && !editItem?.isUnlockedByAdmin;

  const handleSuratChange = (suratId) => {
    const selectedSurat = suratTugas.find((s) => s.id === suratId);
    setFormData((prev) => ({
      ...prev,
      suratId,
      namaKapal: selectedSurat ? selectedSurat.namaKapal : prev.namaKapal,
      petugas: selectedSurat ? selectedSurat.petugas : prev.petugas,
      isCito: selectedSurat ? !!selectedSurat.isCito : prev.isCito
    }));
  };

  const selectedSuratObj = suratTugas.find((s) => s.id === formData.suratId);

  const processSave = () => {
    if (!formData.namaKapal || !formData.petugas || !formData.hasil) {
      alert('Mohon isi Nama Kapal, Nama Surveyor, dan Ringkasan Hasil Survei!');
      return null;
    }

    let targetSurat = null;
    let finalSuratId = formData.suratId;

    if (finalSuratId) {
      const existingSurat = suratTugas.find((s) => s.id === finalSuratId);
      if (existingSurat) {
        targetSurat = existingSurat;
        const baseRate = existingSurat.tarifDasar || 3500000;
        const totalHonor = formData.isCito ? Math.round(baseRate * 1.5) : baseRate;

        updateSuratTugas(existingSurat.id, {
          ...existingSurat,
          namaKapal: formData.namaKapal,
          petugas: formData.petugas,
          isCito: formData.isCito,
          jumlahEstimasi: totalHonor
        });

        const linkedKwitansi = kwitansiHonor.find((k) => k.suratId === existingSurat.id);
        if (linkedKwitansi) {
          updateKwitansiHonor(linkedKwitansi.id, {
            ...linkedKwitansi,
            isCito: formData.isCito,
            jumlah: totalHonor
          });
        }
      }
    } else {
      const existingSurat = suratTugas.find(s => s.namaKapal?.toLowerCase() === formData.namaKapal?.toLowerCase());
      if (existingSurat) {
        targetSurat = existingSurat;
        finalSuratId = existingSurat.id;
      } else {
        const nextNum = String(Math.floor(Math.random() * 900) + 100);
        targetSurat = addSuratTugas({
          nomor: `ST/MAR/10/2026/${nextNum}`,
          namaKapal: formData.namaKapal,
          perihal: `Survei Kelayakan & Inspeksi ${formData.namaKapal}`,
          petugas: formData.petugas,
          lokasi: 'Pelabuhan Dwikora Pontianak',
          tarifDasar: 3500000,
          isCito: formData.isCito,
          biayaTiket: 0,
          kategoriTransportasi: 'Pesawat Terbang',
          tglMulai: formData.tglLapor || new Date().toISOString().split('T')[0],
          tglSelesai: formData.tglLapor || new Date().toISOString().split('T')[0],
          status: 'Berjalan',
          catatan: formData.hasil
        });
        finalSuratId = targetSurat.id;
      }
    }

    const payloadToSave = {
      ...formData,
      suratId: finalSuratId
    };

    if (editItem) {
      updateLaporanSurvei(editItem.id, payloadToSave);
    } else {
      addLaporanSurvei(payloadToSave);
    }
    return targetSurat;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const saved = processSave();
    if (saved !== null) {
      onClose();
    }
  };

  const handleSaveAndPrintSurat = (e) => {
    e.preventDefault();
    const targetSurat = processSave();
    if (targetSurat !== null) {
      onClose();
      if (onPrintSuratTugas) {
        onPrintSuratTugas(targetSurat);
      }
    }
  };

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Anchor size={20} color="var(--accent-primary)" />
              <h3 className="modal-title">{editItem ? 'Ubah Laporan Survei Kapal' : 'Catat Laporan Survei Kapal Baru'}</h3>
            </div>
            <button className="btn btn-secondary btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {isLockedForSurveyor && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1.5px solid #ef4444', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.1rem', color: '#dc2626', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Lock size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>Akses Ubah Data Terkunci (&gt; 2 Hari)</div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: '0.1rem' }}>
                      Batas waktu edit mandiri 2 hari telah berakhir. Mengubah data ini memerlukan persetujuan Admin/Kacab.
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Nama Kapal (Vessel Name) *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.namaKapal}
                    onChange={(e) => setFormData({ ...formData, namaKapal: e.target.value })}
                    placeholder="Contoh: MV Samudra Jaya 08"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nama Marine Surveyor *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.petugas}
                    onChange={(e) => setFormData({ ...formData, petugas: e.target.value })}
                    placeholder="Contoh: Budi Santoso, ST"
                    required
                  />
                </div>
              </div>

              {/* CITO Checkbox Section for Surveyor */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  background: formData.isCito ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-card-solid)',
                  border: `1.5px solid ${formData.isCito ? '#ef4444' : 'var(--border-color-strong)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  marginBottom: '1.1rem'
                }}
                onClick={() => setFormData({ ...formData, isCito: !formData.isCito })}
              >
                <input
                  type="checkbox"
                  id="lapCitoCheck"
                  checked={formData.isCito}
                  onChange={(e) => setFormData({ ...formData, isCito: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div>
                  <label
                    htmlFor="lapCitoCheck"
                    style={{
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: formData.isCito ? '#ef4444' : 'var(--text-primary)'
                    }}
                  >
                    ⚡ CITO / Hari Libur (Surcharge Honorarium +50%)
                  </label>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                    Centang opsi ini jika inspeksi kapal dilakukan secara mendesak (CITO) atau pada hari libur.
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Tanggal Inspeksi *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.tglLapor}
                    onChange={(e) => setFormData({ ...formData, tglLapor: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status Laporan</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Draf">Draf</option>
                    <option value="Terkirim">Terkirim</option>
                    <option value="Disetujui">Disetujui</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Hasil & Catatan Kelayakan Kapal *</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '120px' }}
                  value={formData.hasil}
                  onChange={(e) => setFormData({ ...formData, hasil: e.target.value })}
                  placeholder="Temuan fisik lambung, kondisi mesin utama, kesiapan perlengkapan SOLAS..."
                  required
                />
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Batal
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {!isLockedForSurveyor && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', fontWeight: 700 }}
                    onClick={handleSaveAndPrintSurat}
                    title="Simpan Laporan dan langsung cetak Surat Tugas terkait"
                  >
                    <Printer size={16} color="var(--accent-primary)" />
                    <span>Simpan & Cetak Surat Tugas</span>
                  </button>
                )}

                {isLockedForSurveyor ? (
                  <button
                    type="button"
                    className="btn btn-warning"
                    style={{ background: '#f59e0b', borderColor: '#f59e0b', color: '#ffffff', fontWeight: 700 }}
                    onClick={() => {
                      if (editItem) {
                        requestEditApproval(editItem.id);
                        alert('Permintaan izin edit telah dikirim ke Admin/Kacab!');
                        onClose();
                      }
                    }}
                  >
                    <Lock size={16} />
                    <span>Minta Izin Edit ke Admin</span>
                  </button>
                ) : (
                  <button type="submit" className="btn btn-primary">
                    <Save size={16} />
                    <span>Simpan Laporan Survei</span>
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
