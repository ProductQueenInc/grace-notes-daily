import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { NatureBackground } from "@/components/nature-background";
import { PageHeader } from "@/components/page-header";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { capitalizeFirst } from "@/lib/personalization";
import { localTodayISO } from "@/lib/today";
import { getInferredThemes, deleteInferredTheme } from "@/lib/profile-themes.functions";
import { capture } from "@/lib/analytics";
import {
  LogOut, Settings as SettingsIcon, Trash2, FileText, ShieldCheck, Info, HelpCircle,
  Sprout, Wind, Compass as CompassIcon, Anchor, X as XIcon,
} from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings - GraceNotes Daily" }] }),
  component: () => <RequireAuth><AppShell><Settings /></AppShell></RequireAuth>,
});

const PHASES = [
  { id: "newbie", icon: Sprout, title: "Newbie" },
  { id: "returnee", icon: Wind, title: "Returnee" },
  { id: "growth", icon: CompassIcon, title: "Growth" },
  { id: "elder", icon: Anchor, title: "Elder" },
] as const;

const VOICES = [
  { id: "gentle", title: "Gentle", hint: "Soft, present, comforting." },
  { id: "grounding", title: "Grounding", hint: "Direct, steady, clear." },
] as const;

const RHYTHMS = [
  { id: "morning", label: "Morning" },
  { id: "midday", label: "Midday" },
  { id: "evening", label: "Evening" },
  { id: "night", label: "Before bed" },
] as const;


function todayISO() {
  return localTodayISO();
}

