import React from 'react';
import { ClipboardList, BarChart2, TrendingUp, Check } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { filterDataByRole } from '../utils/filterData';

export const SummaryCards = ({ surveyorFilter }) => {
  const { suratTugas, kwitansiHonor, laporanSurvei } = useData();
  const { currentUser, role } = useAuth();

  const filteredSurat = filterDataByRole(suratTugas, currentUser, role, 'petugas')
    .filter(item => !surveyorFilter || item.petugas === surveyorFilter);
  const filteredLaporan = filterDataByRole(laporanSurvei, currentUser, role, 'petugas')
    .filter(item => !surveyorFilter || item.petugas === surveyorFilter);

  const totalSurat = filteredSurat.length;
  // Sinkronkan hitungan Survei Selesai berdasarkan status Selesai atau dokumen PDS yang telah terbit
  const surveiSelesai = filteredSurat.filter(
    (item) => item.status === 'Selesai' || item.docType === 'PDS' || item.isPds
  ).length;

  return (
    <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.15rem' }}>
      {/* Card 1: TOTAL SURAT TUGAS */}
      <div className="kpi-card-v2">
        <div className="kpi-v2-info">
          <div className="kpi-v2-title">
            {role === 'surveyor' ? 'TUGAS SURVEI SAYA' : 'TOTAL SURAT TUGAS'}
          </div>
          <div className="kpi-v2-value">{totalSurat}</div>
          <div className="kpi-v2-subtext" style={{ color: '#10b981' }}>
            <TrendingUp size={13} />
            <span>{role === 'surveyor' ? 'Penugasan Anda' : 'Total Penugasan'}</span>
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
            <span>{role === 'surveyor' ? 'Terlaksana / Selesai' : 'Telah Terlaksana'}</span>
          </div>
        </div>
        <div className="kpi-v2-icon-box" style={{ background: '#065f46', color: '#ffffff' }}>
          <BarChart2 size={18} />
        </div>
      </div>
    </div>
  );
};
