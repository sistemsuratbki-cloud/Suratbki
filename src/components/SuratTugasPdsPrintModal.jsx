import React, { useRef, useState } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { formatDateIndo } from '../utils/formatters';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ModalPortal } from './ModalPortal';
import { DanantaraLogo } from './DanantaraLogo';
import { IDSurveyLogo } from './IDSurveyLogo';
import { BKILogo } from './BKILogo';

export const SuratTugasPdsPrintModal = ({ isOpen, onClose, suratTugas }) => {
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
  const lokasi = (suratTugas.tempatSurvey || suratTugas.lokasi || suratTugas.tujuan || suratTugas.lokasiSurvey || suratTugas.tempat || 'PONTIANAK').toUpperCase();
  
  const keperluan1 = 'DINAS SURVEY KLAS';
  const keperluan2 = (suratTugas.namaKapal || '').toUpperCase();
  
  const sarana = suratTugas.saranaTransportasi || 'UDARA, DARAT DAN AIR';
  const keterangan = adminSettings?.keteranganLain || suratTugas.keteranganLain || 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK';
  
  const tanggalDikeluarkan = tglMulai;
  const kepalaCabang = adminSettings?.kepalaCabang || suratTugas.kepalaCabang || 'MUHSON NURROCHMAT';
  const nup = adminSettings?.nup || suratTugas.nup || '48199-KI';

  const tembusan = adminSettings?.tembusan || suratTugas.tembusan || `1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026`;

  // Get Scanned TTD for Kepala Cabang
  const kacabUser = usersList?.find((u) => u.name === kepalaCabang || u.role === 'kacab') || {};
  const kacabSignature = adminSettings?.kacabSignatureUrl || kacabUser.signatureUrl || '/signatures/kacab_muhson_signature.png';

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          style={{ maxWidth: '780px', background: '#ffffff', color: '#000000' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header Toolbar */}
          <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} color="#003366" />
              <div>
                <h3 className="modal-title" style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 800 }}>
                  Preview & Cetak Surat Tugas (PDS)
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

              <button className="btn btn-primary btn-sm" onClick={handlePrint}>
                <Printer size={15} />
                <span>Cetak / PDF</span>
              </button>
              <button className="btn btn-secondary btn-sm" onClick={onClose}>
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
                fontFamily: "'Arial', 'Segoe UI', sans-serif",
                lineHeight: '1.5',
                fontSize: '11pt',
                background: '#ffffff',
                color: '#000000',
                boxSizing: 'border-box'
              }}
            >
              {/* ====== KOP LOGOS RESMI ====== */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <DanantaraLogo height={45} />
                <IDSurveyLogo height={48} />
                <BKILogo height={45} />
              </div>

              {/* ====== JUDUL SURAT ====== */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '12pt', fontWeight: 700, textDecoration: 'underline', color: '#000000', marginBottom: '0.2rem' }}>
                  SURAT TUGAS
                </div>
                <div style={{ fontSize: '11pt', color: '#000000' }}>
                  NO.{suratTugas.nomor}
                </div>
              </div>

              {/* ====== BODY PENUGASAN ====== */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '11pt', marginBottom: '1rem' }}>
                  DITUGASKAN KEPADA &nbsp; &nbsp;:
                </div>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11pt', lineHeight: '1.8' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '30px', verticalAlign: 'top' }}>1.</td>
                      <td style={{ width: '180px', verticalAlign: 'top' }}>NAMA</td>
                      <td style={{ width: '20px', verticalAlign: 'top' }}>:</td>
                      <td style={{ verticalAlign: 'top', fontWeight: 700 }}>{surveyorName}</td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: 'top' }}>2.</td>
                      <td style={{ verticalAlign: 'top' }}>PANGKAT</td>
                      <td style={{ verticalAlign: 'top' }}>:</td>
                      <td style={{ verticalAlign: 'top' }}>{pangkat}</td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: 'top' }}>3.</td>
                      <td style={{ verticalAlign: 'top' }}>JABATAN</td>
                      <td style={{ verticalAlign: 'top' }}>:</td>
                      <td style={{ verticalAlign: 'top' }}>{jabatan}</td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: 'top' }}></td>
                      <td style={{ verticalAlign: 'top' }}>UNTUK PERGI KE</td>
                      <td style={{ verticalAlign: 'top' }}>:</td>
                      <td style={{ verticalAlign: 'top', textTransform: 'uppercase', fontWeight: 700 }}>{lokasi}</td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: 'top' }}>5.</td>
                      <td style={{ verticalAlign: 'top' }}>KEPERLUAN</td>
                      <td style={{ verticalAlign: 'top' }}>:</td>
                      <td style={{ verticalAlign: 'top', lineHeight: '1.5', paddingTop: '0.4rem', paddingBottom: '0.4rem' }}>
                        <div>{keperluan1}</div>
                        <div style={{ fontWeight: 700 }}>{keperluan2}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: 'top' }}>6.</td>
                      <td style={{ verticalAlign: 'top' }}>BERANGKAT</td>
                      <td style={{ verticalAlign: 'top' }}>:</td>
                      <td style={{ verticalAlign: 'top' }}>{tglMulai}</td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: 'top' }}>7.</td>
                      <td style={{ verticalAlign: 'top' }}>KEMBALI</td>
                      <td style={{ verticalAlign: 'top' }}>:</td>
                      <td style={{ verticalAlign: 'top' }}>{tglSelesai}</td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: 'top' }}>8.</td>
                      <td style={{ verticalAlign: 'top' }}>SARANA TRANSPORTASI</td>
                      <td style={{ verticalAlign: 'top' }}>:</td>
                      <td style={{ verticalAlign: 'top' }}>{sarana}</td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: 'top' }}>9.</td>
                      <td style={{ verticalAlign: 'top' }}>KETERANGAN LAIN</td>
                      <td style={{ verticalAlign: 'top' }}>:</td>
                      <td style={{ verticalAlign: 'top', paddingRight: '1rem', lineHeight: '1.5', paddingTop: '0.4rem', paddingBottom: '0.4rem' }}>{keterangan}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ====== TANDA TANGAN KEPALA CABANG ====== */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', fontSize: '11pt', lineHeight: '1.5' }}>
                <div style={{ position: 'relative', width: '380px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11pt' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '130px', verticalAlign: 'top' }}>DIKELUARKAN</td>
                        <td style={{ width: '20px', verticalAlign: 'top' }}>:</td>
                        <td style={{ verticalAlign: 'top' }}>PONTIANAK</td>
                      </tr>
                      <tr>
                        <td style={{ width: '130px', verticalAlign: 'top' }}>PADA TANGGAL</td>
                        <td style={{ width: '20px', verticalAlign: 'top' }}>:</td>
                        <td style={{ verticalAlign: 'top' }}>{tanggalDikeluarkan}</td>
                      </tr>
                    </tbody>
                  </table>
                  
                  <div style={{ marginTop: '0.75rem' }}>
                    KEPALA CABANG MADYA KLAS PONTIANAK
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

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11pt' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '60px', verticalAlign: 'top' }}>NAMA</td>
                        <td style={{ width: '20px', verticalAlign: 'top' }}>:</td>
                        <td style={{ verticalAlign: 'top', textDecoration: 'underline', fontWeight: 700 }}>{kepalaCabang}</td>
                      </tr>
                      <tr>
                        <td style={{ width: '60px', verticalAlign: 'top' }}>NUP</td>
                        <td style={{ width: '20px', verticalAlign: 'top' }}>:</td>
                        <td style={{ verticalAlign: 'top' }}>{nup}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ====== TEMBUSAN & FOOTER ====== */}
              <div style={{ marginTop: '1.5rem', fontSize: '10pt' }}>
                <div style={{ marginBottom: '0.25rem' }}>Tembusan &nbsp; &nbsp;:</div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', marginBottom: '1rem' }}>
                  {tembusan}
                </div>
                
                {/* FOOTER BKI */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', fontSize: '9pt', color: '#64748b', marginTop: '1rem' }}>
                  <div style={{ lineHeight: '1.4' }}>
                    <div style={{ fontWeight: 700 }}>PT. Biro Klasifikasi Indonesia (Persero)</div>
                    <div>Pontianak Class Middle Branch</div>
                    <div>Jl. Gusti Hamzah No. 211</div>
                    <div>PONTIANAK - 78116</div>
                    <div>INDONESIA</div>
                  </div>
                  <div style={{ lineHeight: '1.4' }}>
                    <table style={{ borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '60px', verticalAlign: 'top' }}>Phone</td>
                          <td style={{ width: '15px', verticalAlign: 'top' }}>:</td>
                          <td>(0561) 739579</td>
                        </tr>
                        <tr>
                          <td style={{ verticalAlign: 'top' }}>Fax</td>
                          <td style={{ verticalAlign: 'top' }}>:</td>
                          <td>-</td>
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

          <style>{`
            @media print {
              @page { size: A4 portrait; margin: 0; }
              body { background: #ffffff !important; color: #000000 !important; }
              .modal-overlay { position: static !important; background: transparent !important; padding: 0 !important; }
              .modal-content { max-width: 100% !important; width: 100% !important; border: none !important; box-shadow: none !important; }
              .modal-header, .modal-footer { display: none !important; }
              .modal-body { padding: 0 !important; overflow: visible !important; }
              .printable-sheet { 
                padding: 15mm 20mm 15mm 20mm !important;
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
              <span>Cetak / Save PDF (PDS)</span>
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
