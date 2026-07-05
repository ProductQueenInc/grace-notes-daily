---
name: gracenotes-failure-archaeology
description: The complete investigation history of GraceNotes Daily - every major failure, dead end, rejected fix, and revert with symptom, root cause, evidence, and current status. Load when a bug feels familiar, before re-attempting something that may have been tried, when writing a post-mortem, or to understand why the code is shaped the way it is. Triggers: history, post-mortem, why is it like this, was this tried before, past failures, archaeology, root cause.
---

# GraceNotes Failure Archaeology

Format per entry: **Symptom → Root cause → Evidence → Status.**

## When NOT to use this skill

- Fast triage of a LIVE issue → `gracenotes-debugging-playbook` (this file holds the full stories, not the quick table)
- Defining what evidence closes an investigation → `gracenotes-validation-and-qa`

## 1. Malformed share URLs (THE share bug)

- **Symptom:** Recipients got broken links like `https://www.gracenotesdaily.com/devotional/2026-07-05Psalm 138:8` — verse reference fused onto the URL; page 404'd.
- **Root cause:** Two compounding issues. (a) `navigator.share({ title, text: d.verseRef, url })` — several share targets and clipboard fallbacks concatenate `text` + `url` without a separator. (b) Share URLs also pointed at the legacy `/devotional/` path mid-migration.
- **Evidence:** Guard comment + fix in `src/components/devotional-view.tsx` (`onShare`: "We intentionally omit `text`…"); Lovable commit `af598b7` "Fixed devotional URL in share" (2026-07-05); `devotionalUrl()` now hard-codes the `/library/devotional/` path.
- **Status:** FIXED. Regression guards: share only `{ title, url }`; `console.log("[share] devotional url =", url)` before dispatch; rule extended to all future share surfaces.

## 2. Devotional persistence silently broken for 13 days

- **Symptom:** `daily_devotionals` had **0 rows** on 2026-07-05 despite the shared-devotional feature "shipping" 2026-06-22. Every view generated fresh content per device; costs up, content divergent.
- **Root cause:** The upsert's error result was never checked — it failed silently on every call. (Underlying constraint/GRANT cause was masked until logging was added.)
- **Evidence:** Live-DB audit 2026-07-05 PM4 (CLAUDE.md §11); `daily_content` written daily by the same admin client proved the client itself worked.
- **Status:** FIXED (write errors now checked and logged; persistence confirmed with rows for 07-05 and 07-06). LESSON: a write without a checked error is not a write.

## 3. Two devices, two devotionals (divergence race)

- **Symptom:** Same account, two devices, different devotionals all day.
- **Root cause:** Get-or-create raced: each device generated, returned its OWN generation, and a blind last-writer-wins upsert overwrote the first. `staleTime: Infinity` pinned the divergence client-side. Fired nightly for timezones ≥ UTC+3 (their midnight preceded the then-22:00-UTC cron) — the normal path, not an edge case.
- **Evidence:** CLAUDE.md §11 2026-07-05 (PM).
- **Status:** FIXED: `{ onConflict: "date", ignoreDuplicates: true }` (first-writer-wins) + re-select and return the persisted row; cron moved to 09:00 UTC so the row exists before UTC+14 midnight.

## 4. Both cron jobs failed on every run since creation

- **Symptom:** Job 1: 36/36 failed runs. Job 3: all failed. Documentation claimed both were "active and working".
- **Root cause (layered):** (a) `vault.secrets` was empty — the secrets the commands read never existed; (b) job 1's command didn't even read vault — it read `current_setting('app.supabase_url')`, never set; (c) after seeding vault, the stored service_role key was stale (signature no longer matched the project JWT secret) → 401.
- **Evidence:** `cron.job_run_details`; decoded JWT claims (correct `role`/`ref` but rejected); CLAUDE.md §11 PM4 + PM6.
- **Status:** FIXED 2026-07-05 PM6: both jobs rewritten to the identical vault pattern, fresh key stored, verified by table state. LESSON: "cron scheduled" claims must be verified against `job_run_details`, not the schedule row.

## 5. False-failure cron logs (timeout)

