import React, { useRef, useState } from 'react';
import { X, Printer, Anchor } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';
import { DanantaraLogo } from './DanantaraLogo';
import { IDSurveyLogo } from './IDSurveyLogo';
import { BKILogo } from './BKILogo';

export const SuratTugasPrintModal = ({ isOpen, onClose, suratTugas }) => {
  const printRef = useRef(null);
  const { adminSettings } = useData();
  const { usersList } = useAuth();
  const [withSignature, setWithSignature] = useState(true);

  if (!isOpen || !suratTugas) return null;

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
          style={{ maxWidth: '780px', maxHeight: '90vh', background: '#ffffff', color: '#000000' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header Toolbar */}
          <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Anchor size={20} color="#003366" />
              <div>
                <h3 className="modal-title" style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 800 }}>
                  Preview & Cetak Surat Penunjukan Survey (SPS)
                </h3>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Pilih versi dengan TTD digital atau tanpa TTD (manual)
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Toggle Versi TTD */}
              <button
                type="button"
                className={`btn btn-sm ${withSignature ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setWithSignature(!withSignature)}
                style={{ fontSize: '0.75rem', fontWeight: 700 }}
              >
                {withSignature ? '✍️ Versi: DENGAN TTD' : '📄 Versi: TANPA TTD (Manual)'}
              </button>

              <button className="btn btn-secondary btn-sm" onClick={onClose} title="Tutup">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Document Body */}
          <div className="modal-body" style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
            <div
              className="printable-sheet"
              style={{
                border: 'none',
                padding: '2rem 2.5rem',
                borderRadius: '4px',
                fontFamily: "'Arial', 'Segoe UI', sans-serif",
                lineHeight: '1.45',
                fontSize: '11pt',
                background: '#ffffff',
                color: '#000000',
                boxSizing: 'border-box'
              }}
            >
              {/* ====== KOP LOGOS RESMI ====== */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
                <DanantaraLogo height={42} />
                <IDSurveyLogo height={44} />
                <BKILogo height={42} />
              </div>

              {/* ====== JUDUL SURAT RESMI ====== */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '11pt', fontWeight: 900, textTransform: 'uppercase', color: '#000000', letterSpacing: '0.02em' }}>
                  PT.BIRO KLASIFIKASI INDONESIA (PERSERO)
                </div>
                <div style={{ fontSize: '11pt', fontWeight: 900, textTransform: 'uppercase', color: '#000000', letterSpacing: '0.02em', marginTop: '0.15rem' }}>
                  CABANG MADYA KLAS PONTIANAK
                </div>
                <div style={{ fontSize: '12pt', fontWeight: 900, textTransform: 'uppercase', color: '#000000', letterSpacing: '0.04em', marginTop: '1.15rem' }}>
                  SURAT PENUNJUKAN SURVEY (SPS)
                </div>
              </div>

              {/* ====== BODY PENUGASAN ====== */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '10pt', fontWeight: 700, minHeight: '40px' }}>
                  <span style={{ width: '220px' }}>NAMA SURVEYOR</span>
                  <span style={{ width: '20px' }}>:</span>
                  {withSignature ? (
                    isMuhson ? null : (
                      surveyorHandwrittenSrc ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <img
                            src={surveyorHandwrittenSrc}
                            alt={surveyorName}
                            style={{ height: '36px', maxWidth: '220px', objectFit: 'contain' }}
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
                <div style={{ marginTop: '1.25rem', fontWeight: 700, textTransform: 'uppercase', fontSize: '10pt' }}>
                  UNTUK MELAKSANAKAN SURVEY
                </div>
              </div>

              {/* ====== TABEL RINCIAN OBJEK PENUGASAN ====== */}
              <div style={{ paddingLeft: '2rem', marginBottom: '2rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', lineHeight: '2' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '200px', fontWeight: 700, verticalAlign: 'top' }}>NAMA KAPAL / OBJEK</td>
                      <td style={{ width: '20px', verticalAlign: 'top' }}>:</td>
                      <td style={{ fontWeight: 900, textTransform: 'uppercase', verticalAlign: 'top' }}>{namaKapal}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, verticalAlign: 'top' }}>PEMOHON</td>
                      <td style={{ verticalAlign: 'top' }}>:</td>
                      <td style={{ textTransform: 'uppercase', verticalAlign: 'top' }}>{pemohon}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, verticalAlign: 'top' }}>JENIS SURVEY</td>
                      <td style={{ verticalAlign: 'top' }}>:</td>
                      <td style={{ textTransform: 'uppercase', verticalAlign: 'top' }}>{jenisSurvey}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, verticalAlign: 'top' }}>TEMPAT SURVEY KLAS</td>
                      <td style={{ verticalAlign: 'top' }}>:</td>
                      <td style={{ textTransform: 'uppercase', verticalAlign: 'top' }}>{lokasiSurvey}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, verticalAlign: 'top' }}>TANGGAL SURVEY</td>
                      <td style={{ verticalAlign: 'top' }}>:</td>
                      <td style={{ textTransform: 'uppercase', verticalAlign: 'top' }}>
                        {tglSurveyFormatted.toUpperCase()} <span style={{ marginLeft: '1.5rem', fontWeight: 800 }}>/ TENTATIVE</span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, verticalAlign: 'top' }}>NOMOR AGENDA</td>
                      <td style={{ verticalAlign: 'top' }}>:</td>
                      <td style={{ verticalAlign: 'top' }}>{noAgenda}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, verticalAlign: 'top' }}>NO.ORDER</td>
                      <td style={{ verticalAlign: 'top' }}>:</td>
                      <td style={{ fontWeight: 900, textTransform: 'uppercase', verticalAlign: 'top' }}>{noOrder}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, verticalAlign: 'top' }}>CATATAN</td>
                      <td style={{ verticalAlign: 'top' }}>:</td>
                      <td style={{ verticalAlign: 'top' }}>{catatan}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ====== TANDA TANGAN KEPALA CABANG ====== */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2.5rem', fontSize: '11pt', lineHeight: '1.5' }}>
                <div style={{ display: 'inline-block', minWidth: '220px', textAlign: 'left' }}>
                  <div>
                    Pontianak, {tglSurveyFormatted}
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
                  <div>
                    <span style={{ fontWeight: 900, textDecoration: 'underline', textTransform: 'uppercase', fontSize: '10.5pt' }}>
                      {kepalaCabang}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <style>{`
            @media print {
              @page { size: A4 portrait; margin: 0; }
              body { background: #ffffff !important; color: #000000 !important; }
              .modal-overlay { position: static !important; background: transparent !important; padding: 0 !important; }
              .modal-content { max-width: 100% !important; width: 100% !important; border: none !important; box-shadow: none !important; }
              .modal-header, .modal-footer { display: none !important; }
              .modal-body { padding: 0 !important; overflow: visible !important; }
              .printable-sheet { 
                padding: 20mm 22mm 18mm 22mm !important;
                box-sizing: border-box !important;
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
