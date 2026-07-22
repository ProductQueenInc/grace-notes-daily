create or replace function public.trigger_classify_heart_note_theme()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_URL') || '/functions/v1/classify-heart-note-theme',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'email_queue_service_role_key')
    ),
    body := jsonb_build_object('heart_note_id', new.id, 'user_id', new.user_id),
    timeout_milliseconds := 15000
  );
  return new;
end;
$$;

drop trigger if exists heart_notes_classify_theme on public.heart_notes;

create trigger heart_notes_classify_theme
  after insert on public.heart_notes
  for each row
  execute function public.trigger_classify_heart_note_theme();
