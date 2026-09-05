import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { CalendarView } from './components/CalendarView';
import { LoginScreen } from './components/LoginScreen';

// Lazy loaded heavy tab components to reduce initial bundle by >70%
const SuratTugasTable = lazy(() => import('./components/SuratTugasTable').then(m => ({ default: m.SuratTugasTable })));
const LaporanTable = lazy(() => import('./components/LaporanTable').then(m => ({ default: m.LaporanTable })));
const LaporanParafTable = lazy(() => import('./components/LaporanParafTable').then(m => ({ default: m.LaporanParafTable })));
const BukuAgendaTable = lazy(() => import('./components/BukuAgendaTable').then(m => ({ default: m.BukuAgendaTable })));
const UserManagementTable = lazy(() => import('./components/UserManagementTable').then(m => ({ default: m.UserManagementTable })));
const TariffManagementTable = lazy(() => import('./components/TariffManagementTable').then(m => ({ default: m.TariffManagementTable })));
const GradeTariffManagementTable = lazy(() => import('./components/GradeTariffManagementTable').then(m => ({ default: m.GradeTariffManagementTable })));
const SettingsTab = lazy(() => import('./components/SettingsTab').then(m => ({ default: m.SettingsTab })));
const TvDisplay = lazy(() => import('./components/TvDisplay').then(m => ({ default: m.TvDisplay })));
const ShipDatabaseManagementTable = lazy(() => import('./components/ShipDatabaseManagementTable').then(m => ({ default: m.ShipDatabaseManagementTable })));
const VisitSurveiTable = lazy(() => import('./components/VisitSurveiTable').then(m => ({ default: m.VisitSurveiTable })));

function TabLoadingFallback() {
  return (
    <div style={{
      minHeight: '400px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      color: 'var(--text-secondary, #64748b)'
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        border: '3px solid rgba(2, 132, 199, 0.2)',
        borderTopColor: 'var(--primary-color, #0284c7)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Memuat modul...</span>
    </div>
  );
}

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

  const surveyorUsers = usersList ? usersList.filter(u => u.role === 'surveyor' || u.role === 'kacab') : [];

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
    return (
      <Suspense fallback={<TabLoadingFallback />}>
        <TvDisplay onClose={role === 'monitor' ? logout : () => setActiveTab(isFinance ? 'laporan_pds' : 'calendar')} isMonitorRole={role === 'monitor'} />
      </Suspense>
    );
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

          <Suspense fallback={<TabLoadingFallback />}>
            {(activeTab === 'surat' || activeTab === 'surat_sps') && !isFinance && <SuratTugasTable filterType="SPS" />}
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
          </Suspense>
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
