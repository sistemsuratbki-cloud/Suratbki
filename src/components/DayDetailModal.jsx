import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, User, FileText, CheckCircle2, Plus, Save, Anchor, Printer, Sparkles, Hash, Shield, Camera, FileCheck2, Plane, Receipt } from 'lucide-react';
import { formatDateIndo, getStatusBadgeClass, formatRupiah, cleanDocNumber } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ModalPortal } from './ModalPortal';
import { SuratTugasPrintModal } from './SuratTugasPrintModal';
import { LaporanPrintModal } from './LaporanPrintModal';
import { sanitizeFormData } from '../utils/security';

export const DayDetailModal = ({ isOpen, onClose, selectedDate, tasksOnDate, kwitansiList, laporanList }) => {
  const { currentUser } = useAuth();
  const { suratTugas, addSuratTugas, addLaporanSurvei, updateSuratTugas, updateKwitansiHonor, kwitansiHonor, adminSettings, tariffs } = useData();
  const activeTariffs = tariffs && tariffs.length > 0 ? tariffs : [];

  const defaultLocName = activeTariffs[0]?.tujuan || activeTariffs[0]?.name || 'Kendawangan (Via Udara)';
  const defaultLocRate = activeTariffs[0]?.rate || 2500000;

  const [activeTab, setActiveTab] = useState('view');
  const [printSuratItem, setPrintSuratItem] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [printLaporanItem, setPrintLaporanItem] = useState(null);
  const [isLaporanPrintModalOpen, setIsLaporanPrintModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    nomor: '',
    // 11 Field Resmi
    namaKapal: '',
    pemohon: '',
    jenisSurvey: 'DINAS SURVEY KLAS',
    perihal: 'DINAS SURVEY KLAS',
    lokasi: defaultLocName,
    tempatSurvey: defaultLocName,
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
    tarifDasar: defaultLocRate,
    saranaTransportasi: 'UDARA, DARAT DAN AIR',
    keteranganLain: 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
    kepalaCabang: adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
    nup: adminSettings?.nup || '48199-KI',
    suratId: '',
    isCito: false,
    biayaTiket: 0,
    kategoriTransportasi: 'Pesawat Terbang',
    // 4 Upload Files
    fileFotoName: '',
    fileVisitName: '',
    fileTiketTransportName: '',
    fileKwitansiHotelName: '',
    hasil: '',
    status: 'Terkirim'
  });

  useEffect(() => {
    if (selectedDate && isOpen) {
      const activeSurat = tasksOnDate.length > 0 ? tasksOnDate[0] : (suratTugas[0] || null);

      const matchedLoc = activeSurat?.lokasi
        ? activeTariffs.find((t) => (t.name === activeSurat.lokasi || t.tujuan === activeSurat.lokasi))
        : activeTariffs[0];

      const initialLoc = activeSurat?.lokasi || matchedLoc?.tujuan || matchedLoc?.name || defaultLocName;
      const initialRate = activeSurat?.tarifDasar || matchedLoc?.rate || defaultLocRate;

      setFormData({
        nomor: cleanDocNumber(activeSurat?.nomor) || `A 0    /SV.${Math.floor(Math.random() * 900) + 100}/PK/KI-26`,
        namaKapal: activeSurat?.namaKapal || '',
        pemohon: activeSurat?.pemohon || '',
        jenisSurvey: activeSurat?.jenisSurvey || activeSurat?.perihal || 'DINAS SURVEY KLAS',
        perihal: activeSurat?.perihal || activeSurat?.jenisSurvey || 'DINAS SURVEY KLAS',
        petugas: activeSurat?.petugas || currentUser?.name || 'ALFIAN BONE PUTRA',
        pangkat: activeSurat?.pangkat || 'GRADE 6 A',
        jabatan: activeSurat?.jabatan || 'SURVEYOR',
        lokasi: initialLoc,
        tempatSurvey: initialLoc,
        tarifDasar: initialRate,
        agenda: activeSurat?.agenda || activeSurat?.perihal || '',
        noOrder: activeSurat?.noOrder || `ORD-${Date.now().toString().slice(-6)}`,
        jumlahHariLibur: activeSurat?.jumlahHariLibur !== undefined ? activeSurat.jumlahHariLibur : (activeSurat?.isCito ? 1 : 0),
        tiketHotel: activeSurat?.tiketHotel || 0,
        tiketPesawatTaxi: activeSurat?.tiketPesawatTaxi || activeSurat?.biayaTiket || 0,
        saranaTransportasi: activeSurat?.saranaTransportasi || 'UDARA, DARAT DAN AIR',
        keteranganLain: activeSurat?.keteranganLain || 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
        kepalaCabang: activeSurat?.kepalaCabang || adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
        nup: activeSurat?.nup || adminSettings?.nup || '48199-KI',
        tglMulai: activeSurat?.tglMulai || selectedDate,
        tglSelesai: activeSurat?.tglSelesai || selectedDate,
        suratId: activeSurat?.id || '',
        isCito: activeSurat ? (!!activeSurat.isCito || Number(activeSurat.jumlahHariLibur) > 0) : false,
        biayaTiket: activeSurat?.biayaTiket || 0,
        kategoriTransportasi: activeSurat?.kategoriTransportasi || 'Pesawat Terbang',
        // Uploads
        fileFotoName: activeSurat?.fileFotoName || '',
        fileVisitName: activeSurat?.fileVisitName || '',
        fileTiketTransportName: activeSurat?.fileTiketTransportName || activeSurat?.fileTiketName || '',
        fileKwitansiHotelName: activeSurat?.fileKwitansiHotelName || '',
        hasil: '',
        status: 'Terkirim'
      });

      if (currentUser?.role === 'surveyor' || tasksOnDate.length === 0) {
        setActiveTab('input');
      } else {
        setActiveTab('view');
      }
    }
  }, [selectedDate, isOpen, currentUser, tasksOnDate, suratTugas, activeTariffs, adminSettings]);

  if (!isOpen || !selectedDate) return null;

  const formattedDate = formatDateIndo(selectedDate);

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

  const handleFileUpload = (fieldKey, e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        [fieldKey]: file.name
      }));
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

  const currentBaseRate = Number(formData.tarifDasar) || defaultLocRate;
  const jumlahLibur = Number(formData.jumlahHariLibur) || 0;
  const isCitoActive = formData.isCito || jumlahLibur > 0;
  const citoRateMultiplier = jumlahLibur > 0 ? (0.5 * jumlahLibur) : 0.5;
  const currentCitoFee = isCitoActive ? Math.round(currentBaseRate * citoRateMultiplier) : 0;

  const currentHotelFee = Number(formData.tiketHotel) || 0;
  const currentFlightTaxiFee = Number(formData.tiketPesawatTaxi) || Number(formData.biayaTiket) || 0;
  const totalBiayaTransportHotel = currentHotelFee + currentFlightTaxiFee;
  const grandTotalEstimasi = currentBaseRate + currentCitoFee + totalBiayaTransportHotel;
  const currentMatchedTariff = activeTariffs.find((t) => (t.name === formData.lokasi || t.tujuan === formData.lokasi));

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
      jenisSurvey: formData.jenisSurvey || formData.perihal || 'DINAS SURVEY KLAS',
      perihal: formData.perihal || formData.jenisSurvey || 'DINAS SURVEY KLAS',
      petugas: formData.petugas,
      pangkat: formData.pangkat,
      jabatan: formData.jabatan,
      lokasi: formData.lokasi,
      tempatSurvey: formData.tempatSurvey || formData.lokasi,
      tarifDasar: currentBaseRate,
      agenda: formData.agenda,
      noOrder: formData.noOrder,
      jumlahHariLibur: jumlahLibur,
      tiketHotel: currentHotelFee,
      tiketPesawatTaxi: currentFlightTaxiFee,
      saranaTransportasi: formData.saranaTransportasi,
      keteranganLain: formData.keteranganLain,
      kepalaCabang: formData.kepalaCabang,
      nup: formData.nup,
      tglMulai: formData.tglMulai,
      tglSelesai: formData.tglSelesai,
      isCito: isCitoActive,
      biayaTiket: totalBiayaTransportHotel,
      kategoriTransportasi: formData.kategoriTransportasi,
      // 4 File Uploads
      fileFotoName: formData.fileFotoName,
      fileVisitName: formData.fileVisitName,
      fileTiketTransportName: formData.fileTiketTransportName,
      fileKwitansiHotelName: formData.fileKwitansiHotelName,
      fileTiketName: formData.fileTiketTransportName,
      jumlahEstimasi: grandTotalEstimasi
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
            isCito: isCitoActive,
            biayaTiket: totalBiayaTransportHotel,
            jumlah: grandTotalEstimasi,
            catatan: `Honorarium ${isCitoActive ? 'CITO (+50%)' : 'Standar'} + Transport/Hotel (${formatRupiah(totalBiayaTransportHotel)})`
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

    // Auto-update Laporan Survei fields if custom hasil/notes exist
    const existingLaporan = laporanList?.find(l => l.suratId === finalSuratId);
    const citoPrefix = isCitoActive ? '[⚡ CITO / Hari Libur] ' : '';
    const tiketInfo = totalBiayaTransportHotel > 0 ? ` [🎟️ Hotel/Tiket: ${formatRupiah(totalBiayaTransportHotel)}]` : '';
    const reportText = formData.hasil ? `${citoPrefix}${tiketInfo} [Kapal: ${formData.namaKapal} | Pemohon: ${formData.pemohon || '-'}] ${formData.hasil}` : `Survei kelaiklautan kapal ${formData.namaKapal}`;

    if (existingLaporan) {
      updateSuratTugas(finalSuratId, {
        ...basePayload,
        catatan: reportText
      });
    }

    return targetSurat;
  };

  const handleSaveSurvey = (e) => {
    e.preventDefault();
    const savedSurat = processSaveSurvey();
    if (savedSurat !== null) {
      alert(`Survei kapal ${formData.namaKapal} beserta 4 berkas lampiran berhasil disimpan ke sistem!`);
      onClose();
    }
  };

  const handleSaveAndPrintSurvey = (e) => {
    e.preventDefault();
    const savedSurat = processSaveSurvey();
    if (savedSurat !== null) {
      onClose();
      const itemToPrint = savedSurat || (suratTugas.length > 0 ? suratTugas[0] : null);
      if (itemToPrint) {
        setPrintSuratItem(itemToPrint);
        setIsPrintModalOpen(true);
      }
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
                <h3 className="modal-title">Inspeksi Kapal BKI Tanggal {formattedDate}</h3>
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
                  {tasksOnDate.map((st) => {
                    const kwitansi = kwitansiList.find((k) => k.suratId === st.id);
                    const laporan = laporanList.find((l) => l.suratId === st.id);

                    return (
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
                              {st.nomor} {st.noOrder && `• Order: ${st.noOrder}`}
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
                              <span>Cetak ST</span>
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

                        {/* Financial summary if available */}
                        <div style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-main)', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Estimasi Biaya & Honor: <strong>{formatRupiah(st.jumlahEstimasi || st.tarifDasar)}</strong></span>
                          {st.isCito && <span style={{ color: '#ef4444', fontWeight: 700 }}>⚡ CITO Libur</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Input Marine Survey Form (11 Fields + 4 Uploads) */
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
                    <input
                      type="text"
                      className="form-input"
                      value={formData.petugas}
                      onChange={(e) => setFormData({ ...formData, petugas: e.target.value })}
                      placeholder="Nama surveyor..."
                      required
                    />
                  </div>
                </div>

                {/* 11 Fields Box */}
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
                        placeholder="Contoh: KAPUAS BAHARI XXII"
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
                      <select
                        className="form-select"
                        value={formData.jenisSurvey}
                        onChange={(e) => setFormData({ ...formData, jenisSurvey: e.target.value, perihal: e.target.value })}
                      >
                        <option value="DINAS SURVEY KLAS">DINAS SURVEY KLAS</option>
                        <option value="SURVEY TAHUNAN (ANNUAL SURVEY)">SURVEY TAHUNAN (ANNUAL SURVEY)</option>
                        <option value="SURVEY ANTARA (INTERMEDIATE SURVEY)">SURVEY ANTARA (INTERMEDIATE SURVEY)</option>
                        <option value="SURVEY PEMBARUAN KELAS (RENEWAL SURVEY)">SURVEY PEMBARUAN KELAS (RENEWAL SURVEY)</option>
                        <option value="SURVEY KELAIKLAUTAN (STATUTORY)">SURVEY KELAIKLAUTAN (STATUTORY)</option>
                        <option value="SURVEY KERUSAKAN (DAMAGE SURVEY)">SURVEY KERUSAKAN (DAMAGE SURVEY)</option>
                        <option value="INSPEKSI KETEBALAN PELAT & LOAD LINE">INSPEKSI KETEBALAN PELAT & LOAD LINE</option>
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
                        {activeTariffs.map((loc) => (
                          <option key={loc.id} value={loc.tujuan || loc.name}>
                            {loc.tujuan || loc.name} — {formatRupiah(loc.rate)} {loc.rincian ? `(${loc.rincian})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 5. TANGGAL MULAI & 6. TANGGAL AKHIR */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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
                  </div>

                  {/* 7. AGENDA & 8. NO.ORDER */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <FileText size={14} color="var(--accent-primary)" />
                        <span>7. AGENDA *</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.agenda}
                        onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                        placeholder="Contoh: Pemeriksaan Ketebalan Pelat & Sertifikasi Kelaiklautan"
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
                        placeholder="Contoh: ORD-2026/08/001"
                        required
                      />
                    </div>
                  </div>

                  {/* 9. JUMLAH HARI LIBUR, 10. TIKET HOTEL, 11. TIKET PESAWAT DAN TAXI */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>
                        9. JUMLAH HARI LIBUR
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        className="form-input"
                        value={formData.jumlahHariLibur}
                        onChange={(e) => setFormData({ ...formData, jumlahHariLibur: Number(e.target.value) || 0, isCito: Number(e.target.value) > 0 })}
                        placeholder="0 hari"
                      />
                      <span style={{ fontSize: '0.7rem', color: formData.jumlahHariLibur > 0 ? '#ef4444' : 'var(--text-muted)', marginTop: '0.2rem', display: 'block', fontWeight: 600 }}>
                        {formData.jumlahHariLibur > 0 ? `⚡ Surcharge CITO (+${formData.jumlahHariLibur * 50}%)` : 'Hari kerja standar'}
                      </span>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>
                        10. TIKET HOTEL (Rp)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="50000"
                        className="form-input"
                        value={formData.tiketHotel}
                        onChange={(e) => setFormData({ ...formData, tiketHotel: Number(e.target.value) || 0 })}
                        placeholder="0"
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                        {currentHotelFee > 0 ? formatRupiah(currentHotelFee) : 'Rp 0'}
                      </span>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>
                        11. TIKET PESAWAT & TAXI (Rp)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="50000"
                        className="form-input"
                        value={formData.tiketPesawatTaxi}
                        onChange={(e) => setFormData({ ...formData, tiketPesawatTaxi: Number(e.target.value) || 0 })}
                        placeholder="0"
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                        {currentFlightTaxiFee > 0 ? formatRupiah(currentFlightTaxiFee) : 'Rp 0'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Automatic Tariff Calculation Breakdown Card */}
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
                      <span>Kalkulasi Otomatis Biaya Lokasi & Honorarium</span>
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
                      <div style={{ fontSize: '0.7rem', color: isCitoActive ? '#dc2626' : 'var(--text-muted)' }}>CITO Hari Libur</div>
                      <div style={{ fontSize: '0.925rem', fontWeight: 800, color: isCitoActive ? '#dc2626' : 'var(--text-muted)', marginTop: '0.1rem' }}>
                        {isCitoActive ? `+${formatRupiah(currentCitoFee)}` : 'Non-CITO'}
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-card-solid)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: totalBiayaTransportHotel > 0 ? '#0284c7' : 'var(--text-muted)' }}>Biaya Hotel & Tiket</div>
                      <div style={{ fontSize: '0.925rem', fontWeight: 800, color: totalBiayaTransportHotel > 0 ? '#0284c7' : 'var(--text-muted)', marginTop: '0.1rem' }}>
                        {totalBiayaTransportHotel > 0 ? `+${formatRupiah(totalBiayaTransportHotel)}` : 'Rp 0'}
                      </div>
                    </div>

                    <div style={{ background: 'var(--accent-light)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1.5px solid var(--accent-primary)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 700 }}>Total Estimasi Biaya</div>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--accent-primary)', marginTop: '0.1rem' }}>
                        {formatRupiah(grandTotalEstimasi)}
                      </div>
                    </div>
                  </div>
                </div>

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

                {/* Hasil & Catatan Temuan */}
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Hasil / Catatan Temuan Survei (Opsional)</label>
                  <textarea
                    className="form-textarea"
                    style={{ minHeight: '80px' }}
                    value={formData.hasil}
                    onChange={(e) => setFormData({ ...formData, hasil: e.target.value })}
                    placeholder="Catatan hasil inspeksi kelaiklautan dan kondisi kapal..."
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Batal
                  </button>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', fontWeight: 700 }}
                      onClick={handleSaveAndPrintSurvey}
                    >
                      <Printer size={16} color="var(--accent-primary)" />
                      <span>Simpan & Cetak ST</span>
                    </button>

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

      <LaporanPrintModal
        isOpen={isLaporanPrintModalOpen}
        onClose={() => setIsLaporanPrintModalOpen(false)}
        laporan={printLaporanItem}
        suratTugas={suratTugas}
      />
    </ModalPortal>
  );
};
