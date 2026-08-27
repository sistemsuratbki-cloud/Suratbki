import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { CalendarView } from './components/CalendarView';
import { SuratTugasTable } from './components/SuratTugasTable';
import { LaporanTable } from './components/LaporanTable';
import { LaporanParafTable } from './components/LaporanParafTable';
import { BukuAgendaTable } from './components/BukuAgendaTable';
import { UserManagementTable } from './components/UserManagementTable';
import { TariffManagementTable } from './components/TariffManagementTable';
import { GradeTariffManagementTable } from './components/GradeTariffManagementTable';
import { SettingsTab } from './components/SettingsTab';
import { LoginScreen } from './components/LoginScreen';
import { TvDisplay } from './components/TvDisplay';
import { ShipDatabaseManagementTable } from './components/ShipDatabaseManagementTable';
import { VisitSurveiTable } from './components/VisitSurveiTable';

function AppContent() {
  const { isAuthenticated, role, logout, usersList } = useAuth();
  const isFinance = role === 'finance' || role === 'keuangan';

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('st_theme') || 'light';
  });

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedUser = localStorage.getItem('st_auth_user');
      const userRole = savedUser ? JSON.parse(savedUser).role : null;
      return (userRole === 'finance' || userRole === 'keuangan') ? 'laporan_pds' : 'calendar';
    } catch {
      return 'calendar';
    }
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dashboardSurveyorFilter, setDashboardSurveyorFilter] = useState('');

  const surveyorUsers = usersList ? usersList.filter(u => u.role === 'surveyor') : [];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('st_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (isFinance && (activeTab === 'calendar' || activeTab.startsWith('surat'))) {
      setActiveTab('laporan_pds');
    }
  }, [isFinance, activeTab]);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Layar Monitor TV hanya dapat diakses oleh Kepala Cabang, Admin, Developer, dan Akun Monitor
  const canAccessMonitor = role === 'admin' || role === 'kacab' || role === 'developer' || role === 'monitor';
  if (role === 'monitor' || (activeTab === 'tv-display' && canAccessMonitor)) {
    return <TvDisplay onClose={role === 'monitor' ? logout : () => setActiveTab(isFinance ? 'laporan_pds' : 'calendar')} isMonitorRole={role === 'monitor'} />;
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
          setActiveTab={setActiveTab}
        />

        <main className="main-content-v2">
          {activeTab === 'calendar' && !isFinance && (
            <>
              {(role === 'admin' || role === 'developer') && (
                <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Filter Surveyor:</label>
                  <select 
                    className="form-select" 
                    style={{ width: '250px' }}
                    value={dashboardSurveyorFilter}
                    onChange={(e) => setDashboardSurveyorFilter(e.target.value)}
                  >
                    <option value="">-- Semua Surveyor --</option>
                    {surveyorUsers.map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <SummaryCards surveyorFilter={dashboardSurveyorFilter} onOpenMonitor={() => setActiveTab('tv-display')} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <CalendarView surveyorFilter={dashboardSurveyorFilter} />
              </div>
            </>
          )}

          {activeTab === 'surat_sps' && !isFinance && <SuratTugasTable filterType="SPS" />}
          {activeTab === 'surat_pds' && !isFinance && <SuratTugasTable filterType="PDS" />}
          {activeTab === 'visit_survei' && !isFinance && <VisitSurveiTable onOpenMonitor={() => setActiveTab('tv-display')} />}
          {(activeTab === 'laporan' || activeTab === 'laporan_pds') && <LaporanTable />}
          {activeTab === 'laporan_paraf' && <LaporanParafTable />}
          {activeTab === 'buku_agenda' && <BukuAgendaTable />}
          {activeTab === 'tariffs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <GradeTariffManagementTable />
              <TariffManagementTable />
            </div>
          )}
          {activeTab === 'users' && <UserManagementTable />}
          {activeTab === 'ship_database' && <ShipDatabaseManagementTable />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <Toaster position="top-center" />
          <AppContent />
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
