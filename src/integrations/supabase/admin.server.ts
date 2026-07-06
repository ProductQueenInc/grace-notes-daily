// Server-side Supabase admin client pointing at the app's real project
// (tkoebogweygaabndrsvl). The auto-generated client.server.ts reads
// Lovable Cloud's injected SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY, which
// point at a different, empty Lovable-provisioned project — so storage
// buckets and tables silently 404 from the Cloudflare Worker. This wrapper
// uses the correct URL + TKOEBO_SERVICE_ROLE_KEY secret instead.
//
// Do NOT import client.server.ts from app code — always use this file.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = 'https://tkoebogweygaabndrsvl.supabase.co';

function createAdmin(): SupabaseClient<Database> {
  const key =
    process.env.TKOEBO_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    const msg =
      'Missing TKOEBO_SERVICE_ROLE_KEY (service role for tkoebogweygaabndrsvl). Set it in Lovable Cloud secrets.';
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
