import { useEffect, useState } from "react";
import { supabase, supabaseConfigured, markDeviceHasAccount } from "@/lib/supabase";
import { syncCountryCode } from "@/lib/auth.functions";
import { identifyUser, resetAnalytics } from "@/lib/analytics";
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

// Kept for backwards-compat during settings page migration.
export function writeProfileExtras(uid: string, extras: Partial<Profile>) {
  try {
    localStorage.setItem(`gn:profile-extras:${uid}`, JSON.stringify(extras));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton store. All useAuth() callers share this state, so
// navigating between pages (which remounts components) does NOT reset auth
// back to `loading=true` / `profile=null` — which previously caused a brief
// "Friend" flash in the sidebar and a blank/placeholder greeting on /home.
// ---------------------------------------------------------------------------

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
};

let state: AuthState = {
  session: null,
  user: null,
  profile: null,
  loading: true,
};

const listeners = new Set<() => void>();
let initStarted = false;

function setState(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

const PROFILE_COLS =
  "id, name, faith_phase, onboarded, rhythms, seasons, voice, timezone, translation";

async function loadProfile(uid: string) {
  let { data } = await supabase.from("profiles").select(PROFILE_COLS).eq("id", uid).maybeSingle();

  // First OAuth signup race: handle_new_user trigger may not have inserted yet.
  if (!data) {
    await new Promise((r) => setTimeout(r, 500));
    const retry = await supabase.from("profiles").select(PROFILE_COLS).eq("id", uid).maybeSingle();
    data = retry.data;
  }

  if (data) {
    setState({ profile: data as Profile });
  } else {
    await supabase.from("profiles").insert({ id: uid }).select().maybeSingle();
    setState({ profile: { id: uid, name: null, faith_phase: null, onboarded: false } });
  }

  syncCountryCode({ data: {} }).catch(() => {});
}

function initOnce() {
  if (initStarted) return;
  initStarted = true;

  if (!supabaseConfigured) {
    setState({ loading: false });
    return;
  }

  // Register listener BEFORE reading the initial session.
  supabase.auth.onAuthStateChange((event, s) => {
    setState({ session: s, user: s?.user ?? null });
    if (s?.user) {
      loadProfile(s.user.id);
      identifyUser(s.user.id, s.user.email ?? null);
      if (event === "SIGNED_IN") markDeviceHasAccount();
    } else {
      setState({ profile: null });
      if (event === "SIGNED_OUT") resetAnalytics();
    }
  });

  supabase.auth.getSession().then(async ({ data }) => {
    setState({ session: data.session, user: data.session?.user ?? null });
    if (data.session?.user) {
      await loadProfile(data.session.user.id);
      identifyUser(data.session.user.id, data.session.user.email ?? null);
    }
    setState({ loading: false });
  });
}

export function useAuth() {
  initOnce();
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  return {
    session: state.session,
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    reloadProfile: () => (state.user ? loadProfile(state.user.id) : Promise.resolve()),
  };
}
