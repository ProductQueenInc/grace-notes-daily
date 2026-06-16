## Goal
Let users edit the auto-generated title and delete any Heart Note, on both the Heart Notes page (today's entry) and the Journey page (past entries). Confirm the midnight-local rollover behaviour is correct.

## What already works (no changes needed)
- `heart_notes.summary` column exists and stores an AI-generated title.
- Journey loads only entries with `date < today (local)`, so yesterday's note automatically appears there after local midnight — today's stays on the Heart Notes page.
- `summarizeHeartNote` already runs lazily on Journey for older notes missing a summary.

## Changes

### 1. Heart Notes page (`src/routes/heart-notes.tsx`)
After a note is submitted (or loaded for today), show the auto-generated title above "Your note" with:
- An inline edit affordance (pencil icon → small input + Save / Cancel).
- A delete button (with a confirm dialog) that removes the row and resets the page to the empty composer so the user can write a new one for today.
- On first submit, also kick off `summarizeHeartNote(text)` and persist it to `heart_notes.summary` so today's title is ready immediately (and matches what Journey will show tomorrow).
- Load the existing `summary` alongside `body` / `ai_response` in the today-fetch query.

### 2. Journey page (`src/routes/journey.tsx`)
For Heart Note entries only (prayers are out of scope for this request):
- When a row is expanded, show an inline "Edit title" action (pencil → input + Save / Cancel) that updates `heart_notes.summary` and patches local state.
- Show a "Delete" action (with confirm) that removes the row from `heart_notes` and from local state. After delete, if the current page becomes empty, step back a page.
- Keep prayers read-only here (the user only asked about Heart Notes).

### 3. Shared bits
- Use the existing `AlertDialog` shadcn component for delete confirmation (no new deps).
- Use existing `supabase` client; RLS policy `heart_notes_self` already allows owner update/delete.
- No schema migration needed.

## Out of scope
- Auto-refresh at midnight without reload (date filtering already handles it on next load; full live rollover would need a timer — not requested).
- Editing/deleting prayers on Journey.
- Title editing on the Heart Notes page before the AI summary returns (we'll show a small "Generating title…" state, then reveal the editable title).

## Files touched
- `src/routes/heart-notes.tsx`
- `src/routes/journey.tsx`
