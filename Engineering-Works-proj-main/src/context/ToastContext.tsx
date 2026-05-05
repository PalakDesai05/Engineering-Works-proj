import { createContext, useCallback, useContext, useRef, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;  // ms, default 4000
}

interface ToastCtx {
  toasts: Toast[];
  toast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
  warn:    (title: string, message?: string) => void;
  dismiss: (id: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((
    type: ToastType,
    title: string,
    message?: string,
    duration = 4000
  ) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-4), { id, type, title, message, duration }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const success = useCallback((t: string, m?: string) => toast('success', t, m), [toast]);
  const error   = useCallback((t: string, m?: string) => toast('error',   t, m), [toast]);
  const info    = useCallback((t: string, m?: string) => toast('info',    t, m), [toast]);
  const warn    = useCallback((t: string, m?: string) => toast('warning', t, m), [toast]);

  return (
    <Ctx.Provider value={{ toasts, toast, success, error, info, warn, dismiss }}>
      {children}
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
