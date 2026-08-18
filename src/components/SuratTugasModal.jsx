import { supabase } from '../lib/supabase';
import React, { useState, useEffect } from 'react';
import { X, Save, Anchor, Ticket, Paperclip, Printer, Sparkles, MapPin, Calendar, FileText, Hash, Shield, Camera, FileCheck2, Plane, Receipt, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { isEditWindowExpired, formatRupiah, cleanDocNumber } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';
import { sanitizeFormData } from '../utils/security';

export const SuratTugasModal = ({ isOpen, onClose, editItem = null, onPrint = null }) => {
  const { addSuratTugas, updateSuratTugas, adminSettings, tariffs, gradeTariffs } = useData();
  const { usersList, currentUser } = useAuth();
  const activeTariffs = tariffs && tariffs.length > 0 ? tariffs : [];

  const defaultLocation = activeTariffs[0]?.name || activeTariffs[0]?.tujuan || 'Kendawangan (Via Udara)';
  const defaultRate = activeTariffs[0]?.rate || 3000000;

  const surveyorUsers = (usersList || []).filter((u) => u.role === 'surveyor' || u.role === 'admin' || u.role === 'developer' || u.role === 'kacab');

  const [formData, setFormData] = useState({
    nomor: '',
    // 11 Form Fields
    namaKapal: '',
    pemohon: '',
    jenisSurvey: 'DINAS SURVEY KLAS',
    perihal: 'DINAS SURVEY KLAS',
    lokasi: defaultLocation,
    tempatSurvey: defaultLocation,
    tglMulai: '',
    tglSelesai: '',
    agenda: '',
    noOrder: '',
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
    saranaTransportasi: 'UDARA, DARAT DAN AIR',
    keteranganLain: 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
    kepalaCabang: adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
    nup: adminSettings?.nup || '48199-KI',
    // 4 Distinct Upload Files
    fileFotoName: '',
    fileVisitName: '',
    fileTiketTransportName: '',
    fileKwitansiHotelName: '',
    status: 'Belum Mulai',
    catatan: '',
    visit: '1',
    tembusan: '1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026'
  });

  useEffect(() => {
    if (editItem) {
      setFormData({
        ...editItem,
        nomor: cleanDocNumber(editItem.nomor),
        namaKapal: editItem.namaKapal || '',
        pemohon: editItem.pemohon || '',
        jenisSurvey: (editItem.jenisSurvey || editItem.perihal || 'DINAS SURVEY KLAS').toUpperCase(),
        perihal: (editItem.perihal || editItem.jenisSurvey || 'DINAS SURVEY KLAS').toUpperCase(),
        lokasi: (editItem.lokasi || editItem.tempatSurvey || defaultLocation).toUpperCase(),
        tempatSurvey: (editItem.tempatSurvey || editItem.lokasi || defaultLocation).toUpperCase(),
        agenda: editItem.agenda || editItem.perihal || '',
        noOrder: editItem.noOrder || 'RFQ-0000',
        jumlahHariLibur: editItem.jumlahHariLibur !== undefined ? editItem.jumlahHariLibur : (editItem.isCito ? 1 : 0),
        tiketHotel: editItem.tiketHotel || 0,
        tiketPesawatTaxi: editItem.tiketPesawatTaxi || editItem.biayaTiket || 0,
        kategoriPerjalanan: editItem.kategoriPerjalanan || '',
        pangkat: editItem.pangkat || 'GRADE 6 A',
        jabatan: editItem.jabatan || 'SURVEYOR',
        saranaTransportasi: editItem.saranaTransportasi || 'UDARA, DARAT DAN AIR',
        keteranganLain: editItem.keteranganLain || 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
        kepalaCabang: editItem.kepalaCabang || adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
        nup: editItem.nup || adminSettings?.nup || '48199-KI',
        tarifDasar: editItem.tarifDasar || defaultRate,
        isCito: !!editItem.isCito || (Number(editItem.jumlahHariLibur) > 0),
        biayaTiket: editItem.biayaTiket || (Number(editItem.tiketHotel || 0) + Number(editItem.tiketPesawatTaxi || 0)),
        kategoriTransportasi: editItem.kategoriTransportasi || 'Pesawat Terbang',
        // Uploads
        fileFotoName: editItem.fileFotoName || '',
        fileVisitName: editItem.fileVisitName || '',
        fileTiketTransportName: editItem.fileTiketTransportName || editItem.fileTiketName || '',
        fileKwitansiHotelName: editItem.fileKwitansiHotelName || '',
        visit: editItem.visit || '1',
        tembusan: editItem.tembusan || '1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026'
      });
    } else {
      const nextNum = String(Math.floor(Math.random() * 900) + 100);
      const defaultSurveyor = currentUser?.name || surveyorUsers[0]?.name || 'ALFIAN BONE PUTRA';
      const todayDate = new Date().toISOString().split('T')[0];

      setFormData({
        nomor: `A 0    /SV.${nextNum}/PK/KI-26`,
        namaKapal: '',
        pemohon: '',
        jenisSurvey: '',
        perihal: '',
        petugas: defaultSurveyor,
        pangkat: 'GRADE 6 A',
        jabatan: 'SURVEYOR',
        lokasi: '',
        tempatSurvey: '',
        tarifDasar: '',
        agenda: '',
        noOrder: 'RFQ-0000',
        jumlahHariLibur: '',
        tiketHotel: '',
        tiketPesawatTaxi: '',
        isCito: false,
        biayaTiket: 0,
        kategoriTransportasi: 'Pesawat Terbang',
        kategoriPerjalanan: '',
        saranaTransportasi: 'UDARA, DARAT DAN AIR',
        keteranganLain: 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
        kepalaCabang: adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
        nup: adminSettings?.nup || '48199-KI',
        fileFotoName: '',
        fileVisitName: '',
        fileTiketTransportName: '',
        fileKwitansiHotelName: '',
        tglMulai: todayDate,
        tglSelesai: todayDate,
        status: 'Belum Mulai',
        catatan: '',
        visit: '1',
        tembusan: '1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026'
      });
    }
  }, [editItem, isOpen, adminSettings, activeTariffs, currentUser]);

  if (!isOpen) return null;

  const handleLocationChange = (locName) => {
    const matched = activeTariffs.find((t) => (t.name === locName || t.tujuan === locName));
    const newRate = matched ? Number(matched.rate) : formData.tarifDasar;
    setFormData((prev) => ({
      ...prev,
      lokasi: locName.toUpperCase(),
      tempatSurvey: locName.toUpperCase(),
      tarifDasar: newRate
    }));
  };

  const handleFileUpload = async (fieldKey, e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        [fieldKey]: 'Mengunggah... ' + file.name
      }));

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      try {
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
  const currentHotelFee = Number(formData.tiketHotel) || 0; // rate per night
  const currentFlightTaxiFee = Number(formData.tiketPesawatTaxi) || Number(formData.biayaTiket) || 0;
  const biayaTAT = formData.kategoriPerjalanan === 'Luar Kota' && !formData.tanpaTAT ? (Number(adminSettings?.tatLuarKota) || 750000) : 0;
  
  const totalBiayaTransportHotel = (currentHotelFee * mlm) + currentFlightTaxiFee;
  const currentMatchedTariff = activeTariffs.find((t) => (t.name === formData.lokasi || t.tujuan === formData.lokasi));

  // Calculate Uang Harian
  const currentGradeTariff = (gradeTariffs || []).find((g) => g.grade === formData.pangkat);
  const uangHarianPerHari = currentGradeTariff ? Number(currentGradeTariff.uangHarian) : 0;
  
  const hariLibur = Number(formData.jumlahHariLibur) || 0;
  const tambahanLibur = hariLibur * (uangHarianPerHari * 0.5);
  
  let totalUangHarian = (uangHarianPerHari * jumlahHari) + tambahanLibur;
  let sisaHariUangHarian = jumlahHari;
  if (formData.tanpaUangHarian) {
    const deduct = formData.hariTanpaUangHarian !== undefined ? Number(formData.hariTanpaUangHarian) : jumlahHari;
    const validDeduct = Math.max(0, Math.min(deduct, jumlahHari));
    sisaHariUangHarian = jumlahHari - validDeduct;
    if (sisaHariUangHarian === 0) {
      totalUangHarian = 0;
    } else {
      totalUangHarian = (uangHarianPerHari * sisaHariUangHarian) + tambahanLibur;
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
      jenisSurvey: (formData.jenisSurvey || formData.perihal || 'DINAS SURVEY KLAS').toUpperCase(),
      perihal: (formData.perihal || formData.jenisSurvey || 'DINAS SURVEY KLAS').toUpperCase(),
      tempatSurvey: (formData.tempatSurvey || formData.lokasi).toUpperCase(),
      lokasi: (formData.lokasi || formData.tempatSurvey).toUpperCase(),
      agenda: formData.agenda || formData.perihal || '',
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
      return addSuratTugas(payload);
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

  if (!editItem && !formData.kategoriPerjalanan) {
    return (
      <ModalPortal>
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-content" style={{ maxWidth: '450px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ justifyContent: 'center', borderBottom: 'none', paddingBottom: 0, position: 'relative' }}>
              <h3 className="modal-title" style={{ fontSize: '1.25rem', color: 'var(--accent-primary)' }}>Pilih Kategori Perjalanan</h3>
              <button className="btn btn-secondary btn-icon" onClick={onClose} style={{ position: 'absolute', right: '1rem', top: '1rem' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem 2rem 2.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Silakan pilih kategori lokasi survei untuk menyesuaikan formulir secara otomatis.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '1rem', fontSize: '1rem', justifyContent: 'center', fontWeight: 700 }}
                  onClick={() => setFormData({ ...formData, kategoriPerjalanan: 'Dalam Kota', saranaTransportasi: 'DARAT DAN AIR' })}
                >
                  🚗 DALAM KOTA
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '1rem', fontSize: '1rem', justifyContent: 'center', background: '#0ea5e9', borderColor: '#0ea5e9', fontWeight: 700 }}
                  onClick={() => setFormData({ ...formData, kategoriPerjalanan: 'Luar Kota', saranaTransportasi: 'UDARA, DARAT DAN AIR' })}
                >
                  ✈️ LUAR KOTA
                </button>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  }

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" style={{ maxWidth: '840px' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="card-title-group">
              <Anchor size={22} style={{ color: 'var(--accent-primary)' }} />
              <div>
                <h3 className="modal-title">{editItem ? 'Edit Surat Tugas Survei' : 'Form Pengisian Survei Kapal (Surat Tugas)'}</h3>
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
                    <span>Nomor Surat Tugas *</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nomor}
                    onChange={(e) => setFormData({ ...formData, nomor: e.target.value })}
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
                      const selectedUser = surveyorUsers.find(u => u.name === e.target.value);
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
                    {surveyorUsers.map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
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
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  🗓️ KUNJUNGAN (VISIT)
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.5rem' }}>
                  {['1', '2', '3'].map((v) => (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="radio"
                        name="visit_top"
                        value={v}
                        checked={formData.visit === v}
                        onChange={(e) => setFormData({ ...formData, visit: e.target.value })}
                        style={{ transform: 'scale(1.2)' }}
                      />
                      Visit {v}
                    </label>
                  ))}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  * Jika pilih "Visit 1", cetakan SPS akan otomatis menyertakan halaman "Lampiran Permohonan Paraf".
                </span>
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
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  📋 11 RINCIAN PENUGASAN SURVEI KAPAL
                </div>

                {/* 1. NAMA KAPAL / OBJEK & 2. PEMOHON */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      1. NAMA KAPAL / OBJEK *
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.namaKapal}
                      onChange={(e) => setFormData({ ...formData, namaKapal: e.target.value })}
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
                    <select
                      className="form-select"
                      value={formData.jenisSurvey}
                      onChange={(e) => setFormData({ ...formData, jenisSurvey: e.target.value, perihal: e.target.value })}
                    >
                      <option value="">-- PILIH JENIS SURVEY --</option>
                      <option value="PEMBAHARUAN">PEMBAHARUAN</option>
                      <option value="TAHUNAN">TAHUNAN</option>
                      <option value="ANTARA">ANTARA</option>
                      <option value="PERPANJANGAN">PERPANJANGAN</option>
                      <option value="PENGEDOKAN">PENGEDOKAN</option>
                      <option value="UWILD">UWILD</option>
                      <option value="TUNDA DOK">TUNDA DOK</option>
                      <option value="POROS CABUT/TUNDA/DITEMPAT (PER POROS)">POROS CABUT/TUNDA/DITEMPAT (PER POROS)</option>
                      <option value="KHUSUS (PER JAM)***">KHUSUS (PER JAM)***</option>
                      <option value="PEMBARUAN LL">PEMBARUAN LL</option>
                      <option value="TAHUNAN LL">TAHUNAN LL</option>
                      <option value="REVALIDASI LL">REVALIDASI LL</option>
                      <option value="CONVEYANCE SURVEY">CONVEYANCE SURVEY</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={14} color="var(--accent-primary)" />
                      <span>4. TEMPAT SURVEY *</span>
                    </label>
                    <select
                      className="form-select"
                      value={formData.lokasi}
                      onChange={(e) => handleLocationChange(e.target.value)}
                      required
                    >
                      {activeTariffs
                        .filter(loc => (loc.kategori || 'Luar Kota') === formData.kategoriPerjalanan)
                        .map((loc) => {
                          const val = (loc.tujuan || loc.name).toUpperCase();
                          return (
                            <option key={loc.id} value={val}>
                              {val} {loc.rincian ? `(${loc.rincian.toUpperCase()})` : ''}
                            </option>
                          );
                        })}
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
                      onChange={(e) => setFormData({ ...formData, jumlahHariLibur: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* 7. AGENDA & 8. NO.ORDER */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <FileText size={14} color="var(--accent-primary)" />
                      <span>7. NO AGENDA *</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.agenda}
                      onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                      placeholder="isi dengan nomor agenda"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      8. NO.ORDER *
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.noOrder}
                      onChange={(e) => setFormData({ ...formData, noOrder: e.target.value })}
                      placeholder="Contoh: RFQ-0000"
                      required
                    />
                  </div>
                </div>

                {/* 9. TIKET HOTEL, 10. TIKET PESAWAT DAN TAXI */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      10. KWITANSI HOTEL (Harga per/malam)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      className="form-input"
                      value={formData.tiketHotel}
                      onChange={(e) => setFormData({ ...formData, tiketHotel: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder="0"
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                      {currentHotelFee > 0 ? `${formatRupiah(currentHotelFee)} / malam (Total: ${formatRupiah(currentHotelFee * mlm)})` : 'Rp 0'}
                    </span>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      11. TIKET PESAWAT DAN TAXI (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      className="form-input"
                      value={formData.tiketPesawatTaxi}
                      onChange={(e) => setFormData({ ...formData, tiketPesawatTaxi: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder="0"
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                      {currentFlightTaxiFee > 0 ? formatRupiah(currentFlightTaxiFee) : 'Rp 0'}
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap', padding: '0.5rem 0', borderTop: '1px solid var(--border-color)' }}>
                  {formData.kategoriPerjalanan === 'Luar Kota' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={formData.tanpaTAT || false}
                        onChange={(e) => setFormData({ ...formData, tanpaTAT: e.target.checked })}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                      />
                      Tanpa Biaya TAT
                    </label>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={formData.tanpaUangHarian || false}
                        onChange={(e) => setFormData({ ...formData, tanpaUangHarian: e.target.checked, hariTanpaUangHarian: e.target.checked ? jumlahHari : 0 })}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                      />
                      Tanpa Uang Harian
                    </label>
                    {formData.tanpaUangHarian && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem' }}>
                        <input
                          type="number"
                          min="1"
                          max={jumlahHari}
                          value={formData.hariTanpaUangHarian !== undefined ? formData.hariTanpaUangHarian : jumlahHari}
                          onChange={(e) => setFormData({ ...formData, hariTanpaUangHarian: Number(e.target.value) })}
                          style={{ width: '60px', padding: '0.2rem 0.4rem', fontSize: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                          title="Jumlah hari tanpa uang harian"
                        />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>hari (Sisa dibayar: {sisaHariUangHarian} hr)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Kalkulasi Otomatis Card */}
              {['admin', 'developer', 'kacab', 'keuangan'].includes(currentUser?.role) && (
                <div
                  style={{
                    background: 'var(--bg-main)',
                    border: '1.5px solid var(--border-color-strong)',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1.25rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-primary)', fontWeight: 800, fontSize: '0.825rem' }}>
                      <Sparkles size={15} />
                      <span>Kalkulasi Otomatis Biaya Lokasi & Honorarium Surveyor</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#047857', background: 'rgba(16, 185, 129, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                      ⚡ Otomatis Master SK BKI
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                    <div style={{ background: 'var(--bg-card-solid)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tarif Standar Lokasi</div>
                      <div style={{ fontSize: '0.925rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.1rem' }}>
                        {formatRupiah(currentBaseRate)}
                      </div>
                    </div>


                    <div style={{ background: 'var(--bg-card-solid)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: totalBiayaTransportHotel > 0 ? '#0284c7' : 'var(--text-muted)' }}>Hotel & Transport</div>
                      <div style={{ fontSize: '0.925rem', fontWeight: 800, color: totalBiayaTransportHotel > 0 ? '#0284c7' : 'var(--text-muted)', marginTop: '0.1rem' }}>
                        {totalBiayaTransportHotel > 0 ? `+${formatRupiah(totalBiayaTransportHotel)}` : 'Rp 0'}
                      </div>
                    </div>

                    {biayaTAT > 0 && (
                      <div style={{ background: 'var(--bg-card-solid)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#10b981' }}>Tarif Asal Tujuan (TAT)</div>
                        <div style={{ fontSize: '0.925rem', fontWeight: 800, color: '#10b981', marginTop: '0.1rem' }}>
                          +{formatRupiah(biayaTAT)}
                        </div>
                      </div>
                    )}

                    <div style={{ background: 'var(--bg-card-solid)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: '#f59e0b' }}>Uang Harian ({sisaHariUangHarian} hr)</div>
                      <div style={{ fontSize: '0.925rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.1rem' }}>
                        +{formatRupiah(totalUangHarian)}
                      </div>
                    </div>

                    <div style={{ background: 'var(--accent-light)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1.5px solid var(--accent-primary)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 700 }}>Total Estimasi Biaya</div>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--accent-primary)', marginTop: '0.1rem' }}>
                        {formatRupiah(totalEstimasiGrand)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ====== 4 DISTINCT UPLOAD SECTIONS ====== */}
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
                  📎 LAMPIRAN BERKAS & DOKUMEN LAPANGAN (4 UPLOAD)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  {/* 1. Upload Foto */}
                  <div style={{ background: 'var(--bg-card-solid)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      <Camera size={16} color="#0284c7" />
                      <span>1. Upload Foto (Dokumentasi/Kapal)</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="form-input"
                      onChange={(e) => handleFileUpload('fileFotoName', e)}
                      style={{ padding: '0.35rem', fontSize: '0.8rem' }}
                    />
                    {formData.fileFotoName ? (
                      <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 700, marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(2, 132, 199, 0.08)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📸 {formData.fileFotoName}</span>
                        <button type="button" onClick={() => handleRemoveFile('fileFotoName')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0 0.2rem' }}>
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Format: JPG, PNG, PDF</span>
                    )}
                  </div>

                  {/* 2. Upload Visit */}
                  <div style={{ background: 'var(--bg-card-solid)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
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
                      <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5, 150, 105, 0.08)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {formData.fileVisitName}</span>
                        <button type="button" onClick={() => handleRemoveFile('fileVisitName')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0 0.2rem' }}>
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Format: PDF, JPG, PNG</span>
                    )}
                  </div>

                  {/* 3. Upload Tiket Transport */}
                  <div style={{ background: 'var(--bg-card-solid)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
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
                      <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 700, marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(124, 58, 237, 0.08)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✈️ {formData.fileTiketTransportName}</span>
                        <button type="button" onClick={() => handleRemoveFile('fileTiketTransportName')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0 0.2rem' }}>
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Format: PDF, E-Ticket, JPG</span>
                    )}
                  </div>

                  {/* 4. Kwitansi Hotel */}
                  <div style={{ background: 'var(--bg-card-solid)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
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
                      <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 700, marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(217, 119, 6, 0.08)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🏨 {formData.fileKwitansiHotelName}</span>
                        <button type="button" onClick={() => handleRemoveFile('fileKwitansiHotelName')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0 0.2rem' }}>
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Format: Invoice PDF, Foto Kwitansi</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
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
                    <span>Simpan & Cetak Surat</span>
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
      </div>
    </ModalPortal>
  );
};
