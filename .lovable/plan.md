
# Phase 1 — Auth hardening (own Supabase, BYOK Google + Apple)

## Why the past breakage happened (and how we prevent it)

Last time, OAuth kept "falling back to Lovable-managed keys" and users got bounced back to `/login` or stuck in onboarding even after signing in. Three root causes, each addressed below:

1. **Two Supabase projects in play.** Lovable Cloud is connected to `jtjizrchmmmvphkndmhs`, but the app reads/writes against `tkoebogweygaabndrsvl` (hardcoded in `src/lib/supabase.ts`). Any OAuth wired through Lovable-managed flow authenticates against the wrong project → token never appears in the app's `supabase` client → `useAuth` sees no user → redirect loop.
   - **Fix:** Configure Google + Apple **directly on `tkoebogweygaabndrsvl`** in the Supabase dashboard. Call `supabase.auth.signInWithOAuth({ provider })` on the existing `supabase` import — same client that already powers magic links. Do NOT use `lovable.auth.signInWithOAuth` (it targets the wrong project).

2. **Hardcoded redirect URL didn't match the runtime origin.** Magic link uses `https://gracenotesdaily.com/auth/callback` (good). But OAuth callbacks must also be allow-listed at the Supabase Auth level AND in Google/Apple consoles. A mismatch → Supabase rejects the callback → user lands on `/login` with no session.
   - **Fix:** Register exactly these redirect URLs in Supabase Auth → URL Configuration AND in Google Cloud Console authorized redirect URIs:
     - `https://gracenotesdaily.com/auth/callback`
     - `https://www.gracenotesdaily.com/auth/callback`
     - `https://gracenotesdaily.lovable.app/auth/callback`
     - (later) `com.gracenotes.daily://auth/callback` for native
   - Use `redirectTo: "https://gracenotesdaily.com/auth/callback"` (hardcoded canonical, same as magic link) so OAuth never leaks a preview host into the email/consent screen.

3. **Onboarding loop after sign-in.** `RequireAuth` redirects to `/onboarding` when `profile.onboarded === false` OR `profile.name` is empty. The `handle_new_user` trigger inserts a blank profile row; if onboarding never completed the save, the user is permanently bounced. Compounded last time because the session sometimes attached to the wrong project's profile (which didn't exist), so `profile` stayed null forever.
   - **Fix:** Once OAuth is on the correct project, the trigger fires correctly and the existing `onboarded=true` row is found. Also add a one-time diagnostic in `useAuth.loadProfile` that surfaces "profile missing" via toast (instead of silent redirect loop) — so if it ever happens again, it's visible in 1 click instead of 30 minutes of debugging.

## Exact steps you do (Supabase + Google + Apple)

### A. Google Cloud Console (~15 min)
1. https://console.cloud.google.com → create/select project "GraceNotes Daily".
2. APIs & Services → **OAuth consent screen**:
   - User type: External
   - App name: `GraceNotes Daily`
   - Support email + developer contact: your email
   - App logo: upload the dove medallion (PNG, square, ≥120px)
   - Authorized domains: `gracenotesdaily.com`, `lovable.app`, `supabase.co`
   - Scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`
   - Publish (or keep in Testing + add your email as a test user for now)
3. Credentials → **Create OAuth client ID**:
   - Type: Web application
   - Name: `GraceNotes Daily — Web`
   - Authorized JavaScript origins:
     - `https://gracenotesdaily.com`
     - `https://www.gracenotesdaily.com`
     - `https://gracenotesdaily.lovable.app`
   - Authorized redirect URIs (this is the Supabase callback, NOT our app callback):
     - `https://tkoebogweygaabndrsvl.supabase.co/auth/v1/callback`
4. Copy **Client ID** and **Client Secret** — you'll paste into Supabase next.

