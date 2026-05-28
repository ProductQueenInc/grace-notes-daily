-- GraceNotes Daily — Wipe all test data for a clean slate
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- WARNING: This deletes ALL users and ALL their data permanently.
-- Only run this during testing. Never run on a live audience.

-- 1. Clear all user-content tables (cascade handles FKs automatically,
--    but explicit order avoids any constraint surprises).
delete from public.thanksgivings;
delete from public.prayers;
delete from public.heart_notes;
delete from public.daily_messages;
delete from public.daily_habits;
delete from public.daily_content;
delete from public.profiles;

-- 2. Delete all auth users (this also triggers the cascade above via FK,
--    but we already cleared the tables above to be safe).
delete from auth.users;

-- After running this you can sign up fresh and test the full new-user flow.
-- Supabase's on_auth_user_created trigger will create a new profile row
-- the moment a new account is created.
