import React from 'react';
import { X, Printer, Anchor, FileSpreadsheet } from 'lucide-react';
import { formatDateIndo, formatRupiah } from '../utils/formatters';
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
      const st = suratTugas.find(s => s.id === laporan.suratTugasId);
      const dateObj = new Date(st ? st.tglMulai : laporan.tanggalBuat);
      const dateStr = !isNaN(dateObj) ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}` : 'Tanggal';
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
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          style={{
            maxWidth: isPrintAll ? '1050px' : '780px',
            background: '#ffffff',
            color: '#0f172a',
            width: '100%'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Anchor size={20} color="#003366" />
              <h3 className="modal-title" style={{ color: '#0f172a' }}>
                {isPrintAll ? `Cetak Rekap: ${currentPeriod}` : 'Preview Lembar Perjalanan Dinas'}
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

          {/* Printable Sheet */}
          <div className="modal-body" style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
            {isPrintAll ? (
              /* ====== CETAK REKAPITULASI TABEL BULANAN ====== */
              <div
                className="printable-sheet"
                style={{
                  padding: '1.5rem 1rem',
                  fontFamily: "'Arial', sans-serif",
                  fontSize: '9pt',
                  color: '#000000',
                  background: '#ffffff'
                }}
              >
                {/* Judul Dokumen */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', lineHeight: '1.35' }}>
                  <div style={{ fontSize: '13pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    DAFTAR PERJALANAN DINAS SURVEY
                  </div>
                  <div style={{ fontSize: '12pt', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.15rem' }}>
                    CABANG MADYA KLAS PONTIANAK
                  </div>
                  <div style={{ fontSize: '11pt', fontWeight: 700, textTransform: 'uppercase', marginTop: '0.25rem' }}>
                    {currentPeriod}
                  </div>
                </div>

                {/* 10 Kolom Tabel Sesuai Format Resmi */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1.5px solid #000000',
                    fontSize: '8.5pt',
                    lineHeight: '1.35'
                  }}
                >
                  <thead>
                    <tr style={{ background: '#f2f2f2', textAlign: 'center', fontWeight: 800 }}>
                      <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '35px' }}>NO.</th>
                      <th style={{ border: '1px solid #000000', padding: '6px 6px', width: '80px' }}>TANGGAL</th>
                      <th style={{ border: '1px solid #000000', padding: '6px 8px', width: '150px' }}>NAMA KAPAL</th>
                      <th style={{ border: '1px solid #000000', padding: '6px 8px', width: '120px' }}>LOKASI SURVEY</th>
                      <th style={{ border: '1px solid #000000', padding: '6px 6px', width: '95px' }}>NILAI</th>
                      <th style={{ border: '1px solid #000000', padding: '6px 8px', width: '140px' }}>NAMA SURVEY</th>
                      <th style={{ border: '1px solid #000000', padding: '6px 6px', width: '120px' }}>NO AGENDA</th>
                      <th style={{ border: '1px solid #000000', padding: '6px 6px', width: '90px' }}>NO CDA</th>
                      <th style={{ border: '1px solid #000000', padding: '6px 6px', width: '95px' }}>NO.SO</th>
                      <th style={{ border: '1px solid #000000', padding: '6px 6px', width: '95px' }}>NO.WBS</th>
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
                        const linkedSurat = suratTugas.find((s) => s.id === item.suratId);
                        const dateFormatted = formatDateIndo(item.tglLapor || item.tanggal || linkedSurat?.tglMulai);
                        const vesselName = item.namaKapal || (linkedSurat ? linkedSurat.namaKapal : '-');
                        const lokasi = item.lokasi || item.lokasiSurvey || (linkedSurat ? linkedSurat.lokasi : '-');
                        const nilaiNum = Number(item.nilai) || Number(item.tarifDasar) || (linkedSurat ? linkedSurat.jumlahEstimasi : 0);
                        const namaSurvey = item.namaSurvey || item.jenisSurvey || (linkedSurat ? linkedSurat.jenisSurvey : 'DINAS SURVEY KLAS');
                        const noAgenda = item.noAgenda || (linkedSurat ? linkedSurat.nomor : '-');
                        const noCda = item.noCda || '-';
                        const noSo = item.noSo || (linkedSurat ? linkedSurat.noOrder : '-');
                        const noWbs = item.noWbs || '-';

                        return (
                          <tr key={item.id || index}>
                            <td style={{ border: '1px solid #000000', padding: '5px 4px', textAlign: 'center', fontWeight: 600 }}>{index + 1}</td>
                            <td style={{ border: '1px solid #000000', padding: '5px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>{dateFormatted}</td>
                            <td style={{ border: '1px solid #000000', padding: '5px 8px', fontWeight: 700, textTransform: 'uppercase' }}>{vesselName}</td>
                            <td style={{ border: '1px solid #000000', padding: '5px 8px' }}>{lokasi}</td>
                            <td style={{ border: '1px solid #000000', padding: '5px 6px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatRupiah(nilaiNum)}</td>
                            <td style={{ border: '1px solid #000000', padding: '5px 8px', textTransform: 'uppercase' }}>{namaSurvey}</td>
                            <td style={{ border: '1px solid #000000', padding: '5px 6px', fontSize: '8pt' }}>{noAgenda}</td>
                            <td style={{ border: '1px solid #000000', padding: '5px 6px', fontSize: '8pt' }}>{noCda}</td>
                            <td style={{ border: '1px solid #000000', padding: '5px 6px', fontSize: '8pt', fontWeight: 600 }}>{noSo}</td>
                            <td style={{ border: '1px solid #000000', padding: '5px 6px', fontSize: '8pt' }}>{noWbs}</td>
                          </tr>
                        );
                      })
                    )}
                    {/* Baris Total */}
                    <tr style={{ fontWeight: 800, background: '#f8fafc' }}>
                      <td colSpan="4" style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'right' }}>TOTAL :</td>
                      <td style={{ border: '1px solid #000000', padding: '6px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatRupiah(totalNilai)}</td>
                      <td colSpan="5" style={{ border: '1px solid #000000', padding: '6px 8px' }}></td>
                    </tr>
                  </tbody>
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
                          CABANG PONTIANAK — KALIMANTAN BARAT
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
                        <td>{formatDateIndo(laporan.tglLapor || laporan.tanggal)}</td>
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
                        <td style={{ fontWeight: 700 }}>NAMA SURVEY</td>
                        <td>:</td>
                        <td style={{ textTransform: 'uppercase' }}>{laporan.namaSurvey || laporan.jenisSurvey}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700 }}>NO AGENDA</td>
                        <td>:</td>
                        <td>{laporan.noAgenda || laporan.nomor || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700 }}>NO CDA</td>
                        <td>:</td>
                        <td>{laporan.noCda || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700 }}>NO.SO</td>
                        <td>:</td>
                        <td style={{ fontWeight: 700 }}>{laporan.noSo || laporan.noOrder || '-'}</td>
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
        </div>
      </div>
    </ModalPortal>
  );
};
