import { createClient } from "@supabase/supabase-js";
import { getRequestHeader } from "@tanstack/react-start/server";

/**
 * Server-only auth guard. Reads the Bearer token from the incoming request,
 * validates it against Supabase, and returns the user id. Throws if missing
 * or invalid so unauthenticated callers cannot trigger AI calls.
 */
export async function requireUserId(): Promise<string> {
  // Hardcoded to TKOEBO — auth users live there.
  const url = "https://tkoebogweygaabndrsvl.supabase.co";
  const anon =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrb2Vib2d3ZXlnYWFibmRyc3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NjA4MzEsImV4cCI6MjA5NDAzNjgzMX0.tFA7kj0ffcdZbnF9EXbq0sN9GRFeQHmvS4k-RHlfaTE";


  const authHeader = getRequestHeader("authorization") || getRequestHeader("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Unauthorized");

  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  return data.user.id;
}
