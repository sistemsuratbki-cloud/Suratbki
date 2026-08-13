import React from 'react';
import { FileText, BarChart2, AlertCircle, ArrowRight, User } from 'lucide-react';
import { useData } from '../context/DataContext';

export const RecentActivity = ({ setActiveTab }) => {
  const { suratTugas, kwitansiHonor, laporanSurvei } = useData();

  const latestSurat = suratTugas[0];
  const latestLaporan = laporanSurvei[0];
  const pendingKwitansi = kwitansiHonor.find((k) => k.status === 'Belum Dibayar') || kwitansiHonor[0];

  const formatShortName = (name = '') => {
    return name.split(' (')[0];
  };

  return (
    <div className="card-section" style={{ padding: '1.5rem' }}>
      <div className="card-header" style={{ padding: 0, border: 'none', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Aktivitas & Log Terkini BKI Pontianak
          </h3>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Ringkasan pembaharuan terbaru Surat Tugas, Laporan Survei, dan Status Kwitansi
          </div>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          style={{ color: 'var(--accent-primary)', fontWeight: 700 }}
          onClick={() => setActiveTab && setActiveTab('surat')}
        >
          <span>Lihat Semua Surat</span>
          <ArrowRight size={15} />
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem'
        }}
      >
        {/* Card 1: Surat Tugas Terbaru */}
        <div
          style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color-strong)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyBetween: 'space-between', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#dbeafe',
                color: '#1e3a8a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <FileText size={20} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.675rem', fontWeight: 800, color: '#1e3a8a', letterSpacing: '0.05em' }}>
                  SURAT TUGAS TERBARU
                </span>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Hari ini</span>
              </div>
              {latestSurat ? (
                <>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {latestSurat.nomor}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a', marginTop: '0.15rem' }}>
                    🚢 {latestSurat.namaKapal || 'MV Samudra Jaya'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: '1.3' }}>
                    {latestSurat.perihal}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Belum ada surat tugas.</div>
              )}
            </div>
          </div>

          {latestSurat && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: 'var(--text-muted)', paddingTop: '0.65rem', borderTop: '1px dashed var(--border-color)' }}>
              <User size={13} />
              <span>Petugas: {formatShortName(latestSurat.petugas)}</span>
            </div>
          )}
        </div>

        {/* Card 2: Laporan Survei Terbaru */}
        <div
          style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color-strong)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#e0e7ff',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <BarChart2 size={20} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.675rem', fontWeight: 800, color: '#4338ca', letterSpacing: '0.05em' }}>
                  LAPORAN SURVEI
                </span>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Kemarin</span>
              </div>
              {latestLaporan ? (
                <>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    Status: <span style={{ color: '#059669' }}>{latestLaporan.status}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4338ca', marginTop: '0.15rem' }}>
                    🚢 {latestLaporan.namaKapal || 'Kapal'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {latestLaporan.hasil}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Belum ada laporan survei.</div>
              )}
            </div>
          </div>

          {latestLaporan && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: 'var(--text-muted)', paddingTop: '0.65rem', borderTop: '1px dashed var(--border-color)' }}>
              <User size={13} />
              <span>Class Surveyor: {formatShortName(latestLaporan.petugas)}</span>
            </div>
          )}
        </div>

        {/* Card 3: Kwitansi Honorarium */}
        <div
          style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color-strong)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <AlertCircle size={20} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.675rem', fontWeight: 800, color: '#dc2626', letterSpacing: '0.05em' }}>
                  KWITANSI TERTUNDA
                </span>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Perlu Pembayaran</span>
              </div>
              {pendingKwitansi ? (
                <>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#b91c1c', marginTop: '0.25rem' }}>
                    {pendingKwitansi.id}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    Status: Belum Dibayar
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: '1.3' }}>
                    {pendingKwitansi.catatan || 'Honorarium Inspeksi Klasifikasi BKI'}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Seluruh kwitansi sudah lunas.</div>
              )}
            </div>
          </div>

          {pendingKwitansi && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: 'var(--text-muted)', paddingTop: '0.65rem', borderTop: '1px dashed var(--border-color)' }}>
              <User size={13} />
              <span>Penerima: {formatShortName(pendingKwitansi.penerima)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
