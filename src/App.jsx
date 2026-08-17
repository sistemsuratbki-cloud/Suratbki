import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { CalendarView } from './components/CalendarView';
import { RecentActivity } from './components/RecentActivity';
import { SuratTugasTable } from './components/SuratTugasTable';
import { KwitansiTable } from './components/KwitansiTable';
import { LaporanTable } from './components/LaporanTable';
import { UserManagementTable } from './components/UserManagementTable';
import { TariffManagementTable } from './components/TariffManagementTable';
import { GradeTariffManagementTable } from './components/GradeTariffManagementTable';
import { SettingsTab } from './components/SettingsTab';
import { LoginScreen } from './components/LoginScreen';
import { TvDisplay } from './components/TvDisplay';

function AppContent() {
  const { isAuthenticated, role, logout } = useAuth();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('st_theme') || 'light';
  });

  const [activeTab, setActiveTab] = useState('calendar');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('st_theme', theme);
  }, [theme]);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Force TV Display mode for monitor role
  if (role === 'monitor' || activeTab === 'tv-display') {
    return <TvDisplay onClose={role === 'monitor' ? logout : () => setActiveTab('calendar')} isMonitorRole={role === 'monitor'} />;
  }

  return (
    <div className="app-container-v2">
      {isMobileMenuOpen && (
        <div 
          className="mobile-overlay" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <div className="main-panel">
        <Header 
          theme={theme} 
          setTheme={setTheme} 
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        <main className="main-content-v2">
          {activeTab === 'calendar' && (
            <>
              <SummaryCards />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <CalendarView />
              </div>
            </>
          )}

          {activeTab === 'surat_sps' && <SuratTugasTable filterType="SPS" />}
          {activeTab === 'surat_pds' && <SuratTugasTable filterType="PDS" />}
          {activeTab === 'kwitansi' && <KwitansiTable />}
          {activeTab === 'laporan' && <LaporanTable />}
          {activeTab === 'tariffs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <GradeTariffManagementTable />
              <TariffManagementTable />
            </div>
          )}
          {activeTab === 'users' && <UserManagementTable />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}
