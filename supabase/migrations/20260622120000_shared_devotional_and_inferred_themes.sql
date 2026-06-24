-- 2026-06-22 — Foundation for the shared daily devotional + personalised grace notes.
-- See CLAUDE.md (2026-06-22 changelog) and the design spec for the full plan.
--
-- This migration is additive and safe to re-run.

-- ── Shared daily devotional (same for everyone, keyed by date) ───────────────
create table if not exists public.daily_devotionals (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  theme text not null,
  verse_id integer references public.verses(id),
  verse_text text,
  verse_reference text,
  title text,
  body jsonb,            -- array of paragraph strings
  related jsonb,         -- array of { ref, text }
  takeaway text,
  generated_at timestamptz not null default now()
);

alter table public.daily_devotionals enable row level security;

-- Shared devotional is public content: readable by everyone (supports the
-- in-app read AND the public /devotional/<date> share page). Only the
-- service role (cron) writes it, so no insert/update/delete policies exist.
drop policy if exists "daily_devotionals readable by all" on public.daily_devotionals;
create policy "daily_devotionals readable by all"
  on public.daily_devotionals for select
  to anon, authenticated
  using (true);

grant select on public.daily_devotionals to anon, authenticated;

-- ── Inferred themes for personalised grace notes ─────────────────────────────
-- Populated nightly from the user's recent daily chat; injected into the
-- grace-note prompt the same way the old onboarding "seasons" value was.
alter table public.profiles
  add column if not exists inferred_themes jsonb not null default '[]'::jsonb;

-- ── Seed: Grief & Comfort verse pool (Wednesday slot in the weekday rotation) ─
-- Text is NIV (2011), matching the rest of the library. The app standardises on
-- the NIV; the attribution notice lives on the Settings page. IDs computed from
-- max(id) to avoid collisions and to match how the existing library was seeded.
with base as (select coalesce(max(id), 0) as m from public.verses)
insert into public.verses (id, reference, text, theme, posture_tags, is_active)
select base.m + v.rn, v.reference, v.text, 'Grief & Comfort', array['grief','comfort']::text[], true
from base,
(values
  (1, 'Psalm 34:18', 'The LORD is close to the brokenhearted and saves those who are crushed in spirit.'),
  (2, 'Matthew 5:4', 'Blessed are those who mourn, for they will be comforted.'),
  (3, 'Psalm 147:3', 'He heals the brokenhearted and binds up their wounds.'),
  (4, 'Revelation 21:4', 'He will wipe every tear from their eyes. There will be no more death or mourning or crying or pain, for the old order of things has passed away.'),
  (5, 'Psalm 23:4', 'Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me.'),
  (6, 'Isaiah 41:10', 'So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.'),
  (7, 'John 14:27', 'Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.'),
  (8, 'Psalm 30:5', 'Weeping may stay for the night, but rejoicing comes in the morning.')
) as v(rn, reference, text)
where not exists (
  select 1 from public.verses x where x.theme = 'Grief & Comfort'
);
