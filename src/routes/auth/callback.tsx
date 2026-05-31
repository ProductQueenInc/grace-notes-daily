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
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    async function finishAuth() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session) {
        navigate({ to: "/home", replace: true });
        return;
      }

      // Give OAuth/email-confirmation redirects time to hydrate the session from
      // the URL before deciding the user is unauthenticated.
      timeout = setTimeout(async () => {
        const { data: latest } = await supabase.auth.getSession();
        if (!cancelled) navigate({ to: latest.session ? "/home" : "/login", replace: true });
      }, 4_000);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !cancelled) navigate({ to: "/home", replace: true });
    });

    finishAuth();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
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
