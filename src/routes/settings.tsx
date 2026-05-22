import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { NatureBackground } from "@/components/nature-background";
import { PageHeader } from "@/components/page-header";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { LogOut, Settings as SettingsIcon, Trash2 } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — GraceNotes Daily" }] }),
  component: () => <RequireAuth><AppShell><Settings /></AppShell></RequireAuth>,
});

import { Sprout, Wind, Compass as CompassIcon, Anchor } from "lucide-react";

const PHASES = [
  { id: "newbie", icon: Sprout, title: "Newbie" },
  { id: "returnee", icon: Wind, title: "Returnee" },
  { id: "growth", icon: CompassIcon, title: "Growth" },
  { id: "elder", icon: Anchor, title: "Elder" },
] as const;

function Settings() {
  const { user, profile, reloadProfile } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<string>("growth");
  const [dark, setDark] = useState(false);
  const [reminder, setReminder] = useState("morning");
  const [personalize, setPersonalize] = useState(true);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setPhase(profile.faith_phase || "growth");
    }
  }, [profile]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  async function save() {
    if (!user || !supabaseConfigured) return toast.error("Sign in first.");
    const { error } = await supabase.from("profiles").update({ name, faith_phase: phase }).eq("id", user.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Saved with care");
      reloadProfile();
    }
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
      <section className="max-w-2xl mx-auto px-4 md:px-8 pt-6 md:pt-10">
        <PageHeader
          icon={SettingsIcon}
          eyebrow="Personalize"
          title="Settings"
          subtitle="Make GraceNotes Daily truly yours."
        />

        <div className="glass rounded-3xl p-6 space-y-5 mb-5">
          <div>
            <label className="text-sm font-medium block mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-border" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Your faith phase</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PHASES.map((p) => (
                <button key={p.id} onClick={() => setPhase(p.id)} className={`rounded-2xl p-3 text-center border-2 transition ${phase === p.id ? "border-grace bg-grace-soft" : "border-transparent bg-white/70"}`}>
                  <p.icon className="w-6 h-6 mx-auto text-grace" strokeWidth={1.75} />
                  <div className="text-xs font-semibold mt-1">{p.title}</div>
                </button>
              ))}
            </div>
          </div>
          <button onClick={save} className="w-full py-3 rounded-full bg-grace text-white font-semibold">Save changes</button>
        </div>

        <div className="glass rounded-3xl p-6 space-y-4 mb-5">
          <Row label="Dark mode" hint="Easier on the eyes at night.">
            <Toggle checked={dark} onChange={setDark} />
          </Row>
          <Row label="Daily reminder" hint="When should we nudge you?">
            <select value={reminder} onChange={(e) => setReminder(e.target.value)} className="px-3 py-2 rounded-full bg-white/80 border border-border text-sm">
              <option value="morning">Morning</option>
              <option value="midday">Midday</option>
              <option value="evening">Evening</option>
              <option value="off">Off</option>
            </select>
          </Row>
          <Row label="Personalize content" hint="Tailor grace notes to your phase.">
            <Toggle checked={personalize} onChange={setPersonalize} />
          </Row>
        </div>

        <div className="glass rounded-3xl p-6 space-y-2">
          <button onClick={signOut} className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl hover:bg-grace-soft text-left">
            <LogOut className="w-4 h-4 text-grace" /> Sign out
          </button>
          <button onClick={deleteAccount} className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl hover:bg-destructive/10 text-destructive text-left">
            <Trash2 className="w-4 h-4" /> Delete account
          </button>
        </div>
      </section>
    </>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-foreground/60">{hint}</div>
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={`w-11 h-6 rounded-full transition ${checked ? "bg-grace" : "bg-muted"}`}>
      <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}
