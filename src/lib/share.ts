// Share card contract — v1.1-draft (backend live).
//
// Version A: native share sends { title, url } only. The backend sets
// og:image on `deep_link` so unfurls show the card. `image_url` here is
// what the modal displays in-app for preview + copy.
//
// Requests go to the `render-share-card` edge function on the GraceNotes
// backend project via `supabase.functions.invoke`, which attaches the
// signed-in user's bearer token automatically (required for grace-note,
// streak-calendar, and answered-prayer; devotional works anon).

import { supabase } from "@/lib/supabase";

export type ShareType =
  | "grace_note"
  | "devotional"
  | "answered_prayer"
  | "milestone";

export type MilestoneTier = 1 | 5 | 10 | 30 | 60 | 100;

export type ShareContext =
  | {
      type: "grace_note";
      note_id: string;
      theme?: string;
      /** Note text + verse reference, already loaded client-side (see
       * useDailyGraceNote). Sharing is text-only and needs no render-share-card
       * round trip, so these ride along on the context instead of a fetch. */
      noteText: string;
      verseReference: string;
    }
  | { type: "devotional"; date: string; theme?: string }
  | {
      type: "answered_prayer";
      prayer_id: string;
      /** User-confirmed prayer text, ≤200 chars. Trimmed before send. */
      prayer_text?: string;
      answered_date?: string;
    }
  | { type: "milestone"; tier: MilestoneTier; streak: number };

export type ShareCard = {
  image_url: string;
  caption: string;
  deep_link: string;
};

type BackendResponse = {
  image_url: string;
  caption: string;
  share_url: string;
  storage_key?: string;
  template_id?: string;
  size?: string;
  share_token?: string;
  contract_version?: string;
};

type BackendError = { error?: { code?: string; message?: string } };

// Maps our internal ShareType → the edge function route segment.
const ROUTE: Record<ShareType, string> = {
  grace_note: "grace-note",
  devotional: "devotional",
  answered_prayer: "answered-prayer",
  milestone: "streak-calendar",
};

function bodyFor(ctx: ShareContext): Record<string, unknown> {
  switch (ctx.type) {
    case "grace_note":
      // Server fetches the grace note content from the JWT (never send
      // content) — but the DATE must be sent, because the overnight cron
      // pre-generates tomorrow's note before midnight. Without a date, the
      // backend's "most recent row" query returns tomorrow's note instead
      // of the one currently on screen. note_id is the local YYYY-MM-DD
      // the client is displaying (see home.tsx).
      return { date: ctx.note_id };
    case "devotional":
      return ctx.date ? { date: ctx.date } : {};
    case "answered_prayer": {
      const text = (ctx.prayer_text ?? "").trim().slice(0, 200);
      const body: Record<string, unknown> = { prayer_text: text };
      if (ctx.answered_date) body.answered_date = ctx.answered_date;
      return body;
    }
    case "milestone":
      // Server fetches the user's streak from the JWT.
      return {};
  }
}

export class ShareCardError extends Error {
  code: string;
  status?: number;
  constructor(code: string, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/**
 * Calls the live render-share-card edge function. Interface is frozen:
 * returns `{ image_url, caption, deep_link }` regardless of backend shape.
 * Throws `ShareCardError` on non-2xx so the modal can show retry/toast.
 */
export async function generateShareCard(ctx: ShareContext): Promise<ShareCard> {
  const route = `render-share-card/${ROUTE[ctx.type]}`;
  const { data, error } = await supabase.functions.invoke<
    BackendResponse | BackendError
  >(route, { body: bodyFor(ctx) });

  if (error) {
    // supabase-js wraps non-2xx into FunctionsHttpError; try to surface backend code.
    const status = (error as { context?: { status?: number } }).context?.status;
    let code = "render_failed";
    let message = error.message || "Share card render failed";
    const payload = (data as BackendError | null)?.error;
    if (payload?.code) code = payload.code;
    if (payload?.message) message = payload.message;
    throw new ShareCardError(code, message, status);
  }

  const ok = data as BackendResponse | null;
  if (!ok?.image_url || !ok?.share_url) {
    throw new ShareCardError("render_failed", "Empty share card response");
  }

  return {
    image_url: ok.image_url,
    caption: ok.caption ?? "",
    deep_link: ok.share_url,
  };
}

// ── Share-link attribution (roadmap Stage 4) ────────────────────────────────
// The homepage records an incoming ?s=<token> here so it can be claimed via
// the claim_share_attribution RPC right after onboarding finishes (the user
// isn't signed in yet when the link is first clicked).
const PENDING_SHARE_TOKEN_KEY = "gn:pending-share-token";

export function savePendingShareToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PENDING_SHARE_TOKEN_KEY, token);
  } catch {
    /* quota / private mode */
  }
}

/** Reads and clears the pending token in one shot — it's only ever claimed once. */
export function takePendingShareToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const token = window.localStorage.getItem(PENDING_SHARE_TOKEN_KEY);
    if (token) window.localStorage.removeItem(PENDING_SHARE_TOKEN_KEY);
    return token;
  } catch {
    return null;
  }
}
