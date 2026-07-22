// Client-side analytics wrapper around posthog-js.
// The PostHog project key (phc_...) is a publishable key, safe in the client bundle
// (same as our Supabase publishable key).

import posthog from "posthog-js";

const POSTHOG_KEY = "phc_BzcRU7v5y5xdUAnz3EaiwXYmVuBKS8KhnZXvefL3i3GV";
const POSTHOG_HOST = "https://us.i.posthog.com";

let inited = false;

export function initPostHog() {
  if (inited || typeof window === "undefined") return;
  inited = true;
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: true,
      capture_pageleave: true,
      person_profiles: "identified_only",
      loaded: () => {
        /* no-op */
      },
    });
  } catch (err) {
    console.warn("PostHog init failed", err);
  }
}

export function identifyUser(userId: string, email?: string | null) {
  if (typeof window === "undefined") return;
  try {
    posthog.identify(userId, email ? { email } : undefined);
  } catch {
    /* ignore */
  }
}

export function resetAnalytics() {
  if (typeof window === "undefined") return;
  try {
    posthog.reset();
  } catch {
    /* ignore */
  }
}

// Person properties set on the current identity (faith_phase, voice,
// onboarded, timezone) — re-set whenever the profile loads or changes,
// rather than scattered across every screen that can change them.
export function setPersonProperties(props: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    posthog.setPersonProperties(props);
  } catch {
    /* ignore */
  }
}

export function capture(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    posthog.capture(event, props);
  } catch {
    /* ignore */
  }
}
