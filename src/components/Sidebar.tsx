import {
  LayoutDashboard,
  ScanFace,
  Users,
  FileText,
  ClipboardList,
  Settings,
  ChevronRight,
} from 'lucide-react';

type Page = 'dashboard' | 'attendance' | 'workers' | 'bill' | 'quotation';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  collapsed: boolean;
}

const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'attendance', label: 'Labour Attendance', icon: <ScanFace size={18} /> },
  { id: 'workers', label: 'Workers Management', icon: <Users size={18} /> },
  { id: 'bill', label: 'Bill Generator', icon: <FileText size={18} /> },
  { id: 'quotation', label: 'Quotation Generator', icon: <ClipboardList size={18} /> },
];

export default function Sidebar({ activePage, onNavigate, collapsed }: SidebarProps) {
  return (
    <aside
      className={`fixed top-0 left-0 h-screen flex flex-col transition-all duration-300 z-30 ${
        collapsed ? 'w-[68px]' : 'w-[248px]'
      }`}
      style={{ backgroundColor: '#26215C' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-[64px] border-b border-white/[0.08]">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#534AB7' }}
        >
          <Settings size={15} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-white font-semibold text-[13px] leading-tight truncate">Sairaj Engineering</p>
            <p className="text-white/40 text-[10px] leading-tight truncate">Works</p>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <div className={collapsed ? 'px-2' : 'px-3'}>
          {!collapsed && (
            <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-white/25">
              Navigation
            </p>
          )}
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 rounded-lg text-[13px] font-medium transition-all duration-150 relative ${
                    collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
                  } ${isActive ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                  style={isActive ? { backgroundColor: '#534AB7' } : undefined}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(127,119,221,0.12)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    }
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="truncate flex-1 text-left">{item.label}</span>
                      {isActive && <ChevronRight size={13} className="opacity-50" />}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.08]">
        {!collapsed && (
          <p className="text-white/20 text-[10px]">v1.0.0</p>
        )}
      </div>
    </aside>
  );
}
