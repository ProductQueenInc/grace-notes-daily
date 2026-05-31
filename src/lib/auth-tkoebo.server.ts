// Auth middleware for the GraceNotes backend project (tkoebogweygaabndrsvl).
// The Lovable-managed `requireSupabaseAuth` validates against the connected
// Lovable Cloud project, which is NOT where our app data lives. This parallel
// middleware validates bearer tokens against the GraceNotes project and gives
// handlers a supabase client scoped to the signed-in user.

import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tkoebogweygaabndrsvl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrb2Vib2d3ZXlnYWFibmRyc3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NjA4MzEsImV4cCI6MjA5NDAzNjgzMX0.tFA7kj0ffcdZbnF9EXbq0sN9GRFeQHmvS4k-RHlfaTE";

export const requireTkoebo = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request?.headers) {
      throw new Error("Unauthorized: No request headers available");
    }
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Missing bearer token");
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) throw new Error("Unauthorized: Empty bearer token");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      throw new Error("Unauthorized: Invalid token");
    }

    return next({
      context: {
        supabase,
        userId: data.user.id,
      },
    });
  },
);
