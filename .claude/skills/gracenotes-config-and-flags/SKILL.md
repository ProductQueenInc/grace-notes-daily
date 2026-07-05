---
name: gracenotes-config-and-flags
description: Every configuration axis of GraceNotes Daily - env vars, Supabase secrets, vault secrets, Cloudflare secrets, cron schedules, localStorage keys - plus how to add one safely. Load when adding/rotating a secret, changing a schedule, hunting a config-driven behavior, or asking "where is X configured". Triggers: config, env var, secret, flag, setting, schedule, rotate key, localStorage.
---

# GraceNotes Config and Flags

## When NOT to use this skill

- Deploy mechanics → `gracenotes-run-and-operate`
- Env setup from scratch → `gracenotes-build-and-env`

## Configuration axes (verified 2026-07-05)

### 1. Client-visible env (`.env`, bundled into the app — NEVER secrets)

| Var | Used by |
|---|---|
| `VITE_SUPABASE_URL` | client + server fallbacks (note: also hard-coded in `src/lib/supabase.ts` and `auth-tkoebo.server.ts` — the hard-code wins for the client) |
| `VITE_SUPABASE_ANON_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase client |

### 2. Server-side env (Cloudflare Worker secrets / local `.env` for dev)

| Var | Used by |
|---|---|
| `ANTHROPIC_API_KEY` | AI server fns (`ai.functions.ts`) |
| `OPENAI_API_KEY` | present in env; reserved |
| `SUPABASE_SERVICE_ROLE_KEY` | admin client (server-only) |
| `LOVABLE_API_KEY`, `LOVABLE_SEND_URL` | email infra (`src/routes/lovable/email/*`); `LOVABLE_API_KEY` also auths the Lovable AI Gateway (`ai.gateway.lovable.dev`) for devotional cover image generation (`src/lib/devotional-cover.server.ts`) - missing key = covers silently skipped (logged warn) |
| `GOOGLE_CLIENT_ID` | RISC receiver (`wrangler secret put GOOGLE_CLIENT_ID`) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | one-time `scripts/register-risc.ts` |

Rule: read `process.env.X` inside `.handler()` only, never at module scope (Workers).

### 3. Supabase Edge Function secrets (`Deno.env.get`)

`ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Set via Supabase dashboard → Edge Functions → Secrets.

### 4. Postgres vault (`vault.decrypted_secrets`) — cron auth

| Secret | Value | Consumer |
|---|---|---|
| `SUPABASE_URL` | project URL (public value, stored for cron convenience) | jobs 1 + 3 |
| `email_queue_service_role_key` | service_role JWT (id `fd60d577-...`) | jobs 1 + 3 AND the email queue |

Rotation runbook (this exact sequence failed twice before it worked — see archaeology #4):

```sql
-- 1. Get a FRESH service_role key from Supabase → Project Settings → API.
select vault.update_secret('fd60d577-ea86-4394-888e-a0a320a630cb', '<new key>');
-- 2. Prove it: invoke each function via the same net.http_post the cron uses, then
select status, return_message from cron.job_run_details order by start_time desc limit 4;
-- 3. Verify TABLE STATE (rows for tomorrow's date), not just HTTP 200.
```

### 5. pg_cron schedule config

Job 1 `generate-daily-grace-notes` `0 1 * * *` (+ `timeout_milliseconds := 30000`); job 3 `generate-daily-devotional` `0 9 * * *`. Change via `cron.alter_job(jobid, schedule => '...')`. Constraint: job 3 must complete before the earliest timezone (UTC+14) reaches local midnight — do not move it later than ~09:30 UTC.

### 6. localStorage keys (client persistence)

| Key | Meaning |
|---|---|
| `gn:sidebar:pinned` | sidebar pin preference |
| `gn:habits:<YYYY-MM-DD>` | per-date habit fallback when DB unavailable |

Custom events: `gn:habits-change` with detail `{ date, state }` (date-scoped — listeners must filter).

### 7. Feature flags

**None exist.** There is no flag system, no experimental/production split. State this plainly rather than inventing one. Decision 2026-07-05: analytics goes to PostHog — when instrumentation lands, PostHog feature flags become the sanctioned flag mechanism. Until then, "flagging" a risky change means: build it dark (unlinked route / unused endpoint), validate, then wire it up in a separate commit.

## Adding a new config value safely (checklist)

1. Classify: client-visible (VITE_) vs server secret vs edge-fn secret vs vault.
2. Add to the right store; NEVER commit secret values.
3. Read it at handler scope (Workers) or via `Deno.env.get` (Deno).
4. Document it in the table above (this file) + CLAUDE.md if load-bearing.
5. Add a re-verification one-liner to this file's Provenance section.
6. If cron consumes it: prove with a manual invoke + `job_run_details` + table state.

## Provenance and Maintenance

Written 2026-07-05 from `grep -rhoE "(process\.env|Deno\.env\.get)..."` across `src`, `supabase/functions`, `scripts`, plus live vault/cron state. Re-verify:

- Env surface: `grep -rhoE "process\.env\.[A-Z_]+" src scripts | sort -u`
- Edge env surface: `grep -rhoE "Deno\.env\.get\('[A-Z_]+'\)" supabase/functions | sort -u`
- Vault secrets exist: `select name from vault.secrets;`
- Still no flags: `grep -ril "feature.flag" src || echo "still none"`
