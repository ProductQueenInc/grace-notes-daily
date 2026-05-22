import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { NatureBackground } from "@/components/nature-background";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — GraceNotes Daily" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [stage, setStage] = useState<"request" | "update">(() =>
    typeof window !== "undefined" && window.location.hash.includes("type=recovery") ? "update" : "request"
  );
  const [loading, setLoading] = useState(false);

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) return toast.error("Add Supabase keys first.");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Check your inbox — a reset link is on its way.");
  }

  async function updatePass(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) return toast.error("Add Supabase keys first.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Password updated. You can sign in now.");
  }

  return (
    <>
      <NatureBackground />
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md glass rounded-3xl p-8 fade-up">
          <h1 className="font-display text-3xl text-center text-grace mb-2">
            {stage === "request" ? "Reset your password" : "Set a new password"}
          </h1>
          <p className="text-center text-sm text-foreground/70 mb-6">
            {stage === "request" ? "We'll send a link to your email." : "Choose something gentle to remember."}
          </p>

          {stage === "request" ? (
            <form onSubmit={requestReset} className="space-y-3">
              <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="Email" className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-border" />
              <button disabled={loading} className="w-full py-3 rounded-full bg-grace text-white font-semibold disabled:opacity-60">
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          ) : (
            <form onSubmit={updatePass} className="space-y-3">
              <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required type="password" placeholder="New password" className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-border" />
              <button disabled={loading} className="w-full py-3 rounded-full bg-grace text-white font-semibold disabled:opacity-60">
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>
          )}

          <p className="text-center text-sm mt-5 text-foreground/70">
            <Link to="/login" className="text-grace font-semibold hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}
