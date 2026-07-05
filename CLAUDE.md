# CLAUDE.md — GraceNotes Daily Handover

Last updated: **2026-07-05**.

This document hands the **backend + AI wiring** of GraceNotes Daily over to whoever is picking the project up next (Claude Code, a new Lovable session, or a human). The frontend is intentionally complete and opinionated; please change as little of it as possible.

---

## 0. AUDIT HOOK — read this section before anything else

GraceNotes Daily is a soft, devotional companion web app (Calm-inspired UX, distinctly Christian voice; tone: *soft, held, seen, welcome - never pushy*) built on TanStack Start + Cloudflare Worker (deployed via Lovable) with a Supabase backend, where users receive a daily AI grace note in God's first-person voice, read a shared daily devotional, chat, journal Heart Notes, track prayers, and build a grace-based show-up streak.

**Mandates (in order):**

1. `git fetch origin && git status -sb` — this folder has been 34 commits behind Lovable's pushes before. Sync before trusting anything.
2. **Read `roadmap.md` before writing any code.** Check the current stage's gates; do not start later-stage work.
3. **Load the relevant skills from `.claude/skills/` before beginning any task** (loading order by task type below). Skills are verified knowledge; do not work from guesswork.

**The three-tool boundary (hard rules, not guidelines):**

- **Canva** designs share-card templates and exports static assets. Nothing else.
- **Lovable** builds share UI, parameterizes approved Canva exports, calls the backend API, and deploys the app. Lovable does NOT generate images, own routing decisions, or own attribution.
- **Backend** owns the render pipeline, the API contract, CDN image hosting, deep links, PLG attribution, share-event schema, and server-side personalization. Contract of record: `.claude/skills/gracenotes-canva-lovable-backend-contract/`.

**Settled URL invariants (live in production, verified 2026-07-05):**

- `gracenotesdaily.com/library` — content hub for all writing.
- `gracenotesdaily.com/library/devotional/YYYY-MM-DD` — individual devotionals (canonical deep-link target).
- Legacy `/devotional[/YYYY-MM-DD]` 301s to the library URLs, served server-side by SSR (`src/routes/devotional.*.tsx`).

**Five things that must never be broken:**

1. The habit auto-mark rule: habits complete only via the real action, never a checkbox click (§4).
2. Scripture grounding: the model never writes Bible text; verses come only from the curated NIV `verses` table.
3. The chat crisis-safety tiers in `chat-reply` (crisis keyword → country hotline → session close).
4. The public devotional pages + their 301 chain (the SEO/PLG flywheel), including the read-only rule: dated archive URLs never generate content.
5. The no-em-dash rule and the locked frontend surfaces (§10a) — including `navigator.share` calls passing `{ title, url }` only, never `text`.

**Skill loading order by task type** (all under `.claude/skills/`):

| Task | Load first |
|---|---|
| "I am fixing a bug" | `gracenotes-debugging-playbook` → `gracenotes-failure-archaeology` → `gracenotes-validation-and-qa` |
| "I am adding a new feature" | `gracenotes-architecture-contract` → `gracenotes-change-control` → `faithapp-domain-reference` (if user-facing) → `gracenotes-validation-and-qa` |
| "I am working on the sharing architecture" | `gracenotes-canva-lovable-backend-contract` → `gracenotes-sharing-architecture-campaign` → `gracenotes-proof-and-analysis-toolkit` |
| "I am working on the Lovable integration" | `gracenotes-canva-lovable-backend-contract` → `gracenotes-change-control` → `gracenotes-architecture-contract` |
| "I am preparing for App Store submission" | `gracenotes-build-and-env` → `gracenotes-run-and-operate` → `gracenotes-validation-and-qa` (deep-link matrix) |
| Deploying / operating / cron issues | `gracenotes-run-and-operate` → `gracenotes-config-and-flags` → `gracenotes-diagnostics-and-tooling` |
| Writing docs or user-facing copy | `gracenotes-docs-and-writing` (+ the `gracenotes-voice` user skill for brand content) |
| Strategy / "what should we build" | `roadmap.md` → `gracenotes-research-frontier` → `faithapp-domain-reference` |

---

## TL;DR — Where we are today

- **Frontend**: complete and stable. Don't touch design tokens, sidebar, AppShell, NatureBackground, PageHeader, PlayerDock, icon wrapper, onboarding step structure, habit auto-mark rule, or imagery policy.
- **Auth**: live. Email/password + Google OAuth (login + signup buttons + `/auth/callback`). Email PII is hardened.
- **AI app logic**: TanStack `createServerFn` in `src/lib/ai.functions.ts` — grace note, devotional, heart note, daily-chat (legacy non-streaming). All sanitized for em-dashes. The grace-note system prompt in **`src/lib/ai.functions.ts` (the `system` constant in `generateGraceNoteRaw`, ~line 257)** is the canonical voice and the single source of truth (see §5).
- **Backend storage**: the v2 schema (`verses`, `crisis_lines`, `user_verse_log`, `daily_grace_notes`, `chat_sessions`, `chat_flags`) is live with proper RLS + GRANTs.
- **Edge functions**: `chat-reply` (chat safety + streaming SSE) and `generate-daily-grace-notes` (overnight cron) are deployed and now fully wired — `crisis_lines` seeded (51 countries) and pg_cron scheduled (daily 01:00 UTC).
- **PWA icons**: shipped and verified. Master `icon-source.png` is **1254×1254** (larger than the 1024 minimum, safe to downscale for App Store / Play Store when native build lands).
- **What's NOT done yet** (corrected 2026-07-05): no push notifications; no native (Capacitor) build (targeted <3 months); no share-card / PLG sharing system (the roadmap.md "Now" project); no analytics instrumentation (PostHog decided, not built); dated devotional archive pages not yet in a dynamic sitemap. (Stale claim removed: verse grounding from the `verses` table HAS been live since 2026-06-22.)

