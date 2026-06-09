-- GraceNotes Daily — Tracks (Listen)
-- NOTE: The live DB already has this table with the v2 schema (categories, type columns).
-- This file is the reference / re-run-safe version. Run in Supabase SQL Editor if rebuilding.

create table if not exists public.tracks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  speaker     text,
  theme       text not null default 'worship' check (theme in ('worship','devotional','reflection','prayer','scripture')),
  categories  text[] not null default '{}',
  type        text not null default 'video' check (type in ('video','audio')),
  youtube_id  text,
  audio_url   text,   -- storage path e.g. "Worship/Amani Yako.mp3" (NOT a signed URL)
  thumb       text,
  sort_order  int  not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.tracks enable row level security;

drop policy if exists "tracks_read" on public.tracks;
create policy "tracks_read" on public.tracks for select
  using (auth.role() = 'authenticated');

grant select on public.tracks to authenticated;

-- Storage bucket + RLS
insert into storage.buckets (id, name, public)
  values ('listen-audio', 'listen-audio', false)
  on conflict (id) do nothing;

drop policy if exists "listen_audio_read" on storage.objects;
create policy "listen_audio_read" on storage.objects for select
  using (bucket_id = 'listen-audio' and auth.role() = 'authenticated');

-- ── Seed: 9 original GraceNotes Daily audio tracks ───────────────────────────
-- audio_url = storage path inside the listen-audio bucket (no leading slash).
-- Signed URLs are generated at play-time by getSignedAudioUrl() server fn.

truncate public.tracks restart identity cascade;

insert into public.tracks (title, speaker, theme, categories, type, audio_url, thumb, sort_order) values
  -- Worship
  ('Amani Yako',           'GraceNotes Daily', 'worship', ARRAY['Worship'], 'audio', 'Worship/Amani Yako.mp3',           'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=600', 1),
  ('Beautiful Gravity',    'GraceNotes Daily', 'worship', ARRAY['Worship'], 'audio', 'Worship/Beautiful Gravity.mp3',    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600', 2),
  ('Kumama (Be Glorified)','GraceNotes Daily', 'worship', ARRAY['Worship'], 'audio', 'Worship/Kumama (Be Glorified).mp3','https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600', 3),
  ('Uko Hapa Bwana',       'GraceNotes Daily', 'worship', ARRAY['Worship'], 'audio', 'Worship/Uko Hapa Bwana.mp3',       'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600', 4),
  ('Unhurried Grace',      'GraceNotes Daily', 'worship', ARRAY['Worship'], 'audio', 'Worship/Unhurried Grace.mp3',      'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=600', 5),
  ('Unpayed Grace',        'GraceNotes Daily', 'worship', ARRAY['Worship'], 'audio', 'Worship/Unpayed Grace.mp3',        'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=600', 6),
  -- Praise
  ('Holy Ground Rumble',   'GraceNotes Daily', 'worship', ARRAY['Praise'],  'audio', 'Praise/Holy Ground Rumble.mp3',   'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600', 7),
  ('Onye Oma',             'GraceNotes Daily', 'worship', ARRAY['Praise'],  'audio', 'Praise/Onye Oma.mp3',             'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=600', 8),
  ('Siyabonga Baba',       'GraceNotes Daily', 'worship', ARRAY['Praise'],  'audio', 'Praise/Siyabonga Baba.mp3',       'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=600', 9);
