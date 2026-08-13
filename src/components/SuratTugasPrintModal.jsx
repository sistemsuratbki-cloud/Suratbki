import React from 'react';
import { X, Printer, Anchor } from 'lucide-react';
import { formatDateIndo } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';
import { DanantaraLogo } from './DanantaraLogo';
import { IDSurveyLogo } from './IDSurveyLogo';
import { BKILogo } from './BKILogo';

export const SuratTugasPrintModal = ({ isOpen, onClose, suratTugas }) => {
  if (!isOpen || !suratTugas) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedNum = suratTugas.nomor
    ? suratTugas.nomor.startsWith('NO.')
      ? suratTugas.nomor
      : `NO.${suratTugas.nomor}`
    : 'NO.A 0    /SV.201/PK/KI-26';

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          style={{ maxWidth: '760px', background: '#ffffff', color: '#0f172a' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Toolbar */}
          <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Anchor size={20} color="#003366" />
              <h3 className="modal-title" style={{ color: '#0f172a' }}>Preview & Download Surat Tugas</h3>
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
          <div className="modal-body" style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
            <div
              className="printable-sheet"
              style={{
                border: '1px solid #cbd5e1',
                padding: '2rem 2.25rem',
                borderRadius: '4px',
                fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                lineHeight: '1.5',
                fontSize: '0.85rem',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
              }}
            >
              {/* ====== KOP LOGOS ====== */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', paddingBottom: '0.5rem' }}>
                <DanantaraLogo height={38} />
                <IDSurveyLogo height={40} />
                <BKILogo height={38} />
              </div>

              {/* ====== JUDUL SURAT ====== */}
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f172a' }}>
                  SURAT TUGAS
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.2rem', color: '#334155' }}>
                  {formattedNum}
                </div>
              </div>

              {/* ====== PARAGRAF PEMBUKA ====== */}
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>
                DITUGASKAN KEPADA :
              </div>

              {/* ====== TABEL RINCIAN PENUGASAN (1 - 9) ====== */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', lineHeight: '1.65', color: '#0f172a' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '28px', verticalAlign: 'top', paddingBottom: '0.35rem' }}>1.</td>
                    <td style={{ width: '200px', verticalAlign: 'top', paddingBottom: '0.35rem', fontWeight: 600 }}>NAMA</td>
                    <td style={{ width: '15px', verticalAlign: 'top', paddingBottom: '0.35rem' }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem', textTransform: 'uppercase', fontWeight: 700 }}>
                      {suratTugas.petugas}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem' }}>2.</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem', fontWeight: 600 }}>PANGKAT</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem' }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem', textTransform: 'uppercase' }}>
                      {suratTugas.pangkat || 'GRADE 6 A'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem' }}>3.</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem', fontWeight: 600 }}>JABATAN</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem' }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem', textTransform: 'uppercase' }}>
                      {suratTugas.jabatan || 'SURVEYOR'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem' }}></td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem', fontWeight: 600 }}>UNTUK PERGI KE</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem' }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem', textTransform: 'uppercase', fontWeight: 700 }}>
                      {suratTugas.lokasi}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem' }}>5.</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem', fontWeight: 600 }}>KEPERLUAN</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem' }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem', textTransform: 'uppercase', fontWeight: 700 }}>
                      <div>{suratTugas.perihal || 'DINAS SURVEY KLAS'}</div>
                      {suratTugas.namaKapal && <div>{suratTugas.namaKapal}</div>}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem' }}>6.</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem', fontWeight: 600 }}>BERANGKAT</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem' }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem', textTransform: 'uppercase' }}>
                      {formatDateIndo(suratTugas.tglMulai).toUpperCase()}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem' }}>7.</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem', fontWeight: 600 }}>KEMBALI</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem' }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem', textTransform: 'uppercase' }}>
                      {formatDateIndo(suratTugas.tglSelesai).toUpperCase()}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem' }}>8.</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem', fontWeight: 600 }}>SARANA TRANSPORTASI</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem' }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem', textTransform: 'uppercase' }}>
                      {suratTugas.saranaTransportasi || 'UDARA, DARAT DAN AIR'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem' }}>9.</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem', fontWeight: 600 }}>KETERANGAN LAIN</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem' }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingBottom: '0.35rem', textTransform: 'uppercase' }}>
                      {suratTugas.keteranganLain || 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* ====== TANDA TANGAN ====== */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2.5rem', fontSize: '0.82rem', lineHeight: '1.45' }}>
                <div style={{ width: '310px', textAlign: 'left' }}>
                  <div style={{ display: 'flex' }}>
                    <span style={{ width: '130px', fontWeight: 600 }}>DIKELUARKAN</span>
                    <span style={{ width: '15px' }}>:</span>
                    <span style={{ fontWeight: 700 }}>PONTIANAK</span>
                  </div>
                  <div style={{ display: 'flex', marginBottom: '1.25rem' }}>
                    <span style={{ width: '130px', fontWeight: 600 }}>PADA TANGGAL</span>
                    <span style={{ width: '15px' }}>:</span>
                    <span style={{ textTransform: 'uppercase' }}>{formatDateIndo(suratTugas.tglMulai).toUpperCase()}</span>
                  </div>
                  <div style={{ fontWeight: 700, textTransform: 'uppercase', marginBottom: '4rem' }}>
                    KEPALA CABANG MADYA KLAS PONTIANAK
                  </div>
                  <div style={{ display: 'flex' }}>
                    <span style={{ width: '60px', fontWeight: 600 }}>NAMA</span>
                    <span style={{ width: '15px' }}>:</span>
                    <span style={{ fontWeight: 800, textDecoration: 'underline', textTransform: 'uppercase' }}>
                      {suratTugas.kepalaCabang || 'MUHSON NURROCHMAT'}
                    </span>
                  </div>
                  <div style={{ display: 'flex' }}>
                    <span style={{ width: '60px', fontWeight: 600 }}>NUP</span>
                    <span style={{ width: '15px' }}>:</span>
                    <span>{suratTugas.nup || '48199-KI'}</span>
                  </div>
                </div>
              </div>

              {/* ====== FOOTER TEMBUSAN & ALAMAT ====== */}
              <div style={{ marginTop: '2.5rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.72rem', color: '#334155', lineHeight: '1.4' }}>
                {/* Left side */}
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '0.1rem' }}>Tembusan :</div>
                  <div>1. Yth.Kepala Divisi keuangan</div>
                  <div style={{ marginBottom: '0.85rem', color: '#64748b' }}>C:/surat tugas kacab/~srt/2026</div>

                  <div style={{ fontWeight: 800, color: '#0f172a' }}>PT. Biro Klasifikasi Indonesia (Persero)</div>
                  <div style={{ fontWeight: 700 }}>Pontianak Class Middle Branch</div>
                  <div>Jl. Gusti Hamzah No. 211</div>
                  <div>PONTIANAK - 78116</div>
                  <div>INDONESIA</div>
                </div>

                {/* Right side */}
                <div style={{ textAlign: 'left', minWidth: '170px' }}>
                  <div style={{ display: 'flex' }}>
                    <span style={{ width: '60px', fontWeight: 600 }}>Phone</span>
                    <span style={{ width: '15px' }}>:</span>
                    <span>(0561) 739579</span>
                  </div>
                  <div style={{ display: 'flex' }}>
                    <span style={{ width: '60px', fontWeight: 600 }}>Fax</span>
                    <span style={{ width: '15px' }}>:</span>
                    <span>:-</span>
                  </div>
                  <div style={{ display: 'flex', marginBottom: '0.75rem' }}>
                    <span style={{ width: '60px', fontWeight: 600 }}>E-Mail</span>
                    <span style={{ width: '15px' }}>:</span>
                    <span>pk@bki.co.id</span>
                  </div>

                  <div>
                    <a href="https://www.idsurvey.co.id" target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', fontWeight: 700, textDecoration: 'underline' }}>
                      www.idsurvey.co.id
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
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
