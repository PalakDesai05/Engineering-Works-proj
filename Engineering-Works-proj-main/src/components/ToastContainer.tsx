import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToast, type Toast, type ToastType } from '../context/ToastContext';

/* ── Per-type config ────────────────────────────────────────────────────────── */
const config: Record<ToastType, { icon: React.ReactNode; bar: string; bg: string; border: string; title: string }> = {
  success: {
    icon:   <CheckCircle  size={18} className="flex-shrink-0" style={{ color: '#16a34a' }} />,
    bar:    '#16a34a',
    bg:     '#f0fdf4',
    border: '#bbf7d0',
    title:  '#14532d',
  },
  error: {
    icon:   <XCircle      size={18} className="flex-shrink-0" style={{ color: '#dc2626' }} />,
    bar:    '#dc2626',
    bg:     '#fef2f2',
    border: '#fecaca',
    title:  '#7f1d1d',
  },
  info: {
    icon:   <Info         size={18} className="flex-shrink-0" style={{ color: '#2563eb' }} />,
    bar:    '#2563eb',
    bg:     '#eff6ff',
    border: '#bfdbfe',
    title:  '#1e3a8a',
  },
  warning: {
    icon:   <AlertTriangle size={18} className="flex-shrink-0" style={{ color: '#d97706' }} />,
    bar:    '#d97706',
    bg:     '#fffbeb',
    border: '#fde68a',
    title:  '#78350f',
  },
};

/* ── Single toast card ──────────────────────────────────────────────────────── */
function ToastCard({ toast }: { toast: Toast }) {
  const { dismiss } = useToast();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const c = config[toast.type];

  // Slide-in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    setLeaving(true);
    setTimeout(() => dismiss(toast.id), 300);
  };

  // Progress bar state
  const [progress, setProgress] = useState(100);
  useEffect(() => {
    const dur = toast.duration || 4000;
    const step = 50;
    const dec = (step / dur) * 100;
    const interval = setInterval(() => {
      setProgress(p => {
        if (p <= 0) { clearInterval(interval); return 0; }
        return p - dec;
      });
    }, step);
    return () => clearInterval(interval);
  }, [toast.duration]);

  return (
    <div
      style={{
        transform:  leaving  ? 'translateX(120%)' : visible ? 'translateX(0)' : 'translateX(120%)',
        opacity:    leaving  ? 0 : visible ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: '10px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        minWidth: '300px',
        maxWidth: '360px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Coloured left bar */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: c.bar, borderRadius: '10px 0 0 10px' }} />

      <div style={{ padding: '13px 14px 13px 18px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        {c.icon}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: c.title, lineHeight: 1.3 }}>{toast.title}</p>
          {toast.message && (
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px', lineHeight: 1.5 }}>{toast.message}</p>
          )}
        </div>
        <button
          onClick={handleDismiss}
          style={{ color: '#9ca3af', padding: '2px', borderRadius: '4px', flexShrink: 0 }}
          className="hover:text-gray-600 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', backgroundColor: 'rgba(0,0,0,0.06)' }}>
        <div style={{ height: '100%', width: `${progress}%`, backgroundColor: c.bar, opacity: 0.5, transition: 'width 50ms linear' }} />
      </div>
    </div>
  );
}

/* ── Container ──────────────────────────────────────────────────────────────── */
export default function ToastContainer() {
  const { toasts } = useToast();

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastCard toast={t} />
        </div>
      ))}
    </div>
  );
}
