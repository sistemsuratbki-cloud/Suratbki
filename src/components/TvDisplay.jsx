import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Anchor, UserCheck, CheckCircle, LogOut } from 'lucide-react';
import { useData } from '../context/DataContext';
import { BKILogo } from './BKILogo';
export const TvDisplay = ({ onClose, isMonitorRole = false }) => {
  const { suratTugas, tariffs } = useData();
  const [currentTime, setCurrentTime] = useState(new Date());
  const scrollRef = useRef(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut to close (ESC)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Filter active surveys (only confirmed PDS, not finished and currently happening today)
  const activeSurveys = suratTugas.filter((st) => {
    if (st.status === 'Selesai' || st.status === 'Batal') return false;
    const isPds = st.docType === 'PDS' || st.isPds || (st.status !== 'Menunggu Survei' && !st.isSps && st.docType !== 'SPS');
    if (!isPds) return false;
    if (!st.tglMulai || !st.tglSelesai) return false;
    
    // Normalize dates for comparison (ignoring time)
    const today = new Date(currentTime);
    today.setHours(0, 0, 0, 0);
    
    const start = new Date(st.tglMulai);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(st.tglSelesai);
    end.setHours(23, 59, 59, 999);
    
    return today >= start && today <= end;
  }).sort((a, b) => new Date(b.tglMulai) - new Date(a.tglMulai));

  // Auto-scroll animation logic
  useEffect(() => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    
    let scrollAmount = 0;
    const scrollStep = 1;
    const scrollInterval = 50; // ms

    const scrollTimer = setInterval(() => {
      if (container.scrollHeight > container.clientHeight) {
        container.scrollTop += scrollStep;
        scrollAmount += scrollStep;
        
        // Reset scroll when reaching bottom
        if (container.scrollTop + container.clientHeight >= container.scrollHeight) {
          setTimeout(() => {
            container.scrollTop = 0;
            scrollAmount = 0;
          }, 2000); // Wait 2s at the bottom before jumping back up
        }
      }
    }, scrollInterval);

    return () => clearInterval(scrollTimer);
  }, [activeSurveys]);

  const formatDate = (dateObj) => {
    return dateObj.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateObj) => {
    return dateObj.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'var(--bg-main)',
        color: 'var(--text-primary)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          background: 'var(--bg-card-solid)',
          padding: '1.5rem 2.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <BKILogo size={48} />
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
              MONITORING KEGIATAN SURVEI
            </h1>
            <div style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '0.25rem' }}>
              PT. BIRO KLASIFIKASI INDONESIA (PERSERO) CABANG MADYA KLAS PONTIANAK
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--status-running-text)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
              {formatTime(currentTime)}
            </div>
            <div style={{ fontSize: '1.25rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {formatDate(currentTime)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '0.75rem',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            title={isMonitorRole ? "Keluar Akun (Logout)" : "Keluar Mode Layar Monitor (ESC)"}
          >
            {isMonitorRole ? <LogOut size={28} /> : <X size={28} />}
          </button>
        </div>
      </div>

      {/* Data Grid (Auto-scrolling container) */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'hidden', // hide scrollbar for clean TV look
          padding: '2rem'
        }}
      >
        {activeSurveys.length > 0 ? (
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', 
              gap: '1.5rem', 
              paddingBottom: '2rem' 
            }}
          >
            {activeSurveys.map((st, idx) => (
              <div
                key={st.id}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: '16px',
                  padding: '1.75rem',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Accent top border */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'var(--accent-primary)' }}></div>
                
                {/* Header (Surveyor Name) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <div style={{ background: 'var(--bg-main)', padding: '0.5rem', borderRadius: '50%', border: '1px solid var(--border-color)' }}>
                    <UserCheck size={26} color="var(--accent-primary)" />
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {st.petugas}
                  </div>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <Anchor size={22} color="var(--text-muted)" style={{ marginTop: '0.15rem' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Nama Kapal</div>
                      <div style={{ fontSize: '1.35rem', color: 'var(--status-running-text)', fontWeight: 700, textTransform: 'uppercase' }}>{st.namaKapal}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <MapPin size={22} color="var(--text-muted)" style={{ marginTop: '0.15rem' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Lokasi Survei</div>
                      <div style={{ fontSize: '1.2rem', color: 'var(--status-pending-text)', fontWeight: 700, textTransform: 'uppercase' }}>
                        {st.lokasi || st.tempatSurvey}
                        {(() => {
                          const matched = (tariffs || []).find(t => (t.tujuan || t.name).toUpperCase() === (st.lokasi || st.tempatSurvey || '').toUpperCase());
                          return matched && matched.rincian ? ` (${matched.rincian.toUpperCase()})` : '';
                        })()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <CheckCircle size={22} color="var(--text-muted)" style={{ marginTop: '0.15rem' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Jenis Survei</div>
                      <div style={{ fontSize: '1.2rem', color: 'var(--status-completed-text)', fontWeight: 700, textTransform: 'uppercase' }}>{st.jenisSurvey || st.perihal}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', fontSize: '2rem', color: '#64748b', fontWeight: 700 }}>
            Tidak ada survei aktif
          </div>
        )}
      </div>
    </div>
  );
};
