import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabaseConfigured } from "@/lib/supabase";

/** Client-side auth gate. Redirects to /login when no session and to /onboarding when not yet onboarded. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!supabaseConfigured) return; // allow preview without keys
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (profile && !profile.onboarded) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [user, profile, loading, navigate]);


  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-grace border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return <>{children}</>;
}
