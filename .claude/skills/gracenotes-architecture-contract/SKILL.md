---
name: gracenotes-architecture-contract
description: Load-bearing architecture decisions, invariants, and known weak points for GraceNotes Daily. Load FIRST for any task touching routing, URLs, the server-function/edge-function split, the Canva/Lovable/backend boundary, database schema, or before proposing any structural change. Triggers: architecture, invariants, URL structure, routing, stack, tool boundary, what owns what, where does X live.
---

# GraceNotes Architecture Contract

The decisions below are settled. Do not re-open them. Build on top of them.

## When NOT to use this skill

- Executing a step of the sharing build → `gracenotes-sharing-architecture-campaign`
- The Canva/Lovable/backend API contract in field-level detail → `gracenotes-canva-lovable-backend-contract`
- How to classify/gate a change → `gracenotes-change-control`

## Stack (verified 2026-07-05)

| Layer | Technology | Where |
|---|---|---|
| Frontend + SSR | TanStack Start v1, Vite 7, React 19, Tailwind v4 | `src/` |
| App hosting | Cloudflare Worker, deployed ONLY via Lovable publish | `wrangler.jsonc` (`main: src/server.ts`) |
| Backend | Supabase (Lovable Cloud), project ref `tkoebogweygaabndrsvl` | `supabase/` |
| App-internal server logic | TanStack `createServerFn` | `src/lib/*.functions.ts` |
| Cron + streaming | Supabase Edge Functions (Deno) | `supabase/functions/` |
| AI | Claude via `@anthropic-ai/sdk` - grace note: `claude-sonnet-4-5` (temp 0.9); shared devotional + chat safety: `claude-haiku-4-5` | `src/lib/ai.functions.ts` |
| State/data | TanStack Query (server data), zustand (audio player) | hooks in `src/hooks/` |

Jargon: "Lovable" is the AI app-builder product that owns deployment of this app (its commits appear as `gpt-engineer-app[bot]`). The project brief sometimes spells it "Loveable"; the repo and this library use **Lovable**.

## URL invariants (settled 2026-07-05, live in production)

| URL | Role |
|---|---|
| `gracenotesdaily.com/library` | Content hub for ALL writing (articles + devotionals) — `src/routes/library.index.tsx` |
| `gracenotesdaily.com/library/devotional` | Devotional archive index (paginated) — `src/routes/library.devotional.index.tsx` |
| `gracenotesdaily.com/library/devotional/YYYY-MM-DD` | One public devotional per day; the canonical deep-link target — `src/routes/library.devotional.$date.tsx` |
| `gracenotesdaily.com/devotional[/YYYY-MM-DD]` | LEGACY. 301s to the library equivalents — `src/routes/devotional.index.tsx`, `devotional.$date.tsx` |
| `gracenotesdaily.com/library/<slug>` | SEO articles — `src/routes/library.$slug.tsx` |

Facts about the 301s (verified live 2026-07-05):

- Implemented as TanStack `beforeLoad` + `throw redirect({ statusCode: 301 })`. Because TanStack Start SSRs on the Cloudflare Worker, a direct HTTP hit returns a real HTTP 301 — confirmed with a non-JS fetcher. They are NOT client-side-only.
- They are framework-level, not CDN/edge rules. If SSR breaks, the redirects break with it. There is no `public/_redirects` file and no Worker-level redirect rule.
- The canonical share URL is built by `devotionalUrl()` in `src/components/devotional-view.tsx` → `${BASE_URL}/library/devotional/${dateISO}`. `BASE_URL = "https://www.gracenotesdaily.com"` lives in `src/lib/library.ts`.

## The three-tool boundary (hard contract)

| Tool | Owns | Never does |
|---|---|---|
| **Canva** | Visual design of share-card templates; exports static assets | Anything dynamic; anything in the repo |
| **Lovable** | Share UI (modals, CTAs, confetti-to-share transition, native share sheet call); parameterizing approved Canva exports into app components; app deployment | Generating images; routing decisions; attribution |
| **Backend** (this seat) | Image rendering pipeline, API contract, CDN hosting of rendered images, deep links, PLG attribution, share-event schema, server-side personalization | Share UI |

Full field-level contract: `gracenotes-canva-lovable-backend-contract`.

## Server-side split (invariant)

- App-internal logic → `createServerFn` in `src/lib/*.functions.ts` (client-safe paths; never `src/server/`).
- Supabase Edge Functions ONLY when cron or streaming forces it. Current three: `chat-reply` (safety + SSE), `generate-daily-grace-notes` (per-user cron, 01:00 UTC, pg_cron job 1), `generate-daily-devotional` (shared day-ahead cron, 09:00 UTC, job 3).
- Both cron jobs authenticate via `vault.decrypted_secrets` (`SUPABASE_URL` + `email_queue_service_role_key`); job 1 uses `timeout_milliseconds := 30000`.

