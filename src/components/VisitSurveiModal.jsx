import React, { useState, useEffect } from 'react';
import { X, Check, Clock, MapPin, Anchor, UserCheck, Calendar, Hourglass, Zap, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { ModalPortal } from './ModalPortal';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const DURATION_PRESETS = [1, 2, 3, 4, 5, 6, 8, 10, 12];

export function calculateEndTime(startTimeStr, durationHours) {
  if (!startTimeStr) return '';
  const [hStr, mStr] = startTimeStr.split(':');
  const hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr, 10);
  if (isNaN(hours) || isNaN(minutes)) return '';

  const dur = parseFloat(durationHours) || 1;
  const totalMinutes = Math.round(hours * 60 + minutes + dur * 60);

  const endHours = Math.floor((totalMinutes / 60) % 24);
  const endMinutes = Math.floor(totalMinutes % 60);

  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

export function autoDetectStatus(tanggal, jamBerangkat, jamSelesai) {
  if (!jamSelesai) return 'On Proses';

  const now = new Date();
  const tgl = tanggal || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [endH, endM] = jamSelesai.split(':').map(Number);
  const [year, month, day] = tgl.split('-').map(Number);

  const endDateTime = new Date(year, month - 1, day, endH || 0, endM || 0, 0);

  return now >= endDateTime ? 'Selesai' : 'On Proses';
}

const EMPTY_VISIT_FORM = {
  nama: '',
  lokasi: '',
  namaKapal: '',
  jamBerangkat: '',
  durasi: 3, // durasi dalam jam
  jamSelesai: '',
  tanggal: '',
  status: 'On Proses',
  keterangan: ''
};

export const VisitSurveiModal = ({ isOpen, onClose, onSave, initialData = null, isEdit = false }) => {
  const { masterKapal, tariffs } = useData();
  const { usersList, currentUser, role } = useAuth();

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getCurrentTimeStr = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const [form, setForm] = useState(EMPTY_VISIT_FORM);
  const [selectedShips, setSelectedShips] = useState([]);
  const [inputShipText, setInputShipText] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const initialDurasi = initialData.durasi || 3;
        const initialStart = initialData.jamBerangkat || getCurrentTimeStr();
        const initialEnd = initialData.jamSelesai || calculateEndTime(initialStart, initialDurasi);
        const initialStatus = autoDetectStatus(initialData.tanggal, initialStart, initialEnd);

        let initialShips = [];
        if (Array.isArray(initialData.ships) && initialData.ships.length > 0) {
          initialShips = initialData.ships;
        } else if (initialData.namaKapal) {
          initialShips = initialData.namaKapal.split(/\s*[\/,]\s*/).filter(Boolean);
        }
        setSelectedShips(initialShips);
        setInputShipText('');

        setForm({
          ...EMPTY_VISIT_FORM,
          ...initialData,
          durasi: initialDurasi,
          jamBerangkat: initialStart,
          jamSelesai: initialEnd,
          status: initialStatus
        });
      } else {
        const defaultStart = getCurrentTimeStr();
        const defaultDurasi = 3;
        const defaultEnd = calculateEndTime(defaultStart, defaultDurasi);
        const defaultStatus = autoDetectStatus(getTodayStr(), defaultStart, defaultEnd);

        setSelectedShips([]);
        setInputShipText('');

        setForm({
          ...EMPTY_VISIT_FORM,
          nama: currentUser?.name || '',
          tanggal: getTodayStr(),
          jamBerangkat: defaultStart,
          durasi: defaultDurasi,
          jamSelesai: defaultEnd,
          status: defaultStatus
        });
      }
    }
  }, [isOpen, initialData, currentUser]);

  const handleAddShip = (shipName) => {
    const clean = (shipName || inputShipText).trim().toUpperCase();
    if (!clean) return;
    if (!selectedShips.includes(clean)) {
      setSelectedShips((prev) => [...prev, clean]);
    }
    setInputShipText('');
  };

  const handleRemoveShip = (shipToRemove) => {
    setSelectedShips((prev) => prev.filter((s) => s !== shipToRemove));
  };

  // Recalculate jamSelesai & auto-status when jamBerangkat or durasi changes
  const handleStartTimeChange = (newStart) => {
    const end = calculateEndTime(newStart, form.durasi);
    const calculatedStatus = autoDetectStatus(form.tanggal, newStart, end);
    setForm((p) => ({
      ...p,
      jamBerangkat: newStart,
      jamSelesai: end,
      status: calculatedStatus
    }));
  };

  const handleDurationChange = (newDuration) => {
    const num = parseFloat(newDuration) || 1;
    const end = calculateEndTime(form.jamBerangkat, num);
    const calculatedStatus = autoDetectStatus(form.tanggal, form.jamBerangkat, end);
    setForm((p) => ({
      ...p,
      durasi: num,
      jamSelesai: end,
      status: calculatedStatus
    }));
  };

  const handleDateChange = (newDate) => {
    const calculatedStatus = autoDetectStatus(newDate, form.jamBerangkat, form.jamSelesai);
    setForm((p) => ({
      ...p,
      tanggal: newDate,
      status: calculatedStatus
    }));
  };

  if (!isOpen) return null;

  const surveyorOptions = (usersList || []).filter((u) => u.role === 'surveyor' || u.role === 'kacab');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nama.trim()) {
      toast.error('Nama Surveyor / Petugas harus diisi');
      return;
    }

    // Resolve final ships
    let finalShips = [...selectedShips];
    if (inputShipText.trim()) {
      const cleanInput = inputShipText.trim().toUpperCase();
      if (!finalShips.includes(cleanInput)) {
        finalShips.push(cleanInput);
      }
    }

    if (finalShips.length === 0) {
      toast.error('Minimal 1 Nama Kapal harus diisi / dipilih');
      return;
    }

    if (!form.lokasi.trim()) {
      toast.error('Lokasi survei harus diisi');
      return;
    }
    if (!form.jamBerangkat.trim()) {
      toast.error('Jam Berangkat harus diisi');
      return;
    }

    const finalEnd = form.jamSelesai || calculateEndTime(form.jamBerangkat, form.durasi);
    const finalStatus = autoDetectStatus(form.tanggal, form.jamBerangkat, finalEnd);
    const finalNamaKapal = finalShips.join(' / ');

    const result = onSave({
      ...form,
      nama: form.nama.trim(),
      namaKapal: finalNamaKapal,
      ships: finalShips,
      lokasi: form.lokasi.trim(),
      durasi: Number(form.durasi) || 1,
      jamSelesai: finalEnd,
      tanggal: form.tanggal || getTodayStr(),
      status: finalStatus
    });

    if (result !== false) {
      toast.success(isEdit ? 'Visit survei berhasil diperbarui' : 'Visit survei berhasil dicatat ke Layar Monitor!');
      onClose();
    }
  };

  return (
    <ModalPortal>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '16px',
            border: '1px solid var(--border-color, #e2e8f0)',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.2rem 1.5rem',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '8px',
                  background: 'rgba(56, 189, 248, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Clock size={18} color="#38bdf8" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                  {isEdit ? 'Edit Laporan Visit Survei' : 'Laporan Visit Survei Lapangan'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8' }}>
                  Laporan aktivitas kunjungan survei untuk pemantauan Kepala Cabang & Admin
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#cbd5e1',
                borderRadius: '6px',
                padding: '0.35rem',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* 1. Nama Surveyor */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <UserCheck size={14} color="var(--accent-primary)" />
                <span>Nama Surveyor / Petugas <span style={{ color: '#ef4444' }}>*</span></span>
              </label>
              {role === 'surveyor' ? (
                <div>
                  <input
                    className="form-input"
                    type="text"
                    value={currentUser?.name || form.nama}
                    readOnly
                    style={{
                      background: 'var(--bg-main, #f8fafc)',
                      fontWeight: 700,
                      cursor: 'not-allowed',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                    <Lock size={12} />
                    <span>Terkunci otomatis sesuai akun login surveyor ({currentUser?.name})</span>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    className="form-input"
                    type="text"
                    list="visit-surveyor-list"
                    placeholder="Pilih atau ketik nama surveyor..."
                    value={form.nama}
                    onChange={(e) => setForm((p) => ({ ...p, nama: e.target.value }))}
                    autoFocus
                    style={{ fontWeight: 700 }}
                  />
                  <datalist id="visit-surveyor-list">
                    {surveyorOptions.map((u) => (
                      <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                    ))}
                  </datalist>
                </>
              )}
            </div>

            {/* 2. Nama Kapal (Multi-Kapal) & Lokasi Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Anchor size={14} color="var(--accent-primary)" />
                    <span>Nama Kapal (Multi) <span style={{ color: '#ef4444' }}>*</span></span>
                  </span>
                  {selectedShips.length > 0 && (
                    <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 800 }}>
                      {selectedShips.length} Kapal Terpilih
                    </span>
                  )}
                </label>

                {/* Input + Tombol Tambah */}
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <input
                    className="form-input"
                    type="text"
                    list="visit-ship-list"
                    placeholder="Pilih / ketik nama kapal..."
                    value={inputShipText}
                    onChange={(e) => setInputShipText(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddShip();
                      }
                    }}
                    style={{ textTransform: 'uppercase', fontWeight: 700, flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAddShip()}
                    disabled={!inputShipText.trim()}
                    style={{ fontWeight: 800, padding: '0 0.65rem', whiteSpace: 'nowrap' }}
                    title="Tambah kapal ke daftar kunjungan"
                  >
                    + Tambah
                  </button>
                </div>

                <datalist id="visit-ship-list">
                  {(masterKapal || []).slice(0, 150).map((k) => (
                    <option key={k.id} value={k.namaKapal}>{k.namaKapal} {k.pemohon ? `(${k.pemohon})` : ''}</option>
                  ))}
                </datalist>

                {/* Chips / Badges Kapal Terpilih */}
                {selectedShips.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.45rem' }}>
                    {selectedShips.map((ship, sIdx) => (
                      <span
                        key={sIdx}
                        style={{
                          background: 'rgba(2, 132, 199, 0.12)',
                          border: '1px solid rgba(2, 132, 199, 0.35)',
                          color: '#0284c7',
                          fontWeight: 800,
                          fontSize: '0.76rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <Anchor size={12} />
                        <span>{ship}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveShip(ship)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            marginLeft: '0.2rem'
                          }}
                          title="Hapus kapal"
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MapPin size={14} color="var(--accent-primary)" />
                  <span>Lokasi Survei <span style={{ color: '#ef4444' }}>*</span></span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  list="visit-location-list"
                  placeholder="Contoh: Dwikora, Wajok, Jungkat..."
                  value={form.lokasi}
                  onChange={(e) => setForm((p) => ({ ...p, lokasi: e.target.value }))}
                />
                <datalist id="visit-location-list">
                  {(tariffs || []).map((t) => (
                    <option key={t.id} value={t.tujuan || t.name}>{t.tujuan || t.name} {t.rincian ? `(${t.rincian})` : ''}</option>
                  ))}
                </datalist>
              </div>
            </div>

            {/* 3. WAKTU & DURASI (MENGGUNAKAN DURASI OTOMATIS) */}
            <div
              style={{
                background: 'var(--bg-main, #f8fafc)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {/* Jam Berangkat */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={14} color="#0284c7" />
                    <span>Jam Berangkat <span style={{ color: '#ef4444' }}>*</span></span>
                  </label>
                  <input
                    className="form-input"
                    type="time"
                    value={form.jamBerangkat}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    style={{ fontWeight: 700, fontSize: '0.95rem' }}
                  />
                </div>

                {/* Durasi Jam */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Hourglass size={14} color="#f59e0b" />
                    <span>Durasi Survei (Jam) <span style={{ color: '#ef4444' }}>*</span></span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <input
                      className="form-input"
                      type="number"
                      min="0.5"
                      max="24"
                      step="0.5"
                      value={form.durasi}
                      onChange={(e) => handleDurationChange(e.target.value)}
                      style={{ fontWeight: 700, fontSize: '0.95rem' }}
                    />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>Jam</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Tanggal Visit & Status Terkunci (Otomatis) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={14} color="var(--accent-primary)" />
                  <span>Tanggal Visit</span>
                </label>
                <input
                  className="form-input"
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Lock size={13} color="var(--text-muted)" />
                  <span>Status Aktivitas (Otomatis)</span>
                </label>
                <div
                  style={{
                    height: '42px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    background: 'var(--bg-main, #f8fafc)',
                    padding: '0 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'not-allowed',
                    opacity: 0.95
                  }}
                  title="Status ditentukan otomatis dari jam berangkat & durasi"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.86rem', fontWeight: 800 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: form.status === 'On Proses' ? '#0284c7' : '#10b981' }}></span>
                    <span style={{ color: form.status === 'On Proses' ? '#0284c7' : '#059669' }}>
                      {form.status === 'On Proses' ? 'On Proses' : 'Selesai'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    🔒 Otomatis
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Keterangan Opsional */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Keterangan / Jenis Pekerjaan (Opsional)</label>
              <input
                className="form-input"
                type="text"
                placeholder="Contoh: Survei Tahunan Lambung & Mesin"
                value={form.keterangan || ''}
                onChange={(e) => setForm((p) => ({ ...p, keterangan: e.target.value }))}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary" style={{ minWidth: '90px' }}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary" style={{ minWidth: '140px', display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700 }}>
                <Check size={16} />
                {isEdit ? 'Simpan Perubahan' : 'Tampilkan di Layar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
