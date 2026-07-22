import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NatureBackground } from "@/components/nature-background";
import { useAuth, writeProfileExtras } from "@/hooks/use-auth";
import { capitalizeFirst } from "@/lib/personalization";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { capture } from "@/lib/analytics";
import { takePendingShareToken } from "@/lib/share";
import { Icon } from "@/components/icon";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Compass, Sprout, Anchor, Wind,
  Sparkles, ArrowRight, ArrowLeft, HandHeart,
} from "lucide-react";

// claim_share_attribution was added after the generated types were last
// regenerated (same situation as share.functions.ts / share_clicks), so cast
// to a schema-agnostic client for this one call.
const rpcClient = supabase as unknown as SupabaseClient;

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome - GraceNotes Daily" }] }),
  component: Onboarding,
});

const PHASES = [
  { id: "newbie", icon: Sprout, title: "Newbie", desc: "I'm just starting to explore." },
  { id: "returnee", icon: Wind, title: "Returnee", desc: "I'm slowly coming back." },
  { id: "growth", icon: Compass, title: "Growth", desc: "I'm ready to go deeper." },
  { id: "elder", icon: Anchor, title: "Elder", desc: "Faith is a way of life." },
] as const;

// Onboarding is intentionally just two questions: name + faith phase.
// Everything else that used to be asked here is now either defaulted
// (voice = gentle, rhythms = none) and editable in Settings, or learned
// over time (the "seasons" signal is now inferred from the user's daily
// chat rather than picked on a form). See CLAUDE.md 2026-06-22.
const TOTAL_STEPS = 2;

// Sensible defaults for the fields we no longer collect at onboarding.
const DEFAULT_VOICE = "gentle" as const;

function Onboarding() {
  const { user, loading, reloadProfile } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<typeof PHASES[number]["id"] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user && supabaseConfigured) nav({ to: "/login" });
  }, [user, loading, nav]);

  async function finish() {
    if (!user) {
      toast.error("You're not signed in. Please sign in again.");
      nav({ to: "/login" });
      return;
    }
    if (!phase) { toast.error("Please pick where you are in your faith."); setStep(2); return; }

    setSaving(true);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const normalizedName = capitalizeFirst(name);

    try {
      if (supabaseConfigured) {
        const { error } = await supabase.from("profiles").upsert({
          id: user.id,
          name: normalizedName,
          faith_phase: phase,
          onboarded: true,
          // Defaulted, not asked. Editable later in Settings.
          rhythms: [],
          seasons: [],
          voice: DEFAULT_VOICE,
          timezone,
        });
        if (error) {
          console.error("[onboarding] upsert failed", error);
          toast.error(`Could not save: ${error.message}`);
          setSaving(false);
          return;
        }
      } else {
        writeProfileExtras(user.id, { rhythms: [], seasons: [], voice: DEFAULT_VOICE, timezone, translation: null });
      }

      // This is the activation event — everything upstream is funnel.
      capture("onboarding_completed", { faith_phase: phase, voice: DEFAULT_VOICE });

      // If this visitor arrived via a shared link, claim the attribution now
      // that they have an account (they weren't signed in when the link was
      // first clicked). Best-effort — never blocks finishing onboarding.
      const pendingShareToken = takePendingShareToken();
      if (pendingShareToken && supabaseConfigured) {
        rpcClient.rpc("claim_share_attribution", { p_token: pendingShareToken }).then(
          ({ error }: { error: { message: string } | null }) => {
            if (error) console.warn("[onboarding] claim_share_attribution failed:", error.message);
          },
        );
      }

      await reloadProfile();
      setSaving(false);
      nav({ to: "/home" });
    } catch (e) {
      console.error("[onboarding] finish crashed", e);
      toast.error(e instanceof Error ? e.message : "Something went wrong saving your profile.");
      setSaving(false);
    }
  }

  const canNext: Record<number, boolean> = {
    1: name.trim().length > 0,
    2: !!phase,
  };

  return (
    <>
      <NatureBackground />
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl text-white fade-up">
          <div className="flex items-center gap-1.5 mb-6 justify-center">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
              <span
                key={n}
                className={`h-1.5 rounded-full transition-all ${
                  n === step ? "w-8 bg-gold" : n < step ? "w-6 bg-white/60" : "w-6 bg-white/20"
                }`}
              />
            ))}
          </div>

          <div className="glass-on-hue rounded-3xl p-7 md:p-10">
            {step === 1 && (
              <>
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold mb-2">Welcome</p>
                <h1 className="font-display text-3xl md:text-4xl mb-2 leading-tight">What should I call you?</h1>
                <p className="text-white/75 mb-6">Just a first name or nickname is perfect.</p>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold mb-2">Your journey</p>
                <h1 className="font-display text-3xl md:text-4xl mb-2 leading-tight">
                  Where are you with your faith right now{name ? `, ${name}` : ""}?
                </h1>
                <p className="text-white/75 mb-6">No wrong answer. Just honesty.</p>
                <div className="grid grid-cols-2 gap-3">
                  {PHASES.map((p) => {
                    const selected = phase === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setPhase(p.id)}
                        className={`rounded-2xl p-5 text-left border transition ${
                          selected ? "border-gold bg-white/10" : "border-white/15 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <Icon icon={p.icon} size="md" className={selected ? "text-gold" : "text-white/80"} tone="inherit" />
                        <div className="font-semibold mt-2">{p.title}</div>
                        <div className="text-xs text-white/80 mt-1">{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-white/75 mt-4 flex items-center gap-1.5">
                  <Icon icon={Sparkles} size="sm" className="text-gold" />
                  You can fine-tune everything else in Settings, anytime.
                </p>
              </>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              {step > 1 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 rounded-full text-sm text-white/75 hover:bg-white/10 flex items-center gap-1"
                >
                  <Icon icon={ArrowLeft} size="sm" /> Back
                </button>
              ) : (
                <span />
              )}
              {step < TOTAL_STEPS ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canNext[step]}
                  className="px-6 py-2.5 rounded-full bg-gold text-gold-foreground font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  Continue <Icon icon={ArrowRight} size="sm" tone="inherit" />
                </button>
              ) : (
                <button
                  onClick={finish}
                  disabled={!canNext[step] || saving}
                  className="px-8 py-2.5 rounded-full bg-gold text-gold-foreground font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving ? "Saving…" : (<><Icon icon={HandHeart} size="sm" tone="inherit" /> Begin</>)}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
