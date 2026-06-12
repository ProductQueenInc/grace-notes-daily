# CLAUDE.md — GraceNotes Daily Handover

Last updated: **2026-06-12**.

This document hands the **backend + AI wiring** of GraceNotes Daily over to whoever is picking the project up next (Claude Code, a new Lovable session, or a human). The frontend is intentionally complete and opinionated; please change as little of it as possible.

---

## TL;DR — Where we are today

- **Frontend**: complete and stable. Don't touch design tokens, sidebar, AppShell, NatureBackground, PageHeader, PlayerDock, icon wrapper, onboarding step structure, habit auto-mark rule, or imagery policy.
- **Auth**: live. Email/password + Google OAuth (login + signup buttons + `/auth/callback`). Email PII is hardened.
- **AI app logic**: TanStack `createServerFn` in `src/lib/ai.functions.ts` — grace note, devotional, heart note, daily-chat (legacy non-streaming). All sanitized for em-dashes. The grace-note system prompt at **`src/lib/ai.functions.ts:160`** is the canonical voice and the single source of truth (see §5).
- **Backend storage**: the v2 schema (`verses`, `crisis_lines`, `user_verse_log`, `daily_grace_notes`, `chat_sessions`, `chat_flags`) is live with proper RLS + GRANTs.
- **Edge functions**: `chat-reply` (chat safety + streaming SSE) and `generate-daily-grace-notes` (overnight cron) are deployed and now fully wired — `crisis_lines` seeded (51 countries) and pg_cron scheduled (daily 01:00 UTC).
- **PWA icons**: shipped and verified. Master `icon-source.png` is **1254×1254** (larger than the 1024 minimum, safe to downscale for App Store / Play Store when native build lands).
- **What's NOT done yet**: verses library is still unused (cron lets the model pick its own verse); no push notifications; no native (Capacitor) build.

> **Checkpoint:** "MVP UI + v2 backend live + cron + crisis lines seeded" — this version is the rollback target.


---

## 1. What this app is

GraceNotes Daily is a soft, devotional companion web app (Calm-inspired visual UX, distinctly Christian voice). Tone: *soft, held, seen, welcome — never pushy*.

