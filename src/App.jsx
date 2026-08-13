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
import { SettingsTab } from './components/SettingsTab';
import { LoginScreen } from './components/LoginScreen';

function AppContent() {
  const { isAuthenticated } = useAuth();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('st_theme') || 'light';
  });

  const [activeTab, setActiveTab] = useState('calendar');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('st_theme', theme);
  }, [theme]);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="app-container-v2">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="main-panel">
        <Header theme={theme} setTheme={setTheme} />

        <main className="main-content-v2">
          {activeTab === 'calendar' && (
            <>
              <SummaryCards />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <CalendarView />
                <RecentActivity setActiveTab={setActiveTab} />
              </div>
            </>
          )}

          {activeTab === 'surat' && <SuratTugasTable />}
          {activeTab === 'kwitansi' && <KwitansiTable />}
          {activeTab === 'laporan' && <LaporanTable />}
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
