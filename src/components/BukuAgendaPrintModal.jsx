import React from 'react';
import { X, Printer, BookOpen } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo, cleanDocNumber, formatRupiah } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';

export const BukuAgendaPrintModal = ({
  isOpen,
  onClose,
  data = [],
  currentPeriod = ''
}) => {
  const { adminSettings, gradeTariffs } = useData();
  const { usersList } = useAuth();

  if (!isOpen) return null;

  const formatDateDMY = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const calculateBiayaItem = (item) => {
    if (item.jumlahEstimasi && Number(item.jumlahEstimasi) > 0) {
      return Number(item.jumlahEstimasi);
    }

    const isLuarKota = (item.kategoriPerjalanan || 'Luar Kota') === 'Luar Kota';
    const start = new Date(item.tglMulai);
    const end = new Date(item.tglSelesai);
    const timeDiff = end.getTime() - start.getTime();
    let hr = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    if (hr < 1 || isNaN(hr)) hr = 1;
    let mlm = Math.max(0, hr - 1);

    let hrLbr = Number(item.jumlahHariLibur) || 0;
    if (!item.jumlahHariLibur && !isNaN(start) && !isNaN(end)) {
      let cur = new Date(start);
      let countLibur = 0;
      while (cur <= end) {
        const day = cur.getDay();
        if (day === 0 || day === 6) countLibur++;
        cur.setDate(cur.getDate() + 1);
      }
      hrLbr = countLibur;
    }

    const surveyor = usersList?.find(u => u.name === item.petugas) || {};
    const surveyorGrade = item.pangkat || surveyor.grade || 'GRADE 6 A';
    const gradeData = (gradeTariffs || []).find(
      (g) => (g.grade || '').replace(/\s+/g, '').toUpperCase() === surveyorGrade.replace(/\s+/g, '').toUpperCase()
    ) || {};

    let sisaHariUangHarian = hr;
    if (item.tanpaUangHarian) {
      const deduct = item.hariTanpaUangHarian !== undefined ? Number(item.hariTanpaUangHarian) : hr;
      const validDeduct = Math.max(0, Math.min(deduct, hr));
      sisaHariUangHarian = hr - validDeduct;
    }

    const uangHarianRate = (item.tanpaUangHarian && sisaHariUangHarian === 0) ? 0 : (Number(item.uangHarian) || Number(gradeData.uangHarian) || 300000);
    const uangHarianTotal = uangHarianRate * sisaHariUangHarian;
    const uangHotelRate = Number(item.tiketHotel) || 0;
    const uangHotelTotal = uangHotelRate * mlm;
    const hrLbrTotal = (item.tanpaUangHarian && sisaHariUangHarian === 0) ? 0 : (hrLbr * uangHarianRate * 0.5);
    const tiketPesawatTaxi = Number(item.tiketPesawatTaxi) || Number(item.biayaTiket) || 0;
    const biayaTAT = item.tanpaTAT ? 0 : (Number(item.biayaTAT) || (isLuarKota ? Number(adminSettings?.tatLuarKota || 750000) : 0));
    const rateSK = Number(item.tarifDasar) || 0;

    if (isLuarKota) {
      return tiketPesawatTaxi + biayaTAT + rateSK + uangHarianTotal + uangHotelTotal + hrLbrTotal;
    } else {
      return rateSK + uangHarianTotal + uangHotelTotal + hrLbrTotal;
    }
  };

  const totalBiayaAkumulasi = data.reduce((acc, item) => acc + calculateBiayaItem(item), 0);

  const kepalaCabang = adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT';
  const nup = adminSettings?.nup || '48199-KI';
  const todayFormatted = formatDateIndo(new Date().toISOString().split('T')[0]);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Buku_Agenda_${todayFormatted.replace(/[\s,/-]+/g, '_')}`;
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
          style={{ maxWidth: '1150px', width: '98vw', background: '#ffffff', color: '#000000' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header Toolbar */}
          <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={20} color="#003366" />
              <div>
                <h3 className="modal-title" style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 800 }}>
                  Preview & Cetak PDF Buku Agenda
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {currentPeriod ? `Periode: ${currentPeriod} (${data.length} Kegiatan Terdaftar)` : `Total: ${data.length} Kegiatan Terdaftar`}
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
                padding: '1.25rem',
                borderRadius: '4px',
                fontFamily: "'Arial', 'Segoe UI', sans-serif",
                lineHeight: '1.35',
                fontSize: '9pt',
                background: '#ffffff',
                color: '#000000',
                boxSizing: 'border-box'
              }}
            >
              {/* Document Title Header */}
              <div style={{ textAlign: 'center', marginBottom: '1.25rem', textTransform: 'uppercase' }}>
                <div style={{ fontSize: '13pt', fontWeight: 'bold', letterSpacing: '0.04em', color: '#1e3a8a' }}>
                  BUKU AGENDA
                </div>
                <div style={{ fontSize: '10.5pt', fontWeight: 'bold', marginTop: '0.15rem' }}>
                  PT. BIRO KLASIFIKASI INDONESIA (PERSERO)
                </div>
                <div style={{ fontSize: '10pt', fontWeight: 'bold' }}>
                  CABANG MADYA KLAS PONTIANAK
                </div>
                {currentPeriod && (
                  <div style={{ fontSize: '9pt', fontWeight: 600, color: '#334155', marginTop: '0.3rem' }}>
                    {currentPeriod}
                  </div>
                )}
              </div>

              {/* Table Matching Screenshot */}
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid black',
                  fontSize: '8.5pt'
                }}
              >
                <thead>
                  <tr style={{ background: '#4f81bd', color: '#ffffff', textAlign: 'center', fontWeight: 'bold' }}>
                    <th rowSpan={2} style={{ border: '1px solid black', padding: '6px 3px', width: '4%' }}>NO</th>
                    <th rowSpan={2} style={{ border: '1px solid black', padding: '6px', width: '15%' }}>NOMOR SURAT</th>
                    <th rowSpan={2} style={{ border: '1px solid black', padding: '6px', width: '22%' }}>OBJEK/SURVEY</th>
                    <th rowSpan={2} style={{ border: '1px solid black', padding: '6px', width: '15%' }}>LOKASI SURVEY</th>
                    <th colSpan={2} style={{ border: '1px solid black', padding: '4px', width: '18%' }}>TANGGAL PENGUASAAN</th>
                    <th rowSpan={2} style={{ border: '1px solid black', padding: '6px', width: '13%' }}>BIAYA</th>
                    <th rowSpan={2} style={{ border: '1px solid black', padding: '6px', width: '13%' }}>SURVEYOR</th>
                  </tr>
                  <tr style={{ background: '#4f81bd', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', fontSize: '8pt' }}>
                    <th style={{ border: '1px solid black', padding: '3px', width: '9%' }}>MULAI</th>
                    <th style={{ border: '1px solid black', padding: '3px', width: '9%' }}>SELESAI</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ border: '1px solid black', padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
                        Tidak ada data buku agenda untuk periode ini.
                      </td>
                    </tr>
                  ) : (
                    data.map((item, idx) => {
                      const tglMulaiFormatted = formatDateDMY(item.tglMulai || item.tglSelesai);
                      const tglSelesaiFormatted = formatDateDMY(item.tglSelesai || item.tglMulai);
                      const biaya = calculateBiayaItem(item);
                      const lokasi = item.tempatSurvey || item.lokasi || '-';

                      return (
                        <tr key={item.id || idx}>
                          <td style={{ border: '1px solid black', padding: '4px 3px', textAlign: 'center', fontWeight: 600 }}>
                            {idx + 1}
                          </td>
                          <td style={{ border: '1px solid black', padding: '4px 6px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {cleanDocNumber(item.nomor) || '-'}
                          </td>
                          <td style={{ border: '1px solid black', padding: '4px 6px', fontWeight: 600 }}>
                            {item.namaKapal || '-'}
                          </td>
                          <td style={{ border: '1px solid black', padding: '4px 6px' }}>
                            {lokasi}
                          </td>
                          <td style={{ border: '1px solid black', padding: '4px 3px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {tglMulaiFormatted}
                          </td>
                          <td style={{ border: '1px solid black', padding: '4px 3px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {tglSelesaiFormatted}
                          </td>
                          <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>
                            {biaya > 0 ? Number(biaya).toLocaleString('id-ID') : '-'}
                          </td>
                          <td style={{ border: '1px solid black', padding: '4px 6px' }}>
                            {item.petugas || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* Empty rows to make the sheet look complete */}
                  {data.length < 12 && Array.from({ length: 12 - data.length }).map((_, emptyIdx) => (
                    <tr key={`empty-${emptyIdx}`} style={{ height: '22px' }}>
                      <td style={{ border: '1px solid black', padding: '3px', textAlign: 'center', color: '#cbd5e1' }}>
                        {data.length + emptyIdx + 1}
                      </td>
                      <td style={{ border: '1px solid black', padding: '3px' }}></td>
                      <td style={{ border: '1px solid black', padding: '3px' }}></td>
                      <td style={{ border: '1px solid black', padding: '3px' }}></td>
                      <td style={{ border: '1px solid black', padding: '3px' }}></td>
                      <td style={{ border: '1px solid black', padding: '3px' }}></td>
                      <td style={{ border: '1px solid black', padding: '3px' }}></td>
                      <td style={{ border: '1px solid black', padding: '3px' }}></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 'bold', background: '#f8fafc' }}>
                    <td colSpan={6} style={{ border: '1px solid black', padding: '5px 8px', textAlign: 'center' }}>
                      TOTAL BIAYA
                    </td>
                    <td style={{ border: '1px solid black', padding: '5px 6px', textAlign: 'right', color: '#059669', fontSize: '9pt' }}>
                      {Number(totalBiayaAkumulasi).toLocaleString('id-ID')}
                    </td>
                    <td style={{ border: '1px solid black', padding: '5px' }}></td>
                  </tr>
                </tfoot>
              </table>

              {/* Signature Block */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', breakInside: 'avoid' }}>
                <div style={{ textAlign: 'center', minWidth: '280px' }}>
                  <div style={{ fontSize: '9pt', marginBottom: '0.2rem' }}>
                    Pontianak, {todayFormatted}
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '9pt' }}>
                    PT. BIRO KLASIFIKASI INDONESIA (PERSERO)
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '9pt', marginBottom: '3.5rem' }}>
                    CABANG MADYA KLAS PONTIANAK
                  </div>

                  <div style={{ fontWeight: 'bold', textDecoration: 'underline', fontSize: '10pt' }}>
                    {kepalaCabang}
                  </div>
                  <div style={{ fontSize: '8.5pt', color: '#334155' }}>
                    Kepala Cabang / NUP: {nup}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <style>{`
            @media print {
              @page { size: A4 landscape !important; margin: 8mm 10mm !important; }
              body { background: #ffffff !important; color: #000000 !important; }
              .modal-overlay { position: static !important; background: transparent !important; padding: 0 !important; }
              .modal-content { max-width: 100% !important; width: 100% !important; border: none !important; box-shadow: none !important; }
              .modal-header, .modal-footer { display: none !important; }
              .modal-body { padding: 0 !important; overflow: visible !important; }
              .printable-sheet { padding: 0 !important; width: 100% !important; }
              table { width: 100% !important; border: 1px solid black !important; }
              th, td { border: 1px solid black !important; }
              thead tr { background: #4f81bd !important; color: #ffffff !important; -webkit-print-color-adjust: exact !important; }
              th { color: #ffffff !important; -webkit-print-color-adjust: exact !important; }
            }
          `}</style>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Tutup
            </button>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={16} />
              <span>Cetak / Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
