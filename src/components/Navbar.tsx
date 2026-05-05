import { Menu, Bell, Shield } from 'lucide-react';

type Page = 'dashboard' | 'attendance' | 'workers' | 'bill' | 'quotation';

const pageTitles: Record<Page, string> = {
  dashboard: 'Dashboard',
  attendance: 'Labour Attendance',
  workers: 'Workers Management',
  bill: 'Bill Generator',
  quotation: 'Quotation Generator',
};

interface NavbarProps {
  activePage: Page;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export default function Navbar({ activePage, sidebarCollapsed, onToggleSidebar }: NavbarProps) {
  return (
    <header
      className="fixed top-0 right-0 z-20 flex items-center justify-between px-8 h-16 border-b border-gray-100/80"
      style={{
        left: sidebarCollapsed ? '68px' : '248px',
        backgroundColor: '#FFFFFF',
        transition: 'left 0.3s',
      }}
    >
      <div className="flex items-center gap-5">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="font-semibold text-gray-900 text-[15px] leading-tight">
            {pageTitles[activePage]}
          </h1>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">Sairaj Engineering Works</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
          <Bell size={17} />
          <span
            className="absolute top-2 right-2 w-[7px] h-[7px] rounded-full"
            style={{ backgroundColor: '#534AB7' }}
          />
        </button>
        <div className="w-px h-6 bg-gray-100" />
        <div
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#EEEDFE' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#534AB7' }}
          >
            <Shield size={14} className="text-white" />
          </div>
          <div className="leading-none">
            <p className="text-[12px] font-semibold" style={{ color: '#26215C' }}>Admin</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
