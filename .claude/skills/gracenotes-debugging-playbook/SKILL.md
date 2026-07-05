---
name: gracenotes-debugging-playbook
description: Symptom-to-triage table for GraceNotes Daily's real, historically observed failure modes - broken shares, wrong devotionals, cron silence, habit/streak bugs, AI output drift. Load FIRST when anything is broken, erroring, silent, missing, duplicated, or wrong in production or dev. Triggers: bug, broken, error, 404, failing, wrong content, missing row, cron didn't run, share link broken, debug.
---

# GraceNotes Debugging Playbook

Triage order: (1) find the symptom row below, (2) run its check, (3) only then read code. Every row here cost real time once.

## When NOT to use this skill

- Writing the post-mortem / history → `gracenotes-failure-archaeology` (full stories live there)
- Defining "fixed" → `gracenotes-validation-and-qa`

## Symptom → triage table

| Symptom | First check | Likely cause | Fix pattern |
|---|---|---|---|
| Shared link is malformed (e.g. `.../2026-07-05Psalm 138:8`) | What was passed to `navigator.share`? | Share target concatenates `text` + `url` with no separator | Pass ONLY `{ title, url }` to `navigator.share`. Never reintroduce `text`. Fixed 2026-07-05 (`af598b7`); guard comment + `console.log("[share] devotional url =", url)` in `devotional-view.tsx` |
| Two devices show different devotionals same day | `select * from daily_devotionals where date='<today>'` | Last-writer-wins upsert race in get-or-create | First-writer-wins: `ignoreDuplicates: true` + re-select and return the PERSISTED row (2026-07-05 PM) |
| Public devotional table empty / content regenerates every view | Same SELECT; then worker logs for persist error | Upsert failing silently (error never checked) | Always check and log `.error` on writes. Was broken 06-22→07-05 with zero rows |
| Cron "ran" but nothing happened | `select status, return_message from cron.job_run_details order by start_time desc limit 5` | vault secrets missing/stale → `net.http_post` got NULL url/token, or 401 from stale service key | Recreate vault secret with fresh service_role key; both jobs must use the identical `vault.decrypted_secrets` pattern |
| Cron marked FAILED but data exists | Table state for target date | `net.http_post` default 5000 ms timeout; function kept running | Raise `timeout_milliseconds` via `cron.alter_job` (job 1 → 30000) |
| `unrecognized configuration parameter "app.supabase_url"` | `select command from cron.job where jobid=<n>` | Job command reads `current_setting(...)` that was never set | Rewrite command to the vault pattern (job 1, 2026-07-05 PM6) |
| Dated devotional URL 404s | Does the row exist? | Correct behavior for not-yet-generated dates (read-only route, PM5) | Only "fix" by generating the row (cron/manual invoke), never by adding on-demand generation to the route |
| Yesterday's devotional marks TODAY's habit | Which date did `markComplete` stamp? | Habit was stamped with wall-clock date at click time across midnight | `useHabits(date)` anchored dates; modal freezes `devotionalDate` at open (2026-07-05) |
| Em-dashes in AI output | Output text | Model ignores prompt instruction | Sanitize in code (`stripEmDashes`) at every load AND persist point; prompt alone is insufficient |
| AI shows an old date (e.g. Jan 2025) | Model output vs server date | Haiku hallucinating dates from training data | Force-overwrite date fields server-side after parse (2026-06-12) |
| Every devotional opens with "The [adj] thing about X is Y" | Recent `daily_devotionals.body` | Prompt tic convergence | `OPENING_RULE` ban block; edit BOTH prompt copies (Class E change) |
| Devotional cover missing / cover URL 404s | Does `daily_devotionals.cover_image_url` exist? Does the object exist in the `devotional-covers` bucket? | Cover generation is non-fatal by design: `LOVABLE_API_KEY` missing (logged warn), AI gateway failure, or the proxy route not yet published via Lovable | Re-run the cron with `{"backfill":true}`; UI falls back to the DoveMark tile, og:image falls back to `/og/daily-devotional.png` |
| Audio restarts from 0 on resume | Play/pause effect | Unconditional `a.load()` on play | Only `.play()`/`.pause()` in the effect; `key={track.id}` + `autoPlay` handles loading |
| TypeScript errors on tables that exist in DB | `src/integrations/supabase/types.ts` age | Generated types lag migrations | Cast `supabaseAdmin as unknown as SupabaseClient` (established pattern) or regenerate types |
| Server fn 401 on a public page | Is it called in a public route's loader? | Auth-protected server fns 401 during prerender | Move call into a component or `_authenticated/` context |
| Git operations fail with "index.lock exists" | `ls .git/index.lock` | Crashed prior git process | Remove the stale lock; retry |
| My change isn't on the live site | Was Lovable Publish clicked? Edge fn redeployed? | Push ≠ deploy (three deploy states) | See `gracenotes-run-and-operate` deploy table |
| Local code contradicts the live site | `git fetch origin && git status -sb` | Local folder behind Lovable's pushes (34 behind on 2026-07-05) | Sync before reasoning about anything |

## The share URL bug — never let it recur

What: share button produced `https://www.gracenotesdaily.com/devotional/2026-07-05Psalm 138:8` (verse ref glued to URL, also pre-migration path). Cause: `navigator.share({ title, text, url })` — some share targets and copy fallbacks concatenate `text` onto `url` with no separator. Fix (Lovable, 2026-07-05, commit `af598b7` + repo comment in `devotional-view.tsx`): omit `text` entirely; share `{ title, url }` only; log the URL before dispatch. Regression guard: any new share surface (grace note, prayer, streak) MUST follow the title+url-only rule and reuse the `[share]` console log convention.

## Generic triage commands

```bash
npx tsc --noEmit                                   # type state
git fetch origin && git status -sb                 # staleness
curl -sIL -o /dev/null -w "%{http_code} %{url_effective}\n" \
  https://www.gracenotesdaily.com/library/devotional/$(date -u +%F)   # today's devotional live?
```

```sql
select date, title from daily_devotionals order by date desc limit 5;
select user_id, date from daily_grace_notes order by date desc limit 5;
select jobid, status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;
```

## Provenance and Maintenance

Written 2026-07-05. Every row sourced from CLAUDE.md §11 entries (2026-06-12 → 2026-07-05 PM6), commit `af598b7`, and code comments verified in the tree. Re-verify:

- Share fix intact: `grep -n "intentionally omit" src/components/devotional-view.tsx`
- Sanitizer applied in chat: `grep -n stripEmDashes src/hooks/use-daily-chat.ts`
- Read-only archive route: `grep -n notFound src/routes/library.devotional.\$date.tsx`
