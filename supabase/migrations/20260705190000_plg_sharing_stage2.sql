-- PLG sharing Stage 2 (roadmap.md): share_events, share_clicks, attribution, private buckets.
-- Applied to the live DB 2026-07-05 via MCP (migration name: plg_sharing_stage2).
-- user_id is NULLABLE (deviation from the campaign skill draft SQL): the devotional share
-- endpoint accepts anon callers per the contract skill section 4.

insert into storage.buckets (id, name, public)
values ('share-assets','share-assets', false), ('share-cards','share-cards', false)
on conflict (id) do nothing;

create table if not exists public.share_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  template_id text not null check (template_id in ('grace-note','devotional','answered-prayer','streak-calendar')),
  size text not null check (size in ('1080x1080','1080x1920','1200x628','1200x630')),
  share_token text not null unique,
  share_url text not null,
  image_url text not null,
  caption text,
  created_at timestamptz not null default now()
);
create index if not exists share_events_user_template_idx on public.share_events (user_id, template_id);

create table if not exists public.share_clicks (
  id uuid primary key default gen_random_uuid(),
  share_token text not null references public.share_events(share_token) on delete cascade,
  clicked_at timestamptz not null default now(),
  user_agent text,
  referrer text
);
create index if not exists share_clicks_token_idx on public.share_clicks (share_token);

alter table public.profiles add column if not exists attributed_share_token text;

alter table public.share_events enable row level security;
alter table public.share_clicks enable row level security;

drop policy if exists "share_events_select_own" on public.share_events;
create policy "share_events_select_own" on public.share_events
  for select to authenticated using (user_id = auth.uid());
-- inserts are service-role only (render endpoint); no insert policy on purpose.
-- share_clicks is server-write/server-read only; no policies on purpose.

revoke all on public.share_events from anon;
grant select on public.share_events to authenticated;
revoke all on public.share_clicks from anon, authenticated;

create or replace function public.claim_share_attribution(p_token text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare v_exists boolean;
begin
  if auth.uid() is null then return false; end if;
  select exists(select 1 from share_events where share_token = p_token) into v_exists;
  if not v_exists then return false; end if;
  update profiles set attributed_share_token = p_token
   where id = auth.uid() and attributed_share_token is null;
  return found;
end $$;

revoke all on function public.claim_share_attribution(text) from public;
grant execute on function public.claim_share_attribution(text) to authenticated;
