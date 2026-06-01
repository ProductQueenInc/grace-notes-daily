import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { parsePhoneNumberFromString, AsYouType, type CountryCode } from "libphonenumber-js/min";
import { NatureBackground } from "@/components/nature-background";
import { supabase, supabaseConfigured, deviceHasAccount, markDeviceHasAccount } from "@/lib/supabase";
import { toast } from "sonner";
import { DoveMark } from "@/components/dove-mark";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Welcome - GraceNotes Daily" }] }),
  component: Auth,
});

type Mode = "enter" | "otp" | "magic-sent";

function detectKind(value: string): "email" | "phone" | "invalid" {
  const v = value.trim();
  if (!v) return "invalid";
  if (v.includes("@")) return "email";
  const cleaned = v.replace(/[\s\-().]/g, "");
  if (/^\+?\d{7,15}$/.test(cleaned)) return "phone";
  return "invalid";
}

// Try to detect default country from browser locale (e.g. "en-US" -> "US").
function defaultCountry(): CountryCode {
  if (typeof navigator === "undefined") return "US";
  const region = navigator.language?.split("-")[1]?.toUpperCase();
  return (region as CountryCode) || "US";
}

function toE164(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  // If user wrote a leading +, trust them.
  const parsed = parsePhoneNumberFromString(v, v.startsWith("+") ? undefined : defaultCountry());
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number; // E.164
}

function Auth() {
  const nav = useNavigate();
  const [returning, setReturning] = useState(false);
  const [mode, setMode] = useState<Mode>("enter");
  const [input, setInput] = useState("");
  const [kind, setKind] = useState<"email" | "phone" | "invalid">("invalid");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [emailSent, setEmailSent] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    setReturning(deviceHasAccount());
  }, []);

  useEffect(() => {
    setKind(detectKind(input));
  }, [input]);

  // Format the input nicely as the user types a phone number.
  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    const k = detectKind(v);
    if (k === "phone" && !v.includes("@")) {
      // Live-format while typing (without trailing space chaos).
      const formatter = new AsYouType(v.startsWith("+") ? undefined : defaultCountry());
      const formatted = formatter.input(v);
      setInput(formatted);
    } else {
      setInput(v);
    }
  }

  function startCooldown(seconds: number) {
    setResendCooldown(seconds);
    const interval = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) { clearInterval(interval); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  async function onContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) {
      toast.error("Sign-in is temporarily unavailable. Please try again shortly.");
      return;
    }
    const k = detectKind(input);
    if (k === "invalid") {
      toast.error("Enter a valid phone number or email address.");
      return;
    }

    setLoading(true);

    if (k === "email") {
      const email = input.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      setEmailSent(email);
      setMode("magic-sent");
      startCooldown(45);
      return;
    }

    // Phone path
    const e164 = toE164(input);
    if (!e164) {
      setLoading(false);
      toast.error("That phone number doesn't look right. Include your country code (e.g. +1).");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPhoneE164(e164);
    setMode("otp");
    startCooldown(45);
  }

  async function onVerifyOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phoneE164,
      token: otp,
      type: "sms",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      markDeviceHasAccount();
      toast.success("Welcome.");
      // RequireAuth will redirect to /onboarding if not yet onboarded.
      nav({ to: "/home", replace: true });
    }
  }

  async function resendOtp() {
    if (resendCooldown > 0) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: phoneE164 });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("New code sent.");
    startCooldown(45);
  }

  async function resendMagic() {
    if (resendCooldown > 0) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: emailSent,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Link resent. Check your inbox.");
    startCooldown(45);
  }

  // --- OTP screen ---
  if (mode === "otp") {
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
            <h1 className="font-display text-3xl text-grace mb-2">Enter your code</h1>
            <p className="text-sm text-foreground/70 leading-relaxed mb-6">
              We sent a 6-digit code to <strong>{phoneE164}</strong>.
            </p>
            <form onSubmit={onVerifyOtp} className="flex flex-col items-center gap-4">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(v) => {
                  setOtp(v);
                  if (v.length === 6) {
                    // Auto-submit when filled
                    setTimeout(() => onVerifyOtp(), 50);
                  }
                }}
                inputMode="numeric"
                autoFocus
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 rounded-full bg-grace text-white font-semibold shadow-soft disabled:opacity-50"
              >
                {loading ? "Verifying…" : "Continue"}
              </button>
            </form>
            <button
              onClick={resendOtp}
              disabled={loading || resendCooldown > 0}
              className="mt-4 text-xs text-grace font-semibold hover:underline disabled:opacity-50"
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
            </button>
            <div className="mt-3">
              <button
                onClick={() => { setMode("enter"); setOtp(""); }}
                className="text-xs text-foreground/60 hover:text-foreground"
              >
                Use a different number
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // --- Magic link sent screen ---
  if (mode === "magic-sent") {
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
              We sent a sign-in link to <strong>{emailSent}</strong>. Tap it from this device to continue.
            </p>
            <p className="text-xs text-foreground/55 mt-3">
              Didn't get it? Check your spam folder, or resend below.
            </p>
            <button
              onClick={resendMagic}
              disabled={loading || resendCooldown > 0}
              className="mt-4 w-full py-2.5 rounded-full border border-grace/40 text-grace text-sm font-semibold hover:bg-grace/5 transition disabled:opacity-50"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend link"}
            </button>
            <button
              type="button"
              onClick={() => { setMode("enter"); setEmailSent(""); }}
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
            {returning ? "Welcome back" : "Begin your journey"}
          </h1>
          <p className="text-center text-sm text-foreground/70 mb-6">
            {returning
              ? "Enter your phone or email to sign in."
              : "Enter your phone or email to create your account."}
          </p>

          <form onSubmit={onContinue} className="space-y-3">
            <input
              value={input}
              onChange={onInputChange}
              required
              autoFocus
              inputMode="text"
              autoComplete="username"
              placeholder="Phone number or email"
              className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-border focus:outline-none focus:ring-2 focus:ring-grace"
            />
            {input && kind === "invalid" && (
              <p className="text-xs text-foreground/55 px-1">
                Enter a phone number (with country code, e.g. +1…) or an email address.
              </p>
            )}
            {kind === "phone" && (
              <p className="text-xs text-foreground/55 px-1">
                We'll text you a 6-digit code. Standard SMS rates may apply.
              </p>
            )}
            {kind === "email" && (
              <p className="text-xs text-foreground/55 px-1">
                We'll email you a one-tap sign-in link.
              </p>
            )}

            <button
              type="submit"
              disabled={loading || kind === "invalid"}
              className="w-full py-3 rounded-full bg-grace text-white font-semibold shadow-soft disabled:opacity-60"
            >
              {loading ? "Sending…" : "Continue"}
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
