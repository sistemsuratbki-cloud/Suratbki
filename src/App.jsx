import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { CalendarView } from './components/CalendarView';
import { SuratTugasTable } from './components/SuratTugasTable';
import { LaporanTable } from './components/LaporanTable';
import { UserManagementTable } from './components/UserManagementTable';
import { TariffManagementTable } from './components/TariffManagementTable';
import { GradeTariffManagementTable } from './components/GradeTariffManagementTable';
import { SettingsTab } from './components/SettingsTab';
import { LoginScreen } from './components/LoginScreen';
import { TvDisplay } from './components/TvDisplay';

function AppContent() {
  const { isAuthenticated, role, logout, usersList } = useAuth();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('st_theme') || 'light';
  });

  const [activeTab, setActiveTab] = useState('calendar');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dashboardSurveyorFilter, setDashboardSurveyorFilter] = useState('');

  const surveyorUsers = usersList ? usersList.filter(u => u.role === 'surveyor' || u.role === 'kacab') : [];

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
              <SummaryCards surveyorFilter={dashboardSurveyorFilter} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <CalendarView surveyorFilter={dashboardSurveyorFilter} />
              </div>
            </>
          )}

          {activeTab === 'surat_sps' && <SuratTugasTable filterType="SPS" />}
          {activeTab === 'surat_pds' && <SuratTugasTable filterType="PDS" />}
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

import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Toaster position="top-center" />
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}
