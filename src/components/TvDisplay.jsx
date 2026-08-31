import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, MapPin, Anchor, UserCheck, CheckCircle, LogOut, Plus,
  Clock, Navigation, Edit, Trash2, Layers, AlertCircle, Check, Hourglass,
  ChevronLeft, ChevronRight, Calendar, RotateCcw, Sun, Moon
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { BKILogo } from './BKILogo';
import { VisitSurveiModal, calculateEndTime } from './VisitSurveiModal';
import toast from 'react-hot-toast';

function evaluateRealtimeStatus(item, now, selectedDateStr, todayDateStr) {
  if (item.status === 'Selesai') return 'Selesai';

  // Jika melihat tanggal lampau, otomatis Selesai
  if (selectedDateStr && todayDateStr && selectedDateStr < todayDateStr) {
    return 'Selesai';
  }
  // Jika melihat tanggal masa depan, masih On Proses / Terjadwal
  if (selectedDateStr && todayDateStr && selectedDateStr > todayDateStr) {
    return 'On Proses';
  }

  if (!item.jamSelesai) return 'On Proses';

  const tgl = item.tanggal || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [endH, endM] = item.jamSelesai.split(':').map(Number);
  const [year, month, day] = tgl.split('-').map(Number);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return 'On Proses';

  const endDateTime = new Date(year, month - 1, day, endH || 0, endM || 0, 0);
  return now >= endDateTime ? 'Selesai' : 'On Proses';
}

