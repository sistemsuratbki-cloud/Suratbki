import React, { useState } from 'react';
import { Sun, Moon, RotateCcw, LogOut, User, Menu, Monitor } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from './ConfirmModal';
import { BKILogo } from './BKILogo';

export const Header = ({ theme, setTheme, setIsMobileMenuOpen, setActiveTab }) => {
  const { resetData } = useData();
  const { currentUser, logout } = useAuth();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleConfirmReset = async () => {
    try {
      await resetData();
      setIsResetConfirmOpen(false);
      toast.success('Data SPS, PDS, Laporan, dan Kwitansi berhasil direset! (Data Tarif, User, dan Kapal tetap tersimpan)');
    } catch (e) {
      toast.error('Gagal mereset data.');
      console.error(e);
    }
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
        {(currentUser?.role === 'developer' || currentUser?.role === 'admin') && (
          <button
            onClick={() => setActiveTab && setActiveTab('tv-display')}
            className="btn btn-primary btn-sm"
            title="Buka Layar Monitor Kegiatan Survei"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            <Monitor size={14} />
            <span>Monitor Survei</span>
          </button>
        )}

        {(currentUser?.role === 'developer' || currentUser?.role === 'admin' || currentUser?.role === 'kacab') && (
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="btn btn-secondary btn-sm"
            title="Reset data ke kondisi awal"
          >
            <RotateCcw size={14} />
            <span>Reset Data</span>
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
        title="Konfirmasi Reset Data"
        message="Tindakan ini akan menghapus semua data Surat Tugas (SPS & PDS), Laporan BKI, Kwitansi, dan Lampiran dari sistem lokal & Cloud Supabase. Data Manajemen Tarif, Manajemen User, dan Database Kapal TIDAK AKAN DIHAPUS. Masukkan password untuk melanjutkan."
        confirmText="Ya, Reset Data"
        type="danger"
        requirePassword={true}
      />
    </header>
  );
};
