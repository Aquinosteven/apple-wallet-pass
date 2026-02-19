import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let clientInstance: SupabaseClient | null = null;
let isInitialized = false;

function getSupabaseEnv() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return { supabaseUrl, supabaseAnonKey };
}

export function hasSupabaseConfig(): boolean {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (isInitialized) {
    return clientInstance;
  }

  isInitialized = true;

  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseAnonKey) {
    clientInstance = null;
    return clientInstance;
  }

  clientInstance = createClient(supabaseUrl, supabaseAnonKey);
  return clientInstance;
}
