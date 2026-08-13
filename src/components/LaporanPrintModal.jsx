import React from 'react';
import { X, Printer, Anchor } from 'lucide-react';
import { formatDateIndo } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';
import { DanantaraLogo } from './DanantaraLogo';
import { BKILogo } from './BKILogo';

export const LaporanPrintModal = ({ isOpen, onClose, laporan, suratTugas = [] }) => {
  if (!isOpen || !laporan) return null;

  const handlePrint = () => {
    window.print();
  };

  const linkedSurat = suratTugas.find((s) => s.id === laporan.suratId);
  const vesselName = laporan.namaKapal || (linkedSurat ? linkedSurat.namaKapal : 'MV Samudra Jaya 08');
  const suratNomor = linkedSurat ? linkedSurat.nomor : 'ST/MAR/10/2026/001';
  const perihalSurvei = linkedSurat ? linkedSurat.perihal : 'Survei Pembaruan Kelas Lambung & Konstruksi';

  const labelStyle = { width: '170px', fontWeight: 700, verticalAlign: 'top', paddingBottom: '0.25rem' };
  const colonStyle = { width: '12px', verticalAlign: 'top', paddingBottom: '0.25rem' };
  const valueStyle = { verticalAlign: 'top', paddingBottom: '0.25rem' };

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          style={{ maxWidth: '760px', background: '#ffffff', color: '#0f172a' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Anchor size={20} color="#003366" />
              <h3 className="modal-title" style={{ color: '#0f172a' }}>Preview & Download PDF Laporan Survei</h3>
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

          {/* Document Printable Body */}
          <div className="modal-body" style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
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
                color: '#0f172a',
              }}
            >
              {/* ====== KOP SURAT ====== */}
              <div style={{ marginBottom: '0.85rem', borderBottom: '3px double #003366', paddingBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <DanantaraLogo height={42} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', color: '#475569', marginBottom: '0.1rem' }}>
                      BADAN PENGELOLA INVESTASI DAYA ANAGATA NUSANTARA
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', color: '#003366', lineHeight: 1.15 }}>
                      PT BIRO KLASIFIKASI INDONESIA (PERSERO)
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginTop: '0.1rem' }}>
                      CABANG PONTIANAK — KALIMANTAN BARAT
                    </div>
                    <div style={{ fontSize: '0.675rem', color: '#64748b', marginTop: '0.1rem' }}>
                      Jl. Rahadi Usman No. 1, Pelabuhan Dwikora, Pontianak 78112 • Telp: (0561) 734567 • Email: pontianak@bki.co.id
                    </div>
                  </div>
                  <BKILogo height={42} style={{ flexShrink: 0 }} />
                </div>
              </div>

              {/* ====== JUDUL DOKUMEN ====== */}
              <div style={{ textAlign: 'center', margin: '0.85rem 0 1rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', color: '#003366', letterSpacing: '0.04em', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                  LAPORAN HASIL SURVEI KLASIFIKASI KAPAL
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginTop: '0.2rem' }}>
                  Ref. Laporan No: {laporan.id}
                </div>
              </div>

              {/* ====== INFORMASI PENUGASAN ====== */}
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.75rem 1rem', borderRadius: '4px', marginBottom: '0.85rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={labelStyle}>Nama Kapal (Vessel)</td>
                      <td style={colonStyle}>:</td>
                      <td style={{ ...valueStyle, fontWeight: 800, color: '#003366', fontSize: '0.9rem' }}>
                        🚢 {vesselName}
                      </td>
                    </tr>
                    <tr>
                      <td style={labelStyle}>Surat Tugas Terkait</td>
                      <td style={colonStyle}>:</td>
                      <td style={{ ...valueStyle, fontWeight: 700 }}>
                        {suratNomor}
                      </td>
                    </tr>
                    <tr>
                      <td style={labelStyle}>Perihal Survei</td>
                      <td style={colonStyle}>:</td>
                      <td style={valueStyle}>{perihalSurvei}</td>
                    </tr>
                    <tr>
                      <td style={labelStyle}>Class Surveyor</td>
                      <td style={colonStyle}>:</td>
                      <td style={{ ...valueStyle, fontWeight: 800, color: '#1e3a8a' }}>{laporan.petugas}</td>
                    </tr>
                    <tr>
                      <td style={labelStyle}>Tanggal Pelaporan</td>
                      <td style={colonStyle}>:</td>
                      <td style={valueStyle}>📅 {formatDateIndo(laporan.tglLapor)}</td>
                    </tr>
                    <tr>
                      <td style={labelStyle}>Status Verifikasi</td>
                      <td style={colonStyle}>:</td>
                      <td style={valueStyle}>
                        <span
                          style={{
                            background: laporan.status === 'Disetujui' ? '#d1fae5' : '#fef3c7',
                            color: laporan.status === 'Disetujui' ? '#047857' : '#b45309',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '3px',
                            fontWeight: 700,
                            fontSize: '0.775rem'
                          }}
                        >
                          {laporan.status === 'Disetujui' ? '✓ Disetujui (Approved)' : `Status: ${laporan.status}`}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ====== HASIL & TEMUAN INSPEKSI ====== */}
              <div style={{ marginBottom: '0.85rem' }}>
                <div style={{ fontWeight: 800, fontSize: '0.875rem', color: '#003366', marginBottom: '0.35rem', borderBottom: '1.5px solid #cbd5e1', paddingBottom: '0.2rem' }}>
                  A. Hasil Inspeksi & Temuan Lapangan
                </div>
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #94a3b8',
                    padding: '0.75rem 0.85rem',
                    borderRadius: '4px',
                    textAlign: 'justify',
                    whiteSpace: 'pre-line',
                    fontSize: '0.825rem',
                    lineHeight: '1.45'
                  }}
                >
                  {laporan.hasil}
                </div>
              </div>

              {/* ====== REKOMENDASI KELAIKLAUTAN ====== */}
              <div style={{ marginBottom: '1.1rem' }}>
                <div style={{ fontWeight: 800, fontSize: '0.875rem', color: '#003366', marginBottom: '0.35rem', borderBottom: '1.5px solid #cbd5e1', paddingBottom: '0.2rem' }}>
                  B. Kesimpulan & Rekomendasi
                </div>
                <p style={{ textAlign: 'justify', fontSize: '0.825rem', lineHeight: '1.45', margin: 0 }}>
                  Berdasarkan hasil survei fisik dan pengujian sistem keselamatan kelaiklautan yang dilaksanakan oleh Class Surveyor BKI Pontianak, kapal dinyatakan **memenuhi kualifikasi Peraturan Klasifikasi PT Biro Klasifikasi Indonesia (Persero)** untuk beroperasi sesuai ketentuan pelayaran yang berlaku.
                </p>
              </div>

              {/* ====== TANDA TANGAN ====== */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.25rem' }}>
                <div style={{ width: '220px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem' }}>Marine Surveyor,</div>
                  <div style={{ height: '42px' }} />
                  <div style={{ fontWeight: 800, textDecoration: 'underline', fontSize: '0.85rem' }}>
                    {laporan.petugas}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: '#475569' }}>Class Surveyor BKI</div>
                </div>

                <div style={{ width: '240px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem' }}>Pontianak, {formatDateIndo(laporan.tglLapor)}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>Mengetahui / Menyetujui,</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#003366' }}>Kepala Cabang BKI Pontianak</div>
                  <div style={{ height: '30px' }} />
                  <div style={{ fontWeight: 800, textDecoration: 'underline', fontSize: '0.85rem' }}>
                    Ir. H. Agus Susanto, MT
                  </div>
                  <div style={{ fontSize: '0.725rem', color: '#475569' }}>Kepala Cabang</div>
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
              Cetak / Save PDF
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
