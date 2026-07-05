ALTER TABLE public.heart_notes ADD COLUMN IF NOT EXISTS superseded_at timestamptz;
DROP INDEX IF EXISTS public.heart_notes_user_date_unique;
CREATE UNIQUE INDEX IF NOT EXISTS heart_notes_active_per_day ON public.heart_notes (user_id, date) WHERE superseded_at IS NULL;
CREATE INDEX IF NOT EXISTS heart_notes_user_superseded ON public.heart_notes (user_id, superseded_at);