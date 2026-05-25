import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NatureBackground } from "@/components/nature-background";
import { useAuth, writeProfileExtras, type Rhythm, type Voice } from "@/hooks/use-auth";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import {
  Sun, Sunset, Moon, Coffee, Heart, Compass, Sprout, BookOpen, Anchor,
  Sparkles, ArrowRight, ArrowLeft, Wind, HandHeart,
} from "lucide-react";

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

const RHYTHMS: { id: Rhythm; label: string; icon: typeof Sun }[] = [
  { id: "morning", label: "Morning quiet time", icon: Coffee },
  { id: "midday", label: "Midday reset", icon: Sun },
  { id: "evening", label: "Evening reflection", icon: Sunset },
  { id: "night", label: "Before bed", icon: Moon },
];

const SEASONS = [
  "Anxiety", "Grief", "Gratitude", "Discernment", "Hope",
  "Rest", "Discipline", "Relationships", "Purpose", "Doubt",
] as const;

const VOICES: { id: Voice; title: string; desc: string; icon: typeof Heart }[] = [
  { id: "gentle", title: "Held and gentle", desc: "Soft, comforting, slow.", icon: Heart },
  { id: "grounding", title: "Direct and grounding", desc: "Clear, steady, rooted.", icon: Anchor },
];

function Onboarding() {
  const { user, loading, reloadProfile } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<typeof PHASES[number]["id"] | null>(null);
  const [rhythms, setRhythms] = useState<Rhythm[]>([]);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [voice, setVoice] = useState<Voice | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user && supabaseConfigured) nav({ to: "/login" });
  }, [user, loading, nav]);

  function toggle<T>(list: T[], v: T, max: number, set: (l: T[]) => void) {
    if (list.includes(v)) set(list.filter((x) => x !== v));
    else if (list.length < max) set([...list, v]);
    else toast(`You can pick up to ${max}.`);
  }

  async function finish() {
    if (!user) {
      toast.error("You're not signed in. Please sign in again.");
      nav({ to: "/login" });
      return;
    }
    if (!phase) { toast.error("Please pick where you are in your faith."); setStep(2); return; }
    if (!voice) { toast.error("Please pick a voice."); setStep(5); return; }

    setSaving(true);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const seasonObjs = seasons.map((tag) => ({ tag, set_at: new Date().toISOString() }));

    try {
      if (supabaseConfigured) {
        const { error } = await supabase.from("profiles").upsert({
          id: user.id,
          name,
          faith_phase: phase,
          onboarded: true,
          rhythms,
          seasons: seasonObjs,
          voice,
          timezone,
        });
        if (error) {
          console.error("[onboarding] upsert failed", error);
          toast.error(`Could not save: ${error.message}`);
          setSaving(false);
          return;
        }
      } else {
        writeProfileExtras(user.id, { rhythms, seasons: seasonObjs, voice, timezone, translation: null });
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
    3: true, // optional
    4: true, // optional
    5: !!voice,
  };

  return (
    <>
      <NatureBackground />
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl text-white fade-up">
          <div className="flex items-center gap-1.5 mb-6 justify-center">
            {[1, 2, 3, 4, 5].map((n) => (
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
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-gold"
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
                        <div className="text-xs text-white/65 mt-1">{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold mb-2">Your rhythm</p>
                <h1 className="font-display text-3xl md:text-4xl mb-2 leading-tight">When do you like to pause with God?</h1>
                <p className="text-white/75 mb-6">Pick up to two. We'll shape your days around it.</p>
                <div className="grid grid-cols-2 gap-3">
                  {RHYTHMS.map((r) => {
                    const selected = rhythms.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        onClick={() => toggle(rhythms, r.id, 2, setRhythms)}
                        className={`rounded-2xl p-4 text-left border flex items-center gap-3 transition ${
                          selected ? "border-gold bg-white/10" : "border-white/15 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <Icon icon={r.icon} size="md" className={selected ? "text-gold" : "text-white/80"} tone="inherit" />
                        <span className="text-sm font-medium">{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold mb-2">This season</p>
                <h1 className="font-display text-3xl md:text-4xl mb-2 leading-tight">What are you bringing with you?</h1>
                <p className="text-white/75 mb-6">Pick up to three. You can change these anytime.</p>
                <div className="flex flex-wrap gap-2">
                  {SEASONS.map((s) => {
                    const selected = seasons.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggle(seasons, s, 3, setSeasons)}
                        className={`px-4 py-2 rounded-full text-sm border transition ${
                          selected ? "border-gold bg-gold/15 text-white" : "border-white/15 bg-white/5 text-white/85 hover:bg-white/10"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold mb-2">Voice</p>
                <h1 className="font-display text-3xl md:text-4xl mb-2 leading-tight">How would you like me to speak to you?</h1>
                <p className="text-white/75 mb-6">This shapes the tone of your grace notes and replies.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {VOICES.map((v) => {
                    const selected = voice === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setVoice(v.id)}
                        className={`rounded-2xl p-5 text-left border transition ${
                          selected ? "border-gold bg-white/10" : "border-white/15 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <Icon icon={v.icon} size="md" className={selected ? "text-gold" : "text-white/80"} tone="inherit" />
                        <div className="font-semibold mt-2">{v.title}</div>
                        <div className="text-xs text-white/65 mt-1">{v.desc}</div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-white/55 mt-4 flex items-center gap-1.5">
                  <Icon icon={Sparkles} size="sm" className="text-gold" />
                  You can change any of these in Settings, anytime.
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
              {step < 5 ? (
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
                  disabled={!canNext[5] || saving}
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

// Silence unused import warning when build-tools nag
void BookOpen;
