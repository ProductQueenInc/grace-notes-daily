import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// GraceNotes Daily backend (separate Supabase project; owns auth + all app data).
const SUPABASE_URL = "https://tkoebogweygaabndrsvl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrb2Vib2d3ZXlnYWFibmRyc3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NjA4MzEsImV4cCI6MjA5NDAzNjgzMX0.tFA7kj0ffcdZbnF9EXbq0sN9GRFeQHmvS4k-RHlfaTE";

export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
export const SUPABASE_PROJECT_ANON_KEY = SUPABASE_ANON_KEY;

export const supabaseConfigured = true;

// PKCE is required for Magic Link's ?code= callback exchange.
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});

// --- Returning-device hint cookie ---
// Non-essential preference cookie. Tells /login whether to greet as
// returning user or new visitor. Does not affect auth — the actual session
// is still the Supabase JWT in localStorage. Documented in privacy.tsx.
const HAS_ACCOUNT_COOKIE = "gn_has_account";

export function markDeviceHasAccount() {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${HAS_ACCOUNT_COOKIE}=1; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
}

export function deviceHasAccount(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith(`${HAS_ACCOUNT_COOKIE}=1`));
}
