# GraceNotes Daily

A Christian devotional companion web app. Glassmorphic design, nature-image backgrounds, mobile-first. Calm-inspired visual UX with a distinctly soft, held, Christian voice.

Live at **gracenotesdaily.com**

---

## What It Is

GraceNotes Daily gives users a personalised daily spiritual experience: a grace note (short AI-written devotional reflection), a Bible verse, a devotional reading, a daily chat companion, a heart-notes journal, prayer tracking, and habit streaks. Everything is grounded in the user's faith phase, preferred rhythms, and emotional posture — set during onboarding.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | TanStack Start v1 + Vite 7 |
| UI | React 19 + Tailwind v4 + shadcn/ui (Radix) |
| State | TanStack Query + Zustand |
| Backend | Supabase (database, auth, edge functions) |
| AI | Anthropic Claude (`@anthropic-ai/sdk`) + OpenAI (`openai`) |
| Hosting | Cloudflare Worker (edge runtime) via Lovable Cloud |
| Domain | gracenotesdaily.com (Namecheap) |

---

## What's Been Built

### Core features (all live)
- **Auth** — **Magic Link only.** User enters email → receives a sign-in link → taps it to authenticate. No password. No Google OAuth in the UI (referenced in Privacy Policy/Terms as a future-supported provider but not in the current login page). Magic link redirect is hardcoded to `https://gracenotesdaily.com/auth/callback`. Returning vs. new user is detected via `deviceHasAccount()` and surfaces different welcome copy.
- **Onboarding** — 5-step flow capturing name, faith phase, daily rhythms, life seasons, voice preference, and timezone. RequireAuth re-routes incomplete profiles on every login.
- **Grace Note** — AI-generated daily reflection tied to a curated Bible verse. Pre-generated overnight by a Supabase Edge Function (cron runs at 1:00 AM UTC, using `claude-sonnet-4-6`). Stored in `daily_grace_notes`. If the cron hasn't run yet for a new user, the app falls back to on-demand generation using `claude-haiku-4-5`. Content rolls over at the user's **local midnight** via a `clientDate` parameter — the server always caches by the user's local date, not UTC.
- **Daily Devotional** — AI-generated via Claude Haiku (1–2s). Cached per `(user_id, date)` in `daily_content`. User taps "I Receive This" to mark the devotional habit complete.
- **Daily Chat** — Conversational AI companion (OpenAI `gpt-4o-mini`). Persists to `daily_messages`. Resets at midnight in the user's local time. Sending a message marks the daily-message habit complete.
- **Heart Notes** — Journal with AI response. Saves to `heart_notes`. Submitting marks the journal habit complete.
- **Prayers** — Full CRUD: add, mark answered, add thanksgiving (stored separately in `thanksgivings` table), soft delete. Saves to `prayers`.
- **Habit Streaks** — Consecutive-day counter from `daily_habits`. A streak day = any ONE of devotional, daily_message, or journal being true (not all three). Today's habits don't count until tomorrow — the counter starts from yesterday, so satisfaction stays in the rhythm rather than watching the number tick over mid-day.
- **Journey** — Reads from `heart_notes` (all past entries) and answered `prayers` (with their thanksgivings). Does not include `daily_content`. Filterable by type (all / heart-note / prayer) and searchable by text. Paginated. Today's heart note is excluded — it stays on its own page until midnight.
- **Safety system** — Three-tier: keyword-based crisis detection (server-side, pre-Claude), Claude Haiku safety classification (SAFE / MILD / HARMFUL), session close for harmful input with localised crisis line lookup.
- **Verse library** — 116 curated verses seeded into `verses` table. Smart rotation prevents repeats for 60 days via `select_verse_for_user` Postgres function.
- **PWA** — `manifest.json`, Apple meta tags, `robots.txt`, `sitemap.xml`, OG/Twitter card.
- **SEO** — 6 landing pages with structured data, social sharing, content guides.
- **Settings** — Profile management. Dark mode deferred (tokens not finalized).
- **Feedback** — Tally popup (form ID: VL4NY6), gold MessageCircle button fixed bottom-right on all pages.
- **Listen** — Full UI with category/type filters and persistent `<PlayerDock />`. Reads from a `tracks` DB table (supports YouTube video and uploaded audio). YouTube tracks play now. Uploaded audio files require signed Supabase Storage URLs (not yet wired — see pending).
- **Transactional email** — Email templates built for signup, magic link, recovery, email change, and invite (`src/lib/email-templates/`). Send log, unsubscribe tokens, and suppression list tables exist in DB.
- **System announcements** — In-app announcement banner reads from `system_announcements` table; dismissals tracked per user in `announcement_dismissals`.

