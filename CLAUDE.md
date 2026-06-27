# CLAUDE.md — GraceNotes Daily Handover

Last updated: **2026-06-22**.

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
| Onboarding (**2 steps** as of 2026-06-22: name + faith phase → writes to `profiles`; rhythms/seasons/voice defaulted) | `src/routes/onboarding.tsx` |
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

Onboarding is **2 steps** as of 2026-06-22 (`src/routes/onboarding.tsx`): name + faith phase. Rhythms, seasons, and voice are defaulted (`[]`, `[]`, `"gentle"`) and editable in Settings; the `seasons` signal is being replaced by `profiles.inferred_themes` learned from chat. Personalization helpers (`pickRhythmGreeting`, `pickListenRailTitle`, `toneFromVoice`, `topSeason`) live in `src/lib/personalization.ts`.

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

As of 2026-06-22 the verse is **grounded from the curated NIV `verses` table** (via the `select_verse_for_user` RPC), not written by the model. The prompt receives the chosen verse as fixed text and tells the model to (a) write a 2-4 sentence note in God's first-person voice that *earns* the given verse without quoting it, (b) follow the anti-saccharine guardrails and the no-em-dash rule. The model returns `{ message, chatPrompt }`; the `verse` field is set server-side from the DB. Worked examples are included in the prompt body.

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
- Onboarding step structure (note: deliberately reduced to 2 steps on 2026-06-22 with the owner's sign-off; that change was intentional, not a regression)
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

### 2026-06-22 (PM2) — Shared daily devotional + public `/devotional/<date>` page

The devotional is now **shared** (one per day for everyone), grounded, and publicly shareable.

- **Generator** (`src/lib/ai.functions.ts`, `getOrCreateSharedDevotional` + `generateSharedDevotionalRaw`): public server fn (no auth middleware), get-or-create keyed by `date` in `daily_devotionals`. Weekday theme rotation (Mon Hope, Tue Peace, Wed Grief & Comfort, Thu Gratitude, Fri Courage, Sat Rest, Sun Purpose); verse grounded from `verses` for that theme with an 8-occurrence no-repeat (reads recent `daily_devotionals` rows of the same theme); up to 3 related passages from the same theme. Generalized + shareable prompt (no personalization). Uses the schema-agnostic `admin` client. Stub: `getSharedDevotional(date?)` in `ai-stubs.ts`.
- **In-app read switched to shared:** `devotional-modal.tsx` and `home.tsx` now call `getSharedDevotional(today)` instead of the per-user `generateDevotional`. (Per-user `getOrCreateDevotional` remains in code but is no longer wired.)
- **Public page:** `src/routes/devotional.index.tsx` (today) + `src/routes/devotional.$date.tsx` (dated archive), rendering `src/components/devotional-view.tsx`. No auth. Full SEO: dynamic meta + OG (`/og/daily-devotional.png`) + Article and Breadcrumb JSON-LD (`devotionalHead`). Reverent reading layout, Web Share / copy-link, NIV notice, soft signup CTA. Every day becomes one indexed, shareable page (the SEO flywheel).
- `routeTree.gen.ts` regenerated to include the two new routes.
- Type-checked clean (only the pre-existing missing-dep errors remain).
- **Follow-ups (kept on the list):** (1) a-day-ahead cron generation + lightweight human review (currently the first view of a date generates it on demand); (2) graceful error state if generation fails on a public hit; (3) add the devotional archive to `sitemap.xml`; (4) the Listen fixes (Media Session lock-screen controls + pause/resume restart bug).

### 2026-06-22 (PM) — Verse grounding: grace note + devotional now use verified NIV from the `verses` table

The model no longer writes Scripture. Both generators now select a verse from the curated NIV `verses` library and pass it into the prompt as fixed text; the model writes only the reflection around it. This removes verse hallucination and bounds NIV usage to a countable, attributed set.

- **Grace note** (`src/lib/ai.functions.ts`, `getOrCreateGraceNote` + `generateGraceNoteRaw`): verse chosen via the `select_verse_for_user` RPC (60-day no-repeat rotation through `user_verse_log`), with an any-active-verse fallback. Model returns `{ message, chatPrompt }` only; `verse` is built server-side from the DB row. The chosen verse is logged to `user_verse_log`. The old 14-day `recentVerses` prompt-ban was removed (rotation now handled structurally).
- **Devotional** (`generateDevotionalRaw` + `getOrCreateDevotional`): main verse via the same RPC; up to 3 `related` passages pulled from the same `theme` in `verses`. Model returns `{ title, body, takeaway }` only and is told not to introduce any other scripture. `verseOfDay`/`verseRef`/`related` come from the DB.
- **Cron edge function** (`supabase/functions/generate-daily-grace-notes/index.ts`): same grounding; now stores the real `verse_id` (no longer null), `theme`, and logs `user_verse_log`. **Deployed to Supabase (version 5, `verify_jwt=false`).**
- A schema-agnostic `admin` alias (`supabaseAdmin as unknown as SupabaseClient`) is used for the RPC/`verses`/`user_verse_log` calls because generated Database types lag migrations (same reason `logAudit` casts).
- Type-checked: `tsc --noEmit` clean for the changed files (pre-existing missing-dep errors for `marked`/`@react-email/*`/`@lovable.dev/*` are unrelated and resolve in the Lovable build).

### 2026-06-22 — Onboarding cut to 2 steps; shared-devotional + personalization foundation laid

Product direction set with Cindy after a full code-grounded QA. This entry logs decisions and the first build increment. A standalone design spec (personalization, shared devotional, sharing flows, Journey archives, onboarding) accompanies this.

**Shipped this increment:**
- **Onboarding reduced from 5 steps to 2** (`src/routes/onboarding.tsx`): now only **name** + **faith phase**. Rhythms, seasons, and voice are no longer asked; `finish()` writes `rhythms: []`, `seasons: []`, `voice: "gentle"` and they remain editable in Settings. **No gender, no birthday** (deliberately declined: gender has no current use given the gender-neutral voice rules; birthday is intrusive and, if ever wanted, should be month/day only and opt-in in Settings).
- **Migration `20260622120000_shared_devotional_and_inferred_themes.sql`** (applied to live DB, additive/idempotent):
  - `daily_devotionals` table — the **shared** daily devotional, keyed by `date` (one row/day for everyone, not per-user). RLS: public `select` for `anon` + `authenticated` (supports the in-app read and the planned public `/devotional/<date>` share + SEO page). Service role writes it.
  - `profiles.inferred_themes jsonb` — populated nightly from the user's recent daily chat; will be injected into the grace-note prompt the same way the old onboarding `seasons` value was.
  - Seeded a **Grief & Comfort** verse pool (8 verses, **NIV 2011**) into `verses` — the only missing theme for the weekly devotional rotation.
- **Bible translation standardised on NIV** (owner decision 2026-06-22):
  - Replaced the Settings translation *picker* (ESV/NIV/NKJV/KJV/MSG — it was decorative; generation never used it) with a fixed **NIV attribution notice** in `src/routes/settings.tsx`. `profiles.translation` stays (defaults `"NIV"`).
  - **Verbatim NIV pass (2026-06-22):** read all verses against the NIV; **no wording deviations found** (no paraphrases, wrong translations, or bad references). Cleaned duplicates: 4 verses my Grief seed had re-added (Isaiah 41:10, John 14:27, Psalm 23:4, Psalm 30:5) were swapped for distinct comfort verses (Psalm 46:1, 2 Corinthians 1:3-4, Psalm 73:26, Isaiah 49:13), and the pre-existing duplicate Psalm 118:24 (id 78) was set `is_active=false`. Now **123 active verses, 0 duplicate references**. Owner decisions applied 2026-06-22: (a) divine name is title-case **"Lord" everywhere** (normalized the lone "LORD" in Psalm 34:18); (b) **all em/en dashes swapped** for a spaced hyphen (hard rule) - verified 0 remaining in the `verses` table.
  - ⚠️ **Open risk:** the grace-note and devotional generators currently let the model *write* the verse text, so NIV accuracy is **not** guaranteed there. To truly guarantee "verified NIV everywhere," the generators must be switched to **ground the verse from the `verses` table** (already the planned Phase 1/3 work) rather than letting the model produce scripture.
  - ⚠️ **Licensing:** NIV is copyright Biblica. The Settings notice carries the required attribution. App-scale daily distribution may exceed the gratis use limit (≈500 verses, under 25% of the work, not a whole book); confirm NIV terms / secure Biblica permission before public launch. (Not legal advice.)

**Decisions / plan still to build (sequenced):**
1. Shared devotional generator: 7 themes, one fixed per weekday (Mon Hope, Tue Peace/Anxiety, Wed Grief & Comfort, Thu Gratitude, Fri Courage, Sat Rest, Sun Purpose), verse rotated weekly from the theme pool (8 verses ⇒ ~8-week no-repeat). Verse is **grounded from `verses`** (model no longer writes scripture — fixes the hallucination + licensing risk). Generalized but deep, written to be shareable to someone in the reader's life going through that theme.
2. Public devotional page `/devotional/<date>` + share card + Article/FAQ schema (sharing + SEO flywheel in one). Recipient sees the full devotional, no login, soft CTA.
3. Grace note becomes **personalized per user** from `inferred_themes` (nightly inference job over `daily_messages`), expressed indirectly via the existing "never name the season back" rule. Personal note shares to a private, `noindex` token URL.
4. **Journey archives:** add a "Daily Chats" category — a **Restart chat** action summarizes + archives the current conversation (needs `daily_messages.archived_at`); and allow **multiple HeartNotes/day** (drop the `heart_notes (user_id,date)` unique, add `superseded_at`) so adding a new note pushes the prior one to Journey immediately.

**Note on the canonical-prompt rule (§5/§9):** when the grace-note prompt starts consuming `inferred_themes`, update **both** `src/lib/ai.functions.ts` and `supabase/functions/generate-daily-grace-notes/index.ts`.

### 2026-06-21 — Grace note anti-repetition system

- **Anti-repetition context injected at generation time** (`src/lib/ai.functions.ts`, `supabase/functions/generate-daily-grace-notes/index.ts`): before generating a grace note, the last 14 days of `daily_content.grace_note` rows are fetched for that user. The verse references are extracted and passed into the prompt as a hard `ANTI-REPETITION` ban block, instructing the model not to reuse any of those verses or their central themes. This stops the same verse (e.g. Lamentations 3:22) from appearing on consecutive days.
- **Temperature raised from 0.5 → 0.9** in `generateGraceNoteRaw` (on-demand) and `generateGraceNote` (cron): higher temperature increases variety in verse and angle selection, complementing the explicit ban list.
- **`AIProfile` type extended** with optional `recentVerses?: string[]` field. `AIProfileSchema` updated to accept it (max 14 items, each max 200 chars). The field is populated server-side in `getOrCreateGraceNote` — the client never needs to send it.
- Both generation paths (on-demand fallback in `ai.functions.ts` and overnight cron in the edge function) are updated — per CLAUDE.md §5 policy.

### 2026-06-16 — Em-dash fix in chat, devotional prompt tightening, duplicate devotional guard, "Come on In" CTA fix

- **Em-dash stripping in daily chat** (`src/hooks/use-daily-chat.ts`): added `stripEmDashes` helper. Now applied (a) when loading stored messages from DB and (b) before persisting new streaming assistant replies. Previously, the `chat-reply` edge function's "no em-dashes" prompt instruction wasn't enforced in code, so model non-compliance showed through.
- **Devotional prompt — name rule** (`src/lib/ai.functions.ts`): added NAME RULE — the reader's name is never to appear in the devotional body. Removed `${p.name}` from the system prompt opening sentence (which was causing the AI to write in third-person about the user by name, e.g. "Tatiana stands at…"). The name no longer appears in the prompt at all.
- **Devotional prompt — structure rule** (`src/lib/ai.functions.ts`): added STRUCTURE RULE banning three-part parallel structures, rhetorical triplets, and rule-of-threes, which were making the devotional feel AI-generated.
- **Duplicate devotional call removed** (`src/routes/home.tsx`): removed redundant `useEffect` + `prefetchQuery` that ran 600ms after grace note settled — the `useQuery` above it already handles the fetch with the same key. Added `gcTime: 24h` to the home query to match the modal's gcTime. Also removed now-unused `useQueryClient` import and declaration.
- **"Come on In" CTA for signed-in users** (`src/content/library/daily-devotional.tsx`, `christian-journaling.tsx`, `prayer-journaling.tsx`): all three Foundation article body links now point to `/home` instead of `/signup` or `/login`. Signed-in users land on their home screen; signed-out users are redirected to login via RequireAuth on `/home`.

### 2026-06-13 — Homepage preview card asset correction

- **Homepage six-card preview assets corrected** (`src/components/home-previews.tsx`): the first three cards, Grace Notes, Listen, and Daily Rhythms, now import the uploaded SVG asset pointers instead of the older PNG pointers. Verified by source search and browser network requests showing `.svg.asset.json` imports with `content_type = "image/svg+xml"` for all six cards.

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
