import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { NatureBackground } from "@/components/nature-background";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { DoveMark } from "@/components/dove-mark";
import { Icon } from "@/components/icon";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Welcome - GraceNotes Daily" }] }),
  component: Auth,
});

function Auth() {
  const nav = useNavigate();
  const [isNewUser, setIsNewUser] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  function editSignupEmail() {
    setEmailSent(false);
    setIsNewUser(true);
    setResendCooldown(0);
    setResending(false);
  }

  async function resendConfirmation() {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Confirmation email resent. Check your inbox.");
    setResendCooldown(45);
    const interval = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) { clearInterval(interval); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  async function withGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        toast.error(error.message ?? "Could not start Google sign-in.");
        return;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start Google sign-in.");
    }
  }

  async function withEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) return toast.error("Sign-in is temporarily unavailable. Please try again shortly.");
    setLoading(true);

    if (isNewUser) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!data.session) {
        // Supabase email confirmation is enabled — user must confirm before continuing.
        setEmailSent(true);
        return;
      }
      toast.success("Welcome to GraceNotes Daily.");
      nav({ to: "/onboarding" });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        if (error.message.toLowerCase().includes("invalid login credentials")) {
          toast.error("Email or password not recognised. New here? Switch to creating an account below.");
        } else {
          toast.error(error.message);
        }
        return;
      }
      // Confirm session before navigating — guards mobile Safari race where the
      // client believes it signed in but the session hasn't fully hydrated.
      const { data, error: userError } = await supabase.auth.getUser();
      setLoading(false);
      if (userError || !data.user) {
        toast.error("Couldn't confirm your session. Please try again.");
        return;
      }
      toast.success("Welcome back.");
      // RequireAuth will redirect to /onboarding if onboarding is incomplete.
      nav({ to: "/home", replace: true });
    }
  }

  if (emailSent) {
    return (
      <>
        <NatureBackground />
        <div
          className="min-h-screen flex items-center justify-center px-4 py-12"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 3rem)" }}
        >
          <div className="w-full max-w-md glass rounded-3xl p-7 sm:p-8 fade-up text-center">
            <Link to="/" className="flex flex-col items-center gap-2 text-grace mb-6">
              <DoveMark variant="medallion" className="w-16 h-16 drop-shadow-md" />
            </Link>
            <h1 className="font-display text-3xl text-grace mb-3">Check your email</h1>
            <p className="text-sm text-foreground/70 leading-relaxed">
              We sent a confirmation link to <strong>{email}</strong>. Click it to complete your account and begin your journey.
            </p>
            <p className="text-xs text-foreground/55 mt-3">
              Didn't get it? Check your spam folder, or resend below.
            </p>
            <button
              onClick={resendConfirmation}
              disabled={resending || resendCooldown > 0}
              className="mt-4 w-full py-2.5 rounded-full border border-grace/40 text-grace text-sm font-semibold hover:bg-grace/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending
                ? "Resending…"
                : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend confirmation email"}
            </button>
            <button
              type="button"
              onClick={editSignupEmail}
              className="mt-3 w-full py-2.5 rounded-full text-grace text-sm font-semibold hover:bg-grace/5 transition"
            >
              Edit email address
            </button>
            <p className="text-xs text-foreground/50 mt-4">
              Already confirmed?{" "}
              <button
                onClick={() => { setEmailSent(false); setIsNewUser(false); }}
                className="text-grace font-semibold hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </>
    );
  }

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
            {isNewUser ? "Begin your journey" : "Welcome back"}
          </h1>
          <p className="text-center text-sm text-foreground/70 mb-6">
            {isNewUser ? "A soft, daily space - just for you." : "He's been waiting for you."}
          </p>

          <button
            onClick={withGoogle}
            className="w-full mb-4 py-3 rounded-full bg-white border border-border flex items-center justify-center gap-3 font-medium hover:bg-white/90 transition"
          >
            <GoogleIcon /> Continue with Google
          </button>

          <div className="flex items-center gap-3 my-4 text-xs text-foreground/50">
            <div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={withEmail} className="space-y-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              placeholder="Email"
              className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-border focus:outline-none focus:ring-2 focus:ring-grace"
            />
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                minLength={8}
                className="w-full px-4 py-3 pr-12 rounded-2xl bg-white/80 border border-border focus:outline-none focus:ring-2 focus:ring-grace"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-3 flex items-center text-foreground/60 hover:text-foreground"
              >
                <Icon icon={showPassword ? EyeOff : Eye} size="md" />
              </button>
            </div>

            {!isNewUser && (
              <div className="flex justify-end">
                <Link to="/reset-password" className="text-xs text-grace hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              disabled={loading}
              className="w-full py-3 rounded-full bg-grace text-white font-semibold shadow-soft disabled:opacity-60"
            >
              {loading ? (isNewUser ? "Creating…" : "Signing in…") : "Continue"}
            </button>
          </form>

          <p className="text-center text-sm mt-5 text-foreground/70">
            {isNewUser ? (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setIsNewUser(false)}
                  className="text-grace font-semibold hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                New here?{" "}
                <button
                  onClick={() => setIsNewUser(true)}
                  className="text-grace font-semibold hover:underline"
                >
                  Create an account
                </button>
              </>
            )}
          </p>

          {isNewUser && (
            <p className="text-center text-xs text-foreground/55 pt-2 leading-relaxed">
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.4 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.5 39.5 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.3 35.4 44 30 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}
