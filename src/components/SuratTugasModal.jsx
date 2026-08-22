import { supabase } from '../lib/supabase';
import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Save,
  Anchor,
  Ticket,
  Paperclip,
  Printer,
  Sparkles,
  MapPin,
  Calendar,
  FileText,
  Hash,
  Shield,
  Camera,
  FileCheck2,
  Plane,
  Receipt,
  Trash2
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { isEditWindowExpired, formatRupiah, cleanDocNumber, extractAgendaNumber } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';
import { sanitizeFormData } from '../utils/security';
import MultiShipInput from './MultiShipInput';
import MultiSurveySelect from './MultiSurveySelect';
import MultiPhotoUpload from './MultiPhotoUpload';
import { getLocationCategory, findTariffByLocation } from '../utils/tariffData';

export const SuratTugasModal = ({ isOpen, onClose, editItem = null, onPrint = null }) => {
  const { addSuratTugas, addSpsBatch, updateSuratTugas, adminSettings, tariffs, gradeTariffs } = useData();
  const { usersList, currentUser } = useAuth();
  const activeTariffs = tariffs && tariffs.length > 0 ? tariffs : [];

  const defaultLocation = activeTariffs[0]?.tujuan || activeTariffs[0]?.name || 'WAJOK';
  const defaultRate = activeTariffs[0]?.rate || 500000;

  const surveyorUsers = useMemo(
    () => (usersList || []).filter((u) => u.role === 'surveyor' || u.role === 'kacab'),
    [usersList]
  );

  const [formData, setFormData] = useState({
    nomor: '',
    // 11 Form Fields
    namaKapal: '',
    pemohon: '',
    jenisSurvey: '',
    perihal: 'DINAS SURVEY KLAS',
    lokasi: defaultLocation,
    tempatSurvey: defaultLocation,
    tglMulai: '',
    tglSelesai: '',
    agenda: '',
    noOrder: 'RFQ-0000',
    jumlahHariLibur: 0,
    tiketHotel: 0,
    tiketPesawatTaxi: 0,
    // Complementary
    petugas: '',
    pangkat: 'GRADE 6 A',
    jabatan: 'SURVEYOR',
    tarifDasar: defaultRate,
    isCito: false,
    biayaTiket: 0,
    kategoriTransportasi: 'Pesawat Terbang',
    kategoriPerjalanan: 'Dalam Kota',
    saranaTransportasi: 'DARAT DAN AIR',
    keteranganLain: 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
    kepalaCabang: adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
    nup: adminSettings?.nup || '48199-KI',
    // 4 Distinct Upload Files
    fileFotoName: '',
    fileFotoData: '',
    fotoList: [],
    fileVisitName: '',
    fileTiketTransportName: '',
    fileKwitansiHotelName: '',
    status: 'Menunggu Survei',
    catatan: '',
    visit: '1',
    tanpaTAT: false,
    tanpaUangHarian: false,
    hariTanpaUangHarian: 0,
    tembusan: '1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026'
  });

  useEffect(() => {
    if (editItem) {
      const editLoc = editItem.lokasi || editItem.tempatSurvey || defaultLocation;
      const matchedTariff = findTariffByLocation(editLoc, activeTariffs);
      const editCategory = editItem.kategoriPerjalanan || matchedTariff?.kategori || getLocationCategory(editLoc, activeTariffs);

      setFormData({
        ...editItem,
        nomor: cleanDocNumber(editItem.nomor),
        namaKapal: editItem.namaKapal || '',
        pemohon: editItem.pemohon || '',
        jenisSurvey: (editItem.jenisSurvey || '').toUpperCase(),
        perihal: (editItem.perihal || 'DINAS SURVEY KLAS').toUpperCase(),
        lokasi: editLoc.toUpperCase(),
        tempatSurvey: editLoc.toUpperCase(),
        agenda: editItem.agenda || extractAgendaNumber(editItem.nomor) || '',
        noOrder: editItem.noOrder || 'RFQ-0000',
        jumlahHariLibur: editItem.jumlahHariLibur !== undefined ? editItem.jumlahHariLibur : (editItem.isCito ? 1 : 0),
        tiketHotel: editItem.tiketHotel || 0,
        tiketPesawatTaxi: editItem.tiketPesawatTaxi || editItem.biayaTiket || 0,
        kategoriPerjalanan: editCategory,
        pangkat: editItem.pangkat || 'GRADE 6 A',
        jabatan: editItem.jabatan || 'SURVEYOR',
        saranaTransportasi: editItem.saranaTransportasi || (editCategory === 'Dalam Kota' ? 'DARAT DAN AIR' : 'UDARA, DARAT DAN AIR'),
        keteranganLain:
          editItem.keteranganLain ||
          'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
        kepalaCabang: editItem.kepalaCabang || adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
        nup: editItem.nup || adminSettings?.nup || '48199-KI',
        tarifDasar: editItem.tarifDasar || (matchedTariff ? Number(matchedTariff.rate) : defaultRate),
        isCito: !!editItem.isCito || Number(editItem.jumlahHariLibur) > 0,
        biayaTiket: editItem.biayaTiket || Number(editItem.tiketHotel || 0) + Number(editItem.tiketPesawatTaxi || 0),
        kategoriTransportasi: editItem.kategoriTransportasi || 'Pesawat Terbang',
        tanpaTAT: editItem.tanpaTAT || false,
        tanpaUangHarian: editItem.tanpaUangHarian || false,
        hariTanpaUangHarian: editItem.hariTanpaUangHarian || 0,
        // Uploads
        fileFotoName: editItem.fileFotoName || '',
        fileFotoData: editItem.fileFotoData || '',
        fotoList: editItem.fotoList || [],
        fileVisitName: editItem.fileVisitName || '',
        fileTiketTransportName: editItem.fileTiketTransportName || editItem.fileTiketName || '',
        fileKwitansiHotelName: editItem.fileKwitansiHotelName || '',
        status: editItem.status || 'Menunggu Survei',
        visit: editItem.visit || '1',
        tembusan: editItem.tembusan || '1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026'
      });
    } else {
      const nextNum = String(Math.floor(Math.random() * 900) + 100);
      const defaultSurveyor = currentUser?.name || surveyorUsers[0]?.name || 'ALFIAN BONE PUTRA';
      const userGrade = surveyorUsers.find((u) => u.name === defaultSurveyor)?.grade || 'GRADE 6 A';
      const todayDate = new Date().toISOString().split('T')[0];

      const initialLoc = defaultLocation || 'WAJOK';
      const matchedInitial = findTariffByLocation(initialLoc, activeTariffs);
      const initialRate = matchedInitial ? Number(matchedInitial.rate) : defaultRate;
      const initialCategory = matchedInitial?.kategori || getLocationCategory(initialLoc, activeTariffs);

      setFormData({
        nomor: `A 0    /SV.${nextNum}/PK/KI-26`,
        namaKapal: '',
        pemohon: '',
        jenisSurvey: '',
        perihal: 'DINAS SURVEY KLAS',
        petugas: defaultSurveyor,
        pangkat: userGrade,
        jabatan: 'SURVEYOR',
        lokasi: initialLoc.toUpperCase(),
        tempatSurvey: initialLoc.toUpperCase(),
        tarifDasar: initialRate,
        agenda: nextNum,
        noOrder: 'RFQ-0000',
        jumlahHariLibur: 0,
        tiketHotel: 0,
        tiketPesawatTaxi: 0,
        isCito: false,
        biayaTiket: 0,
        kategoriTransportasi: 'Pesawat Terbang',
        kategoriPerjalanan: initialCategory,
        saranaTransportasi: initialCategory === 'Dalam Kota' ? 'DARAT DAN AIR' : 'UDARA, DARAT DAN AIR',
        keteranganLain:
          'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
        kepalaCabang: adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
        nup: adminSettings?.nup || '48199-KI',
        fileFotoName: '',
        fileFotoData: '',
        fotoList: [],
        fileVisitName: '',
        fileTiketTransportName: '',
        fileKwitansiHotelName: '',
        tglMulai: todayDate,
        tglSelesai: todayDate,
        status: 'Menunggu Survei',
        catatan: '',
        visit: '1',
        tanpaTAT: false,
        tanpaUangHarian: false,
        hariTanpaUangHarian: 0,
        tembusan: '1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026'
      });
    }
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  const handleLocationChange = (locName) => {
    const matched = findTariffByLocation(locName, activeTariffs);
    const newRate = matched ? Number(matched.rate) : formData.tarifDasar;
    const newCategory = matched?.kategori || getLocationCategory(locName, activeTariffs);
    setFormData((prev) => ({
      ...prev,
      lokasi: locName.toUpperCase(),
      tempatSurvey: locName.toUpperCase(),
      tarifDasar: newRate,
      kategoriPerjalanan: newCategory,
      saranaTransportasi: newCategory === 'Dalam Kota' ? 'DARAT DAN AIR' : 'UDARA, DARAT DAN AIR'
    }));
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
      [fieldKey]: ''
    }));
  };

  let jumlahHari = 1;
  if (formData.tglMulai && formData.tglSelesai) {
    const start = new Date(formData.tglMulai);
    const end = new Date(formData.tglSelesai);
    if (!isNaN(start) && !isNaN(end)) {
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      jumlahHari = diffDays > 0 ? diffDays : 1;
    }
  }

  const mlm = Math.max(0, jumlahHari - 1);
  const currentBaseRate = Number(formData.tarifDasar) || defaultRate;
  const currentHotelFee = Number(formData.tiketHotel) || 0;
  const currentFlightTaxiFee = Number(formData.tiketPesawatTaxi) || Number(formData.biayaTiket) || 0;
  const detectedCategory = formData.kategoriPerjalanan || getLocationCategory(formData.lokasi, activeTariffs);
  const biayaTAT = detectedCategory === 'Luar Kota' && !formData.tanpaTAT ? Number(adminSettings?.tatLuarKota) || 750000 : 0;
  const currentMatchedTariff = findTariffByLocation(formData.lokasi, activeTariffs);

  const totalBiayaTransportHotel = currentHotelFee * mlm + currentFlightTaxiFee;

  // Calculate Uang Harian
  const surveyorObj =
    (surveyorUsers || []).find((u) => u.name === formData.petugas) ||
    (usersList || []).find((u) => u.name === formData.petugas);
  const effectiveGrade = formData.pangkat || surveyorObj?.grade || 'GRADE 6 A';
  const currentGradeTariff = (gradeTariffs || []).find(
    (g) => (g.grade || '').replace(/\s+/g, '').toUpperCase() === effectiveGrade.replace(/\s+/g, '').toUpperCase()
  );
  const uangHarianPerHari = currentGradeTariff ? Number(currentGradeTariff.uangHarian) : 300000;

  const hariLibur = Number(formData.jumlahHariLibur) || 0;
  const tambahanLibur = hariLibur * (uangHarianPerHari * 0.5);

  let totalUangHarian = uangHarianPerHari * jumlahHari + tambahanLibur;
  let sisaHariUangHarian = jumlahHari;
  if (formData.tanpaUangHarian) {
    const deduct = formData.hariTanpaUangHarian !== undefined ? Number(formData.hariTanpaUangHarian) : jumlahHari;
    const validDeduct = Math.max(0, Math.min(deduct, jumlahHari));
    sisaHariUangHarian = jumlahHari - validDeduct;
    if (sisaHariUangHarian === 0) {
      totalUangHarian = 0;
    } else {
      totalUangHarian = uangHarianPerHari * sisaHariUangHarian + tambahanLibur;
    }
  }

  const totalEstimasiGrand = currentBaseRate + totalBiayaTransportHotel + biayaTAT + totalUangHarian;

  const processSave = () => {
    if (!formData.namaKapal || !formData.petugas) {
      alert('Mohon isi Nama Kapal / Objek dan Nama Class Surveyor!');
      return null;
    }

    const payload = sanitizeFormData({
      ...formData,
      docType: editItem ? editItem.docType || 'SPS' : 'SPS',
      isSps: true,
      status: formData.status || 'Menunggu Survei',
      kategoriPerjalanan: detectedCategory,
      jenisSurvey: (formData.jenisSurvey || '').toUpperCase(),
      perihal: (formData.perihal || 'DINAS SURVEY KLAS').toUpperCase(),
      tempatSurvey: (formData.tempatSurvey || formData.lokasi || 'WAJOK').toUpperCase(),
      lokasi: (formData.lokasi || formData.tempatSurvey || 'WAJOK').toUpperCase(),
      agenda: formData.agenda || extractAgendaNumber(formData.nomor) || '',
      tarifDasar: currentBaseRate,
      tiketHotel: currentHotelFee,
      tiketPesawatTaxi: currentFlightTaxiFee,
      biayaTiket: totalBiayaTransportHotel + biayaTAT,
      biayaTAT: biayaTAT,
      uangHarian: uangHarianPerHari,
      totalUangHarian: totalUangHarian,
      jumlahHari: jumlahHari,
      fileTiketName: formData.fileTiketTransportName || formData.fileTiketName,
      jumlahEstimasi: totalEstimasiGrand,
      tembusan: formData.tembusan || '1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026'
    });

    if (editItem) {
      updateSuratTugas(editItem.id, payload);
      return { ...payload, id: editItem.id };
    } else {
      const createdItems = addSpsBatch(payload);
      return createdItems && createdItems.length > 0 ? createdItems[0] : payload;
    }
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
        <div className="modal-content" style={{ maxWidth: '860px' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="card-title-group">
              <Anchor size={22} style={{ color: 'var(--accent-primary)' }} />
              <div>
                <h3 className="modal-title">{editItem ? 'Edit Surat Penunjukan Survey (SPS)' : 'Form Buat SPS Baru (Admin)'}</h3>
                <div className="card-subtitle">Format Formulir Standar BKI Cabang Pontianak</div>
              </div>
            </div>
            <button className="btn btn-secondary btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="modal-body" style={{ maxHeight: 'calc(90vh - 130px)', overflowY: 'auto' }}>
            <form onSubmit={handleSubmit}>
              {/* Header: Nomor Surat & Petugas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Hash size={14} color="var(--accent-primary)" />
                    <span>Nomor Surat Penunjukan Survey (SPS) *</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nomor}
                    onChange={(e) => {
                      const newNomor = e.target.value;
                      setFormData({ 
                        ...formData, 
                        nomor: newNomor,
                        agenda: extractAgendaNumber(newNomor) || formData.agenda 
                      });
                    }}
                    placeholder="A 0    /SV.201/PK/KI-26"
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Shield size={14} color="var(--accent-primary)" />
                    <span>Nama Class Surveyor *</span>
                  </label>
                  <select
                    className="form-select"
                    value={formData.petugas}
                    onChange={(e) => {
                      const selectedUser = surveyorUsers.find((u) => u.name === e.target.value);
                      if (selectedUser) {
                        setFormData({
                          ...formData,
                          petugas: selectedUser.name,
                          pangkat: selectedUser.grade || 'GRADE 6 A'
                        });
                      } else {
                        setFormData({ ...formData, petugas: e.target.value });
                      }
                    }}
                    required
                  >
                    <option value="">-- Pilih Surveyor --</option>
                    {surveyorUsers.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* KUNJUNGAN (VISIT) */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  border: '1.5px solid var(--border-color-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    color: 'var(--accent-primary)',
                    marginBottom: '0.75rem',
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '0.5rem'
                  }}
                >
                  🗓️ KUNJUNGAN (VISIT)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.95rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.visit === '1'}
                      onChange={(e) => setFormData({ ...formData, visit: e.target.checked ? '1' : '2' })}
                      style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                    />
                    <span>Visit 1 (Kunjungan Pertama)</span>
                  </label>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color: formData.visit === '1' ? 'var(--accent-primary)' : 'var(--text-muted)'
                    }}
                  >
                    {formData.visit === '1'
                      ? '✓ Dicentang: Visit 1 (Lampiran Permohonan Paraf akan disertakan).'
                      : 'ℹ️ Tidak dicentang: Dianggap Visit ke-2 dan seterusnya (tanpa Lampiran Permohonan Paraf).'}
                  </span>
                </div>
              </div>

              {/* ====== 11 FIELD SESUAI CONTOH FORM ====== */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  border: '1.5px solid var(--border-color-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    color: 'var(--accent-primary)',
                    marginBottom: '1rem',
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '0.5rem'
                  }}
                >
                  📋 11 RINCIAN PENUGASAN SURVEI KAPAL
                </div>

                {/* 1. NAMA KAPAL / OBJEK & 2. PEMOHON */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      1. NAMA KAPAL / OBJEK (Multi-Kapal Didukung) *
                    </label>
                    <MultiShipInput
                      value={formData.namaKapal}
                      onChange={(val) => setFormData({ ...formData, namaKapal: val })}
                      placeholder="Contoh: KAPUAS BAHARI XXII / TB. SAMUDRA 01"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      2. PEMOHON *
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.pemohon}
                      onChange={(e) => setFormData({ ...formData, pemohon: e.target.value })}
                      placeholder="Contoh: PT. PELAYARAN KAPUAS BAHARI / AGEN"
                      required
                    />
                  </div>
                </div>

                {/* 3. JENIS SURVEY & 4. TEMPAT SURVEY */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      3. JENIS SURVEY *
                    </label>
                    <MultiSurveySelect
                      value={formData.jenisSurvey}
                      onChange={(val) => setFormData({ ...formData, jenisSurvey: val, perihal: val })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label className="form-label" style={{ fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MapPin size={14} color="var(--accent-primary)" />
                        <span>4. TEMPAT SURVEY & TARIF SK *</span>
                      </label>
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          background: detectedCategory === 'Dalam Kota' ? 'rgba(5, 150, 105, 0.12)' : 'rgba(2, 132, 199, 0.12)',
                          color: detectedCategory === 'Dalam Kota' ? '#059669' : '#0284c7'
                        }}
                      >
                        {detectedCategory === 'Dalam Kota' ? '🚗 DALAM KOTA' : '✈️ LUAR KOTA'}
                      </span>
                    </div>
                    <select
                      className="form-select"
                      value={formData.lokasi}
                      onChange={(e) => handleLocationChange(e.target.value)}
                      required
                    >
                      <optgroup label="📍 DALAM KOTA (Wilayah Pontianak / Speedboat)">
                        {activeTariffs
                          .filter((loc) => (loc.kategori || getLocationCategory(loc.tujuan || loc.name, activeTariffs)) === 'Dalam Kota')
                          .map((loc) => {
                            const val = (loc.tujuan || loc.name).toUpperCase();
                            return (
                              <option key={loc.id} value={val}>
                                {val} {loc.rincian ? `(${loc.rincian.toUpperCase()})` : ''} - Rp {Number(loc.rate).toLocaleString('id-ID')}
                              </option>
                            );
                          })}
                      </optgroup>
                      <optgroup label="✈️ LUAR KOTA (Kalimantan Barat)">
                        {activeTariffs
                          .filter((loc) => (loc.kategori || getLocationCategory(loc.tujuan || loc.name, activeTariffs)) !== 'Dalam Kota')
                          .map((loc) => {
                            const val = (loc.tujuan || loc.name).toUpperCase();
                            return (
                              <option key={loc.id} value={val}>
                                {val} {loc.rincian ? `(${loc.rincian.toUpperCase()})` : ''} - Rp {Number(loc.rate).toLocaleString('id-ID')}
                              </option>
                            );
                          })}
                      </optgroup>
                    </select>
                    {currentMatchedTariff?.rincian && (
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                        Detail Tarif: {currentMatchedTariff.rincian.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* 5. TANGGAL MULAI, 6. TANGGAL AKHIR & HARI LIBUR */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={14} color="var(--accent-primary)" />
                      <span>5. TANGGAL MULAI *</span>
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.tglMulai}
                      onChange={(e) => setFormData({ ...formData, tglMulai: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={14} color="var(--accent-primary)" />
                      <span>6. TANGGAL AKHIR *</span>
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.tglSelesai}
                      onChange={(e) => setFormData({ ...formData, tglSelesai: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={14} color="var(--accent-primary)" />
                      <span>HARI LIBUR (Jml)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={jumlahHari}
                      className="form-input"
                      value={formData.jumlahHariLibur !== undefined ? formData.jumlahHariLibur : ''}
                      onChange={(e) =>
                        setFormData({ ...formData, jumlahHariLibur: e.target.value === '' ? '' : Number(e.target.value) })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* 7. AGENDA & 8. NO.ORDER */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <FileText size={14} color="var(--accent-primary)" />
                      <span>7. NO AGENDA</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.agenda}
                      onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                      placeholder="Contoh: 001/AG/BKI-PTK/2026"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      8. NO.ORDER
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.noOrder}
                      onChange={(e) => setFormData({ ...formData, noOrder: e.target.value })}
                      placeholder="Contoh: RFQ-0012"
                    />
                  </div>
                </div>

                {/* 9. TIKET & 10. HOTEL */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Ticket size={14} color="var(--accent-primary)" />
                      <span>9. BIAYA TIKET PESAWAT / TAXI (Total Rp)</span>
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.tiketPesawatTaxi}
                      onChange={(e) => setFormData({ ...formData, tiketPesawatTaxi: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Ticket size={14} color="var(--accent-primary)" />
                      <span>10. BIAYA HOTEL PER MALAM (Rp)</span>
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.tiketHotel}
                      onChange={(e) => setFormData({ ...formData, tiketHotel: Number(e.target.value) })}
                      placeholder="0"
                    />
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                      Kalkulasi: {mlm} malam x {formatRupiah(currentHotelFee)} = {formatRupiah(currentHotelFee * mlm)}
                    </span>
                  </div>
                </div>
                {/* Opsi Tanpa TAT & Tanpa Uang Harian */}
                <div
                  style={{
                    display: 'flex',
                    gap: '1.5rem',
                    marginTop: '1rem',
                    flexWrap: 'wrap',
                    padding: '0.6rem 0.25rem 0',
                    borderTop: '1px solid var(--border-color)'
                  }}
                >
                  {detectedCategory === 'Luar Kota' && (
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.tanpaTAT || false}
                        onChange={(e) => setFormData({ ...formData, tanpaTAT: e.target.checked })}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                      />
                      <span>Tanpa Biaya TAT (Rp 750.000)</span>
                    </label>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.tanpaUangHarian || false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tanpaUangHarian: e.target.checked,
                            hariTanpaUangHarian: e.target.checked ? jumlahHari : 0
                          })
                        }
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                      />
                      <span>Tanpa Uang Harian</span>
                    </label>
                    {formData.tanpaUangHarian && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem' }}>
                        <input
                          type="number"
                          min="1"
                          max={jumlahHari}
                          value={formData.hariTanpaUangHarian !== undefined ? formData.hariTanpaUangHarian : jumlahHari}
                          onChange={(e) => setFormData({ ...formData, hariTanpaUangHarian: Number(e.target.value) })}
                          style={{
                            width: '60px',
                            padding: '0.2rem 0.4rem',
                            fontSize: '0.8rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px'
                          }}
                          title="Jumlah hari tanpa uang harian"
                        />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          hari (Sisa dibayar: {sisaHariUangHarian} hr)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ESTIMASI KALKULASI CARD */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 102, 204, 0.05) 0%, rgba(14, 165, 233, 0.08) 100%)',
                  border: '1.5px solid var(--accent-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                    borderBottom: '1px solid rgba(0, 102, 204, 0.15)',
                    paddingBottom: '0.5rem'
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Sparkles size={16} /> Kalkulasi Otomatis Biaya Lokasi & Honorarium
                  </span>
                  <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                    Sistem Pintar BKI
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Kategori & Lokasi:</span>
                    <strong style={{ display: 'block', color: 'var(--text-primary)' }}>
                      {detectedCategory} - {formData.lokasi}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Lama Perjalanan Dinas:</span>
                    <strong style={{ display: 'block', color: 'var(--text-primary)' }}>
                      {jumlahHari} Hari ({mlm} Malam)
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Honorarium Surveyor:</span>
                    <strong style={{ display: 'block', color: '#0284c7' }}>{formatRupiah(currentBaseRate)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Biaya Tiket Pesawat / Transport:</span>
                    <strong style={{ display: 'block', color: '#059669' }}>{formatRupiah(currentFlightTaxiFee)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Biaya Hotel ({mlm} Malam):</span>
                    <strong style={{ display: 'block', color: '#059669' }}>{formatRupiah(currentHotelFee * mlm)}</strong>
                  </div>
                  {detectedCategory === 'Luar Kota' && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Transport Asal Tujuan (TAT):</span>
                      <strong style={{ display: 'block', color: '#d97706' }}>{formatRupiah(biayaTAT)}</strong>
                    </div>
                  )}
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Uang Harian ({jumlahHari} Hari + Tambahan):</span>
                    <strong style={{ display: 'block', color: '#7c3aed' }}>{formatRupiah(totalUangHarian)}</strong>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '1rem',
                    paddingTop: '0.75rem',
                    borderTop: '1.5px dashed var(--accent-primary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    Total Estimasi Biaya (Surat Tugas):
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    {formatRupiah(totalEstimasiGrand)}
                  </span>
                </div>
              </div>

              {/* 4 DOKUMEN LAMPIRAN */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  border: '1.5px solid var(--border-color-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    color: 'var(--accent-primary)',
                    marginBottom: '0.75rem',
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '0.5rem'
                  }}
                >
                  📎 4 DOKUMEN & FOTO DOKUMENTASI (OPSIONAL)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* 1. Upload Foto Dokumentasi */}
                  <div
                    style={{
                      background: 'var(--bg-card-solid)',
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <label
                      className="form-label"
                      style={{
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        color: 'var(--text-primary)',
                        marginBottom: '0.5rem'
                      }}
                    >
                      <Camera size={16} color="var(--accent-primary)" />
                      <span>1. Foto Dokumentasi Lapangan (Max 5)</span>
                    </label>
                    <MultiPhotoUpload
                      fotoList={formData.fotoList || []}
                      onChange={(updatedList) => {
                        setFormData({
                          ...formData,
                          fotoList: updatedList,
                          fileFotoName: updatedList.length > 0 ? `${updatedList.length} Foto Terlampir` : '',
                          fileFotoData: updatedList[0]?.url || ''
                        });
                      }}
                      maxPhotos={5}
                    />
                  </div>

                  {/* 2. Upload Visit */}
                  <div
                    style={{
                      background: 'var(--bg-card-solid)',
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <label
                      className="form-label"
                      style={{
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        color: 'var(--text-primary)',
                        marginBottom: '0.5rem'
                      }}
                    >
                      <FileCheck2 size={16} color="#059669" />
                      <span>2. Upload Visit (Form Visit / Lapangan)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="form-input"
                      onChange={(e) => handleFileUpload('fileVisitName', e)}
                      style={{ padding: '0.35rem', fontSize: '0.8rem' }}
                    />
                    {formData.fileVisitName ? (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#059669',
                          fontWeight: 700,
                          marginTop: '0.4rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(5, 150, 105, 0.08)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          📄 {formData.fileVisitName}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile('fileVisitName')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0 0.2rem' }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                        Format: PDF, JPG, PNG
                      </span>
                    )}
                  </div>

                  {/* 3. Upload Tiket Transport */}
                  <div
                    style={{
                      background: 'var(--bg-card-solid)',
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <label
                      className="form-label"
                      style={{
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        color: 'var(--text-primary)',
                        marginBottom: '0.5rem'
                      }}
                    >
                      <Plane size={16} color="#7c3aed" />
                      <span>3. Upload Tiket Transport (Pesawat/Taxi)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="form-input"
                      onChange={(e) => handleFileUpload('fileTiketTransportName', e)}
                      style={{ padding: '0.35rem', fontSize: '0.8rem' }}
                    />
                    {formData.fileTiketTransportName ? (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#7c3aed',
                          fontWeight: 700,
                          marginTop: '0.4rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(124, 58, 237, 0.08)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          ✈️ {formData.fileTiketTransportName}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile('fileTiketTransportName')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0 0.2rem' }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                        Format: PDF, E-Ticket, JPG
                      </span>
                    )}
                  </div>

                  {/* 4. Kwitansi Hotel */}
                  <div
                    style={{
                      background: 'var(--bg-card-solid)',
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <label
                      className="form-label"
                      style={{
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        color: 'var(--text-primary)',
                        marginBottom: '0.5rem'
                      }}
                    >
                      <Receipt size={16} color="#d97706" />
                      <span>4. Kwitansi Hotel (Invoice Penginapan)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="form-input"
                      onChange={(e) => handleFileUpload('fileKwitansiHotelName', e)}
                      style={{ padding: '0.35rem', fontSize: '0.8rem' }}
                    />
                    {formData.fileKwitansiHotelName ? (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#d97706',
                          fontWeight: 700,
                          marginTop: '0.4rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(217, 119, 6, 0.08)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          🏨 {formData.fileKwitansiHotelName}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile('fileKwitansiHotelName')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0 0.2rem' }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                        Format: Invoice PDF, Foto Kwitansi
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '1.25rem'
                }}
              >
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Batal
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', fontWeight: 700 }}
                    onClick={handleSaveAndPrint}
                  >
                    <Printer size={16} color="var(--accent-primary)" />
                    <span>Simpan & Cetak SPS</span>
                  </button>

                  <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                    <Save size={16} />
                    <span>Simpan Dokumen SPS</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
