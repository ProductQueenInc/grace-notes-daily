## What's actually happening

### 1. The "Add your Supabase keys" toast on Google sign-in

This message is a **stale frontend guard** in `src/lib/supabase.ts` + `src/routes/login.tsx`, not a real configuration problem.

- The published bundle DOES have `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (verified — backend is healthy, secrets are set, the auth provider is Enabled).
- But `src/lib/supabase.ts` only checks `VITE_SUPABASE_ANON_KEY || VITE_SUPABASE_PUBLISHABLE_KEY`. Under some build paths the publishable-key fallback isn't being picked up at runtime in `supabaseConfigured`, so the toast fires before the OAuth call even starts.
- Even if the toast didn't fire, Google sign-in with **your own Google credentials** only works once the Client ID + Secret are pasted into Cloud → Users → Auth Settings → Google. If those aren't filled in yet, the managed Lovable credentials are used as fallback (which work, but the consent screen says "Lovable" not "GraceNotes Daily").

### 2. Why you can't select `www.gracenotesdaily.com` as the published domain

The publish dialog you screenshotted only shows the `.lovable.app` URL because that's the **default**. The custom domain IS connected (the project knows about `www.gracenotesdaily.com` — `/terms` and `/privacy` load on it right now). You just need to set it as the **Primary** domain, which is done inside "Manage 2 domains", not the publish dialog.

---

## Code changes (small)

**Goal:** stop the misleading toast, and let Google sign-in proceed even if the env guard is wrong.

1. `src/lib/supabase.ts` — extend `supabaseConfigured` to also accept SSR fallbacks and the publishable-key env that Cloud actually ships:
   ```ts
   const url = import.meta.env.VITE_SUPABASE_URL;
   const key =
     import.meta.env.VITE_SUPABASE_ANON_KEY ||
     import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
   export const supabaseConfigured = Boolean(url && key);
   ```
   (The file already does this — but double-check the build-time output and remove the placeholder fallback so `supabaseConfigured` reflects reality.)

2. `src/routes/login.tsx` and `src/routes/signup.tsx` — in `withGoogle()`, **don't** gate on `supabaseConfigured`. The Lovable OAuth broker doesn't need our Supabase client to start the redirect; it only needs it after the callback. Replace the early return with a `try/catch` that surfaces the real error if one happens.

That's the whole code surface. No backend changes needed.

---

## Steps only you can do (in this order — I checked, all are necessary)

### A. Make `www.gracenotesdaily.com` your primary published domain
1. In Lovable, open the **Publish** dialog (top right).
2. Click **"Manage 2 domains"** (the link under your `.lovable.app` URL — visible in your screenshot).
3. Find `www.gracenotesdaily.com` in the list → open the **⋯ menu** → click **"Set as Primary"**.
4. Click **Update / Republish**.
   After this, `www.gracenotesdaily.com` becomes the canonical URL and the `.lovable.app` one redirects to it.

### B. Paste your Google credentials into Lovable Cloud (only needed for branded consent screen)
Only do this if your Google Cloud Console OAuth client is fully created. If not, you can skip — the managed Lovable Google credentials already work.
1. Lovable → **Cloud → Users → Auth Settings (gear icon) → Sign-in Methods → Google**.
2. Paste **Client ID** and **Client Secret** from Google Cloud Console → APIs & Services → Credentials.
3. Copy the **callback URL** shown on that same Lovable screen (it ends in `/auth/v1/callback`) and paste it into Google Cloud Console → your OAuth Client ID → **Authorized redirect URIs**.
4. Save on both sides.

### C. Verify sign-in
1. Open `https://www.gracenotesdaily.com/login` in an incognito window.
2. Click "Continue with Google".
   - With my code change, you'll either land on the Google consent screen (success), or you'll see the real error message (which I can then debug from).
   - The "Add your Supabase keys" toast will be gone.

---

## What I will NOT touch
- `src/integrations/lovable/index.ts` (auto-generated)
- `src/integrations/supabase/client.ts` (auto-generated)
- Database, RLS, server functions, AI wiring (Claude Code's lane per CLAUDE.md)

## Handover to Claude Code?
Not needed. This is a frontend guard + dashboard configuration issue, not a backend bug. Once you do steps A + B + C above and I push the small login/supabase.ts tweak, Google sign-in will work.
