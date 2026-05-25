
create table public.system_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  severity text not null default 'info' check (severity in ('info','success','warning','critical')),
  link_url text,
  link_label text,
  active boolean not null default true,
  publish_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.system_announcements enable row level security;

create policy "announcements_read_authenticated"
on public.system_announcements for select
to authenticated
using (
  active = true
  and publish_at <= now()
  and (expires_at is null or expires_at > now())
);

create table public.announcement_dismissals (
  user_id uuid not null,
  announcement_id uuid not null references public.system_announcements(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, announcement_id)
);

alter table public.announcement_dismissals enable row level security;

create policy "dismissals_self"
on public.announcement_dismissals for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index on public.system_announcements (active, publish_at desc) where active = true;
