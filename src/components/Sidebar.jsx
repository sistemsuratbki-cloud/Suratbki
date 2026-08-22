import React, { useState } from 'react';
import { LayoutDashboard, FileCheck, Receipt, BarChart2, Users, Settings, LogOut, Compass, Monitor, ChevronDown, ChevronUp } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { filterDataByRole } from '../utils/filterData';
import { BKILogo } from './BKILogo';

export const Sidebar = ({ activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { suratTugas, kwitansiHonor, laporanSurvei, tariffs } = useData();
  const { currentUser, role, usersList, logout } = useAuth();
  
  const [expandedMenus, setExpandedMenus] = useState({ surat: true, laporan: true });

  const filteredSurat = filterDataByRole(suratTugas, currentUser, role, 'petugas');
  const filteredKwitansi = filterDataByRole(kwitansiHonor, currentUser, role, 'penerima');
  const filteredLaporan = filterDataByRole(laporanSurvei, currentUser, role, 'petugas');

  const spsCount = filteredSurat.filter((st) => st.docType !== 'PDS').length;
  const pdsCount = filteredSurat.filter((st) => st.docType === 'PDS' || st.isPds || (st.status !== 'Menunggu Survei' && !st.isSps)).length;
  const parafCount = filteredSurat.filter((item) => item.visit === '1' || item.visit === 1 || item.visit === true).length;
  const unpaidCount = filteredKwitansi.filter((item) => item.status === 'Belum Dibayar').length;
  const draftCount = filteredLaporan.filter((item) => item.status === 'Draf').length;

  const toggleMenu = (id) => {
    setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isFinance = role === 'finance' || role === 'keuangan';

  const suratSubItems = [
    {
      id: 'surat_sps',
      label: 'SPS',
      badge: spsCount
    }
  ];

  if (!isFinance && (role === 'admin' || role === 'developer' || role === 'kacab')) {
    suratSubItems.push({
      id: 'surat_pds',
      label: 'PDS',
      badge: pdsCount
    });
  }

  const menuItems = [];

  if (!isFinance) {
    menuItems.push({
      id: 'calendar',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    });

    menuItems.push({
      id: 'surat',
      label: 'Surat Tugas BKI',
      icon: FileCheck,
      badge: null,
      subItems: suratSubItems
    });
  }

  // Restricted Access for Laporan: Admin, Developer, Kacab, and Finance (Keuangan)
  if (role === 'admin' || role === 'developer' || role === 'kacab' || role === 'keuangan') {
    menuItems.push({
      id: 'laporan',
      label: 'Laporan BKI',
      icon: BarChart2,
      badge: null,
      subItems: [
        {
          id: 'laporan_pds',
          label: 'Laporan PDS',
          badge: filteredLaporan.length
        },
        {
          id: 'laporan_paraf',
          label: 'Laporan Paraf',
          badge: parafCount > 0 ? parafCount : null,
          badgeColor: '#2563eb'
        },
        {
          id: 'buku_agenda',
          label: 'Buku Agenda',
          badge: filteredSurat.length > 0 ? filteredSurat.length : null,
          badgeColor: '#059669'
        }
      ]
    });
  }

  // Restricted Access: Admin, Kacab, and Finance (Keuangan)
  if (role === 'admin' || role === 'developer' || role === 'kacab' || role === 'keuangan') {
    menuItems.push({
      id: 'tariffs',
      label: 'Manajemen Tarif',
      icon: Compass,
      badge: tariffs ? tariffs.length : null,
      badgeColor: '#0284c7'
    });
  }

  if (role === 'admin' || role === 'developer') {
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

  if (role === 'admin' || role === 'developer') {
    menuItems.push({
      id: 'tv-display',
      label: 'Layar Monitor (TV)',
      icon: Monitor,
      badge: null
    });
  }

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
          const isActive = activeTab === item.id || (item.subItems && item.subItems.some(sub => sub.id === activeTab));

          return (
            <div key={item.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <button
                className={`sidebar-link ${isActive && !item.subItems ? 'active' : ''}`}
                style={{ 
                  fontWeight: isActive ? 800 : 600, 
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)' 
                }}
                onClick={() => {
                  if (item.subItems) {
                    toggleMenu(item.id);
                  } else {
                    setActiveTab(item.id);
                    if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
                  }
                }}
              >
                <Icon size={19} className="sidebar-link-icon" style={{ color: isActive ? 'var(--accent-primary)' : 'inherit' }} />
                <span className="sidebar-link-text">{item.label}</span>
                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className="sidebar-badge"
                    style={{ background: item.badgeColor || 'var(--border-color-strong)' }}
                  >
                    {item.badge}
                  </span>
                )}
                {item.subItems && (
                  expandedMenus[item.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                )}
              </button>

              {item.subItems && expandedMenus[item.id] && (
                <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '1.25rem', marginTop: '0.25rem', gap: '0.15rem' }}>
                  {item.subItems.map(sub => {
                    const isSubActive = activeTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        className={`sidebar-link ${isSubActive ? 'active' : ''}`}
                        style={{ padding: '0.4rem 0.5rem', fontSize: '0.85rem' }}
                        onClick={() => {
                          setActiveTab(sub.id);
                          if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
                        }}
                      >
                        {isSubActive && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-primary)', marginRight: '0.4rem', marginLeft: '0.5rem' }} />}
                        {!isSubActive && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--text-muted)', marginRight: '0.4rem', marginLeft: '0.5rem' }} />}
                        <span className="sidebar-link-text">{sub.label}</span>
                        {sub.badge !== null && sub.badge !== undefined && (
                          <span
                            className="sidebar-badge"
                            style={{ background: sub.badgeColor || 'var(--border-color-strong)', fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}
                          >
                            {sub.badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
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

