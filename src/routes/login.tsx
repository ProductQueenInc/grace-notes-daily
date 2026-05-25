import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { NatureBackground } from "@/components/nature-background";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { DoveMark } from "@/components/dove-mark";
import { Icon } from "@/components/icon";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in - Grace Notes Daily" }] }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function withGoogle() {
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/home`,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Could not start Google sign-in.");
        return;
      }
      if (result.redirected) return;
      nav({ to: "/home" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start Google sign-in.");
    }
  }

  async function withEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) return toast.error("Add your Supabase keys to enable sign-in.");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    // Confirm a session exists before navigating — guards against the mobile-Safari
    // race where the client thinks it signed in but the session hasn't hydrated yet.
    const { data } = await supabase.auth.getSession();
    setLoading(false);
    if (!data.session) {
      toast.error("Couldn't confirm your session. Please try again.");
      return;
    }
    toast.success("Welcome back");
    nav({ to: "/home", replace: true });
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
            <span className="w-16 h-16 rounded-full bg-white/85 shadow-soft flex items-center justify-center">
              <DoveMark variant="green" className="w-10 h-10" />
            </span>
            <span className="font-display text-xl">GraceNotes Daily</span>
          </Link>
          <h1 className="font-display text-3xl text-center text-grace mb-1">Welcome back</h1>
          <p className="text-center text-sm text-foreground/70 mb-6">He's been waiting for you.</p>


          <button onClick={withGoogle} className="w-full mb-4 py-3 rounded-full bg-white border border-border flex items-center justify-center gap-3 font-medium hover:bg-white/90 transition">
            <GoogleIcon /> Continue with Google
          </button>

          <div className="flex items-center gap-3 my-4 text-xs text-foreground/50">
            <div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={withEmail} className="space-y-3">
            <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="Email" className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-border focus:outline-none focus:ring-2 focus:ring-grace" />
            <div className="relative">
              <input value={password} onChange={(e) => setPassword(e.target.value)} required type={showPassword ? "text" : "password"} placeholder="Password" className="w-full px-4 py-3 pr-12 rounded-2xl bg-white/80 border border-border focus:outline-none focus:ring-2 focus:ring-grace" />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-3 flex items-center text-foreground/60 hover:text-foreground">
                <Icon icon={showPassword ? EyeOff : Eye} size="md" />
              </button>
            </div>
            <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 text-sm">
              <label className="flex items-center gap-2 text-foreground/70">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-[color:var(--grace)]" />
                Remember me
              </label>
              <Link to="/reset-password" className="text-grace hover:underline self-start xs:self-auto">Forgot password?</Link>
            </div>

            <button disabled={loading} className="w-full py-3 rounded-full bg-grace text-white font-semibold shadow-soft disabled:opacity-60">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm mt-5 text-foreground/70">
            New here? <Link to="/signup" className="text-grace font-semibold hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.5 39.5 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.3 35.4 44 30 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
  );
}
