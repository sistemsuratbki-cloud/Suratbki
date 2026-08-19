import React, { useState } from 'react';
import { Sun, Moon, RotateCcw, LogOut, User, Menu } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from './ConfirmModal';
import { BKILogo } from './BKILogo';

export const Header = ({ theme, setTheme, setIsMobileMenuOpen }) => {
  const { resetDemoData } = useData();
  const { currentUser, logout, resetUsers } = useAuth();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleConfirmReset = () => {
    resetDemoData();
    resetUsers();
  };

  const getRolePanelTitle = () => {
    if (!currentUser) return 'BKI Pontianak — Portal Utama';
    switch (currentUser.role) {
      case 'admin':
        return 'BKI Pontianak — Panel Admin Utama';
      case 'surveyor':
        return 'BKI Pontianak — Panel Class Surveyor';
      case 'keuangan':
        return 'BKI Pontianak — Panel Staff Keuangan';
      case 'kacab':
        return 'BKI Pontianak — Panel Kepala Cabang';
      default:
        return 'BKI Pontianak — Portal Utama';
    }
  };

  return (
    <header className="main-header">
      <div className="header-left" style={{ gap: '0.65rem' }}>
        <button 
          className="mobile-menu-btn btn-icon btn-secondary" 
          onClick={() => setIsMobileMenuOpen(true)}
          style={{ display: 'none' }} // Handled via CSS later, but let's just use CSS for it
        >
          <Menu size={20} />
        </button>
        <BKILogo size={26} />
        <span className="header-panel-title">{getRolePanelTitle()}</span>
      </div>

      <div className="header-right">
        {currentUser?.role === 'developer' && (
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="btn btn-secondary btn-sm"
            title="Kosongkan seluruh data tugas, kwitansi, dan laporan (Khusus Developer)"
          >
            <RotateCcw size={14} />
            <span>Kosongkan Data</span>
          </button>
        )}

        <button
          onClick={toggleTheme}
          className="btn btn-secondary btn-icon"
          title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
        >
          {theme === 'dark' ? <Sun size={17} color="#f59e0b" /> : <Moon size={17} color="#1e3a8a" />}
        </button>

        {currentUser && (
          <div className="user-profile-header">
            <div style={{ textAlign: 'right' }}>
              <div className="user-profile-name">{currentUser.name}</div>
              <div className="user-profile-sub">BKI Cabang Pontianak v1.2</div>
            </div>

            <div className="user-profile-avatar" style={{ background: currentUser.avatarBg || '#1e3a8a' }}>
              {currentUser.name ? currentUser.name.charAt(0) : <User size={16} />}
            </div>

            <button
              onClick={logout}
              className="btn btn-danger btn-icon btn-sm"
              title="Keluar Akun"
              style={{ marginLeft: '0.25rem' }}
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleConfirmReset}
        title="Konfirmasi Kosongkan Data"
        message="Tindakan ini akan mengosongkan seluruh data Surat Tugas, Kwitansi Honor, dan Laporan Survei. Masukkan password developer Anda untuk melanjutkan."
        confirmText="Ya, Kosongkan Data"
        type="warning"
        requirePassword={true}
      />
    </header>
  );
};
