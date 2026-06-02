import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NatureBackground } from "@/components/nature-background";
import { supabase, supabaseConfigured, deviceHasAccount } from "@/lib/supabase";
import { toast } from "sonner";
import { DoveMark } from "@/components/dove-mark";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Welcome - GraceNotes Daily" }] }),
  component: Auth,
});

// Canonical production URL for the magic-link redirect. We hardcode this
// (instead of window.location.origin) so the link in the email always shows
// gracenotesdaily.com — never a preview/lovable.app host.
const REDIRECT_URL = "https://gracenotesdaily.com/auth/callback";

type Mode = "enter" | "sent";

function authErrorMessage(error: unknown) {
  const authError = error as { message?: string; code?: string; status?: number } | null;
  const message = authError?.message ?? "";
  if (authError?.status === 429 || authError?.code === "over_email_send_rate_limit" || /rate limit/i.test(message)) {
    return "Too many sign-in links were requested. Please wait a little while, then try again.";
  }
  if (/invalid json response/i.test(message) || /content-type:\s*text\/html/i.test(message)) {
    return "We couldn't send your link right now. Please wait a few minutes, then try again.";
  }
  return message || "We couldn't send your link right now. Please try again shortly.";
}

function Auth() {
  const [returning, setReturning] = useState(false);
  const [mode, setMode] = useState<Mode>("enter");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    setReturning(deviceHasAccount());
  }, []);

  function startCooldown(seconds: number) {
    setResendCooldown(seconds);
    const interval = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) { clearInterval(interval); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  async function sendLink(targetEmail: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: { emailRedirectTo: REDIRECT_URL },
    });
    return error;
  }

  async function signInWithProvider(provider: "google" | "apple") {
    if (!supabaseConfigured) {
      toast.error("Sign-in is temporarily unavailable. Please try again shortly.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: REDIRECT_URL },
    });
    if (error) {
      setLoading(false);
      toast.error(authErrorMessage(error));
    }
    // On success the browser is already redirecting — leave loading=true.
  }

  async function onContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) {
      toast.error("Sign-in is temporarily unavailable. Please try again shortly.");
      return;
    }
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@") || trimmed.length < 5) {
      toast.error("Enter a valid email address.");
      return;
    }
    setLoading(true);
    const error = await sendLink(trimmed);
    setLoading(false);
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    setEmail(trimmed);
    setMode("sent");
    startCooldown(45);
  }

  async function resend() {
    if (resendCooldown > 0) return;
    setLoading(true);
    const error = await sendLink(email);
    setLoading(false);
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    toast.success("Link resent. Check your inbox.");
    startCooldown(45);
  }

  // --- Sent screen ---
  if (mode === "sent") {
    return (
      <>
        <NatureBackground />
        <div
          className="min-h-screen flex items-center justify-center px-4 py-12"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 3rem)" }}
        >
          <div className="w-full max-w-md glass rounded-3xl p-7 sm:p-8 fade-up text-center">
            <Link to="/" className="flex flex-col items-center gap-2 text-grace mb-5">
              <DoveMark variant="medallion" className="w-16 h-16 drop-shadow-md" />
            </Link>
            <h1 className="font-display text-3xl text-grace mb-3">Check your email</h1>
            <p className="text-sm text-foreground/70 leading-relaxed">
              We sent a sign-in link to <strong>{email}</strong>. Tap it from this device to continue.
            </p>
            <p className="text-xs text-foreground/55 mt-3">
              Didn't get it? Check your spam folder, or resend below.
            </p>
            <button
              onClick={resend}
              disabled={loading || resendCooldown > 0}
              className="mt-4 w-full py-2.5 rounded-full border border-grace/40 text-grace text-sm font-semibold hover:bg-grace/5 transition disabled:opacity-50"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend link"}
            </button>
            <button
              type="button"
              onClick={() => { setMode("enter"); setEmail(""); }}
              className="mt-3 w-full py-2.5 rounded-full text-grace text-sm font-semibold hover:bg-grace/5 transition"
            >
              Use a different email
            </button>
          </div>
        </div>
      </>
    );
  }

  // --- Enter screen ---
  return (
    <>
      <NatureBackground />
      <div
        className="min-h-screen flex items-center justify-center px-4 py-12"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 3rem)" }}
      >
        <div className="w-full max-w-md glass rounded-3xl p-7 sm:p-8 fade-up">
          <Link to="/" className="flex flex-col items-center gap-2 text-grace mb-3">
            <DoveMark variant="medallion" className="w-20 h-20 drop-shadow-md" />
            <span className="font-display text-xl">GraceNotes Daily</span>
          </Link>
          <h1 className="font-display text-3xl text-center text-grace mb-1">
            {returning ? "Welcome back." : "Welcome in."}
          </h1>
          <p className="text-center text-sm text-foreground/70 mb-6">
            {returning
              ? "He's been waiting for you."
              : "You are seen. You are held. You are welcome here."}
          </p>


          <div className="space-y-2.5 mb-4">
            <button
              type="button"
              onClick={() => signInWithProvider("apple")}
              disabled={loading}
              className="w-full py-3 rounded-full bg-black text-white font-semibold flex items-center justify-center gap-2 hover:bg-black/90 transition disabled:opacity-60"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.05 12.04c-.03-2.93 2.39-4.34 2.5-4.41-1.36-1.99-3.49-2.26-4.25-2.29-1.81-.18-3.53 1.07-4.45 1.07-.92 0-2.34-1.04-3.85-1.01-1.98.03-3.81 1.15-4.83 2.92-2.06 3.57-.53 8.85 1.48 11.75.98 1.42 2.15 3.01 3.69 2.95 1.48-.06 2.04-.96 3.83-.96s2.29.96 3.86.93c1.59-.03 2.6-1.45 3.58-2.87 1.13-1.65 1.59-3.25 1.62-3.34-.04-.02-3.11-1.19-3.14-4.74zM14.13 3.49c.81-.99 1.36-2.36 1.21-3.72-1.17.05-2.59.78-3.43 1.76-.75.87-1.41 2.27-1.23 3.6 1.3.1 2.64-.66 3.45-1.64z"/>
              </svg>
              Continue with Apple
            </button>
            <button
              type="button"
              onClick={() => signInWithProvider("google")}
              disabled={loading}
              className="w-full py-3 rounded-full bg-white text-foreground font-semibold border border-border flex items-center justify-center gap-2 hover:bg-white/90 transition disabled:opacity-60"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-foreground/55 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={onContinue} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-border focus:outline-none focus:ring-2 focus:ring-grace"
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 rounded-full bg-grace text-white font-semibold shadow-soft disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send my link"}
            </button>
          </form>


          {!returning && (
            <p className="text-center text-xs text-foreground/55 pt-4 leading-relaxed">
              By continuing, you agree to our{" "}
              <Link to="/terms" className="text-grace hover:underline">Terms</Link>
              {" "}and{" "}
              <Link to="/privacy" className="text-grace hover:underline">Privacy Policy</Link>.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
