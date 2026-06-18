DROP INDEX IF EXISTS public.heart_notes_user_date;
CREATE UNIQUE INDEX heart_notes_user_date_unique ON public.heart_notes (user_id, date);