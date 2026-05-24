-- GraceNotes Daily — Tracks (Listen)
-- Paste the entire file into: Supabase Dashboard → SQL Editor → New Query → Run

create table if not exists public.tracks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  speaker     text,
  theme       text not null check (theme in ('worship','devotional','reflection','prayer','scripture')),
  youtube_id  text,
  audio_url   text,
  thumb       text,
  sort_order  int  not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.tracks enable row level security;

drop policy if exists "tracks_read" on public.tracks;
create policy "tracks_read" on public.tracks for select
  using (auth.role() = 'authenticated');

insert into public.tracks (title, speaker, theme, youtube_id, sort_order) values
  ('Goodness of God', 'Bethel Music', 'worship', 'n4Vu1jwQHvA', 1),
  ('Soaking Worship', 'Various', 'worship', 'cu0vsTbCT6c', 2),
  ('What A Beautiful Name', 'Hillsong', 'worship', 'nQWFzMvCfLE', 3),
  ('Daily Devotional', 'GraceNotes', 'devotional', null, 4),
  ('Way Maker', 'Leeland', 'worship', '29IxnsqOkmQ', 5),
  ('Quiet Reflection', 'GraceNotes', 'reflection', null, 6)
on conflict do nothing;
