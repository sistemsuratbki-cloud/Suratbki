import React from 'react';
import { Calendar, FileCheck, Receipt, ClipboardList } from 'lucide-react';
import { useData } from '../context/DataContext';

export const Navigation = ({ activeTab, setActiveTab }) => {
  const { suratTugas, kwitansiHonor, laporanSurvei } = useData();

  const unpaidCount = kwitansiHonor.filter((item) => item.status === 'Belum Dibayar').length;
  const draftCount = laporanSurvei.filter((item) => item.status === 'Draf').length;

  return (
    <nav className="nav-bar">
      <div className="nav-inner">
        <button
          className={`nav-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <Calendar size={18} />
          <span>Kalender & Ringkasan</span>
        </button>

        <button
          className={`nav-btn ${activeTab === 'surat' ? 'active' : ''}`}
          onClick={() => setActiveTab('surat')}
        >
          <FileCheck size={18} />
          <span>Surat Tugas</span>
          <span className="nav-badge">{suratTugas.length}</span>
        </button>

        <button
          className={`nav-btn ${activeTab === 'kwitansi' ? 'active' : ''}`}
          onClick={() => setActiveTab('kwitansi')}
        >
          <Receipt size={18} />
          <span>Kwitansi Honor</span>
          {unpaidCount > 0 && <span className="nav-badge" style={{ background: '#f59e0b', color: '#000' }}>{unpaidCount} belum bayar</span>}
        </button>

        <button
          className={`nav-btn ${activeTab === 'laporan' ? 'active' : ''}`}
          onClick={() => setActiveTab('laporan')}
        >
          <ClipboardList size={18} />
          <span>Laporan Survei</span>
          {draftCount > 0 && <span className="nav-badge">{draftCount} draf</span>}
        </button>
      </div>
    </nav>
  );
};