## Data model (share-relevant tables, verified in `supabase/migrations/`)

| Table | Purpose | Notes |
|---|---|---|
| `profiles` | name, faith_phase, voice, timezone, country_code, `inferred_themes jsonb` | RLS: own-row |
| `daily_grace_notes` | per-user, per-date AI note (message, verse, chat prompt) | written by cron job 1 |
| `daily_devotionals` | ONE shared devotional per `date` (unique); `cover_image_url` (AI nature cover, migration 20260705125116) | public SELECT for anon + authenticated |
| `prayers` | `answered boolean`, `answered_at timestamptz` | answered-prayer peak moment |
| `daily_habits` | per-day devotional / daily_message / journal booleans | streak source |
| `heart_notes` | journaling; `superseded_at` allows multiple per day (unique only where `superseded_at IS NULL`) | migration 20260705100634 |
| `verses` | curated NIV library (123 active) — the model never writes Scripture | |

No `share_events` table exists yet (verified 2026-07-05). No analytics instrumentation exists in the app.

## Streak semantics (product decision — do not "fix")

`src/hooks/use-streak.ts` counts the TOTAL number of days the user ever showed up (any of devotional / daily_message / journal). Missing a day does NOT reset it. Badge tiers per day: none → copper (1/3) → silver (2/3) → gold (3/3) (`src/lib/badges.ts`, gold gradient `#f4cf5a → #c98f1c`). The streak share card must reflect this grace-based model, not a guilt-based consecutive-days model.

## Known weak points (stated plainly)

1. **Generated Supabase types lag migrations.** Pattern in use: cast `supabaseAdmin as unknown as SupabaseClient` (see `devotional-archive.functions.ts`, `ai.functions.ts`). Regenerate types or keep casting deliberately.
2. **Prompt duplication.** THREE prompt pairs are inlined in edge functions because Deno can't import from `src/`: grace note, shared devotional, and the cover-image prompt (`buildCoverPrompt` in `src/lib/devotional-cover.server.ts`). Changing one side without the other silently forks behavior (CLAUDE.md §5 rule).
3. **Lovable sessions do not update CLAUDE.md.** The 2026-07-05 library-URL migration (34 commits) never touched it. Assume CLAUDE.md can be behind Lovable's work; verify against code.
4. **Two lockfiles** (`bun.lock` + `package-lock.json`) coexist. Local `tsc --noEmit` shows pre-existing missing-dep errors (`marked`, `@react-email/*`, `@lovable.dev/*`) that resolve in the Lovable build.
5. **301s depend on SSR** (above).
6. **The local folder can be stale vs GitHub.** Lovable pushes to `ProductQueenInc/grace-notes-daily` `main`; on 2026-07-05 the local copy was 34 commits behind. Run `git fetch && git status -sb` before trusting the tree.

## Public asset serving pattern (established 2026-07-05)

**Public storage buckets are blocked by workspace policy.** The pattern of record: keep the bucket PRIVATE and serve through a public SSR proxy route with immutable cache headers. Precedent: `devotional-covers` bucket → `/api/public/devotional-cover/YYYY-MM-DD.png` (`src/routes/api/public/devotional-cover.$date.ts`, `Cache-Control: public, max-age=31536000, immutable`). Never use signed URLs for socially shared assets - they expire and break previews. Devotional covers are generated by `google/gemini-3.1-flash-image` via the Lovable AI Gateway (`ai.gateway.lovable.dev`), non-fatal on failure.

## Frontend conventions (locked — from CLAUDE.md)

Do not touch: `src/styles.css` design tokens, `app-sidebar.tsx`, `app-shell.tsx`, `nature-background.tsx`, `page-header.tsx`, `player-dock.tsx`, `icon.tsx`, `src/components/ui/*`, onboarding step structure, habit auto-mark rule, `src/integrations/supabase/client.ts`. Fonts: Fraunces (display) + Nunito (body). Icons: Lucide via `@/components/icon` only. Surfaces: `.glass-on-hue`, `.glass-parchment`. No emojis in chrome. No em-dashes in any AI or brand output.

## Provenance and Maintenance

Written 2026-07-05 against local commit `2758031` (= origin/main `ead356e` + 2 local doc commits). Re-verify:

- Routes exist: `ls src/routes | grep library.devotional`
- 301 is HTTP-level: `curl -sI https://www.gracenotesdaily.com/devotional/2026-07-04 | grep -iE "HTTP|location"`
- No share_events yet: `grep -rl share_events supabase/migrations || echo "still none"`
- Local vs GitHub: `git fetch origin && git status -sb`
- Cron jobs: Supabase SQL `select jobid, schedule, active from cron.job;`
