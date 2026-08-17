import React from 'react';
import { X, Printer, Ticket, Paperclip, Anchor } from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';
import { useData } from '../context/DataContext';
import { DanantaraLogo } from './DanantaraLogo';
import { IDSurveyLogo } from './IDSurveyLogo';
import { BKILogo } from './BKILogo';
import { unescapeHtml } from '../utils/security';

export const KwitansiPrintModal = ({ isOpen, onClose, kwitansi, suratTugasList }) => {
  const { adminSettings } = useData();
  if (!isOpen || !kwitansi) return null;

  const linkedSurat = suratTugasList.find((s) => s.id === kwitansi.suratId);
  const baseRate = Number(kwitansi.tarifDasar) || Number(linkedSurat?.tarifDasar) || 3000000;
  const hotelFee = Number(kwitansi.tiketHotel) || 0;
  const flightFee = Number(kwitansi.tiketPesawatTaxi) || Number(kwitansi.biayaTiket) || 0;
  const totalReimbursement = hotelFee + flightFee;

  const grandTotal = Number(kwitansi.jumlah) || (baseRate + totalReimbursement);

  const kepalaCabang = adminSettings?.kepalaCabang || linkedSurat?.kepalaCabang || 'MUHSON NURROCHMAT';

  const handlePrint = () => {
    window.print();
  };

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          style={{ maxWidth: '780px', background: '#ffffff', color: '#0f172a' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Anchor size={20} color="#003366" />
              <h3 className="modal-title" style={{ color: '#0f172a' }}>Preview & Cetak Kwitansi Honorarium BKI</h3>
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

          <div className="modal-body" style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
            {/* BKI Official Receipt Box */}
            <div
              className="printable-sheet"
              style={{
                border: '2px solid #003366',
                padding: '1.75rem 2rem',
                borderRadius: '6px',
                fontFamily: "'Arial', 'Segoe UI', sans-serif",
                background: '#ffffff',
                color: '#0f172a',
                fontSize: '9.5pt',
                lineHeight: '1.5'
              }}
            >
              {/* Header Letterhead Logos */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '2px solid #003366' }}>
                <DanantaraLogo height={38} />
                <IDSurveyLogo height={40} />
                <BKILogo height={38} />
              </div>

              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '11pt', fontWeight: 900, textTransform: 'uppercase', color: '#003366', letterSpacing: '0.04em' }}>
                  KWITANSI PEMBAYARAN HONORARIUM SURVEYOR
                </div>
                <div style={{ fontSize: '9pt', fontWeight: 700, color: '#475569', marginTop: '0.2rem' }}>
                  Nomor Kwitansi: {kwitansi.id}
                </div>
              </div>

              <table style={{ width: '100%', fontSize: '9.5pt', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '190px', fontWeight: 700 }}>Telah Diterima Dari</td>
                    <td style={{ width: '15px' }}>:</td>
                    <td style={{ fontWeight: 600 }}>PT Biro Klasifikasi Indonesia (Persero) Cabang Pontianak</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Nama Penerima (Surveyor)</td>
                    <td>:</td>
                    <td style={{ fontWeight: 800, textTransform: 'uppercase', color: '#003366' }}>{kwitansi.penerima}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, verticalAlign: 'top' }}>Untuk Pembayaran</td>
                    <td style={{ verticalAlign: 'top' }}>:</td>
                    <td>
                      <div>
                        Honorarium Penugasan Survei Kapal <strong>{kwitansi.namaKapal || linkedSurat?.namaKapal || 'BAHARI 279'}</strong> — {linkedSurat?.jenisSurvey || linkedSurat?.perihal || 'DINAS SURVEY KLAS'}
                      </div>
                      <div style={{ fontSize: '8.5pt', color: '#475569', marginTop: '0.15rem' }}>
                        Tempat / Rute: <strong>{kwitansi.lokasi || linkedSurat?.tempatSurvey || linkedSurat?.lokasi || 'Pontianak'}</strong> • No. Agenda: {unescapeHtml(linkedSurat?.nomor || kwitansi.nomorSurat || '-')}
                      </div>
                    </td>
                  </tr>

                  {/* Rincian Komponen Biaya */}
                  <tr>
                    <td style={{ fontWeight: 700, verticalAlign: 'top' }}>Rincian Biaya & Reimburse</td>
                    <td style={{ verticalAlign: 'top' }}>:</td>
                    <td>
                      <div style={{ fontSize: '9pt', color: '#1e293b', background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '4px', border: '1px solid #e2e8f0', lineHeight: '1.6' }}>
                        <div>1. Tarif Dasar Lokasi: <strong>{formatRupiah(baseRate)}</strong></div>
                        {hotelFee > 0 && (
                          <div style={{ color: '#0284c7' }}>
                            2. Tiket Hotel / Penginapan: <strong>{formatRupiah(hotelFee)}</strong>
                          </div>
                        )}
                        {flightFee > 0 && (
                          <div style={{ color: '#059669' }}>
                            3. Tiket Pesawat & Taxi (Transportasi): <strong>{formatRupiah(flightFee)}</strong>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style={{ fontWeight: 700 }}>Total Pembayaran</td>
                    <td>:</td>
                    <td>
                      <span style={{ fontSize: '12pt', fontWeight: 900, background: '#f1f5f9', color: '#003366', padding: '0.25rem 0.75rem', borderRadius: '4px', border: '1.5px solid #003366' }}>
                        {formatRupiah(grandTotal)}
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td style={{ fontWeight: 700 }}>Status Approval Keuangan</td>
                    <td>:</td>
                    <td>
                      <span style={{ fontWeight: 800, color: kwitansi.status === 'Sudah Dibayar' ? '#047857' : '#b45309' }}>
                        [{kwitansi.status.toUpperCase()}]
                      </span>
                      {kwitansi.tglBayar && ` • Tanggal: ${formatDateIndo(kwitansi.tglBayar)}`}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Tanda Tangan 3 Kolom: Surveyor, Keuangan, Kepala Cabang */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '2.5rem', textAlign: 'center', fontSize: '8.5pt' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Menyetujui,</div>
                  <div>Kepala Cabang</div>
                  <div style={{ height: '50px' }} />
                  <div style={{ fontWeight: 800, textDecoration: 'underline', textTransform: 'uppercase' }}>{kepalaCabang}</div>
                </div>

                <div>
                  <div style={{ fontWeight: 700 }}>Verifikasi,</div>
                  <div>Bagian Keuangan</div>
                  <div style={{ height: '50px' }} />
                  <div style={{ fontWeight: 800, textDecoration: 'underline', textTransform: 'uppercase' }}>( DIVISI KEUANGAN )</div>
                </div>

                <div>
                  <div style={{ fontWeight: 700 }}>Pontianak, {formatDateIndo(kwitansi.tglBayar || new Date().toISOString())}</div>
                  <div>Penerima Honor (Surveyor)</div>
                  <div style={{ height: '50px' }} />
                  <div style={{ fontWeight: 800, textDecoration: 'underline', textTransform: 'uppercase' }}>{kwitansi.penerima}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Tutup
            </button>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={16} />
              Cetak / Save PDF (Kwitansi)
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
