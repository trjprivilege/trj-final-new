// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl    = "https://qwctdjxqwgetjhlmsppj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3Y3Rkanhxd2dldGpobG1zcHBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODExNTcsImV4cCI6MjA2MDY1NzE1N30.LE_fd_E1f4tTzKkrbe1ZAajZ9x_IbZ8Qx2XIkTif7q4"

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
