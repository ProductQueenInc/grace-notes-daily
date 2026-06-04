
CREATE POLICY "email_assets_service_role_insert" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'email-assets' AND auth.role() = 'service_role');
CREATE POLICY "email_assets_service_role_update" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'email-assets' AND auth.role() = 'service_role') WITH CHECK (bucket_id = 'email-assets' AND auth.role() = 'service_role');
CREATE POLICY "email_assets_service_role_delete" ON storage.objects FOR DELETE TO public USING (bucket_id = 'email-assets' AND auth.role() = 'service_role');
CREATE POLICY "email_assets_public_read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'email-assets');
