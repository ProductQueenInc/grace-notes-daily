# GraceNotes Daily - Handoff Prompt

Paste the block below as the first message when starting a new chat (including with a
less expensive model) to continue this build. Keep it in sync with CLAUDE.md, which is
the authoritative live handover + changelog.

---

You are picking up an in-progress build of GraceNotes Daily, a soft Christian
devotional web app (TanStack Start v1 + Vite + React 19 + Tailwind v4, hosted on
Cloudflare via Lovable, backend on Supabase). Work carefully and prefer small,
verified changes.

## Access
- Codebase: the GraceNotes repo is connected as a local folder. GitHub remote is
  ProductQueenInc/grace-notes-daily, branch `main`. GitHub is the source of truth;
  the app deploys when the owner publishes from Lovable.
- Supabase project ref: tkoebogweygaabndrsvl (use the Supabase tools for schema,
  SQL, edge functions, advisors).

## Read first
- Read CLAUDE.md at the repo root in full before doing anything. It is the live
  handover doc and the changelog (most recent entries are dated 2026-06-22). Every
  code change MUST be reflected in CLAUDE.md before you push.
- The canonical grace-note prompt lives in `src/lib/ai.functions.ts`. If you change
  it, also change the inlined copy in
  `supabase/functions/generate-daily-grace-notes/index.ts`.

## What is already done (all on GitHub main)
1. Onboarding cut to 2 steps (name + faith phase). No gender, no birthday. Rhythms,
   seasons, and voice are defaulted; "seasons" will be inferred from chat later.
2. Bible translation standardized on NIV. Settings shows a fixed NIV attribution
   notice (the old translation picker was removed).
3. Verse grounding: the grace note AND the devotional pull a verified NIV verse from
   the `verses` table via the `select_verse_for_user` RPC (60-day rotation, logs
   `user_verse_log`). The model never writes Scripture. Both the on-demand path
   (`ai.functions.ts`) and the cron edge function (`generate-daily-grace-notes`,
   deployed) are grounded.
4. Verbatim NIV pass on the 124-verse library: no wording deviations found,
   duplicates removed, "Lord" title-case everywhere, all em/en dashes removed from
   verse text.
5. Shared daily devotional: `getOrCreateSharedDevotional` in `ai.functions.ts`. One
   devotional per day for everyone, keyed by date in `daily_devotionals`, weekday
   theme rotation (Mon Hope, Tue Peace, Wed Grief & Comfort, Thu Gratitude, Fri
   Courage, Sat Rest, Sun Purpose), grounded verse + related, generalized/shareable.
   Public pages `/devotional` (today) and `/devotional/$date` (archive) with SEO meta
   + Article/Breadcrumb JSON-LD, share, and a signup CTA. In-app modal + home read the
   shared devotional.

## Decisions locked (do not relitigate)
- No em dashes or en dashes anywhere, in code output or content. Hard rule.
- NIV everywhere, grounded from the `verses` table, never written by the model.
- Divine name is title-case "Lord" (not all-caps).
- Devotional is shared (same for everyone); grace note is per-user.
- Do not redesign locked frontend (design tokens, sidebar, AppShell,
  NatureBackground, PageHeader, PlayerDock, icon wrapper, imagery policy).

## How to work (important)
- Base all edits on the latest GitHub state. The owner's local working copy can lag
  behind origin, so before editing, confirm you are working from current origin/main.
- The mounted `.git` has filesystem lock issues, so do NOT git commit/rebase in place.
  To push: clone origin fresh into a temp dir, copy your changed files in, commit, and
  push (a clean fast-forward). Never force-push. Mask any token in command output.
- Type-check before pushing: run `npx tsc --noEmit`. Ignore the pre-existing
  missing-dependency errors (marked, @react-email/*, @lovable.dev/*); they resolve in
  the Lovable build. Your own files must be clean.
- If you add or move routes, the route tree (`src/routeTree.gen.ts`) must be
  regenerated (the `@tanstack/router-generator` package can do this directly if vite
  cannot run).
- After shipping, update CLAUDE.md and the Notion build-log page.

## Next tasks (in priority order)
1. A-day-ahead generation for the shared devotional + a lightweight review step, so
   devotionals are pre-made rather than generated on first view.
2. Graceful error state on the public `/devotional` page if generation fails.
3. Add the devotional archive to `public/sitemap.xml`.
4. Listen feature fixes: add Media Session API (lock-screen / headphone / car controls
   + metadata), and fix the pause/resume bug (the audio effect calls `.load()` on every
   play, which restarts the track from 0 instead of resuming).
5. Copy fix: the home grace-note info popover still says notes use "the voice you chose
   and seasons you picked," which onboarding no longer asks.

Start by reading CLAUDE.md and confirming the current origin/main state, then tell me
which task you are taking and your plan before you change code.
