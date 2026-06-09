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
  audio_url   text,   -- storage path e.g. "morning-worship/still-waters.mp3" (NOT a signed URL)
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

-- Storage: authenticated users can read objects in listen-audio bucket
-- (signed URLs are generated server-side with the service role key, so this
--  policy is a belt-and-suspenders guard for direct storage API calls)
insert into storage.buckets (id, name, public)
  values ('listen-audio', 'listen-audio', false)
  on conflict (id) do nothing;

drop policy if exists "listen_audio_read" on storage.objects;
create policy "listen_audio_read" on storage.objects for select
  using (bucket_id = 'listen-audio' and auth.role() = 'authenticated');

-- ── Seed rows ────────────────────────────────────────────────────────────────
-- Replace / add rows once Suno MP3s are uploaded to storage.
-- Audio track format: audio_url = '<folder>/<filename>.mp3' (no leading slash)
-- Video track format: set youtube_id, leave audio_url null.
--
-- Example audio row (uncomment and fill in after upload):
-- insert into public.tracks (title, speaker, theme, categories, type, audio_url, thumb, sort_order)
-- values ('Still Waters', 'GraceNotes', 'worship', ARRAY['Worship'], 'audio', 'morning-worship/still-waters.mp3', 'https://...', 10)
-- on conflict do nothing;

-- Existing video tracks (keep until replaced)
insert into public.tracks (title, speaker, theme, categories, type, youtube_id, sort_order) values
  ('Goodness of God',      'Bethel Music', 'worship',    ARRAY['Praise','Worship'], 'video', 'n4Vu1jwQHvA', 1),
  ('Soaking Worship',      'Various',      'worship',    ARRAY['Worship'],          'video', 'cu0vsTbCT6c', 2),
  ('What A Beautiful Name','Hillsong',     'worship',    ARRAY['Praise','Worship'], 'video', 'nQWFzMvCfLE', 3),
  ('Way Maker',            'Leeland',      'worship',    ARRAY['Praise','Worship'], 'video', '29IxnsqOkmQ', 5)
on conflict do nothing;