function Settings() {
  const { user, profile, reloadProfile } = useAuth();
  const nav = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [phase, setPhase] = useState<string>("growth");
  const [voice, setVoice] = useState<string>("gentle");
  const [rhythms, setRhythms] = useState<string[]>([]);
  const [translation, setTranslation] = useState<string>("NIV");
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Inferred themes (populated by the backend classifier)
  const fetchThemes = useServerFn(getInferredThemes);
  const deleteTheme = useServerFn(deleteInferredTheme);
  const themesQuery = useQuery({
    queryKey: ["inferred-themes", user?.id ?? "anon"],
    queryFn: () => fetchThemes(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const deleteMutation = useMutation({
    mutationFn: (theme: string) => deleteTheme({ data: { theme } }),
    onSuccess: (next, theme) => {
      queryClient.setQueryData(["inferred-themes", user?.id ?? "anon"], next);
      queryClient.invalidateQueries({ queryKey: ["daily-grace-note"] });
      capture("theme_deleted_by_user", { theme });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Could not remove that theme.";
      toast.error(msg);
    },
  });

  useEffect(() => {
    if (!profile) return;
    setName(profile.name || "");
    setPhase(profile.faith_phase || "growth");
    setVoice(profile.voice || "gentle");
    setRhythms(profile.rhythms || []);
    setTranslation(profile.translation || "NIV");
  }, [profile]);

  function toggleIn(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  async function save() {
    if (!user || !supabaseConfigured) return toast.error("Sign in first.");
    setSaving(true);

    const today = todayISO();
    const normalizedName = capitalizeFirst(name);

    const { error } = await supabase
      .from("profiles")
      .update({
        name: normalizedName,
        faith_phase: phase,
        voice,
        rhythms,
        translation,
      })
      .eq("id", user.id);



    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }

    // Personalization changed - today's cached grace note and devotional are stale.
    // Clear both cache tables (personal per-user cache + cron-prepared grace note).
    await Promise.all([
      supabase.from("daily_content").delete().eq("user_id", user.id).eq("date", today),
      supabase.from("daily_grace_notes").delete().eq("user_id", user.id).eq("date", today),
    ]);

    queryClient.invalidateQueries({ queryKey: ["daily-grace-note"] });
    queryClient.invalidateQueries({ queryKey: ["devotional"] });

    toast.success("Saved with care. Today's note will refresh.");
    reloadProfile();
    setSaving(false);
  }

  async function updateEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: `https://gracenotesdaily.com/auth/callback` }
    );
    setEmailSaving(false);
    if (error) { toast.error(error.message); return; }
    setEmailSent(true);
    setNewEmail("");
  }

  async function signOut() {
    if (supabaseConfigured) await supabase.auth.signOut();
    nav({ to: "/login" });
  }

  async function deleteAccount() {
    if (!confirm("This will permanently delete your account. Continue?")) return;
    toast("Account deletion request received. We'll be in touch within 24 hours.");
  }

  return (
    <>
      <NatureBackground />
      <section className="max-w-2xl mx-auto px-4 md:px-8 md:pt-10 pb-12" style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 3.5rem, 4rem)" }}>
        <PageHeader
          icon={SettingsIcon}
          eyebrow="Personalize"
          title="Settings"
          subtitle="Shape how GraceNotes Daily meets you."
        />

        {/* Identity */}
        <div className="glass rounded-3xl p-5 sm:p-6 space-y-5 mb-5">
          <div>
            <label className="text-sm font-medium block mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-border"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Your faith phase</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PHASES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPhase(p.id)}
                  className={`rounded-2xl p-3 min-h-16 text-center border-2 transition ${phase === p.id ? "border-grace bg-grace-soft" : "border-transparent bg-white/70"}`}
                >
                  <p.icon className="w-6 h-6 mx-auto text-grace" strokeWidth={1.75} />
                  <div className="text-xs font-semibold mt-1">{p.title}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Voice you want to be met with</label>
            <div className="grid grid-cols-2 gap-2">
              {VOICES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVoice(v.id)}
                  className={`rounded-2xl p-3 text-left border-2 transition ${voice === v.id ? "border-grace bg-grace-soft" : "border-transparent bg-white/70"}`}
                >
                  <div className="font-semibold text-sm">{v.title}</div>
                  <div className="text-xs text-foreground/65">{v.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">What we're noticing in your chats</label>
            <p className="text-xs text-foreground/60 mb-3">
              These are gentle themes we've picked up from your daily conversations. Remove any that no longer fit - your grace note will shape around what's left.
            </p>
            {themesQuery.isLoading ? (
              <p className="text-xs text-foreground/50 italic">Listening...</p>
            ) : themesQuery.data && themesQuery.data.themes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {themesQuery.data.themes.map((t) => {
                  const isDeleting = deleteMutation.isPending && deleteMutation.variables === t.theme;
                  return (
                    <span
                      key={t.theme}
                      className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full text-sm border-2 border-transparent bg-grace-soft transition ${isDeleting ? "opacity-50" : ""}`}
                    >
                      <span>{t.theme}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${t.theme}`}
                        disabled={isDeleting}
                        onClick={() => deleteMutation.mutate(t.theme)}
                        className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-grace/15 transition"
                      >
                        <XIcon className="w-3.5 h-3.5 text-grace" strokeWidth={2} />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-foreground/55 italic">
                Nothing yet - as you chat each day, gentle themes will show up here.
              </p>
            )}
          </div>


          <div>
            <label className="text-sm font-medium block mb-2">Bible translation</label>
            <div className="rounded-2xl bg-white/70 border border-border px-4 py-3">
              <p className="text-sm text-foreground/85">
                Scripture quotations throughout GraceNotes are from the Holy Bible,
                New International Version&#174; (NIV&#174;).
              </p>
              <p className="text-xs text-foreground/55 mt-1">
                Copyright &#169; 1973, 1978, 1984, 2011 by Biblica, Inc.&#8482; Used by permission. All rights reserved worldwide.
              </p>
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full py-3 min-h-12 rounded-full bg-grace text-white font-semibold disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>

        {/* Rhythm preferences - stored, not yet acted on */}
        <div className="glass rounded-3xl p-5 sm:p-6 mb-5">
          <div className="mb-2">
            <div className="font-medium">Your rhythm</div>
            <div className="text-xs text-foreground/65 mt-1">
              When do you most want to be met? We'll use these times when we add gentle reminders. For now, your daily note is here whenever you open the app.
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {RHYTHMS.map((r) => (
              <button
                key={r.id}
                onClick={() => setRhythms((prev) => toggleIn(prev, r.id))}
                className={`px-3 py-1.5 rounded-full text-sm border-2 transition ${rhythms.includes(r.id) ? "border-grace bg-grace-soft" : "border-transparent bg-white/70"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Account / Email */}
        <div className="glass rounded-3xl p-5 sm:p-6 mb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-foreground/65 px-1 pb-3">Account</p>
          <p className="text-sm text-foreground/70 mb-1">
            Signed in as <strong>{user?.email}</strong>
          </p>
          {emailSent ? (
            <p className="text-sm text-grace mt-3">
              Confirmation sent. Check both your old and new email inboxes to complete the change.
            </p>
          ) : (
            <form onSubmit={updateEmail} className="mt-3 space-y-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="New email address"
                className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-border focus:outline-none focus:ring-2 focus:ring-grace"
              />
              <button
                type="submit"
                disabled={emailSaving || !newEmail.trim()}
                className="w-full py-3 rounded-full border border-grace text-grace font-semibold hover:bg-grace/5 transition disabled:opacity-50"
              >
                {emailSaving ? "Sending confirmation…" : "Update email"}
              </button>
            </form>
          )}
        </div>

        {/* Info & Legal */}
        <div className="glass rounded-3xl p-5 sm:p-6 space-y-2 mb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-foreground/65 px-1 pb-1">Info & Legal</p>
          <Link to="/about" className="w-full flex items-center gap-2 px-4 py-3 min-h-12 rounded-2xl hover:bg-grace-soft text-left">
            <Info className="w-4 h-4 text-grace" /> About GraceNotes Daily
          </Link>
          <Link to="/faq" className="w-full flex items-center gap-2 px-4 py-3 min-h-12 rounded-2xl hover:bg-grace-soft text-left">
            <HelpCircle className="w-4 h-4 text-grace" /> FAQ
          </Link>
          <Link to="/terms" className="w-full flex items-center gap-2 px-4 py-3 min-h-12 rounded-2xl hover:bg-grace-soft text-left">
            <FileText className="w-4 h-4 text-grace" /> Terms of Use
          </Link>
          <Link to="/privacy" className="w-full flex items-center gap-2 px-4 py-3 min-h-12 rounded-2xl hover:bg-grace-soft text-left">
            <ShieldCheck className="w-4 h-4 text-grace" /> Privacy Policy
          </Link>
        </div>

        <div className="glass rounded-3xl p-5 sm:p-6 space-y-2">
          <button onClick={signOut} className="w-full flex items-center gap-2 px-4 py-3 min-h-12 rounded-2xl hover:bg-grace-soft text-left">
            <LogOut className="w-4 h-4 text-grace" /> Sign out
          </button>
          <button onClick={deleteAccount} className="w-full flex items-center gap-2 px-4 py-3 min-h-12 rounded-2xl hover:bg-destructive/10 text-destructive text-left">
            <Trash2 className="w-4 h-4" /> Delete account
          </button>
        </div>
      </section>
    </>
  );
}
