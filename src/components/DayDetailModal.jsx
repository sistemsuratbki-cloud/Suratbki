import { supabase } from '../lib/supabase';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, Calendar, MapPin, User, FileText, CheckCircle2, Plus, Save, Anchor, Printer, Sparkles, Hash, Shield, Camera, FileCheck2, Plane, Receipt, Ticket, Trash2 } from 'lucide-react';
import { formatDateIndo, getStatusBadgeClass, formatRupiah, cleanDocNumber } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ModalPortal } from './ModalPortal';
import { SuratTugasPrintModal } from './SuratTugasPrintModal';
import { SuratTugasPdsPrintModal } from './SuratTugasPdsPrintModal';
import { LaporanPrintModal } from './LaporanPrintModal';
import { sanitizeFormData } from '../utils/security';
import MultiShipInput from './MultiShipInput';
import MultiSurveySelect from './MultiSurveySelect';
import MultiPhotoUpload from './MultiPhotoUpload';

export const DayDetailModal = ({ isOpen, onClose, selectedDate, tasksOnDate = [], kwitansiList = [], laporanList = [], onSave = null }) => {
  const { currentUser, usersList } = useAuth();
  const { suratTugas, addSuratTugas, updateSuratTugas, updateKwitansiHonor, kwitansiHonor, adminSettings, tariffs, gradeTariffs } = useData();
  const activeTariffs = tariffs && tariffs.length > 0 ? tariffs : [];
  const surveyorUsers = (usersList || []).filter((u) => u.role === 'surveyor' || u.role === 'admin' || u.role === 'developer' || u.role === 'kacab');

  const defaultLocName = activeTariffs[0]?.tujuan || activeTariffs[0]?.name || 'PONTIANAK';
  const defaultLocRate = activeTariffs[0]?.rate || 2500000;

  const [activeTab, setActiveTab] = useState('view');
  const [printSuratItem, setPrintSuratItem] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPdsPrintModalOpen, setIsPdsPrintModalOpen] = useState(false);

  const [printLaporanItem, setPrintLaporanItem] = useState(null);
  const [isLaporanPrintModalOpen, setIsLaporanPrintModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    nomor: '',
    namaKapal: '',
    pemohon: '',
    jenisSurvey: 'DINAS SURVEY KLAS',
    perihal: 'DINAS SURVEY KLAS',
    petugas: '',
    pangkat: 'GRADE 6 A',
    jabatan: 'SURVEYOR',
    lokasi: defaultLocName,
    tempatSurvey: defaultLocName,
    tarifDasar: defaultLocRate,
    agenda: '',
    noOrder: 'RFQ-0000',
    tiketHotel: 0,
    tiketPesawatTaxi: 0,
    kategoriPerjalanan: '',
    saranaTransportasi: 'UDARA, DARAT DAN AIR',
    keteranganLain: 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
    kepalaCabang: adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
    nup: adminSettings?.nup || '48199-KI',
    fileFotoName: '',
    fileFotoData: '',
    fotoList: [],
    fileVisitName: '',
    fileTiketTransportName: '',
    fileKwitansiHotelName: '',
    tglMulai: '',
    tglSelesai: '',
    jumlahHariLibur: 0,
    status: 'Belum Mulai',
    catatan: '',
    isCito: false,
    hasil: '',
    visit: '1',
    tembusan: '1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026'
  });

  useEffect(() => {
    if (selectedDate) {
      const formatted = selectedDate.toISOString().split('T')[0];
      const nextNum = String(Math.floor(Math.random() * 900) + 100);
      const defaultSurveyor = currentUser?.name || surveyorUsers[0]?.name || 'ALFIAN BONE PUTRA';
      const userGrade = (surveyorUsers.find(u => u.name === defaultSurveyor))?.grade || 'GRADE 6 A';

      setFormData((prev) => ({
        ...prev,
        nomor: `A 0    /SV.${nextNum}/PK/KI-26`,
        tglMulai: formatted,
        tglSelesai: formatted,
        petugas: defaultSurveyor,
        pangkat: userGrade,
        kategoriPerjalanan: '',
        kategoriTransportasi: 'Pesawat Terbang',
        tiketHotel: 0,
        tiketPesawatTaxi: 0,
        jumlahHariLibur: 0,
        isCito: false,
        visit: '1'
      }));
    }
  }, [selectedDate, currentUser, surveyorUsers]);

  if (!isOpen) return null;

  const formattedDate = selectedDate ? formatDateIndo(selectedDate.toISOString().split('T')[0]) : '';

  const handleLocationChange = (locName) => {
    const matched = activeTariffs.find((t) => (t.name === locName || t.tujuan === locName));
    const newRate = matched ? Number(matched.rate) : formData.tarifDasar;
    setFormData((prev) => ({
      ...prev,
      lokasi: locName,
      tempatSurvey: locName,
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

  const handleOpenPrint = (surat) => {
    setPrintSuratItem(surat);
    setIsPrintModalOpen(true);
  };

  const handleOpenPdsPrint = (surat) => {
    setPrintSuratItem(surat);
    setIsPdsPrintModalOpen(true);
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
  const currentBaseRate = Number(formData.tarifDasar) || defaultLocRate;
  const currentHotelFee = Number(formData.tiketHotel) || 0;
  const currentFlightTaxiFee = Number(formData.tiketPesawatTaxi) || Number(formData.biayaTiket) || 0;
  const biayaTAT = formData.kategoriPerjalanan === 'Luar Kota' && !formData.tanpaTAT ? (Number(adminSettings?.tatLuarKota) || 750000) : 0;
  const totalBiayaTransportHotel = (currentHotelFee * mlm) + currentFlightTaxiFee;
  const currentMatchedTariff = activeTariffs.find((t) => (t.name === formData.lokasi || t.tujuan === formData.lokasi));

  // Calculate Uang Harian (Robust for both Dalam Kota and Luar Kota)
  const surveyorObj = (surveyorUsers || []).find(u => u.name === formData.petugas) || (usersList || []).find(u => u.name === formData.petugas);
  const effectiveGrade = formData.pangkat || surveyorObj?.grade || 'GRADE 6 A';
  const currentGradeTariff = (gradeTariffs || []).find(
    (g) => (g.grade || '').replace(/\s+/g, '').toUpperCase() === effectiveGrade.replace(/\s+/g, '').toUpperCase()
  );
  const uangHarianPerHari = currentGradeTariff ? Number(currentGradeTariff.uangHarian) : 300000;
  
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

  const grandTotalEstimasi = currentBaseRate + totalBiayaTransportHotel + biayaTAT + totalUangHarian;

  const processSaveSurvey = () => {
    if (!formData.namaKapal || !formData.petugas) {
      alert('Mohon isi Nama Kapal / Objek dan Nama Class Surveyor!');
      return null;
    }

    let targetSurat = null;
    let finalSuratId = formData.suratId;

    const basePayload = {
      nomor: formData.nomor,
      namaKapal: formData.namaKapal,
      pemohon: formData.pemohon,
      jenisSurvey: (formData.jenisSurvey || formData.perihal || 'DINAS SURVEY KLAS').toUpperCase(),
      perihal: (formData.perihal || formData.jenisSurvey || 'DINAS SURVEY KLAS').toUpperCase(),
      petugas: formData.petugas,
      pangkat: effectiveGrade,
      jabatan: formData.jabatan || 'SURVEYOR',
      lokasi: (formData.lokasi || formData.tempatSurvey || defaultLocName).toUpperCase(),
      tempatSurvey: (formData.tempatSurvey || formData.lokasi || defaultLocName).toUpperCase(),
      tarifDasar: currentBaseRate,
      agenda: formData.agenda,
      noOrder: formData.noOrder,
      tiketHotel: currentHotelFee,
      tiketPesawatTaxi: currentFlightTaxiFee,
      kategoriPerjalanan: formData.kategoriPerjalanan || 'Dalam Kota',
      saranaTransportasi: formData.saranaTransportasi,
      keteranganLain: formData.keteranganLain,
      kepalaCabang: formData.kepalaCabang,
      nup: formData.nup,
      tglMulai: formData.tglMulai,
      tglSelesai: formData.tglSelesai,
      biayaTiket: totalBiayaTransportHotel + biayaTAT,
      biayaTAT: biayaTAT,
      tanpaTAT: formData.tanpaTAT || false,
      tanpaUangHarian: formData.tanpaUangHarian || false,
      hariTanpaUangHarian: formData.hariTanpaUangHarian || 0,
      uangHarian: uangHarianPerHari,
      totalUangHarian: totalUangHarian,
      jumlahHari: jumlahHari,
      kategoriTransportasi: formData.kategoriTransportasi,
      fileFotoName: formData.fileFotoName,
      fileVisitName: formData.fileVisitName,
      fileTiketTransportName: formData.fileTiketTransportName,
      fileKwitansiHotelName: formData.fileKwitansiHotelName,
      fileTiketName: formData.fileTiketTransportName,
      jumlahEstimasi: grandTotalEstimasi,
      tembusan: formData.tembusan || '1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026'
    };

    if (finalSuratId) {
      const existingSurat = suratTugas.find((s) => s.id === finalSuratId);
      if (existingSurat) {
        const updatedSuratObj = {
          ...existingSurat,
          ...basePayload
        };

        updateSuratTugas(existingSurat.id, sanitizeFormData(updatedSuratObj));
        targetSurat = updatedSuratObj;

        const linkedKwitansi = kwitansiHonor.find((k) => k.suratId === existingSurat.id);
        if (linkedKwitansi) {
          updateKwitansiHonor(linkedKwitansi.id, sanitizeFormData({
            ...linkedKwitansi,
            tarifDasar: currentBaseRate,
            isCito: false,
            biayaTiket: totalBiayaTransportHotel,
            jumlah: grandTotalEstimasi,
            catatan: `Honorarium Standar + Transport/Hotel (${formatRupiah(totalBiayaTransportHotel)})`
          }));
        }
      }
    } else {
      const existingSurat = suratTugas.find(s => s.namaKapal?.toLowerCase() === formData.namaKapal?.toLowerCase());
      if (existingSurat) {
        targetSurat = existingSurat;
        finalSuratId = existingSurat.id;
      } else {
        targetSurat = addSuratTugas(sanitizeFormData({
          ...basePayload,
          status: 'Berjalan',
          catatan: formData.hasil || formData.agenda
        }));
        finalSuratId = targetSurat.id;
      }
    }

    return targetSurat;
  };

  const handleSaveSurvey = (e) => {
    e.preventDefault();
    const savedSurat = processSaveSurvey();
    if (savedSurat !== null) {
      toast.success(`Survei kapal ${formData.namaKapal} berhasil disimpan!`);
      if (onSave) onSave(savedSurat);
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
                <h3 className="modal-title">Survei Kapal BKI Tanggal {formattedDate}</h3>
                <div className="card-subtitle">{tasksOnDate.length} Surat Tugas aktif pada tanggal ini</div>
              </div>
            </div>
            <button className="btn btn-secondary btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {/* Tab Selector */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
            <button
              className="btn"
              style={{
                flex: 1,
                borderRadius: 0,
                borderBottom: activeTab === 'view' ? '3px solid var(--accent-primary)' : 'none',
                background: activeTab === 'view' ? 'var(--accent-light)' : 'transparent',
                color: activeTab === 'view' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: 700
              }}
              onClick={() => setActiveTab('view')}
            >
              <Calendar size={16} />
              <span>Lihat Tugas ({tasksOnDate.length})</span>
            </button>
            <button
              className="btn"
              style={{
                flex: 1,
                borderRadius: 0,
                borderBottom: activeTab === 'input' ? '3px solid var(--accent-primary)' : 'none',
                background: activeTab === 'input' ? 'var(--accent-light)' : 'transparent',
                color: activeTab === 'input' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: 700
              }}
              onClick={() => setActiveTab('input')}
            >
              <Plus size={16} />
              <span>Form Pengisian Survei Kapal</span>
            </button>
          </div>

          <div className="modal-body" style={{ maxHeight: 'calc(90vh - 140px)', overflowY: 'auto' }}>
            {activeTab === 'view' ? (
              tasksOnDate.length === 0 ? (
                <div className="table-empty" style={{ padding: '2.5rem 1rem' }}>
                  <Anchor size={42} style={{ opacity: 0.3, marginBottom: '0.5rem', color: 'var(--accent-primary)' }} />
                  <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Tidak ada jadwal survei kapal pada tanggal ini.</p>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Klik tab di atas untuk mengisi survei kapal baru.</p>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }} onClick={() => setActiveTab('input')}>
                    <Plus size={15} />
                    <span>Isi Survei Kapal Baru</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {tasksOnDate.map((st) => (
                    <div
                      key={st.id}
                      style={{
                        background: 'var(--bg-card-solid)',
                        border: '1px solid var(--border-color-strong)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                            {cleanDocNumber(st.nomor)} {st.noOrder && `• Order: ${st.noOrder}`}
                          </div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                            🚢 {st.namaKapal || 'MV Samudra Jaya'}
                          </div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            {st.jenisSurvey || st.perihal} {st.pemohon && `(Pemohon: ${st.pemohon})`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                            onClick={() => handleOpenPrint(st)}
                          >
                            <Printer size={13} />
                            <span>Cetak SPS</span>
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                            onClick={() => handleOpenPdsPrint(st)}
                          >
                            <FileText size={13} />
                            <span>Cetak PDS</span>
                          </button>
                          <span className={`badge ${getStatusBadgeClass(st.status)}`}>
                            <span className="badge-dot" />
                            {st.status}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                          <User size={14} />
                          <span>{st.petugas}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                          <MapPin size={14} />
                          <span>{st.lokasi || st.tempatSurvey}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', gridColumn: 'span 2' }}>
                          <Calendar size={14} />
                          <span>Periode: {formatDateIndo(st.tglMulai)} s/d {formatDateIndo(st.tglSelesai)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : !formData.kategoriPerjalanan ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>Pilih Kategori Perjalanan</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                  Silakan pilih kategori lokasi survei untuk menyesuaikan formulir secara otomatis.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px', margin: '0 auto' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '1rem', fontSize: '1rem', justifyContent: 'center', fontWeight: 700 }}
                    onClick={() => {
                      const firstLoc = activeTariffs.find(loc => (loc.kategori || 'Dalam Kota') === 'Dalam Kota') || activeTariffs[0];
                      const locName = firstLoc ? (firstLoc.tujuan || firstLoc.name) : 'Pontianak';
                      const locRate = firstLoc ? Number(firstLoc.rate) : defaultLocRate;
                      setFormData({
                        ...formData,
                        kategoriPerjalanan: 'Dalam Kota',
                        saranaTransportasi: 'DARAT DAN AIR',
                        lokasi: locName,
                        tempatSurvey: locName,
                        tarifDasar: locRate
                      });
                    }}
                  >
                    🚗 DALAM KOTA
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '1rem', fontSize: '1rem', justifyContent: 'center', background: '#0ea5e9', borderColor: '#0ea5e9', fontWeight: 700 }}
                    onClick={() => {
                      const firstLoc = activeTariffs.find(loc => (loc.kategori || 'Luar Kota') === 'Luar Kota') || activeTariffs[0];
                      const locName = firstLoc ? (firstLoc.tujuan || firstLoc.name) : 'Kendawangan (Via Udara)';
                      const locRate = firstLoc ? Number(firstLoc.rate) : defaultLocRate;
                      setFormData({
                        ...formData,
                        kategoriPerjalanan: 'Luar Kota',
                        saranaTransportasi: 'UDARA, DARAT DAN AIR',
                        lokasi: locName,
                        tempatSurvey: locName,
                        tarifDasar: locRate
                      });
                    }}
                  >
                    ✈️ LUAR KOTA
                  </button>
                </div>
              </div>
            ) : (
              /* Input Marine Survey Form */
              <form onSubmit={handleSaveSurvey}>
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
                      placeholder="Contoh: A 0    /SV.201/PK/KI-26"
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
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-primary)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    🗓️ KUNJUNGAN (VISIT)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}>
                      <input
                        type="checkbox"
                        checked={formData.visit === '1'}
                        onChange={(e) => setFormData({ ...formData, visit: e.target.checked ? '1' : '2' })}
                        style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                      />
                      <span>Visit 1 (Kunjungan Pertama)</span>
                    </label>
                  </div>
                </div>

                {/* 11 RINCIAN PENUGASAN SURVEI KAPAL */}
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>
                        1. NAMA KAPAL / OBJEK *
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
                        placeholder="Contoh: PT. PELAYARAN KAPUAS BAHARI"
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
                          .map((loc) => (
                            <option key={loc.id} value={loc.tujuan || loc.name}>
                              {loc.tujuan || loc.name} {loc.rincian ? `(${loc.rincian})` : ''}
                            </option>
                          ))}
                      </select>
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
                        placeholder="Contoh: RFQ-0000"
                      />
                    </div>
                  </div>

                  {/* 9. TIKET PESAWAT & 10. HOTEL */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Ticket size={14} color="var(--accent-primary)" />
                        <span>9. BIAYA TIKET PESAWAT / TAXI (Rp)</span>
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
                    </div>
                  </div>

                  {/* Opsi Tanpa TAT & Tanpa Uang Harian */}
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap', padding: '0.6rem 0.25rem 0', borderTop: '1px solid var(--border-color)' }}>
                    {formData.kategoriPerjalanan === 'Luar Kota' && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        <input
                          type="checkbox"
                          checked={formData.tanpaTAT || false}
                          onChange={(e) => setFormData({ ...formData, tanpaTAT: e.target.checked })}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                        />
                        <span>Tanpa Biaya TAT</span>
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
                            style={{ width: '60px', padding: '0.2rem 0.4rem', fontSize: '0.8rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                          />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>hari (Sisa dibayar: {sisaHariUangHarian} hr)</span>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid rgba(0, 102, 204, 0.15)', paddingBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                        {formData.kategoriPerjalanan} - {formData.lokasi}
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
                      <strong style={{ display: 'block', color: '#0284c7' }}>
                        {formatRupiah(currentBaseRate)}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Biaya Tiket Pesawat / Transport:</span>
                      <strong style={{ display: 'block', color: '#059669' }}>
                        {formatRupiah(currentFlightTaxiFee)}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Biaya Hotel ({mlm} Malam):</span>
                      <strong style={{ display: 'block', color: '#059669' }}>
                        {formatRupiah(currentHotelFee * mlm)}
                      </strong>
                    </div>
                    {formData.kategoriPerjalanan === 'Luar Kota' && (
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Transport Asal Tujuan (TAT):</span>
                        <strong style={{ display: 'block', color: '#d97706' }}>
                          {formatRupiah(biayaTAT)}
                        </strong>
                      </div>
                    )}
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Uang Harian ({sisaHariUangHarian} Hari + Tambahan):</span>
                      <strong style={{ display: 'block', color: '#059669' }}>
                        {formatRupiah(totalUangHarian)}
                        {hariLibur > 0 && <small style={{ color: '#ef4444', display: 'block', fontSize: '0.72rem' }}>Termasuk +50% Libur ({hariLibur} hr)</small>}
                      </strong>
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px dashed rgba(0, 102, 204, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Grand Total Biaya Estimasi:</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                      {formatRupiah(grandTotalEstimasi)}
                    </span>
                  </div>
                </div>

                {/* 4 BERKAS LAMPIRAN DOKUMEN */}
                <div
                  style={{
                    background: 'var(--bg-main)',
                    border: '1.5px solid var(--border-color-strong)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    marginBottom: '1.5rem'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-primary)', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    📎 4 BERKAS LAMPIRAN DOKUMEN (SURVEI KAPAL)
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* 1. Multi Photo Upload */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <MultiPhotoUpload
                        fotoList={formData.fotoList || []}
                        onChange={(newList) => setFormData({ ...formData, fotoList: newList })}
                      />
                    </div>

                    {/* 2. Berita Acara (Visit 1) */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <FileCheck2 size={15} color="var(--accent-primary)" />
                        <span>2. Berita Acara / Laporan Paraf (Visit 1)</span>
                      </label>
                      <input
                        type="file"
                        className="form-input"
                        accept=".pdf,image/*,.doc,.docx"
                        onChange={(e) => handleFileUpload('fileVisitName', e)}
                      />
                      {formData.fileVisitName && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>
                          <span>✓ {formData.fileVisitName}</span>
                          <button type="button" onClick={() => handleRemoveFile('fileVisitName')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 3. Tiket Transport */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Plane size={15} color="var(--accent-primary)" />
                        <span>3. Berkas Tiket Pesawat / Transportasi</span>
                      </label>
                      <input
                        type="file"
                        className="form-input"
                        accept=".pdf,image/*"
                        onChange={(e) => handleFileUpload('fileTiketTransportName', e)}
                      />
                      {formData.fileTiketTransportName && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>
                          <span>✓ {formData.fileTiketTransportName}</span>
                          <button type="button" onClick={() => handleRemoveFile('fileTiketTransportName')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 4. Kwitansi Hotel */}
                    <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
                      <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Receipt size={15} color="var(--accent-primary)" />
                        <span>4. Kwitansi Penginapan / Hotel</span>
                      </label>
                      <input
                        type="file"
                        className="form-input"
                        accept=".pdf,image/*"
                        onChange={(e) => handleFileUpload('fileKwitansiHotelName', e)}
                      />
                      {formData.fileKwitansiHotelName && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>
                          <span>✓ {formData.fileKwitansiHotelName}</span>
                          <button type="button" onClick={() => handleRemoveFile('fileKwitansiHotelName')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Batal
                  </button>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary">
                      <Save size={16} />
                      <span>Simpan Survei Kapal</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <SuratTugasPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        suratTugas={printSuratItem}
      />

      <SuratTugasPdsPrintModal
        isOpen={isPdsPrintModalOpen}
        onClose={() => setIsPdsPrintModalOpen(false)}
        suratTugas={printSuratItem}
      />

      <LaporanPrintModal
        isOpen={isLaporanPrintModalOpen}
        onClose={() => setIsLaporanPrintModalOpen(false)}
        laporan={printLaporanItem}
        suratTugas={suratTugas}
      />
    </ModalPortal>
  );
};
