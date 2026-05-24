-- ── PROFILES ──
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text,
  faith_phase   text check (faith_phase in ('newbie','returnee','growth','elder')),
  onboarded     boolean not null default false,
  rhythms       text[]  not null default '{}',
  seasons       jsonb   not null default '[]',
  voice         text    check (voice in ('gentle','grounding')),
  timezone      text,
  translation   text    check (translation in ('ESV','NIV','NKJV','KJV','MSG')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles_self" on public.profiles;
create policy "profiles_self" on public.profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row
  execute procedure public.handle_new_user();

-- Backfill profile rows for users who already signed up
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- ── DAILY HABITS ──
create table if not exists public.daily_habits (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  date          date not null,
  devotional    boolean not null default false,
  daily_message boolean not null default false,
  journal       boolean not null default false,
  primary key (user_id, date)
);
alter table public.daily_habits enable row level security;
drop policy if exists "habits_self" on public.daily_habits;
create policy "habits_self" on public.daily_habits for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── DAILY MESSAGES ──
create table if not exists public.daily_messages (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date    date not null,
  role    text not null check (role in ('user','assistant')),
  text    text not null,
  ts      timestamptz not null default now()
);
create index if not exists daily_messages_user_date on public.daily_messages (user_id, date);
alter table public.daily_messages enable row level security;
drop policy if exists "messages_self" on public.daily_messages;
create policy "messages_self" on public.daily_messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── HEART NOTES ──
create table if not exists public.heart_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  ai_response text,
  date        date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists heart_notes_user_date on public.heart_notes (user_id, date);
alter table public.heart_notes enable row level security;
drop policy if exists "heart_notes_self" on public.heart_notes;
create policy "heart_notes_self" on public.heart_notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── PRAYERS ──
create table if not exists public.prayers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  answered    boolean not null default false,
  answered_at timestamptz,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists prayers_user_active on public.prayers (user_id) where deleted_at is null;
alter table public.prayers enable row level security;
drop policy if exists "prayers_self" on public.prayers;
create policy "prayers_self" on public.prayers for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── THANKSGIVINGS ──
create table if not exists public.thanksgivings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  prayer_id  uuid not null references public.prayers(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);
alter table public.thanksgivings enable row level security;
drop policy if exists "thanksgivings_self" on public.thanksgivings;
create policy "thanksgivings_self" on public.thanksgivings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── DAILY CONTENT CACHE ──
create table if not exists public.daily_content (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  date         date not null,
  grace_note   jsonb,
  devotional   jsonb,
  generated_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.daily_content enable row level security;
drop policy if exists "daily_content_self" on public.daily_content;
create policy "daily_content_self" on public.daily_content for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── LISTEN CONTENT ──
create table if not exists public.listen_content (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  theme        text,
  type         text check (type in ('video','audio','music')),
  url          text not null,
  thumbnail    text,
  duration     text,
  description  text,
  published_at timestamptz not null default now()
);
alter table public.listen_content enable row level security;
drop policy if exists "listen_read" on public.listen_content;
create policy "listen_read" on public.listen_content for select
  using (auth.role() = 'authenticated');

-- ── BACKGROUND IMAGES ──
create table if not exists public.background_images (
  id          uuid primary key default gen_random_uuid(),
  filename    text not null,
  series      text not null check (series in ('sunrise','ocean','night-sky','vegetation','weather')),
  storage_url text not null,
  created_at  timestamptz not null default now()
);
alter table public.background_images enable row level security;
drop policy if exists "background_read" on public.background_images;
create policy "background_read" on public.background_images for select
  using (auth.role() = 'authenticated');