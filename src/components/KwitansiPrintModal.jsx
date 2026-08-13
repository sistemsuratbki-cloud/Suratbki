import React from 'react';
import { X, Printer, Ticket, Paperclip } from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';

export const KwitansiPrintModal = ({ isOpen, onClose, kwitansi, suratTugasList }) => {
  if (!isOpen || !kwitansi) return null;

  const linkedSurat = suratTugasList.find((s) => s.id === kwitansi.suratId);
  const ticketFee = kwitansi.biayaTiket || linkedSurat?.biayaTiket || 0;
  const transportCategory = kwitansi.kategoriTransportasi || linkedSurat?.kategoriTransportasi || 'Pesawat Terbang';
  const ticketFile = kwitansi.fileTiketName || linkedSurat?.fileTiketName || '';

  const netFee = kwitansi.jumlah - ticketFee;
  const baseRate = kwitansi.tarifDasar || Math.round(netFee / (kwitansi.isCito ? 1.5 : 1));
  const citoSurcharge = kwitansi.isCito ? Math.round(baseRate * 0.5) : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          style={{ maxWidth: '750px', background: '#ffffff', color: '#0f172a' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
            <h3 className="modal-title" style={{ color: '#0f172a' }}>Preview Kwitansi BKI Cabang Pontianak</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary btn-sm" onClick={handlePrint}>
                <Printer size={15} />
                Cetak / Save PDF (BKI Format)
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
                border: '2px double #003366',
                padding: '1.5rem',
                borderRadius: '8px',
                fontFamily: 'serif',
                background: '#ffffff',
                color: '#0f172a',
              }}
            >
              {/* Header Letterhead */}
              <div style={{ textAlign: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #003366', paddingBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.1em', color: '#1e3a8a' }}>
                  BKI — BIRO KLASIFIKASI INDONESIA
                </div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', color: '#003366', margin: '0.2rem 0' }}>
                  PT BIRO KLASIFIKASI INDONESIA (PERSERO)
                </h2>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                  CABANG PONTIANAK — KALIMANTAN BARAT
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.15rem' }}>
                  Jl. Rahadi Usman No. 1, Pelabuhan Dwikora Pontianak • Email: pontianak@bki.co.id
                </div>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '1.15rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', color: '#003366', letterSpacing: '0.05em' }}>
                  KWITANSI PEMBAYARAN HONORARIUM INSPEKSI & SURVEI KLASIFIKASI
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.15rem' }}>
                  Nomor Bukti: {kwitansi.id} {kwitansi.isCito && <span style={{ color: '#dc2626', fontWeight: 700 }}>[CITO / HARI LIBUR +50%]</span>}
                </div>
              </div>

              <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '175px', fontWeight: 700 }}>Telah Diterima Dari</td>
                    <td style={{ width: '15px' }}>:</td>
                    <td style={{ fontWeight: 600 }}>PT Biro Klasifikasi Indonesia (Persero) Cabang Pontianak</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Nama Class Surveyor</td>
                    <td>:</td>
                    <td style={{ fontWeight: 700, color: '#1e40af' }}>{kwitansi.penerima}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Untuk Pembayaran</td>
                    <td>:</td>
                    <td>
                      {linkedSurat ? (
                        <div>
                          Honorarium Survei Klasifikasi Kapal <strong>{linkedSurat.namaKapal || 'MV Samudra Jaya'}</strong> — {linkedSurat.perihal} (Lokasi: {linkedSurat.lokasi})
                        </div>
                      ) : (
                        'Honorarium Inspeksi Kelayakan & Klasifikasi Kapal BKI'
                      )}
                    </td>
                  </tr>
                  {kwitansi.isCito && (
                    <tr>
                      <td style={{ fontWeight: 700 }}>Kategori Tarif</td>
                      <td>:</td>
                      <td>
                        <span style={{ background: '#fee2e2', color: '#dc2626', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem' }}>
                          ⚡ CITO / HARI LIBUR (Surcharge +50%)
                        </span>
                      </td>
                    </tr>
                  )}
                  {ticketFee > 0 && (
                    <tr>
                      <td style={{ fontWeight: 700 }}>Tiket Perjalanan</td>
                      <td>:</td>
                      <td>
                        <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem' }}>
                          🎟️ {transportCategory}: {formatRupiah(ticketFee)} {ticketFile && `(${ticketFile})`}
                        </span>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ fontWeight: 700 }}>Rincian Biaya</td>
                    <td>:</td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                        Tarif Dasar Lokasi BKI: {formatRupiah(baseRate)}
                        {kwitansi.isCito && <span> + CITO (50%): {formatRupiah(citoSurcharge)}</span>}
                        {ticketFee > 0 && <span> + Tiket ({transportCategory}): {formatRupiah(ticketFee)}</span>}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Total Pembayaran</td>
                    <td>:</td>
                    <td>
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, background: '#f1f5f9', color: kwitansi.isCito ? '#b91c1c' : '#003366', padding: '0.2rem 0.65rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                        {formatRupiah(kwitansi.jumlah)}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Status Transaksi</td>
                    <td>:</td>
                    <td>
                      <span style={{ fontWeight: 700, color: kwitansi.status === 'Sudah Dibayar' ? '#047857' : '#b45309' }}>
                        [{kwitansi.status.toUpperCase()}]
                      </span>
                      {kwitansi.tglBayar && ` Tanggal: ${formatDateIndo(kwitansi.tglBayar)}`}
                    </td>
                  </tr>
                  {kwitansi.catatan && (
                    <tr>
                      <td style={{ fontWeight: 700 }}>Catatan Transaksi</td>
                      <td>:</td>
                      <td style={{ fontStyle: 'italic', color: '#64748b' }}>{kwitansi.catatan}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Official Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8rem' }}>Disetujui Dibayar,</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Kepala Cabang BKI Pontianak</div>
                  <div style={{ height: '45px' }} />
                  <div style={{ fontWeight: 700, textDecoration: 'underline', fontSize: '0.85rem' }}>( Ir. H. Agus Susanto, MT )</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem' }}>Pontianak, {formatDateIndo(kwitansi.tglBayar || new Date().toISOString())}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Penerima Honor (Class Surveyor)</div>
                  <div style={{ height: '45px' }} />
                  <div style={{ fontWeight: 700, textDecoration: 'underline', fontSize: '0.85rem' }}>( {kwitansi.penerima} )</div>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Tutup
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
