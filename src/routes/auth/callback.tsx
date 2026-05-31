import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DoveMark } from "@/components/dove-mark";
import { NatureBackground } from "@/components/nature-background";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

/**
 * OAuth + email-confirmation landing page. Handles both:
 *  - implicit-flow hash tokens (#access_token=...) from Google sign-in
 *  - ?error=... bounce-backs from Supabase when the redirect URL isn't
 *    in the project's allow-list (the #1 reason SSO loops back to /login)
 *
 * No RequireAuth — we ARE the auth step.
 */
function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("Signing you in…");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    // 1. Surface explicit OAuth errors (Supabase appends ?error=... or
    //    #error=... when the redirect URL isn't allow-listed, or the user
    //    cancels). Without this we silently bounce to /login forever.
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const oauthError =
      url.searchParams.get("error_description") ||
      url.searchParams.get("error") ||
      hashParams.get("error_description") ||
      hashParams.get("error");

    if (oauthError) {
      setErrorMsg(decodeURIComponent(oauthError));
      return;
    }

    async function finishAuth() {
      // 2. If implicit-flow tokens are in the URL hash, supabase-js
      //    (detectSessionInUrl: true) will parse them — but it can race
      //    with our first getSession() call. Wait for SIGNED_IN OR poll.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session) {
        navigate({ to: "/home", replace: true });
        return;
      }

      setStatus("Confirming your session…");

      // Poll up to 6s for the session to hydrate.
      let waited = 0;
      const poll = setInterval(async () => {
        waited += 500;
        const { data: latest } = await supabase.auth.getSession();
        if (cancelled) return clearInterval(poll);
        if (latest.session) {
          clearInterval(poll);
          navigate({ to: "/home", replace: true });
          return;
        }
        if (waited >= 6000) {
          clearInterval(poll);
          // No session and no explicit error → most likely the redirect URL
          // isn't allow-listed in Supabase Auth.
          setErrorMsg(
            "We couldn't complete your sign-in. If this keeps happening, this site's URL may not be allow-listed in our auth provider yet.",
          );
        }
      }, 500);

      timeout = setTimeout(() => clearInterval(poll), 7000);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_IN" && session) {
        navigate({ to: "/home", replace: true });
      }
    });

    finishAuth();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (errorMsg) {
    return (
      <>
        <NatureBackground />
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
          <DoveMark variant="medallion" className="w-16 h-16 drop-shadow-md" />
          <h1 className="font-display text-2xl text-white">Sign-in didn't complete</h1>
          <p className="text-white/80 text-sm max-w-md">{errorMsg}</p>
          <button
            onClick={() => navigate({ to: "/login", replace: true })}
            className="mt-2 px-5 py-2.5 rounded-full bg-white/90 text-grace font-semibold text-sm hover:bg-white transition"
          >
            Back to sign-in
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <NatureBackground />
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <DoveMark variant="medallion" className="w-16 h-16 drop-shadow-md animate-pulse" />
        <p className="text-white/70 text-sm">{status}</p>
      </div>
    </>
  );
}
