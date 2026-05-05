import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Worker = {
  id: string;
  name: string;
  phone: string;
  address: string;
  photo_url: string;
  created_at: string;
};

export type Attendance = {
  id: string;
  worker_id: string;
  date: string;
  time_in: string;
  status: 'present' | 'absent';
  created_at: string;
  workers?: Worker;
};
