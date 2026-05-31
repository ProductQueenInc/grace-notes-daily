import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// GraceNotes Daily backend (separate Supabase project; owns auth + all app data).
const SUPABASE_URL = "https://tkoebogweygaabndrsvl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrb2Vib2d3ZXlnYWFibmRyc3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NjA4MzEsImV4cCI6MjA5NDAzNjgzMX0.tFA7kj0ffcdZbnF9EXbq0sN9GRFeQHmvS4k-RHlfaTE";

export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
export const SUPABASE_PROJECT_ANON_KEY = SUPABASE_ANON_KEY;

export const supabaseConfigured = true;

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
