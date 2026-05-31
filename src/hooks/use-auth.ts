import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { syncCountryCode } from "@/lib/auth.functions";
import type { Session, User } from "@supabase/supabase-js";

export type Rhythm = "morning" | "midday" | "evening" | "night";
export type Voice = "gentle" | "grounding";

export type Profile = {
  id: string;
  name: string | null;
  faith_phase: "newbie" | "returnee" | "growth" | "elder" | null;
  rhythms?: Rhythm[];
  seasons?: { tag: string; set_at: string }[];
  voice?: Voice;
  timezone?: string | null;
  translation?: "ESV" | "NIV" | "NKJV" | "KJV" | "MSG" | null;
  onboarded: boolean;
};

// Kept for backwards-compat during settings page migration (Lovable is building settings UI).
// Once settings writes directly to Supabase this becomes a no-op.
export function writeProfileExtras(uid: string, extras: Partial<Profile>) {
  try {
    localStorage.setItem(`gn:profile-extras:${uid}`, JSON.stringify(extras));
  } catch {
    /* ignore */
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    // CRITICAL: register the listener BEFORE reading the initial session, so we
    // never miss the very first SIGNED_IN event on mobile Safari (which would
    // leave the app thinking the user is signed out and bounce them back to /login).
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user.id);
      else setProfile(null);
    });
    // Await the profile fetch so `loading` only becomes false AFTER the
    // profile is ready. This prevents the flash where the home screen
    // renders briefly with `profile=null` (showing "Friend") before the
    // DB row arrives and RequireAuth can enforce onboarding.
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);


  async function loadProfile(uid: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, faith_phase, onboarded, rhythms, seasons, voice, timezone, translation")
      .eq("id", uid)
      .maybeSingle();

    if (data) {
      setProfile(data as Profile);
    } else {
      // Profile row not created yet (trigger may not have fired) - create it now
      await supabase.from("profiles").insert({ id: uid }).select().maybeSingle();
      setProfile({ id: uid, name: null, faith_phase: null, onboarded: false });
    }

    // Persist country code from Cloudflare header — fire and forget
    syncCountryCode({ data: {} }).catch(() => {});
  }

  return { session, user, profile, loading, reloadProfile: () => user && loadProfile(user.id) };
}