export const TvDisplay = ({ onClose, isMonitorRole = false }) => {
  const { suratTugas, tariffs, visitSurvei = [], addVisitSurvei, updateVisitSurvei, deleteVisitSurvei } = useData();
  const { role, currentUser } = useAuth();

  // Theme State: Default 'light', persisted in localStorage
  const [tvTheme, setTvTheme] = useState(() => {
    return localStorage.getItem('st_tv_theme') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('st_tv_theme', tvTheme);
  }, [tvTheme]);

  const isLight = tvTheme === 'light';

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const scrollRef = useRef(null);
  const dateInputRef = useRef(null);

  const todayStr = useMemo(() => {
    const d = new Date(currentTime);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [currentTime]);

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

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

  // Date Shift Navigation Handlers
  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    const nextStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(nextStr);
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);
    const nextStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(nextStr);
  };

  const handleToday = () => {
    setSelectedDate(todayStr);
  };

  const formattedSelectedDate = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [selectedDate]);

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const isSelectedToday = selectedDate === todayStr;

  // Hanya menampilkan Catatan Visit Survei (Laporan Kunjungan) pada Tanggal Terpilih
  const combinedList = useMemo(() => {
    // 1. Visit Survei Entries for selectedDate
    let visitItems = (visitSurvei || [])
      .filter((v) => {
        if (!v.tanggal) return isSelectedToday;
        return v.tanggal === selectedDate;
      })
      .map((v) => {
        const start = v.jamBerangkat || '08:00';
        const dur = (v.durasi !== undefined && v.durasi !== null && v.durasi !== '' && !isNaN(Number(v.durasi))) ? Number(v.durasi) : 0;
        const end = v.jamSelesai || calculateEndTime(start, dur);
        const liveStatus = evaluateRealtimeStatus({ ...v, jamSelesai: end }, currentTime, selectedDate, todayStr);

        return {
          id: v.id,
          source: 'visit',
          nama: v.nama,
          namaKapal: v.namaKapal,
          lokasi: v.lokasi,
          jamBerangkat: start,
          durasi: dur,
          jamSelesai: end,
          tanggal: v.tanggal || selectedDate,
          status: liveStatus,
          keterangan: v.keterangan || 'Visit Lapangan',
          rawItem: v
        };
      });

    const isSuperUser = role === 'admin' || role === 'kacab' || role === 'kacap' || role === 'developer' || role === 'monitor' || isMonitorRole || role === 'finance' || role === 'keuangan';

    // Surveyor hanya melihat input miliknya sendiri, sedangkan Kacab & Admin melihat seluruh surveyor
    if (!isSuperUser && currentUser?.name) {
      const surveyorFullName = currentUser.name.toLowerCase().trim();
      const surveyorFirstName = surveyorFullName.split(' ')[0].trim();
      visitItems = visitItems.filter((item) => {
        const targetName = (item.nama || '').toLowerCase().trim();
        return targetName.includes(surveyorFullName) || targetName.includes(surveyorFirstName) || surveyorFullName.includes(targetName);
      });
    }

    return visitItems;
  }, [visitSurvei, currentTime, selectedDate, todayStr, isSelectedToday, role, currentUser, isMonitorRole]);

  // Auto-scroll animation logic
  useEffect(() => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;

    let scrollAmount = 0;
    const scrollStep = 1;
    const scrollInterval = 55;

    const scrollTimer = setInterval(() => {
      if (container.scrollHeight > container.clientHeight) {
        container.scrollTop += scrollStep;
        scrollAmount += scrollStep;

        if (container.scrollTop + container.clientHeight >= container.scrollHeight) {
          setTimeout(() => {
            container.scrollTop = 0;
            scrollAmount = 0;
          }, 3000);
        }
      }
    }, scrollInterval);

    return () => clearInterval(scrollTimer);
  }, [combinedList]);

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

  const handleSaveVisit = (data) => {
    if (editingVisit) {
      updateVisitSurvei(editingVisit.id, data);
    } else {
      addVisitSurvei(data);
    }
  };

  const handleDeleteVisit = (id) => {
    if (window.confirm('Hapus entri visit survei ini dari layar monitor?')) {
      deleteVisitSurvei(id);
      toast.success('Visit survei dihapus');
    }
  };

  const handleSetSelesai = (item) => {
    if (item.source === 'visit') {
      updateVisitSurvei(item.id, { status: 'Selesai' });
      toast.success(`Visit survei kapal ${item.namaKapal} ditandai selesai`);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: isLight ? '#f1f5f9' : '#090d16',
        color: isLight ? '#0f172a' : '#f8fafc',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', sans-serif",
        transition: 'background-color 0.25s ease, color 0.25s ease'
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          background: isLight
            ? 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
            : 'linear-gradient(180deg, #0f172a 0%, #090d16 100%)',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: isLight ? '1px solid #cbd5e1' : '1px solid rgba(56, 189, 248, 0.25)',
          boxShadow: isLight ? '0 4px 16px rgba(0, 0, 0, 0.05)' : '0 8px 32px rgba(0, 0, 0, 0.5)',
          flexWrap: 'wrap',
          gap: '1rem',
          transition: 'all 0.25s ease'
        }}
      >
        {/* Left: Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ filter: isLight ? 'drop-shadow(0 2px 8px rgba(2, 132, 199, 0.25))' : 'drop-shadow(0 0 12px rgba(56, 189, 248, 0.5))' }}>
            <BKILogo size={46} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 900, color: isLight ? '#0f172a' : '#ffffff', letterSpacing: '0.03em', textShadow: isLight ? 'none' : '0 2px 10px rgba(0,0,0,0.5)' }}>
                MONITORING KEGIATAN SURVEI
              </h1>
              <span
                style={{
                  background: isLight ? '#e0f2fe' : 'rgba(56, 189, 248, 0.2)',
                  color: isLight ? '#0284c7' : '#38bdf8',
                  border: isLight ? '1px solid #7dd3fc' : '1px solid #38bdf8',
                  borderRadius: '20px',
                  padding: '0.2rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: isLight ? '#0284c7' : '#38bdf8' }}></span>
                LIVE BOARD
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: isLight ? '#475569' : '#94a3b8', fontWeight: 600, marginTop: '0.15rem' }}>
              PT. BIRO KLASIFIKASI INDONESIA (PERSERO) CABANG MADYA KLAS PONTIANAK
            </div>
          </div>
        </div>

        {/* Center: Navigasi Tanggal (Kemarin, Hari Ini, Besok & Date Picker) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.85)',
            padding: '0.4rem 0.65rem',
            borderRadius: '12px',
            border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(56, 189, 248, 0.3)',
            boxShadow: isLight ? '0 2px 8px rgba(0, 0, 0, 0.04)' : '0 4px 16px rgba(0, 0, 0, 0.35)'
          }}
        >
          {/* Tombol Geser Kemarin */}
          <button
            type="button"
            onClick={handlePrevDay}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              background: isLight ? '#f1f5f9' : 'rgba(30, 41, 59, 0.9)',
              color: isLight ? '#1e293b' : '#e2e8f0',
              border: isLight ? '1px solid #cbd5e1' : '1px solid #475569',
              padding: '0.35rem 0.75rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.8rem',
              transition: 'all 0.15s'
            }}
            title="Geser ke Hari Kemarin"
          >
            <ChevronLeft size={16} />
            <span>Kemarin</span>
          </button>

          {/* Kotak Tanggal Aktif */}
          <div
            onClick={() => dateInputRef.current && dateInputRef.current.showPicker?.()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.35rem 0.85rem',
              background: isLight ? '#f0f9ff' : 'rgba(56, 189, 248, 0.08)',
              border: isLight ? '1px solid #bae6fd' : '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '8px',
              cursor: 'pointer',
              position: 'relative'
            }}
            title="Klik untuk memilih tanggal langsung"
          >
            <Calendar size={16} color={isLight ? '#0284c7' : '#38bdf8'} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff', letterSpacing: '0.02em' }}>
                {formattedSelectedDate}
              </span>
              {selectedDate === todayStr && (
                <span style={{ background: isLight ? '#e0f2fe' : 'rgba(56, 189, 248, 0.25)', color: isLight ? '#0284c7' : '#38bdf8', border: isLight ? '1px solid #7dd3fc' : '1px solid #38bdf8', padding: '0.1rem 0.45rem', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 800 }}>
                  Hari Ini
                </span>
              )}
              {selectedDate === yesterdayStr && (
                <span style={{ background: isLight ? '#ffedd5' : 'rgba(251, 146, 60, 0.25)', color: isLight ? '#c2410c' : '#fb923c', border: isLight ? '1px solid #fed7aa' : '1px solid #fb923c', padding: '0.1rem 0.45rem', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 800 }}>
                  Kemarin
                </span>
              )}
              {selectedDate === tomorrowStr && (
                <span style={{ background: isLight ? '#dcfce7' : 'rgba(52, 211, 153, 0.25)', color: isLight ? '#15803d' : '#34d399', border: isLight ? '1px solid #86efac' : '1px solid #34d399', padding: '0.1rem 0.45rem', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 800 }}>
                  Besok
                </span>
              )}
            </div>

            {/* Hidden native date input for date picker */}
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              style={{
                position: 'absolute',
                opacity: 0,
                pointerEvents: 'none',
                width: 0,
                height: 0
              }}
            />
          </div>

          {/* Tombol Geser Besok */}
          <button
            type="button"
            onClick={handleNextDay}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              background: isLight ? '#f1f5f9' : 'rgba(30, 41, 59, 0.9)',
              color: isLight ? '#1e293b' : '#e2e8f0',
              border: isLight ? '1px solid #cbd5e1' : '1px solid #475569',
              padding: '0.35rem 0.75rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.8rem',
              transition: 'all 0.15s'
            }}
            title="Geser ke Hari Besok"
          >
            <span>Besok</span>
            <ChevronRight size={16} />
          </button>

          {/* Tombol Reset ke Hari Ini */}
          {!isSelectedToday && (
            <button
              type="button"
              onClick={handleToday}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0.35rem 0.65rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '0.75rem',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)'
              }}
              title="Kembali ke Hari Ini"
            >
              <RotateCcw size={13} />
              <span>Hari Ini</span>
            </button>
          )}
        </div>

        {/* Right: Theme Toggle, Clock & Close Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Tombol Pengubah Mode Terang / Gelap */}
          <button
            type="button"
            onClick={() => setTvTheme(prev => (prev === 'light' ? 'dark' : 'light'))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: isLight ? '#ffffff' : 'rgba(30, 41, 59, 0.9)',
              color: isLight ? '#0f172a' : '#f8fafc',
              border: isLight ? '1px solid #cbd5e1' : '1px solid #475569',
              padding: '0.45rem 0.85rem',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.78rem',
              boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.3)',
              transition: 'all 0.15s ease'
            }}
            title={isLight ? 'Ganti ke Mode Gelap (Dark Mode)' : 'Ganti ke Mode Terang (Light Mode)'}
          >
            {isLight ? (
              <>
                <Moon size={15} color="#0284c7" />
                <span>Mode Gelap</span>
              </>
            ) : (
              <>
                <Sun size={15} color="#f59e0b" />
                <span>Mode Terang</span>
              </>
            )}
          </button>

          {/* Clock Widget */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: isLight ? '#0284c7' : '#38bdf8', fontFamily: 'monospace', letterSpacing: '0.06em', textShadow: isLight ? 'none' : '0 0 20px rgba(56, 189, 248, 0.4)' }}>
              {formatTime(currentTime)}
            </div>
            <div style={{ fontSize: '0.88rem', color: isLight ? '#475569' : '#94a3b8', fontWeight: 600 }}>
              {formatDate(currentTime)}
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              border: isLight ? '1px solid #fca5a5' : '1px solid rgba(239, 68, 68, 0.4)',
              padding: '0.65rem',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            title={isMonitorRole ? 'Keluar Akun (Logout)' : 'Keluar Mode Layar Monitor (ESC)'}
          >
            {isMonitorRole ? <LogOut size={22} /> : <X size={22} />}
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'hidden',
          padding: '1.75rem 2.25rem',
          background: isLight ? '#f8fafc' : '#090d16',
          transition: 'background-color 0.25s ease'
        }}
      >
        {combinedList.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))',
              gap: '1.5rem',
              paddingBottom: '3rem'
            }}
          >
            {combinedList.map((item) => {
              const isOnProses = item.status === 'On Proses';
              const isFinished = item.status === 'Selesai';

              return (
                <div
                  key={item.id}
                  style={{
                    background: isLight
                      ? (isOnProses ? 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)')
                      : 'linear-gradient(135deg, #0f172a 0%, #172554 100%)',
                    borderRadius: '16px',
                    padding: '1.6rem 1.75rem',
                    border: isLight
                      ? (isOnProses ? '1.5px solid #38bdf8' : '1.5px solid #34d399')
                      : (isOnProses ? '1.5px solid rgba(56, 189, 248, 0.55)' : '1.5px solid rgba(16, 185, 129, 0.55)'),
                    boxShadow: isLight
                      ? (isOnProses ? '0 8px 24px rgba(2, 132, 199, 0.10)' : '0 8px 24px rgba(16, 185, 129, 0.10)')
                      : (isOnProses ? '0 10px 30px rgba(2, 132, 199, 0.25)' : '0 10px 30px rgba(16, 185, 129, 0.25)'),
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.15rem',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Glowing Top Status Bar */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '4px',
                      background: isOnProses ? 'linear-gradient(90deg, #0284c7, #38bdf8)' : 'linear-gradient(90deg, #059669, #10b981)'
                    }}
                  />

                  {/* Card Header: Surveyor Name + Status Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '10px',
                          background: isLight
                            ? (isOnProses ? '#e0f2fe' : '#dcfce7')
                            : (isOnProses ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                          border: isLight
                            ? (isOnProses ? '1px solid #bae6fd' : '1px solid #bbf7d0')
                            : (isOnProses ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <UserCheck size={20} color={isOnProses ? (isLight ? '#0284c7' : '#38bdf8') : (isLight ? '#16a34a' : '#10b981')} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Surveyor Bertugas
                        </div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff' }}>
                          {item.nama}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div
                      style={{
                        padding: '0.3rem 0.85rem',
                        borderRadius: '20px',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: isLight
                          ? (isOnProses ? '#e0f2fe' : '#dcfce7')
                          : (isOnProses ? 'rgba(2, 132, 199, 0.25)' : 'rgba(16, 185, 129, 0.25)'),
                        color: isLight
                          ? (isOnProses ? '#0284c7' : '#15803d')
                          : (isOnProses ? '#38bdf8' : '#34d399'),
                        border: isLight
                          ? (isOnProses ? '1px solid #7dd3fc' : '1px solid #86efac')
                          : (isOnProses ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(52, 211, 153, 0.5)')
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: isOnProses ? (isLight ? '#0284c7' : '#38bdf8') : (isLight ? '#16a34a' : '#10b981') }}></span>
                      {isOnProses ? 'On Proses' : 'Selesai'}
                    </div>
                  </div>

                  {/* Ship & Location Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {/* Ship Name */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                      <Anchor size={20} color={isLight ? '#0284c7' : '#38bdf8'} style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                          Nama Kapal
                        </div>
                        <div style={{ fontSize: '1.25rem', color: isLight ? '#1e3a8a' : '#ffffff', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          {item.namaKapal}
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                      <MapPin size={20} color={isLight ? '#d97706' : '#f59e0b'} style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                          Lokasi Survei
                        </div>
                        <div style={{ fontSize: '1.05rem', color: isLight ? '#b45309' : '#fbbf24', fontWeight: 800, textTransform: 'uppercase' }}>
                          {item.lokasi || 'Pontianak'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visit Time Schedule Badge */}
                  <div
                    style={{
                      background: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.75)',
                      border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(56, 189, 248, 0.2)',
                      borderRadius: '12px',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Clock size={16} color={isLight ? '#0284c7' : '#38bdf8'} />
                      <span style={{ fontSize: '0.78rem', color: isLight ? '#475569' : '#94a3b8', fontWeight: 700 }}>
                        {item.durasi ? `Waktu (${item.durasi} Jam):` : 'Waktu Visit:'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: isLight ? '#64748b' : '#94a3b8' }}>Berangkat</div>
                        <div style={{ fontSize: '0.98rem', fontWeight: 900, color: isLight ? '#0284c7' : '#38bdf8', fontFamily: 'monospace' }}>
                          {item.jamBerangkat} WIB
                        </div>
                      </div>
                      <span style={{ color: isLight ? '#94a3b8' : '#64748b', fontWeight: 800 }}>➔</span>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: isLight ? '#64748b' : '#94a3b8' }}>Selesai</div>
                        <div style={{ fontSize: '0.98rem', fontWeight: 900, color: isOnProses ? (isLight ? '#0284c7' : '#38bdf8') : (isLight ? '#15803d' : '#10b981'), fontFamily: 'monospace' }}>
                          {item.jamSelesai ? `${item.jamSelesai} WIB` : '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Keterangan untuk Visit Entries */}
                  {item.source === 'visit' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <span style={{ fontSize: '0.72rem', color: isLight ? '#475569' : '#64748b', fontStyle: 'italic' }}>
                        {item.keterangan || 'Visit Lapangan BKI'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80%', gap: '1.25rem', color: isLight ? '#64748b' : '#64748b' }}>
            <Clock size={64} color={isLight ? '#cbd5e1' : '#334155'} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: isLight ? '#1e293b' : '#94a3b8' }}>
                Tidak Ada Aktivitas Visit Survei pada {formattedSelectedDate}
              </p>
              <p style={{ margin: '0.5rem 0 1.25rem', fontSize: '0.92rem', color: isLight ? '#64748b' : '#64748b' }}>
                {isSelectedToday
                  ? 'Belum ada aktivitas visit survei yang dijadwalkan untuk hari ini.'
                  : `Tidak ada data kunjungan survei kapal yang tercatat untuk tanggal ${formattedSelectedDate}.`}
              </p>
              {!isSelectedToday && (
                <button
                  type="button"
                  onClick={handleToday}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    boxShadow: '0 2px 10px rgba(2, 132, 199, 0.4)'
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Kembali ke Hari Ini</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Form Visit Survei */}
      <VisitSurveiModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingVisit(null); }}
        onSave={handleSaveVisit}
        initialData={editingVisit}
        isEdit={!!editingVisit}
      />
    </div>
  );
};
