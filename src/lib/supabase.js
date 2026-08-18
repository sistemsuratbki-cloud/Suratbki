import { createClient } from '@supabase/supabase-js';

// Anon key (kunci publik) - aman untuk diekspos di client-side
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://irwlmlatrtbdcfmnfftn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_nHGp_IZFJIrZLfVQzOraSw_RiBzuXZB';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
