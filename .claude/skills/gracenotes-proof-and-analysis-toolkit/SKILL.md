---
name: gracenotes-proof-and-analysis-toolkit
description: First-principles proof methods for GraceNotes Daily - proving share cards render correctly without a device lab (golden-image harness), validating PLG attribution accuracy (double-entry reconciliation), and computing loop metrics honestly. Load when you must PROVE correctness rather than assert it, build the render test harness, or analyze growth data. Triggers: prove, golden image, pixel diff, attribution accuracy, k-factor, reconciliation, measurement methodology, analysis.
---

# GraceNotes Proof and Analysis Toolkit

Principle (paid for in this repo's history): an unchecked write is not a write, a scheduled cron is not a running cron, and a rendered-looking card is not a correct card. Prove, don't vibe.

## When NOT to use this skill

- Day-to-day evidence thresholds → `gracenotes-validation-and-qa`
- Reading logs → `gracenotes-diagnostics-and-tooling`

## 1. Proving a share card renders correctly (no device lab)

Golden-image harness (Node script, lives in `scripts/` when built):

```bash
npm i -D pixelmatch pngjs
```

```js
// scripts/verify-share-cards.mjs (sketch — build at campaign Phase 3)
import { PNG } from "pngjs"; import pixelmatch from "pixelmatch"; import fs from "node:fs";
const CASES = /* 16 template×size pairs × fixtures: {typical, max-length} */;
for (const c of CASES) {
  const got = PNG.sync.read(await render(c));          // POST render-share-card, fetch image_url
  const want = PNG.sync.read(fs.readFileSync(`goldens/${c.name}.png`));
  if (got.width !== want.width || got.height !== want.height) fail(c, "dimensions");
  const n = pixelmatch(want.data, got.data, null, got.width, got.height, { threshold: 0.1 });
  const pct = n / (got.width * got.height);
  console.log(c.name, (pct*100).toFixed(3) + "%", pct <= 0.01 ? "PASS" : "FAIL");
}
```

Method rules:

- **Fixtures are real extremes:** longest `daily_grace_notes.message` in the DB, longest devotional title, `streak_count` of 1 and of 365, a 35-day calendar of all-gold. Overflow bugs live at the extremes.
- **Font-failure probe:** one fixture renders the string "GraceNotes Daily 0123" in the display slot; compare ONLY that region against a Fraunces golden. A serif fallback diverges >5% in-region — this catches silent font-loading failures that whole-image thresholds can absorb.
- **Goldens are approved artifacts:** regenerated only on an approved Canva template rev (contract amendment), stored in-repo under `goldens/`, named exactly like the exports.
- Threshold ≤1% differing pixels absorbs antialiasing noise; dimension mismatch is an instant fail regardless.

Why this proves cross-platform correctness: platforms don't re-render PNGs — they scale them. Pixel-correct at exact target dimensions + the platform-preview scrape checks (validation skill) = full coverage without a device wall. The one true device test that still matters: one real iMessage send (Apple's preview crop behavior), per release of the card system.

## 2. Proving attribution is accurate (double-entry reconciliation)

Attribution lies by omission (blocked scripts, stripped params, cached pages). Keep TWO independent ledgers and reconcile:

- Ledger A: Supabase `share_events` / `share_clicks` / `profiles.attributed_share_token` (server-side, ad-block-proof).
- Ledger B: PostHog events (`share_card_created`, `share_link_opened`, `signup_attributed`).

Weekly reconciliation query (expect B ≤ A; alarm if B < 0.7×A — measurement broken; alarm if B > A — double counting):

```sql
select date_trunc('week', created_at) wk, count(*) shares from share_events group by 1 order by 1 desc limit 4;
-- compare against PostHog insight for share_card_created, same weeks
```

Synthetic truth test (run after any attribution change): script one known journey (create share → open with `?s=` in a fresh session → sign up) and assert exactly 1 share_event, ≥1 click, 1 attributed profile BY SQL. If the synthetic journey miscounts, all organic numbers are fiction.

Known honesty caps (state them in any report): Instagram organic posts carry no link → image-only shares are invisible to click attribution (report card-created vs link-opened separately); iMessage previews prefetch URLs → filter obvious prefetch user-agents from `share_clicks` before computing conversion.

## 3. Loop metrics, computed honestly

- k-factor = (shares per active user per period) × (recipient→signup conversion). Compute from Ledger A only. Report with denominators, never bare percentages ("3 of 41 sharers" not "7.3%").
- Small-sample rule: with <100 events per cell, report counts and ranges, not rates. Faith-app sharing is bursty (Sundays, crises, holidays) — compare week-over-week, never day-over-day.
- Cohort honestly: a share's conversions credit the WEEK THE SHARE HAPPENED (activity cohort), else growing share volume masks falling conversion.

## 4. Worked examples from this repo (the method applied)

- **Cron "works" claim (2026-07-05 PM6):** HTTP said timeout-failure; table state said success (8/8 rows). Resolution: the table is the ledger of record; the HTTP result was a transport artifact. Method: always pick the ledger closest to the business fact.
- **Divergence proof (2026-07-05 PM):** two devices' differing devotionals proved a race no unit test caught; the proof was a SELECT showing one row while both devices displayed content ≠ that row. Method: reproduce state divergence by comparing independent observers against the shared store.
- **Stale-key proof (PM6):** decoded the vault JWT's CLAIMS (without exposing the signature) to prove the key was the right TYPE but stale — separating "wrong kind of key" from "expired key" changed the fix. Method: decompose credentials before rotating blindly.

## Provenance and Maintenance

Written 2026-07-05. Worked examples from CLAUDE.md §11. The harness sketch is DESIGN (to be built at campaign Phase 3), not yet in the repo — verify with `ls scripts/verify-share-cards.mjs goldens 2>/dev/null || echo "not built yet"`. Reconciliation queries become runnable once Phase 5 schema exists (`select count(*) from share_events;`).
