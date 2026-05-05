import { createContext, useCallback, useContext, useRef, useState } from 'react';

/* ── Types ──────────────────────────────────────────────────────────────────── */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface NotificationItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  timestamp: Date;
  read: boolean;
}

interface ToastCtx {
  /* ── Toast queue (ephemeral) ── */
  toasts: Toast[];
  toast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
  warn:    (title: string, message?: string) => void;
  dismiss: (id: string) => void;

  /* ── Notification history (persistent) ── */
  notifications: NotificationItem[];
  unreadCount: number;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const Ctx = createContext<ToastCtx | null>(null);

const MAX_NOTIFICATIONS = 10;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  /* ── Toast state ────────────────────────────────────────────────────────── */
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /* ── Notification state ─────────────────────────────────────────────────── */
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const unreadCount = notifications.filter((n) => !n.read).length;

  /* ── dismiss toast ──────────────────────────────────────────────────────── */
  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* ── fire toast + push to history ──────────────────────────────────────── */
  const toast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 4000) => {
      const id = Math.random().toString(36).slice(2);

      /* Only show live toast if notifications are enabled */
      if (notificationsEnabled) {
        setToasts((prev) => [...prev.slice(-4), { id, type, title, message, duration }]);
        timers.current[id] = setTimeout(() => dismiss(id), duration);
      }

      /* Always push to notification history */
      setNotifications((prev) => {
        const item: NotificationItem = {
          id,
          type,
          title,
          message,
          timestamp: new Date(),
          read: false,
        };
        return [item, ...prev].slice(0, MAX_NOTIFICATIONS);
      });
    },
    [notificationsEnabled, dismiss]
  );

  const success = useCallback((t: string, m?: string) => toast('success', t, m), [toast]);
  const error   = useCallback((t: string, m?: string) => toast('error',   t, m), [toast]);
  const info    = useCallback((t: string, m?: string) => toast('info',    t, m), [toast]);
  const warn    = useCallback((t: string, m?: string) => toast('warning', t, m), [toast]);

  const markAllRead = useCallback(() =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))), []);

  const clearAll = useCallback(() => setNotifications([]), []);

  return (
    <Ctx.Provider value={{
      toasts, toast, success, error, info, warn, dismiss,
      notifications, unreadCount, notificationsEnabled,
      setNotificationsEnabled, markAllRead, clearAll,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
