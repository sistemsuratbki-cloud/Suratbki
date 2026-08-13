import React, { useState, useEffect } from 'react';
import { X, Save, Anchor, Ticket, Paperclip, Printer } from 'lucide-react';
import { useData } from '../context/DataContext';
import { LOCATION_TARIFFS, calculateHonorFee } from '../utils/tariffData';
import { formatRupiah } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';

import { sanitizeFormData } from '../utils/security';

export const SuratTugasModal = ({ isOpen, onClose, editItem = null, onPrint = null }) => {
  const { addSuratTugas, updateSuratTugas, adminSettings } = useData();

  const [formData, setFormData] = useState({
    nomor: '',
    namaKapal: '',
    perihal: '',
    petugas: '',
    pangkat: 'GRADE 6 A',
    jabatan: 'SURVEYOR',
    lokasi: LOCATION_TARIFFS[0].name,
    tarifDasar: LOCATION_TARIFFS[0].rate,
    isCito: false,
    biayaTiket: 0,
    kategoriTransportasi: 'Pesawat Terbang',
    saranaTransportasi: 'UDARA, DARAT DAN AIR',
    keteranganLain: 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
    kepalaCabang: adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
    nup: adminSettings?.nup || '48199-KI',
    fileTiketName: '',
    tglMulai: '',
    tglSelesai: '',
    status: 'Belum Mulai',
    catatan: ''
  });

  useEffect(() => {
    if (editItem) {
      setFormData({
        ...editItem,
        pangkat: editItem.pangkat || 'GRADE 6 A',
        jabatan: editItem.jabatan || 'SURVEYOR',
        saranaTransportasi: editItem.saranaTransportasi || 'UDARA, DARAT DAN AIR',
        keteranganLain: editItem.keteranganLain || 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
        kepalaCabang: editItem.kepalaCabang || adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
        nup: editItem.nup || adminSettings?.nup || '48199-KI',
        tarifDasar: editItem.tarifDasar || 3500000,
        isCito: !!editItem.isCito,
        biayaTiket: editItem.biayaTiket || 0,
        kategoriTransportasi: editItem.kategoriTransportasi || 'Pesawat Terbang',
        fileTiketName: editItem.fileTiketName || ''
      });
    } else {
      const nextNum = String(Math.floor(Math.random() * 900) + 100);
      setFormData({
        nomor: `A 0    /SV.${nextNum}/PK/KI-26`,
        namaKapal: '',
        perihal: '',
        petugas: '',
        pangkat: 'GRADE 6 A',
        jabatan: 'SURVEYOR',
        lokasi: LOCATION_TARIFFS[0].name,
        tarifDasar: LOCATION_TARIFFS[0].rate,
        isCito: false,
        biayaTiket: 1250000,
        kategoriTransportasi: 'Pesawat Terbang',
        saranaTransportasi: 'UDARA, DARAT DAN AIR',
        keteranganLain: 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
        kepalaCabang: adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
        nup: adminSettings?.nup || '48199-KI',
        fileTiketName: '',
        tglMulai: new Date().toISOString().split('T')[0],
        tglSelesai: new Date().toISOString().split('T')[0],
        status: 'Belum Mulai',
        catatan: ''
      });
    }
  }, [editItem, isOpen, adminSettings]);

  if (!isOpen) return null;

  const handleLocationChange = (locName) => {
    const matched = LOCATION_TARIFFS.find((t) => t.name === locName);
    const newRate = matched ? matched.rate : formData.tarifDasar;
    setFormData((prev) => ({
      ...prev,
      lokasi: locName,
      tarifDasar: newRate
    }));
  };

  const handleTicketFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        fileTiketName: file.name
      }));
    }
  };

  const { baseRate, citoSurcharge } = calculateHonorFee(formData.tarifDasar, formData.isCito);
  const ticketFee = Number(formData.biayaTiket) || 0;
  const totalEstimasiGrand = baseRate + citoSurcharge + ticketFee;

  const processSave = () => {
    if (!formData.nomor || !formData.namaKapal || !formData.perihal || !formData.petugas) {
      alert('Mohon isi Nomor Surat, Nama Kapal, Perihal, dan Nama Surveyor!');
      return null;
    }

    const payload = sanitizeFormData({
      ...formData,
      tarifDasar: baseRate,
      biayaTiket: ticketFee,
      jumlahEstimasi: totalEstimasiGrand
    });

    let savedItem = payload;
    if (editItem) {
      updateSuratTugas(editItem.id, payload);
      savedItem = { ...editItem, ...payload };
    } else {
      savedItem = addSuratTugas(payload);
    }
    return savedItem;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const saved = processSave();
    if (saved) {
      onClose();
    }
  };

  const handleSaveAndPrint = (e) => {
    e.preventDefault();
    const saved = processSave();
    if (saved) {
      onClose();
      if (onPrint) {
        onPrint(saved);
      }
    }
  };

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Anchor size={20} color="var(--accent-primary)" />
              <h3 className="modal-title">{editItem ? 'Ubah Surat Tugas Survei Kapal' : 'Buat Surat Tugas Survei Kapal Baru'}</h3>
            </div>
            <button className="btn btn-secondary btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Nomor Surat Tugas *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nomor}
                    onChange={(e) => setFormData({ ...formData, nomor: e.target.value })}
                    placeholder="Contoh: ST/MAR/10/2026/005"
                    required
                  />
                </div>

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
              </div>

              <div className="form-group">
                <label className="form-label">Perihal / Jenis Survei Kelayakan *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.perihal}
                  onChange={(e) => setFormData({ ...formData, perihal: e.target.value })}
                  placeholder="Contoh: Survei Kelayakan Lambung, Konstruksi & Sertifikasi SOLAS"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">1. Nama Class Surveyor *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.petugas}
                    onChange={(e) => setFormData({ ...formData, petugas: e.target.value })}
                    placeholder="Contoh: ALFIAN BONE PUTRA"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">2. Pangkat / Grade *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.pangkat}
                    onChange={(e) => setFormData({ ...formData, pangkat: e.target.value })}
                    placeholder="Contoh: GRADE 6 A"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">3. Jabatan *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.jabatan}
                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                    placeholder="Contoh: SURVEYOR"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">8. Sarana Transportasi *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.saranaTransportasi}
                    onChange={(e) => setFormData({ ...formData, saranaTransportasi: e.target.value })}
                    placeholder="Contoh: UDARA, DARAT DAN AIR"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">9. Keterangan Lain (Pembiayaan) *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.keteranganLain}
                    onChange={(e) => setFormData({ ...formData, keteranganLain: e.target.value })}
                    placeholder="Catatan pembiayaan BKI..."
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-main)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color-strong)', marginBottom: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Penandatangan: Nama Kepala Cabang *</label>
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', background: 'var(--accent-light)', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: 700 }}>
                      ⚙️ Otomatis Admin
                    </span>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ background: 'var(--bg-card-solid)', fontWeight: 700, color: 'var(--text-primary)' }}
                    value={adminSettings?.kepalaCabang || formData.kepalaCabang}
                    onChange={(e) => setFormData({ ...formData, kepalaCabang: e.target.value })}
                    placeholder="MUHSON NURROCHMAT"
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>NUP Kepala Cabang *</label>
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', background: 'var(--accent-light)', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: 700 }}>
                      ⚙️ Otomatis Admin
                    </span>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ background: 'var(--bg-card-solid)', fontWeight: 700, color: 'var(--text-primary)' }}
                    value={adminSettings?.nup || formData.nup}
                    onChange={(e) => setFormData({ ...formData, nup: e.target.value })}
                    placeholder="48199-KI"
                    required
                  />
                </div>
              </div>

              {/* Location Tariff & CITO Section */}
              <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color-strong)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
                    Pilih Lokasi Pelabuhan / Galangan (Menentukan Tarif Dasar)
                  </label>
                  <select
                    className="form-select"
                    value={formData.lokasi}
                    onChange={(e) => handleLocationChange(e.target.value)}
                  >
                    {LOCATION_TARIFFS.map((loc) => (
                      <option key={loc.id} value={loc.name}>
                        {loc.name} — ({formatRupiah(loc.rate)})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Tarif Dasar Lokasi (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      step="100000"
                      className="form-input"
                      value={formData.tarifDasar}
                      onChange={(e) => setFormData({ ...formData, tarifDasar: Number(e.target.value) || 0 })}
                    />
                  </div>

                  {/* CITO / Hari Libur Checkbox */}
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
                    onClick={() => setFormData({ ...formData, isCito: !formData.isCito })}
                  >
                    <input
                      type="checkbox"
                      id="citoCheck"
                      checked={formData.isCito}
                      onChange={(e) => setFormData({ ...formData, isCito: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="citoCheck" style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: formData.isCito ? '#ef4444' : 'var(--text-primary)' }}>
                      CITO / Hari Libur (+50%)
                    </label>
                  </div>
                </div>
              </div>

              {/* Travel Ticket Upload & Price Section */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color-strong)',
                  padding: '1.15rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.1rem'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--accent-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Ticket size={16} />
                  <span>Tiket Perjalanan & Biaya Transportasi</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.85rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Nominal Biaya Tiket (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      step="25000"
                      className="form-input"
                      value={formData.biayaTiket}
                      onChange={(e) => setFormData({ ...formData, biayaTiket: Number(e.target.value) || 0 })}
                      placeholder="Contoh: 1250000"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Moda Transportasi</label>
                    <select
                      className="form-select"
                      value={formData.kategoriTransportasi}
                      onChange={(e) => setFormData({ ...formData, kategoriTransportasi: e.target.value })}
                    >
                      <option value="Pesawat Terbang">✈️ Pesawat Terbang</option>
                      <option value="Kapal Laut / Speedboat">🚢 Kapal Laut / Speedboat</option>
                      <option value="Kereta Api">🚆 Kereta Api</option>
                      <option value="Travel / Mobil Dinas">🚗 Travel / Mobil Dinas</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Upload Berkas / Foto Tiket Perjalanan (Foto/PDF)</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="form-input"
                    onChange={handleTicketFileUpload}
                    style={{ padding: '0.4rem' }}
                  />
                  {formData.fileTiketName && (
                    <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Paperclip size={13} />
                      <span>File Terlampir: {formData.fileTiketName}</span>
                    </div>
                  )}
                </div>

                {/* Grand Total Summary */}
                <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)', fontSize: '0.825rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span>Honor: {formatRupiah(baseRate + citoSurcharge)}</span>
                    {ticketFee > 0 && <span style={{ color: '#10b981', fontWeight: 700, marginLeft: '0.5rem' }}>+ Tiket: {formatRupiah(ticketFee)}</span>}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    Total Estimasi: {formatRupiah(totalEstimasiGrand)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Tanggal Mulai *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.tglMulai}
                    onChange={(e) => setFormData({ ...formData, tglMulai: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tanggal Selesai *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.tglSelesai}
                    onChange={(e) => setFormData({ ...formData, tglSelesai: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Status Tugas</label>
                <select
                  className="form-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Belum Mulai">Belum Mulai</option>
                  <option value="Berjalan">Berjalan</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Catatan Instruksi</label>
                <textarea
                  className="form-textarea"
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  placeholder="Instruksi khusus inspeksi (ketebalan plat, sea trial, pengujian pompa fire fighting)..."
                />
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Batal
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', fontWeight: 700 }}
                  onClick={handleSaveAndPrint}
                  title="Simpan data dan langsung cetak PDF Surat Tugas"
                >
                  <Printer size={16} color="var(--accent-primary)" />
                  <span>Simpan & Cetak Surat Tugas</span>
                </button>

                <button type="submit" className="btn btn-primary">
                  <Save size={16} />
                  <span>Simpan Surat Tugas</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