### B. Supabase dashboard for `tkoebogweygaabndrsvl` (~5 min)
1. Auth → Providers → **Google** → enable → paste Client ID + Secret → save.
2. Auth → URL Configuration:
   - **Site URL**: `https://gracenotesdaily.com`
   - **Redirect URLs** (add each):
     - `https://gracenotesdaily.com/auth/callback`
     - `https://www.gracenotesdaily.com/auth/callback`
     - `https://gracenotesdaily.lovable.app/auth/callback`
     - `https://id-preview--0a9503c6-b43a-4fb2-9559-d65856c5856c.lovable.app/auth/callback` (for testing in preview)
3. Auth → Providers → **Apple** → enable → paste Apple Services ID + JWT Client Secret (see C).

### C. Apple Developer (~30 min, requires $99/yr enrollment)
1. Apple Developer → Certificates, Identifiers & Profiles → **Identifiers** → "+" → App IDs → App → Bundle ID `com.gracenotes.daily`, capabilities: Sign In with Apple.
2. Identifiers → "+" → **Services IDs** → ID `com.gracenotes.daily.web` → enable Sign In with Apple → Configure:
   - Primary App ID: the App ID above
   - Domains: `tkoebogweygaabndrsvl.supabase.co`
   - Return URLs: `https://tkoebogweygaabndrsvl.supabase.co/auth/v1/callback`
3. Keys → "+" → name "GraceNotes Apple Auth" → enable Sign In with Apple → Configure (primary App ID) → download the `.p8` file (one-time download). Note the Key ID.
4. Note your Team ID (top right of Apple Developer).
5. Generate Apple JWT client secret — Supabase dashboard has a built-in generator under Auth → Providers → Apple → "Generate Secret". Enter Team ID, Key ID, Services ID, paste `.p8` contents → it outputs a JWT valid 6 months. Paste into Client Secret field.
6. Calendar reminder: regenerate this JWT in 5 months.

## What I'll do in code (Phase 1)

1. **`src/routes/login.tsx`** — add two buttons above the email input:
   - "Continue with Apple" (black pill, Apple logo) — calls `supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: REDIRECT_URL } })`
   - "Continue with Google" (white pill with border, Google G logo) — same pattern, `provider: 'google'`
   - "or" divider, then existing magic-link form unchanged
   - Both buttons surface errors via `toast.error(authErrorMessage(error))`

2. **`src/routes/auth/callback.tsx`** — already handles `?code=`, `?token_hash=`, hash tokens, and OAuth errors. One small addition: when `?error=access_denied` (user cancelled Apple/Google), show a friendlier "No problem — you can try again or use email" message instead of the raw error string.

3. **`src/hooks/use-auth.ts`** — add a defensive check in `loadProfile`: if the user is signed in but the trigger hasn't inserted the profile row yet (race condition possible on first OAuth signup), retry once after 500ms before falling back to client-side insert. Prevents the "logged in but `profile=null` forever" loop.

4. **NO changes to** `src/lib/supabase.ts`, `RequireAuth`, sidebar, onboarding flow, or any visual styling.

## What I need from you before I start coding

1. ✅ Confirm: BYOK Google + Apple, configured directly on `tkoebogweygaabndrsvl` (not Lovable-managed). — *yes, per your last answer*
2. **Apple Developer enrollment status** — already enrolled, in progress, or not started? (Determines whether Phase 1 ships with Google only and Apple added 24–48h later.)
3. **Permission to add the preview URL** (`https://id-preview--0a9503c6...lovable.app/auth/callback`) to Supabase redirect allow-list for testing? You can remove it after launch. Without it, OAuth can only be tested on the live domain.
4. **Once Google credentials are created**, paste Client ID + Secret into Supabase yourself (I can't access your Supabase dashboard) — then tell me "done" and I'll ship the login buttons.

## Responsiveness guarantee

Login page already responsive. The two new OAuth buttons go above the email field in the same `max-w-md` glass card — stacked vertically on mobile, same on desktop. No layout changes elsewhere in the app.

## Out of scope for this phase

Shopify, Listen audio rebuild, Capacitor shells, iPad layouts, push notifications, store submission — all queued for Waves 2+ per the approved plan.