### Infrastructure
- Supabase edge function: `generate-daily-grace-notes` — overnight cron at 1:00 AM UTC pre-generates grace notes for all active users
- Supabase edge function: `chat-reply` — handles chat with safety classification and SSE streaming
- `db/002_tracks.sql` — tracks schema
- `db/cleanup_test_data.sql` — wipes all test users and their data (run in Supabase SQL Editor)
- `scripts/seed_verses.js` and `scripts/seed_crisis_lines.js` — one-time seed scripts
- `gracenotes_verse_library.json` — 116 verses source file
- `gracenotes_crisis_lines.json` — crisis line data for 51 countries
- Capacitor stub (`capacitor.config.ts`) — ready for iOS/Android when needed

---

## What's Pending

| Item | Notes |
|------|-------|
| Push notifications | VAPID keys + Supabase Edge Function not started |
| Listen / uploaded audio | YouTube tracks play; signed Supabase Storage URLs for uploaded audio files not yet wired |
| Background image upload script | Images exist locally; upload automation not built |
| GitHub Actions CI/CD | No pipeline yet — deploys via Lovable (open Lovable → sync from GitHub → publish) |
| Crisis line re-verification | Verify all entries every 6 months at findahelpline.com or befrienders.org |

---

## Key Decisions Made

- **Auth is Magic Link only.** No password, no Google OAuth in the current UI. Clean and low-friction for a faith audience.
- **Habit completion is action-gated.** Tapping a habit circle navigates to the feature; the habit only marks complete when the underlying action is performed (devotional received, message sent, heart note submitted). This is locked behaviour — do not change.
- **Grace note generation uses two models.** Overnight batch: `claude-sonnet-4-6` (higher quality, runs once per user per day via cron). In-app fallback: `claude-haiku-4-5` (fast, used only when cron hasn't pre-generated yet). Devotional also uses `claude-haiku-4-5`.
- **Grace note date is driven by `clientDate`.** The app passes the user's local date to the server, so content rolls over at the user's local midnight — not UTC midnight.
- **No separate `/signup` route.** `/signup` redirects to `/login`. The login page handles both new and returning users, distinguished by `deviceHasAccount()`.
- **Em dashes are stripped** from all AI output in `src/lib/ai.functions.ts`. Prompts also instruct the model not to use them.
- **Dark mode removed from Settings** until proper dark theme tokens are designed.
- **"Daily Rhythms"** is the canonical term (was: "Divine Habit Streaks") across all UI and copy.
- **No "free" language** anywhere in the app or landing page.
- **Cloudflare Worker runtime** — no `child_process`, `sharp`, `canvas`, or `puppeteer` in server functions. Read `process.env.X` inside `.handler()`, not at module scope.

---

## Deployment

Deployed via **Lovable Cloud** (not `wrangler deploy` directly).

To deploy code changes:
1. Open Lovable
2. Sync / pull from GitHub
3. Publish

The GitHub repo is the source of truth. There is no GitHub Actions CI/CD pipeline yet.

---

## Environment Variables

| Variable | Where |
|----------|-------|
| `VITE_SUPABASE_URL` | `.env` |
| `VITE_SUPABASE_ANON_KEY` | `.env` |
| `ANTHROPIC_API_KEY` | Lovable environment variables (Wrangler secret) |
| `OPENAI_API_KEY` | Lovable environment variables (Wrangler secret) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Function secrets |

---

## File Map (key files only)

| Need | File |
|------|------|
| AI functions | `src/lib/ai.functions.ts` |
| Personalization helpers | `src/lib/personalization.ts` |
| Badge logic | `src/lib/badges.ts` |
| Supabase client | `src/lib/supabase.ts` |
| Auth hook | `src/hooks/use-auth.ts` |
| Habits hook | `src/hooks/use-habits.ts` |
| Daily chat hook | `src/hooks/use-daily-chat.ts` |
| Audio player hook | `src/hooks/use-audio-player.ts` |
| Design tokens (locked) | `src/styles.css` |
| Routes | `src/routes/*.tsx` |
| Edge functions | `supabase/functions/` |

---

## What NOT to Touch

- `src/styles.css` — design tokens are locked
- `src/components/app-sidebar.tsx`, `app-shell.tsx`, `nature-background.tsx`, `page-header.tsx`, `player-dock.tsx`, `icon.tsx`
- `src/components/ui/*` — shadcn components
- Onboarding step structure
- Habit auto-complete rule (action-gated, not click-gated)
- Translation / voice / season options (personalization contract)

If any of these need to change, check with Cindy first.

---

## Imagery Policy

Every image must feel reverent and safe for a Christian devotional product.

**Never:** alcohol, smoking, drugs, gambling, suggestive imagery, violence, brand logos, memes, religious symbols from other faiths used decoratively, identifiable real people.

**Prefer:** forests, mountains, dawn light, mist, still water, open fields, soft skies, hands, candles, open books, simple natural textures.

Background categories: nightsky, ocean, sunrise, vegetation, weather (25 images total, stored locally).
