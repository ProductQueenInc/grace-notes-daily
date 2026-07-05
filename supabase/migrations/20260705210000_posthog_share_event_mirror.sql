-- PostHog mirror for PLG share events (roadmap Stage 3). Applied live 2026-07-05.
-- Trigger-based: fires from the source-of-truth tables regardless of code path.
-- Events: share_card_created, share_link_opened, signup_attributed.
-- Reads the project API key from vault secret 'posthog_project_api_key';
-- if the vault secret is absent, capture is a silent no-op (safe order of ops).
-- Host hardcoded to the US ingestion endpoint (project lives in us.posthog.com).

create or replace function public.posthog_capture(p_event text, p_distinct text, p_props jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_key text;
begin
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'posthog_project_api_key';
  if v_key is null then return; end if;
  perform net.http_post(
    url := 'https://us.i.posthog.com/capture/',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'api_key', v_key,
      'event', p_event,
      'distinct_id', p_distinct,
      'properties', p_props
    ),
    timeout_milliseconds := 3000
  );
exception when others then
  null; -- analytics must never break the write path
end $$;

revoke all on function public.posthog_capture(text, text, jsonb) from public, anon, authenticated;

create or replace function public.trg_share_event_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform posthog_capture(
    'share_card_created',
    coalesce(new.user_id::text, 'anon'),
    jsonb_build_object('template_id', new.template_id, 'size', new.size, 'share_token', new.share_token)
  );
  return new;
end $$;

create or replace function public.trg_share_click_logged()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform posthog_capture(
    'share_link_opened',
    'click:' || new.share_token,
    jsonb_build_object('share_token', new.share_token, 'user_agent', new.user_agent, 'referrer', new.referrer)
  );
  return new;
end $$;

create or replace function public.trg_signup_attributed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.attributed_share_token is not null and old.attributed_share_token is null then
    perform posthog_capture(
      'signup_attributed',
      new.id::text,
      jsonb_build_object('share_token', new.attributed_share_token)
    );
  end if;
  return new;
end $$;

drop trigger if exists share_events_posthog on public.share_events;
create trigger share_events_posthog after insert on public.share_events
  for each row execute function public.trg_share_event_created();

drop trigger if exists share_clicks_posthog on public.share_clicks;
create trigger share_clicks_posthog after insert on public.share_clicks
  for each row execute function public.trg_share_click_logged();

drop trigger if exists profiles_attribution_posthog on public.profiles;
create trigger profiles_attribution_posthog after update of attributed_share_token on public.profiles
  for each row execute function public.trg_signup_attributed();
