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

  const tglSurveyFormatted = formatDateIndo(suratTugas.tglMulai);
  const lokasiSurvey = suratTugas.tempatSurvey || suratTugas.lokasi || 'DESAKA';
  const jenisSurvey = suratTugas.jenisSurvey || suratTugas.perihal || 'DOKING, LOADLINE';
  const pemohon = suratTugas.pemohon || 'PT. MITRA SAMUDRA NUSANTARA';
  const namaKapal = suratTugas.namaKapal || 'BAHARI 279';
  const noOrder = suratTugas.noOrder || 'RFQ2608005';
  const noAgenda = suratTugas.noAgenda || suratTugas.nomor || `A 0    /SV.${Math.floor(Math.random() * 900) + 100}/PK/KI-26`;
  const catatan = suratTugas.catatan || '-';
  const surveyorName = suratTugas.petugas || 'ALFIAN BONE PUTRA';
  const kepalaCabang = suratTugas.kepalaCabang || 'MUHSON NURROCHMAT';

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
              <Anchor size={20} color="#003366" />
              <h3 className="modal-title" style={{ color: '#0f172a' }}>
                Preview & Cetak Surat Penunjukan Survey (SPS)
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary btn-sm" onClick={handlePrint}>
                <Printer size={15} />
                Cetak / Download PDF (SPS)
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
                border: '1.5px solid #cbd5e1',
                padding: '2.25rem 2.5rem',
                borderRadius: '4px',
                fontFamily: "'Arial', 'Segoe UI', sans-serif",
                lineHeight: '1.45',
                fontSize: '10pt',
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
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
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
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', fontSize: '10pt', fontWeight: 700 }}>
                  <span style={{ width: '220px' }}>NAMA SURVEYOR</span>
                  <span style={{ width: '20px' }}>:</span>
                  <span style={{ textTransform: 'uppercase' }}>{surveyorName}</span>
                </div>
                <div style={{ marginTop: '1rem', fontWeight: 700, textTransform: 'uppercase', fontSize: '10pt' }}>
                  UNTUK MELAKSANAKAN SURVEY
                </div>
              </div>

              {/* ====== TABEL RINCIAN OBJEK PENUGASAN ====== */}
              <div style={{ paddingLeft: '1.5rem', marginBottom: '3rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', lineHeight: '1.8' }}>
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2.5rem', fontSize: '10pt', lineHeight: '1.5' }}>
                <div style={{ width: '280px', textAlign: 'left' }}>
                  <div style={{ marginBottom: '4.5rem' }}>
                    Pontianak, {tglSurveyFormatted}
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

          {/* Modal Footer */}
          <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Tutup
            </button>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={16} />
              Cetak / Save PDF (SPS)
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
