// Server-side Supabase admin client.
//
// Points at the CURRENT Lovable Cloud project via the injected env vars
// (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY). An earlier version hardcoded
// this to tkoebogweygaabndrsvl on the assumption that Lovable had switched
// us to a different project — that turned out to be wrong: the app's data
// (daily_devotionals rows, devotional-covers bucket, listen-audio bucket,
// share-cards bucket) all live in the Lovable-injected project, so the
// hardcode caused every server route to read the wrong DB (returning either
// stale devotionals from tkoebo or "Bucket not found" for storage).
//
// Do NOT import client.server.ts from app code — always use this file, so
// the "which project?" decision lives in one place.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

function createAdmin(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const msg =
      'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY on the server. These are injected by Lovable Cloud automatically.';
    console.error(`[Supabase admin] ${msg}`);
    throw new Error(msg);
  }
  return createClient<Database>(url, key, {
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