> **Checkpoint:** "MVP UI + v2 backend live + cron + crisis lines seeded" — this version is the rollback target.


---

## 1. What this app is

GraceNotes Daily is a soft, devotional companion web app (Calm-inspired visual UX, distinctly Christian voice). Tone: *soft, held, seen, welcome — never pushy*.

- Product name: **GraceNotes Daily** (one word: "GraceNotes")
- Stack: TanStack Start v1 + Vite 7 + React 19 + Tailwind v4
- Hosting: Cloudflare Worker (edge) for the app; Supabase Edge Functions (Deno) for the three cron/streaming endpoints. See `<server-runtime>` rules in §7.
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
| SEO landing pages (6 routes + 3 content guides), share bar, llms.txt, expanded sitemap. **16 of 18 sitemap pages indexed as of 2026-06-29** (the 2 pending are `/devotional` and `/blog/building-gracenotes-daily`, added 2026-06-28/29 — expect indexing within days). robots.txt blocks auth, legacy redirects, and all authenticated app routes. | `src/routes/quiet-time-app.tsx` and siblings, `content/*`, `src/components/share-bar.tsx`, `download-guide-modal.tsx`, `site-footer.tsx`, `public/llms.txt`, `public/sitemap.xml`, `public/robots.txt` |
| Founder blog post — `blog.building-gracenotes-daily.tsx`, full article with Article + BreadcrumbList JSON-LD, sectioned long-read layout with eyebrow labels. In sitemap with `priority=0.8`. | `src/routes/blog.building-gracenotes-daily.tsx`, `src/content/blog/building-gracenotes-daily.md` |
| Public shared devotional page + archive — **moved 2026-07-05 (by Lovable) to `/library/devotional` (paginated archive index) and `/library/devotional/$date`**. Legacy `/devotional[/$date]` routes now 301 to the library URLs (SSR-served, verified with curl). Share URLs use the library path (`devotionalUrl()` in `devotional-view.tsx`); prev/next arrows skip gaps via `getDevotionalNeighbours`. Each dated URL is an independently indexable Article page with OG + JSON-LD. **Dated archive pages are NOT yet in sitemap — next step: dynamic/server-generated sitemap.** | `src/routes/library.devotional.index.tsx`, `src/routes/library.devotional.$date.tsx`, `src/routes/devotional.index.tsx` (301), `src/routes/devotional.$date.tsx` (301), `src/lib/devotional-archive.functions.ts`, `src/components/devotional-view.tsx` |
| PWA manifest + theme-color + Apple PWA meta | `public/manifest.json`, `src/routes/__root.tsx` |
| Tally feedback button (all pages) | `src/components/feedback-dialog.tsx`, loaded in `__root.tsx` |
| v2 schema applied (verses, crisis_lines, user_verse_log, daily_grace_notes, chat_sessions, chat_flags, RPCs `select_verse_for_user` and `increment_session_message_count`) | Live DB as of 2026-06-09 |
| AI devotional cover images (2026-07-05, Lovable) — one reverent nature image per devotional date via Lovable AI Gateway (`google/gemini-3.1-flash-image`); stored in PRIVATE bucket `devotional-covers`; served via public proxy `/api/public/devotional-cover/YYYY-MM-DD.png` with immutable cache headers; used as library/archive thumbnails + og:image (falls back to `/og/daily-devotional.png`). `daily_devotionals.cover_image_url` added by migration 20260705125116. | `src/lib/devotional-cover.server.ts`, `src/routes/api/public/devotional-cover.$date.ts`, `src/lib/ai.functions.ts`, `supabase/functions/generate-daily-devotional/index.ts` |
| `chat-reply` edge function (3-tier safety + streaming SSE) — DB now backs it | `supabase/functions/chat-reply/index.ts` |
| `generate-daily-devotional` edge function — day-ahead cron for shared devotional; pg_cron `0 9 * * *` (job id 3, active). Idempotent. Same prompt as `getOrCreateSharedDevotional`. **Confirmed working as of 2026-07-05 PM6** — verified live: `daily_devotionals` has rows for both 2026-07-05 and 2026-07-06. | `supabase/functions/generate-daily-devotional/index.ts` |
| `generate-daily-grace-notes` edge function — DB now backs it; uses the **canonical** prompt (§5). Cron scheduled in `cron.job` (daily 01:00 UTC, active, job id 1). **Confirmed working as of 2026-07-05 PM6** — verified live: all 8 onboarded users have a `daily_grace_notes` row for 2026-07-06. | `supabase/functions/generate-daily-grace-notes/index.ts` |
| PWA icons (192, 512, apple-touch-180) wired into manifest + `__root.tsx`. Master `icon-source.png` is 1254×1254 (verified). | `public/icons/`, `public/manifest.json` |
| `crisis_lines` seeded with 51 countries (verified 51 rows). | Live DB |
| pg_cron jobs 1 (`generate-daily-grace-notes`) and 3 (`generate-daily-devotional`) both use the identical `vault.decrypted_secrets` pattern (`SUPABASE_URL` + `email_queue_service_role_key`) for the Bearer token — see §11 PM6 for the fix that made job 1 match job 3. | `cron.job` |

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
Three Supabase **Edge Functions** because they need provider-side hosting (cron + streaming SSE):
- `supabase/functions/chat-reply` — JWT-validated, 3-tier safety, streams SSE.
- `supabase/functions/generate-daily-grace-notes` — service-role bearer required, writes `daily_grace_notes`.
- `supabase/functions/generate-daily-devotional` — service-role bearer required, day-ahead shared devotional, writes `daily_devotionals`.

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

