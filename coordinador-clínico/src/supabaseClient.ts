import { createClient } from '@supabase/supabase-js';

// Dedicated Supabase credentials for Coordinador Clínico
export const supabaseUrl = 'https://iylahwwrizxcpvcxgiju.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5bGFod3dyaXp4Y3B2Y3hnaWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5OTk3NDYsImV4cCI6MjEwNDU3NTc0Nn0.j7WSjWriDFI-DHRw_pUp2MYpbmZAgq_8IlumWL_mWn8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
