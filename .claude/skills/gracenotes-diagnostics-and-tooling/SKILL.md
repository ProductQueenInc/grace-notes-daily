---
name: gracenotes-diagnostics-and-tooling
description: How to measure GraceNotes Daily instead of eyeballing it - logs, telemetry, verifying rendered share cards, confirming server-side redirects, and inspecting live DB state. Load when you need evidence about production behavior, when logs are needed, or before claiming something "works" or "is broken". Triggers: logs, telemetry, measure, inspect, observe, diagnostics, worker logs, edge function logs, verify rendering.
---

# GraceNotes Diagnostics and Tooling

## When NOT to use this skill

- Interpreting a known failure signature → `gracenotes-debugging-playbook`
- Formal proof methods / golden-image harness details → `gracenotes-proof-and-analysis-toolkit`

## Where the logs are

| Surface | How to read |
|---|---|
| Cloudflare Worker (SSR + server fns) | Lovable dashboard logs; loud markers exist for critical paths (devotional persist errors log explicitly since 2026-07-05 PM4) |
| Supabase Edge Functions | Supabase dashboard → Edge Functions → Logs, or MCP `get_logs(service: "edge-function")` |
| Postgres / cron | `select * from cron.job_run_details order by start_time desc limit 20;` — note: a FAILED status with a 5 s timeout can be a false failure (see playbook) |
| DB advisors (security/perf) | Supabase MCP `get_advisors` — run after every migration |
| Client | Browser console; the share path logs `[share] devotional url = <url>` before dispatch |

## Logging conventions

- Prefix client diagnostics with a bracketed tag: `[share]`, and keep them terse and greppable.
- Server writes must check and log `.error` — an unchecked write burned 13 days (archaeology #2).
- Edge functions: log per-user loop failures individually; never let one user's failure abort the batch silently.

## What telemetry exists today

**In-app analytics: none.** No PostHog/GA/Plausible in the app (verified `grep -rl posthog src` → nothing). External signals available today: Google Search Console (16/18 pages indexed as of 2026-06-29), Supabase table state (the de-facto usage log: `daily_habits`, `daily_messages`, `daily_grace_notes` timestamps), Tally feedback form. Decision 2026-07-05: PostHog (new GraceNotes project under the Product Queen org) + a Supabase `share_events` source-of-truth table — see the campaign skill for the event schema.

## Verify a share card rendered correctly (measured, not judged)

```bash
# dimensions + format
identify rendered/grace-note-1080x1080.png        # ImageMagick; expect PNG 1080x1080
# pixel diff vs approved golden reference (threshold ≤1%)
npx pixelmatch golden/grace-note-1080x1080.png rendered/grace-note-1080x1080.png diff.png 0.1
# file size sane for OG use (<1MB for 1200x630)
stat -f %z rendered/devotional-1200x630.png 2>/dev/null || stat -c %s rendered/devotional-1200x630.png
```

Golden-set discipline: goldens are re-approved ONLY when Canva ships a new template version; a code change that alters pixels beyond threshold is a regression by definition.

## Confirm a 301 resolves server-side

```bash
curl -sI https://www.gracenotesdaily.com/devotional/2026-07-04 | grep -iE "^HTTP|^location"
# expect: HTTP/2 301  +  location: .../library/devotional/2026-07-04  on the FIRST hop
```

`curl` does not execute JavaScript, so a 301 here is proof the redirect is served by the Worker (SSR `beforeLoad`), not client routing. Full validation matrix: `gracenotes-validation-and-qa`.

## Inspect live DB state (the ground truth)

```sql
select date, title, generated_at from daily_devotionals order by date desc limit 7;   -- devotional pipeline health
select count(*), max(date) from daily_grace_notes;                                    -- grace-note cron health
select count(*) from verses where is_active;                                          -- expect 123
select tablename, policyname from pg_policies where schemaname='public' order by 1;   -- RLS audit
```

## OG / link-preview scrapers

```bash
curl -s https://www.gracenotesdaily.com/library/devotional/2026-07-04 | grep -oE '<meta[^>]*(og:|twitter:)[^>]*>' | head
```

Then: Facebook Sharing Debugger ("Scrape Again" busts Meta's cache — REQUIRED after changing og:image), Twitter card preview, a real iMessage send. Remember: link previews come from OG tags; rendered share cards are separate artifacts.

## Provenance and Maintenance

Written 2026-07-05. Re-verify:

- Share log convention: `grep -rn '\[share\]' src/components`
- Still no in-app analytics: `grep -ril "posthog\|plausible\|gtag" src || echo "none"`
- RLS audit query above after every migration
