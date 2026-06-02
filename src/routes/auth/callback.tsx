import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, markDeviceHasAccount } from "@/lib/supabase";
import { DoveMark } from "@/components/dove-mark";
import { NatureBackground } from "@/components/nature-background";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

/**
 * Magic-link landing page. Handles:
 *  - PKCE auth-code flow: ?code=... → exchangeCodeForSession
 *  - ?error=... bounce-backs from Supabase (e.g. expired link)
 *  - Implicit-flow hash tokens (kept as a fallback)
 *
 * No RequireAuth — we ARE the auth step.
 */
function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("Signing you in…");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const oauthError =
      url.searchParams.get("error_description") ||
      url.searchParams.get("error") ||
      hashParams.get("error_description") ||
      hashParams.get("error");

    if (oauthError) {
      const raw = decodeURIComponent(oauthError);
      const code = url.searchParams.get("error") || hashParams.get("error");
      if (code === "access_denied" || /access_denied|cancelled|canceled/i.test(raw)) {
        setErrorMsg("No problem — you can try again, or use your email to sign in.");
      } else {
        setErrorMsg(raw);
      }
      return;
    }

    async function finishAuth() {
      // 0. token_hash flow: link opened in a different browser than the one
      //    that requested it (e.g. Gmail in-app browser). No PKCE verifier needed.
      const token_hash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type") as "signup" | "magiclink" | "recovery" | "email" | null;
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });
        if (cancelled) return;
        if (error) { setErrorMsg(error.message); return; }
        markDeviceHasAccount();
        navigate({ to: "/home", replace: true });
        return;
      }

      // 1. PKCE flow: ?code=... → exchange for a session.
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (cancelled) return;
        if (error) {
          setErrorMsg(error.message);
          return;
        }
      }

      // 2. Read the now-hydrated session.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session) {
        markDeviceHasAccount();
        navigate({ to: "/home", replace: true });
        return;
      }

      // 3. Fallback: implicit-flow tokens in the URL hash may still be parsing.
      setStatus("Confirming your session…");
      let waited = 0;
      const poll = setInterval(async () => {
        waited += 500;
        const { data: latest } = await supabase.auth.getSession();
        if (cancelled) return clearInterval(poll);
        if (latest.session) {
          clearInterval(poll);
          markDeviceHasAccount();
          navigate({ to: "/home", replace: true });
          return;
        }
        if (waited >= 6000) {
          clearInterval(poll);
          setErrorMsg(
            "We couldn't complete your sign-in. The link may have expired — request a new one from the sign-in page.",
          );
        }
      }, 500);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_IN" && session) {
        markDeviceHasAccount();
        navigate({ to: "/home", replace: true });
      }
    });

    finishAuth();

    return () => {
      cancelled = true;
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
