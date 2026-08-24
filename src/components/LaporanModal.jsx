import { supabase } from '../lib/supabase';
import React, { useState, useEffect } from 'react';
import { X, Save, Anchor, Printer, Lock, Camera, FileCheck2, Plane, Receipt, MapPin, Calendar, Hash, FileText, Sparkles, Eye, Check, ClipboardList, UserCheck, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { isEditWindowExpired, formatRupiah, cleanDocNumber, formatDateIndo } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';
import { sanitizeFormData, validateFileUpload } from '../utils/security';
import MultiShipInput from './MultiShipInput';
import MultiSurveySelect from './MultiSurveySelect';
import MultiPhotoUpload from './MultiPhotoUpload';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';

export const LaporanModal = ({ isOpen, onClose, editItem = null, onPrintSuratTugas = null }) => {
  const { suratTugas, addLaporanSurvei, updateLaporanSurvei, updateSuratTugas, tariffs } = useData();
  const { role, currentUser } = useAuth();
  const isAdmin = role === 'admin' || role === 'developer' || role === 'kacab';
  const isFinance = role === 'finance' || role === 'keuangan';
  const activeTariffs = tariffs && tariffs.length > 0 ? tariffs : [];
  const defaultLoc = activeTariffs[0]?.name || activeTariffs[0]?.tujuan || 'Kendawangan (Via Udara)';
  const defaultRate = activeTariffs[0]?.rate || 3000000;

  const [previewAttachment, setPreviewAttachment] = useState({ isOpen: false, title: '', fileData: null, fileName: '' });

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

  const resolveSpsAgenda = (st) => {
    if (!st) return '';
    // 1. Cek dari shipsDetail (inputan langsung dari SPS)
    if (Array.isArray(st.shipsDetail) && st.shipsDetail.length > 0) {
      const fromShips = st.shipsDetail
        .map((s) => s.noAgenda)
        .filter((a) => a && a !== '-' && !String(a).toUpperCase().includes('/SV.') && !String(a).startsWith('A 0'))
        .join(', ');
      if (fromShips) return fromShips;
    }
    // 2. Cek jika surat ini punya linkedSpsIds
    if (Array.isArray(st.linkedSpsIds) && st.linkedSpsIds.length > 0) {
      const spsList = (suratTugas || []).filter((s) => st.linkedSpsIds.includes(s.id));
      const fromSps = spsList
        .map((s) => s.noAgenda || s.agenda)
        .filter((a) => a && a !== '-' && !String(a).toUpperCase().includes('/SV.') && !String(a).startsWith('A 0'))
        .join(', ');
      if (fromSps) return fromSps;
    }
    // 3. Cek dari field noAgenda / agenda jika murni angka agenda (bukan format nomor surat A 0...)
    if (st.noAgenda && !String(st.noAgenda).toUpperCase().includes('/SV.') && !String(st.noAgenda).startsWith('A 0')) {
      return st.noAgenda;
    }
    if (st.agenda && !String(st.agenda).toUpperCase().includes('/SV.') && !String(st.agenda).startsWith('A 0')) {
      return st.agenda;
    }
    // 4. Ekstrak angka agenda dari nomor surat (misal: "A 0 /SV.295/PK/KI-26" -> "295")
    return extractAgendaNumber(st.noAgenda || st.nomor || '');
  };

  useEffect(() => {
    if (editItem) {
      setFormData({
        ...editItem,
        tglLapor: editItem.tglLapor || editItem.tanggal || new Date().toISOString().split('T')[0],
        namaKapal: editItem.namaKapal || '',
        lokasi: editItem.lokasi || editItem.lokasiSurvey || defaultLoc,
        nilai: editItem.nilai || editItem.tarifDasar || defaultRate,
        namaSurvey: editItem.namaSurvey || editItem.jenisSurvey || '',
        noAgenda: resolveSpsAgenda(editItem),
        noCda: editItem.noCda || '5100010',
        noSo: editItem.noSo || '',
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
      const validSuratList = (suratTugas || []).filter((st) => Boolean(st.nomor && st.nomor.trim() && st.nomor.trim() !== '-'));
      const defaultSurat = validSuratList.length > 0 ? validSuratList[0] : null;
      const todayDate = new Date().toISOString().split('T')[0];

      setFormData({
        suratId: defaultSurat?.id || '',
        tglLapor: defaultSurat?.tglMulai || todayDate,
        namaKapal: defaultSurat?.namaKapal || '',
        lokasi: defaultSurat?.lokasi || defaultLoc,
        nilai: defaultSurat?.jumlahEstimasi || defaultSurat?.tarifDasar || defaultRate,
        namaSurvey: defaultSurat?.jenisSurvey || 'DINAS SURVEY KLAS',
        noAgenda: resolveSpsAgenda(defaultSurat),
        noCda: defaultSurat?.noCda || '5100010',
        noSo: defaultSurat?.noSo || '',
        noWbs: defaultSurat?.noWbs || '',
        petugas: defaultSurat?.petugas || (role === 'surveyor' ? (currentUser?.name || '') : ((usersList?.filter(u => u.role === 'surveyor')[0]?.name) || 'ALFIAN BONE PUTRA')),

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
    const selectedSurat = (suratTugas || []).find((s) => s.id === suratId);
    if (selectedSurat) {
      setFormData((prev) => ({
        ...prev,
        suratId,
        namaKapal: selectedSurat.namaKapal || prev.namaKapal,
        petugas: selectedSurat.petugas || prev.petugas,
        lokasi: selectedSurat.lokasi || selectedSurat.tempatSurvey || prev.lokasi,
        nilai: selectedSurat.jumlahEstimasi || selectedSurat.tarifDasar || prev.nilai,
        namaSurvey: selectedSurat.jenisSurvey || selectedSurat.perihal || prev.namaSurvey,
        noAgenda: resolveSpsAgenda(selectedSurat) || prev.noAgenda,
        noCda: selectedSurat.noCda || prev.noCda || '5100010',
        noSo: selectedSurat.noSo || '',
        noWbs: selectedSurat.noWbs || '',
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
    if (!file) return;

    const valRes = validateFileUpload(file, 25);
    if (!valRes.valid) {
      toast.error(valRes.message);
      return;
    }

    try {
      const fileNameKey = `${fieldKey}Name`;
      const fileDataKey = `${fieldKey}Data`;
      const base64 = await readFileAsBase64(file);

      setFormData((prev) => ({
        ...prev,
        [fileNameKey]: file.name,
        [fileDataKey]: base64
      }));

      // Direct Cloud Upload for Storage
      try {
        const fileExt = file.name.split('.').pop();
        const filePath = `laporan/${Date.now()}_${fieldKey}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('attachments')
            .getPublicUrl(filePath);

          if (urlData?.publicUrl) {
            setFormData((prev) => ({
              ...prev,
              [fileDataKey]: urlData.publicUrl
            }));
          }
        }
      } catch (storageErr) {
        console.warn('Storage bucket upload optional fallback to base64:', storageErr);
      }

      toast.success(`${file.name} berhasil diunggah.`);
    } catch (err) {
      toast.error('Gagal membaca berkas lampiran.');
    }
  };

  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const processSave = () => {
    if (!formData.namaKapal || !formData.petugas) {
      toast.error('Mohon lengkapi Nama Kapal dan Nama Marine Surveyor!');
      return null;
    }

    const payload = sanitizeFormData({
      ...formData,
      tanggal: formData.tglLapor,
      lokasiSurvey: formData.lokasi,
      tarifDasar: Number(formData.nilai) || defaultRate,
      nilai: Number(formData.nilai) || defaultRate,
      namaSurvey: formData.namaSurvey || formData.jenisSurvey || 'DINAS SURVEY KLAS',
      jenisSurvey: formData.namaSurvey || formData.jenisSurvey || 'DINAS SURVEY KLAS',
      noSo: formData.noSo?.trim() || '',
      noOrder: formData.noSo?.trim() || '',
      noWbs: formData.noWbs?.trim() || ''
    });

    if (editItem) {
      if (typeof updateLaporanSurvei === 'function') {
        updateLaporanSurvei(editItem.id, payload);
      }
      if (typeof updateSuratTugas === 'function') {
        updateSuratTugas(editItem.id, payload);
        if (editItem.suratId) {
          updateSuratTugas(editItem.suratId, payload);
        }
      }
      toast.success('Data Perjalanan Dinas berhasil diperbarui.');
      return { ...payload, id: editItem.id };
    } else {
      if (typeof addLaporanSurvei === 'function') {
        addLaporanSurvei(payload);
      }
      toast.success('Data Perjalanan Dinas berhasil ditambahkan.');
      return payload;
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
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="card-title-group">
              {isFinance ? <ClipboardList size={22} style={{ color: 'var(--accent-primary)' }} /> : <Anchor size={22} style={{ color: 'var(--accent-primary)' }} />}
              <div>
                <h3 className="modal-title">
                  {isFinance
                    ? 'Edit No. SO & No. WBS'
                    : editItem
                    ? 'Edit Data Perjalanan Dinas Survey'
                    : 'Input Perjalanan Dinas Survey'}
                </h3>
                <div className="card-subtitle">
                  {isFinance
                    ? `Perjalanan Dinas: ${(formData.namaKapal || '-').toUpperCase()} • ${(formData.petugas || '-').toUpperCase()}`
                    : 'Format Standar Cabang Madya Klas Pontianak'}
                </div>
              </div>
            </div>
            <button className="btn btn-secondary btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.75rem 3rem 14rem', minHeight: 0 }}>
            {isFinance ? (
              <form onSubmit={handleSubmit}>
                {/* Summary Info Card for Finance */}
                <div
                  style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.25rem'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--accent-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ClipboardList size={15} />
                    <span>RINGKASAN DOKUMEN REALISASI SURVEI</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', fontSize: '0.82rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600 }}>NAMA KAPAL</div>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>{formData.namaKapal || '-'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600 }}>SURVEYOR</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>{formData.petugas || '-'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600 }}>TANGGAL SURVEI</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formData.tglLapor ? formatDateIndo(formData.tglLapor) : '-'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600 }}>LOKASI</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formData.lokasi || '-'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600 }}>NILAI REALISASI</div>
                      <div style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>{formatRupiah(formData.nilai)}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600 }}>NO. AGENDA / SURAT</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{formData.noAgenda || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Input Fields for Finance: 9. NO. SO & 10. NO. WBS */}
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1.5px solid var(--accent-primary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    marginBottom: '1.25rem'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--accent-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    💼 INPUT / EDIT DATA KEUANGAN
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                        9. NO.SO
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.noSo}
                        onChange={(e) => setFormData({ ...formData, noSo: e.target.value })}
                        placeholder="Contoh: RFQ260280 / 3000255955"
                        style={{ fontSize: '0.9rem', fontWeight: 700, padding: '0.5rem 0.75rem' }}
                        autoFocus
                      />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                        Nomor Sales Order (SO) / RFQ
                      </span>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                        10. NO.WBS
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.noWbs}
                        onChange={(e) => setFormData({ ...formData, noWbs: e.target.value })}
                        placeholder="Contoh: 00578-PK-Z4-0426"
                        style={{ fontSize: '0.9rem', fontWeight: 700, padding: '0.5rem 0.75rem' }}
                      />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                        Kode Work Breakdown Structure (WBS)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons for Finance */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Batal
                  </button>

                  <button type="submit" className="btn btn-primary" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Save size={16} />
                    <span>Simpan No. SO & WBS</span>
                  </button>
                </div>
              </form>
            ) : (
              <>
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
                  {(suratTugas || [])
                    .filter((st) => Boolean(st.nomor && st.nomor.trim() && st.nomor.trim() !== '-'))
                    .map((st) => (
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

                {/* Baris 2: NILAI, NAMA SURVEYOR, NO AGENDA */}
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
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <UserCheck size={14} color="var(--accent-primary)" />
                      <span>6. NAMA SURVEYOR *</span>
                    </label>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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
                      placeholder="Contoh: 3000255955"
                      style={{ fontWeight: 700, color: formData.noSo ? '#0284c7' : 'inherit' }}
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
                      placeholder="Contoh: 00578-PK-Z4-0426"
                    />
                  </div>
                </div>

                {/* Status Dokumen */}
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
                    disabled={isAdmin}
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

                  {/* 2. Upload Visit */}
                  <div style={{ background: 'var(--bg-card-solid)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      <FileCheck2 size={16} color="#059669" />
                      <span>2. Upload Visit (Maks. 3 MB)</span>
                    </label>
                    {isAdmin ? (
                      formData.fileVisitName || formData.fileVisitData ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Check size={13} color="#059669" /> Form visit terlampir
                          </span>
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
                            onClick={() => setPreviewAttachment({
                              isOpen: true,
                              title: 'Formulir Kunjungan Lapangan (Visit Form)',
                              fileData: formData.fileVisitData || formData.fileVisitName,
                              fileName: formData.fileVisitName || 'Formulir_Kunjungan_Lapangan'
                            })}
                          >
                            <Eye size={12} />
                            <span>Cek Lampiran</span>
                          </button>
                        </div>
                      ) : (
                        <div style={{ padding: '0.45rem 0.65rem', background: 'var(--bg-main)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                          Belum ada lampiran dari surveyor
                        </div>
                      )
                    ) : (
                      <>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="form-input"
                          onChange={(e) => handleFileUpload('fileVisitName', e)}
                          style={{ padding: '0.35rem', fontSize: '0.8rem' }}
                        />
                        {formData.fileVisitName && (
                          <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5, 150, 105, 0.08)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {formData.fileVisitName}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '0.1rem 0.35rem', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                                onClick={() => setPreviewAttachment({
                                  isOpen: true,
                                  title: 'Formulir Kunjungan Lapangan (Visit Form)',
                                  fileData: formData.fileVisitData || formData.fileVisitName,
                                  fileName: formData.fileVisitName || 'Formulir_Kunjungan_Lapangan'
                                })}
                              >
                                <Eye size={11} /> Cek
                              </button>
                              <button type="button" onClick={() => handleRemoveFile('fileVisitName')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* 3. Upload Tiket Transport */}
                  <div style={{ background: 'var(--bg-card-solid)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      <Plane size={16} color="#7c3aed" />
                      <span>3. Upload Tiket Transport (Maks. 3 MB)</span>
                    </label>
                    {isAdmin ? (
                      formData.fileTiketTransportName || formData.fileTiketTransportData ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Check size={13} color="#059669" /> Tiket transport terlampir
                          </span>
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
                            onClick={() => setPreviewAttachment({
                              isOpen: true,
                              title: 'Bukti Tiket Transportasi',
                              fileData: formData.fileTiketTransportData || formData.fileTiketTransportName,
                              fileName: formData.fileTiketTransportName || 'Bukti_Tiket_Transportasi'
                            })}
                          >
                            <Eye size={12} />
                            <span>Cek Lampiran</span>
                          </button>
                        </div>
                      ) : (
                        <div style={{ padding: '0.45rem 0.65rem', background: 'var(--bg-main)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                          Belum ada lampiran dari surveyor
                        </div>
                      )
                    ) : (
                      <>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="form-input"
                          onChange={(e) => handleFileUpload('fileTiketTransportName', e)}
                          style={{ padding: '0.35rem', fontSize: '0.8rem' }}
                        />
                        {formData.fileTiketTransportName && (
                          <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 700, marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(124, 58, 237, 0.08)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✈️ {formData.fileTiketTransportName}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '0.1rem 0.35rem', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                                onClick={() => setPreviewAttachment({
                                  isOpen: true,
                                  title: 'Bukti Tiket Transportasi',
                                  fileData: formData.fileTiketTransportData || formData.fileTiketTransportName,
                                  fileName: formData.fileTiketTransportName || 'Bukti_Tiket_Transportasi'
                                })}
                              >
                                <Eye size={11} /> Cek
                              </button>
                              <button type="button" onClick={() => handleRemoveFile('fileTiketTransportName')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* 4. Kwitansi Hotel */}
                  <div style={{ background: 'var(--bg-card-solid)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      <Receipt size={16} color="#d97706" />
                      <span>4. Kwitansi Hotel (Maks. 3 MB)</span>
                    </label>
                    {isAdmin ? (
                      formData.fileKwitansiHotelName || formData.fileKwitansiHotelData ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Check size={13} color="#059669" /> Kwitansi hotel terlampir
                          </span>
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
                            onClick={() => setPreviewAttachment({
                              isOpen: true,
                              title: 'Bukti Kwitansi Hotel / Penginapan',
                              fileData: formData.fileKwitansiHotelData || formData.fileKwitansiHotelName,
                              fileName: formData.fileKwitansiHotelName || 'Kwitansi_Hotel'
                            })}
                          >
                            <Eye size={12} />
                            <span>Cek Lampiran</span>
                          </button>
                        </div>
                      ) : (
                        <div style={{ padding: '0.45rem 0.65rem', background: 'var(--bg-main)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                          Belum ada lampiran dari surveyor
                        </div>
                      )
                    ) : (
                      <>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="form-input"
                          onChange={(e) => handleFileUpload('fileKwitansiHotelName', e)}
                          style={{ padding: '0.35rem', fontSize: '0.8rem' }}
                        />
                        {formData.fileKwitansiHotelName && (
                          <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 700, marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(217, 119, 6, 0.08)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🏨 {formData.fileKwitansiHotelName}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '0.1rem 0.35rem', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                                onClick={() => setPreviewAttachment({
                                  isOpen: true,
                                  title: 'Bukti Kwitansi Hotel / Penginapan',
                                  fileData: formData.fileKwitansiHotelData || formData.fileKwitansiHotelName,
                                  fileName: formData.fileKwitansiHotelName || 'Kwitansi_Hotel'
                                })}
                              >
                                <Eye size={11} /> Cek
                              </button>
                              <button type="button" onClick={() => handleRemoveFile('fileKwitansiHotelName')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        )}
                      </>
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
          </>
        )}
      </div>
        </div>
      </div>

      {/* Attachment Preview Modal */}
      <AttachmentPreviewModal
        isOpen={previewAttachment.isOpen}
        onClose={() => setPreviewAttachment({ isOpen: false, title: '', fileData: null, fileName: '' })}
        title={previewAttachment.title}
        fileData={previewAttachment.fileData}
        fileName={previewAttachment.fileName}
      />
    </ModalPortal>
  );
};
