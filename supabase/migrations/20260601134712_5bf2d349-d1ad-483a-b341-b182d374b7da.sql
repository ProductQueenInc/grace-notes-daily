-- 1) Restrict listing on public email-assets bucket.
-- Direct public URLs (/object/public/email-assets/...) still work because
-- they bypass RLS; this only blocks anonymous LIST via the API.
DROP POLICY IF EXISTS "Public read email-assets" ON storage.objects;

CREATE POLICY "Authenticated read email-assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'email-assets');

-- 2) Pin search_path on SECURITY DEFINER functions to prevent search_path hijacking.
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pg_temp;