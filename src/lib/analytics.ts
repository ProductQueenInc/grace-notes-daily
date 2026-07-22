// Client-side analytics wrapper around posthog-js.
// The PostHog project key (phc_...) is a publishable key, safe in the client bundle
// (same as our Supabase publishable key).

import posthog from "posthog-js";

const POSTHOG_KEY = "phc_BzcRU7v5y5xdUAnz3EaiwXYmVuBKS8KhnZXvefL3i3GV";
const POSTHOG_HOST = "https://us.i.posthog.com";

let inited = false;

// PostHog init is deferred until the browser is idle (see initPostHog below),
// but auth events like signed_in can fire before that moment. posthog-js
// silently drops calls made before init, which is why signed_in never showed
// up in PostHog despite sign-ins happening. Every call made before PostHog is
// ready is queued here and replayed, in order, the moment init completes.
let ready = false;
const pending: Array<() => void> = [];

function whenReady(fn: () => void) {
  if (ready) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  } else {
    pending.push(fn);
  }
}

function flushPending() {
  ready = true;
  while (pending.length > 0) {
    const fn = pending.shift();
    if (fn) {
      try {
        fn();
      } catch {
        /* ignore */
      }
    }
  }
}

// Supabase's OAuth / magic-link callback briefly carries access_token,
// refresh_token, and provider_token in the URL fragment. Without scrubbing,
// PostHog records that full URL in $current_url / $referrer, which stores live
// auth tokens in analytics. This strips the fragment (and any sensitive query
// params) from every URL-like string property before an event is sent.
const SENSITIVE_URL_MARKERS = [
  "access_token=",
  "refresh_token=",
  "provider_token=",
  "provider_refresh_token=",
  "id_token=",
  "token_hash=",
];

function scrubUrl(value: string): string {
  if (!SENSITIVE_URL_MARKERS.some((m) => value.includes(m))) return value;
  // Drop the fragment entirely (tokens live there on the auth callback)...
  let cleaned = value.split("#")[0];
  // ...and strip any sensitive params from the query string too.
  const qIndex = cleaned.indexOf("?");
  if (qIndex !== -1) {
    const base = cleaned.slice(0, qIndex);
    const params = cleaned
      .slice(qIndex + 1)
      .split("&")
      .filter((p) => !SENSITIVE_URL_MARKERS.some((m) => p.includes(m)));
    cleaned = params.length > 0 ? `${base}?${params.join("&")}` : base;
  }
  return cleaned;
}

function scrubProperties(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...props };
  for (const key of Object.keys(out)) {
    const val = out[key];
    if (typeof val === "string") {
      out[key] = scrubUrl(val);
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      // One level deep covers nested property bags like $set / $set_once.
      const nested: Record<string, unknown> = { ...(val as Record<string, unknown>) };
      for (const nkey of Object.keys(nested)) {
        const nval = nested[nkey];
        if (typeof nval === "string") nested[nkey] = scrubUrl(nval);
      }
      out[key] = nested;
    }
  }
  return out;
}

export function initPostHog() {
  if (inited || typeof window === "undefined") return;
  inited = true;
  // Defer init until after React hydration commits. posthog.init() injects a
  // <script> tag into <head> synchronously, which otherwise races the SSR
  // hydration diff on the landing route's JSON-LD script slot.
  const run = () => {
    try {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: true,
        capture_pageleave: true,
        person_profiles: "identified_only",
        autocapture: false,
        disable_surveys: true,
        sanitize_properties: (props) => scrubProperties(props),
        loaded: () => flushPending(),
      });
    } catch (err) {
      console.warn("PostHog init failed", err);
      // Release the queue even on failure so callbacks don't pile up forever.
      flushPending();
    }
  };
  const w = window as Window & { requestIdleCallback?: (cb: () => void) => void };
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(run);
  } else {
    setTimeout(run, 0);
  }
}

export function identifyUser(userId: string, email?: string | null) {
  if (typeof window === "undefined") return;
  whenReady(() => {
    posthog.identify(userId, email ? { email } : undefined);
  });
}

export function resetAnalytics() {
  if (typeof window === "undefined") return;
  whenReady(() => {
    posthog.reset();
  });
}

// Person properties set on the current identity (faith_phase, voice,
// onboarded, timezone) — re-set whenever the profile loads or changes,
// rather than scattered across every screen that can change them.
export function setPersonProperties(props: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  whenReady(() => {
    posthog.setPersonProperties(props);
  });
}

export function capture(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  whenReady(() => {
    posthog.capture(event, props);
  });
}
