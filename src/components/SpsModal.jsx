import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import {
  X,
  Save,
  Send,
  Anchor,
  FileCheck2,
  Calendar,
  MapPin,
  User,
  Plus,
  Trash2,
  Sparkles
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ModalPortal } from './ModalPortal';
import MultiSurveySelect from './MultiSurveySelect';
import ShipDatabaseSearchSelect from './ShipDatabaseSearchSelect';
import { extractShipDatabase } from '../utils/shipDatabase';

export const SpsModal = ({ isOpen, onClose, editItem = null }) => {
  const { addSpsBatch, updateSuratTugas, suratTugas, laporanSurvei, tariffs } = useData();
  const { usersList, currentUser, role } = useAuth();

  const activeTariffs = tariffs && tariffs.length > 0 ? tariffs : [];
  const defaultLocation = activeTariffs[0]?.tujuan || activeTariffs[0]?.name || 'WAJOK';

  const shipDatabase = useMemo(
    () => extractShipDatabase(suratTugas, laporanSurvei),
    [suratTugas, laporanSurvei]
  );

  const surveyorUsers = useMemo(
    () => (usersList || []).filter((u) => u.role === 'surveyor' || u.role === 'kacab'),
    [usersList]
  );

  // Ship rows state: [{ id, namaKapal, noAgenda }]
  const [ships, setShips] = useState([
    { id: 'ship-1', namaKapal: '', noAgenda: '' }
  ]);

  const [formData, setFormData] = useState({
    pemohon: '',
    jenisSurvey: '',
    perihal: 'DINAS SURVEY KLAS',
    lokasi: defaultLocation,
    tempatSurvey: defaultLocation,
    tglMulai: '',
    tglSelesai: '',
    noOrder: 'RFQ-0000',
    petugas: '',
    catatan: '',
    status: 'Menunggu Survei'
  });

  useEffect(() => {
    if (editItem) {
      const editLoc = editItem.lokasi || editItem.tempatSurvey || defaultLocation;
      const initialAgenda = editItem.noAgenda || editItem.agenda || '';
      
      setShips([
        {
          id: 'ship-1',
          namaKapal: editItem.namaKapal || '',
          noAgenda: initialAgenda
        }
      ]);

      const initialPetugas = role === 'surveyor'
        ? (editItem.petugas || currentUser?.name || '')
        : (editItem.petugas || '');

      setFormData({
        pemohon: editItem.pemohon || '',
        jenisSurvey: (editItem.jenisSurvey || '').toUpperCase(),
        perihal: (editItem.perihal || 'DINAS SURVEY KLAS').toUpperCase(),
        lokasi: editLoc.toUpperCase(),
        tempatSurvey: editLoc.toUpperCase(),
        tglMulai: editItem.tglMulai || '',
        tglSelesai: editItem.tglSelesai || editItem.tglMulai || '',
        noOrder: editItem.noOrder || 'RFQ-0000',
        petugas: initialPetugas,
        catatan: editItem.catatan || '',
        status: editItem.status || 'Menunggu Survei'
      });
    } else {
      const defaultSurveyor = role === 'surveyor'
        ? (currentUser?.name || 'ALFIAN BONE PUTRA')
        : (currentUser?.name || surveyorUsers[0]?.name || 'ALFIAN BONE PUTRA');
      const todayDate = new Date().toISOString().split('T')[0];
      const initialLoc = defaultLocation || 'WAJOK';

      setShips([
        { id: `ship-${Date.now()}-1`, namaKapal: '', noAgenda: '' }
      ]);

      setFormData({
        pemohon: '',
        jenisSurvey: '',
        perihal: 'DINAS SURVEY KLAS',
        lokasi: initialLoc.toUpperCase(),
        tempatSurvey: initialLoc.toUpperCase(),
        tglMulai: todayDate,
        tglSelesai: todayDate,
        noOrder: `RFQ260${String(Math.floor(Math.random() * 900) + 100)}`,
        petugas: defaultSurveyor,
        catatan: '',
        status: 'Menunggu Survei'
      });
    }
  }, [editItem, isOpen, defaultLocation, currentUser, surveyorUsers, role]);

  if (!isOpen) return null;

  const handleAddShipRow = () => {
    const lastAgenda = ships[ships.length - 1]?.noAgenda || '';
    let nextAgenda = '';
    const matchNum = lastAgenda.match(/(\d+)$/);
    if (matchNum) {
      const numVal = parseInt(matchNum[1], 10) + 1;
      nextAgenda = lastAgenda.replace(/\d+$/, String(numVal));
    } else {
      nextAgenda = '';
    }

    setShips([
      ...ships,
      { id: `ship-${Date.now()}-${ships.length + 1}`, namaKapal: '', noAgenda: nextAgenda }
    ]);
  };

  const handleRemoveShipRow = (id) => {
    if (ships.length <= 1) return;
    setShips(ships.filter((s) => s.id !== id));
  };

  const handleShipChange = (id, field, value) => {
    setShips((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated = { ...s, [field]: value };
          if (field === 'namaKapal') {
            const upper = value.toUpperCase().trim();
            const match = shipDatabase.find((db) => db.namaKapal.toUpperCase() === upper);
            if (match) {
              if (match.noAgenda) {
                updated.noAgenda = match.noAgenda;
              }
              // Auto-fill lokasi, jenisSurvey, noOrder if available (exclude pemohon)
              setFormData((f) => ({
                ...f,
                lokasi: match.lokasi ? match.lokasi.toUpperCase() : f.lokasi,
                tempatSurvey: match.lokasi ? match.lokasi.toUpperCase() : f.tempatSurvey,
                jenisSurvey: f.jenisSurvey || match.jenisSurvey,
                noOrder: match.noOrder && match.noOrder !== 'RFQ-0000' ? match.noOrder : f.noOrder
              }));
            }
          }
          return updated;
        }
        return s;
      })
    );
  };

  const handleSelectShipFromDatabase = (foundShip) => {
    if (!foundShip) return;

    const emptyRow = ships.find((s) => !s.namaKapal.trim());
    if (emptyRow) {
      setShips((prev) =>
        prev.map((s) =>
          s.id === emptyRow.id
            ? { ...s, namaKapal: foundShip.namaKapal, noAgenda: foundShip.noAgenda || s.noAgenda }
            : s
        )
      );
    } else {
      const newId = `ship-${Date.now()}-${ships.length + 1}`;
      setShips((prev) => [
        ...prev,
        {
          id: newId,
          namaKapal: foundShip.namaKapal,
          noAgenda: foundShip.noAgenda || String(Math.floor(Math.random() * 900) + 100)
        }
      ]);
    }

    setFormData((f) => ({
      ...f,
      lokasi: foundShip.lokasi ? foundShip.lokasi.toUpperCase() : f.lokasi,
      tempatSurvey: foundShip.lokasi ? foundShip.lokasi.toUpperCase() : f.tempatSurvey,
      jenisSurvey: f.jenisSurvey || foundShip.jenisSurvey || '',
      noOrder: foundShip.noOrder && foundShip.noOrder !== 'RFQ-0000' ? foundShip.noOrder : f.noOrder
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validShips = ships.filter((s) => s.namaKapal.trim().length > 0);
    if (validShips.length === 0) {
      toast.error('Mohon masukkan minimal 1 Nama Kapal!');
      return;
    }

    if (!formData.tglMulai) {
      toast.error('Mohon pilih Tanggal Survei!');
      return;
    }

    const cleanJenis = (formData.jenisSurvey || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s.toUpperCase() !== 'DINAS SURVEY KLAS');

    if (cleanJenis.length === 0) {
      toast.error('Jenis Survey wajib dipilih (minimal 1 jenis survei)!');
      return;
    }

    if (editItem) {
      // Single edit
      const shipItem = validShips[0];
      updateSuratTugas(editItem.id, {
        ...editItem,
        ...formData,
        namaKapal: shipItem.namaKapal.trim().toUpperCase(),
        noAgenda: shipItem.noAgenda.trim(),
        agenda: shipItem.noAgenda.trim(),
        docType: 'SPS',
        isSps: true,
        visit: editItem.visit || '1',
        isSentToSurveyor: true
      });
      toast.success('Penugasan SPS berhasil disimpan & dikirim ke surveyor! Masuk ke Laporan Paraf.');
    } else {
      // Batch creation for multiple ships
      addSpsBatch({
        ...formData,
        visit: '1',
        isSentToSurveyor: true,
        shipsList: validShips.map((s) => ({
          namaKapal: s.namaKapal.trim().toUpperCase(),
          noAgenda: s.noAgenda.trim() || String(Math.floor(Math.random() * 900) + 100)
        }))
      });
      toast.success(`Berhasil menerbitkan & mengirim ${validShips.length} penugasan SPS ke surveyor & Laporan Paraf!`);
    }

    onClose();
  };

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          style={{ maxWidth: '850px', width: '95vw', maxHeight: '90vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header">
            <div className="card-title-group">
              <FileCheck2 size={24} style={{ color: 'var(--accent-primary)' }} />
              <div>
                <h3 className="modal-title">
                  {editItem ? 'Edit Surat Penunjukan Survey (SPS)' : 'Input Surat Penunjukan Survey (SPS)'}
                </h3>
                <div className="card-subtitle">
                  Penugasan Survei Kapal oleh Admin BKI Cabang Pontianak
                </div>
              </div>
            </div>
            <button className="btn btn-secondary btn-icon" onClick={onClose} type="button">
              <X size={18} />
            </button>
          </div>

          {/* Form Body */}
          <div className="modal-body" style={{ maxHeight: 'calc(90vh - 140px)', overflowY: 'auto', padding: '1.5rem' }}>
            <form onSubmit={handleSubmit}>
              {/* Section 1: Penugasan Surveyor & Jadwal Survei */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr 1fr',
                  gap: '1rem',
                  marginBottom: '1.25rem',
                  background: 'var(--bg-main)',
                  border: '1.5px solid var(--border-color-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.25rem'
                }}
              >
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <User size={14} color="var(--accent-primary)" />
                    <span>Surveyor Ditugaskan *</span>
                  </label>
                  {role === 'surveyor' ? (
                    <input
                      type="text"
                      className="form-input"
                      value={formData.petugas || currentUser?.name || ''}
                      readOnly
                      style={{
                        background: 'var(--bg-card)',
                        cursor: 'not-allowed',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        borderColor: 'var(--border-color)'
                      }}
                      title="Nama surveyor terkunci sesuai akun login surveyor"
                    />
                  ) : (
                    <select
                      className="form-select"
                      value={formData.petugas}
                      onChange={(e) => setFormData({ ...formData, petugas: e.target.value })}
                      required
                    >
                      {surveyorUsers.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name} ({u.roleLabel || u.role})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={14} color="var(--accent-primary)" />
                    <span>Tgl Mulai *</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.tglMulai}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        tglMulai: val,
                        tglSelesai: formData.tglSelesai && formData.tglSelesai < val ? val : formData.tglSelesai || val
                      });
                    }}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={14} color="var(--accent-primary)" />
                    <span>Tgl Selesai *</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.tglSelesai}
                    min={formData.tglMulai}
                    onChange={(e) => setFormData({ ...formData, tglSelesai: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Section 2: Nama Kapal & No. Agenda per Kapal */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  border: '1.5px solid var(--border-color-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ fontWeight: 800, color: 'var(--accent-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Anchor size={16} />
                    <span>Daftar Kapal & No. Agenda Terkait *</span>
                  </label>
                  {!editItem && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleAddShipRow}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                    >
                      <Plus size={14} />
                      <span>Tambah Kapal</span>
                    </button>
                  )}
                </div>

                {/* Dropdown Pemilihan Cepat dari Database */}
                <div style={{ marginBottom: '0.75rem', background: 'var(--bg-card)', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Sparkles size={14} color="var(--accent-primary)" />
                    <span>Pilih dari Database Kapal (Otomatis Isi Nama Kapal & No. Agenda):</span>
                  </div>
                    <ShipDatabaseSearchSelect
                      shipDatabase={shipDatabase}
                      onSelect={(foundShip) => handleSelectShipFromDatabase(foundShip)}
                      placeholder="-- 🚢 Ketik nama kapal / no. agenda untuk mencari dari database --"
                    />
                  </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Setiap nama kapal memiliki No. Agenda masing-masing yang akan terhubung otomatis ke form PDS dan Laporan.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {ships.map((ship, idx) => (
                    <div
                      key={ship.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto 1.5fr 1fr auto',
                        gap: '0.6rem',
                        alignItems: 'center',
                        background: 'var(--bg-card)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', width: '22px' }}>
                        #{idx + 1}
                      </span>
                      <div>
                        <input
                          type="text"
                          className="form-input"
                          list="sps-ship-database-list"
                          placeholder="Nama Kapal (Ketik / Pilih Database)"
                          value={ship.namaKapal}
                          onChange={(e) => handleShipChange(ship.id, 'namaKapal', e.target.value.toUpperCase())}
                          required
                          style={{ fontWeight: 700 }}
                        />
                        <datalist id="sps-ship-database-list">
                          {shipDatabase.map((s, dIdx) => (
                            <option key={`${s.namaKapal}-${dIdx}`} value={s.namaKapal}>
                              No. Agenda: {s.noAgenda || '-'}
                            </option>
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="No. Agenda (contoh: 021/2026)"
                          value={ship.noAgenda}
                          onChange={(e) => handleShipChange(ship.id, 'noAgenda', e.target.value)}
                          required
                        />
                      </div>
                      {!editItem && ships.length > 1 ? (
                        <button
                          type="button"
                          className="btn btn-danger btn-icon btn-sm"
                          onClick={() => handleRemoveShipRow(ship.id)}
                          title="Hapus baris kapal ini"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <div style={{ width: '28px' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Detail Permohonan */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Pemohon (Perusahaan / Agen) *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: PT. MITRA SAMUDRA NUSANTARA"
                    value={formData.pemohon}
                    onChange={(e) => setFormData({ ...formData, pemohon: e.target.value.toUpperCase() })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    No. Order / RFQ *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: RFQ2608005"
                    value={formData.noOrder}
                    onChange={(e) => setFormData({ ...formData, noOrder: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
              </div>

              {/* Section 4: Jenis Survey & Lokasi */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Jenis Survey *
                  </label>
                  <MultiSurveySelect
                    value={formData.jenisSurvey}
                    onChange={(val) => setFormData({ ...formData, jenisSurvey: val })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={15} color="var(--accent-primary)" />
                    <span>Lokasi / Tempat Survey *</span>
                  </label>
                  <select
                    className="form-select"
                    value={formData.lokasi}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        lokasi: val.toUpperCase(),
                        tempatSurvey: val.toUpperCase()
                      });
                    }}
                    required
                  >
                    <optgroup label="📍 DALAM KOTA (PONTIANAK & SEKITARNYA)">
                      {activeTariffs
                        .filter((t) => (t.kategori || getLocationCategory(t.name, activeTariffs)) === 'Dalam Kota')
                        .map((t, idx) => (
                          <option key={`dk-${idx}`} value={t.tujuan || t.name}>
                            {t.tujuan || t.name} {t.rincian ? `(${t.rincian})` : ''}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="✈️ LUAR KOTA">
                      {activeTariffs
                        .filter((t) => (t.kategori || getLocationCategory(t.name, activeTariffs)) === 'Luar Kota')
                        .map((t, idx) => (
                          <option key={`lk-${idx}`} value={t.tujuan || t.name}>
                            {t.tujuan || t.name} {t.rincian ? `(${t.rincian})` : ''}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Box 5: Catatan Tugas */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Catatan / Instruksi Penugasan (Opsional)
                </label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Masukkan instruksi khusus untuk surveyor jika ada..."
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                />
              </div>

              {/* Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Send size={16} />
                  <span>Simpan dan Send</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
