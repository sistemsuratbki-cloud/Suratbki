import React from 'react';
import { X, Printer, FileCheck } from 'lucide-react';
import { formatDateIndo } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { ModalPortal } from './ModalPortal';

export const LampiranParafPrintModal = ({
  isOpen,
  onClose,
  suratTugas = null,
  allData = [],
  currentPeriod = ''
}) => {
  const { usersList } = useAuth();

  if (!isOpen) return null;

  // Determine items list: if single suratTugas passed, wrap in array; otherwise use allData
  const itemsList = suratTugas ? [suratTugas] : (Array.isArray(allData) && allData.length > 0 ? allData : []);

  const handlePrint = () => {
    const originalTitle = document.title;
    const periodLabel = currentPeriod || (suratTugas ? formatDateIndo(suratTugas.tglMulai) : 'Rekapitulasi');
    document.title = `Lampiran_Paraf_BKI_${periodLabel.replace(/[\s,/-]+/g, '_')}`;

    window.print();

    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  // Exactly 2 empty rows below data
  const emptyRowsCount = 2;
  const totalRowsCount = itemsList.length + emptyRowsCount;

  return (
    <ModalPortal>
      <div className="modal-overlay print-only-modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          style={{ maxWidth: '1050px', width: '95vw', background: '#ffffff', color: '#000000' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header Toolbar */}
          <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileCheck size={20} color="#003366" />
              <div>
                <h3 className="modal-title" style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 800 }}>
                  Preview & Cetak Akumulasi Lampiran Paraf
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {currentPeriod ? `Periode: ${currentPeriod} (${itemsList.length} Kapal Terdaftar)` : `Total: ${itemsList.length} Kapal`}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                padding: '1rem 1rem 3rem 1rem',
                borderRadius: '4px',
                fontFamily: "'Arial', 'Segoe UI', sans-serif",
                lineHeight: '1.35',
                fontSize: '10pt',
                background: '#ffffff',
                color: '#000000',
                boxSizing: 'border-box',
                width: '100%',
                maxWidth: '100%'
              }}
            >
              {/* Document Title Header */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem', textTransform: 'uppercase' }}>
                <div style={{ fontSize: '12pt', fontWeight: 'bold', letterSpacing: '0.03em' }}>
                  LAMPIRAN PERMOHONAN PARAF PADA SURAT PENUGASAN
                </div>
                <div style={{ fontSize: '11pt', fontWeight: 'bold' }}>
                  CABANG MADYA KLAS PONTIANAK
                </div>
                {currentPeriod && (
                  <div style={{ fontSize: '9.5pt', fontWeight: 600, color: '#334155', marginTop: '0.25rem' }}>
                    {currentPeriod}
                  </div>
                )}
              </div>

              {/* Accumulated Data Table */}
              <div style={{ width: '100%', boxSizing: 'border-box', padding: '0 2px' }}>
                <table
                  style={{
                    width: '100%',
                    tableLayout: 'fixed',
                    borderCollapse: 'collapse',
                    border: '1.5px solid #000000',
                    fontSize: '9.5pt',
                    boxSizing: 'border-box'
                  }}
                >
                  <thead>
                    <tr style={{ background: '#f1f5f9', textAlign: 'center', fontWeight: 'bold' }}>
                      <th style={{ border: '1px solid #000000', padding: '0.5rem 0.2rem', width: '4.5%', boxSizing: 'border-box' }}>NO.</th>
                      <th style={{ border: '1px solid #000000', padding: '0.5rem', width: '20%', textAlign: 'left', boxSizing: 'border-box' }}>NAMA KAPAL</th>
                      <th style={{ border: '1px solid #000000', padding: '0.5rem', width: '17.5%', textAlign: 'left', boxSizing: 'border-box' }}>SURVEYOR</th>
                      <th style={{ border: '1px solid #000000', padding: '0.5rem 0.3rem', width: '12%', textAlign: 'center', boxSizing: 'border-box' }}>NO HP</th>
                      <th style={{ border: '1px solid #000000', padding: '0.5rem', width: '16%', textAlign: 'left', boxSizing: 'border-box' }}>JENIS SURVEY</th>
                      <th style={{ border: '1px solid #000000', padding: '0.5rem 0.3rem', width: '11%', textAlign: 'center', boxSizing: 'border-box' }}>TGL. SURVEY</th>
                      <th style={{ border: '1px solid #000000', padding: '0.5rem', width: '10%', textAlign: 'left', boxSizing: 'border-box' }}>LOKASI</th>
                      <th style={{ border: '1px solid #000000', borderRight: '1.5px solid #000000', padding: '0.5rem 0.3rem', width: '9%', textAlign: 'center', boxSizing: 'border-box' }}>RFQ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsList.map((item, idx) => {
                      const surveyorPhone = usersList?.find((u) => u.name === item.petugas)?.phone || item.noHp || '-';
                      const tglFormatted = formatDateIndo(item.tglMulai || item.tglSelesai);
                      const lokasi = (item.tempatSurvey || item.lokasi || item.tujuan || 'PONTIANAK').toUpperCase();
                      const jenis = (item.jenisSurvey || item.perihal || '-').toUpperCase();
                      const rfq = item.noOrder || item.agenda || '-';
                      const isLast = (idx === itemsList.length - 1) && emptyRowsCount === 0;

                      return (
                        <tr key={item.id || idx} style={{ height: '28px' }}>
                          <td style={{ border: '1px solid #000000', borderBottom: isLast ? '1.5px solid #000000' : '1px solid #000000', padding: '0.4rem 0.2rem', textAlign: 'center', fontWeight: 600, boxSizing: 'border-box' }}>
                            {idx + 1}
                          </td>
                          <td style={{ border: '1px solid #000000', borderBottom: isLast ? '1.5px solid #000000' : '1px solid #000000', padding: '0.4rem 0.5rem', fontWeight: 'bold', textTransform: 'uppercase', boxSizing: 'border-box', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.namaKapal || '-'}
                          </td>
                          <td style={{ border: '1px solid #000000', borderBottom: isLast ? '1.5px solid #000000' : '1px solid #000000', padding: '0.4rem 0.5rem', boxSizing: 'border-box', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.petugas || '-'}
                          </td>
                          <td style={{ border: '1px solid #000000', borderBottom: isLast ? '1.5px solid #000000' : '1px solid #000000', padding: '0.4rem 0.3rem', textAlign: 'center', fontSize: '9pt', boxSizing: 'border-box', whiteSpace: 'nowrap' }}>
                            {surveyorPhone}
                          </td>
                          <td style={{ border: '1px solid #000000', borderBottom: isLast ? '1.5px solid #000000' : '1px solid #000000', padding: '0.4rem 0.5rem', fontSize: '9pt', boxSizing: 'border-box' }}>
                            {jenis}
                          </td>
                          <td style={{ border: '1px solid #000000', borderBottom: isLast ? '1.5px solid #000000' : '1px solid #000000', padding: '0.4rem 0.3rem', textAlign: 'center', whiteSpace: 'nowrap', fontSize: '9pt', boxSizing: 'border-box' }}>
                            {tglFormatted}
                          </td>
                          <td style={{ border: '1px solid #000000', borderBottom: isLast ? '1.5px solid #000000' : '1px solid #000000', padding: '0.4rem 0.5rem', fontSize: '9pt', boxSizing: 'border-box' }}>
                            {lokasi}
                          </td>
                          <td style={{ border: '1px solid #000000', borderRight: '1.5px solid #000000', borderBottom: isLast ? '1.5px solid #000000' : '1px solid #000000', padding: '0.4rem 0.3rem', textAlign: 'center', fontWeight: 600, fontSize: '9pt', boxSizing: 'border-box' }}>
                            {rfq}
                          </td>
                        </tr>
                      );
                    })}

                    {/* 2 Empty rows per user request with robust borders & fixed right/bottom borders */}
                    {Array.from({ length: emptyRowsCount }).map((_, emptyIdx) => {
                      const rowNum = itemsList.length + emptyIdx + 1;
                      const isLastRow = emptyIdx === emptyRowsCount - 1;

                      return (
                        <tr key={`empty-${emptyIdx}`} style={{ height: '28px' }}>
                          <td style={{ border: '1px solid #000000', borderBottom: isLastRow ? '1.5px solid #000000' : '1px solid #000000', padding: '0.4rem 0.2rem', textAlign: 'center', color: '#94a3b8', boxSizing: 'border-box' }}>
                            {rowNum}
                          </td>
                          <td style={{ border: '1px solid #000000', borderBottom: isLastRow ? '1.5px solid #000000' : '1px solid #000000', padding: '0.4rem 0.5rem', boxSizing: 'border-box' }}>&nbsp;</td>
                          <td style={{ border: '1px solid #000000', borderBottom: isLastRow ? '1.5px solid #000000' : '1px solid #000000', padding: '0.4rem 0.5rem', boxSizing: 'border-box' }}>&nbsp;</td>
                          <td style={{ border: '1px solid #000000', borderBottom: isLastRow ? '1.5px solid #000000' : '1px solid #000000', padding: '0.4rem 0.3rem', boxSizing: 'border-box' }}>&nbsp;</td>
                          <td style={{ border: '1px solid #000000', borderBottom: isLastRow ? '1.5px solid #000000' : '1px solid #000000', padding: '0.4rem 0.5rem', boxSizing: 'border-box' }}>&nbsp;</td>
                          <td style={{ border: '1px solid #000000', borderBottom: isLastRow ? '1.5px solid #000000' : '1px solid #000000', padding: '0.4rem 0.3rem', boxSizing: 'border-box' }}>&nbsp;</td>
                          <td style={{ border: '1px solid #000000', borderBottom: isLastRow ? '1.5px solid #000000' : '1px solid #000000', padding: '0.4rem 0.5rem', boxSizing: 'border-box' }}>&nbsp;</td>
                          <td style={{ border: '1px solid #000000', borderRight: '1.5px solid #000000', borderBottom: isLastRow ? '1.5px solid #000000' : '1px solid #000000', padding: '0.4rem 0.3rem', boxSizing: 'border-box' }}>&nbsp;</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <style>{`
            @media print {
              @page { size: A4 landscape !important; margin: 12mm 15mm !important; }
              body { background: #ffffff !important; color: #000000 !important; margin: 0 !important; padding: 0 !important; }
              .modal-overlay { position: static !important; background: transparent !important; padding: 0 !important; display: block !important; }
              .modal-content { max-width: 100% !important; width: 100% !important; border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; }
              .modal-header, .modal-footer { display: none !important; }
              .modal-body { padding: 0 !important; margin: 0 !important; overflow: visible !important; }
              .printable-sheet { padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }
              table { width: 100% !important; max-width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; border: 1.5px solid #000000 !important; box-sizing: border-box !important; }
              th, td { border: 1px solid #000000 !important; box-sizing: border-box !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
          `}</style>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Tutup
            </button>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={16} />
              <span>Cetak PDF</span>
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
