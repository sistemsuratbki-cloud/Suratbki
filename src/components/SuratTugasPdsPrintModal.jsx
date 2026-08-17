import React, { useRef } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { formatDateIndo } from '../utils/formatters';
import { useData } from '../context/DataContext';
import { ModalPortal } from './ModalPortal';
import { DanantaraLogo } from './DanantaraLogo';
import { IDSurveyLogo } from './IDSurveyLogo';
import { BKILogo } from './BKILogo';

export const SuratTugasPdsPrintModal = ({ isOpen, onClose, suratTugas }) => {
  const printRef = useRef(null);
  const { adminSettings } = useData();

  if (!isOpen || !suratTugas) return null;

  const handlePrint = () => {
    window.print();
  };

  const tglMulai = formatDateIndo(suratTugas.tglMulai);
  const tglSelesai = formatDateIndo(suratTugas.tglSelesai);
  
  const surveyorName = suratTugas.petugas || '';
  const pangkat = suratTugas.pangkat || '';
  const jabatan = suratTugas.jabatan || 'SURVEYOR';
  const lokasi = suratTugas.tempatSurvey || suratTugas.lokasi || '';
  
  const keperluan1 = suratTugas.jenisSurvey || suratTugas.perihal || '';
  const keperluan2 = `${suratTugas.namaKapal || ''} - ${suratTugas.pemohon || ''}`.toUpperCase();
  
  const sarana = suratTugas.saranaTransportasi || 'UDARA, DARAT DAN AIR';
  const keterangan = adminSettings?.keteranganLain || suratTugas.keteranganLain || 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK';
  
  const tanggalDikeluarkan = tglMulai;
  const kepalaCabang = adminSettings?.kepalaCabang || suratTugas.kepalaCabang || 'MUHSON NURROCHMAT';
  const nup = adminSettings?.nup || suratTugas.nup || '48199-KI';

  const tembusan = adminSettings?.tembusan || suratTugas.tembusan || `1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026`;

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
              <h3 className="modal-title" style={{ color: '#0f172a' }}>
                Preview & Cetak Surat Tugas (PDS)
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary btn-sm" onClick={handlePrint}>
                <Printer size={15} />
                Cetak / Download PDF
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
                      <td style={{ verticalAlign: 'top' }}>{surveyorName}</td>
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
                      <td style={{ verticalAlign: 'top' }}>{lokasi}</td>
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
                <div style={{ width: '380px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11pt' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '130px', verticalAlign: 'top' }}>DIKELUARKAN</td>
                        <td style={{ width: '20px', verticalAlign: 'top' }}>:</td>
                        <td style={{ verticalAlign: 'top' }}>PONTIANAK</td>
                      </tr>
                      <tr>
                        <td style={{ verticalAlign: 'top' }}>PADA TANGGAL</td>
                        <td style={{ verticalAlign: 'top' }}>:</td>
                        <td style={{ verticalAlign: 'top' }}>{tanggalDikeluarkan}</td>
                      </tr>
                    </tbody>
                  </table>
                  
                  <div style={{ marginTop: '1rem', marginBottom: '3.5rem' }}>
                    KEPALA CABANG MADYA KLAS PONTIANAK
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11pt' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '60px', verticalAlign: 'top' }}>NAMA</td>
                        <td style={{ width: '20px', verticalAlign: 'top' }}>:</td>
                        <td style={{ verticalAlign: 'top', textDecoration: 'underline' }}>{kepalaCabang}</td>
                      </tr>
                      <tr>
                        <td style={{ verticalAlign: 'top' }}>NUP</td>
                        <td style={{ verticalAlign: 'top' }}>:</td>
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
                        <tr>
                          <td colSpan={3} style={{ paddingTop: '0.5rem' }}>
                            <a href="http://www.idsurvey.co.id" style={{ color: '#0284c7', textDecoration: 'underline' }}>
                              www.idsurvey.co.id
                            </a>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Tutup
            </button>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={16} />
              Cetak / Save PDF
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
