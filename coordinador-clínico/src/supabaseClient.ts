import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://iylahwwrizxcpvcxgiju.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5bGFod3dyaXp4Y3B2Y3hnaWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5OTk3NDYsImV4cCI6MjEwNDU3NTc0Nn0.j7WSjWriDFI-DHRw_pUp2MYpbmZAgq_8IlumWL_mWn8';

function sanitizeUrl(raw?: string): string {
  if (!raw) return DEFAULT_SUPABASE_URL;
  const cleaned = raw.trim().replace(/^["']|["']$/g, '');
  if (!cleaned.startsWith('http') || cleaned.includes('placeholder')) {
    return DEFAULT_SUPABASE_URL;
  }
  return cleaned.replace(/\/+$/, '');
}

function sanitizeKey(raw?: string): string {
  if (!raw) return DEFAULT_SUPABASE_ANON_KEY;
  const cleaned = raw.trim().replace(/^["']|["']$/g, '');
  if (cleaned.length < 20 || cleaned.includes('placeholder')) {
    return DEFAULT_SUPABASE_ANON_KEY;
  }
  return cleaned;
}

export const supabaseUrl = sanitizeUrl(import.meta.env.VITE_SUPABASE_URL);
export const supabaseAnonKey = sanitizeKey(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
