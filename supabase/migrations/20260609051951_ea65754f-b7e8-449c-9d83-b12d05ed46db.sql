-- Lock SECURITY DEFINER functions to service_role only
REVOKE EXECUTE ON FUNCTION public.select_verse_for_user(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_session_message_count(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_verse_for_user(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_session_message_count(UUID) TO service_role;

-- chat_flags is service-role-only by design; add an explicit deny policy so the
-- linter sees an intentional policy on the table.
DROP POLICY IF EXISTS "Block all client access to chat_flags" ON public.chat_flags;
CREATE POLICY "Block all client access to chat_flags"
  ON public.chat_flags FOR SELECT TO anon, authenticated USING (false);