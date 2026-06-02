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

          <form onSubmit={onContinue} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
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
