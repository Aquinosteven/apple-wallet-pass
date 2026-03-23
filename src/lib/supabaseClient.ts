import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseEnv && import.meta.env.DEV) {
  console.warn(
    'Missing Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Public routes will still render, but auth/dashboard flows are disabled until env vars are set.'
  );
}

// Keep the app bootable even when env vars are absent so marketing/public routes can render.
const fallbackSupabaseUrl = 'https://placeholder-project.supabase.co';
const fallbackSupabaseAnonKey = 'placeholder-anon-key';

export const supabase = createClient(
  hasSupabaseEnv ? supabaseUrl : fallbackSupabaseUrl,
  hasSupabaseEnv ? supabaseAnonKey : fallbackSupabaseAnonKey
);
