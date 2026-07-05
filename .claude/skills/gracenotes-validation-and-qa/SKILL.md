---
name: gracenotes-validation-and-qa
description: What counts as evidence that a GraceNotes Daily feature works - acceptance thresholds, validating share cards across platforms without a device lab, testing deep links, and verifying 301 redirects server-side. Load before declaring anything "done", before a release, or when writing acceptance criteria. Triggers: validate, QA, test, acceptance, evidence, verify, does it work, proof, redirect check, OG preview.
---

# GraceNotes Validation and QA

Core rule: **table state and HTTP responses are evidence; "the code looks right" is not.** This project's worst outage (devotional persistence silently broken for 13 days) happened because an upsert's error was never checked and nobody queried the table.

## When NOT to use this skill

- A failure already happened → `gracenotes-debugging-playbook`
- Measuring/telemetry mechanics → `gracenotes-diagnostics-and-tooling`
- Statistical/proof methods → `gracenotes-proof-and-analysis-toolkit`

## Minimum evidence by change type

| Change | Required evidence |
|---|---|
| App code | `npx tsc --noEmit` no new errors + manual route walk in `npm run dev` + (if data write) SELECT the row you wrote |
| Server fn | Call it and inspect the actual return; check worker logs for the error branch |
| Edge function | Deploy, invoke with curl, then verify TABLE STATE (e.g. `select count(*) from daily_grace_notes where date='...'`) — the HTTP 200 alone is not enough (job 1 outruns 5s HTTP timeouts and still succeeds) |
| DB migration | Run against live DB, then `select * from pg_policies where tablename='<new table>'` to prove RLS exists |
| Cron | Next-run check in `cron.job_run_details` AND table state |
| Prompt | Generate 3+ outputs; check em-dash absence (`grep '—'`), opening-tic bans, JSON shape |

## Verifying 301 redirects are server-side (no browser, no JS)

```bash
# Must print "HTTP/2 301" and a location header on the FIRST response:
curl -sI https://www.gracenotesdaily.com/devotional/2026-07-04 | grep -iE "^HTTP|^location"
curl -sI https://www.gracenotesdaily.com/devotional | grep -iE "^HTTP|^location"
# Follow the chain; final must be 200 at /library/devotional/...:
curl -sIL -o /dev/null -w "%{http_code} %{url_effective}\n" https://www.gracenotesdaily.com/devotional/2026-07-04
```

Expected: `301` → `location: /library/devotional/2026-07-04` → final `200`. If you see `200` on the first response with app HTML, the redirect has regressed to client-side; if `404`, that dated row doesn't exist (correct for unpublished dates). Because these 301s live in SSR `beforeLoad`, re-run this check after any SSR/router upgrade.

## Validating share cards without a device lab

1. **Golden-image test (primary).** For each template × size, render with a fixed payload and compare against an approved reference PNG with pixelmatch. Threshold: ≤1% differing pixels (antialiasing tolerance). See `gracenotes-proof-and-analysis-toolkit` for the harness.
2. **Dimensions + format.** `identify out.png` (ImageMagick) must report exactly 1080x1080 / 1080x1920 / 1200x628 / 1200x630.
3. **Font proof.** Render a payload containing "GraceNotes Daily 0123" and pixel-compare the wordmark region: if Fraunces failed to load, fallback serif renders measurably differently (>5% diff in that region).
4. **Overflow proof.** Render with maximum-length real payloads (longest grace note in `daily_grace_notes`, longest devotional title) — text must not clip. Make max-length fixtures part of the golden set.
5. **Platform scrape check (link previews).** OG tags, not the rendered card, control link previews:
   - Meta/WhatsApp: paste URL into developers.facebook.com/tools/debug/ and click "Scrape Again"
   - Twitter/X: cards-dev validator or just tweet-preview
   - iMessage: uses OG; verify og:image is reasonable size and < 1 MB
   - Devotional pages: og:image should be the per-date AI cover (`/api/public/devotional-cover/<date>.png`), falling back to `/og/daily-devotional.png` only when the cover is absent; crawlers cache aggressively - use "Scrape Again" after a cover change
   - Generic: `curl -s <url> | grep -oE '<meta[^>]*og:[^>]*>'`

## Deep link testing (when native lands)

| Check | Command / method | Pass |
|---|---|---|
| AASA served | `curl -s https://www.gracenotesdaily.com/.well-known/apple-app-site-association` | JSON, `content-type: application/json`, no redirect |
| assetlinks | `curl -s https://www.gracenotesdaily.com/.well-known/assetlinks.json` | JSON with the app's SHA-256 cert fingerprint |
| iOS resolution | Send link in iMessage to a device with the app → tap | Opens app at the devotional, not Safari |
| Android resolution | `adb shell am start -a android.intent.action.VIEW -d "https://www.gracenotesdaily.com/library/devotional/2026-07-04"` | App opens the devotional |
| No-app fallback | Same links on a device without the app | Web page renders (already true today) |

## Acceptance thresholds for the sharing system (Stage 5 of roadmap.md)

- All 16 golden-image tests pass at ≤1% pixel diff.
- `POST /render-share-card` p95 latency < 2.5 s at share-time (user is watching a spinner).
- 301 chain check passes.
- Attribution E2E: one scripted flow (create share → open link with `?s=` token → sign up) produces exactly one `share_events` row, ≥1 click row, one attributed signup — verified by SQL, not by dashboard eyeballing.

## Provenance and Maintenance

Written 2026-07-05. The persistence-outage story is from CLAUDE.md §11 (2026-07-05 PM4). Re-verify:

- Redirect check: the curl commands above (also the canary for SSR health)
- Still no test runner: `node -e "console.log(require('./package.json').scripts.test ?? 'none')"`
