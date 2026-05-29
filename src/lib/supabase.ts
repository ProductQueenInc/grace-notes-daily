import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const LOVABLE_CLOUD_URL = "https://jtjizrchmmmvphkndmhs.supabase.co";
const LOVABLE_CLOUD_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0aml6cmNobW1tdnBoa25kbWhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MjgzODIsImV4cCI6MjA5NTIwNDM4Mn0.pkQXk1ZVeO7HlctTkd1-9b-fQTZwrrZbhHGobp1WfHk";

const url = (import.meta.env.VITE_SUPABASE_URL || LOVABLE_CLOUD_URL) as string;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  LOVABLE_CLOUD_PUBLISHABLE_KEY) as string;

export const supabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : (createClient("https://placeholder.supabase.co", "placeholder") as SupabaseClient);
