import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { DoveMark } from "@/components/dove-mark";
import { NatureBackground } from "@/components/nature-background";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

/**
 * OAuth landing page. Google redirects here after the user picks their account.
 * No RequireAuth — we ARE the auth step. We wait for Supabase to establish
 * the session from the URL hash/code, then navigate to /home.
 */
function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // onAuthStateChange fires once the session is detected from the URL.
    // We listen here and forward to /home as soon as it lands.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        subscription.unsubscribe();
        navigate({ to: "/home", replace: true });
      } else if (event === "INITIAL_SESSION" && !session) {
        // No session found at all — send back to login
        subscription.unsubscribe();
        navigate({ to: "/login", replace: true });
      }
    });

    // Fallback: if we somehow land here without a hash or code, go to login.
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      navigate({ to: "/login", replace: true });
    }, 10_000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <>
      <NatureBackground />
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <DoveMark variant="medallion" className="w-16 h-16 drop-shadow-md animate-pulse" />
        <p className="text-white/70 text-sm">Signing you in…</p>
      </div>
    </>
  );
}
