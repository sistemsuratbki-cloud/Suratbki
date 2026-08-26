import React from 'react';
import { X, Printer, Anchor, FileSpreadsheet } from 'lucide-react';
import { formatDateIndo, formatRupiah, extractAgendaNumber } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';
import { DanantaraLogo } from './DanantaraLogo';
import { IDSurveyLogo } from './IDSurveyLogo';
import { BKILogo } from './BKILogo';

export const LaporanPrintModal = ({
  isOpen,
  onClose,
  laporan = null,
  isPrintAll = false,
  allData = [],
  currentPeriod = 'BULAN MEI 2026',
  totalNilai = 0,
  suratTugas = []
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    const originalTitle = document.title;
    
    if (isPrintAll) {
      document.title = `Rekapan Laporan Survei - ${currentPeriod}`;
    } else if (laporan) {
      // Get date from surat tugas if available
      const st = (suratTugas || []).find(s => s.id === laporan.suratId || s.id === laporan.suratTugasId);
      const dateVal = laporan.tglMulai || laporan.tglLapor || laporan.tanggal || laporan.tglSelesai || st?.tglMulai || laporan.tanggalBuat || laporan.createdAt || '';
      const dateObj = new Date(dateVal);
      const dateStr = !isNaN(dateObj.getTime()) ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}` : 'Tanggal';
      const surveyor = laporan.petugas || 'Surveyor';
      document.title = `${dateStr} - ${surveyor} - Laporan Survei`;
    }

    window.print();
    
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  return (
    <ModalPortal>
      <div className="modal-overlay print-only-modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          style={{
            maxWidth: isPrintAll ? '1200px' : '780px',
            background: '#ffffff',
            color: '#0f172a',
            width: isPrintAll ? '98vw' : '100%'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Anchor size={20} color="#003366" />
              <h3 className="modal-title" style={{ color: '#0f172a' }}>
                {isPrintAll ? `Cetak Rekap (Landscape): ${currentPeriod}` : 'Preview Lembar Perjalanan Dinas'}
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={onClose} title="Tutup">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Printable Sheet */}
          <div className="modal-body" style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
            {isPrintAll ? (
              /* ====== CETAK REKAPITULASI TABEL BULANAN (LANDSCAPE MULTI-PAGE) ====== */
              <div
                className="printable-sheet"
                style={{
                  padding: '0.5rem',
                  fontFamily: "'Arial', sans-serif",
                  fontSize: '8.5pt',
                  color: '#000000',
                  background: '#ffffff',
                  width: '100%'
                }}
              >
                {/* Judul Dokumen */}
                <div style={{ textAlign: 'center', marginBottom: '1.25rem', lineHeight: '1.35' }}>
                  <div style={{ fontSize: '13pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#003366' }}>
                    DAFTAR PERJALANAN DINAS SURVEY
                  </div>
                  <div style={{ fontSize: '11.5pt', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.15rem' }}>
                    CABANG MADYA KLAS PONTIANAK
                  </div>
                  <div style={{ fontSize: '10.5pt', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.25rem', color: '#334155' }}>
                    {currentPeriod}
                  </div>
                </div>

                {/* 10 Kolom Tabel Landscape Sesuai Format Resmi */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1.5px solid #000000',
                    fontSize: '8.5pt',
                    lineHeight: '1.35',
                    pageBreakInside: 'auto'
                  }}
                >
                  <thead>
                    <tr style={{ background: '#f2f2f2', textAlign: 'center', fontWeight: 800 }}>
                      <th style={{ border: '1px solid #000000', padding: '6px 3px', width: '4%' }}>NO.</th>
                      <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '9%' }}>TANGGAL</th>
                      <th style={{ border: '1px solid #000000', padding: '6px 6px', width: '18%' }}>NAMA KAPAL</th>
                      <th style={{ border: '1px solid #000000', padding: '6px 6px', width: '13%' }}>LOKASI SURVEY</th>
                      <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '11%' }}>NILAI</th>
                      <th style={{ border: '1px solid #000000', padding: '6px 6px', width: '15%' }}>NAMA SURVEYOR</th>
                      <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '10%' }}>NO AGENDA</th>
                      <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '6%' }}>NO CDA</th>
                      <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '7%' }}>NO.SO</th>
                      <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '7%' }}>NO.WBS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allData.length === 0 ? (
                      <tr>
                        <td colSpan="10" style={{ border: '1px solid #000000', padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                          Tidak ada data pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      allData.map((item, index) => {
                        const linkedSurat = (suratTugas || []).find((s) => s.id === item.suratId || s.id === item.suratTugasId || (Array.isArray(item.linkedSpsIds) && item.linkedSpsIds.includes(s.id)));
                        const rawDate =
                          item.tglMulai ||
                          item.tglSurvey ||
                          item.originalItem?.tglMulai ||
                          item.originalItem?.tglSurvey ||
                          linkedSurat?.tglMulai ||
                          linkedSurat?.tgl_mulai ||
                          item.tanggalMulai ||
                          item.tgl_mulai ||
                          item.tglLapor ||
                          item.tanggal ||
                          item.tglSelesai ||
                          item.originalItem?.tglLapor ||
                          item.originalItem?.tanggal ||
                          linkedSurat?.tanggal ||
                          linkedSurat?.tglLapor ||
                          item.createdAt ||
                          '';
                        const dateFormatted = rawDate ? formatDateIndo(rawDate) : '-';
                        const vesselName = (item.namaKapal || (linkedSurat ? linkedSurat.namaKapal : '-')).toUpperCase();
                        const lokasi = item.lokasi || item.lokasiSurvey || item.tempatSurvey || (linkedSurat ? linkedSurat.lokasi : '-');
                        const nilaiNum = Number(item.nilai) || Number(item.jumlahEstimasi) || (linkedSurat ? Number(linkedSurat.jumlahEstimasi) : 0) || Number(item.tarifDasar) || 0;
                        const namaSurveyor = item.petugas || (linkedSurat ? linkedSurat.petugas : '-');
                        const noAgendaRaw = item.noAgenda || (linkedSurat ? linkedSurat.nomor : '-');
                        const noAgenda = extractAgendaNumber(noAgendaRaw);
                        const noCda = (!item.noCda || item.noCda === '-' || item.noCda.startsWith('CDA-')) ? '5100010' : item.noCda;
                        const noSo = item.noSo || (linkedSurat ? linkedSurat.noSo : '-');
                        const noWbs = item.noWbs || '-';

                        return (
                          <tr key={item.id || index} style={{ pageBreakInside: 'avoid' }}>
                            <td style={{ border: '1px solid #000000', padding: '5px 3px', textAlign: 'center', fontWeight: 600 }}>{index + 1}</td>
                            <td style={{ border: '1px solid #000000', padding: '5px 4px', textAlign: 'center', whiteSpace: 'nowrap', fontSize: '8pt' }}>{dateFormatted}</td>
                            <td style={{ border: '1px solid #000000', padding: '5px 6px', fontWeight: 700, textTransform: 'uppercase' }}>{vesselName}</td>
                            <td style={{ border: '1px solid #000000', padding: '5px 6px' }}>{lokasi}</td>
                            <td style={{ border: '1px solid #000000', padding: '5px 4px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatRupiah(nilaiNum)}</td>
                            <td style={{ border: '1px solid #000000', padding: '5px 6px', textTransform: 'uppercase' }}>{namaSurveyor}</td>
                            <td style={{ border: '1px solid #000000', padding: '5px 4px', fontSize: '8pt' }}>{noAgenda}</td>
                            <td style={{ border: '1px solid #000000', padding: '5px 4px', fontSize: '8pt', textAlign: 'center' }}>{noCda}</td>
                            <td style={{ border: '1px solid #000000', padding: '5px 4px', fontSize: '8pt', fontWeight: 600 }}>{noSo}</td>
                            <td style={{ border: '1px solid #000000', padding: '5px 4px', fontSize: '8pt' }}>{noWbs}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    {/* Baris Total */}
                    <tr style={{ fontWeight: 800, background: '#f8fafc', pageBreakInside: 'avoid' }}>
                      <td colSpan="4" style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'right' }}>TOTAL BIAYA:</td>
                      <td style={{ border: '1px solid #000000', padding: '6px 4px', textAlign: 'right', whiteSpace: 'nowrap', color: '#059669', fontSize: '9pt' }}>{formatRupiah(totalNilai)}</td>
                      <td colSpan="5" style={{ border: '1px solid #000000', padding: '6px 8px' }}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              /* ====== CETAK LEMBAR SINGLE ITEM ====== */
              laporan && (
                <div
                  className="printable-sheet"
                  style={{
                    border: '2px solid #003366',
                    padding: '1.35rem 1.65rem',
                    borderRadius: '6px',
                    fontFamily: "'Times New Roman', 'Georgia', serif",
                    lineHeight: '1.5',
                    fontSize: '0.85rem',
                    background: '#ffffff',
                    color: '#0f172a'
                  }}
                >
                  {/* Kop Surat */}
                  <div style={{ marginBottom: '0.85rem', borderBottom: '3px double #003366', paddingBottom: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <DanantaraLogo height={40} style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', color: '#475569' }}>
                          BADAN PENGELOLA INVESTASI DAYA ANAGATA NUSANTARA
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', color: '#003366' }}>
                          PT BIRO KLASIFIKASI INDONESIA (PERSERO)
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                          CABANG MADYA KELAS PONTIANAK — KALIMANTAN BARAT
                        </div>
                      </div>
                      <BKILogo height={40} style={{ flexShrink: 0 }} />
                    </div>
                  </div>

                  {/* Judul Dokumen */}
                  <div style={{ textAlign: 'center', margin: '0.85rem 0 1rem' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', color: '#003366', textDecoration: 'underline' }}>
                      LEMBAR PERJALANAN DINAS SURVEY
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginTop: '0.2rem' }}>
                      No Agenda: {laporan.noAgenda || laporan.nomor || '-'}
                    </div>
                  </div>

                  {/* Rincian 10 Field */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', lineHeight: '1.6' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '180px', fontWeight: 700 }}>NAMA KAPAL</td>
                        <td style={{ width: '15px' }}>:</td>
                        <td style={{ fontWeight: 800, textTransform: 'uppercase', color: '#003366' }}>{laporan.namaKapal}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700 }}>TANGGAL</td>
                        <td>:</td>
                        <td>{formatDateIndo(laporan.tglLapor || laporan.tanggal || laporan.tglMulai || laporan.tglSelesai || laporan.tgl_mulai || laporan.tgl_selesai || laporan.tanggalMulai || laporan.createdAt || laporan.created_at)}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700 }}>LOKASI SURVEY</td>
                        <td>:</td>
                        <td style={{ textTransform: 'uppercase' }}>{laporan.lokasi || laporan.lokasiSurvey}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700 }}>NILAI BIAYA/HONOR</td>
                        <td>:</td>
                        <td style={{ fontWeight: 800, color: '#003366' }}>{formatRupiah(laporan.nilai || laporan.tarifDasar)}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700 }}>NAMA SURVEYOR</td>
                        <td>:</td>
                        <td style={{ textTransform: 'uppercase' }}>{laporan.petugas || laporan.namaSurveyor || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700 }}>NO AGENDA</td>
                        <td>:</td>
                        <td>{extractAgendaNumber(laporan.noAgenda || laporan.nomor || '-')}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700 }}>NO CDA</td>
                        <td>:</td>
                        <td>{(!laporan.noCda || laporan.noCda === '-' || laporan.noCda.startsWith('CDA-')) ? '5100010' : laporan.noCda}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700 }}>NO.SO</td>
                        <td>:</td>
                        <td style={{ fontWeight: 700 }}>{laporan.noSo || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700 }}>NO.WBS</td>
                        <td>:</td>
                        <td>{laporan.noWbs || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700 }}>MARINE SURVEYOR</td>
                        <td>:</td>
                        <td style={{ fontWeight: 800 }}>{laporan.petugas}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>

          <style>{`
            @media print {
              @page { 
                size: ${isPrintAll ? 'A4 landscape' : 'A4 portrait'} !important; 
                margin: ${isPrintAll ? '8mm 8mm' : '15mm 20mm'} !important; 
              }
              body { background: #ffffff !important; color: #000000 !important; }
              .modal-overlay { position: static !important; background: transparent !important; padding: 0 !important; }
              .modal-content { max-width: 100% !important; width: 100% !important; border: none !important; box-shadow: none !important; }
              .modal-header, .modal-footer { display: none !important; }
              .modal-body { padding: 0 !important; overflow: visible !important; height: auto !important; max-height: none !important; }
              .printable-sheet { padding: 0 !important; width: 100% !important; border: none !important; }
              table { width: 100% !important; border-collapse: collapse !important; page-break-inside: auto !important; }
              tr { page-break-inside: avoid !important; page-break-after: auto !important; }
              thead { display: table-header-group !important; }
              tfoot { display: table-footer-group !important; }
              th, td { border: 1px solid #000000 !important; }
            }
          `}</style>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.75rem 1.5rem' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Tutup
            </button>
            <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Printer size={16} />
              <span>Cetak / Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
