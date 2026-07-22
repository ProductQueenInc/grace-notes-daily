// Hardcoded to TKOEBO. All server-side admin operations must hit
// tkoebogweygaabndrsvl (where the real data lives). The service-role key
// is stored as the TKOEBO_SERVICE_ROLE_KEY secret because the injected
// SUPABASE_SERVICE_ROLE_KEY belongs to the Lovable Cloud project we no
// longer use.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = 'https://tkoebogweygaabndrsvl.supabase.co';

function createSupabaseAdminClient() {
  const SERVICE_KEY =
    process.env.TKOEBO_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SERVICE_KEY) {
    const message =
      'Missing TKOEBO_SERVICE_ROLE_KEY on the server. Add it via Cloud > Secrets.';
    console.error(`[Supabase admin] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

// import { supabaseAdmin } from "@/integrations/supabase/client.server";
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
