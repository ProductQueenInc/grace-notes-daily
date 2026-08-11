// supabase/functions/classify-heart-note-theme/index.ts
//
// Fires automatically after a heart_note's `summary` is set (see migration:
// 20260714120835_heart_notes_classify_theme_trigger.sql, re-timed by
// 20260811120000_fix_theme_classification.sql). Reads the note's summary,
// classifies it into 1-3 GENERALIZED themes from a fixed vocabulary, and
// updates profiles.inferred_themes.
//
// NOTE (2026-08-11): this file previously existed only as a live Supabase
// deployment, not in the repo -- brought back in sync while fixing two real
// bugs found this session:
//   1. The DB trigger fired on INSERT, before heart-notes.tsx's separate
//      UPDATE ever set `summary` -- so this function always saw
//      summary = null and skipped, every single time. Fixed at the trigger
//      level (see migration above), not in this file.
//   2. profiles.inferred_themes defaults to '[]'::jsonb (a JSON array), but
//      this function always treated it as an object map. Merging a tag into
//      an array in JS sets a non-index property that JSON.stringify silently
//      drops on the way back to Postgres -- so even a successful
//      classification for a brand-new profile would have failed to persist.
//      Fixed below with an explicit array/non-object guard before merging.
//
// PRIVACY DESIGN: this function never stores raw journal content or anything
// specific. The classifier is hard-constrained to a fixed list of broad
// emotional/spiritual states (the same posture_tags vocabulary already
// curated for verse matching). A disclosure like "abuse" or "PTSD" can only
// ever be stored as something like "grief" or "fear" -- the specific term
// never enters the database, by construction, not just by instruction.
//
// ANALYTICS: uses the existing public.posthog_capture() Postgres function
// (same one share_events already relies on), so no new secret is needed --
// it already reads the posthog_project_api_key from the vault.
//
// See also: supabase/functions/generate-daily-grace-notes/index.ts, which
// runs the SAME kind of classification (same THEME_VOCAB, same storage
// shape) once nightly per user against that day's daily chat -- the primary
// source of themes as of 2026-08-11. This function remains the Heart Notes
// (journal) source, wired to the DB trigger above instead of the nightly cron.

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Closed vocabulary. Same list already curated on verses.posture_tags, reused
// deliberately so inferred_themes stays compatible with verse selection later.
// Keep this list identical to the copy in generate-daily-grace-notes/index.ts.
const THEME_VOCAB = [
  'abundance', 'anxiety', 'belonging', 'burnout', 'comfort', 'contentment', 'courage',
  'disconnection', 'doubt', 'exhaustion', 'expansion', 'faith', 'fear', 'gratitude',
  'grief', 'growth', 'hope', 'joy', 'loneliness', 'longing', 'new-beginnings',
  'opposition', 'overwhelm', 'presence', 'purpose', 'renewal', 'returning',
  'self-doubt', 'shame', 'uncertainty', 'unworthiness', 'waiting', 'worry', 'worth',
] as const

// Storage shape of profiles.inferred_themes: Record<tag, {weight, last_seen}>.
// Must match the ThemeMap type in generate-daily-grace-notes/index.ts and the
// StoredThemeMap type in src/lib/profile-themes.functions.ts.
type ThemeMap = Record<string, { weight: number; last_seen: string }>

function parseJSON<T>(raw: string, fallback: T): T {
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    return match ? (JSON.parse(match[0]) as T) : fallback
  } catch {
    return fallback
  }
}

// Guards against the column's stale '[]'::jsonb default (or any other
// non-object value) before merging -- see bug 2 above.
function asThemeMap(raw: unknown): ThemeMap {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as ThemeMap
  }
  return {}
}

async function classifyThemes(summary: string, aiResponse: string): Promise<string[]> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 100,
    temperature: 0.2,
    system: `You classify a private journal entry into general emotional/spiritual themes. You must ONLY output tags from this fixed list, nothing else:
${THEME_VOCAB.join(', ')}

Rules:
- Choose 1 to 3 tags that best capture the emotional/spiritual weather of the entry.
- Always generalize. A disclosure of a specific trauma, diagnosis, or crisis (abuse, PTSD, addiction, a specific illness, self-harm, etc.) must map to the nearest general tag (e.g. "grief", "fear", "exhaustion", "shame") -- never output anything outside the fixed list, and never output anything that names or hints at the specific situation.
- If nothing meaningfully applies, return an empty array.

Respond with valid JSON only, no markdown: { "themes": ["tag1", "tag2"] }`,
    messages: [{ role: 'user', content: `Summary: ${summary}\n\nResponse given: ${aiResponse}` }],
  })
  const block = msg.content[0] as { type: string; text?: string }
  const raw = block.type === 'text' ? block.text ?? '' : ''
  const parsed = parseJSON<{ themes?: string[] }>(raw, { themes: [] })
  return (parsed.themes ?? []).filter((t) => (THEME_VOCAB as readonly string[]).includes(t)).slice(0, 3)
}

Deno.serve(async (req) => {
  const { heart_note_id, user_id } = await req.json().catch(() => ({}))
  if (!heart_note_id || !user_id) {
    return new Response('Missing heart_note_id or user_id', { status: 400 })
  }

  const { data: note } = await supabase
    .from('heart_notes')
    .select('summary, ai_response')
    .eq('id', heart_note_id)
    .single()

  // No summary yet (e.g. summarization hasn't run) -- skip quietly, nothing to classify.
  if (!note?.summary) {
    return new Response(JSON.stringify({ skipped: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  const themes = await classifyThemes(note.summary, note.ai_response ?? '')
  if (!themes.length) {
    return new Response(JSON.stringify({ themes: [] }), { headers: { 'Content-Type': 'application/json' } })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('inferred_themes')
    .eq('id', user_id)
    .single()

  const existing: ThemeMap = asThemeMap(profile?.inferred_themes)
  const now = new Date().toISOString()
  for (const tag of themes) {
    const prior = existing[tag]?.weight ?? 0
    // Reinforcement caps at 1.0 -- repeated mentions raise confidence, don't
    // let it run away. Decay (fading over time) happens at read-time, in the
    // grace-note generator, not here.
    existing[tag] = { weight: Math.min(1, prior + 0.5), last_seen: now }
  }

  await supabase.from('profiles').update({ inferred_themes: existing }).eq('id', user_id)

  // Reuses the existing posthog_capture() Postgres function -- same one
  // share_events already relies on. No new secret needed.
  await supabase.rpc('posthog_capture', {
    p_event: 'theme_inferred',
    p_distinct: user_id,
    p_props: { themes, source: 'heart_note' },
  })

  return new Response(JSON.stringify({ themes }), { headers: { 'Content-Type': 'application/json' } })
})
