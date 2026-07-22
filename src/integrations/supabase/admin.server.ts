// Server-side Supabase admin client — hardcoded to the TKOEBO GraceNotes
// backend (tkoebogweygaabndrsvl). All app data (auth users, devotionals,
// prayers, storage buckets) lives there. Do NOT switch this back to the
// Lovable Cloud injected env vars.
//
// Prefer importing this file from app code rather than client.server.ts,
// so the "which project?" decision is centralized here.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = 'https://tkoebogweygaabndrsvl.supabase.co';

function createAdmin(): SupabaseClient<Database> {
  const key =
    process.env.TKOEBO_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    const msg =
      'Missing TKOEBO_SERVICE_ROLE_KEY on the server. Add it via Cloud > Secrets.';
    console.error(`[Supabase admin] ${msg}`);
    throw new Error(msg);
  }
  return createClient<Database>(SUPABASE_URL, key, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let _admin: SupabaseClient<Database> | undefined;

export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_t, prop, receiver) {
    if (!_admin) _admin = createAdmin();
    return Reflect.get(_admin, prop, receiver);
  },
});
