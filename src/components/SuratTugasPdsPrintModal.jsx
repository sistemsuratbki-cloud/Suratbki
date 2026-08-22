import React, { useRef, useState, useMemo } from 'react';
import { X, Printer, FileText } from 'lucide-react';
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
        nomor: cleanDocNumber(suratTugas.nomor || `A 0    /SV.${787 + idx}/PK/KI-26`),
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
          nomor: cleanDocNumber(suratTugas.nomor || `A 0    /SV.${787 + idx}/PK/KI-26`),
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
      return names.map((name, idx) => {
        let itemNomor = String(suratTugas.nomor || 'A 0    /SV.787/PK/KI-26');
        const match = itemNomor.match(/SV\.(\d+)/i);
        if (match) {
          const baseSeq = parseInt(match[1], 10);
          itemNomor = itemNomor.replace(/SV\.\d+/i, `SV.${baseSeq + idx}`);
        }
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
      nomor: cleanDocNumber(suratTugas.nomor || 'A 0    /SV.787/PK/KI-26'),
      lokasi: String(suratTugas.tempatSurvey || suratTugas.lokasi || 'PONTIANAK').toUpperCase()
    }];
  }, [suratTugas, allSuratTugas]);

  const resolvedShipList = shipList && shipList.length > 0 ? shipList : [{
    namaKapal: String(suratTugas?.namaKapal || 'KAPAL').toUpperCase(),
    nomor: cleanDocNumber(suratTugas?.nomor || 'A 0    /SV.787/PK/KI-26'),
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
              <FileText size={20} color="#003366" />
              <div>
                <h3 className="modal-title" style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 800 }}>
                  Preview & Cetak Surat Tugas (PDS)
                </h3>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {resolvedShipList.length > 1
                    ? `Mencetak ${resolvedShipList.length} Lembar Surat Tugas (1 lembar per kapal)`
                    : 'Pilih versi dengan TTD digital atau tanpa TTD (manual)'}
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
            {resolvedShipList.map((shipItem, idx) => (
              <div
                key={idx}
                className="printable-sheet"
                style={{
                  border: 'none',
                  padding: '2rem 2.5rem',
                  fontFamily: "'Arial', 'Segoe UI', sans-serif",
                  lineHeight: '1.5',
                  fontSize: '11pt',
                  background: '#ffffff',
                  color: '#000000',
                  boxSizing: 'border-box',
                  pageBreakAfter: idx < resolvedShipList.length - 1 ? 'always' : 'auto',
                  breakAfter: idx < resolvedShipList.length - 1 ? 'page' : 'auto',
                  marginBottom: idx < resolvedShipList.length - 1 ? '2.5rem' : 0,
                  borderBottom: idx < resolvedShipList.length - 1 ? '2px dashed #cbd5e1' : 'none',
                  paddingBottom: idx < resolvedShipList.length - 1 ? '2.5rem' : '2rem'
                }}
              >
                {/* Header banner if multi-page in preview */}
                {resolvedShipList.length > 1 && (
                  <div
                    className="no-print"
                    style={{
                      marginBottom: '1rem',
                      padding: '0.4rem 0.75rem',
                      background: '#f1f5f9',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#0369a1',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>📄 Lembar PDS {idx + 1} dari {shipList.length}: <strong>{shipItem.namaKapal}</strong></span>
                    <span>NO. {shipItem.nomor}</span>
                  </div>
                )}

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
                    NO.{shipItem.nomor}
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
                        <td style={{ verticalAlign: 'top', textTransform: 'uppercase', fontWeight: 700 }}>{shipItem.lokasi}</td>
                      </tr>
                      <tr>
                        <td style={{ verticalAlign: 'top' }}>5.</td>
                        <td style={{ verticalAlign: 'top' }}>KEPERLUAN</td>
                        <td style={{ verticalAlign: 'top' }}>:</td>
                        <td style={{ verticalAlign: 'top', lineHeight: '1.5', paddingTop: '0.4rem', paddingBottom: '0.4rem' }}>
                          <div>{keperluan1}</div>
                          <div style={{ fontWeight: 700 }}>{shipItem.namaKapal}</div>
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
            ))}
          </div>

          <style>{`
            @media print {
              @page { size: A4 portrait; margin: 0; }
              html, body { background: #ffffff !important; color: #000000 !important; margin: 0 !important; padding: 0 !important; }
              .no-print { display: none !important; }
              .modal-overlay { position: static !important; background: transparent !important; padding: 0 !important; margin: 0 !important; display: block !important; }
              .modal-content { max-width: 100% !important; width: 100% !important; border: none !important; box-shadow: none !important; background: #ffffff !important; }
              .modal-header, .modal-footer { display: none !important; }
              .modal-body { padding: 0 !important; overflow: visible !important; }
              .printable-sheet { 
                padding: 15mm 20mm 15mm 20mm !important;
                box-sizing: border-box !important;
                page-break-after: always !important;
                break-after: page !important;
                margin-bottom: 0 !important;
                border-bottom: none !important;
                display: block !important;
                background: #ffffff !important;
                color: #000000 !important;
              }
              .printable-sheet:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
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
