import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import LabourAttendance from './pages/LabourAttendance';
import WorkersManagement from './pages/WorkersManagement';
import BillGenerator from './pages/BillGenerator';
import QuotationGenerator from './pages/QuotationGenerator';

type Page = 'dashboard' | 'attendance' | 'workers' | 'bill' | 'quotation';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  function renderPage() {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'attendance': return <LabourAttendance />;
      case 'workers': return <WorkersManagement />;
      case 'bill': return <BillGenerator />;
      case 'quotation': return <QuotationGenerator />;
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f8fc] font-sans">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        collapsed={sidebarCollapsed}
      />
      <Navbar
        activePage={activePage}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
      />
      <main
        className="transition-all duration-300 min-h-screen pt-16"
        style={{ marginLeft: sidebarCollapsed ? '68px' : '248px' }}
      >
        <div className="max-w-[1200px] mx-auto px-8 py-8">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
