import React, { useRef, useState, useMemo, useEffect } from 'react';
import { X, Printer, FileText, Maximize2, Minimize2 } from 'lucide-react';
import { formatDateIndo, cleanDocNumber } from '../utils/formatters';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ModalPortal } from './ModalPortal';
import { DanantaraLogo } from './DanantaraLogo';
import { IDSurveyLogo } from './IDSurveyLogo';
import { BKILogo } from './BKILogo';

export const SuratTugasPdsPrintModal = ({ isOpen, onClose, suratTugas }) => {
  const printRef = useRef(null);
  const { adminSettings, suratTugas: allSuratTugas } = useData();
  const { usersList } = useAuth();
  const [withSignature, setWithSignature] = useState(true);
  const [mobileFit, setMobileFit] = useState(true);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobileScreen = windowWidth <= 768;
  const targetDocWidth = 720;
  const fitScale = isMobileScreen ? Math.min(Math.max((windowWidth - 20) / targetDocWidth, 0.35), 1) : 1;

  // Removed early return to prevent React Hook order violation
  // Resolve list of individual ships for this PDS
  const shipList = useMemo(() => {
    if (!suratTugas) return [];

    // 0. Priority: shipsDetail if stored
    if (Array.isArray(suratTugas.shipsDetail) && suratTugas.shipsDetail.length > 0) {
      return suratTugas.shipsDetail.map((s, idx) => ({
        namaKapal: String(s.namaKapal || `Kapal ${idx + 1}`).toUpperCase(),
        noAgenda: s.noAgenda || '-',
        noOrder: s.noOrder || '-',
        nomor: cleanDocNumber(suratTugas.nomor || 'A 0    /SV.201/PK/KI-26'),
        lokasi: String(suratTugas.tempatSurvey || suratTugas.lokasi || 'PONTIANAK').toUpperCase()
      }));
    }

    // 1. If we have linkedSpsIds, lookup individual SPS records to get their original distinct ship names and numbers
    if (suratTugas.linkedSpsIds && suratTugas.linkedSpsIds.length > 0 && Array.isArray(allSuratTugas)) {
      const matched = allSuratTugas.filter((s) => suratTugas.linkedSpsIds.includes(s.id));
      if (matched.length > 0) {
        return matched.map((s, idx) => ({
          namaKapal: String(s.namaKapal || `Kapal ${idx + 1}`).toUpperCase(),
          noAgenda: s.noAgenda || s.agenda || '-',
          noOrder: s.noOrder || '-',
          nomor: cleanDocNumber(suratTugas.nomor || 'A 0    /SV.201/PK/KI-26'),
          lokasi: String(s.tempatSurvey || s.lokasi || suratTugas.tempatSurvey || suratTugas.lokasi || 'PONTIANAK').toUpperCase()
        }));
      }
    }

    // 2. Comma-separated names in namaKapal
    const names = String(suratTugas.namaKapal || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (names.length > 1) {
      return names.map((name) => {
        const itemNomor = String(suratTugas.nomor || 'A 0    /SV.201/PK/KI-26');
        return {
          namaKapal: String(name).toUpperCase(),
          nomor: cleanDocNumber(itemNomor),
          lokasi: String(suratTugas.tempatSurvey || suratTugas.lokasi || 'PONTIANAK').toUpperCase()
        };
      });
    }

    // 3. Single ship fallback
    return [{
      namaKapal: String(suratTugas.namaKapal || 'KAPAL').toUpperCase(),
      nomor: cleanDocNumber(suratTugas.nomor || 'A 0    /SV.201/PK/KI-26'),
      lokasi: String(suratTugas.tempatSurvey || suratTugas.lokasi || 'PONTIANAK').toUpperCase()
    }];
  }, [suratTugas, allSuratTugas]);

  const resolvedShipList = shipList && shipList.length > 0 ? shipList : [{
    namaKapal: String(suratTugas?.namaKapal || 'KAPAL').toUpperCase(),
    nomor: cleanDocNumber(suratTugas?.nomor || 'A 0    /SV.201/PK/KI-26'),
    lokasi: String(suratTugas?.tempatSurvey || suratTugas?.lokasi || 'PONTIANAK').toUpperCase()
  }];

  if (!isOpen || !suratTugas) return null;

  const handlePrint = () => {
    const originalTitle = document.title;
    const dateObj = new Date(suratTugas.tglMulai);
    const dateStr = !isNaN(dateObj) ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}` : 'Tanggal';
    const surveyor = suratTugas.petugas || 'Surveyor';
    document.title = `${dateStr} - ${surveyor} - Surat Tugas (PDS)${withSignature ? '_Dengan_TTD' : '_Tanpa_TTD'}`;
    
    window.print();
    
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  const tglMulai = formatDateIndo(suratTugas.tglMulai);
  const tglSelesai = formatDateIndo(suratTugas.tglSelesai);
  
  const surveyorName = suratTugas.petugas || '';
  const pangkat = suratTugas.pangkat || '';
  const jabatan = suratTugas.jabatan || 'SURVEYOR';
  
  const keperluan1 = 'DINAS SURVEY KLAS';
  
  const sarana = suratTugas.saranaTransportasi || 'UDARA, DARAT DAN AIR';
  const keterangan = adminSettings?.keteranganLain || suratTugas.keteranganLain || 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK';
  
  const tanggalDikeluarkan = tglMulai;
  const kepalaCabang = adminSettings?.kepalaCabang || suratTugas.kepalaCabang || 'MUHSON NURROCHMAT';
  const nup = adminSettings?.nup || suratTugas.nup || '48199-KI';

  const tembusan = adminSettings?.tembusan || suratTugas.tembusan || `1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026`;

  // Get Scanned TTD for Kepala Cabang
  const kacabUser = usersList?.find((u) => u.name === kepalaCabang || u.role === 'kacab') || {};
  const kacabSignature = adminSettings?.kacabSignatureUrl || kacabUser.signatureUrl || '/signatures/kacab_muhson_signature.png';

  const renderNomorSurat = (nomorVal) => {
    const clean = cleanDocNumber(nomorVal || '').trim();
    const slashIdx = clean.indexOf('/');
    if (slashIdx !== -1) {
      const prefix = clean.substring(0, slashIdx).trim();
      const suffix = clean.substring(slashIdx);
      if (!prefix) {
        // Jika prefix A0 tidak diisi/dikosongkan, sediakan spasi kosong lebar agar bisa ditulis tangan dengan pensil
        return (
          <span>
            NO.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{suffix}
          </span>
        );
      }
      // Jika prefix terisi, berikan spasi proporsional antara NO., prefix, dan suffix /SV...
      return (
        <span>
          NO. {prefix}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{suffix}
        </span>
      );
    }
    if (!clean) {
      return <span>NO.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/SV.201/PK/KI-26</span>;
    }
    return <span>NO. {clean}</span>;
  };

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
              <FileText size={isMobileScreen ? 18 : 20} color="#003366" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <h3 className="modal-title" style={{ color: '#0f172a', fontSize: isMobileScreen ? '0.9rem' : '1rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Preview & Cetak Surat Tugas (PDS)
                </h3>
                <div style={{ fontSize: isMobileScreen ? '0.68rem' : '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {resolvedShipList.length > 1
                    ? `1 Lembar Surat Tugas — ${resolvedShipList.length} kapal`
                    : '1 Lembar Pas Resmi A4'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
              {/* Mobile Zoom Switcher */}
              {isMobileScreen && (
                <button
                  type="button"
                  className={`btn btn-sm ${mobileFit ? 'btn-outline-primary' : 'btn-primary'}`}
                  onClick={() => setMobileFit(!mobileFit)}
                  style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                  title={mobileFit ? 'Perbesar ke ukuran asli' : 'Kecilkan agar pas layar'}
                >
                  {mobileFit ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
                  <span>{mobileFit ? 'Ukuran Asli' : 'Pas Layar'}</span>
                </button>
              )}

              {/* Toggle Versi TTD */}
              <button
                type="button"
                className={`btn btn-sm ${withSignature ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setWithSignature(!withSignature)}
                style={{ fontSize: isMobileScreen ? '0.72rem' : '0.75rem', fontWeight: 700, padding: isMobileScreen ? '0.3rem 0.5rem' : '0.35rem 0.75rem' }}
              >
                {withSignature ? '✍️ Dgn TTD' : '📄 Tanpa TTD'}
              </button>

              <button className="btn btn-secondary btn-sm" onClick={onClose} title="Tutup" style={{ padding: isMobileScreen ? '0.3rem 0.45rem' : '0.35rem 0.6rem' }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Document Body — Single sheet for all ships */}
          <div
            className="modal-body print-modal-body"
            style={{
              padding: isMobileScreen ? '0.5rem' : '1.25rem 1.5rem',
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
                  padding: isMobileScreen ? '1.25rem 1rem' : '1.5rem 2rem',
                  fontFamily: "'Arial', 'Segoe UI', sans-serif",
                  lineHeight: '1.35',
                  fontSize: '9.5pt',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <DanantaraLogo height={36} />
                  <IDSurveyLogo height={38} />
                  <BKILogo height={36} />
                </div>

                {/* ====== JUDUL SURAT ====== */}
                <div style={{ textAlign: 'center', marginBottom: '0.65rem' }}>
                  <div style={{ fontSize: '11pt', fontWeight: 700, textDecoration: 'underline', color: '#000000', marginBottom: '0.15rem' }}>
                    SURAT TUGAS
                  </div>
                  <div style={{ fontSize: '9.5pt', color: '#000000' }}>
                    {renderNomorSurat(resolvedShipList[0].nomor)}
                  </div>
                </div>

                {/* ====== BODY PENUGASAN ====== */}
                <div style={{ marginBottom: '0.65rem' }}>
                  <div style={{ fontSize: '9.5pt', fontWeight: 600, marginBottom: '0.4rem' }}>
                    DITUGASKAN KEPADA &nbsp; &nbsp;:
                  </div>
                  
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', lineHeight: '1.35' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '25px', verticalAlign: 'top', padding: '1.5px 0' }}>1.</td>
                        <td style={{ width: '165px', verticalAlign: 'top', padding: '1.5px 0' }}>NAMA</td>
                        <td style={{ width: '15px', verticalAlign: 'top', padding: '1.5px 0' }}>:</td>
                        <td style={{ verticalAlign: 'top', fontWeight: 700, padding: '1.5px 0' }}>{surveyorName}</td>
                      </tr>
                      <tr>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>2.</td>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>PANGKAT</td>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>:</td>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>{pangkat}</td>
                      </tr>
                      <tr>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>3.</td>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>JABATAN</td>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>:</td>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>{jabatan}</td>
                      </tr>
                      <tr>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}></td>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>UNTUK PERGI KE</td>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>:</td>
                        <td style={{ verticalAlign: 'top', textTransform: 'uppercase', fontWeight: 700, padding: '1.5px 0' }}>{resolvedShipList[0].lokasi}</td>
                      </tr>
                      <tr>
                        <td style={{ verticalAlign: 'top', padding: '2px 0' }}>5.</td>
                        <td style={{ verticalAlign: 'top', padding: '2px 0' }}>KEPERLUAN</td>
                        <td style={{ verticalAlign: 'top', padding: '2px 0' }}>:</td>
                        <td style={{ verticalAlign: 'top', lineHeight: '1.3', padding: '2px 0' }}>
                          <div>{keperluan1}</div>
                          <div style={{ fontWeight: 700 }}>{resolvedShipList.map(s => s.namaKapal).join(', ')}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>6.</td>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>BERANGKAT</td>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>:</td>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>{tglMulai}</td>
                      </tr>
                      <tr>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>7.</td>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>KEMBALI</td>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>:</td>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>{tglSelesai}</td>
                      </tr>
                      <tr>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>8.</td>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>SARANA TRANSPORTASI</td>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>:</td>
                        <td style={{ verticalAlign: 'top', padding: '1.5px 0' }}>{sarana}</td>
                      </tr>
                      <tr>
                        <td style={{ verticalAlign: 'top', padding: '2px 0' }}>9.</td>
                        <td style={{ verticalAlign: 'top', padding: '2px 0' }}>KETERANGAN LAIN</td>
                        <td style={{ verticalAlign: 'top', padding: '2px 0' }}>:</td>
                        <td style={{ verticalAlign: 'top', paddingRight: '0.5rem', lineHeight: '1.3', padding: '2px 0' }}>{keterangan}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ====== TANDA TANGAN KEPALA CABANG ====== */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem', fontSize: '9.5pt', lineHeight: '1.35', breakInside: 'avoid' }}>
                  <div style={{ position: 'relative', width: '340px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '120px', verticalAlign: 'top' }}>DIKELUARKAN</td>
                          <td style={{ width: '15px', verticalAlign: 'top' }}>:</td>
                          <td style={{ verticalAlign: 'top' }}>PONTIANAK</td>
                        </tr>
                        <tr>
                          <td style={{ width: '120px', verticalAlign: 'top' }}>PADA TANGGAL</td>
                          <td style={{ width: '15px', verticalAlign: 'top' }}>:</td>
                          <td style={{ verticalAlign: 'top' }}>{tanggalDikeluarkan}</td>
                        </tr>
                      </tbody>
                    </table>
                    
                    <div style={{ marginTop: '0.4rem', fontWeight: 600 }}>
                      KEPALA CABANG MADYA KLAS PONTIANAK
                    </div>

                    <div style={{ position: 'relative', height: '62px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {withSignature && kacabSignature ? (
                        <img
                          src={kacabSignature}
                          alt="TTD Kepala Cabang"
                          style={{ height: '62px', width: 'auto', objectFit: 'contain' }}
                        />
                      ) : null}
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '55px', verticalAlign: 'top' }}>NAMA</td>
                          <td style={{ width: '15px', verticalAlign: 'top' }}>:</td>
                          <td style={{ verticalAlign: 'top', textDecoration: 'underline', fontWeight: 700 }}>{kepalaCabang}</td>
                        </tr>
                        <tr>
                          <td style={{ width: '55px', verticalAlign: 'top' }}>NUP</td>
                          <td style={{ width: '15px', verticalAlign: 'top' }}>:</td>
                          <td style={{ verticalAlign: 'top' }}>{nup}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ====== TEMBUSAN & FOOTER ====== */}
                <div style={{ marginTop: '0.45rem', fontSize: '8.5pt', breakInside: 'avoid' }}>
                  <div style={{ marginBottom: '0.15rem', fontWeight: 600 }}>Tembusan &nbsp; &nbsp;:</div>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.3', marginBottom: '0.4rem', color: '#334155' }}>
                    {tembusan}
                  </div>
                  
                  {/* FOOTER BKI */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', fontSize: '7.5pt', color: '#64748b', marginTop: '0.4rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.35rem' }}>
                    <div style={{ lineHeight: '1.25' }}>
                      <div style={{ fontWeight: 700, color: '#475569' }}>PT. Biro Klasifikasi Indonesia (Persero)</div>
                      <div>Pontianak Class Middle Branch</div>
                      <div>Jl. Gusti Hamzah No. 211, PONTIANAK - 78116 INDONESIA</div>
                    </div>
                    <div style={{ lineHeight: '1.25' }}>
                      <table style={{ borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td style={{ width: '50px', verticalAlign: 'top' }}>Phone</td>
                            <td style={{ width: '10px', verticalAlign: 'top' }}>:</td>
                            <td>(0561) 739579</td>
                          </tr>
                          <tr>
                            <td style={{ verticalAlign: 'top' }}>E-Mail</td>
                            <td style={{ verticalAlign: 'top' }}>:</td>
                            <td>pk@bki.co.id</td>
                          </tr>
                        </tbody>
                      </table>
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
              @page { size: A4 portrait !important; margin: 10mm 15mm 8mm 15mm !important; }
              html, body { background: #ffffff !important; color: #000000 !important; margin: 0 !important; padding: 0 !important; }
              .no-print { display: none !important; }
              .modal-overlay { position: static !important; background: transparent !important; padding: 0 !important; margin: 0 !important; display: block !important; }
              .modal-content { max-width: 100% !important; width: 100% !important; border: none !important; box-shadow: none !important; background: #ffffff !important; }
              .modal-header, .modal-footer { display: none !important; }
              .modal-body { padding: 0 !important; overflow: visible !important; }
              .printable-sheet-wrapper { display: block !important; width: 100% !important; overflow: visible !important; }
              .printable-sheet { 
                padding: 0 !important;
                width: 100% !important;
                min-width: 0 !important;
                box-sizing: border-box !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                margin-bottom: 0 !important;
                border: none !important;
                box-shadow: none !important;
                zoom: 1 !important;
                transform: none !important;
                background: #ffffff !important;
                color: #000000 !important;
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
              <span>Cetak / Save PDF (PDS)</span>
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