- Product name: **GraceNotes Daily** (one word: "GraceNotes")
- Stack: TanStack Start v1 + Vite 7 + React 19 + Tailwind v4
- Hosting: Cloudflare Worker (edge) for the app; Supabase Edge Functions (Deno) for the two cron/streaming endpoints. See `<server-runtime>` rules in §7.
- Backend: **Lovable Cloud** (Supabase under the hood). Credentials live in `.env`:
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - Server-only secrets (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `LOVABLE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `EMAIL_HOOK_SECRET`) live in Supabase secrets.
- Auth helper: `src/lib/supabase.ts` exports `supabase`.

---

## 2. Build status (as of 2026-06-12)

### ✅ Live in production (code shipped AND backed by DB / config)

| Area | Where |
|------|-------|
| Auth — email/password + Google OAuth + `auth/callback.tsx` | `src/routes/login.tsx`, `signup.tsx`, `auth/callback.tsx`, `src/hooks/use-auth.ts` |
| Onboarding (5 steps → writes to `profiles`) | `src/routes/onboarding.tsx` |
| Profile shape (name, faith_phase, rhythms, seasons, voice, timezone, translation, country_code) | `profiles` table |
| AI server functions (grace note, devotional, heart note) | `src/lib/ai.functions.ts` |
| God-voice prompts, em-dash sanitizer | `src/lib/ai.functions.ts` |
| Daily content caching per (user_id, date) | `daily_content` table |
| Daily chat thread storage (legacy in-app reply path) | `daily_messages` table, `src/hooks/use-daily-chat.ts` |
| Habits + streak | `daily_habits`, `src/hooks/use-habits.ts`, `use-streak.ts` |
| Heart Notes, Prayers, Thanksgivings (full CRUD + RLS) | `heart_notes`, `prayers`, `thanksgivings` |
| Journey page reading from real data | `src/routes/journey.tsx` |
| Email infra (auth emails + transactional queue + suppression) | `email_*` tables, `src/routes/lovable/email/*` |
| Sidebar + AppShell + PlayerDock | `src/components/app-sidebar.tsx`, `app-shell.tsx`, `player-dock.tsx` |
| Listen feature: tracks loaded from Supabase `tracks` table, private `listen-audio` bucket with signed URLs, auto-play next track on end, shuffle mode | `src/routes/listen.tsx`, `src/hooks/use-audio-player.ts`, `src/routes/__root.tsx` (GlobalPlayer) |
| SEO landing pages (6 routes + 3 content guides), share bar, llms.txt, expanded sitemap | `src/routes/quiet-time-app.tsx` and siblings, `content/*`, `src/components/share-bar.tsx`, `download-guide-modal.tsx`, `site-footer.tsx`, `public/llms.txt`, `public/sitemap.xml` |
| PWA manifest + theme-color + Apple PWA meta | `public/manifest.json`, `src/routes/__root.tsx` |
| Tally feedback button (all pages) | `src/components/feedback-dialog.tsx`, loaded in `__root.tsx` |
| v2 schema applied (verses, crisis_lines, user_verse_log, daily_grace_notes, chat_sessions, chat_flags, RPCs `select_verse_for_user` and `increment_session_message_count`) | Live DB as of 2026-06-09 |
| `chat-reply` edge function (3-tier safety + streaming SSE) — DB now backs it | `supabase/functions/chat-reply/index.ts` |
| `generate-daily-grace-notes` edge function — DB now backs it; uses the **canonical** prompt (§5). Cron scheduled in `cron.job` (daily 01:00 UTC, active). `daily_grace_notes` will fill after the first overnight run. | `supabase/functions/generate-daily-grace-notes/index.ts` |
| PWA icons (192, 512, apple-touch-180) wired into manifest + `__root.tsx`. Master `icon-source.png` is 1254×1254 (verified). | `public/icons/`, `public/manifest.json` |
| `crisis_lines` seeded with 51 countries (verified 51 rows). | Live DB |
| pg_cron `generate-daily-grace-notes` scheduled `0 1 * * *`, uses `vault.decrypted_secrets.email_queue_service_role_key` for the Bearer token. | `cron.job` |

### ⏳ Built but inactive until a one-time action is taken

_(None blocking. The verses library remains unseeded by choice — see "Not started" below.)_


### ❌ Not started

- Push notifications (VAPID keys + send edge function).
- Background image upload script (`background_images` table exists; URLs are still hard-coded in `src/components/nature-background.tsx`).
- Path B native build via Capacitor (`capacitor.config.ts` is a stub; no `@capacitor/*` packages installed, no iOS / Android folders).
- Verses library is created but unseeded and currently unused — the cron lets the model pick its own verse. If you ever want curated rotation, run `scripts/seed_verses.js` and wire `select_verse_for_user` back in to the cron.
- Favourites: allow users to heart a track, filter by favourites, and auto-play within favourites only (next logical feature after shuffle).


### Server-side split

App-internal logic → TanStack `createServerFn` in `src/lib/*.functions.ts`.
Two Supabase **Edge Functions** because they need provider-side hosting (cron + streaming SSE):
- `supabase/functions/chat-reply` — JWT-validated, 3-tier safety, streams SSE.
- `supabase/functions/generate-daily-grace-notes` — service-role bearer required, writes `daily_grace_notes`.

Don't add more edge functions unless cron or streaming forces it.

### Deployment

The live site at `gracenotesdaily.com` is hosted and deployed by **Lovable** (not via `wrangler deploy`). GitHub is the source of truth for code, but code changes only go live when published through Lovable. There is no GitHub Actions CI/CD yet. Future goal: a workflow that runs `npm run build && npx wrangler deploy` on push to main.

---

## 3. Frontend conventions you MUST follow

These are locked in project memory. Don't violate them when adding backend hooks.

| Rule | Where |
|------|-------|
| Two surfaces only: `.glass-on-hue` (ambient) and `.glass-parchment` (long reads) | `src/styles.css` |
| Display: **Fraunces**. Body: **Nunito**. Loaded in `__root.tsx` | `src/routes/__root.tsx` |
| Brand greens `--grace`, `--grace-deep`, `--grace-mid`, `--grace-haze`; accent `--gold` | `src/styles.css` |
| Iconography: **Lucide only**, always through `@/components/icon` | `src/components/icon.tsx` |
| No emojis in chrome — only inside user-generated content | — |
| Authenticated pages use `<NatureBackground />` + a hero block or `<PageHeader />` | `src/components/nature-background.tsx`, `page-header.tsx` |
| Sidebar: shadcn collapsible-icon, expanded by default; pin pref in `localStorage["gn:sidebar:pinned"]` | `src/components/app-sidebar.tsx` |
| Global persistent audio player `<PlayerDock />` inside `<AppShell />`; state in zustand | `src/hooks/use-audio-player.ts`, `src/components/player-dock.tsx` |

Use **TanStack Query** for data fetching. Don't introduce a different data layer.

---

## 4. Profile shape (extended for personalization)

```ts
type Profile = {
  name: string
  email?: string                       // hardened by 20260604231624 migration
  faith_phase?: "newbie" | "returnee" | "growth" | "elder"
  rhythms?: ("morning"|"midday"|"evening"|"night")[]
  seasons?: { tag: string; set_at: string }[]
  voice?: "gentle" | "grounding"
  timezone?: string
  translation?: string                 // e.g. "NIV"
  country_code?: string                // ISO 3166-1 alpha-2; used by chat-reply for crisis hotline
}
```

Onboarding is **5 steps** (`src/routes/onboarding.tsx`); values map 1:1. Personalization helpers (`pickRhythmGreeting`, `pickListenRailTitle`, `toneFromVoice`, `topSeason`) live in `src/lib/personalization.ts`.

### Habit auto-mark rule (locked)

A habit is **only** marked complete by performing the underlying action — never on a circle click. Clicking a circle navigates to the action surface.
- `devotional` → user taps "I Receive This" inside `<DevotionalModal />`
- `dailyMessage` → user **sends** a chat message
- `journal` → user submits a Heart Note

Badge tiers (`src/lib/badges.ts`): `none → copper (1/3) → silver (2/3) → gold (3/3)`.

---

## 5. The daily grace-note prompt (single source of truth)

**Canonical location:** `src/lib/ai.functions.ts`, the `system` constant inside `generateGraceNoteRaw` (line ~160).

This prompt is used by:
1. **On-demand / fallback** — when `use-daily-grace-note.ts` doesn't find a row in `daily_grace_notes` for today, it calls `generateGraceNote` (in `ai-stubs.ts` → `ai.functions.ts`) and gets a fresh one.
2. **Overnight cron** — `supabase/functions/generate-daily-grace-notes/index.ts` carries an **inlined copy** of the same prompt text (edge functions can't `import` from `src/`). Both paths use **`claude-haiku-4-5`**, temp `0.7`, `max_tokens: 400`, JSON-only output `{ message, verse, signed }`, and the `stripEmDashes` sanitizer.

**If you change the prompt, change it in both files.** The cron file has a header comment reminding you of this.

The prompt tells the model to (a) pick its own Bible verse, (b) write a 2-4 sentence note in God's first-person voice that *earns* the verse without quoting it, (c) follow the anti-saccharine guardrails and the no-em-dash rule. Five worked examples are included in the prompt body.

---

## 6. Chat safety system (`chat-reply` edge function)

`supabase/functions/chat-reply/index.ts`. Three tiers in order:

1. **Crisis keyword detection** — if the user message hits suicide / self-harm phrases:
   - look up `crisis_lines` by `profiles.country_code` (falls back to a generic line if seed missing — see §2 action #1),
   - log to `chat_flags` with `flag_type='crisis'`,
   - set `chat_sessions.status='closed_crisis'`,
   - return a country-specific helpline reply as JSON `{ response, session_closed: true, close_reason: 'crisis' }`.
2. **Haiku safety classifier** — small Claude call returning SAFE / MILD / HARMFUL. HARMFUL closes the session as `closed_inappropriate`; MILD lets the main reply through with a gentle-redirect instruction.
3. **Streaming SSE reply** from Claude Haiku in God's voice. Calls `increment_session_message_count(p_session_id)` after each reply.

JWT is validated server-side; `user_id` is derived from claims, never trusted from the request body.

Tables used: `chat_sessions`, `chat_flags`, `crisis_lines`, plus the existing `daily_messages` (the client persists each message before/after the streaming call — see `src/hooks/use-daily-chat.ts`).

---

## 7. Server runtime gotchas

**TanStack server functions run on Cloudflare Worker:**
- Safe: `fs`, `path`, `crypto`, `Buffer`, `stream`, `url`, `http`, `https`, `zlib`, `fetch`.
- Unsafe: `child_process`, `sharp`, `canvas`, `puppeteer`, full `os.*`.
- All npm packages must be fully bundled — no runtime module resolution.
- Never set `ssr.external` in `vite.config.ts`.
- Server functions live in client-safe paths (e.g. `src/lib/*.functions.ts`), not under `src/server/`.
- Read `process.env.X` inside `.handler()`, not at module scope.
- Auth-protected server fns only work in components or under `_authenticated/` — never in a public route's `loader` (prerender will 401).

**Supabase Edge Functions run on Deno:**
- Use `npm:` imports (e.g. `import Anthropic from 'npm:@anthropic-ai/sdk'`).
- Read secrets via `Deno.env.get(...)`.
- Both current edge functions enforce their own auth in-handler.

---

## 8. User roles & RLS

Follow the standard Lovable pattern (separate `user_roles` table + `has_role()` security-definer function). **Never** store roles on a profile/users table.

Default policies:
- Every habit/journal/prayer/message row: `user_id = auth.uid()` for select/insert/update.
- No public read on any user-content table.
- Service-role bypasses RLS and is used by the two edge functions.

---

## 9. CLAUDE.md update rule

**Every code change committed to this repo must be reflected in CLAUDE.md before the commit is pushed.** This includes:
- Moving a feature from "Not started" to "Live in production" when it ships
- Adding new tables, edge functions, hooks, or routes to the Quick reference table
- Logging the change in §11 (Recent changes log) with the date

This keeps CLAUDE.md as a live, accurate handover document rather than a snapshot that rots.

---

## 10a. Things to NOT touch

- `src/styles.css` (design tokens are locked)
- `src/components/app-sidebar.tsx`, `app-shell.tsx`, `nature-background.tsx`, `page-header.tsx`, `player-dock.tsx`, `icon.tsx`
- `src/components/ui/*` (shadcn)
- Onboarding step structure
- Habit auto-mark rule (§4)
- Translation/voice/season options — these are the personalization contract
- `src/integrations/supabase/client.ts` (auto-generated)

If you need to change any of the above, open a question for the human owner first.

---

## 10b. Imagery policy (locked)

GraceNotes Daily is a Christian devotional product. Every image (background, hero, illustration, audio cover art, marketing) must feel reverent and safe.

**Never allow:** alcohol (beer, wine, spirits, bars, drinking glasses), smoking, vaping, drugs, gambling; suggestive or revealing imagery; violence, weapons, blood; brand logos or commercial products; memes or flippant visuals; religious symbols from other faiths used decoratively; AI-generated images of identifiable real people.

**Prefer:** forests, mountains, dawn light, mist, still water, open fields, soft skies; hands, candles, open books, simple natural textures when relevant.

The ambient background list lives in `src/components/nature-background.tsx`. Vet every URL before adding it and keep the comment block at the top of that file in sync. The same rule applies to any storage-backed cover art wired up for the Listen feature later.

---

## 11. Recent changes log

### 2026-06-12 — Devotional date fix + Listen auto-play + shuffle

- **Devotional date bug fixed** (`src/lib/ai.functions.ts`): the AI model (Haiku) occasionally hallucinated old dates (e.g. January 2025) from its training data, ignoring the date injected into the prompt. Fixed by force-overwriting `parsed.date = today` after AI generation. The displayed date is now always the server-computed date, never what the model outputs.
- **Listen: tracks are live** — tracks are seeded in the Supabase `tracks` table and served from the private `listen-audio` bucket via signed URLs. `listen.tsx` queries Supabase directly (no server fn needed). `src/lib/tracks.functions.ts` (old server fn) still exists but is not used by the Listen page.
- **Auto-play next track** (`src/hooks/use-audio-player.ts`, `src/routes/__root.tsx`): when an audio track ends, `playNext()` is called automatically via the `onEnded` event on the `<audio>` element. Plays the next track in the queue in order (or random if shuffle is on).
- **Shuffle mode** (`src/hooks/use-audio-player.ts`, `src/routes/__root.tsx`): toggle button in the expanded player (gold when on). When on, `playNext()` picks a random track from the queue instead of sequential order.
- **Queue** (`src/hooks/use-audio-player.ts`): `play(track, queue?)` now accepts an optional queue. `listen.tsx` passes the current `filtered` list so auto-play respects the active category/type filter. Queue resets to `[]` on close.
- **Mini dock** (`src/routes/__root.tsx`): skip-forward button appears in the dock when queue has more than one track.
- **New rule added to CLAUDE.md**: every code change must be reflected in CLAUDE.md before the commit is pushed (§9).

### 2026-06-09 (PM) — Completed pending actions + Listen media scaffold
- Seeded `public.crisis_lines` with all 51 verified entries from `gracenotes_crisis_lines.json`. `chat-reply` crisis branch now resolves country-specific hotlines via `profiles.country_code`. Re-verify entries every 6 months (numbers change).
- Scheduled pg_cron job `generate-daily-grace-notes` at `0 1 * * *` (daily 01:00 UTC, active). Bearer token reads from `vault.decrypted_secrets.email_queue_service_role_key` (existing secret, same service-role key the email queue uses — no new secret added). First populated row in `daily_grace_notes` will appear after the next 01:00 UTC tick.
- Verified `public/icons/icon-source.png` is 1254×1254. Larger than the 1024 store minimum; safe to downscale when Capacitor native build lands. No action needed today.
- Created private Supabase Storage bucket `listen-audio` (no public read) and shipped `src/lib/listen-audio.functions.ts` exporting `getSignedAudioUrl` — auth-gated, path-validated, returns a 1-hour signed URL. Ready for Suno MP3 uploads + `tracks` row wiring + `<PlayerDock />` resolver.


### 2026-06-09 — CLAUDE.md QA pass
- Verified every "live in production" and "pending action" claim against the repo and live DB.
- Removed stale action #3 ("Add PWA icons") — icons are already in `public/icons/` and wired into `manifest.json` + `__root.tsx`. Confirmed working on user's home-screen install + favicon.
- Reworded action #4 to focus on verifying `icon-source.png` is a true 1024×1024 master (file exists but dimensions unconfirmed).
- Tightened actions #1 and #2 with verified row counts and cron job state.
- Noted `daily_grace_notes` is empty until pg_cron is scheduled, so the next reader doesn't think the cron edge function is broken.

### 2026-06-09 — backend reality check + prompt unification
- Discovered the v2 migration files (`20260529000001_gracenotes_v2_step1_schema.sql`, `20260529000002_gracenotes_v2_cron.sql`) had never been applied to the live DB. The two edge functions and `use-daily-grace-note.ts` were failing at runtime against missing tables/RPCs.
- Applied the v2 schema migration with proper `GRANT`s, RLS policies, and `REVOKE`s on the SECURITY DEFINER functions so they're service-role-only.
- Made `daily_grace_notes.verse_id` nullable so the cron can store model-picked verses.
- Rewrote `supabase/functions/generate-daily-grace-notes/index.ts` to use the **canonical** grace-note prompt (inlined from `src/lib/ai.functions.ts:160`), `claude-haiku-4-5`, and the `stripEmDashes` sanitizer. Dropped the dependency on `select_verse_for_user` / `user_verse_log` so it's a clean parallel to the on-demand fallback.
- Pending: seed `crisis_lines`, wire pg_cron schedule (see §2 actions).

### 2026-06-05 — Google OAuth, SEO expansion, chat safety + cron edge functions
- Google sign-in buttons on `/login` and `/signup`; `src/routes/auth/callback.tsx`; profile bootstrap in `use-auth.ts`.
- Email PII hardening migration `20260604231624_…sql`.
- AI prompts rewritten in God's voice (first-person "I", no performative "I see you" / "I hear you", no predictions, no em-dashes/lists/headers).
- New edge functions `chat-reply` and `generate-daily-grace-notes` shipped (DB to back them only landed 2026-06-09).
- 6 new SEO landing routes + 3 content guides + `share-bar.tsx`, `download-guide-modal.tsx`, `site-footer.tsx`, `public/llms.txt`, expanded sitemap, WCAG AA contrast fixes.
- UX polish: devotional "received" state, timezone greeting, modal positioning, daily-chat silent-failure fix, grace-note date override.
- Docs: `README.md`, `BRAND.md`.

### 2026-05-25 — QA + copy polish
- About page: full founder story + links to product-queen.com and Habitue.Design.
- Contact page: replaced custom form with Tally popup (form ID `VL4NY6`); Tally embed loaded globally in `__root.tsx`.
- Floating feedback button: gold MessageCircle bubble, fixed bottom-right, all pages.
- Daily devotional: removed off-brand subheadline; og/twitter titles aligned.
- Homepage: removed all "free" references; updated "AI-crafted" → experience-first language.
- Phases section: "Tell us where you are. We'll meet you there."
- "Divine Habit Streaks" → "Daily Rhythms" across homepage, in-app home, FAQ.
- FAQ: removed "Is it free?" question.

### 2026-05-24
- Removed Dark mode toggle from Settings (deferred until proper dark theme tokens land).
- Added em-dash / en-dash sanitizer in `src/lib/ai.functions.ts` — every grace note, devotional, heart-note reply, and daily-chat reply is stripped of `—` and `–` before returning.
- Sidebar collapsed-state alignment fixed.

---

## 12. Quick reference

| Need | File |
|------|------|
| AI stubs (client wrappers) | `src/lib/ai-stubs.ts` |
| AI server functions | `src/lib/ai.functions.ts` |
| **Canonical grace-note prompt** | `src/lib/ai.functions.ts` (in `generateGraceNoteRaw`, line ~160) |
| Chat safety edge function | `supabase/functions/chat-reply/index.ts` |
| Daily grace-note cron edge function | `supabase/functions/generate-daily-grace-notes/index.ts` |
| Personalization helpers | `src/lib/personalization.ts` |
| Badges | `src/lib/badges.ts` |
| Supabase client | `src/lib/supabase.ts` |
| Auth hook | `src/hooks/use-auth.ts` |
| OAuth callback | `src/routes/auth/callback.tsx` |
| Habits / streak | `src/hooks/use-habits.ts`, `use-streak.ts` |
| Daily chat | `src/hooks/use-daily-chat.ts` |
| Daily grace note (client) | `src/hooks/use-daily-grace-note.ts` |
| Audio player (queue, shuffle, auto-play, playNext) | `src/hooks/use-audio-player.ts` |
| GlobalPlayer (UI + audio element + onEnded wiring) | `src/routes/__root.tsx` |
| Listen page (track grid, filter, signed URLs) | `src/routes/listen.tsx` |
| Listen signed-URL helper (private `listen-audio` bucket) | `src/lib/listen-audio.functions.ts` |
| Share / download UI | `src/components/share-bar.tsx`, `download-guide-modal.tsx`, `site-footer.tsx` |
| Crisis lines seed | `scripts/seed_crisis_lines.js`, `gracenotes_crisis_lines.json` |
| Verses library seed (unused for now) | `scripts/seed_verses.js`, `gracenotes_verse_library.json` |
| Routes | `src/routes/*.tsx` |