**Canonical location:** `src/lib/ai.functions.ts`, the `system` constant inside `generateGraceNoteRaw` (function at ~line 251, `system` at ~line 257; corrected 2026-07-05 — was stale "line ~160").

This prompt is used by:
1. **On-demand / fallback** — when `use-daily-grace-note.ts` doesn't find a row in `daily_grace_notes` for today, it calls `generateGraceNote` (in `ai-stubs.ts` → `ai.functions.ts`) and gets a fresh one.
2. **Overnight cron** — `supabase/functions/generate-daily-grace-notes/index.ts` carries an **inlined copy** of the same prompt text (edge functions can't `import` from `src/`). Both paths use **`claude-sonnet-4-5`**, temp `0.9`, `max_tokens: 400` (verified in code 2026-07-05; this doc previously said haiku/0.7 — stale), JSON output `{ message, chatPrompt }`, and the `stripEmDashes` sanitizer. (The shared devotional and chat safety paths still use `claude-haiku-4-5`.)

**If you change the prompt, change it in both files.** The cron file has a header comment reminding you of this.

**The same sync rule now covers three prompt pairs (2026-07-05 PM8):** (1) the grace-note prompt (`ai.functions.ts` ↔ `generate-daily-grace-notes`), (2) the shared-devotional prompt (`ai.functions.ts` ↔ `generate-daily-devotional`), and (3) the cover-image prompt `buildCoverPrompt` (`src/lib/devotional-cover.server.ts` ↔ inlined copy in `generate-daily-devotional`).

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

### 2026-07-05 (PM10) — Canva share assets verified + contract amended to v1.1; housekeeping

- **Canva share-card assets located and verified** (Cindy's delivery): `grace-notes-daily/public/` in the PARENT folder (one level above this repo, not in git; 137 MB). Inventory: 62 background PNGs, all 1080x1920 - grace-note (10), streak (11), answered-prayer (10), devotional (31 across 10 theme dirs: courage, gratitude, grief, hope, identity, joy, purpose, rest, surrender, trust); 3 full design mockups at 1080x1080 in `share-assets/` (e.g. glass card over nature art with gold-bar verse callout and gracenotesdaily.com footer); an answered-prayer confetti SVG; `share-captions.json` caption bank (~10 captions per share type, user-editable before sharing).
- **Contract amended to v1.1-draft** (`.claude/skills/gracenotes-canva-lovable-backend-contract` §2): Canva's deliverable is a background-bank model, not the original 16 fully designed frames - Canva ships art + mockups + captions; the backend renders ALL typography/data over the backgrounds in Satori; mockups serve as the design reference in lieu of slot maps. Campaign skill G0/Phase 3 updated to match; roadmap Stage 1 marked ASSETS DELIVERED.
- **Three G-S1 decisions still open for Cindy:** (1) center-crop the 1080x1920 art for the other three sizes vs new Canva crops; (2) devotional theme→dir mapping (no `peace` dir for Tuesday; identity/joy/surrender/trust unused by the weekday rotation); (3) normalize export names (`11.png`, `grace-note-01-note-01.png`, etc.) and one-time upload to a private `share-templates` bucket.
- **Housekeeping (owner-approved):** deleted `HANDOFF 2.md` (duplicate of `HANDOFF.md`); committed `docs/devotionals-in-journey.md` (ready-to-build feature spec for devotionals in Journey; its link target updated to the `/library/devotional/` URL).

### 2026-07-05 (PM9) — Synced 55 Lovable commits (devotional covers + UI revamp), reconciled CLAUDE.md, skills/roadmap updated, pushed

- **Synced.** Local `main` reset onto `origin/main` (55 new Lovable commits: AI devotional cover images, devotional page redesign, archive grid restructure, masthead fixes, archive `listDevotionals` limit raised to 500, migration adding `daily_devotionals.cover_image_url`).
- **CLAUDE.md reconciled.** Lovable's session had based its CLAUDE.md edit on a stale copy: it deleted the PM6 cron-fix entry (replacing it with its own "PM6" cover entry), deleted the PM5 heading, and reverted the §2 cron rows to pre-fix "still failing" text. Restored: PM4-PM7 history, accurate §2 cron rows, §0 audit hook. Lovable's cover entry kept in full as PM8.
- **New pattern of record (from PM8, now generalized):** public storage buckets are blocked by workspace policy → serve public assets from a PRIVATE bucket through a public SSR proxy route with immutable cache headers (`/api/public/devotional-cover/$date` precedent). The share-card CDN strategy in `.claude/skills/gracenotes-sharing-architecture-campaign` and the contract skill updated to use this same pattern (`/api/public/share-card/...`).
- **§5 prompt-sync policy now has THREE pairs:** grace-note prompt, devotional prompt, and `buildCoverPrompt` (`src/lib/devotional-cover.server.ts` ↔ inlined copy in `generate-daily-devotional/index.ts`).
- **Skills updated:** architecture contract (cover pipeline, bucket policy, third prompt pair), campaign (CDN section), contract (image_url shape), config (LOVABLE_API_KEY + AI Gateway), run/operate (cron backfill mode), validation (og:image now per-date cover), debugging playbook (cover 404 row).
- **Canva exports:** Cindy reports the share-card designs are done, but they are NOT in this repo/connected folder (searched by naming convention). Stage 1 gate G-S1 stays open until the 16 files + slot maps are placed where the build can read them and approved.

### 2026-07-05 (PM8) — AI-generated cover images per devotional + Library "Latest letter" removed

*(Committed by a Lovable session as "PM6"; renumbered to PM8 during the PM9 reconciliation. That commit had also overwritten the real PM6 cron-fix entry and reverted the §2 cron rows to stale "still failing" text - both restored below/above.)*

Two changes for the Library surface:

1. **Removed the "Latest letter" featured section from `/library`.** The most recent essay already appears first in the All Letters row (newest-first sort), so the featured hero was a duplicate. `library.index.tsx`: deleted the `latest` memo and the whole hero `<section>`; simplified `themedSections` (no longer excludes `latest`).

2. **Every daily devotional now has an AI-generated reverent nature cover image.** One image per date, used as (a) the thumbnail on Library cards + archive rows, and (b) the OG/Twitter share card. Reverent nature landscapes only (per §10b imagery policy) — dawn, night, storms, forests, still water, wide fields. The prompt maps theme + title + takeaway to emotional tone (grief → stormy sky, rest → open calm field, hope → dawn light through mist, etc.).

   - **Schema:** migration added nullable `cover_image_url text` to `public.daily_devotionals`.
   - **Storage:** private bucket `devotional-covers` (public buckets are blocked by workspace policy). PNGs uploaded at `<YYYY-MM-DD>.png`.
   - **Proxy route:** `src/routes/api/public/devotional-cover.$date.ts` (public, no auth) downloads from the private bucket and serves the PNG with `Cache-Control: public, max-age=31536000, immutable`. Gives us a stable, crawlable URL without needing public storage.
   - **Model:** `google/gemini-3.1-flash-image` via Lovable AI Gateway (`/v1/images/generations`, non-streaming). Chosen over `openai/gpt-image-2` because it has fewer moderation blocks on natural imagery.
   - **Generation paths (both wired, per §5 policy):**
     - `src/lib/devotional-cover.server.ts` — canonical `buildCoverPrompt` + `generateAndStoreDevotionalCover`.
     - `src/lib/ai.functions.ts` (`getOrCreateSharedDevotional`) — awaits cover generation after text persistence so the returned `DevotionalResult` carries `coverImageUrl` immediately. Fire-and-forget backfill on reads of existing rows that are missing a cover.
     - `supabase/functions/generate-daily-devotional/index.ts` — inlined copy of the cover prompt + upload logic (edge functions can't import from `src/`). Cover is generated after text persist. Failure is non-fatal.
   - **Cron/backfill:** the cron edge function gained a `{"backfill":true,"limit":N}` mode. When called with a specific date whose row already has text but no cover, it fills the cover too (idempotent).
   - **Backfilled 7 pre-existing rows** (2026-06-29 through 2026-07-05) — verified all now carry `cover_image_url`.
   - **UI:**
     - `library.index.tsx` — Recent readings cards now lead with a 16:10 cover thumbnail; DoveMark parchment tile as fallback.
     - `library.devotional.index.tsx` — archive rows gained a 20-28px cover thumbnail on the left.
     - `devotional-view.tsx` — `og:image` and `twitter:image` prefer `coverImageUrl` and fall back to `/og/daily-devotional.png` only when absent.
     - The "Held letter envelope" reading page itself is unchanged (no cover on the reading surface, per prior direction).
   - **Type changes:** `DevotionalResult` and `DevotionalListItem` gained `coverImageUrl?: string | null`. All SELECT statements against `daily_devotionals` updated to include `cover_image_url`.
   - **CLAUDE.md sync:** §5 policy now also covers `buildCoverPrompt` — if you change the cover prompt in `devotional-cover.server.ts`, update the inlined copy in `generate-daily-devotional/index.ts`.

Note on published-URL timing: the `cover_image_url` values point at `https://www.gracenotesdaily.com/api/public/devotional-cover/<date>.png`, which requires the new proxy route to be live. Publish the app to activate the URLs. Crawler previews (Twitter/Facebook debugger) cache aggressively — a changed cover will not appear in shared links until the platform re-fetches.

### 2026-07-05 (PM7) — Stewardship handover: repo synced, Lovable's library-URL migration documented, skill library + roadmap + audit hook added

Principal-engineer handover session (Claude, with Cindy). No app-code changes; docs, skills, and repo hygiene only.

- **Repo synced.** The local folder was 34 commits behind `origin/main` (all Lovable work) and 2 ahead (the PM6 doc commits). Removed a stale `.git/index.lock`, fetched, and rebased the 2 doc commits onto `origin/main`. Not yet pushed at time of writing.
- **Documented Lovable's 2026-07-05 migration (Lovable never logged it here):** devotionals moved to `/library/devotional` + `/library/devotional/$date`; legacy `/devotional[/$date]` 301 via SSR `beforeLoad` (verified server-side with a non-JS fetch); **share URL bug fixed** (commit `af598b7`) — `navigator.share` was passing `text` (verse ref), which some share targets concatenate onto the URL producing e.g. `.../2026-07-05Psalm 138:8`; fix passes `{ title, url }` only. Also new: `devotional-archive.functions.ts` (read-only list/neighbours/latest), archive pagination, heart_notes `superseded_at` migration, `daily_devotionals` schema recreated via migration 20260705074501, last-7-devotionals backfill (`ead356e`).
- **Added `.claude/skills/`** — 15 verified skills (architecture contract, change control, build/env, run/operate, validation, debugging playbook, failure archaeology, config, diagnostics, faith-app domain, Canva/Lovable/backend contract, docs/writing, sharing campaign, proof toolkit, research frontier).
- **Added `roadmap.md`** — stage-gated plan for the PLG sharing system (Canva → backend → contract freeze → Lovable → validation) + Next/Later. Sequencing rules: backend gates Lovable; Canva approval gates parameterization.
- **CLAUDE.md restructured:** new §0 AUDIT HOOK (mandates, tool boundary, URL invariants, five never-break rules, skill loading order); stale §2 devotional-route row corrected. All prior content and this changelog preserved.
- **Decisions taken with Cindy today:** share-card renderer = self-hosted Satori/resvg on a Supabase edge function; analytics = PostHog (new GraceNotes project) with Supabase `share_events` as source of truth; deep links = custom Universal Links / App Links (no vendor; FDL is dead); native Capacitor build targeted <3 months.

### 2026-07-05 (PM6) — Both crons confirmed working: job 1 rewritten to use vault secrets, stale service_role key replaced

Follow-up to PM4. Cindy added the `email_queue_service_role_key` vault secret, then asked to redeploy `generate-daily-devotional` (done — version 2, includes the PM2 `OPENING_RULE` fix) and re-test both crons.

- **Discovered job 1 (`generate-daily-grace-notes`) never actually used vault secrets**, contrary to what §2/§11 previously claimed. Its live `cron.job.command` referenced `current_setting('app.supabase_url')` / `current_setting('app.service_role_key')` — Postgres config parameters that were never set (confirmed both `null`). This is why it failed with `unrecognized configuration parameter`, a completely different error from job 3's vault-secret issue. Rewrote job 1's command via `cron.alter_job` to the same `vault.decrypted_secrets` pattern as job 3 (both now byte-for-byte identical apart from the function path).
- **First re-test still failed with 401** on both jobs, even after the vault secret existed. Decoded the vault-stored JWT's payload (without exposing the signed token) and confirmed the claims were correct (`role: service_role`, `ref: tkoebogweygaabndrsvl`) — so the key was stale or its signature no longer matched the project's current JWT secret, not a copy-paste-the-wrong-key-type mistake.
- Cindy supplied a fresh `service_role` key from Supabase → Project Settings → API. Updated the `email_queue_service_role_key` vault secret (id `fd60d577-ea86-4394-888e-a0a320a630cb`) with it.
- **Re-tested both by directly invoking the same `net.http_post` the cron uses:**
  - `generate-daily-devotional`: 200. `daily_devotionals` now has rows for both 2026-07-05 and 2026-07-06.
  - `generate-daily-grace-notes`: the test call itself hit `net.http_post`'s default 5000ms timeout (this function loops over every onboarded user, one Claude call each, so it routinely runs longer than 5s) — but the function completed in the background regardless. Confirmed via table state: all 8 onboarded users have a `daily_grace_notes` row for 2026-07-06.
- **Fixed the noisy timeout:** bumped job 1's `net.http_post` call to `timeout_milliseconds := 30000` (was defaulting to 5000ms) via `cron.alter_job`. 8 onboarded users comfortably finishes within 30s; revisit this number if the user base grows enough that a full run regularly exceeds it. Job 3 (`generate-daily-devotional`) didn't need this — it only generates one shared devotional per run, not one per user.
- No code files changed this entry — this was live DB/cron configuration only (`cron.job`, `vault.secrets`), done via the Supabase MCP, not a commit.

### 2026-07-05 (PM5) — Dated devotional archive URLs now 404 until the row exists (read-only route)

Owner decision: a dated archive page shouldn't exist publicly until its devotional is ready — no "being prepared" empty state on `/devotional/$date`.

- **New read-only server fn `getStoredSharedDevotional`** (`src/lib/ai.functions.ts`) + stub `getStoredDevotional` (`ai-stubs.ts`): returns the stored row or null, never generates.
- **`src/routes/devotional.$date.tsx`:** loader now uses the read-only lookup and `throw notFound()` when the row doesn't exist (renders the root 404). Side benefit: archive URLs can no longer trigger on-demand AI generation, closing a hole where crawlers or visitors hitting arbitrary/future dated URLs minted devotionals for those dates. Generation now happens only via the cron and the today paths (in-app + `/devotional` index, which keep the PM4 fallback chain).
- 404 for not-yet-generated dates is also correct for SEO (no thin/duplicate placeholder pages in the index).
- `tsc --noEmit` clean.

### 2026-07-05 (PM4) — Production audit: devotional persistence broken since 06-22, both crons never ran; fallback strategy shipped; cron moved to 09:00 UTC

Following up the two-devices divergence fix with a live-DB audit revealed the divergence was not an edge-case race. Persistence of the shared devotional has never worked in production:

- **`daily_devotionals` has 0 rows.** Every devotional view since 2026-06-22 generated fresh content per device, and the upsert failed silently every time (its error was never checked). Cause not yet confirmed from outside the worker: unique constraint on `date`, GRANTs, RLS, and PostgREST visibility all verified fine, and the same admin client successfully writes `daily_content` daily (latest row 2026-07-05; last per-user devotional cache 2026-06-10, confirming prod switched to the shared path ~06-22). The new code checks and logs the persist error, so the first publish will surface the real cause in worker logs.
- **Both pg_cron jobs have failed on every single run** (job 1 `generate-daily-grace-notes`: 36/36 failed; job 3 `generate-daily-devotional`: all runs failed): **`vault.secrets` is empty** — the `email_queue_service_role_key` and `SUPABASE_URL` secrets the cron commands read do not exist, so `net.http_post` receives NULL url + token. The §2 claims about active crons were never true in practice. Also check whether the email queue relies on the same missing secret.
- **Fixed now:** created the `SUPABASE_URL` vault secret (public value). ⚠️ **Owner action required:** add the service-role key in the Supabase SQL editor: `select vault.create_secret('<service-role-key>', 'email_queue_service_role_key');` — until then both crons keep failing.
- **Cron rescheduled** from `0 22 * * *` to `0 9 * * *` (still generates tomorrow-UTC). The row now exists ~1h before UTC+14 reaches its local midnight, so no device anywhere starts a new local day before its devotional exists — the on-demand generation path becomes a true rarity.
- **Fallback strategy implemented** (owner decision: a devotional opened as part of a morning ritual must never be an empty "try again" box). `getOrCreateSharedDevotional` resolution order is now: stored row → generate + persist (first-writer-wins + read-back) → most recent stored devotional, flagged `isFallback` + `servedDate` → locally generated content (absolute last resort, logged loudly) → error. Clients: modal + home queries add a 60s `refetchInterval` while `isFallback` (stops once the real row lands); the modal shows a quiet "Yesterday's reflection" label (or the served date's own date) instead of mislabeling with today's; `/devotional/$date` treats a fallback as "being prepared" (a dated URL never shows another day's content); `/devotional` index anchors head tags + share URL to `servedDate`.
- `DevotionalResult` gains optional `isFallback` + `servedDate` fields. `tsc --noEmit` clean on all changed files.
- ⚠️ **To reach production:** publish via Lovable AND redeploy the `generate-daily-devotional` edge function (`ignoreDuplicates` + `OPENING_RULE` changes are still local-only).

### 2026-07-05 (PM2) — Devotional prompt: banned the "The [adjective] thing about X is Y" opening tic

Cindy flagged that nearly every devotional opened with a sentence shaped like "The [adjective] thing about [X] is [Y]" (e.g. "The strange thing about waiting is..."). The body content was fine; the intros had converged on one template and made every devotional feel the same. Root cause: both devotional prompts instructed "Open with a small concrete tension" with no guidance on *how*, so the model defaulted to its go-to construction for stating a tension.

- **New `OPENING_RULE` constant** (`src/lib/ai.functions.ts`, near `NO_OVER_FAMILIARITY`): explicitly bans the "The [adjective] thing about X is Y" construction and close variants, and bans the underlying shape (name a quality of the topic, then explain it) even when reworded. Gives six alternative entry points to rotate across (scene in motion, direct address, flat statement, first-person confession, sharp image, remembered line), plus negative and positive examples.
- Wired into `generateSharedDevotionalRaw` (shared devotional, the one actually live). *(Was also wired into the per-user `generateDevotionalRaw` at first pass, but that generator was dead code — see the following entry, which removes it.)*
- **`supabase/functions/generate-daily-devotional/index.ts`:** same `OPENING_RULE` block inlined (edge functions can't import from `src/`) and wired into the cron's prompt, per the §5/§9 policy that this prompt must stay in sync with `generateSharedDevotionalRaw`. ⚠️ Redeploy this edge function for the change to take effect.
- Grace-note prompt (`generateGraceNoteRaw`) was not touched — it already has its own opening bans (e.g. "Never open with 'I notice.'") and a different 2-4 sentence shape; the reported repetition was specific to devotionals.
- `tsc --noEmit`: no new errors in `ai.functions.ts`.

### 2026-07-05 (PM3) — Removed dead per-user devotional code

Cindy flagged that we don't ship per-user devotionals anymore and asked whether the prior entry was wrong to reference `generateDevotionalRaw` as merely "unwired." It was accurate but stale: since 2026-06-22, no route or component has called the per-user devotional path — only `getSharedDevotional` is used (`devotional-modal.tsx`, `home.tsx`, `devotional.index.tsx`, `devotional.$date.tsx`). The per-user function was disconnected dead code, not deleted. Removed it outright so the codebase matches reality.

- **`src/lib/ai.functions.ts`:** deleted `generateDevotionalRaw` (the per-user devotional generator, including its own copy of the `OPENING_RULE`-wired prompt) and the `getOrCreateDevotional` server function (cache read/write, verse grounding via `select_verse_for_user`, `user_verse_log` insert).
- **`src/lib/ai-stubs.ts`:** deleted the `generateDevotional` wrapper and its `getOrCreateDevotional` import. `getSharedDevotional` (shared devotional) is untouched and remains the only devotional path.
- Kept: `DevotionalResult` type, `sanitizeDevotional`, `postureFromPhase`, `phaseDesc`/`voiceDesc`/`seasonLine` — all still used by the grace note generator and/or the shared devotional path.
- `tsc --noEmit`: no errors in either changed file (one pre-existing, unrelated error remains in `article-card-compact.tsx`).
- §1/§12 didn't name the per-user generator specifically (they just say "devotional" generically, which still describes the shared path), so no wording change was needed there.

### 2026-07-05 (PM) — Shared devotional divergence fix: fallback is now first-writer-wins + read-back

Bug report: two devices on the same account saw different devotionals on the same day. Root cause: `getOrCreateSharedDevotional` (`src/lib/ai.functions.ts`), generation branch. When the day's row didn't exist yet, each device generated its own devotional, **returned its own generation**, and the final `upsert({ onConflict: "date" })` blindly let the last writer overwrite the first. With `staleTime: Infinity` + `gcTime: 24h` on the client queries, each device kept its divergent copy all day. The race fires nightly for local timezones at/east of UTC+3 (their midnight arrives before the 22:00 UTC day-ahead cron creates the row) — it was the normal path, not an edge case.

- **`src/lib/ai.functions.ts` (`getOrCreateSharedDevotional`):** persist now uses `{ onConflict: "date", ignoreDuplicates: true }` (INSERT … ON CONFLICT DO NOTHING → first insert wins), then **re-selects the row and returns the persisted content**, never the local generation. Every device converges on the one stored devotional. If persist fails and nothing can be re-read, the fn throws (loaders/queries already have retry + "being prepared" states) instead of returning content no other device will ever see.
- **`supabase/functions/generate-daily-devotional/index.ts`:** cron upsert also switched to `ignoreDuplicates: true` so a row created by a device's on-demand fallback during the cron's generation window is kept, not replaced mid-read. ⚠️ Redeploy this edge function for the change to take effect.
- **Known remaining divergence (not changed, by design/decision needed):** the public `/devotional` index route anchors "today" to **UTC** (`devotional.index.tsx`), while home + modal use the client's **local** date. Near midnight the public page and the in-app view can show different days. Recommended follow-up: move the pg_cron schedule from `0 22 * * *` to ~`0 9 * * *` (still generating tomorrow-UTC) so the row exists before the earliest timezone (UTC+14) reaches its local midnight — that makes the on-demand fallback a true rarity.
- Also resolved leftover git merge-conflict markers in this file's §11 (the 2026-06-28 and 2026-06-29 entries were wrapped in `<<<<<<<`/`>>>>>>>`; both sides kept, ordered newest-first).
- `tsc --noEmit`: no errors in changed files.

### 2026-07-05 — Date-scoped devotional check state (midnight-crossing fix)

Bug: "I Receive This" stamped the habit row with the wall-clock date at click time. A user who left yesterday's devotional open past midnight and then tapped receive marked TODAY's row — today's devotional showed as checked. Compounding it, `useHabits` fetched once at mount and never rolled over at local midnight, and DB-mode hook instances didn't sync (no `gn:habits-change` listener in that branch).

- **`src/hooks/use-habits.ts` rewritten date-scoped:** `useHabits(date?)` — pass a local `YYYY-MM-DD` to anchor the hook to that specific day; omit it for a rolling local today that re-anchors at midnight (30s interval + focus/visibilitychange). `markComplete` stamps the hook's anchored date, never "now" (DB upsert and the localStorage fallback, now keyed `gn:habits:<date>`). The `gn:habits-change` event detail is now `{ date, state }` and listeners (both DB and local modes) only apply updates matching their own date — marking yesterday cannot flip today's circles. Hook also returns `date`.
- **`src/components/devotional-modal.tsx`:** freezes `devotionalDate` at the moment the modal opens (re-anchors on reopen); the query key, date label, check state, and the mark itself are all tied to that one date via `useHabits(devotionalDate)`. The modal now calls `markComplete("devotional")` itself. Label shows "Received" (not "Received today") when anchored to a past date.
- **`src/routes/home.tsx`:** removed `onReceived={() => markComplete("devotional")}` — that hook is rolling-today-scoped and was the wrong date across midnight. Home syncs via the date-stamped event. (`onReceived` prop remains optional on the modal for future use.)
- **`src/hooks/use-streak.ts`:** listener now checks `detail.date === today` before letting a mark qualify "today" live; any mark (including a past day) triggers a DB refetch so newly qualifying days are counted.
- Habit auto-mark rule (§4) unchanged: only real actions mark habits. `tsc --noEmit` clean for all four changed files (pre-existing unrelated errors remain).

### 2026-06-29 (PM) — SEO audit + robots.txt tightened

Google Search Console confirmed **16 of 18 sitemap pages indexed**. The 2 still pending (`/devotional`, `/blog/building-gracenotes-daily`) were added 2026-06-28/29 and are in the crawl queue.

- **robots.txt updated** (`public/robots.txt`): added `Disallow` for `/login`, `/signup`, `/reset-password`, `/auth`, `/christian-journaling`, `/prayer-journaling`, `/daily-devotional`. The last three are legacy 301 redirect routes (they redirect to `/library/$slug`) that were showing up as "Page with redirect" in GSC — blocking them stops Google wasting crawl budget on dead-end URLs. Auth pages had no noindex tag and were appearing as "Discovered - currently not indexed."
- **Next SEO priority (not yet done):** build a dynamic/server-generated sitemap that includes `/devotional/YYYY-MM-DD` archive pages. Each dated devotional is an independently indexable Article page with OG + JSON-LD already in place — the infrastructure is ready, they just aren't being submitted to Google. This is the highest-leverage SEO action remaining.

### 2026-06-29 — Cross-Account Protection (RISC) implementation

Google RISC lets Google notify GraceNotes when a user's Google account is compromised. When triggered, the app revokes the user's Supabase sessions immediately.

**New files:**
- `src/lib/risc-jwt.ts` — fetches Google's RISC JWKS (via `.well-known/risc-configuration`) and verifies incoming SET JWTs using `jose` (Workers-compatible).
- `src/lib/risc-events.server.ts` — maps RISC event types to Supabase admin actions: `sessions-revoked`, `account-credential-change-required`, and `account-hijacking-detected` → `auth.admin.signOut(userId, 'global')`; `account-disabled` and `account-purged` → sign out + 100-year ban.
- `src/routes/api/risc/receiver.ts` — the RISC endpoint. GET handles Google's challenge-echo verification. POST receives SET JWTs, verifies them, and dispatches events. Always returns 202 to prevent Google retries on processing errors.
- `scripts/register-risc.ts` — one-time registration script. Run with `GOOGLE_SERVICE_ACCOUNT_JSON` and `GOOGLE_CLIENT_ID` set. Uses a service-account JWT to call `https://risc.googleapis.com/v1beta/stream:update`.

**New dependency:** `jose` (JWKS + JWT verify; Workers-compatible).

**New env var required:** `GOOGLE_CLIENT_ID` — add as a Cloudflare Worker secret (`wrangler secret put GOOGLE_CLIENT_ID`). This is the OAuth client ID used by Google sign-in.

**To activate:**
1. Add `GOOGLE_CLIENT_ID` secret to Cloudflare dashboard.
2. Deploy to production (via Lovable → Publish).
3. Run `scripts/register-risc.ts` once with the service account JSON to register the endpoint URL with Google.

### 2026-06-28 (PM) — Day-ahead devotional cron + graceful error state

**Task 1 — Day-ahead generation (`supabase/functions/generate-daily-devotional/index.ts`):**
- New Supabase edge function deployed (v1, `verify_jwt=false`, bearer-token auth against service role key). Defaults to tomorrow UTC; accepts optional `{ date }` body override. Idempotent: skips if a row already exists for that date.
- Inlines the same prompt and verse-selection logic as `getOrCreateSharedDevotional` (weekday theme, 8-occurrence no-repeat, related passages, em-dash sanitizer, haiku-4-5, temp 0.7).
- pg_cron job `generate-daily-devotional` scheduled `0 22 * * *` (22:00 UTC daily, job id 3). Fires ~10 hours before midnight UTC — devotional is ready before any timezone sees the new day.
- **Lightweight review:** visit `/devotional/YYYY-MM-DD` the evening before to preview. If you want to regenerate, delete the row from `daily_devotionals` and the next view (or a manual curl to the edge function with `{ "date": "YYYY-MM-DD" }`) will create a fresh one.
- PROMPT POLICY (§5 rule extended): if you change `generateSharedDevotionalRaw` in `src/lib/ai.functions.ts`, also update the inlined prompt in `supabase/functions/generate-daily-devotional/index.ts`.

**Task 2 — Graceful error state:**
- Both route loaders (`devotional.index.tsx`, `devotional.$date.tsx`) now wrap `getSharedDevotional` in try/catch and return `{ devotional: null, date }` on failure — no more unhandled loader exceptions on AI/DB errors.
- `DevotionalView` (`src/components/devotional-view.tsx`) accepts `DevotionalResult | null`. When null it renders an on-brand "Today's devotional is being prepared" card with a reload button; the reading layout is unchanged for the happy path.

### 2026-06-28 — Listen pause/resume fix, Media Session API, sitemap + copy fixes

- **Listen pause/resume bug fixed** (`src/routes/__root.tsx`): the play/pause effect was calling `a.load()` unconditionally on every play, which restarted the track from 0 instead of resuming. Removed `.load()` from the effect; the audio element already uses `key={track.id}` + `autoPlay` which handles new track loading on remount. The effect now only calls `.play()` or `.pause()` to toggle state.
- **Media Session API** (`src/routes/__root.tsx`): added a `useEffect` on `track` change that sets `navigator.mediaSession.metadata` (title, artist, album, artwork) and wires `play`, `pause`, and `nexttrack` action handlers. Enables lock-screen controls, headphone buttons, and car media displays.
- **Sitemap** (`public/sitemap.xml`): added `/devotional` with `changefreq=daily`, `priority=0.9`.
- **Grace-note info popover copy** (`src/routes/home.tsx`): updated to match 2-step onboarding. Old copy referenced "the voice you chose and seasons you picked" (removed from onboarding 2026-06-22). New copy: "This note is shaped by your faith phase. As you chat each day, it will grow more personal."

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
  - ⚠️ **Open risk:** the grace-note and devotional generators currently let the model *write* the verse text, so NIV accuracy is **not** guaranteed there. To truly guarantee "verified NIV everywhere," the generators must be switched to **ground the verse from the `verses` table** (already the planned Phase 1/3 work) rather than letting the model produce scripture. **[RESOLVED same day — the "2026-06-22 (PM)" entry above shipped verse grounding for both generators. Kept for history; do not treat as open. Annotated 2026-07-05.]**
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
- Rewrote `supabase/functions/generate-daily-grace-notes/index.ts` to use the **canonical** grace-note prompt (inlined from `src/lib/ai.functions.ts:160`), `claude-haiku-4-5`, and the `stripEmDashes` sanitizer. Dropped the dependency on `select_verse_for_user` / `user_verse_log` so it's a clean parallel to the on-demand fallback. **[Superseded 2026-06-22: the cron was re-grounded on the `verses` table via the RPC — see that entry. Verse grounding is a never-break rule (§0). Annotated 2026-07-05.]**
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
| Daily devotional cron edge function (day-ahead) | `supabase/functions/generate-daily-devotional/index.ts` |
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
| RISC JWT verifier | `src/lib/risc-jwt.ts` |
| RISC event handlers | `src/lib/risc-events.server.ts` |
| RISC receiver endpoint | `src/routes/api/risc/receiver.ts` |
| RISC registration script | `scripts/register-risc.ts` |
| Devotional cover generator (canonical cover prompt) | `src/lib/devotional-cover.server.ts` |
| Devotional cover public proxy route | `src/routes/api/public/devotional-cover.$date.ts` |
| Devotional archive server fns (list/neighbours/latest, read-only) | `src/lib/devotional-archive.functions.ts` |
| Devotional archive routes (canonical) | `src/routes/library.devotional.index.tsx`, `library.devotional.$date.tsx` |
| Legacy devotional 301 routes | `src/routes/devotional.index.tsx`, `devotional.$date.tsx` |
| Roadmap (read before coding) | `roadmap.md` |
| Skill library (verified ops knowledge) | `.claude/skills/*/SKILL.md` |
| Crisis lines seed | `scripts/seed_crisis_lines.js`, `gracenotes_crisis_lines.json` |
| Verses library seed (unused for now) | `scripts/seed_verses.js`, `gracenotes_verse_library.json` |
| Routes | `src/routes/*.tsx` |
