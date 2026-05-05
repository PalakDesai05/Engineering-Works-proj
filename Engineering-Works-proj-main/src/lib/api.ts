// ── Central API client replacing Supabase ─────────────────────────────────────
const BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api';

async function req<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  const json = await res.json().catch(() => ({ success: false, message: 'Unknown error' }));
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
}

// ── Worker helpers ─────────────────────────────────────────────────────────────
export const workersApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return req<{ success: boolean; data: Worker[]; pagination: Pagination }>(`/workers${qs}`);
  },
  create: (form: FormData) =>
    req<{ success: boolean; data: Worker }>('/workers', { method: 'POST', body: form }),
  update: (id: string, form: FormData) =>
    req<{ success: boolean; data: Worker }>(`/workers/${id}`, { method: 'PUT', body: form }),
  remove: (id: string) =>
    req<{ success: boolean }>(`/workers/${id}`, { method: 'DELETE' }),
};

// ── Attendance helpers ─────────────────────────────────────────────────────────
export const attendanceApi = {
  today: () =>
    req<{ success: boolean; date: string; total_present: number; data: AttendanceRow[] }>('/attendance/today'),
  absent: () =>
    req<{ success: boolean; date: string; total_absent: number; data: Worker[] }>('/attendance/absent'),
  markManual: (worker_id: string, date?: string) =>
    req<{ success: boolean; message: string }>('/attendance/mark-manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id, date }),
    }),
  markFace: (form: FormData) =>
    req<{ success: boolean; message: string; data: { worker: Worker; attendance: AttendanceRow; confidence: number } }>(
      '/attendance/mark',
      { method: 'POST', body: form }
    ),
};

// ── Dashboard helpers ──────────────────────────────────────────────────────────
export const dashboardApi = {
  summary: () =>
    req<{
      success: boolean;
      data: {
        workers: { total: number; active: number };
        attendance: { present_today: number; absent_today: number };
        billing: { total_bills: number; total_billed: number; monthly_revenue: number };
        quotations: { total: number; pending: number };
      };
    }>('/dashboard/summary'),
};

// ── Shared types ───────────────────────────────────────────────────────────────
export interface Worker {
  id: string;       // Mongoose virtual (same as _id)
  _id: string;
  name: string;
  phone: string;
  address: string;
  photo_url: string;
  is_active: boolean;
  created_at: string;
}

export interface AttendanceRow {
  id: string;
  _id: string;
  worker_id: Worker | string;
  date: string;
  time: string;
  status: 'present';
  marked_by: 'face_recognition' | 'manual';
  created_at: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}
