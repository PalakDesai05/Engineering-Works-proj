import { useEffect, useRef, useState } from 'react';
import {
  Menu, Bell, Shield, CheckCheck, Trash2,
  CheckCircle, XCircle, Info, AlertTriangle,
} from 'lucide-react';
import { useToast, type NotificationItem, type ToastType } from '../context/ToastContext';

type Page = 'dashboard' | 'attendance' | 'workers' | 'bill' | 'quotation';

const pageTitles: Record<Page, string> = {
  dashboard:  'Dashboard',
  attendance: 'Labour Attendance',
  workers:    'Workers Management',
  bill:       'Bill Generator',
  quotation:  'Quotation Generator',
};

interface NavbarProps {
  activePage: Page;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

/* ── Icon per notification type ─────────────────────────────────────────────── */
function NIcon({ type }: { type: ToastType }) {
  const s = 14;
  if (type === 'success') return <CheckCircle   size={s} style={{ color: '#16a34a' }} />;
  if (type === 'error')   return <XCircle       size={s} style={{ color: '#dc2626' }} />;
  if (type === 'warning') return <AlertTriangle size={s} style={{ color: '#d97706' }} />;
  return                         <Info          size={s} style={{ color: '#2563eb' }} />;
}

/* ── bg colour per type ─────────────────────────────────────────────────────── */
const typeBg: Record<ToastType, string> = {
  success: '#f0fdf4',
  error:   '#fef2f2',
  warning: '#fffbeb',
  info:    '#eff6ff',
};

/* ── Relative time ──────────────────────────────────────────────────────────── */
function relTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

/* ── Notification row ───────────────────────────────────────────────────────── */
function NRow({ n }: { n: NotificationItem }) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50/80"
      style={{ borderBottom: '1px solid #f3f4f6' }}
    >
      {/* Type icon */}
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
        style={{ backgroundColor: typeBg[n.type] }}
      >
        <NIcon type={n.type} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-gray-800 leading-tight">{n.title}</p>
        {n.message && (
          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug truncate">{n.message}</p>
        )}
        <p className="text-[10px] text-gray-400 mt-1">{relTime(n.timestamp)}</p>
      </div>

      {/* Unread dot */}
      {!n.read && (
        <span
          className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5"
          style={{ backgroundColor: '#534AB7' }}
        />
      )}
    </div>
  );
}

/* ── Main Navbar ─────────────────────────────────────────────────────────────── */
export default function Navbar({ activePage, sidebarCollapsed, onToggleSidebar }: NavbarProps) {
  const {
    notifications, unreadCount,
    notificationsEnabled, setNotificationsEnabled,
    markAllRead, clearAll,
  } = useToast();

  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  /* ── Close dropdown on outside click ──────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* ── Mark all read when panel opens ───────────────────────────────────────── */
  const handleToggle = () => {
    if (!open && unreadCount > 0) markAllRead();
    setOpen((o) => !o);
  };

  return (
    <header
      className="fixed top-0 right-0 z-20 flex items-center justify-between px-8 h-16 border-b border-gray-100/80"
      style={{
        left: sidebarCollapsed ? '68px' : '248px',
        backgroundColor: '#FFFFFF',
        transition: 'left 0.3s',
      }}
    >
      {/* ── Left: hamburger + page title ─────────────────────────────────────── */}
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

      {/* ── Right: bell + admin ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">

        {/* ── Bell button + dropdown ─────────────────────────────────────────── */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={handleToggle}
            className="relative p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={17} />
            {/* Badge */}
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-white px-1"
                style={{ backgroundColor: '#534AB7', fontSize: '9px', fontWeight: 700 }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            {/* Pulse dot when enabled but no unread */}
            {unreadCount === 0 && notificationsEnabled && (
              <span
                className="absolute top-2 right-2 w-[6px] h-[6px] rounded-full"
                style={{ backgroundColor: '#22c55e' }}
              />
            )}
          </button>

          {/* ── Dropdown panel ─────────────────────────────────────────────── */}
          {open && (
            <div
              className="absolute right-0 mt-2 rounded-xl shadow-2xl overflow-hidden"
              style={{
                width: '340px',
                backgroundColor: '#fff',
                border: '1px solid #e9e8f8',
                animation: 'notifSlideIn 0.18s ease-out',
                top: '100%',
                zIndex: 50,
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid #f3f4f6' }}
              >
                <div className="flex items-center gap-2">
                  <Bell size={14} style={{ color: '#534AB7' }} />
                  <span className="text-[13px] font-bold text-gray-800">Notifications</span>
                  {notifications.length > 0 && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: '#EEEDFE', color: '#534AB7' }}
                    >
                      {notifications.length}
                    </span>
                  )}
                </div>

                {/* Enable / disable toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400">
                    {notificationsEnabled ? 'On' : 'Off'}
                  </span>
                  <button
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                    className="relative w-9 h-5 rounded-full transition-colors duration-200"
                    style={{ backgroundColor: notificationsEnabled ? '#534AB7' : '#d1d5db' }}
                    aria-label="Toggle notifications"
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                      style={{ transform: notificationsEnabled ? 'translateX(18px)' : 'translateX(2px)' }}
                    />
                  </button>
                </div>
              </div>

              {/* Actions row */}
              {notifications.length > 0 && (
                <div
                  className="flex items-center justify-between px-4 py-2"
                  style={{ borderBottom: '1px solid #f9f9f9', backgroundColor: '#fafafa' }}
                >
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <CheckCheck size={12} /> Mark all read
                  </button>
                  <button
                    onClick={clearAll}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={11} /> Clear all
                  </button>
                </div>
              )}

              {/* Notification list */}
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                      style={{ backgroundColor: '#EEEDFE' }}
                    >
                      <Bell size={20} style={{ color: '#534AB7' }} />
                    </div>
                    <p className="text-[13px] font-semibold text-gray-600">All caught up!</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      No notifications yet
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => <NRow key={n.id} n={n} />)
                )}
              </div>

              {/* Footer */}
              <div
                className="px-4 py-2.5 text-center"
                style={{ borderTop: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}
              >
                <p className="text-[10px] text-gray-400">
                  Showing last {notifications.length} of max 10 notifications
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-100" />

        {/* Admin badge */}
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

      {/* Dropdown slide-in animation */}
      <style>{`
        @keyframes notifSlideIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </header>
  );
}
