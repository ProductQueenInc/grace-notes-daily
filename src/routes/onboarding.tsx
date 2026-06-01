import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { parsePhoneNumberFromString, AsYouType, type CountryCode } from "libphonenumber-js/min";
import { NatureBackground } from "@/components/nature-background";
import { useAuth, writeProfileExtras, type Rhythm, type Voice } from "@/hooks/use-auth";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Sun, Sunset, Moon, Coffee, Heart, Compass, Sprout, BookOpen, Anchor,
  Sparkles, ArrowRight, ArrowLeft, Wind, HandHeart, ShieldCheck,
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

const TOTAL_STEPS = 6;

function defaultCountry(): CountryCode {
  if (typeof navigator === "undefined") return "US";
  const region = navigator.language?.split("-")[1]?.toUpperCase();
  return (region as CountryCode) || "US";
}

function toE164(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  const parsed = parsePhoneNumberFromString(v, v.startsWith("+") ? undefined : defaultCountry());
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

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

  // --- Backup contact state (step 6) ---
  // `signedUpWith` decides which field to ASK for: if signed up with phone,
  // ask for email (and vice versa).
  const signedUpWith: "phone" | "email" | null = user
    ? user.phone ? "phone" : user.email ? "email" : null
    : null;
  const askingFor: "email" | "phone" = signedUpWith === "phone" ? "email" : "phone";
  const [backupValue, setBackupValue] = useState("");
  const [backupSending, setBackupSending] = useState(false);
  const [backupStage, setBackupStage] = useState<"enter" | "verify-phone" | "verify-email-sent" | "done">("enter");
  const [backupOtp, setBackupOtp] = useState("");
  const [pendingPhoneE164, setPendingPhoneE164] = useState("");

  useEffect(() => {
    if (!loading && !user && supabaseConfigured) nav({ to: "/login" });
  }, [user, loading, nav]);

  function toggle<T>(list: T[], v: T, max: number, set: (l: T[]) => void) {
    if (list.includes(v)) set(list.filter((x) => x !== v));
    else if (list.length < max) set([...list, v]);
    else toast(`You can pick up to ${max}.`);
  }

  function onBackupInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (askingFor === "phone") {
      const formatter = new AsYouType(v.startsWith("+") ? undefined : defaultCountry());
      setBackupValue(formatter.input(v));
    } else {
      setBackupValue(v);
    }
  }

  async function sendBackup() {
    if (!user) return;
    setBackupSending(true);
    try {
      if (askingFor === "email") {
        const email = backupValue.trim().toLowerCase();
        if (!email.includes("@")) {
          toast.error("Enter a valid email address.");
          return;
        }
        const { error } = await supabase.auth.updateUser({ email });
        if (error) {
          if (error.message.toLowerCase().includes("already")) {
            toast.error("That email is already on another account. You can sign in with it instead.");
          } else {
            toast.error(error.message);
          }
          return;
        }
        setBackupStage("verify-email-sent");
      } else {
        const e164 = toE164(backupValue);
        if (!e164) {
          toast.error("That phone number doesn't look right. Include your country code.");
          return;
        }
        const { error } = await supabase.auth.updateUser({ phone: e164 });
        if (error) {
          if (error.message.toLowerCase().includes("already")) {
            toast.error("That phone is already on another account. You can sign in with it instead.");
          } else {
            toast.error(error.message);
          }
          return;
        }
        setPendingPhoneE164(e164);
        setBackupStage("verify-phone");
      }
    } finally {
      setBackupSending(false);
    }
  }

  async function verifyBackupPhone() {
    if (backupOtp.length !== 6) return;
    setBackupSending(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: pendingPhoneE164,
      token: backupOtp,
      type: "phone_change",
    });
    setBackupSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Backup phone confirmed.");
    setBackupStage("done");
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
    3: true,
    4: true,
    5: !!voice,
    6: true, // optional — skip always allowed
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

            {step === 6 && (
              <>
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold mb-2">A backup way in</p>
                <h1 className="font-display text-3xl md:text-4xl mb-2 leading-tight">
                  {backupStage === "done" ? "All set." : "One more thing."}
                </h1>
                <p className="text-white/75 mb-6">
                  {backupStage === "done"
                    ? "You can now sign in with either method on any device."
                    : signedUpWith === "phone"
                      ? "Add an email as a backup so you can still get in if you change your phone number. We'll confirm it's yours."
                      : "Add a phone number as a backup so you can still get in if you lose your inbox. We'll send a quick code to confirm."}
                </p>

                {backupStage === "enter" && (
                  <div className="space-y-3">
                    <input
                      value={backupValue}
                      onChange={onBackupInputChange}
                      placeholder={askingFor === "email" ? "Email address" : "Phone number (with country code)"}
                      inputMode={askingFor === "email" ? "email" : "tel"}
                      autoComplete={askingFor === "email" ? "email" : "tel"}
                      className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                    <button
                      onClick={sendBackup}
                      disabled={backupSending || !backupValue.trim()}
                      className="w-full py-3 rounded-2xl bg-gold text-gold-foreground font-semibold disabled:opacity-50"
                    >
                      {backupSending ? "Sending…" : askingFor === "email" ? "Send confirmation email" : "Send code"}
                    </button>
                  </div>
                )}

                {backupStage === "verify-phone" && (
                  <div className="space-y-4">
                    <p className="text-sm text-white/80">
                      Enter the 6-digit code we sent to <strong>{pendingPhoneE164}</strong>.
                    </p>
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={backupOtp}
                        onChange={(v) => {
                          setBackupOtp(v);
                          if (v.length === 6) setTimeout(() => verifyBackupPhone(), 50);
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
                    </div>
                    <button
                      onClick={verifyBackupPhone}
                      disabled={backupSending || backupOtp.length !== 6}
                      className="w-full py-3 rounded-2xl bg-gold text-gold-foreground font-semibold disabled:opacity-50"
                    >
                      {backupSending ? "Verifying…" : "Confirm"}
                    </button>
                  </div>
                )}

                {backupStage === "verify-email-sent" && (
                  <div className="rounded-2xl bg-white/10 border border-white/15 p-5 space-y-2">
                    <p className="text-sm text-white/85">
                      We sent a confirmation link to <strong>{backupValue}</strong>. Open it whenever you have a moment — your backup will activate the next time you sign in.
                    </p>
                    <p className="text-xs text-white/55">
                      You don't need to wait. Tap Begin below to continue.
                    </p>
                  </div>
                )}

                {backupStage === "done" && (
                  <div className="rounded-2xl bg-white/10 border border-white/15 p-5 flex items-center gap-3">
                    <Icon icon={ShieldCheck} size="md" className="text-gold" tone="inherit" />
                    <p className="text-sm text-white/85">Backup contact saved.</p>
                  </div>
                )}

                <p className="text-[11px] text-white/55 mt-4">
                  You can also add or change this in Settings, anytime.
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
                <div className="flex items-center gap-2">
                  {backupStage === "enter" && (
                    <button
                      onClick={finish}
                      disabled={saving}
                      className="px-5 py-2.5 rounded-full text-sm text-white/80 hover:bg-white/10"
                    >
                      Skip for now
                    </button>
                  )}
                  <button
                    onClick={finish}
                    disabled={!canNext[6] || saving}
                    className="px-8 py-2.5 rounded-full bg-gold text-gold-foreground font-semibold disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {saving ? "Saving…" : (<><Icon icon={HandHeart} size="sm" tone="inherit" /> Begin</>)}
                  </button>
                </div>
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