- **Symptom:** Job 1 test invocations "failed" with a timeout, yet all 8 users got rows.
- **Root cause:** `net.http_post` default 5000 ms timeout; the function loops one Claude call per user and legitimately exceeds 5 s.
- **Evidence:** CLAUDE.md §11 PM6; local commit `2758031`.
- **Status:** FIXED: `timeout_milliseconds := 30000` via `cron.alter_job`. Revisit when user count grows (~30 s ceiling).

## 6. Dated archive URLs minting content (crawler hole)

- **Symptom:** Any visitor/crawler hitting an arbitrary or FUTURE dated devotional URL triggered on-demand AI generation for that date.
- **Root cause:** The dated route's loader called get-or-create.
- **Evidence:** CLAUDE.md §11 PM5; current `library.devotional.$date.tsx` loader calls `getStoredDevotional` and throws `notFound()`.
- **Status:** FIXED: dated route is read-only; 404 until the row exists (also correct for SEO). REJECTED alternative: a "being prepared" empty state on dated URLs — owner decided pages shouldn't exist publicly before their content does.

## 7. Midnight-crossing habit marking

- **Symptom:** Tapping "I Receive This" on yesterday's still-open devotional after midnight marked TODAY complete.
- **Root cause:** Habit stamped with wall-clock date at click time; `useHabits` fetched once and never rolled over; DB-mode instances didn't sync.
- **Evidence:** CLAUDE.md §11 2026-07-05; `use-habits.ts` (date-scoped rewrite), `devotional-modal.tsx` (frozen `devotionalDate`).
- **Status:** FIXED. Events are date-stamped `{ date, state }`; listeners apply only matching dates.

## 8. Verse hallucination and NIV risk

- **Symptom:** Model-written "Scripture" could be misquoted; NIV accuracy not guaranteed; licensing exposure (NIV © Biblica).
- **Root cause:** Generators let the model write verse text.
- **Evidence:** CLAUDE.md §11 2026-06-22 entries; `verses` table + `select_verse_for_user` RPC.
- **Status:** FIXED: verses grounded from the curated 123-verse NIV table; model told to write around fixed text. OPEN RISK: Biblica gratis-use limits at scale (flagged, not legal advice).

## 9. Repeating content tics

- **(a) Same verse on consecutive days:** anti-repetition ban list + temp 0.5→0.9 (2026-06-21), then structural fix via 60-day rotation RPC (2026-06-22).
- **(b) "The [adjective] thing about X is Y" opener on nearly every devotional:** `OPENING_RULE` ban with 6 alternative entry points (2026-07-05 PM2). REJECTED approach: prompting "vary your openings" without naming the banned shape — model converged again.
- **(c) Em-dashes despite prompt bans:** enforced in code (`stripEmDashes`) at every load and persist point (2026-05-24, extended 2026-06-16).
- **Status:** all FIXED; pattern to reuse: never rely on prompt-only bans — enforce structurally or in code.

## 10. v2 schema never applied (docs ahead of reality)

- **Symptom:** Edge functions and hooks failing at runtime against missing tables/RPCs while migration files sat in the repo (discovered 2026-06-09); repeated 2026-07-05 when `daily_devotionals` turned out to be missing from the live DB (recreated by migration 20260705074501).
- **Root cause:** Migration files committed but never applied; docs asserted "live".
- **Status:** FIXED both times. LESSON: a migration file is a proposal; only the live DB is truth. Verify with `list_tables`/SELECT.

## 11. Stalled / not-started items (so you don't assume they exist)

- Push notifications: never started (VAPID keys, send fn — nothing).
- Capacitor native build: stub config only.
- `background_images` table exists but URLs are hard-coded in `nature-background.tsx`.
- CI/CD: none; deploys are human-gated via Lovable.
- Analytics/PLG instrumentation: none (PostHog decided 2026-07-05, not yet built).
- `tracks.functions.ts`: dead code (Listen queries Supabase directly).

## Provenance and Maintenance

Written 2026-07-05. Sources: CLAUDE.md §11 (all dated entries), git history incl. `af598b7`, live-DB verification, code comments. When a new investigation closes, ADD AN ENTRY HERE and a triage row to `gracenotes-debugging-playbook`. Re-verify stalled items: `ls ios 2>/dev/null; grep -rl "posthog" src || echo "still no analytics"`.
