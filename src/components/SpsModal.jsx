import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Sparkles,
  FileText
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ModalPortal } from './ModalPortal';
import MultiSurveySelect from './MultiSurveySelect';
import ShipDatabaseSearchSelect from './ShipDatabaseSearchSelect';
import SearchableLocationSelect from './SearchableLocationSelect';
import { getLocationCategory } from '../utils/tariffData';
import { MASTER_COMPANIES } from '../data/defaultMasterKapal';

export const SpsModal = ({ isOpen, onClose, editItem = null }) => {
  const { addSpsBatch, updateSuratTugas, suratTugas, laporanSurvei, tariffs, masterKapal } = useData();
  const { usersList, currentUser, role } = useAuth();

  const activeTariffs = tariffs && tariffs.length > 0 ? tariffs : [];
  const defaultLocation = activeTariffs[0]?.tujuan || activeTariffs[0]?.name || 'WAJOK';

  const shipDatabase = masterKapal;

  const surveyorUsers = useMemo(
    () => (usersList || []).filter((u) => u.role === 'surveyor' || u.role === 'kacab'),
    [usersList]
  );

  // Generate noOrder SEKALI saat modal dibuka untuk SPS baru — tidak berubah saat re-render
  const generatedNoOrderRef = useRef(null);
  useEffect(() => {
    if (isOpen && !editItem) {
      // Buat noOrder baru hanya saat modal pertama kali dibuka untuk form baru
      generatedNoOrderRef.current = `RFQ${Date.now().toString().slice(-8)}`;
    }
    if (!isOpen) {
      // Reset saat modal ditutup agar siap untuk pembukaan berikutnya
      generatedNoOrderRef.current = null;
    }
  }, [isOpen, editItem]);

  const [formData, setFormData] = useState({
    namaKapal: '',
    noAgenda: '',
    pemohon: '',
    jenisSurvey: '',
    perihal: 'DINAS SURVEY KLAS',
    lokasi: defaultLocation,
    tempatSurvey: defaultLocation,
    tglSurat: '',
    tglMulai: '',
    tglSelesai: '',
    noOrder: 'RFQ-0000',
    petugas: '',
    catatan: '',
    status: 'Menunggu Survei'
  });

  useEffect(() => {
    const todayDate = new Date().toISOString().split('T')[0];
    if (editItem) {
      const editLoc = editItem.lokasi || editItem.tempatSurvey || defaultLocation;
      const initialAgenda = editItem.noAgenda || editItem.agenda || '';
      const initialPetugas = (role === 'surveyor' || role === 'kacab')
        ? (editItem.petugas || currentUser?.name || '')
        : (editItem.petugas || surveyorUsers[0]?.name || '');

      setFormData({
        namaKapal: editItem.namaKapal || '',
        noAgenda: initialAgenda,
        pemohon: editItem.pemohon || '',
        jenisSurvey: (editItem.jenisSurvey || '').toUpperCase(),
        perihal: (editItem.perihal || 'DINAS SURVEY KLAS').toUpperCase(),
        lokasi: editLoc.toUpperCase(),
        tempatSurvey: editLoc.toUpperCase(),
        tglSurat: editItem.tglSurat || editItem.tglPembuatan || editItem.tglMulai || todayDate,
        tglMulai: editItem.tglMulai || '',
        tglSelesai: editItem.tglSelesai || editItem.tglMulai || '',
        noOrder: editItem.noOrder || 'RFQ-0000',
        petugas: initialPetugas,
        catatan: editItem.catatan || '',
        status: editItem.status || 'Menunggu Survei'
      });
    } else {
      const defaultSurveyor = (role === 'surveyor' || role === 'kacab')
        ? (currentUser?.name || surveyorUsers[0]?.name || '')
        : (surveyorUsers[0]?.name || '');
      const initialLoc = defaultLocation || 'WAJOK';

      setFormData({
        namaKapal: '',
        noAgenda: '',
        pemohon: '',
        jenisSurvey: '',
        perihal: 'DINAS SURVEY KLAS',
        lokasi: initialLoc.toUpperCase(),
        tempatSurvey: initialLoc.toUpperCase(),
        tglSurat: todayDate,
        tglMulai: todayDate,
        tglSelesai: todayDate,
        noOrder: generatedNoOrderRef.current || `RFQ${Date.now().toString().slice(-8)}`,
        petugas: defaultSurveyor,
        catatan: '',
        status: 'Menunggu Survei'
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editItem?.id, isOpen]);

  if (!isOpen) return null;

  const handleNamaKapalChange = (value) => {
    const upper = value.toUpperCase();
    const match = shipDatabase.find((db) => db.namaKapal.toUpperCase() === upper.trim());
    setFormData((f) => ({
      ...f,
      namaKapal: upper,
      noAgenda: match?.noAgenda ? match.noAgenda : f.noAgenda,
      pemohon: match?.pemohon ? match.pemohon : f.pemohon,
      lokasi: match?.lokasi ? match.lokasi.toUpperCase() : f.lokasi,
      tempatSurvey: match?.lokasi ? match.lokasi.toUpperCase() : f.tempatSurvey,
      jenisSurvey: f.jenisSurvey || match?.jenisSurvey || '',
      noOrder: match?.noOrder && match.noOrder !== 'RFQ-0000' ? match.noOrder : f.noOrder
    }));
  };

  const handleSelectShipFromDatabase = (foundShip) => {
    if (!foundShip) return;
    setFormData((f) => ({
      ...f,
      namaKapal: foundShip.namaKapal,
      noAgenda: foundShip.noAgenda || f.noAgenda || String(Math.floor(Math.random() * 900) + 100),
      pemohon: foundShip.pemohon ? foundShip.pemohon : f.pemohon,
      lokasi: foundShip.lokasi ? foundShip.lokasi.toUpperCase() : f.lokasi,
      tempatSurvey: foundShip.lokasi ? foundShip.lokasi.toUpperCase() : f.tempatSurvey,
      jenisSurvey: f.jenisSurvey || foundShip.jenisSurvey || '',
      noOrder: foundShip.noOrder && foundShip.noOrder !== 'RFQ-0000' ? foundShip.noOrder : f.noOrder
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const shipNameUpper = (formData.namaKapal || '').trim().toUpperCase();
    const agendaClean = (formData.noAgenda || '').trim();

    if (!shipNameUpper) {
      toast.error('Mohon masukkan Nama Kapal!');
      return;
    }

    if (!agendaClean) {
      toast.error('Mohon masukkan No. Agenda!');
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

    // Validate petugas (surveyor) is selected
    if (!formData.petugas || formData.petugas.trim() === '') {
      toast.error('Surveyor wajib dipilih!');
      return;
    }

    console.log('[SpsModal] Submitting with petugas:', formData.petugas);

    if (editItem) {
      updateSuratTugas(editItem.id, {
        ...editItem,
        ...formData,
        tglSelesai: formData.tglMulai,
        namaKapal: shipNameUpper,
        noAgenda: agendaClean,
        agenda: agendaClean,
        docType: 'SPS',
        isSps: true,
        visit: editItem.visit || '1',
        isSentToSurveyor: true
      });
      toast.success('Penugasan SPS berhasil disimpan!');
    } else {
      const submitData = {
        ...formData,
        tglSelesai: formData.tglMulai,
        visit: '1',
        isSentToSurveyor: true,
        isParafSent: false,
        shipsList: [
          {
            namaKapal: shipNameUpper,
            noAgenda: agendaClean || String(Math.floor(Math.random() * 900) + 100)
          }
        ]
      };
      console.log('[SpsModal] Submit data being sent to addSpsBatch:', submitData);
      addSpsBatch(submitData);
      toast.success(`Penugasan SPS untuk ${shipNameUpper} berhasil diterbitkan (Menunggu surveyor kirim Laporan Paraf).`);
    }

    onClose();
  };

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="modal-header" style={{ flexShrink: 0 }}>
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

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {/* Section 1: Penugasan Surveyor, Tanggal Pembuatan & Jadwal Survei */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr 1fr',
                  gap: '1rem',
                  marginBottom: '1.25rem',
                  background: 'var(--bg-main)',
                  border: '1.5px solid var(--border-color-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.25rem',
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <User size={14} color="var(--accent-primary)" />
                    <span>Surveyor Ditugaskan *</span>
                  </label>
                  {role === 'surveyor' || role === 'kacab' || role === 'kacap' ? (
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
                          {u.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FileText size={14} color="var(--accent-primary)" />
                    <span>Tgl. Pembuatan Berkas *</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.tglSurat || formData.tglMulai}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        tglSurat: e.target.value
                      });
                    }}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={14} color="var(--accent-primary)" />
                    <span>Tgl. Mulai Survei *</span>
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
                        tglSelesai: val
                      });
                    }}
                    required
                  />
                </div>
              </div>

              {/* Section 2: Objek Survei (Nama Kapal & No. Agenda) */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  border: '1.5px solid var(--border-color-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  marginBottom: '1.25rem',
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ fontWeight: 800, color: 'var(--accent-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Anchor size={16} />
                    <span>Objek Survei (Nama Kapal & No. Agenda) *</span>
                  </label>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Nama Kapal *
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      list="sps-ship-database-list"
                      placeholder="Contoh: TB. SAMUDRA 01"
                      value={formData.namaKapal}
                      onChange={(e) => handleNamaKapalChange(e.target.value)}
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

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      No. Agenda *
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Contoh: 021/2026"
                      value={formData.noAgenda}
                      onChange={(e) => setFormData({ ...formData, noAgenda: e.target.value })}
                      required
                    />
                  </div>
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
                    list="sps-companies-autocomplete-list"
                    placeholder="Contoh: PT. MITRA SAMUDRA NUSANTARA"
                    value={formData.pemohon}
                    onChange={(e) => setFormData({ ...formData, pemohon: e.target.value.toUpperCase() })}
                    required
                  />
                  <datalist id="sps-companies-autocomplete-list">
                    {MASTER_COMPANIES.map((comp, idx) => (
                      <option key={idx} value={comp} />
                    ))}
                  </datalist>
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
                  <SearchableLocationSelect
                    activeTariffs={activeTariffs}
                    value={formData.lokasi}
                    onChange={(val) => {
                      setFormData({
                        ...formData,
                        lokasi: val.toUpperCase(),
                        tempatSurvey: val.toUpperCase()
                      });
                    }}
                    getLocationCategory={getLocationCategory}
                    showRate={false}
                    required
                  />
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
            </div>

            {/* Footer Actions */}
            <div className="modal-footer" style={{ flexShrink: 0, padding: '1rem 2rem' }}>
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
    </ModalPortal>
  );
};
