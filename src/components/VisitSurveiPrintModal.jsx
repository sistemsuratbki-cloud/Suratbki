import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, Maximize2, Minimize2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';
import { DanantaraLogo } from './DanantaraLogo';
import { IDSurveyLogo } from './IDSurveyLogo';
import { BKILogo } from './BKILogo';
import { calculateEndTime, autoDetectStatus } from './VisitSurveiModal';

export const VisitSurveiPrintModal = ({
  isOpen,
  onClose,
  data = [],
  title = 'BUKU AGENDA AKTIVITAS SURVEI'
}) => {
  const { adminSettings } = useData();
  const { usersList } = useAuth();

  const [isFitToScreen, setIsFitToScreen] = useState(true);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const isMobileScreen = windowWidth <= 768;
  const targetDocWidth = 980;
  const availableWidth = isMobileScreen ? (windowWidth - 20) : Math.min(windowWidth * 0.94, 1150) - 30;
  const fitScale = isFitToScreen ? Math.min(Math.max(availableWidth / targetDocWidth, 0.28), 1) : 1;

  const kepalaCabangName = (adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT').toUpperCase();
  const kepalaCabangNup = adminSettings?.nup || '48199-KI';

  const todayFormatted = formatDateIndo(new Date().toISOString().split('T')[0]);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Buku_Agenda_Aktivitas_Survei_BKI_${new Date().toISOString().split('T')[0]}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  return (
    <ModalPortal>
      <div className="print-only-modal-overlay modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '1100px', width: '96vw', height: '92vh', display: 'flex', flexDirection: 'column' }}
        >
          {/* Header Controls (No Print) */}
          <div className="modal-header no-print" style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '0.4rem', borderRadius: '6px' }}>
                <FileText size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Cetak Buku Agenda Aktivitas Survei
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Ukuran: A4 Landscape • Total {data.length} aktivitas tercatat
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsFitToScreen(!isFitToScreen)}
                title={isFitToScreen ? 'Tampilkan Ukuran Asli 100%' : 'Sesuaikan dengan Lebar Layar'}
              >
                {isFitToScreen ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                <span>{isFitToScreen ? 'Ukuran Penuh' : 'Pas Layar'}</span>
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handlePrint}
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  borderColor: '#0284c7',
                  color: '#ffffff',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Printer size={15} />
                <span>Cetak / Download PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-icon btn-sm"
                onClick={onClose}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Printable Preview Area */}
          <div
            className="modal-body"
            style={{
              flex: 1,
              overflow: 'auto',
              background: '#525659',
              padding: isMobileScreen ? '0.75rem' : '1.5rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start'
            }}
          >
            <div
              className="printable-sheet printable-agenda-survei"
              style={{
                width: `${targetDocWidth}px`,
                minHeight: '620px',
                background: '#ffffff',
                color: '#000000',
                padding: '2.5rem 3rem',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
                fontFamily: '"Calibri", "Segoe UI", Arial, sans-serif',
                boxSizing: 'border-box',
                transform: `scale(${fitScale})`,
                transformOrigin: 'top center',
                marginBottom: isFitToScreen && fitScale < 1 ? `-${(1 - fitScale) * 620}px` : '0'
              }}
            >
              {/* Top Header Logos */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  paddingBottom: '0.5rem'
                }}
              >
                <DanantaraLogo height={38} />
                <IDSurveyLogo height={42} />
                <BKILogo height={38} />
              </div>

              {/* Title Header */}
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '13pt',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    color: '#0f172a',
                    letterSpacing: '0.04em'
                  }}
                >
                  {title}
                </h2>
                <div
                  style={{
                    fontSize: '9.5pt',
                    fontWeight: 700,
                    color: '#334155',
                    marginTop: '2px',
                    textTransform: 'uppercase'
                  }}
                >
                  PT. BIRO KLASIFIKASI INDONESIA (PERSERO) CABANG MADYA KLAS PONTIANAK
                </div>
              </div>

              {/* Table of Visit Survey Activities */}
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1.5px solid #000000',
                  fontSize: '8.5pt',
                  marginBottom: '1.5rem'
                }}
              >
                <thead>
                  <tr style={{ background: '#f1f5f9', fontWeight: 800, textAlign: 'center', height: '30px' }}>
                    <th style={{ border: '1px solid #000000', padding: '5px 4px', width: '32px' }}>NO</th>
                    <th style={{ border: '1px solid #000000', padding: '5px 8px', width: '140px' }}>SURVEYOR BERTUGAS</th>
                    <th style={{ border: '1px solid #000000', padding: '5px 8px', width: '180px' }}>NAMA KAPAL</th>
                    <th style={{ border: '1px solid #000000', padding: '5px 8px', width: '130px' }}>LOKASI SURVEI</th>
                    <th style={{ border: '1px solid #000000', padding: '5px 6px', width: '100px' }}>TANGGAL</th>
                    <th style={{ border: '1px solid #000000', padding: '5px 6px', width: '110px' }}>WAKTU VISIT</th>
                    <th style={{ border: '1px solid #000000', padding: '5px 8px' }}>KETERANGAN</th>
                    <th style={{ border: '1px solid #000000', padding: '5px 6px', width: '75px' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length > 0 ? (
                    data.map((item, idx) => {
                      const end = item.jamSelesai || calculateEndTime(item.jamBerangkat, item.durasi || 3);
                      const statusReal = item.status === 'Selesai' ? 'Selesai' : autoDetectStatus(item.tanggal, item.jamBerangkat, end);
                      const tglDisplay = item.tanggal ? formatDateIndo(item.tanggal) : '-';

                      return (
                        <tr key={item.id || idx} style={{ height: '28px', verticalAlign: 'middle' }}>
                          <td style={{ border: '1px solid #000000', padding: '4px', textAlign: 'center', fontWeight: 700 }}>
                            {idx + 1}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '4px 8px', fontWeight: 700 }}>
                            {item.nama || '-'}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '4px 8px', fontWeight: 800 }}>
                            {item.namaKapal || '-'}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '4px 8px', textAlign: 'center' }}>
                            {item.lokasi || '-'}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {tglDisplay}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'center', whiteSpace: 'nowrap', fontWeight: 700 }}>
                            {item.jamBerangkat || '08:00'} - {end || '17:00'} WIB
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '4px 8px' }}>
                            {item.keterangan || 'Visit Lapangan'}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'center', fontWeight: 800 }}>
                            <span style={{ color: statusReal === 'Selesai' ? '#059669' : '#0284c7' }}>
                              {statusReal}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ border: '1px solid #000000', padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
                        Tidak ada data aktivitas visit survei yang tercatat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Footer (No Print) */}
          <div className="modal-footer no-print" style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', background: 'var(--bg-main)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Tutup
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePrint}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                borderColor: '#0284c7',
                color: '#ffffff',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Printer size={15} />
              <span>Cetak / Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Print CSS Specific to Agenda Survei */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape !important;
            margin: 8mm 8mm !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .print-only-modal-overlay {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }
          .modal-content {
            max-width: 100% !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .modal-header, .modal-footer, .no-print {
            display: none !important;
          }
          .modal-body {
            padding: 0 !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            background: transparent !important;
          }
          .printable-agenda-survei {
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            transform: none !important;
            margin: 0 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          thead {
            display: table-header-group !important;
          }
          th, td {
            border: 1px solid black !important;
          }
        }
      `}</style>
    </ModalPortal>
  );
};
