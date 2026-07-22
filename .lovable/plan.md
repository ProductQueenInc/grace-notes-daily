
# Pre-publish: Magic Link, Recovery & TKOEBO Restoration

This is a walkthrough + checklist, not a code change. Nothing here modifies files — it's what you (or I) need to verify before you hit Publish.

---

## 1. Session restore on return (what happens after the user clicks the link)

1. User clicks the magic link → lands on TKOEBO's `/auth/v1/verify` → GoTrue redirects to `src/routes/auth/callback.tsx` with a code.
2. `auth/callback.tsx` calls `supabase.auth.exchangeCodeForSession(code)` against **TKOEBO** (the browser client is now hardcoded there).
3. Supabase-js writes the session into `localStorage` under key `sb-tkoebogweygaabndrsvl-auth-token`. Any old Lovable Cloud key (`sb-jtjizrchmmmvphkndmhs-auth-token`) is dead weight — harmless, but users signed in via the old project will appear signed out and must sign in again.
4. `src/hooks/use-auth.ts` fires `onAuthStateChange`, bootstraps the profile row, and PostHog `identify` runs.
5. Server functions using `requireSupabaseAuth` receive the TKOEBO bearer via `src/start.ts` middleware and validate it against TKOEBO's JWKS.

**Risk:** any leftover code path still pointing at Lovable Cloud would mint a session on the wrong project. The hardcoding sweep from the last turn addresses this; see §3.

---

## 2. Account recovery (password reset + email change use the same pipe)

All three flows — magic link login, password reset, email change — run through the same auth email hook:

- **Trigger:** TKOEBO GoTrue → POST to `https://<your-app>/lovable/email/auth/webhook` with an HMAC signature.
- **Render:** the webhook picks the template (`magic-link.tsx`, `recovery.tsx`, `email-change.tsx`, `signup.tsx`, etc.) and enqueues a rendered email.
- **Send:** the email queue processor + pg_cron on **Lovable Cloud** dequeue and hand off to Mailgun.
- **Click:** verify URL → `auth/callback.tsx` → session restore (§1). Password reset additionally requires the `/reset-password` route to exist as a public route that calls `updateUser({ password })`.

**Key point:** the sender infrastructure (queue, cron, Mailgun connector) still lives on Lovable Cloud even though auth itself lives on TKOEBO. That is fine — GoTrue on TKOEBO calls out to the app URL; the app then uses whichever queue is wired up. Do **not** try to move the queue right now.

---

## 3. Asset & config restoration to TKOEBO (the actual pre-publish checklist)

This is the part that will break silently in production if any item is missed.

### A. TKOEBO auth-hook config (blocking)
- [ ] TKOEBO dashboard → Auth → Hooks → **Send Email Hook** is **enabled**.
- [ ] Endpoint URL = `https://www.gracenotesdaily.com/lovable/email/auth/webhook` (your live domain, not preview).
- [ ] Hook secret matches the `EMAIL_HOOK_SECRET` set on the app runtime.
- [ ] If disabled, TKOEBO falls back to unbranded default emails (still works, but wrong sender + no branding).

### B. TKOEBO edge function secrets (blocking for covers, not for auth)
- [ ] `GEMINI_API_KEY` present (cover generation).
- [ ] `LOVABLE_API_KEY` present (only if anything on TKOEBO still calls the gateway — covers no longer do, so optional).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` auto-injected by Supabase — verify it's not blank.

### C. TKOEBO storage buckets (blocking for email images)
- [ ] `email-assets` bucket exists, **public**, contains `dove-medallion.png`. The magic-link template now points at `https://tkoebogweygaabndrsvl.supabase.co/storage/v1/object/public/email-assets/dove-medallion.png` — if that 404s, every branded auth email arrives with a broken dove.
- [ ] `devotional-covers` bucket exists (private) — covers are served via the app proxy route.
- [ ] `listen-audio` bucket exists (private) — signed URLs.

### D. TKOEBO database (blocking)
- [ ] `profiles`, `daily_grace_notes`, `daily_devotionals`, `verses`, `crisis_lines`, `chat_sessions`, `chat_flags`, `user_verse_log`, `heart_notes`, `prayers`, `thanksgivings`, `daily_habits`, `daily_content`, `daily_messages`, `tracks`, `app_user_connections` (if used), `email_*` tables all present with correct RLS + GRANTs.
- [ ] pg_cron jobs `generate-daily-grace-notes` and `generate-daily-devotional` scheduled and using TKOEBO's vault-stored `email_queue_service_role_key`.
- [ ] `verses` and `crisis_lines` seeded.

### E. Lovable Cloud project (email queue still lives here)
- [ ] `EMAIL_HOOK_SECRET` matches the value configured in TKOEBO's auth hook.
- [ ] Email queue cron running (`process-email-queue`).
- [ ] Mailgun connector linked, sender domain verified.

### F. Code sanity (already done, verify)
- [ ] `src/integrations/supabase/client.ts` → TKOEBO hardcoded ✅
- [ ] `src/integrations/supabase/client.server.ts` + `admin.server.ts` → TKOEBO hardcoded ✅
- [ ] `src/integrations/supabase/auth-middleware.ts` → TKOEBO JWKS ✅
- [ ] `src/lib/auth-guard.server.ts` → TKOEBO ✅
- [ ] `src/lib/tracks.functions.ts` → TKOEBO ✅
- [ ] `src/lib/risc-events.server.ts` → TKOEBO ✅
- [ ] `src/lib/email-templates/magic-link.tsx` dove URL → TKOEBO ✅
- [ ] `src/routes/api/public/devotional-cover.$date.ts` → TKOEBO only, no Lovable Cloud fallback ✅

### G. Left on Lovable Cloud intentionally
- Email queue routes under `src/routes/lovable/email/*` (pgmq + cron live on Lovable Cloud).
- `.env` `VITE_SUPABASE_*` values (unused by runtime now that clients are hardcoded, but harmless).

---

## 4. Pre-publish smoke test (in order)

Run these against the **preview build** before promoting to live:

1. Sign out completely, clear `localStorage`.
2. Request a magic link on `/login`. Confirm the email arrives, branded, dove renders.
3. Click the link. Confirm you land on the home screen signed in, PostHog identifies the user.
4. Sign out, run password reset. Confirm `/reset-password` accepts a new password and signs you in.
5. Open a devotional for today and one for a broken date (e.g. `2026-07-20`). Both cover images load.
6. Send a message in the daily chat. Confirm reply streams and habit auto-marks.

If any of steps 2–4 fail, the issue is almost always item A, B, or C in §3.

---

## 5. What I recommend right now

I don't need to change any code to answer this question. If you want, I can:
- **Option 1:** Just publish and run through §4 with you.
- **Option 2:** Before publish, I audit the code once more for any remaining Lovable Cloud reference I might have missed (grep for `jtjizrchmmmvphkndmhs` and Lovable Cloud URLs).
- **Option 3:** Address the two open security findings first (`proxy_diag_errors` leaking internal error text, and the `share-card admin_nonce` backdoor) since they're both easy and both live on public routes.

Tell me which of 1/2/3 you want, or approve this plan as-is and I'll wait for your go.
