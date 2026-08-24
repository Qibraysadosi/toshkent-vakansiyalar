import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { publicEnv, serverEnv } from './env';
import type { Database } from './database.types';

/**
 * Ochiq (anon) mijoz — faqat o'qish. RLS siyosatlari schema.sql'da.
 * Server komponentlarda ham shu ishlatiladi: ma'lumot baribir ommaviy.
 */
export function createPublicClient(): SupabaseClient<Database> {
  const { supabaseUrl, supabaseAnonKey } = publicEnv();
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
}

/**
 * Xizmat mijozi — import, admin va bot uchun. RLS'ni chetlab o'tadi,
 * shuning uchun HECH QACHON client komponentdan chaqirilmasin.
 */
export function createServiceClient(): SupabaseClient<Database> {
  const { supabaseUrl, supabaseServiceKey } = serverEnv();
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
