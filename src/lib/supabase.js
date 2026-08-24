import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY wajib diisi di .env.local');
}

let supabaseClient = null;

try {
  supabaseClient = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        },
        global: {
          headers: {
            'Content-Type': 'application/json'
          }
        },
        db: {
          schema: 'public'
        }
      })
    : null;
} catch (error) {
  console.error('[Supabase] Failed to create client:', error);
  console.warn('[Supabase] Running in offline mode - realtime features disabled');
}

export const supabase = supabaseClient;
