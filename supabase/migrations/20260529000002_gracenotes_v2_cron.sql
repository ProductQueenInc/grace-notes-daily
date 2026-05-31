-- GraceNotes Daily — Cron Job (Step 5B)
-- Run AFTER deploying the generate-daily-grace-notes edge function.
-- Requires pg_cron and pg_net extensions enabled in Supabase Dashboard
-- (Database → Extensions → search "pg_cron" and "pg_net").

-- Enable extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule overnight grace note generation at 1:00 AM UTC daily
SELECT cron.schedule(
  'generate-daily-grace-notes',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/generate-daily-grace-notes',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  $$
);
