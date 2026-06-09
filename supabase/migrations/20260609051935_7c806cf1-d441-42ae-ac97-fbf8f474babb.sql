-- ── Add country code to profiles ────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_code CHAR(2);

-- ── Verse library ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.verses (
  id            INTEGER PRIMARY KEY,
  theme         TEXT NOT NULL,
  reference     TEXT NOT NULL,
  text          TEXT NOT NULL,
  posture_tags  TEXT[] NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.verses TO authenticated;
GRANT ALL ON public.verses TO service_role;
ALTER TABLE public.verses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users read verses" ON public.verses;
CREATE POLICY "Authenticated users read verses"
  ON public.verses FOR SELECT TO authenticated USING (true);

-- ── Crisis lines ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crisis_lines (
  country_code  CHAR(2) PRIMARY KEY,
  country_name  TEXT NOT NULL,
  line_name     TEXT NOT NULL,
  phone         TEXT,
  text_option   TEXT,
  website       TEXT,
  hours         TEXT
);
GRANT SELECT ON public.crisis_lines TO authenticated;
GRANT ALL ON public.crisis_lines TO service_role;
ALTER TABLE public.crisis_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users read crisis lines" ON public.crisis_lines;
CREATE POLICY "Authenticated users read crisis lines"
  ON public.crisis_lines FOR SELECT TO authenticated USING (true);

-- ── User verse log (60-day rotation tracking) ───────────────────────
CREATE TABLE IF NOT EXISTS public.user_verse_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verse_id   INTEGER NOT NULL REFERENCES public.verses(id),
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_verse_log_user_sent
  ON public.user_verse_log (user_id, sent_at DESC);
GRANT SELECT ON public.user_verse_log TO authenticated;
GRANT ALL ON public.user_verse_log TO service_role;
ALTER TABLE public.user_verse_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own verse log" ON public.user_verse_log;
CREATE POLICY "Users read own verse log"
  ON public.user_verse_log FOR SELECT USING (auth.uid() = user_id);

-- ── Pre-generated grace notes ───────────────────────────────────────
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
GRANT SELECT ON public.daily_grace_notes TO authenticated;
GRANT ALL ON public.daily_grace_notes TO service_role;
ALTER TABLE public.daily_grace_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own grace notes" ON public.daily_grace_notes;
CREATE POLICY "Users read own grace notes"
  ON public.daily_grace_notes FOR SELECT USING (auth.uid() = user_id);

-- ── Chat sessions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  status         TEXT NOT NULL DEFAULT 'active',
  message_count  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.chat_sessions TO authenticated;
GRANT ALL ON public.chat_sessions TO service_role;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users read own chat sessions"
  ON public.chat_sessions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users create own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users create own chat sessions"
  ON public.chat_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ── Safety event log (append-only) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_flags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id    UUID REFERENCES public.chat_sessions(id),
  flag_type     TEXT NOT NULL,
  triggered_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.chat_flags TO service_role;
ALTER TABLE public.chat_flags ENABLE ROW LEVEL SECURITY;
-- No SELECT policy: only service_role reads this table.

-- ── Verse selection function (60-day rotation, 3-pass fallback) ─────
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
SET search_path = public
AS $$
DECLARE
  rotation_days CONSTANT INTEGER := 60;
BEGIN
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
GRANT EXECUTE ON FUNCTION public.select_verse_for_user(UUID, TEXT, TEXT) TO service_role;

-- ── Atomic message count increment ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_session_message_count(p_session_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.chat_sessions SET message_count = message_count + 1 WHERE id = p_session_id;
$$;
GRANT EXECUTE ON FUNCTION public.increment_session_message_count(UUID) TO service_role, authenticated;