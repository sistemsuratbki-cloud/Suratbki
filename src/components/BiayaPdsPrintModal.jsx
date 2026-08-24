import React, { useState, useEffect } from 'react';
import { X, Printer, Calculator, Maximize2, Minimize2, Monitor, Smartphone } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo, formatRupiah, cleanDocNumber, terbilang } from '../utils/formatters';
import { countHolidaysAndWeekendsInRange } from '../utils/holidays';
import { ModalPortal } from './ModalPortal';
import { BKILogo } from './BKILogo';

export const BiayaPdsPrintModal = ({
  isOpen,
  onClose,
  suratTugas = null
}) => {
  const { adminSettings, gradeTariffs } = useData();
  const { usersList, role } = useAuth();
  const [withSignature, setWithSignature] = useState(true);
  const [isFitToScreen, setIsFitToScreen] = useState(true);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [printMode, setPrintMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return (window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) ? 'mobile' : 'windows';
    }
    return 'windows';
  });

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen || !suratTugas) return null;

  const isSurveyor = role === 'surveyor';
  const canPrint = !isSurveyor;
  const isMobileScreen = windowWidth <= 768;
  const targetDocWidth = 980;
  const availableWidth = isMobileScreen ? (windowWidth - 20) : Math.min(windowWidth * 0.94, 1150) - 30;
  const fitScale = isFitToScreen ? Math.min(Math.max(availableWidth / targetDocWidth, 0.28), 1) : 1;

  const isLuarKota = (suratTugas.kategoriPerjalanan || '').toLowerCase().includes('luar') || suratTugas.kategoriPerjalanan === 'Luar Kota';

  // Calculate Days and Nights
  const startDate = suratTugas.tglMulai ? new Date(suratTugas.tglMulai) : new Date();
  const endDate = suratTugas.tglSelesai ? new Date(suratTugas.tglSelesai) : startDate;
  const timeDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
  const hr = timeDiff > 0 ? timeDiff : 1;
  const mlm = Math.max(0, hr - 1);

  // Weekends & National Holidays (Hari Libur) - prioritise explicit user input
  let hrLbr = 0;
  if (suratTugas.jumlahHariLibur !== undefined && suratTugas.jumlahHariLibur !== '' && !isNaN(Number(suratTugas.jumlahHariLibur))) {
    hrLbr = Number(suratTugas.jumlahHariLibur);
  } else {
    const { count } = countHolidaysAndWeekendsInRange(suratTugas.tglMulai, suratTugas.tglSelesai);
    hrLbr = count;
  }

  // Get Surveyor Data
  const surveyor = usersList?.find(u => u.name === suratTugas.petugas) || {};
  const surveyorGrade = suratTugas.pangkat || surveyor.grade || 'GRADE 6 A';
  const gradeData = (gradeTariffs || []).find(
    (g) => (g.grade || '').replace(/\s+/g, '').toUpperCase() === surveyorGrade.replace(/\s+/g, '').toUpperCase()
  ) || {};

  // Calculations
  let sisaHariUangHarian = hr;
  if (suratTugas.tanpaUangHarian) {
    const deduct = suratTugas.hariTanpaUangHarian !== undefined ? Number(suratTugas.hariTanpaUangHarian) : hr;
    sisaHariUangHarian = Math.max(0, hr - Math.max(0, Math.min(deduct, hr)));
  }

  const uangHarianRate = (suratTugas.tanpaUangHarian && sisaHariUangHarian === 0)
    ? 0
    : (Number(suratTugas.uangHarian) || Number(gradeData.uangHarian) || 300000);
  const uangHarianTotal = uangHarianRate * sisaHariUangHarian;
  const uangHotelRate = Number(suratTugas.tiketHotel) || 0;
  const uangHotelTotal = uangHotelRate * mlm;
  const hrLbrTotal = (suratTugas.tanpaUangHarian && sisaHariUangHarian === 0) ? 0 : (hrLbr * uangHarianRate * 0.5);
  const tiketPesawatTaxi = Number(suratTugas.tiketPesawatTaxi) || Number(suratTugas.biayaTiket) || 0;
  const biayaTAT = suratTugas.tanpaTAT
    ? 0
    : (suratTugas.biayaTAT !== undefined && suratTugas.biayaTAT !== ''
        ? Number(suratTugas.biayaTAT)
        : (isLuarKota ? Number(adminSettings?.tatLuarKota || 750000) : 0));
  const rateSK = Number(suratTugas.tarifDasar) || 0;

  let calculatedJumlah = 0;
  if (isLuarKota) {
    calculatedJumlah = tiketPesawatTaxi + biayaTAT + rateSK + uangHarianTotal + uangHotelTotal + hrLbrTotal;
  } else {
    calculatedJumlah = rateSK + uangHarianTotal + uangHotelTotal + hrLbrTotal;
  }

  const jumlah = suratTugas.jumlahEstimasi && Number(suratTugas.jumlahEstimasi) > 0
    ? Number(suratTugas.jumlahEstimasi)
    : calculatedJumlah;

  const kepalaCabang = adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT';
  const nup = adminSettings?.nup || '48199-KI';

  const pembuatUser = usersList?.find(u => (adminSettings?.pembuatDaftar && u.name === adminSettings.pembuatDaftar) || u.role === 'admin' || u.role === 'keuangan') || {};
  const pembuatName = (adminSettings?.pembuatDaftar || pembuatUser.name || 'RENZA MUHARAM').toUpperCase();
  const pembuatDesc = adminSettings?.nupPembuatDaftar ? `NUP.${adminSettings.nupPembuatDaftar}` : (pembuatUser.nup ? `NUP.${pembuatUser.nup}` : 'NUP.50382-KI');

  // Signatures Lookup
  const kacabUser = usersList?.find((u) => u.name === kepalaCabang || u.role === 'kacab') || {};
  const kacabSignature = adminSettings?.kacabSignatureUrl || kacabUser.signatureUrl || '/signatures/kacab_muhson_signature.png';
  const pembuatSignature = adminSettings?.pembuatSignatureUrl || pembuatUser.signatureUrl || '';

  const isSurveyorMuhson = (suratTugas.petugas || '').toUpperCase().includes('MUHSON');
  let surveyorSignature = null;
  if (!isSurveyorMuhson) {
    if (surveyor?.signatureUrl) {
      surveyorSignature = surveyor.signatureUrl;
    } else if ((suratTugas.petugas || '').toUpperCase().includes('SANDI')) {
      surveyorSignature = '/signatures/sandi_handwritten.png';
    } else if ((suratTugas.petugas || '').toUpperCase().includes('ANDRE')) {
      surveyorSignature = '/signatures/andre_handwritten.png';
    } else if ((suratTugas.petugas || '').toUpperCase().includes('SEPTIAN')) {
      surveyorSignature = '/signatures/septian_handwritten.png';
    } else if ((suratTugas.petugas || '').toUpperCase().includes('BONE') || (suratTugas.petugas || '').toUpperCase().includes('ALFIAN')) {
      surveyorSignature = '/signatures/alfian_bone_handwritten.png';
    }
  }

  const tglMulaiStr = formatDateIndo(suratTugas.tglMulai).toUpperCase();
  const tglSelesaiStr = formatDateIndo(suratTugas.tglSelesai).toUpperCase();
  const lokasiStr = (suratTugas.tempatSurvey || suratTugas.lokasi || 'PONTIANAK').toUpperCase();
  const kapalStr = Array.isArray(suratTugas.shipsDetail) && suratTugas.shipsDetail.length > 0
    ? suratTugas.shipsDetail.map(s => s.namaKapal).filter(Boolean).join(', ').toUpperCase()
    : (suratTugas.namaKapal || '-').toUpperCase();
  const petugasStr = (suratTugas.petugas || '-').toUpperCase();

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Biaya_Perjalanan_Dinas_${kapalStr.replace(/[\s,/-]+/g, '_')}_${petugasStr.replace(/[\s,/-]+/g, '_')}${withSignature ? '_Dengan_TTD' : '_Tanpa_TTD'}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  const fmtNum = (n) => {
    if (!n || n === 0) return '-';
    return Number(n).toLocaleString('id-ID');
  };

  // Parse nomor surat menjadi prefix dan suffix terpisah
  const cleanNomor = cleanDocNumber(suratTugas.nomor || '').trim();
  const slashIdx = cleanNomor.indexOf('/');
  const nomorPrefix = slashIdx !== -1 ? cleanNomor.substring(0, slashIdx).trim() : cleanNomor;
  const nomorSuffix = slashIdx !== -1 ? cleanNomor.substring(slashIdx).trim() : '/SV.201/PK/KI-26';

  return (
    <ModalPortal>
      <div className="modal-overlay print-only-modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
        <div
          className="modal-content"
          style={{
            maxWidth: isMobileScreen ? '100vw' : '1150px',
            width: isMobileScreen ? '100vw' : '98vw',
            maxHeight: isMobileScreen ? '100dvh' : '92vh',
            height: isMobileScreen ? '100dvh' : 'auto',
            background: '#ffffff',
            color: '#000000',
            borderRadius: isMobileScreen ? '0' : '12px',
            margin: isMobileScreen ? '0' : 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header Toolbar */}
          <div
            className="modal-header"
            style={{
              borderBottom: '1px solid #e2e8f0',
              background: '#ffffff',
              padding: isMobileScreen ? '0.65rem 0.75rem' : '0.875rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              flexWrap: isMobileScreen ? 'wrap' : 'nowrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
              <Calculator size={isMobileScreen ? 18 : 20} color="#003366" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <h3 className="modal-title" style={{ color: '#0f172a', fontSize: isMobileScreen ? '0.9rem' : '1.05rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isSurveyor ? 'Preview Rincian Biaya (PDS)' : 'Preview & Cetak Rincian Biaya (PDS)'}
                </h3>
                <div style={{ fontSize: isMobileScreen ? '0.7rem' : '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Kapal: {kapalStr} | Total: {formatRupiah(jumlah)}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
              {/* Mode Cetak Switcher: Windows vs Mobile */}
              <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '2px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <button
                  type="button"
                  onClick={() => setPrintMode('windows')}
                  style={{
                    border: 'none',
                    background: printMode === 'windows' ? '#003366' : 'transparent',
                    color: printMode === 'windows' ? '#ffffff' : '#475569',
                    padding: isMobileScreen ? '0.25rem 0.45rem' : '0.3rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: isMobileScreen ? '0.68rem' : '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                  title="Format Cetak Windows / Desktop PC (Standar Rapi)"
                >
                  <Monitor size={12} />
                  <span>Windows</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintMode('mobile')}
                  style={{
                    border: 'none',
                    background: printMode === 'mobile' ? '#0284c7' : 'transparent',
                    color: printMode === 'mobile' ? '#ffffff' : '#475569',
                    padding: isMobileScreen ? '0.25rem 0.45rem' : '0.3rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: isMobileScreen ? '0.68rem' : '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                  title="Format Cetak Mobile / HP"
                >
                  <Smartphone size={12} />
                  <span>Mobile</span>
                </button>
              </div>

              {/* Zoom Mode Toggle */}
              <button
                type="button"
                className={`btn btn-sm ${isFitToScreen ? 'btn-outline-primary' : 'btn-primary'}`}
                onClick={() => setIsFitToScreen(!isFitToScreen)}
                style={{ fontSize: isMobileScreen ? '0.7rem' : '0.75rem', fontWeight: 700, padding: isMobileScreen ? '0.25rem 0.45rem' : '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                title={isFitToScreen ? 'Perbesar ke ukuran penuh (100%)' : 'Kecilkan agar pas layar'}
              >
                {isFitToScreen ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
                <span>{isFitToScreen ? '🔍 Ukuran Penuh' : '📱 Pas Layar'}</span>
              </button>

              {/* Toggle Versi TTD */}
              <button
                type="button"
                className={`btn btn-sm ${withSignature ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setWithSignature(!withSignature)}
                style={{ fontSize: isMobileScreen ? '0.7rem' : '0.75rem', fontWeight: 700, padding: isMobileScreen ? '0.25rem 0.45rem' : '0.35rem 0.75rem' }}
              >
                {withSignature ? '✍️ Dgn TTD' : '📄 Tanpa TTD'}
              </button>

              <button className="btn btn-secondary btn-sm" onClick={onClose} title="Tutup" style={{ padding: isMobileScreen ? '0.25rem 0.45rem' : '0.35rem 0.6rem' }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Document Body */}
          <div
            className="modal-body print-modal-body"
            style={{
              padding: isMobileScreen ? '0.5rem' : '1.25rem 1.5rem',
              overflow: 'auto',
              flex: '1 1 auto',
              minHeight: 0,
              WebkitOverflowScrolling: 'touch',
              background: '#f8fafc'
            }}
          >
            {/* Guidance Banner */}
            <div
              className="guidance-banner no-print"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                padding: '0.4rem 0.75rem',
                background: '#e2e8f0',
                borderRadius: '6px',
                marginBottom: '0.6rem',
                fontSize: isMobileScreen ? '0.72rem' : '0.78rem',
                color: '#1e293b'
              }}
            >
              <span>
                {isFitToScreen ? '📱 Mode Pas Layar (Seluruh 18 kolom terlihat utuh)' : '👉 Geser layar ke samping kanan untuk cek kolom lainnya'}
              </span>
              <button
                type="button"
                onClick={() => setIsFitToScreen(!isFitToScreen)}
                style={{
                  border: 'none',
                  background: '#003366',
                  color: '#ffffff',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {isFitToScreen ? 'Perbesar' : 'Kecilkan'}
              </button>
            </div>

            <div
              className="printable-sheet-wrapper"
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: isFitToScreen ? 'center' : 'flex-start',
                overflowX: !isFitToScreen ? 'auto' : 'visible'
              }}
            >
              <div
                className="printable-sheet"
                style={{
                  border: isMobileScreen ? '1px solid #cbd5e1' : 'none',
                  padding: isMobileScreen ? '1.5rem 1rem 1rem 1rem' : '2.5rem 2rem 2rem 2rem',
                  borderRadius: '4px',
                  fontFamily: "'Arial', 'Segoe UI', sans-serif",
                  lineHeight: '1.35',
                  fontSize: '9pt',
                  background: '#ffffff',
                  color: '#000000',
                  boxSizing: 'border-box',
                  width: `${targetDocWidth}px`,
                  minWidth: `${targetDocWidth}px`,
                  zoom: isFitToScreen ? fitScale : 1,
                  boxShadow: isMobileScreen ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
                }}
              >
              {/* Document Header with BKI Logo on Top-Right */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '10pt', fontWeight: 'bold' }}>
                  <table style={{ width: 'auto', borderCollapse: 'collapse', lineHeight: '1.5' }}>
                    <tbody>
                      <tr>
                        <td colSpan={3} style={{ whiteSpace: 'nowrap', paddingBottom: '0.15rem' }}>
                          LAMPIRAN SURAT TUGAS
                        </td>
                      </tr>
                      <tr>
                        <td style={{ whiteSpace: 'nowrap', paddingRight: '0.75rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <span style={{ display: 'inline-block', textAlign: 'left', minWidth: nomorPrefix ? 'auto' : '50px' }}>
                              {nomorPrefix || <span>&nbsp;</span>}
                            </span>
                            <span style={{ paddingLeft: '1.25rem' }}>{nomorSuffix}</span>
                          </span>
                        </td>
                        <td style={{ width: '15px', textAlign: 'center' }}>:</td>
                        <td style={{ fontWeight: 'bold' }}>{tglMulaiStr}</td>
                      </tr>
                      <tr>
                        <td style={{ whiteSpace: 'nowrap', paddingRight: '0.75rem' }}>DAFTAR BIAYA PERJALANAN DINAS KE</td>
                        <td style={{ textAlign: 'center' }}>:</td>
                        <td style={{ fontWeight: 'bold' }}>{lokasiStr}</td>
                      </tr>
                      <tr>
                        <td style={{ whiteSpace: 'nowrap', paddingRight: '0.75rem' }}>DALAM RANGKA SURVEY KLAS</td>
                        <td style={{ textAlign: 'center' }}>:</td>
                        <td style={{ fontWeight: 'bold' }}>{kapalStr}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} style={{ paddingTop: '0.35rem', letterSpacing: '0.01em' }}>SESUAI DAFTAR DAN KUITANSI TERLAMPIR</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Logo BKI Pojok Kanan Atas Sejajar dengan Kop */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '0.5rem', paddingTop: '2px' }}>
                  <BKILogo height={46} />
                </div>
              </div>

              {/* Main Calculation Table */}
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1.5px solid black',
                  fontSize: '8.5pt',
                  textAlign: 'center'
                }}
              >
                <thead>
                  <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                    <th rowSpan={2} style={{ border: '1px solid black', padding: '6px 2px', width: '3%' }}>NO.</th>
                    <th rowSpan={2} style={{ border: '1px solid black', padding: '6px 3px', width: '10%' }}>NAMA</th>
                    <th colSpan={3} style={{ border: '1px solid black', padding: '6px' }}>JUMLAH</th>
                    <th colSpan={2} style={{ border: '1px solid black', padding: '6px' }}>TANGGAL</th>
                    <th colSpan={3} style={{ border: '1px solid black', padding: '6px' }}>TRANSPORT</th>
                    <th colSpan={2} style={{ border: '1px solid black', padding: '6px' }}>UANG HARIAN</th>
                    <th colSpan={2} style={{ border: '1px solid black', padding: '6px' }}>UANG HOTEL</th>
                    <th rowSpan={2} style={{ border: '1px solid black', padding: '6px 2px', width: '6%' }}>
                      HR LBR<br />50%*U.HR
                    </th>
                    <th rowSpan={2} style={{ border: '1px solid black', padding: '6px 2px', width: '7%' }}>JUMLAH</th>
                    <th rowSpan={2} style={{ border: '1px solid black', padding: '6px 2px', width: '7%' }}>
                      JUMLAH<br />TERIMA
                    </th>
                    <th rowSpan={2} style={{ border: '1px solid black', padding: '6px 2px', width: '17%' }}>
                      TANDA<br />TERIMA
                    </th>
                  </tr>
                  <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                    {/* JUMLAH */}
                    <th style={{ border: '1px solid black', padding: '3px', width: '3%' }}>HR</th>
                    <th style={{ border: '1px solid black', padding: '3px', width: '3%' }}>MLM</th>
                    <th style={{ border: '1px solid black', padding: '3px', width: '3%' }}>HR LBR</th>
                    {/* TANGGAL */}
                    <th style={{ border: '1px solid black', padding: '3px', width: '6%' }}>BERANGKAT</th>
                    <th style={{ border: '1px solid black', padding: '3px', width: '6%' }}>KEMBALI</th>
                    {/* TRANSPORT */}
                    {isLuarKota ? (
                      <>
                        <th style={{ border: '1px solid black', padding: '3px', width: '7%' }}>TIKET PESAWAT, TAXI.DLL</th>
                        <th style={{ border: '1px solid black', padding: '3px', width: '6%' }}>ASAL TUJUAN</th>
                        <th style={{ border: '1px solid black', padding: '3px', width: '6%' }}>SESUAI SK DIREKSI</th>
                      </>
                    ) : (
                      <>
                        <th style={{ border: '1px solid black', padding: '3px', width: '7%' }}>SESUAI DENGAN SK DIREKSI</th>
                        <th style={{ border: '1px solid black', padding: '3px', width: '6%' }}>ASAL TUJUAN</th>
                        <th style={{ border: '1px solid black', padding: '3px', width: '6%' }}>DALAM TUGAS</th>
                      </>
                    )}
                    {/* UANG HARIAN */}
                    <th style={{ border: '1px solid black', padding: '3px', width: '5.5%' }}>11</th>
                    <th style={{ border: '1px solid black', padding: '3px', width: '6.5%' }}>12=11*3</th>
                    {/* UANG HOTEL */}
                    <th style={{ border: '1px solid black', padding: '3px', width: '5.5%' }}>13</th>
                    <th style={{ border: '1px solid black', padding: '3px', width: '6.5%' }}>14=13*4</th>
                  </tr>
                  {/* Indices Row */}
                  <tr style={{ background: '#f1f5f9', fontSize: '7.5pt', fontStyle: 'italic', fontWeight: 'bold' }}>
                    <th style={{ border: '1px solid black', padding: '2px' }}>1</th>
                    <th style={{ border: '1px solid black', padding: '2px' }}>2</th>
                    <th style={{ border: '1px solid black', padding: '2px' }}>3</th>
                    <th style={{ border: '1px solid black', padding: '2px' }}>4</th>
                    <th style={{ border: '1px solid black', padding: '2px' }}>5</th>
                    <th style={{ border: '1px solid black', padding: '2px' }}>6</th>
                    <th style={{ border: '1px solid black', padding: '2px' }}>7</th>
                    <th style={{ border: '1px solid black', padding: '2px' }}>8</th>
                    <th style={{ border: '1px solid black', padding: '2px' }}>9</th>
                    <th style={{ border: '1px solid black', padding: '2px' }}>10</th>
                    <th style={{ border: '1px solid black', padding: '2px' }}>11</th>
                    <th style={{ border: '1px solid black', padding: '2px' }}>12=11*3</th>
                    <th style={{ border: '1px solid black', padding: '2px' }}>13</th>
                    <th style={{ border: '1px solid black', padding: '2px' }}>14=13*4</th>
                    <th style={{ border: '1px solid black', padding: '2px' }}>15=5*11/50%</th>
                    <th style={{ border: '1px solid black', padding: '2px' }}>16</th>
                    <th style={{ border: '1px solid black', padding: '2px' }}>17=16</th>
                    <th style={{ border: '1px solid black', padding: '2px' }}>18</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1: Active Data */}
                  <tr>
                    <td style={{ border: '1px solid black', padding: '6px 2px', fontWeight: 'bold' }}>1</td>
                    <td style={{ border: '1px solid black', padding: '6px 3px', textAlign: 'left', fontWeight: 'bold', fontSize: '8pt', lineHeight: '1.25' }}>
                      {petugasStr}
                    </td>
                    <td style={{ border: '1px solid black', padding: '6px 2px' }}>{hr}</td>
                    <td style={{ border: '1px solid black', padding: '6px 2px' }}>{mlm}</td>
                    <td style={{ border: '1px solid black', padding: '6px 2px' }}>{hrLbr > 0 ? hrLbr : '-'}</td>
                    <td style={{ border: '1px solid black', padding: '6px 2px', fontSize: '8pt' }}>{tglMulaiStr}</td>
                    <td style={{ border: '1px solid black', padding: '6px 2px', fontSize: '8pt' }}>{tglSelesaiStr}</td>

                    {/* Transport Columns */}
                    {isLuarKota ? (
                      <>
                        <td style={{ border: '1px solid black', padding: '6px 2px', textAlign: 'right' }}>
                          {fmtNum(tiketPesawatTaxi)}
                        </td>
                        <td style={{ border: '1px solid black', padding: '6px 2px', textAlign: 'right' }}>
                          {fmtNum(biayaTAT)}
                        </td>
                        <td style={{ border: '1px solid black', padding: '6px 2px', textAlign: 'right' }}>
                          {fmtNum(rateSK)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ border: '1px solid black', padding: '6px 2px', textAlign: 'right' }}>
                          {fmtNum(rateSK)}
                        </td>
                        <td style={{ border: '1px solid black', padding: '6px 2px' }}>-</td>
                        <td style={{ border: '1px solid black', padding: '6px 2px' }}>-</td>
                      </>
                    )}

                    {/* Uang Harian */}
                    <td style={{ border: '1px solid black', padding: '6px 2px', textAlign: 'right' }}>
                      {fmtNum(uangHarianRate)}
                    </td>
                    <td style={{ border: '1px solid black', padding: '6px 2px', textAlign: 'right' }}>
                      {fmtNum(uangHarianTotal)}
                    </td>

                    {/* Uang Hotel */}
                    <td style={{ border: '1px solid black', padding: '6px 2px', textAlign: 'right' }}>
                      {fmtNum(uangHotelRate)}
                    </td>
                    <td style={{ border: '1px solid black', padding: '6px 2px', textAlign: 'right' }}>
                      {fmtNum(uangHotelTotal)}
                    </td>

                    {/* Hr Lbr */}
                    <td style={{ border: '1px solid black', padding: '6px 2px', textAlign: 'right' }}>
                      {fmtNum(hrLbrTotal)}
                    </td>

                    {/* Jumlah */}
                    <td style={{ border: '1px solid black', padding: '6px 2px', textAlign: 'right', fontWeight: 'bold' }}>
                      {fmtNum(jumlah)}
                    </td>
                    <td style={{ border: '1px solid black', padding: '6px 2px', textAlign: 'right', fontWeight: 'bold' }}>
                      {fmtNum(jumlah)}
                    </td>
                    <td style={{ border: '1px solid black', padding: '6px 2px' }}></td>
                  </tr>

                  {/* Total Row */}
                  <tr style={{ fontWeight: 'bold', background: '#f8fafc' }}>
                    <td colSpan={18} style={{ border: '1px solid black', padding: '6px 8px', textAlign: 'left', fontStyle: 'italic' }}>
                      Terbilang: {terbilang(jumlah).replace(/\b\w/g, l => l.toUpperCase())} Rupiah
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signature Block */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: '2.5rem', breakInside: 'avoid', fontSize: '9.5pt' }}>
                <div style={{ textAlign: 'center', width: '320px', position: 'relative' }}>
                  <div style={{ marginBottom: '0.2rem' }}>Mengetahui</div>
                  <div style={{ fontWeight: 'bold' }}>
                    Kepala Cabang Madya Klas Pontianak
                  </div>
                  <div style={{ position: 'relative', height: '85px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {withSignature && kacabSignature ? (
                      <img
                        src={kacabSignature}
                        alt="TTD Kepala Cabang"
                        style={{ height: '85px', width: 'auto', objectFit: 'contain' }}
                      />
                    ) : null}
                  </div>
                  <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
                    {kepalaCabang}
                  </div>
                  <div style={{ fontSize: '9pt' }}>
                    NUP.{nup}
                  </div>
                </div>

                <div style={{ textAlign: 'center', width: '320px', marginLeft: 'auto', position: 'relative' }}>
                  <div style={{ marginBottom: '0.2rem' }}>
                    PONTIANAK, {tglMulaiStr}
                  </div>
                  <div style={{ fontWeight: 'bold' }}>
                    Pembuat Daftar
                  </div>
                  <div style={{ position: 'relative', height: '85px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {withSignature && pembuatSignature ? (
                      <img
                        src={pembuatSignature}
                        alt="TTD Pembuat Daftar"
                        style={{ height: '85px', width: 'auto', objectFit: 'contain' }}
                      />
                    ) : null}
                  </div>
                  <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
                    {pembuatName}
                  </div>
                  <div style={{ fontSize: '9pt' }}>
                    {pembuatDesc}
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>

          <style>{`
            @media screen and (max-width: 768px) {
              .print-only-modal-overlay {
                padding: 0 !important;
                align-items: stretch !important;
              }
              .print-only-modal-overlay .modal-content {
                max-width: 100vw !important;
                width: 100vw !important;
                height: 100dvh !important;
                max-height: 100dvh !important;
                border-radius: 0 !important;
                margin: 0 !important;
                display: flex !important;
                flex-direction: column !important;
              }
              .print-only-modal-overlay .modal-header {
                padding: 0.6rem 0.75rem !important;
              }
              .print-only-modal-overlay .modal-footer {
                padding: 0.6rem 0.75rem !important;
              }
            }

            @media print {
              @page { 
                size: A4 landscape !important; 
                margin: ${printMode === 'mobile' ? '4mm 6mm 4mm 6mm' : '16mm 10mm 8mm 10mm'} !important; 
              }
              body { background: #ffffff !important; color: #000000 !important; }
              .no-print, .guidance-banner { display: none !important; }
              .modal-overlay { position: static !important; background: transparent !important; padding: 0 !important; }
              .modal-content { max-width: 100% !important; width: 100% !important; border: none !important; box-shadow: none !important; }
              .modal-header, .modal-footer { display: none !important; }
              .modal-body { padding: 0 !important; overflow: visible !important; }
              .printable-sheet-wrapper { display: block !important; width: 100% !important; overflow: visible !important; }
              .printable-sheet { 
                padding: ${printMode === 'mobile' ? '4px 0 0 0' : '6px 0 0 0'} !important; 
                width: 100% !important; 
                min-width: 0 !important; 
                zoom: 1 !important; 
                transform: none !important; 
                box-shadow: none !important;
                border: none !important;
              }
            }
          `}</style>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Tutup
            </button>
            {canPrint && (
              <button className="btn btn-primary" onClick={handlePrint}>
                <Printer size={16} />
                <span>Cetak / Download PDF</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
