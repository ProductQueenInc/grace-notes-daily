-- GraceNotes Daily — Theme classification fixes (2026-08-11)
--
-- Three problems found while investigating "my daily chats aren't saving
-- themes":
--
-- 1. heart_notes_classify_theme fired on INSERT, but heart-notes.tsx always
--    inserts the row BEFORE the AI-generated `summary` exists (summary is
--    added by a separate UPDATE moments later). So the classifier always ran
--    against summary = null and quietly skipped every single time.
-- 2. profiles.inferred_themes defaults to '[]'::jsonb (a JSON ARRAY), but
--    every classifier treats the column as an OBJECT map of
--    { [tag]: {weight, last_seen} }. Merging a new tag into an array value
--    in JS (`arr['grief'] = {...}`) sets a non-index property that
--    JSON.stringify silently drops, so even a successful classification
--    would have failed to persist for any brand-new profile.
-- 3. Daily chat (`daily_messages` / `chat_sessions`) was never wired into
--    theme classification at all -- only the separate Heart Notes journal
--    feature was. See supabase/functions/generate-daily-grace-notes for the
--    new nightly step that fixes this (application-level, no schema change
--    needed for that part beyond the new chat_sessions.summary column below).

-- ── Fix 1: re-time the heart_notes trigger ──────────────────────────────────
-- Split into two triggers instead of one AFTER INSERT trigger, matching how
-- the row is actually written: insert first (no summary yet), then a
-- separate update sets `summary`. Also covers the edit-title path
-- (heart-notes.tsx `saveTitle`), which re-fires classification on rename.
drop trigger if exists heart_notes_classify_theme on public.heart_notes;

create trigger heart_notes_classify_theme_on_insert
  after insert on public.heart_notes
  for each row
  when (new.summary is not null)
  execute function public.trigger_classify_heart_note_theme();

create trigger heart_notes_classify_theme_on_summary
  after update of summary on public.heart_notes
  for each row
  when (new.summary is not null and (old.summary is distinct from new.summary))
  execute function public.trigger_classify_heart_note_theme();

-- ── Fix 2: correct the column's default/shape to an object, not an array ───
alter table public.profiles
  alter column inferred_themes set default '{}'::jsonb;

update public.profiles
  set inferred_themes = '{}'::jsonb
  where inferred_themes = '[]'::jsonb;

-- ── Fix 3 (schema half): storage for the daily-chat summary ────────────────
-- Mirrors heart_notes.summary. Populated by the new nightly classification
-- step in generate-daily-grace-notes/index.ts, purely so a day's chat summary
-- is inspectable later (debugging/support) -- not shown in any UI today.
alter table public.chat_sessions
  add column if not exists summary text;
