import React, { useRef } from 'react';
import { X, Printer, Anchor } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';
import { DanantaraLogo } from './DanantaraLogo';
import { IDSurveyLogo } from './IDSurveyLogo';
import { BKILogo } from './BKILogo';

export const LampiranParafPrintModal = ({ isOpen, onClose, suratTugas }) => {
  const printRef = useRef(null);
  const { adminSettings } = useData();
  const { usersList } = useAuth();

  if (!isOpen || !suratTugas) return null;

  const handlePrint = () => {
    const originalTitle = document.title;
    const dateObj = new Date(suratTugas.tglMulai);
    const dateStr = !isNaN(dateObj) ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}` : 'Tanggal';
    const surveyor = suratTugas.petugas || 'Surveyor';
    document.title = `${dateStr} - ${surveyor} - Lampiran Paraf`;
    
    window.print();
    
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  const tglSurveyFormatted = formatDateIndo(suratTugas.tglMulai);
  const lokasiSurvey = (suratTugas.tempatSurvey || suratTugas.lokasi || 'DESAKA').toUpperCase();
  const jenisSurvey = (suratTugas.jenisSurvey || suratTugas.perihal || 'DOKING, LOADLINE').toUpperCase();
  const pemohon = suratTugas.pemohon || 'PT. MITRA SAMUDRA NUSANTARA';
  const namaKapal = suratTugas.namaKapal || 'BAHARI 279';
  const noOrder = suratTugas.noOrder || 'RFQ2608005';
  const noAgenda = suratTugas.agenda || suratTugas.noAgenda || '-';
  const catatan = suratTugas.catatan || '-';
  const surveyorName = suratTugas.petugas || 'ALFIAN BONE PUTRA';
  const surveyorPhone = usersList?.find(u => u.name === suratTugas.petugas)?.phone || '';
  const kepalaCabang = adminSettings?.kepalaCabang || suratTugas.kepalaCabang || 'MUHSON NURROCHMAT';
  const nup = adminSettings?.nup || suratTugas.nup || '48199-KI';

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
                Preview & Cetak Lampiran Paraf
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
            {/* Document Body (Lampiran Paraf) */}
            <div
                className="printable-sheet"
                style={{
                  border: 'none',
                  padding: '1.5rem',
                  borderRadius: '4px',
                  fontFamily: "'Arial', 'Segoe UI', sans-serif",
                  lineHeight: '1.45',
                  fontSize: '11pt',
                  background: '#ffffff',
                  color: '#000000',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '1.5rem', textTransform: 'uppercase' }}>
                  <div>LAPIRAN PERMOHONAN PARAF PADA SURAT PENUGASAN</div>
                  <div>CABANG MADYA KLAS PONTIANAK</div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '11pt' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid black', padding: '0.5rem', textAlign: 'left', width: '5%' }}>NO.</th>
                      <th style={{ border: '1px solid black', padding: '0.5rem', textAlign: 'left', width: '20%' }}>NAMA KAPAL</th>
                      <th style={{ border: '1px solid black', padding: '0.5rem', textAlign: 'left', width: '20%' }}>SURVEYOR</th>
                      <th style={{ border: '1px solid black', padding: '0.5rem', textAlign: 'left', width: '12%' }}>NO HP</th>
                      <th style={{ border: '1px solid black', padding: '0.5rem', textAlign: 'left', width: '13%' }}>JENIS SURVEY</th>
                      <th style={{ border: '1px solid black', padding: '0.5rem', textAlign: 'left', width: '10%' }}>TGL.SURVEY</th>
                      <th style={{ border: '1px solid black', padding: '0.5rem', textAlign: 'left', width: '10%' }}>LOKASI SURVEY</th>
                      <th style={{ border: '1px solid black', padding: '0.5rem', textAlign: 'left', width: '10%' }}>RFQ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid black', padding: '0.5rem', minHeight: '2rem' }}>1</td>
                      <td style={{ border: '1px solid black', padding: '0.5rem' }}>{namaKapal}</td>
                      <td style={{ border: '1px solid black', padding: '0.5rem' }}>{surveyorName}</td>
                      <td style={{ border: '1px solid black', padding: '0.5rem' }}>{surveyorPhone}</td>
                      <td style={{ border: '1px solid black', padding: '0.5rem' }}>{jenisSurvey}</td>
                      <td style={{ border: '1px solid black', padding: '0.5rem' }}>{tglSurveyFormatted}</td>
                      <td style={{ border: '1px solid black', padding: '0.5rem' }}>{lokasiSurvey}</td>
                      <td style={{ border: '1px solid black', padding: '0.5rem' }}>{noOrder}</td>
                    </tr>
                    {/* Empty rows */}
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(num => (
                      <tr key={num}>
                        <td style={{ border: '1px solid black', padding: '0.5rem' }}>&nbsp;</td>
                        <td style={{ border: '1px solid black', padding: '0.5rem' }}></td>
                        <td style={{ border: '1px solid black', padding: '0.5rem' }}></td>
                        <td style={{ border: '1px solid black', padding: '0.5rem' }}></td>
                        <td style={{ border: '1px solid black', padding: '0.5rem' }}></td>
                        <td style={{ border: '1px solid black', padding: '0.5rem' }}></td>
                        <td style={{ border: '1px solid black', padding: '0.5rem' }}></td>
                        <td style={{ border: '1px solid black', padding: '0.5rem' }}></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
          <style>{`
            @media print {
              @page { size: A4 landscape !important; margin: 15mm; }
              .page-break { page-break-before: always; }
            }
          `}</style>

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
