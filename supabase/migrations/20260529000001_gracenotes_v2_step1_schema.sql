-- GraceNotes Daily — v2 Schema (Steps 1 + 3)
-- Paste into: Supabase Dashboard → SQL Editor → New Query → Run

-- ── STEP 1A: Add country code to profiles ────────────────────────────────────
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS country_code CHAR(2);

-- ── STEP 1B: Verse library ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.verses (
  id            INTEGER PRIMARY KEY,
  theme         TEXT NOT NULL,
  reference     TEXT NOT NULL,
  text          TEXT NOT NULL,
  posture_tags  TEXT[] NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── STEP 1C: Crisis lines ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crisis_lines (
  country_code  CHAR(2) PRIMARY KEY,
  country_name  TEXT NOT NULL,
  line_name     TEXT NOT NULL,
  phone         TEXT,
  text_option   TEXT,
  website       TEXT,
  hours         TEXT
);

-- ── STEP 1D: User verse log (rotation tracking) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_verse_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verse_id   INTEGER NOT NULL REFERENCES public.verses(id),
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_verse_log_user_sent
  ON public.user_verse_log (user_id, sent_at DESC);

-- ── STEP 1E: Pre-generated grace notes ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_grace_notes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  grace_note       TEXT NOT NULL,
  verse_id         INTEGER NOT NULL REFERENCES public.verses(id),
  verse_text       TEXT NOT NULL,
  verse_reference  TEXT NOT NULL,
  theme            TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- ── STEP 1F: Chat sessions ────────────────────────────────────────────────────
-- No UNIQUE on (user_id, date) — users can start fresh multiple times per day
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  status         TEXT NOT NULL DEFAULT 'active',
  message_count  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  -- status values: 'active', 'closed_inappropriate', 'closed_crisis'
);

-- ── STEP 1G: Safety event log (append-only, no message content) ──────────────
CREATE TABLE IF NOT EXISTS public.chat_flags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id    UUID REFERENCES public.chat_sessions(id),
  flag_type     TEXT NOT NULL,
  triggered_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  -- flag_type values: 'crisis', 'inappropriate', 'mild'
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_verse_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_grace_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crisis_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own verse log"
  ON public.user_verse_log FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users read own grace notes"
  ON public.daily_grace_notes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users read own chat sessions"
  ON public.chat_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users read verses"
  ON public.verses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users read crisis lines"
  ON public.crisis_lines FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role full access"
  ON public.user_verse_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access grace notes"
  ON public.daily_grace_notes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access sessions"
  ON public.chat_sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access flags"
  ON public.chat_flags FOR ALL USING (auth.role() = 'service_role');

-- ── STEP 3: Verse selection function ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.select_verse_for_user(
  p_user_id  UUID,
  p_posture  TEXT,
  p_segment  TEXT
)
RETURNS TABLE (
  verse_id    INTEGER,
  reference   TEXT,
  verse_text  TEXT,
  theme       TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rotation_days CONSTANT INTEGER := 60;
BEGIN
  -- Pass 1: verse matching posture, not seen within rotation window
  RETURN QUERY
  SELECT v.id, v.reference, v.text, v.theme
  FROM public.verses v
  WHERE v.is_active = true
    AND p_posture = ANY(v.posture_tags)
    AND v.id NOT IN (
      SELECT uvl.verse_id FROM public.user_verse_log uvl
      WHERE uvl.user_id = p_user_id
        AND uvl.sent_at > now() - (rotation_days || ' days')::interval
    )
  ORDER BY random()
  LIMIT 1;

  -- Pass 2: any verse not seen within rotation window
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT v.id, v.reference, v.text, v.theme
    FROM public.verses v
    WHERE v.is_active = true
      AND v.id NOT IN (
        SELECT uvl.verse_id FROM public.user_verse_log uvl
        WHERE uvl.user_id = p_user_id
          AND uvl.sent_at > now() - (rotation_days || ' days')::interval
      )
    ORDER BY random()
    LIMIT 1;
  END IF;

  -- Pass 3: rotation fully exhausted — pick from posture with no restriction
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT v.id, v.reference, v.text, v.theme
    FROM public.verses v
    WHERE v.is_active = true
      AND p_posture = ANY(v.posture_tags)
    ORDER BY random()
    LIMIT 1;
  END IF;
END;
$$;

-- ── Helper: atomic message count increment ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_session_message_count(p_session_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.chat_sessions SET message_count = message_count + 1 WHERE id = p_session_id;
$$;
