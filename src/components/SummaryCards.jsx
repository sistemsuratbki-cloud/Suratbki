import React from 'react';
import { ClipboardList, Receipt, BarChart2, TrendingUp, AlertTriangle, Check } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { filterDataByRole } from '../utils/filterData';

export const SummaryCards = ({ surveyorFilter }) => {
  const { suratTugas, kwitansiHonor, laporanSurvei } = useData();
  const { currentUser, role } = useAuth();

  const filteredSurat = filterDataByRole(suratTugas, currentUser, role, 'petugas')
    .filter(item => !surveyorFilter || item.petugas === surveyorFilter);
  const filteredKwitansi = filterDataByRole(kwitansiHonor, currentUser, role, 'penerima')
    .filter(item => !surveyorFilter || item.penerima === surveyorFilter);
  const filteredLaporan = filterDataByRole(laporanSurvei, currentUser, role, 'petugas')
    .filter(item => !surveyorFilter || item.petugas === surveyorFilter);


  const totalSurat = filteredSurat.length;
  const pendingKwitansi = filteredKwitansi.filter((k) => k.status === 'Belum Dibayar').length;
  const surveiSelesai = filteredLaporan.filter((l) => l.status === 'Disetujui').length;

  return (
    <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.15rem' }}>
      {/* Card 1: TOTAL SURAT TUGAS */}
      <div className="kpi-card-v2">
        <div className="kpi-v2-info">
          <div className="kpi-v2-title">
            {role === 'surveyor' ? 'TUGAS SURVEI SAYA' : 'TOTAL SURAT TUGAS'}
          </div>
          <div className="kpi-v2-value">{totalSurat}</div>
          <div className="kpi-v2-subtext" style={{ color: '#10b981' }}>
            <TrendingUp size={13} />
            <span>{role === 'surveyor' ? 'Penugasan Anda' : '+12% dari bulan lalu'}</span>
          </div>
        </div>
        <div className="kpi-v2-icon-box" style={{ background: '#1e3a8a', color: '#ffffff' }}>
          <ClipboardList size={18} />
        </div>
      </div>

      {/* Card 2: PENDING KWITANSI */}
      <div className="kpi-card-v2">
        <div className="kpi-v2-info">
          <div className="kpi-v2-title">
            {role === 'surveyor' ? 'HONOR TERTUNDA' : 'PENDING KWITANSI'}
          </div>
          <div className="kpi-v2-value" style={{ color: '#dc2626' }}>
            {pendingKwitansi}
          </div>
          <div className="kpi-v2-subtext" style={{ color: '#dc2626' }}>
            <AlertTriangle size={13} />
            <span>Perlu tindakan segera</span>
          </div>
        </div>
        <div className="kpi-v2-icon-box" style={{ background: '#fee2e2', color: '#dc2626' }}>
          <Receipt size={18} />
        </div>
      </div>

      {/* Card 3: SURVEI SELESAI */}
      <div className="kpi-card-v2">
        <div className="kpi-v2-info">
          <div className="kpi-v2-title">SURVEI SELESAI</div>
          <div className="kpi-v2-value">{surveiSelesai}</div>
          <div className="kpi-v2-subtext" style={{ color: 'var(--text-secondary)' }}>
            <Check size={13} />
            <span>Telah Disetujui</span>
          </div>
        </div>
        <div className="kpi-v2-icon-box" style={{ background: '#065f46', color: '#ffffff' }}>
          <BarChart2 size={18} />
        </div>
      </div>
    </div>
  );
};
