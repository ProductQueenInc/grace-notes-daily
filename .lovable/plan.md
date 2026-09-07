# Replace the daily affirmation batch

## Current state
- The affirmation list lives in `src/lib/promises.ts` as the `PROMISES` string array.
- It is rendered in two places:
  - `src/routes/home.tsx` (~line 337) — the line under the devotional card on the home screen.
  - `src/components/devotional-view.tsx` (~line 220) — the quote above the "GraceNotes Daily" sign-off on public/devotional pages.
- The rotation is deterministic per local calendar day via `pickDailyPromise(date?)`, so the same user sees the same line all day.

## What we will do
1. Replace the `PROMISES` array in `src/lib/promises.ts` with your new batch.
2. Keep the existing `pickDailyPromise` signature and rotation logic so users still see one line per day.
3. Verify both render locations pick up the new copy automatically.
4. Run `bun run build:dev` to confirm no type errors, then publish.

## Need from you
- The new list of affirmations (any length; the rotation logic handles any count).
- Confirm whether you want the same line on both the home screen and public devotional pages, or if the public page should use something different.
