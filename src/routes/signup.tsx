import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { NatureBackground } from "@/components/nature-background";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { DoveMark } from "@/components/dove-mark";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create your account - GraceNotes Daily" }] }),
  component: Signup,
});

function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  async function withGoogle() {
    if (!supabaseConfigured) return toast.error("Add your Supabase keys to enable sign-up.");
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/onboarding` } });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) return toast.error("Add your Supabase keys to enable sign-up.");
    if (password !== confirm) return toast.error("Passwords don't match.");
    if (!agree) return toast.error("Please accept the terms to continue.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/onboarding` },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Welcome Check your inbox to confirm.");
      nav({ to: "/onboarding" });
    }
  }

  return (
    <>
      <NatureBackground />
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md glass rounded-3xl p-8 fade-up">
          <Link to="/" className="flex items-center justify-center gap-2 text-grace mb-2">
            <Heart className="w-5 h-5 fill-current" />
            <span className="font-display text-2xl">GraceNotes Daily</span>
          </Link>
          <h1 className="font-display text-3xl text-center text-grace mb-1">Begin your journey</h1>
          <p className="text-center text-sm text-foreground/70 mb-6">A soft, daily space - just for you.</p>

          <button onClick={withGoogle} className="w-full mb-4 py-3 rounded-full bg-white border border-border flex items-center justify-center gap-3 font-medium hover:bg-white/90 transition">
            <span className="w-[18px] h-[18px] inline-block bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22><path fill=%22%23FFC107%22 d=%22M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z%22/></svg>')]" />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-4 text-xs text-foreground/50">
            <div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="Email" className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-border focus:outline-none focus:ring-2 focus:ring-grace" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" placeholder="Password" className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-border focus:outline-none focus:ring-2 focus:ring-grace" />
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} required type="password" placeholder="Confirm password" className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-border focus:outline-none focus:ring-2 focus:ring-grace" />
            <label className="flex items-start gap-2 text-sm text-foreground/70">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 accent-[color:var(--grace)]" />
              <span>I agree to the Terms and Privacy Policy.</span>
            </label>
            <button disabled={loading} className="w-full py-3 rounded-full bg-grace text-white font-semibold shadow-soft disabled:opacity-60">
              {loading ? "Creating..." : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm mt-5 text-foreground/70">
            Already have an account? <Link to="/login" className="text-grace font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}
