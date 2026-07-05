## Context

We talked about this once (CLAUDE.md §11, 2026-06-22 entry): *"allow multiple HeartNotes/day (drop the `heart_notes (user_id,date)` unique, add `superseded_at`) so adding a new note pushes the prior one to Journey immediately."* It was scoped, never built. Today HeartNotes is strictly one-per-day: the `heart_notes` table has a `UNIQUE (user_id, date)` constraint, the page upserts on that key, and Journey only shows notes where `date < today` — so today's note never appears there.

## What we're building

A small, quiet action on the HeartNotes page (once a note has been submitted for today) that:

1. Marks the current note as archived (stamps `superseded_at = now()`).
2. Immediately shows it on the Journey page under Heart Notes, tagged and dated today.
3. Resets the HeartNotes page to the empty composer so the user can write a fresh note for the same day.
4. Leaves the streak/habit alone — journal habit stays complete for today (they already journaled).

No limit on how many notes per day. All prior notes for today live in Journey; the HeartNotes page always shows only the *current, active* one (or empty state).

## UI

On the submitted-note view in `src/routes/heart-notes.tsx`, add a subtle text-style button in the header row next to the delete icon:

```
[ + New note ]        (trash icon)
```

- Ghost/text style, `text-foreground/60 hover:text-grace`, small (`text-xs`), Lucide `Plus` icon at `w-3.5 h-3.5`.
- Sits inline with the existing Title / Edit / Delete controls — not a big CTA.
- On click: archive current → reset local state to the empty composer. No modal, no confirm (the note isn't lost, it's on Journey).

## Data model change

Migration on the live `tkoebo` project (the real backend, per CLAUDE.md):

```sql
ALTER TABLE public.heart_notes
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

-- Drop the one-per-day constraint (name TBD from pg_constraint; likely heart_notes_user_id_date_key)
ALTER TABLE public.heart_notes
  DROP CONSTRAINT IF EXISTS heart_notes_user_id_date_key;

-- Enforce: at most one ACTIVE note per (user, date)
CREATE UNIQUE INDEX IF NOT EXISTS heart_notes_active_per_day
  ON public.heart_notes (user_id, date)
  WHERE superseded_at IS NULL;

CREATE INDEX IF NOT EXISTS heart_notes_user_superseded
  ON public.heart_notes (user_id, superseded_at);
```

The partial unique index keeps "one active per day" (so today's editable note stays a single upsert target) while allowing unlimited archived rows per day.

## Code changes

**`src/routes/heart-notes.tsx`**
- Initial load: filter `.is("superseded_at", null)` when fetching today's note.
- Upsert: `onConflict` still `user_id,date` — works against the partial unique index for the active row.
- New `archiveAndReset()`: `UPDATE heart_notes SET superseded_at = now() WHERE id = rowId`, then clear `rowId / submitted / response / title / text` so the composer re-renders. Do **not** call `markComplete("journal")` again (already marked earlier today).
- Add the small "+ New note" button in the submitted-view header, next to the delete button.

**`src/routes/journey.tsx`**
- Change the heart-notes query (line 96-101) from `.lt("date", today)` to: include rows where `date < today` **OR** `superseded_at IS NOT NULL`. Simplest: fetch `date, superseded_at` and filter client-side, or use two queries `.or("date.lt." + today + ",superseded_at.not.is.null")`.
- Entry title/date still uses `date` — an archived note from today will show today's date, which is what we want.
- Order by `superseded_at desc nulls last, date desc, created_at desc` so today's most recently archived note appears first.

**`src/integrations/supabase/types.ts`**
- Add `superseded_at: string | null` to `heart_notes` Row/Insert/Update types (hand-maintained clone, per prior convention).

**`CLAUDE.md` §11**
- Log the change under a new dated entry; move the item off the "planned, not built" list.

## Not changing

- Habit auto-mark rule (§4): submitting *any* heart note marks the habit; archiving doesn't touch it.
- AI title/response generation flow.
- Journey card layout, expansion behavior, or edit/delete on archived notes (they still edit/delete the same way; delete removes the row entirely).
- Prayers, streak, badges, sidebar, or any other page.

## Verification

1. Apply migration, confirm partial unique index exists and old constraint is gone.
2. Write a note → submit → click "+ New note" → composer reappears empty.
3. Open Journey → the archived note shows under Heart Notes, dated today, with its title/body/AI reply.
4. Write another note same day → repeat; Journey now shows two entries for today.
5. Refresh HeartNotes page → only the current active (or empty state) shows.
6. Editing title on the active note still works; deleting the active note works and removes only that row.
