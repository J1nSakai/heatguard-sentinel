import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { SafetyProvider } from './context/SafetyContext';
import { ToastContainer } from './components/common/ToastContainer';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { WorkersPage } from './pages/WorkersPage';
import { WorkerDetailPage } from './pages/WorkerDetailPage';
import { MapPage } from './pages/MapPage';
import { SitesPage } from './pages/SitesPage';
import { AlertsPage } from './pages/AlertsPage';
import { ReportsPage } from './pages/ReportsPage';
import { FieldWorkerPage } from './pages/FieldWorkerPage';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isFieldWorkerPortal = location.pathname.startsWith('/worker-view');
  const isDashboard = location.pathname === '/';

  if (isFieldWorkerPortal) {
    return <main className="min-h-screen bg-[#070a10]">{children}</main>;
  }

  // Full-screen Thermal Intelligence Console layout for the main dashboard
  if (isDashboard) {
    return <main className="min-h-screen bg-stone-50 text-stone-800">{children}</main>;
  }

  // Legacy layout for other working routes
  return (
    <div className="flex min-h-screen bg-[#0b0f17] text-slate-100">
      {/* Desktop Command Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-y-auto max-w-[1600px] w-full mx-auto">
          {children}
        </main>
        {/* Mobile Navigation */}
        <MobileNav />
      </div>
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <SafetyProvider>
          <ToastContainer />
          <AppLayout>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/workers" element={<WorkersPage />} />
              <Route path="/workers/:id" element={<WorkerDetailPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/sites" element={<SitesPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/worker-view" element={<FieldWorkerPage />} />
              <Route path="/worker-view/:id" element={<FieldWorkerPage />} />
            </Routes>
          </AppLayout>
        </SafetyProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
