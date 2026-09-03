import React from 'react';
import { ClipboardList, BarChart2, TrendingUp, Check, Monitor, ExternalLink } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { filterDataByRole, isSameSurveyor } from '../utils/filterData';

export const SummaryCards = ({ surveyorFilter, onOpenMonitor }) => {
  const { suratTugas } = useData();
  const { currentUser, role, usersList } = useAuth();

  // Sinkronkan filter dengan CalendarView (hanya menghitung dokumen PDS yang tampil di kalender)
  const isPdsItem = (st) => st.docType === 'PDS' || st.isPds || (st.status !== 'Menunggu Survei' && !st.isSps && st.docType !== 'SPS');

  const filteredSurat = filterDataByRole(suratTugas, currentUser, role, 'petugas')
    .filter(item => !surveyorFilter || isSameSurveyor(item.petugas, surveyorFilter, usersList))
    .filter(item => isPdsItem(item));

  const totalSurat = filteredSurat.length;
  // Hitung survei selesai berdasarkan dokumen PDS yang berstatus Selesai atau sudah ACC
  const surveiSelesai = filteredSurat.filter(
    (item) => item.status === 'Selesai' || item.approvalStatus === 'ACC'
  ).length;

  const isPersonalView = role === 'surveyor' || role === 'kacab' || role === 'kacap';
  const canMonitor = role === 'kacab' || role === 'kacap' || role === 'admin' || role === 'developer';

  return (
    <div
      className="summary-grid"
      style={{
        gridTemplateColumns: canMonitor ? 'repeat(auto-fit, minmax(240px, 1fr))' : 'repeat(2, 1fr)',
        gap: '1rem',
        marginBottom: '1.15rem'
      }}
    >
      {/* Card 1: TOTAL SURAT TUGAS / TUGAS SAYA */}
      <div className="kpi-card-v2">
        <div className="kpi-v2-info">
          <div className="kpi-v2-title">
            {isPersonalView ? 'TUGAS SURVEI SAYA' : 'TOTAL SURAT TUGAS'}
          </div>
          <div className="kpi-v2-value">{totalSurat}</div>
          <div className="kpi-v2-subtext" style={{ color: '#10b981' }}>
            <TrendingUp size={13} />
            <span>{isPersonalView ? 'Penugasan Anda' : 'Total Penugasan'}</span>
          </div>
        </div>
        <div className="kpi-v2-icon-box" style={{ background: '#1e3a8a', color: '#ffffff' }}>
          <ClipboardList size={18} />
        </div>
      </div>

      {/* Card 2: SURVEI SELESAI */}
      <div className="kpi-card-v2">
        <div className="kpi-v2-info">
          <div className="kpi-v2-title">SURVEI SELESAI</div>
          <div className="kpi-v2-value">{surveiSelesai}</div>
          <div className="kpi-v2-subtext" style={{ color: '#10b981' }}>
            <Check size={13} />
            <span>{isPersonalView ? 'Terlaksana / Selesai' : 'Telah Terlaksana'}</span>
          </div>
        </div>
        <div className="kpi-v2-icon-box" style={{ background: '#065f46', color: '#ffffff' }}>
          <BarChart2 size={18} />
        </div>
      </div>

      {/* Card 3: FITUR MONITORING KEGIATAN SURVEI (Untuk Kacab & Admin) */}
      {canMonitor && (
        <div
          className="kpi-card-v2"
          onClick={onOpenMonitor}
          style={{
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#ffffff'
          }}
          title="Klik untuk membuka Layar Monitor Kegiatan Survei Real-time"
        >
          <div className="kpi-v2-info">
            <div className="kpi-v2-title" style={{ color: '#38bdf8' }}>
              MONITOR KEGIATAN
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>
              Layar TV Monitor
            </div>
            <div className="kpi-v2-subtext" style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ExternalLink size={12} color="#38bdf8" />
              <span style={{ color: '#38bdf8', fontWeight: 700 }}>Buka Tampilan Live &raquo;</span>
            </div>
          </div>
          <div className="kpi-v2-icon-box" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>
            <Monitor size={18} />
          </div>
        </div>
      )}
    </div>
  );
};
