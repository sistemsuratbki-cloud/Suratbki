import React, { useRef, useState, useEffect } from 'react';
import { X, Printer, Anchor, Maximize2, Minimize2, Monitor, Smartphone } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo } from '../utils/formatters';
import { isValidSignature } from '../utils/signatureHelper';
import { ModalPortal } from './ModalPortal';
import { DanantaraLogo } from './DanantaraLogo';
import { IDSurveyLogo } from './IDSurveyLogo';
import { BKILogo } from './BKILogo';

export const SuratTugasPrintModal = ({ isOpen, onClose, suratTugas }) => {
  const printRef = useRef(null);
  const { adminSettings } = useData();
  const { usersList } = useAuth();
  const [withSignature, setWithSignature] = useState(true);
  const [mobileFit, setMobileFit] = useState(true);
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

  const isMobileScreen = windowWidth <= 768;
  const isMobilePrint = printMode === 'mobile';
  const targetDocWidth = isMobilePrint ? 700 : 760;
  const fitScale = isMobileScreen ? Math.min(Math.max((windowWidth - 20) / targetDocWidth, 0.35), 1) : 1;

  const handlePrint = () => {
    const originalTitle = document.title;
    const dateObj = new Date(suratTugas.tglMulai);
    const dateStr = !isNaN(dateObj) ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}` : 'Tanggal';
    const surveyor = suratTugas.petugas || 'Surveyor';
    document.title = `${dateStr} - ${surveyor} - Surat Penunjukan Survey (SPS)${withSignature ? '_Dengan_TTD' : '_Tanpa_TTD'}`;
    
    window.print();
    
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  const tglSurveyFormatted = formatDateIndo(suratTugas.tglMulai);
  const tglSuratFormatted = formatDateIndo(suratTugas.tglSurat || suratTugas.tglPembuatan || suratTugas.tglMulai);
  const lokasiSurvey = (suratTugas.tempatSurvey || suratTugas.lokasi || 'PONTIANAK').toUpperCase();
  const jenisSurvey = (suratTugas.jenisSurvey || suratTugas.perihal || '-').toUpperCase();
  const pemohon = suratTugas.pemohon || 'PT. MITRA SAMUDRA NUSANTARA';
  const namaKapal = suratTugas.namaKapal || 'BAHARI 279';
  const noOrder = suratTugas.noOrder || 'RFQ2608005';
  const noAgenda = suratTugas.agenda || suratTugas.noAgenda || '-';
  const catatan = suratTugas.catatan || '-';
  const surveyorName = (suratTugas.petugas || 'ALFIAN BONE PUTRA').toUpperCase();
  const kepalaCabang = adminSettings?.kepalaCabang || suratTugas.kepalaCabang || 'MUHSON NURROCHMAT';

  // Get Scanned TTD for Kepala Cabang
  const kacabUser = usersList?.find((u) => u.name === kepalaCabang || u.role === 'kacab') || {};
  const kacabSignature = adminSettings?.kacabSignatureUrl || kacabUser.signatureUrl || '/signatures/kacab_muhson_signature.png';

  // Get Handwritten Scan for Surveyor (Sandi, Andre, Septian, Bone, dan Kosongkan jika Muhson)
  const surveyorUser = usersList?.find((u) => u.name === suratTugas.petugas) || {};
  const isMuhson = surveyorName.includes('MUHSON');
  
  let surveyorHandwrittenSrc = null;
  if (!isMuhson) {
    if (surveyorUser?.signatureUrl) {
      surveyorHandwrittenSrc = surveyorUser.signatureUrl;
    } else if (surveyorName.includes('SANDI')) {
      surveyorHandwrittenSrc = '/signatures/sandi_handwritten.png';
    } else if (surveyorName.includes('ANDRE')) {
      surveyorHandwrittenSrc = '/signatures/andre_handwritten.png';
    } else if (surveyorName.includes('SEPTIAN')) {
      surveyorHandwrittenSrc = '/signatures/septian_handwritten.png';
    } else if (surveyorName.includes('BONE') || surveyorName.includes('ALFIAN')) {
      surveyorHandwrittenSrc = '/signatures/alfian_bone_handwritten.png';
    }
  }

  return (
    <ModalPortal>
      <div className="modal-overlay print-only-modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
        <div
          className="modal-content"
          style={{
            maxWidth: isMobileScreen ? '100vw' : '780px',
            width: isMobileScreen ? '100vw' : 'auto',
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
              <Anchor size={isMobileScreen ? 18 : 20} color="#003366" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <h3 className="modal-title" style={{ color: '#0f172a', fontSize: isMobileScreen ? '0.9rem' : '1rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Preview & Cetak SPS
                </h3>
                <div style={{ fontSize: isMobileScreen ? '0.68rem' : '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Surat Penunjukan Survey (1 Lembar Pas)
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
                  title="Format Cetak Mobile / HP (Anti-Tumpah Halaman & Pas 1 Lembar di HP)"
                >
                  <Smartphone size={12} />
                  <span>Mobile</span>
                </button>
              </div>

              {/* Zoom Switcher */}
              <button
                type="button"
                className={`btn btn-sm ${mobileFit ? 'btn-outline-primary' : 'btn-primary'}`}
                onClick={() => setMobileFit(!mobileFit)}
                style={{ fontSize: isMobileScreen ? '0.7rem' : '0.75rem', fontWeight: 700, padding: isMobileScreen ? '0.25rem 0.45rem' : '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                title={mobileFit ? 'Perbesar ke ukuran asli' : 'Kecilkan agar pas layar'}
              >
                {mobileFit ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
                <span>{mobileFit ? '🔍 Ukuran Asli' : '📱 Pas Layar'}</span>
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
              padding: isMobileScreen ? '0.5rem' : (isMobilePrint ? '1.25rem 1.5rem' : '1.5rem 2rem'),
              overflow: 'auto',
              flex: '1 1 auto',
              minHeight: 0,
              WebkitOverflowScrolling: 'touch',
              background: isMobileScreen ? '#f8fafc' : '#ffffff'
            }}
          >
            <div
              className="printable-sheet-wrapper"
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: isMobileScreen && mobileFit ? 'center' : 'flex-start',
                overflowX: isMobileScreen && !mobileFit ? 'auto' : 'visible'
              }}
            >
              <div
                className="printable-sheet"
                style={{
                  border: isMobileScreen ? '1px solid #cbd5e1' : 'none',
                  padding: isMobileScreen ? '1.25rem 1rem' : (isMobilePrint ? '1.25rem 1.5rem' : '20mm 22mm 18mm 22mm'),
                  fontFamily: "'Arial', 'Segoe UI', sans-serif",
                  lineHeight: isMobilePrint ? '1.25' : '1.45',
                  fontSize: isMobilePrint ? '8.5pt' : '11pt',
                  background: '#ffffff',
                  color: '#000000',
                  boxSizing: 'border-box',
                  width: isMobileScreen ? `${targetDocWidth}px` : '100%',
                  minWidth: isMobileScreen ? `${targetDocWidth}px` : 'auto',
                  zoom: isMobileScreen && mobileFit ? fitScale : 1,
                  boxShadow: isMobileScreen ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                {/* ====== KOP LOGOS RESMI ====== */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobilePrint ? '0.4rem' : '1.5rem', paddingBottom: isMobilePrint ? '0.25rem' : '0.5rem' }}>
                  <DanantaraLogo height={isMobilePrint ? 32 : 42} />
                  <IDSurveyLogo height={isMobilePrint ? 34 : 44} />
                  <BKILogo height={isMobilePrint ? 32 : 42} />
                </div>

                {/* ====== JUDUL SURAT RESMI ====== */}
                <div style={{ textAlign: 'center', marginBottom: isMobilePrint ? '0.4rem' : '1.5rem' }}>
                  <div style={{ fontSize: isMobilePrint ? '9pt' : '11pt', fontWeight: 900, textTransform: 'uppercase', color: '#000000', letterSpacing: '0.02em' }}>
                    PT.BIRO KLASIFIKASI INDONESIA (PERSERO)
                  </div>
                  <div style={{ fontSize: isMobilePrint ? '9pt' : '11pt', fontWeight: 900, textTransform: 'uppercase', color: '#000000', letterSpacing: '0.02em', marginTop: isMobilePrint ? '0.1rem' : '0.15rem' }}>
                    CABANG MADYA KLAS PONTIANAK
                  </div>
                  <div style={{ fontSize: isMobilePrint ? '10.5pt' : '12pt', fontWeight: 900, textTransform: 'uppercase', color: '#000000', letterSpacing: '0.04em', marginTop: isMobilePrint ? '0.4rem' : '1.15rem' }}>
                    SURAT PENUNJUKAN SURVEY (SPS)
                  </div>
                </div>

                {/* ====== BODY PENUGASAN ====== */}
                <div style={{ marginBottom: isMobilePrint ? '0.4rem' : '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', fontSize: isMobilePrint ? '8.5pt' : '10pt', fontWeight: 700, minHeight: isMobilePrint ? '26px' : '40px' }}>
                    <span style={{ width: isMobilePrint ? '160px' : '220px' }}>NAMA SURVEYOR</span>
                    <span style={{ width: isMobilePrint ? '15px' : '20px' }}>:</span>
                    {withSignature ? (
                      isMuhson ? null : (
                        surveyorHandwrittenSrc ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <img
                              src={surveyorHandwrittenSrc}
                              alt={surveyorName}
                              style={{ height: isMobilePrint ? '28px' : '36px', maxWidth: '220px', objectFit: 'contain' }}
                            />
                          </div>
                        ) : (
                          <span style={{ textTransform: 'uppercase', fontWeight: 900, color: '#0f172a' }}>
                            {surveyorName}
                          </span>
                        )
                      )
                    ) : null}
                  </div>
                  <div style={{ marginTop: isMobilePrint ? '0.35rem' : '1.25rem', fontWeight: 700, textTransform: 'uppercase', fontSize: isMobilePrint ? '8.5pt' : '10pt' }}>
                    UNTUK MELAKSANAKAN SURVEY
                  </div>
                </div>

                {/* ====== TABEL RINCIAN OBJEK PENUGASAN ====== */}
                <div style={{ paddingLeft: isMobilePrint ? '1rem' : '2rem', marginBottom: isMobilePrint ? '0.5rem' : '2rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isMobilePrint ? '8.5pt' : '10pt', lineHeight: isMobilePrint ? '1.25' : '2' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: isMobilePrint ? '160px' : '200px', fontWeight: 700, verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>NAMA KAPAL / OBJEK</td>
                        <td style={{ width: isMobilePrint ? '15px' : '20px', verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>:</td>
                        <td style={{ fontWeight: 900, textTransform: 'uppercase', verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>{namaKapal}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700, verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>PEMOHON</td>
                        <td style={{ verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>:</td>
                        <td style={{ textTransform: 'uppercase', verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>{pemohon}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700, verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>JENIS SURVEY</td>
                        <td style={{ verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>:</td>
                        <td style={{ textTransform: 'uppercase', verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>{jenisSurvey}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700, verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>TEMPAT SURVEY KLAS</td>
                        <td style={{ verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>:</td>
                        <td style={{ textTransform: 'uppercase', verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>{lokasiSurvey}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700, verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>TANGGAL SURVEY</td>
                        <td style={{ verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>:</td>
                        <td style={{ textTransform: 'uppercase', verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>
                          {tglSurveyFormatted.toUpperCase()} <span style={{ marginLeft: '1.5rem', fontWeight: 800 }}>/ TENTATIVE</span>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700, verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>NOMOR AGENDA</td>
                        <td style={{ verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>:</td>
                        <td style={{ verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>{noAgenda}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700, verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>NO.ORDER</td>
                        <td style={{ verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>:</td>
                        <td style={{ fontWeight: 900, textTransform: 'uppercase', verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>{noOrder}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700, verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>CATATAN</td>
                        <td style={{ verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>:</td>
                        <td style={{ verticalAlign: 'top', padding: isMobilePrint ? '0.5px 0' : '0' }}>{catatan}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ====== TANDA TANGAN KEPALA CABANG ====== */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: isMobilePrint ? '0.5rem' : '2.5rem', fontSize: isMobilePrint ? '8.5pt' : '11pt', lineHeight: isMobilePrint ? '1.25' : '1.5', breakInside: 'avoid' }}>
                  <div style={{ display: 'inline-block', minWidth: isMobilePrint ? '180px' : '220px', textAlign: 'left' }}>
                    <div>
                      Pontianak, {tglSuratFormatted}
                    </div>
                    <div style={{ position: 'relative', height: isMobilePrint ? '50px' : '85px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {withSignature && isValidSignature(kacabSignature) ? (
                        <img
                          src={kacabSignature}
                          alt="TTD Kepala Cabang"
                          style={{ height: isMobilePrint ? '50px' : '85px', width: 'auto', objectFit: 'contain' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : null}
                    </div>
                    <div>
                      <span style={{ fontWeight: 900, textDecoration: 'underline', textTransform: 'uppercase', fontSize: isMobilePrint ? '8.5pt' : '10.5pt' }}>
                        {kepalaCabang}
                      </span>
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
                size: A4 portrait !important; 
                margin: ${isMobilePrint ? '4mm 10mm 4mm 10mm' : '0'} !important; 
              }
              html, body { 
                background: #ffffff !important; 
                color: #000000 !important; 
                margin: 0 !important; 
                padding: 0 !important; 
                height: auto !important; 
                min-height: 0 !important; 
                overflow: visible !important; 
              }
              .no-print, header, nav, aside { display: none !important; }
              .modal-overlay { 
                position: static !important; 
                background: transparent !important; 
                padding: 0 !important; 
                margin: 0 !important; 
                display: block !important; 
                height: auto !important; 
                min-height: 0 !important; 
                overflow: visible !important; 
              }
              .modal-content { 
                max-width: 100% !important; 
                width: 100% !important; 
                height: auto !important; 
                min-height: 0 !important; 
                max-height: none !important; 
                border: none !important; 
                box-shadow: none !important; 
                background: #ffffff !important; 
                margin: 0 !important; 
                padding: 0 !important; 
              }
              .modal-header, .modal-footer { display: none !important; }
              .modal-body { 
                padding: 0 !important; 
                margin: 0 !important; 
                height: auto !important; 
                min-height: 0 !important; 
                max-height: none !important; 
                overflow: visible !important; 
              }
              .printable-sheet-wrapper { 
                display: block !important; 
                width: 100% !important; 
                height: auto !important; 
                min-height: 0 !important; 
                overflow: visible !important; 
                margin: 0 !important; 
                padding: 0 !important; 
              }
              .printable-sheet { 
                padding: ${isMobilePrint ? '0' : '20mm 22mm 18mm 22mm'} !important;
                margin: 0 !important;
                width: 100% !important;
                min-width: 0 !important;
                box-sizing: border-box !important;
                page-break-after: avoid !important;
                break-after: avoid !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                border: none !important;
                box-shadow: none !important;
                zoom: 1 !important;
                transform: none !important;
                background: #ffffff !important;
                color: #000000 !important;
                height: auto !important;
                min-height: 0 !important;
              }
            }
          `}</style>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Tutup
            </button>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={16} />
              <span>Cetak / Save PDF (SPS)</span>
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
