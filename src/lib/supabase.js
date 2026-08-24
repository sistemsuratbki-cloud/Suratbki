import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY wajib diisi di .env.local');
}

// Check if WebSocket is available
const hasWebSocket = typeof WebSocket !== 'undefined';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      },
      realtime: {
        params: { 
          eventsPerSecond: 10 
        },
        // Disable realtime if WebSocket not available
        enabled: hasWebSocket,
        // Use WSS (secure WebSocket) for production
        transport: hasWebSocket ? 'websocket' : undefined
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

// Log WebSocket status for debugging
if (!hasWebSocket) {
  console.warn('[Supabase] WebSocket not available - Realtime features disabled');
}
