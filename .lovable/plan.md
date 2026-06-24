## Why both cards spin forever

`getOrCreateGraceNote` and `getOrCreateDevotional` now require a row from the `verses` table before they'll call the AI, and throw `"no active verse available to ground from the verses table"` if the table is empty. Live DB confirms `verses` is empty (0 rows, 0 active). Result: every call fails.

- Grace note card eventually flips to its error state after retries, but…
- Devotional card on `/home` never renders an error branch — `{devotionalPreview ? … : "Loading..."}` — so it sits on "Loading…" indefinitely once the query errors out.
- The cron edge function (`generate-daily-grace-notes`) has the same dependency, so the overnight populate of `daily_grace_notes` is also failing silently.

## Fix plan

### 1. Seed the `verses` table (root cause, one-time data fix)

- Run a one-shot SQL migration that inserts the curated NIV verse library from `gracenotes_verse_library.json` (the same data the unused `scripts/seed_verses.js` would have inserted) into `public.verses`, marked `is_active = true`, with the existing `theme` / `posture_tag` / `segment_tag` columns populated so `select_verse_for_user` returns rows for every (posture, segment).
- Idempotent: `ON CONFLICT (reference) DO NOTHING` (or equivalent unique key) so re-runs are safe.
- Verify after apply: `select count(*) from verses where is_active` > 0, and `select * from select_verse_for_user(<test_uid>, 'hope', 'newbie')` returns a row.
- Honours the NIV-licensing notes already in CLAUDE.md — we're not adding new wording, just loading the existing curated set.

### 2. Surface server-fn errors instead of "Loading…" forever (defensive UI fix)

- In `src/routes/home.tsx`, change the devotional `useQuery` to expose `isError` / `refetch` and render a small "couldn't load today's devotional — try again" branch with a retry button, mirroring the grace-note card's existing pattern.
- Keep the existing happy path untouched.
- This prevents future regressions of the same shape (any AI-side or DB-side failure) from looking like a perpetual loader.

### 3. Verify the fix end-to-end

- After seeding, reload `/home` in the preview and confirm both cards populate.
- Tail server-fn logs and `audit_log` for one `success` row each from `getOrCreateGraceNote` and `getOrCreateDevotional`. (Note: `audit_log` table is currently missing — `logAudit` writes are fire-and-forget so this doesn't block anything, but worth flagging as a follow-up.)
- Confirm `select_verse_for_user` doesn't return the same verse twice in a row for the same user (rotation works).

### 4. Update CLAUDE.md

- Move "verses library… unseeded" out of "Not started" and into §11 with today's date.
- Add a sentence to §5 making the verse-table dependency explicit: "Both generators will throw if `verses` has no active rows — keep the table seeded."

### Out of scope (do not touch in this fix)

- AI prompt wording, the `select_verse_for_user` RPC, the cron schedule, RLS, or any other table. The bug is purely a missing data load + an unhandled error state.
- The earlier name-capitalization plan — that's a separate UI improvement and will be re-proposed on its own.

### Technical notes

- The seed will run as a Supabase migration (preferred over the standalone Node script, which isn't wired to anything). Generates one INSERT statement chunked across the ~123 verses already documented in CLAUDE.md.
- No code changes to `ai.functions.ts` or the cron edge function are required — the fallback path (`any active verse`) will start working the moment the table has rows, and the primary `select_verse_for_user` path will too.
- Devotional UI change is ~10 lines in `home.tsx`, no new components.
