import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isServerSupabaseConfigured = Boolean(
  supabaseUrl &&
  serviceRoleKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('your-project')
);

let _serverSupabase: SupabaseClient<Database> | null = null;

export function getServerSupabaseClient(): SupabaseClient<Database> | null {
  if (!_serverSupabase && isServerSupabaseConfigured) {
    try {
      _serverSupabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase server client:', err);
      _serverSupabase = null;
    }
  }
  return _serverSupabase;
}
