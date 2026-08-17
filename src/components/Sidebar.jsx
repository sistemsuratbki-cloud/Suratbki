import React from 'react';
import { LayoutDashboard, FileCheck, Receipt, BarChart2, Users, Settings, LogOut, Compass } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { filterDataByRole } from '../utils/filterData';
import { BKILogo } from './BKILogo';

export const Sidebar = ({ activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { suratTugas, kwitansiHonor, laporanSurvei, tariffs } = useData();
  const { currentUser, role, usersList, logout } = useAuth();

  const filteredSurat = filterDataByRole(suratTugas, currentUser, role, 'petugas');
  const filteredKwitansi = filterDataByRole(kwitansiHonor, currentUser, role, 'penerima');
  const filteredLaporan = filterDataByRole(laporanSurvei, currentUser, role, 'petugas');

  const unpaidCount = filteredKwitansi.filter((item) => item.status === 'Belum Dibayar').length;
  const draftCount = filteredLaporan.filter((item) => item.status === 'Draf').length;

  const menuItems = [
    {
      id: 'calendar',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'surat_sps',
      label: role === 'surveyor' ? 'Tugas Saya (SPS)' : 'Surat Tugas BKI (SPS)',
      icon: FileCheck,
      badge: filteredSurat.length
    },
    {
      id: 'surat_pds',
      label: role === 'surveyor' ? 'Tugas Saya (PDS)' : 'Surat Tugas BKI (PDS)',
      icon: FileCheck,
      badge: filteredSurat.length
    },
    {
      id: 'kwitansi',
      label: 'Kwitansi Honor',
      icon: Receipt,
      badge: unpaidCount > 0 ? unpaidCount : null,
      badgeColor: '#ef4444'
    },
    {
      id: 'laporan',
      label: 'Laporan Survei',
      icon: BarChart2,
      badge: draftCount > 0 ? draftCount : null
    }
  ];

  // Restricted Access: Admin, Kacab, and Finance (Keuangan)
  if (role === 'admin' || role === 'kacab' || role === 'keuangan') {
    menuItems.push({
      id: 'tariffs',
      label: 'Manajemen Tarif',
      icon: Compass,
      badge: tariffs ? tariffs.length : null,
      badgeColor: '#0284c7'
    });
  }

  if (role === 'admin') {
    menuItems.push({
      id: 'users',
      label: 'Manajemen User',
      icon: Users,
      badge: usersList ? usersList.length : null,
      badgeColor: '#1e3a8a'
    });
  }

  menuItems.push({
    id: 'settings',
    label: 'Pengaturan',
    icon: Settings,
    badge: null
  });

  return (
    <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
      {/* BKI Brand Logo Header */}
      <div className="sidebar-brand" style={{ gap: '0.65rem' }}>
        <BKILogo size={34} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="sidebar-brand-name" style={{ fontSize: '0.95rem', fontWeight: 800 }}>BKI Pontianak</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Klasifikasi Indonesia
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id);
                if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
              }}
            >
              <Icon size={19} className="sidebar-link-icon" />
              <span className="sidebar-link-text">{item.label}</span>
              {item.badge !== null && item.badge !== undefined && (
                <span
                  className="sidebar-badge"
                  style={{ background: item.badgeColor || 'var(--border-color-strong)' }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom User Info & Logout */}
      {currentUser && (
        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={logout} title="Keluar dari sistem">
            <LogOut size={16} />
            <span>Keluar Akun BKI</span>
          </button>
        </div>
      )}
    </aside>
  );
};
