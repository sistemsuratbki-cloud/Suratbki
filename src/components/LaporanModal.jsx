import { supabase } from '../lib/supabase';
import React, { useState, useEffect } from 'react';
import { X, Save, Anchor, Printer, Lock, Camera, FileCheck2, Plane, Receipt, MapPin, Calendar, Hash, FileText, Sparkles } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { isEditWindowExpired, formatRupiah, cleanDocNumber } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';
import { sanitizeFormData } from '../utils/security';
import MultiShipInput from './MultiShipInput';
import MultiSurveySelect from './MultiSurveySelect';
import MultiPhotoUpload from './MultiPhotoUpload';

export const LaporanModal = ({ isOpen, onClose, editItem = null, onPrintSuratTugas = null }) => {
  const { suratTugas, addLaporanSurvei, updateLaporanSurvei, updateSuratTugas, tariffs } = useData();
  const { role, currentUser } = useAuth();
  const activeTariffs = tariffs && tariffs.length > 0 ? tariffs : [];
  const defaultLoc = activeTariffs[0]?.name || activeTariffs[0]?.tujuan || 'Kendawangan (Via Udara)';
  const defaultRate = activeTariffs[0]?.rate || 3000000;

  const [formData, setFormData] = useState({
    suratId: '',
    tglLapor: '',
    namaKapal: '',
    lokasi: defaultLoc,
    nilai: defaultRate,
    namaSurvey: '',
    noAgenda: '',
    noCda: '5100010',
    noSo: '',
    noWbs: '',
    petugas: '',

    hasil: '',
    status: 'Draf',
    fileFotoName: '',
    fileFotoData: '',
    fotoList: [],
    fileVisitName: '',
    fileVisitData: '',
    fileTiketTransportName: '',
    fileTiketTransportData: '',
    fileKwitansiHotelName: '',
    fileKwitansiHotelData: ''
  });

  useEffect(() => {
    if (editItem) {
      setFormData({
        ...editItem,
        tglLapor: editItem.tglLapor || editItem.tanggal || new Date().toISOString().split('T')[0],
        namaKapal: editItem.namaKapal || '',
        lokasi: editItem.lokasi || editItem.lokasiSurvey || defaultLoc,
        nilai: editItem.nilai || editItem.tarifDasar || defaultRate,
        namaSurvey: editItem.namaSurvey || editItem.jenisSurvey || '',
        noAgenda: cleanDocNumber(editItem.noAgenda || editItem.nomor || ''),
        noCda: editItem.noCda || '5100010',
        noSo: editItem.noSo || editItem.noOrder || '',
        noWbs: editItem.noWbs || '',
        petugas: editItem.petugas || '',

        hasil: editItem.hasil || editItem.catatan || '',
        status: editItem.status || 'Draf',
        fileFotoName: editItem.fileFotoName || '',
        fileFotoData: editItem.fileFotoData || '',
        fotoList: editItem.fotoList || [],
        fileVisitName: editItem.fileVisitName || '',
        fileVisitData: editItem.fileVisitData || '',
        fileTiketTransportName: editItem.fileTiketTransportName || editItem.fileTiketName || '',
        fileTiketTransportData: editItem.fileTiketTransportData || '',
        fileKwitansiHotelName: editItem.fileKwitansiHotelName || '',
        fileKwitansiHotelData: editItem.fileKwitansiHotelData || ''
      });
    } else {
      const defaultSurat = suratTugas.length > 0 ? suratTugas[0] : null;
      const todayDate = new Date().toISOString().split('T')[0];

      setFormData({
        suratId: defaultSurat?.id || '',
        tglLapor: defaultSurat?.tglMulai || todayDate,
        namaKapal: defaultSurat?.namaKapal || '',
        lokasi: defaultSurat?.lokasi || defaultLoc,
        nilai: defaultSurat?.jumlahEstimasi || defaultSurat?.tarifDasar || defaultRate,
        namaSurvey: defaultSurat?.jenisSurvey || '',
        noAgenda: cleanDocNumber(defaultSurat?.nomor) || `A 0    /SV.${Math.floor(Math.random() * 900) + 100}/PK/KI-26`,
        noCda: defaultSurat?.noCda || '5100010',
        noSo: defaultSurat?.noOrder || `SO-${new Date().getFullYear()}/${Date.now().toString().slice(-5)}`,
        noWbs: `WBS.BKI.PTK.${new Date().getFullYear()}.${Date.now().toString().slice(-3)}`,
        petugas: defaultSurat?.petugas || currentUser?.name || 'ALFIAN BONE PUTRA',

        hasil: defaultSurat?.catatan || '',
        status: 'Draf',
        fileFotoName: defaultSurat?.fileFotoName || '',
        fileFotoData: defaultSurat?.fileFotoData || '',
        fotoList: defaultSurat?.fotoList || [],
        fileVisitName: defaultSurat?.fileVisitName || '',
        fileVisitData: defaultSurat?.fileVisitData || '',
        fileTiketTransportName: defaultSurat?.fileTiketTransportName || defaultSurat?.fileTiketName || '',
        fileTiketTransportData: defaultSurat?.fileTiketTransportData || '',
        fileKwitansiHotelName: defaultSurat?.fileKwitansiHotelName || '',
        fileKwitansiHotelData: defaultSurat?.fileKwitansiHotelData || ''
      });
    }
  }, [editItem, isOpen, suratTugas, currentUser, defaultLoc, defaultRate]);

  if (!isOpen) return null;

  const isExpired = editItem ? isEditWindowExpired(editItem.tglLapor) : false;
  const isLockedForSurveyor = role === 'surveyor' && isExpired && !editItem?.isUnlockedByAdmin;

  const handleSuratChange = (suratId) => {
    const selectedSurat = suratTugas.find((s) => s.id === suratId);
    if (selectedSurat) {
      setFormData((prev) => ({
        ...prev,
        suratId,
        namaKapal: selectedSurat.namaKapal || prev.namaKapal,
        petugas: selectedSurat.petugas || prev.petugas,
        lokasi: selectedSurat.lokasi || prev.lokasi,
        nilai: selectedSurat.jumlahEstimasi || selectedSurat.tarifDasar || prev.nilai,
        namaSurvey: selectedSurat.jenisSurvey || selectedSurat.perihal || prev.namaSurvey,
        noAgenda: selectedSurat.nomor || prev.noAgenda,
        noSo: selectedSurat.noOrder || prev.noSo,
        tglLapor: selectedSurat.tglMulai || prev.tglLapor,

        fileFotoName: selectedSurat.fileFotoName || prev.fileFotoName,
        fileFotoData: selectedSurat.fileFotoData || prev.fileFotoData,
        fotoList: selectedSurat.fotoList || prev.fotoList,
        fileVisitName: selectedSurat.fileVisitName || prev.fileVisitName,
        fileVisitData: selectedSurat.fileVisitData || prev.fileVisitData,
        fileTiketTransportName: selectedSurat.fileTiketTransportName || selectedSurat.fileTiketName || prev.fileTiketTransportName,
        fileTiketTransportData: selectedSurat.fileTiketTransportData || prev.fileTiketTransportData,
        fileKwitansiHotelName: selectedSurat.fileKwitansiHotelName || prev.fileKwitansiHotelName,
        fileKwitansiHotelData: selectedSurat.fileKwitansiHotelData || prev.fileKwitansiHotelData
      }));
    } else {
      setFormData((prev) => ({ ...prev, suratId }));
    }
  };

  const handleFileUpload = async (fieldKey, e) => {
    const file = e.target.files[0];
    if (file) {
      const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Ukuran file "${file.name}" melebihi batas maksimum 3 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
        e.target.value = '';
        return;
      }

      setFormData((prev) => ({
        ...prev,
        [fieldKey]: 'Mengunggah... ' + file.name
      }));

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      try {
        if (!supabase) throw new Error('Supabase not configured');
        const { data, error } = await supabase.storage.from('lampiran').upload(filePath, file);
        if (error) throw error;
        
        const { data: publicUrlData } = supabase.storage.from('lampiran').getPublicUrl(filePath);
        
        setFormData((prev) => ({
          ...prev,
          [fieldKey]: file.name,
          [`${fieldKey.replace('Name', 'Data')}`]: publicUrlData.publicUrl
        }));
      } catch (err) {
        console.error('Supabase upload failed, falling back to local base64:', err);
        // Fallback to Base64 (Local)
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData((prev) => ({
            ...prev,
            [fieldKey]: file.name,
            [`${fieldKey.replace('Name', 'Data')}`]: reader.result
          }));
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRemoveFile = (fieldKey) => {
    setFormData((prev) => ({
      ...prev,
      [fieldKey]: '',
      [`${fieldKey.replace('Name', 'Data')}`]: ''
    }));
  };

  const processSave = () => {
    if (!formData.namaKapal || !formData.petugas) {
      toast.error('Mohon lengkapi Nama Kapal dan Nama Marine Surveyor!');
      return null;
    }

    const cleanJenis = (formData.namaSurvey || formData.jenisSurvey || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s.toUpperCase() !== 'DINAS SURVEY KLAS');

    if (cleanJenis.length === 0) {
      toast.error('Jenis Survey wajib dipilih (minimal 1 jenis survei)!');
      return null;
    }

    const payload = sanitizeFormData({
      ...formData,
      tanggal: formData.tglLapor,
      lokasiSurvey: formData.lokasi,
      tarifDasar: Number(formData.nilai) || defaultRate,
      nilai: Number(formData.nilai) || defaultRate,
      jenisSurvey: formData.namaSurvey
    });

    if (editItem) {
      updateLaporanSurvei(editItem.id, payload);
      return { ...payload, id: editItem.id };
    } else {
      return addLaporanSurvei(payload);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const saved = processSave();
    if (saved) {
      onClose();
    }
  };

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" style={{ maxWidth: '840px' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="card-title-group">
              <Anchor size={22} style={{ color: 'var(--accent-primary)' }} />
              <div>
                <h3 className="modal-title">{editItem ? 'Edit Data Perjalanan Dinas Survey' : 'Input Perjalanan Dinas Survey'}</h3>
                <div className="card-subtitle">Format Standar Cabang Madya Klas Pontianak</div>
              </div>
            </div>
            <button className="btn btn-secondary btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="modal-body" style={{ maxHeight: 'calc(90vh - 130px)', overflowY: 'auto' }}>
            {isLockedForSurveyor && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Lock size={20} color="#ef4444" />
                <div style={{ fontSize: '0.85rem', color: '#b91c1c' }}>
                  <strong>Data Terkunci:</strong> Batas waktu perubahan (24 jam) telah berakhir. Hubungi Admin/Kepala Cabang jika perlu perubahan.
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Reference Surat Tugas */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                  Hubungkan dengan Surat Tugas (Opsional / Otomatisasi)
                </label>
                <select
                  className="form-select"
                  value={formData.suratId}
                  onChange={(e) => handleSuratChange(e.target.value)}
                >
                  <option value="">-- Input Bebas / Tanpa Surat Tugas Terkait --</option>
                  {suratTugas.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.nomor} — {st.namaKapal} ({st.petugas}) • {st.lokasi}
                    </option>
                  ))}
                </select>
              </div>

              {/* ====== 10 FIELD RESMI SESUAI TABEL LAPORAN PERJALANAN DINAS ====== */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  border: '1.5px solid var(--border-color-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  📋 DATA DAFTAR PERJALANAN DINAS SURVEY (10 KOLOM RESMI)
                </div>

                {/* Baris 1: TANGGAL, NAMA KAPAL, LOKASI SURVEY */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={14} color="var(--accent-primary)" />
                      <span>2. TANGGAL *</span>
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.tglLapor}
                      onChange={(e) => setFormData({ ...formData, tglLapor: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      3. NAMA KAPAL *
                    </label>
                    <MultiShipInput
                      value={formData.namaKapal}
                      onChange={(val) => setFormData({ ...formData, namaKapal: val })}
                      placeholder="Contoh: KAPUAS BAHARI XXII / TB. SAMUDRA 01"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={14} color="var(--accent-primary)" />
                      <span>4. LOKASI SURVEY *</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.lokasi}
                      onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                      placeholder="Kendawangan / Pontianak"
                      required
                    />
                  </div>
                </div>

                {/* Baris 2: NILAI, NAMA SURVEY, NO AGENDA */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      5. NILAI (Rp) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      className="form-input"
                      value={formData.nilai}
                      onChange={(e) => setFormData({ ...formData, nilai: Number(e.target.value) || 0 })}
                      placeholder="3000000"
                      required
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 700, marginTop: '0.2rem', display: 'block' }}>
                      {formatRupiah(formData.nilai)}
                    </span>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      6. NAMA SURVEY *
                    </label>
                    <MultiSurveySelect
                      value={formData.namaSurvey}
                      onChange={(val) => setFormData({ ...formData, namaSurvey: val })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      7. NO AGENDA
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.noAgenda}
                      onChange={(e) => setFormData({ ...formData, noAgenda: e.target.value })}
                      placeholder="A 0    /SV.333/PK/KI-26 (opsional)"
                    />
                  </div>
                </div>

                {/* Baris 3: NO CDA, NO.SO, NO.WBS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      8. NO CDA
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.noCda}
                      onChange={(e) => setFormData({ ...formData, noCda: e.target.value })}
                      placeholder="5100010"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      9. NO.SO
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.noSo}
                      onChange={(e) => setFormData({ ...formData, noSo: e.target.value })}
                      placeholder="SO-2026/08/001"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      10. NO.WBS
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.noWbs}
                      onChange={(e) => setFormData({ ...formData, noWbs: e.target.value })}
                      placeholder="WBS.BKI.PTK.2026.01"
                    />
                  </div>
                </div>
              </div>

              {/* Marine Surveyor & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Nama Marine Surveyor *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.petugas}
                    onChange={(e) => setFormData({ ...formData, petugas: e.target.value })}
                    placeholder="Nama Surveyor..."
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Status Dokumen</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Draf">Draf (Disimpan Sementara)</option>
                    <option value="Terkirim">Terkirim (Siap Diperiksa)</option>
                    <option value="Disetujui">Disetujui (Approved)</option>
                  </select>
                </div>
              </div>

              {/* 4 Lampiran Upload */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  border: '1.5px solid var(--border-color-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  📎 LAMPIRAN BERKAS & BUKTI (4 UPLOAD)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  {/* 1. Upload Foto (Multi-Upload) */}
                  <MultiPhotoUpload
                    fileNames={formData.fileFotoName}
                    fileData={formData.fileFotoData}
                    fotoList={formData.fotoList}
                    onChange={({ fileFotoName, fileFotoData, fotoList }) =>
                      setFormData((prev) => ({
                        ...prev,
                        fileFotoName,
                        fileFotoData,
                        fotoList
                      }))
                    }
                    label="1. Upload Foto"
                  />

                  <div style={{ background: 'var(--bg-card-solid)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      <FileCheck2 size={16} color="#059669" />
                      <span>2. Upload Visit</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="form-input"
                      onChange={(e) => handleFileUpload('fileVisitName', e)}
                      style={{ padding: '0.35rem', fontSize: '0.8rem' }}
                    />
                    {formData.fileVisitName && (
                      <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5, 150, 105, 0.08)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                        <span>📄 {formData.fileVisitName}</span>
                        <button type="button" onClick={() => handleRemoveFile('fileVisitName')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                          <X size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ background: 'var(--bg-card-solid)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      <Plane size={16} color="#7c3aed" />
                      <span>3. Upload Tiket Transport</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="form-input"
                      onChange={(e) => handleFileUpload('fileTiketTransportName', e)}
                      style={{ padding: '0.35rem', fontSize: '0.8rem' }}
                    />
                    {formData.fileTiketTransportName && (
                      <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 700, marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(124, 58, 237, 0.08)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                        <span>✈️ {formData.fileTiketTransportName}</span>
                        <button type="button" onClick={() => handleRemoveFile('fileTiketTransportName')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                          <X size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ background: 'var(--bg-card-solid)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      <Receipt size={16} color="#d97706" />
                      <span>4. Kwitansi Hotel</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="form-input"
                      onChange={(e) => handleFileUpload('fileKwitansiHotelName', e)}
                      style={{ padding: '0.35rem', fontSize: '0.8rem' }}
                    />
                    {formData.fileKwitansiHotelName && (
                      <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 700, marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(217, 119, 6, 0.08)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                        <span>🏨 {formData.fileKwitansiHotelName}</span>
                        <button type="button" onClick={() => handleRemoveFile('fileKwitansiHotelName')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                          <X size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Catatan / Hasil Temuan */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Catatan Hasil & Temuan Survei (Opsional)</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '80px' }}
                  value={formData.hasil}
                  onChange={(e) => setFormData({ ...formData, hasil: e.target.value })}
                  placeholder="Catatan teknis hasil inspeksi kelaiklautan..."
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Batal
                </button>

                <button type="submit" className="btn btn-primary" disabled={isLockedForSurveyor}>
                  <Save size={16} />
                  <span>Simpan Data Perjalanan Dinas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
