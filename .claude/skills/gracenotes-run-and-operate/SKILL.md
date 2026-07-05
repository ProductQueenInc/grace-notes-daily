---
name: gracenotes-run-and-operate
description: Running GraceNotes Daily locally and in production - deployment paths, how the library and devotional pages are served, cron operations, edge function deploys, and where things land. Load for deploy, publish, production, hosting, cron, edge function operations, DNS, or "why isn't my change live". Triggers: deploy, publish, production, operate, cron, hosting, serve, live site.
---

# GraceNotes Run and Operate

## When NOT to use this skill

- Setting up the environment / build errors → `gracenotes-build-and-env`
- Diagnosing a production failure → `gracenotes-debugging-playbook` first
- Reading logs/telemetry → `gracenotes-diagnostics-and-tooling`

## The four deploy paths (memorize this table)

| What changed | How it goes live | Latency |
|---|---|---|
| App code (`src/`, `public/`) | Cindy clicks **Publish in Lovable**. NOT `wrangler deploy`. Pushing to GitHub alone does nothing to prod. | Human-gated |
| Edge function (`supabase/functions/*`) | `supabase functions deploy <name>` or Supabase MCP `deploy_edge_function` | Immediate |
| Database (schema, RLS, cron) | Applied directly to live DB (SQL editor / MCP `apply_migration`) + committed migration file | Immediate — production surgery |
| Docs/skills | git push (no runtime effect) | n/a |

Corollary: **git main, the deployed Worker, and deployed edge functions are three separate states.** "It's in the repo" proves nothing about production.

## How public pages are served

- Everything renders through the TanStack Start SSR handler on one Cloudflare Worker (`wrangler.jsonc`, `main: src/server.ts`), fronted by `www.gracenotesdaily.com`.
- Public no-auth pages: `/`, `/library`, `/library/<slug>`, `/library/devotional`, `/library/devotional/YYYY-MM-DD`, SEO landing pages, blog.
- `/library/devotional/$date` is **read-only**: serves the stored `daily_devotionals` row or 404s (`notFound()`). It never generates content — generation happens only in the cron and the "today" paths. Don't "fix" the 404 into on-demand generation; that hole was deliberately closed (2026-07-05 PM5).
- Legacy `/devotional[/$date]` 301s to the library equivalents via SSR (details in `gracenotes-architecture-contract`).
- `/api/public/devotional-cover/YYYY-MM-DD.png` - public no-auth proxy serving cover PNGs from the private `devotional-covers` bucket with immutable cache headers.
- `robots.txt` disallows all authenticated app routes and the three legacy article redirect paths.

## Cron operations (pg_cron in the live DB)

| Job | Function | Schedule | Notes |
|---|---|---|---|
| 1 `generate-daily-grace-notes` | per onboarded user, one Claude call each | `0 1 * * *` (01:00 UTC) | `net.http_post` timeout raised to 30000 ms; loops all users |
| 3 `generate-daily-devotional` | one shared devotional for tomorrow-UTC + its AI cover image (cover failure non-fatal) | `0 9 * * *` (09:00 UTC) | idempotent; accepts `{ date }` override and `{"backfill":true,"limit":N}` to fill missing covers on existing rows |

Both read the Bearer token from `vault.decrypted_secrets` (`email_queue_service_role_key`) and the URL from vault `SUPABASE_URL`. Both confirmed working 2026-07-05 PM6.

Operational commands (Supabase SQL editor or MCP `execute_sql`):

```sql
select jobid, jobname, schedule, active from cron.job;
select jobid, status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;
-- regenerate a devotional: delete the row, then invoke the fn or wait for cron
delete from daily_devotionals where date = 'YYYY-MM-DD';
```

Manual invoke (service-role bearer):

```bash
curl -X POST "https://tkoebogweygaabndrsvl.supabase.co/functions/v1/generate-daily-devotional" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" \
  -d '{"date":"YYYY-MM-DD"}'
```

Devotional review workflow: visit `/library/devotional/YYYY-MM-DD` the evening before (cron generates day-ahead). To regenerate, delete the row and re-invoke.

## Auth model (relevant to personalized rendering)

Supabase auth: email/password + Google OAuth (`/auth/callback`). Client: `src/lib/supabase.ts`. JWT-derived `user_id` is the identity everywhere server-side — `chat-reply` validates the JWT in-handler and never trusts user_id from the body. Any share-card render endpoint MUST follow the same pattern for personalized content (grace note, streak).

## Provenance and Maintenance

Written 2026-07-05, verified against live DB (cron jobs, vault secrets) and wrangler.jsonc. Re-verify:

- Publish path still Lovable: check CLAUDE.md "Deployment" section; `ls .github/workflows 2>/dev/null || echo "no CI/CD yet"`
- Cron health: the `cron.job_run_details` query above
- Read-only archive route: `grep -n "notFound" src/routes/library.devotional.\$date.tsx`
- Live redirect: `curl -sI https://www.gracenotesdaily.com/devotional/2026-07-04 | head -3`
