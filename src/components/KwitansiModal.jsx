import React, { useState, useEffect } from 'react';
import { X, Save, Calculator, Plane, Building2, ShieldCheck, Sparkles, MapPin, Calendar, FileText } from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatRupiah } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';
import { sanitizeFormData, unescapeHtml } from '../utils/security';

export const KwitansiModal = ({ isOpen, onClose, editItem = null }) => {
  const { suratTugas, addKwitansiHonor, updateKwitansiHonor } = useData();

  const [formData, setFormData] = useState({
    suratId: '',
    penerima: '',
    lokasi: '',
    namaKapal: '',
    tarifDasar: 3000000,
    isCito: false,
    jumlahHariLibur: 0,
    tiketHotel: 0,
    tiketPesawatTaxi: 0,
    jumlah: 3000000,
    tglBayar: '',
    status: 'Belum Dibayar',
    catatan: ''
  });

  useEffect(() => {
    if (editItem) {
      const linkedSurat = suratTugas.find((s) => s.id === editItem.suratId);
      const base = Number(editItem.tarifDasar) || Number(linkedSurat?.tarifDasar) || 3000000;
      const hotel = Number(editItem.tiketHotel) || Number(linkedSurat?.tiketHotel) || 0;
      const flight = Number(editItem.tiketPesawatTaxi) || Number(editItem.biayaTiket) || Number(linkedSurat?.tiketPesawatTaxi) || Number(linkedSurat?.biayaTiket) || 0;
      const cito = !!editItem.isCito || !!linkedSurat?.isCito;
      const libur = Number(editItem.jumlahHariLibur) || Number(linkedSurat?.jumlahHariLibur) || 0;

      const citoMultiplier = libur > 0 ? (0.5 * libur) : (cito ? 0.5 : 0);
      const citoFee = Math.round(base * citoMultiplier);
      const total = Number(editItem.jumlah) || (base + citoFee + hotel + flight);

      setFormData({
        ...editItem,
        penerima: editItem.penerima || linkedSurat?.petugas || '',
        namaKapal: editItem.namaKapal || linkedSurat?.namaKapal || '',
        lokasi: editItem.lokasi || linkedSurat?.lokasi || linkedSurat?.tempatSurvey || '',
        tarifDasar: base,
        isCito: cito,
        jumlahHariLibur: libur,
        tiketHotel: hotel,
        tiketPesawatTaxi: flight,
        jumlah: total,
        tglBayar: editItem.tglBayar || new Date().toISOString().split('T')[0],
        status: editItem.status || 'Belum Dibayar',
        catatan: editItem.catatan || ''
      });
    } else {
      const defaultSurat = suratTugas.length > 0 ? suratTugas[0] : null;
      const base = Number(defaultSurat?.tarifDasar) || 3000000;
      const hotel = Number(defaultSurat?.tiketHotel) || 0;
      const flight = Number(defaultSurat?.tiketPesawatTaxi) || Number(defaultSurat?.biayaTiket) || 0;
      const cito = !!defaultSurat?.isCito;
      const libur = Number(defaultSurat?.jumlahHariLibur) || 0;

      const citoMultiplier = libur > 0 ? (0.5 * libur) : (cito ? 0.5 : 0);
      const citoFee = Math.round(base * citoMultiplier);
      const total = base + citoFee + hotel + flight;

      setFormData({
        suratId: defaultSurat ? defaultSurat.id : '',
        penerima: defaultSurat ? defaultSurat.petugas : '',
        namaKapal: defaultSurat ? defaultSurat.namaKapal : '',
        lokasi: defaultSurat ? (defaultSurat.tempatSurvey || defaultSurat.lokasi) : '',
        tarifDasar: base,
        isCito: cito,
        jumlahHariLibur: libur,
        tiketHotel: hotel,
        tiketPesawatTaxi: flight,
        jumlah: total,
        tglBayar: new Date().toISOString().split('T')[0],
        status: 'Belum Dibayar',
        catatan: defaultSurat ? `Honorarium Survei ${defaultSurat.namaKapal} (${defaultSurat.tempatSurvey || defaultSurat.lokasi})` : ''
      });
    }
  }, [editItem, isOpen, suratTugas]);

  if (!isOpen) return null;

  const handleSuratChange = (suratId) => {
    const selectedSurat = suratTugas.find((s) => s.id === suratId);
    if (selectedSurat) {
      const base = Number(selectedSurat.tarifDasar) || 3000000;
      const hotel = Number(selectedSurat.tiketHotel) || 0;
      const flight = Number(selectedSurat.tiketPesawatTaxi) || Number(selectedSurat.biayaTiket) || 0;
      const cito = !!selectedSurat.isCito || Number(selectedSurat.jumlahHariLibur) > 0;
      const libur = Number(selectedSurat.jumlahHariLibur) || 0;

      const citoMultiplier = libur > 0 ? (0.5 * libur) : (cito ? 0.5 : 0);
      const citoFee = Math.round(base * citoMultiplier);
      const total = base + citoFee + hotel + flight;

      setFormData((prev) => ({
        ...prev,
        suratId,
        penerima: selectedSurat.petugas || prev.penerima,
        namaKapal: selectedSurat.namaKapal || prev.namaKapal,
        lokasi: selectedSurat.tempatSurvey || selectedSurat.lokasi || prev.lokasi,
        tarifDasar: base,
        isCito: cito,
        jumlahHariLibur: libur,
        tiketHotel: hotel,
        tiketPesawatTaxi: flight,
        jumlah: total,
        catatan: `Honorarium Survei ${selectedSurat.namaKapal} (${selectedSurat.tempatSurvey || selectedSurat.lokasi})`
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        suratId: ''
      }));
    }
  };

  // Recalculate Total
  const calculateTotal = (base, cito, libur, hotel, flight) => {
    const b = Number(base) || 0;
    const h = Number(hotel) || 0;
    const f = Number(flight) || 0;
    const l = Number(libur) || 0;
    const citoMultiplier = l > 0 ? (0.5 * l) : (cito ? 0.5 : 0);
    const citoFee = Math.round(b * citoMultiplier);
    return b + citoFee + h + f;
  };

  const handleBaseRateChange = (val) => {
    const base = Number(val) || 0;
    const total = calculateTotal(base, formData.isCito, formData.jumlahHariLibur, formData.tiketHotel, formData.tiketPesawatTaxi);
    setFormData((prev) => ({ ...prev, tarifDasar: base, jumlah: total }));
  };

  const handleHotelChange = (val) => {
    const hotel = Number(val) || 0;
    const total = calculateTotal(formData.tarifDasar, formData.isCito, formData.jumlahHariLibur, hotel, formData.tiketPesawatTaxi);
    setFormData((prev) => ({ ...prev, tiketHotel: hotel, jumlah: total }));
  };

  const handleFlightChange = (val) => {
    const flight = Number(val) || 0;
    const total = calculateTotal(formData.tarifDasar, formData.isCito, formData.jumlahHariLibur, formData.tiketHotel, flight);
    setFormData((prev) => ({ ...prev, tiketPesawatTaxi: flight, jumlah: total }));
  };

  const handleCitoToggle = (checked) => {
    const total = calculateTotal(formData.tarifDasar, checked, formData.jumlahHariLibur, formData.tiketHotel, formData.tiketPesawatTaxi);
    setFormData((prev) => ({ ...prev, isCito: checked, jumlah: total }));
  };

  const handleLiburChange = (val) => {
    const libur = Number(val) || 0;
    const cito = libur > 0 ? true : formData.isCito;
    const total = calculateTotal(formData.tarifDasar, cito, libur, formData.tiketHotel, formData.tiketPesawatTaxi);
    setFormData((prev) => ({ ...prev, jumlahHariLibur: libur, isCito: cito, jumlah: total }));
  };

  const baseRate = Number(formData.tarifDasar) || 0;
  const citoMultiplier = Number(formData.jumlahHariLibur) > 0 ? (0.5 * Number(formData.jumlahHariLibur)) : (formData.isCito ? 0.5 : 0);
  const citoSurcharge = Math.round(baseRate * citoMultiplier);
  const hotelFee = Number(formData.tiketHotel) || 0;
  const flightFee = Number(formData.tiketPesawatTaxi) || 0;
  const grandTotal = baseRate + citoSurcharge + hotelFee + flightFee;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.penerima || !grandTotal) {
      alert('Mohon lengkapi Nama Penerima dan Jumlah Honorarium!');
      return;
    }

    const payload = sanitizeFormData({
      ...formData,
      tarifDasar: baseRate,
      tiketHotel: hotelFee,
      tiketPesawatTaxi: flightFee,
      biayaTiket: hotelFee + flightFee,
      jumlah: grandTotal
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
        <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calculator size={20} color="var(--accent-primary)" />
              <h3 className="modal-title">{editItem ? 'Ubah Kwitansi Honor' : 'Buat Kwitansi Honor Baru'}</h3>
            </div>
            <button className="btn btn-secondary btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              {/* Surat Tugas Selector */}
              <div className="form-group">
                <label className="form-label">Pilih Surat Tugas / SPS Terkait</label>
                <select
                  className="form-select"
                  value={formData.suratId}
                  onChange={(e) => handleSuratChange(e.target.value)}
                >
                  <option value="">-- Tanpa Relasi Surat Tugas --</option>
                  {suratTugas.map((st) => (
                    <option key={st.id} value={st.id}>
                      {unescapeHtml(st.nomor)} — {st.namaKapal || 'Kapal'} ({st.petugas})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Nama Penerima Honor *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.penerima}
                    onChange={(e) => setFormData({ ...formData, penerima: e.target.value })}
                    placeholder="Contoh: ALFIAN BONE PUTRA"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nama Kapal / Objek</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.namaKapal}
                    onChange={(e) => setFormData({ ...formData, namaKapal: e.target.value })}
                    placeholder="Contoh: BAHARI 279"
                  />
                </div>
              </div>

              {/* Rincian Komponen Biaya & Honorarium */}
              <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color-strong)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={16} />
                  <span>RINCIAN TARIF, CITO & REIMBURSEMENT TIKET</span>
                </div>

                {/* 1. Tarif Dasar & CITO */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">1. Tarif Dasar Lokasi (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      step="100000"
                      className="form-input"
                      value={formData.tarifDasar}
                      onChange={(e) => handleBaseRateChange(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">2. Jumlah Hari Libur (CITO +50%)</label>
                    <input
                      type="number"
                      min="0"
                      max="14"
                      className="form-input"
                      value={formData.jumlahHariLibur}
                      onChange={(e) => handleLiburChange(e.target.value)}
                      placeholder="0 (Jika ada hari libur)"
                    />
                  </div>
                </div>

                {/* 2. Tiket Hotel & Tiket Pesawat/Taxi */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Building2 size={15} color="#0284c7" />
                      <span>3. Tiket Hotel / Penginapan (Rp)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50000"
                      className="form-input"
                      value={formData.tiketHotel}
                      onChange={(e) => handleHotelChange(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Plane size={15} color="#059669" />
                      <span>4. Tiket Pesawat dan Taxi (Rp)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50000"
                      className="form-input"
                      value={formData.tiketPesawatTaxi}
                      onChange={(e) => handleFlightChange(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Summary Breakdown */}
                <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--border-color)', fontSize: '0.85rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    <div>• Tarif Dasar: <strong>{formatRupiah(baseRate)}</strong></div>
                    <div>• CITO / Libur: <strong style={{ color: citoSurcharge > 0 ? '#ef4444' : 'inherit' }}>{formatRupiah(citoSurcharge)}</strong></div>
                    <div>• Tiket Hotel: <strong>{formatRupiah(hotelFee)}</strong></div>
                    <div>• Tiket Pesawat & Taxi: <strong>{formatRupiah(flightFee)}</strong></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1.5px solid var(--border-color)' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Total Honorarium & Reimbursement:</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent-primary)' }}>
                      {formatRupiah(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Pembayaran & Approval */}
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
                  <label className="form-label">Status Pembayaran / Approval</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Belum Dibayar">Belum Dibayar (Draft / Menunggu Verifikasi)</option>
                    <option value="Sudah Dibayar">Sudah Dibayar (Disetujui Keuangan)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Catatan / Referensi Transaksi</label>
                <textarea
                  className="form-textarea"
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  placeholder="Nomor rekening, bank transfer, invoice penginapan, atau catatan approval..."
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
