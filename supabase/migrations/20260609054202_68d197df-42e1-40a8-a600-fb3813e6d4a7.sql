
-- chat_sessions: deny UPDATE/DELETE from regular roles (service_role bypasses RLS)
CREATE POLICY "chat_sessions_no_client_update" ON public.chat_sessions
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "chat_sessions_no_client_delete" ON public.chat_sessions
  AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

-- daily_grace_notes: writes are service-role only
CREATE POLICY "daily_grace_notes_no_client_insert" ON public.daily_grace_notes
  AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "daily_grace_notes_no_client_update" ON public.daily_grace_notes
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "daily_grace_notes_no_client_delete" ON public.daily_grace_notes
  AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

-- user_verse_log: writes are service-role only
CREATE POLICY "user_verse_log_no_client_insert" ON public.user_verse_log
  AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "user_verse_log_no_client_update" ON public.user_verse_log
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "user_verse_log_no_client_delete" ON public.user_verse_log
  AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

-- Storage: lock down listing of email-assets bucket.
-- Public URLs (storage/v1/object/public/...) still resolve because they bypass RLS.
DROP POLICY IF EXISTS email_assets_public_read ON storage.objects;
CREATE POLICY "email_assets_service_role_select" ON storage.objects
  FOR SELECT TO service_role USING (bucket_id = 'email-assets');
