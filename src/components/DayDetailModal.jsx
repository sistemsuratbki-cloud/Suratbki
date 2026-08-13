import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, User, FileText, CheckCircle2, Plus, Save, Anchor, Ticket, Paperclip, Printer } from 'lucide-react';
import { formatDateIndo, getStatusBadgeClass, formatRupiah } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ModalPortal } from './ModalPortal';
import { SuratTugasPrintModal } from './SuratTugasPrintModal';
import { LaporanPrintModal } from './LaporanPrintModal';

export const DayDetailModal = ({ isOpen, onClose, selectedDate, tasksOnDate, kwitansiList, laporanList }) => {
  const { currentUser } = useAuth();
  const { suratTugas, addLaporanSurvei, updateSuratTugas, updateKwitansiHonor, kwitansiHonor, adminSettings } = useData();

  const [activeTab, setActiveTab] = useState('view');
  const [printSuratItem, setPrintSuratItem] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [printLaporanItem, setPrintLaporanItem] = useState(null);
  const [isLaporanPrintModalOpen, setIsLaporanPrintModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    nomor: '',
    namaKapal: '',
    petugas: '',
    pangkat: 'GRADE 6 A',
    jabatan: 'SURVEYOR',
    perihal: 'DINAS SURVEY KLAS',
    lokasi: '',
    saranaTransportasi: 'UDARA, DARAT DAN AIR',
    keteranganLain: 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
    kepalaCabang: adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
    nup: adminSettings?.nup || '48199-KI',
    tglMulai: '',
    tglSelesai: '',
    suratId: '',
    isCito: false,
    biayaTiket: 0,
    kategoriTransportasi: 'Pesawat Terbang',
    fileTiketName: '',
    hasil: '',
    status: 'Terkirim'
  });

  useEffect(() => {
    if (selectedDate && isOpen) {
      const activeSurat = tasksOnDate.length > 0 ? tasksOnDate[0] : (suratTugas[0] || null);

      setFormData({
        nomor: activeSurat?.nomor || `A 0    /SV.${Math.floor(Math.random() * 900) + 100}/PK/KI-26`,
        namaKapal: activeSurat?.namaKapal || 'KAPUAS BAHARI XXII',
        petugas: activeSurat?.petugas || currentUser?.name || 'ALFIAN BONE PUTRA',
        pangkat: activeSurat?.pangkat || 'GRADE 6 A',
        jabatan: activeSurat?.jabatan || 'SURVEYOR',
        perihal: activeSurat?.perihal || 'DINAS SURVEY KLAS',
        lokasi: activeSurat?.lokasi || 'KENDAWANGAN',
        saranaTransportasi: activeSurat?.saranaTransportasi || 'UDARA, DARAT DAN AIR',
        keteranganLain: activeSurat?.keteranganLain || 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
        kepalaCabang: activeSurat?.kepalaCabang || adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
        nup: activeSurat?.nup || adminSettings?.nup || '48199-KI',
        tglMulai: selectedDate,
        tglSelesai: selectedDate,
        suratId: activeSurat?.id || '',
        isCito: activeSurat ? !!activeSurat.isCito : false,
        biayaTiket: activeSurat?.biayaTiket || 1250000,
        kategoriTransportasi: activeSurat?.kategoriTransportasi || 'Pesawat Terbang',
        fileTiketName: activeSurat?.fileTiketName || '',
        hasil: '',
        status: 'Terkirim'
      });

      if (currentUser?.role === 'surveyor') {
        setActiveTab('input');
      } else {
        setActiveTab('view');
      }
    }
  }, [selectedDate, isOpen, currentUser, tasksOnDate, suratTugas]);

  if (!isOpen || !selectedDate) return null;

  const formattedDate = formatDateIndo(selectedDate);

  const handleSuratSelect = (suratId) => {
    const selected = suratTugas.find((s) => s.id === suratId);
    setFormData((prev) => ({
      ...prev,
      suratId,
      namaKapal: selected?.namaKapal || prev.namaKapal,
      lokasi: selected?.lokasi || prev.lokasi,
      isCito: selected ? !!selected.isCito : prev.isCito,
      biayaTiket: selected?.biayaTiket || prev.biayaTiket,
      kategoriTransportasi: selected?.kategoriTransportasi || prev.kategoriTransportasi,
      fileTiketName: selected?.fileTiketName || prev.fileTiketName
    }));
  };

  const handleTicketFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        fileTiketName: file.name
      }));
    }
  };

  const handleOpenPrint = (surat) => {
    setPrintSuratItem(surat);
    setIsPrintModalOpen(true);
  };

  const processSaveSurvey = () => {
    if (!formData.namaKapal || !formData.petugas || !formData.hasil) {
      alert('Mohon lengkapi Nama Kapal, Nama Surveyor, dan Hasil Survei!');
      return null;
    }

    let targetSurat = null;
    let finalSuratId = formData.suratId;

    if (finalSuratId) {
      const existingSurat = suratTugas.find((s) => s.id === finalSuratId);
      if (existingSurat) {
        const baseRate = existingSurat.tarifDasar || 3500000;
        const citoRate = formData.isCito ? Math.round(baseRate * 1.5) : baseRate;
        const totalWithTiket = citoRate + (Number(formData.biayaTiket) || 0);

        const updatedSuratObj = {
          ...existingSurat,
          nomor: formData.nomor || existingSurat.nomor,
          namaKapal: formData.namaKapal,
          petugas: formData.petugas,
          pangkat: formData.pangkat,
          jabatan: formData.jabatan,
          perihal: formData.perihal,
          lokasi: formData.lokasi,
          saranaTransportasi: formData.saranaTransportasi,
          keteranganLain: formData.keteranganLain,
          kepalaCabang: formData.kepalaCabang,
          nup: formData.nup,
          tglMulai: formData.tglMulai,
          tglSelesai: formData.tglSelesai,
          isCito: formData.isCito,
          biayaTiket: formData.biayaTiket,
          kategoriTransportasi: formData.kategoriTransportasi,
          fileTiketName: formData.fileTiketName,
          jumlahEstimasi: totalWithTiket
        };

        updateSuratTugas(existingSurat.id, updatedSuratObj);
        targetSurat = updatedSuratObj;

        const linkedKwitansi = kwitansiHonor.find((k) => k.suratId === existingSurat.id);
        if (linkedKwitansi) {
          updateKwitansiHonor(linkedKwitansi.id, {
            ...linkedKwitansi,
            isCito: formData.isCito,
            biayaTiket: formData.biayaTiket,
            jumlah: totalWithTiket,
            catatan: `Honorarium ${formData.isCito ? 'CITO (+50%)' : 'Standar'} + Tiket (${formData.kategoriTransportasi}: ${formatRupiah(formData.biayaTiket)})`
          });
        }
      }
    } else {
      const existingSurat = suratTugas.find(s => s.namaKapal?.toLowerCase() === formData.namaKapal?.toLowerCase());
      if (existingSurat) {
        targetSurat = existingSurat;
        finalSuratId = existingSurat.id;
      } else {
        const nextNum = String(Math.floor(Math.random() * 900) + 100);
        targetSurat = addSuratTugas({
          nomor: formData.nomor || `A 0    /SV.${nextNum}/PK/KI-26`,
          namaKapal: formData.namaKapal,
          perihal: formData.perihal || `DINAS SURVEY KLAS`,
          petugas: formData.petugas,
          pangkat: formData.pangkat || 'GRADE 6 A',
          jabatan: formData.jabatan || 'SURVEYOR',
          lokasi: formData.lokasi || 'KENDAWANGAN',
          saranaTransportasi: formData.saranaTransportasi || 'UDARA, DARAT DAN AIR',
          keteranganLain: formData.keteranganLain || 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
          kepalaCabang: formData.kepalaCabang || 'MUHSON NURROCHMAT',
          nup: formData.nup || '48199-KI',
          tarifDasar: 3500000,
          isCito: formData.isCito,
          biayaTiket: Number(formData.biayaTiket) || 0,
          kategoriTransportasi: formData.kategoriTransportasi || 'Pesawat Terbang',
          fileTiketName: formData.fileTiketName || '',
          tglMulai: formData.tglMulai || new Date().toISOString().split('T')[0],
          tglSelesai: formData.tglSelesai || new Date().toISOString().split('T')[0],
          status: 'Berjalan',
          catatan: formData.hasil
        });
        finalSuratId = targetSurat.id;
      }
    }

    const citoPrefix = formData.isCito ? '[⚡ CITO / Hari Libur (+50%)] ' : '';
    const tiketInfo = formData.biayaTiket ? ` [🎟️ Tiket ${formData.kategoriTransportasi}: ${formatRupiah(formData.biayaTiket)}]` : '';

    addLaporanSurvei({
      suratId: finalSuratId,
      namaKapal: formData.namaKapal,
      petugas: formData.petugas,
      tglLapor: formData.tglMulai,
      tglSelesai: formData.tglSelesai,
      lokasi: formData.lokasi,
      isCito: formData.isCito,
      biayaTiket: formData.biayaTiket,
      fileTiketName: formData.fileTiketName,
      hasil: `${citoPrefix}${tiketInfo} [Kapal: ${formData.namaKapal} | Lokasi: ${formData.lokasi}] ${formData.hasil}`,
      status: formData.status
    });

    return targetSurat;
  };

  const handleSaveSurvey = (e) => {
    e.preventDefault();
    const savedSurat = processSaveSurvey();
    if (savedSurat !== null) {
      alert(
        `Laporan survei kelayakan kapal ${formData.namaKapal} ${formData.biayaTiket ? `beserta Tiket ${formatRupiah(formData.biayaTiket)}` : ''} berhasil disimpan!`
      );
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
        <div className="modal-content" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
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

          {/* Tab Selector inside Modal */}
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

          <div className="modal-body">
            {activeTab === 'view' ? (
              tasksOnDate.length === 0 ? (
                <div className="table-empty">
                  <Anchor size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <p>Tidak ada jadwal survei kapal pada tanggal ini.</p>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }} onClick={() => setActiveTab('input')}>
                    <Plus size={15} />
                    <span>Isi Laporan Survei Kapal Baru</span>
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
                              {st.nomor}
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e3a8a', marginTop: '0.15rem' }}>
                              🚢 {st.namaKapal || 'MV Samudra Jaya'}
                            </div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                              {st.perihal}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                                onClick={() => handleOpenPrint(st)}
                                title="Download / Cetak PDF Surat Tugas"
                              >
                                <Printer size={13} />
                                <span>Cetak ST</span>
                              </button>
                              <span className={`badge ${getStatusBadgeClass(st.status)}`}>
                                <span className="badge-dot" />
                                {st.status}
                              </span>
                            </div>
                            {st.isCito && (
                              <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                                ⚡ CITO / Libur (+50%)
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                            <User size={14} />
                            <span>{st.petugas}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                            <MapPin size={14} />
                            <span>{st.lokasi}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', gridColumn: 'span 2' }}>
                            <Calendar size={14} />
                            <span>Periode: {formatDateIndo(st.tglMulai)} s/d {formatDateIndo(st.tglSelesai)}</span>
                          </div>
                        </div>

                        {/* Travel Ticket Badge if present */}
                        {st.biayaTiket > 0 && (
                          <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '6px', fontSize: '0.8rem', color: '#065f46', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                              <Ticket size={15} color="#10b981" />
                              <span>Tiket {st.kategoriTransportasi || 'Perjalanan'}: {formatRupiah(st.biayaTiket)}</span>
                            </div>
                            {st.fileTiketName && (
                              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Paperclip size={12} />
                                <span>{st.fileTiketName}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Status Kwitansi & Laporan */}
                        <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)', fontSize: '0.8rem' }}>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <FileText size={14} color="var(--text-muted)" />
                            <span>Kwitansi:</span>
                            {kwitansi ? (
                              <span className={`badge ${getStatusBadgeClass(kwitansi.status)}`} style={{ fontSize: '0.7rem' }}>
                                {kwitansi.status} ({formatRupiah(kwitansi.jumlah)})
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum dibuat</span>
                            )}
                          </div>

                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <CheckCircle2 size={14} color="var(--text-muted)" />
                            <span>Laporan:</span>
                            {laporan ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span className={`badge ${getStatusBadgeClass(laporan.status)}`} style={{ fontSize: '0.7rem' }}>
                                  {laporan.status}
                                </span>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                                  onClick={() => {
                                    setPrintLaporanItem(laporan);
                                    setIsLaporanPrintModalOpen(true);
                                  }}
                                  title="Cetak PDF Laporan"
                                >
                                  <Printer size={11} />
                                  <span>PDF</span>
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum dibuat</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Input Marine Survey Form for Surveyor */
              <form onSubmit={handleSaveSurvey}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Nomor Surat Tugas *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.nomor}
                      onChange={(e) => setFormData({ ...formData, nomor: e.target.value })}
                      placeholder="Contoh: A 0    /SV.201/PK/KI-26"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nama Kapal (Vessel Name) *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.namaKapal}
                      onChange={(e) => setFormData({ ...formData, namaKapal: e.target.value })}
                      placeholder="Contoh: KAPUAS BAHARI XXII"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">1. Nama Class Surveyor *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.petugas}
                      onChange={(e) => setFormData({ ...formData, petugas: e.target.value })}
                      placeholder="Contoh: ALFIAN BONE PUTRA"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">2. Pangkat / Grade *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.pangkat}
                      onChange={(e) => setFormData({ ...formData, pangkat: e.target.value })}
                      placeholder="Contoh: GRADE 6 A"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">3. Jabatan *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.jabatan}
                      onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                      placeholder="Contoh: SURVEYOR"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">4. Lokasi (Untuk Pergi Ke) *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.lokasi}
                      onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                      placeholder="Contoh: KENDAWANGAN"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">5. Keperluan / Perihal Survei *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.perihal}
                      onChange={(e) => setFormData({ ...formData, perihal: e.target.value })}
                      placeholder="Contoh: DINAS SURVEY KLAS"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">8. Sarana Transportasi *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.saranaTransportasi}
                      onChange={(e) => setFormData({ ...formData, saranaTransportasi: e.target.value })}
                      placeholder="Contoh: UDARA, DARAT DAN AIR"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">9. Keterangan Lain (Pembiayaan) *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.keteranganLain}
                      onChange={(e) => setFormData({ ...formData, keteranganLain: e.target.value })}
                      placeholder="Catatan pembiayaan BKI..."
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-main)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color-strong)', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Penandatangan: Nama Kepala Cabang *</label>
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', background: 'var(--accent-light)', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: 700 }}>
                        ⚙️ Otomatis Admin
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-input"
                      style={{ background: 'var(--bg-card-solid)', fontWeight: 700, color: 'var(--text-primary)' }}
                      value={adminSettings?.kepalaCabang || formData.kepalaCabang}
                      onChange={(e) => setFormData({ ...formData, kepalaCabang: e.target.value })}
                      placeholder="MUHSON NURROCHMAT"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>NUP Kepala Cabang *</label>
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', background: 'var(--accent-light)', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: 700 }}>
                        ⚙️ Otomatis Admin
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-input"
                      style={{ background: 'var(--bg-card-solid)', fontWeight: 700, color: 'var(--text-primary)' }}
                      value={adminSettings?.nup || formData.nup}
                      onChange={(e) => setFormData({ ...formData, nup: e.target.value })}
                      placeholder="48199-KI"
                      required
                    />
                  </div>
                </div>

                {/* Surveyor CITO Checkbox Section */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    background: formData.isCito ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-card-solid)',
                    border: `1.5px solid ${formData.isCito ? '#ef4444' : 'var(--border-color-strong)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    marginBottom: '1.1rem'
                  }}
                  onClick={() => setFormData({ ...formData, isCito: !formData.isCito })}
                >
                  <input
                    type="checkbox"
                    id="surveyorCitoCheck"
                    checked={formData.isCito}
                    onChange={(e) => setFormData({ ...formData, isCito: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <label
                      htmlFor="surveyorCitoCheck"
                      style={{
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: formData.isCito ? '#ef4444' : 'var(--text-primary)'
                      }}
                    >
                      ⚡ CITO / Hari Libur (Surcharge Honorarium +50%)
                    </label>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      Centang opsi ini jika inspeksi kapal dilakukan secara mendesak (CITO) atau pada hari libur.
                    </div>
                  </div>
                </div>

                {/* Travel Ticket Upload & Price Section */}
                <div
                  style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color-strong)',
                    padding: '1.15rem',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1.1rem'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--accent-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Ticket size={16} />
                    <span>Tiket Perjalanan & Transportasi Surveyor</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.85rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Nominal Biaya Tiket (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        step="25000"
                        className="form-input"
                        value={formData.biayaTiket}
                        onChange={(e) => setFormData({ ...formData, biayaTiket: Number(e.target.value) || 0 })}
                        placeholder="Contoh: 1250000"
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Moda Transportasi</label>
                      <select
                        className="form-select"
                        value={formData.kategoriTransportasi}
                        onChange={(e) => setFormData({ ...formData, kategoriTransportasi: e.target.value })}
                      >
                        <option value="Pesawat Terbang">✈️ Pesawat Terbang</option>
                        <option value="Kapal Laut / Speedboat">🚢 Kapal Laut / Speedboat</option>
                        <option value="Kereta Api">🚆 Kereta Api</option>
                        <option value="Travel / Mobil Dinas">🚗 Travel / Mobil Dinas</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Upload Berkas / Foto Tiket Perjalanan (Foto/PDF)</label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="form-input"
                      onChange={handleTicketFileUpload}
                      style={{ padding: '0.4rem' }}
                    />
                    {formData.fileTiketName && (
                      <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Paperclip size={13} />
                        <span>File Tiket Terlampir: {formData.fileTiketName}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Tgl Survei (Mulai) *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.tglMulai}
                      onChange={(e) => setFormData({ ...formData, tglMulai: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tgl Selesai Survei *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.tglSelesai}
                      onChange={(e) => setFormData({ ...formData, tglSelesai: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Lokasi Pelabuhan / Galangan *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.lokasi}
                    onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                    placeholder="Contoh: Pelabuhan Dwikora Pontianak"
                    required
                  />
                </div>



                <div className="form-group">
                  <label className="form-label">Hasil & Temuan Kelayakan Kapal *</label>
                  <textarea
                    className="form-textarea"
                    style={{ minHeight: '100px' }}
                    value={formData.hasil}
                    onChange={(e) => setFormData({ ...formData, hasil: e.target.value })}
                    placeholder="Kondisi fisik lambung, kelayakan mesin utama, sistem keselamatan SOLAS, perbaikan..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status Laporan</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Draf">Draf (Disimpan sementara)</option>
                    <option value="Terkirim">Terkirim (Siap diverifikasi)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Batal
                  </button>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', fontWeight: 700 }}
                      onClick={handleSaveAndPrintSurvey}
                      title="Simpan Laporan dan langsung cetak Surat Tugas"
                    >
                      <Printer size={16} color="var(--accent-primary)" />
                      <span>Simpan & Cetak Surat Tugas</span>
                    </button>

                    <button type="submit" className="btn btn-primary">
                      <Save size={16} />
                      <span>Simpan Laporan Survei Kapal</span>
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
