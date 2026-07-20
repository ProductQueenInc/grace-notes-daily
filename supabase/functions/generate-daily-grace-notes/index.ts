// supabase/functions/generate-daily-grace-notes/index.ts
// Overnight cron — pre-generates grace notes for every onboarded user.
// Scheduled by pg_cron at 1:00 AM UTC daily.
//
// PROMPT POLICY: this file uses the SAME prompt text as the on-demand
// fallback in `src/lib/ai.functions.ts` (the `generateGraceNoteRaw` function).
// If you change one, change the other. The on-demand path is the canonical
// source — copy from there.
//
// UPDATED: adds two new, OPTIONAL inputs on top of the existing faith_phase
// and seasons -- inferred_themes (generalized signal from heart notes, fades
// over time) and streak_context (steady / returning, derived from daily_habits).
// Both follow the exact same pattern as the existing seasonLine(): if there's
// nothing meaningful to say, they contribute an empty string and cost nothing
// extra. faith_phase itself is untouched -- still 100% user-declared, never
// auto-changed by this function.
//
// UPDATED AGAIN (2026-07-20): the note library had converged on one dominant
// sentence shape ("Not because X... it is Y"), because that shape happened to
// dominate the EXAMPLES below and the model leaned on it. Fixed by: (1)
// replacing the examples with five deliberately different shapes, (2) an
// explicit rule banning the negation construction, (3) shape rotation --
// each note records which shape it used (see `shape` column on
// daily_grace_notes) and the prompt is told which shapes this person's last
// few notes used so it picks something different, and (4) a duplicate safety
// net that compares a freshly generated note against this person's recent
// notes and asks the model to try again (up to 2 retries) if it's too close.

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function phaseDesc(phase: string | null): string {
  const map: Record<string, string> = {
    newbie: 'just beginning to explore faith',
    returnee: 'returning to God after time away',
    growth: 'actively deepening their relationship with God',
    elder: 'mature in faith and living it daily',
  }
  return map[phase ?? ''] ?? 'growing in faith'
}

function seasonLine(seasons: string[]): string {
  if (!seasons?.length) return ''
  return `\nBackground context (may be old, may no longer apply today): ${seasons.join(', ')}. Let this gently shape what you notice. Never name the season back. Never assume it's still true today.`
}

// ─── inferred_themes ────────────────────────────────────────────────────────
// Generalized, weighted, decaying signal derived automatically from heart
// notes (see classify-heart-note-theme). Decay is computed here at read-time
// rather than stored, so there's no separate cleanup job to maintain.
type ThemeMap = Record<string, { weight: number; last_seen: string }>

function decayedThemes(themes: ThemeMap | null): string[] {
  if (!themes) return []
  const now = Date.now()
  const HALF_LIFE_DAYS = 30
  const THRESHOLD = 0.25
  return Object.entries(themes)
    .map(([tag, v]) => {
      const daysSince = (now - new Date(v.last_seen).getTime()) / 86_400_000
      const effective = v.weight * Math.pow(0.5, daysSince / HALF_LIFE_DAYS)
      return { tag, effective }
    })
    .filter((t) => t.effective >= THRESHOLD)
    .sort((a, b) => b.effective - a.effective)
    .slice(0, 2)
    .map((t) => t.tag)
}

function inferredThemesLine(themes: ThemeMap | null): string {
  const top = decayedThemes(themes)
  if (!top.length) return ''
  return `\nEmerging context (inferred, generalized, may shift): ${top.join(', ')}. Let this gently shape tone only. Never name it back. Never assume it explains everything today.`
}

// ─── streak_context ─────────────────────────────────────────────────────────
// Pure date-math against daily_habits, no AI involved. Only the two states
// that actually change tone get a line; a normal/new user gets nothing extra
// because faith_phase tone already covers that case.
type StreakContext = 'steady' | 'returning' | 'neutral'

function streakContextLine(ctx: StreakContext): string {
  if (ctx === 'steady') {
    return '\nTone note: this person has kept a steady daily rhythm with this practice. Let warmth and companionship come through naturally. Do not comment on consistency, effort, or streaks directly.'
  }
  if (ctx === 'returning') {
    return '\nTone note: this person is returning after some time away. Keep the tone low-barrier and welcoming. Do not reference the gap or assume continuity.'
  }
  return ''
}

async function getStreakContext(userId: string): Promise<StreakContext> {
  const { data: habits } = await supabase
    .from('daily_habits')
    .select('date, daily_message')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(30)

  if (!habits?.length) return 'neutral'

  // Steady: 14+ consecutive days with daily_message = true, most recent first.
  let consecutive = 0
  for (const h of habits) {
    if (h.daily_message) consecutive++
    else break
  }
  if (consecutive >= 14) return 'steady'

  // Returning: most recent daily_message = true entry is more than 5 days old.
  const lastActive = habits.find((h) => h.daily_message)
  if (lastActive) {
    const daysSince = (Date.now() - new Date(lastActive.date).getTime()) / 86_400_000
    if (daysSince > 5) return 'returning'
  }

  return 'neutral'
}

// ─── shape rotation ──────────────────────────────────────────────────────────
// A small, fixed vocabulary of sentence shapes. The model self-reports which
// one it used each time (stored in daily_grace_notes.shape); we feed the last
// few back in so the same shape doesn't repeat note after note.
const SHAPES = ['declaration', 'image', 'question', 'invitation', 'promise'] as const
type Shape = (typeof SHAPES)[number]

function isShape(s: unknown): s is Shape {
  return typeof s === 'string' && (SHAPES as readonly string[]).includes(s)
}

function recentShapesLine(recentShapes: string[]): string {
  if (!recentShapes.length) return ''
  const remaining = SHAPES.filter((s) => !recentShapes.includes(s))
  const pickFrom = remaining.length ? remaining : SHAPES
  return `\nShape rotation: the last note(s) sent to this person used, most recent first: ${recentShapes.join(', ')}. Do not use that shape again today. Choose from: ${pickFrom.join(', ')}.`
}

async function getRecentShapes(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('daily_grace_notes')
    .select('shape')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(3)
  return (data ?? []).map((r) => r.shape).filter((s): s is string => !!s)
}

async function getRecentNoteTexts(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('daily_grace_notes')
    .select('grace_note')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(20)
  return (data ?? []).map((r) => r.grace_note).filter((s): s is string => !!s)
}

// ─── duplicate safety net ────────────────────────────────────────────────────
function normalizeForCompare(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
}

function firstWords(s: string, n: number): string {
  return normalizeForCompare(s).split(/\s+/).slice(0, n).join(' ')
}

function isTooSimilar(candidate: string, recent: string[]): boolean {
  const candNorm = normalizeForCompare(candidate)
  const candPrefix = firstWords(candidate, 6)
  for (const r of recent) {
    if (!r) continue
    if (candNorm === normalizeForCompare(r)) return true
    if (candPrefix && candPrefix === firstWords(r, 6)) return true
  }
  return false
}

function avoidNoteLine(avoid: string | null): string {
  if (!avoid) return ''
  return `\nYour last attempt for this note was too close to something this person already received recently: "${avoid}" Write something that arrives at the same truth through clearly different words and a different shape.`
}

// Maps faith phase to a posture_tag used by select_verse_for_user. Mirrors the
// on-demand path in src/lib/ai.functions.ts.
function postureFromPhase(phase: string): string {
  const map: Record<string, string> = {
    newbie: 'hope',
    returnee: 'hope',
    growth: 'purpose',
    elder: 'faith',
  }
  return map[phase] ?? 'hope'
}

function stripEmDashes(s: string | null | undefined): string {
  if (!s) return ''
  return s.replace(/\s*[—–]\s*/g, ' - ')
}

function parseJSON<T>(raw: string, fallback: T): T {
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    return match ? (JSON.parse(match[0]) as T) : fallback
  } catch {
    return fallback
  }
}

type GraceNote = { message: string; verse: string; signed: string; shape: string | null }

const NO_EM_DASH_RULE =
  'STYLE RULE: Never use em-dashes (—) or en-dashes (–). Use a hyphen (-), comma, semicolon, or colon instead.'

const DEFAULT_MESSAGE =
  "You are seen today. Not for what you did or didn't do - just seen.\n\nWalk gently. The work in front of you is held, even the small parts."

// ─── Canonical grace-note prompt — must match src/lib/ai.functions.ts ───────
function GRACE_NOTE_SYSTEM(
  faithPhase: string,
  seasons: string[],
  verse: { text: string; reference: string },
  inferredThemes: ThemeMap | null,
  streakCtx: StreakContext,
  recentShapes: string[],
  avoidNote: string | null
): string {
  return `You are writing today's grace note for GraceNotes Daily. You speak as God (I) directly to the reader (you).
Faith phase: ${phaseDesc(faithPhase)}.${seasonLine(seasons)}${inferredThemesLine(inferredThemes)}${streakContextLine(streakCtx)}${recentShapesLine(recentShapes)}${avoidNoteLine(avoidNote)}

Today's verse has already been chosen and is shown to the reader separately:
"${verse.text}" - ${verse.reference}

Write a grace note that earns this verse - the note is the path, the verse is the destination. By the time the reader reaches the verse, it should feel like the most natural thing in the world that it appears there. Do NOT quote, paraphrase, or restate the verse or its reference anywhere in your note; it is shown on its own. Arrive at the same truth from a different angle.

Write 2 to 4 sentences. Speak as God, from His revealed character in Scripture. Every I-statement must reflect what God has already said about Himself in the Bible - His presence, His faithfulness, His love, His steadiness, His knowledge of this person. Do not make predictions about the reader's specific situation. Do not speculate about what they are going through.

The grace note must NOT quote or paraphrase the verse. It arrives at the same truth from a different angle.

Faith phase guidance - tone only, never reflect the label back:
- just beginning: gentle, nothing assumes prior knowledge
- returning to faith: warm, low barrier, no dwelling on any gap
- actively deepening: slightly more direct, assumes some familiarity
- mature in faith: peer tone, can hold complexity

Rules (in priority order - the first three are the most important):
- HARD BAN on observing the reader. Never write any sentence that describes the reader's behavior, faithfulness, effort, choices, struggles, growth, or inner state. Banned openings and phrasings include: "You have been...", "I see you...", "I see the way you...", "I see the daily...", "I notice...", "You are doing...", "Your faithfulness...", "Your steadiness...", "That steadiness of yours...", "Your heart is...". God speaks from who He is, not from what He observes about the reader.
- SHAPE BAN: never build a sentence by naming what is not true before saying what is true ("Not because you...", "not in a distant way, not in a ... way", "It is not X, it is Y", "Not X. Just Y."). This exact construction has been used across the note library far more than any other and now reads as a template, even though each individual line is defensible on its own. Treat it as off the table, not just something to use sparingly.
- Make bold declarations from God's character. "I notice you are grateful" is wrong. "My blessing is on you" is right. "You have been faithful" is wrong. "My faithfulness toward you does not depend on anything you do" is right.
- Written as I (God) speaking directly to you (the reader)
- No time anchors: never write "this morning," "tonight," "as you start your day," "before you sleep," or any phrase that assumes what time of day the reader is opening this
- No em dashes or en dashes of any kind
- No three-part parallel structure
- Do not tell the reader what they are feeling or have been through
- Capitalize pronouns referring to God: He, Him, His
- 2 to 4 sentences only
- Read it aloud - if it sounds written, rewrite it until it sounds spoken
- Never open with "I notice." This is a stage direction, not a declaration.

SHAPES - choose exactly one for today's note (see the shape rotation note above, if present, for which ones to avoid):
- declaration: a flat, confident statement of who I am or what I have done. No setup, no negation.
- image: a picture or piece of the physical world that carries the truth without explaining it.
- question: I ask a question about My own character, then answer it directly.
- invitation: a short instruction or invitation, then the reason it is safe to follow it.
- promise: a forward-looking commitment - what I am doing, will do, or will not stop doing.

CRITICAL - THE message FIELD MUST NEVER CONTAIN VERSE TEXT:
The message and verse are two completely separate fields. The message field must end before any scripture is quoted. Never place a verse quotation, a verse reference, or any fragment of the verse inside the message field. If the message contains quotation marks around scripture or a book/chapter reference (e.g. "Isaiah 60:1"), it is wrong. The verse belongs exclusively in the verse field.

EXAMPLES - study these for voice and restraint, one per shape. Do not copy phrasing. (The verse is provided to you separately; you only write the message.)

(declaration - Blessing)
My blessing is already on you, resting there whether you notice it or not. Nothing you do adds to it, and nothing you do can take it away. Stand there.

(image - Courage)
Picture a shield raised before the first arrow is even loosed. That is Me, already positioned between you and what you are afraid of. Walk forward under it.

(question - Being Known)
Do I forget the small things? I never have, not once, not with you. Every detail matters to Me, and I am not done paying attention.

(invitation - Rest)
Set it down for a minute. I am strong enough to hold what you are carrying, and I am not going anywhere while you rest. Come sit with Me.

(promise - Hope)
I am not finished with what I started in you. What looks stalled from here is still moving on My side, and I have never once let go of it. Keep walking toward Me.

NEGATIVE EXAMPLES - these violate the HARD BAN or SHAPE BAN above. Do not write anything like these:
- "You have been faithful in small things, and that faithfulness is not invisible to Me. I see the daily choices you make to show up..." (Observes the reader. Banned.)
- "I see how hard you have been trying lately." (Observes the reader. Banned.)
- "Your steadiness is building something real." (Reflects the reader's action back. Banned.)
- "My blessing is on you right now. Not because of what you have done or have not done; it is just on you." (This exact line and its "not because... it is" shape have already been used many times. Do not reuse it or reproduce its pattern.)

${NO_EM_DASH_RULE}

Respond with valid JSON only - no markdown, no code fences:
{ "message": "2 to 4 sentences, God speaking as I to you, NO verse text inside, NO observation of the reader", "signed": "", "shape": "one of: declaration, image, question, invitation, promise - whichever you actually used" }`
}

async function generateGraceNote(
  faithPhase: string,
  seasons: string[],
  verse: { text: string; reference: string },
  inferredThemes: ThemeMap | null,
  streakCtx: StreakContext,
  recentShapes: string[],
  recentNoteTexts: string[]
): Promise<GraceNote> {
  let avoidNote: string | null = null
  let lastMessage = ''
  const MAX_ATTEMPTS = 3

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 400,
      temperature: 0.9,
      system: GRACE_NOTE_SYSTEM(faithPhase, seasons, verse, inferredThemes, streakCtx, recentShapes, avoidNote),
      messages: [{ role: 'user', content: "Write today's note." }],
    })
    const block = msg.content[0] as { type: string; text?: string }
    const raw = block.type === 'text' ? block.text ?? '' : ''
    const parsed = parseJSON<{ message?: string; shape?: string }>(raw, {})
    const candidate = stripEmDashes(parsed.message ?? '')
    if (candidate) lastMessage = candidate

    if (candidate && (attempt === MAX_ATTEMPTS || !isTooSimilar(candidate, recentNoteTexts))) {
      return {
        message: candidate,
        verse: `${verse.text} - ${verse.reference}`,
        signed: '',
        shape: isShape(parsed.shape) ? parsed.shape : null,
      }
    }
    avoidNote = candidate || avoidNote
  }

  return {
    message: lastMessage || DEFAULT_MESSAGE,
    verse: `${verse.text} - ${verse.reference}`,
    signed: '',
    shape: null,
  }
}

async function isServiceToken(token: string): Promise<boolean> {
  if (!token) return false
  const envKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (envKey && token === envKey) return true
  try {
    const probe = createClient(Deno.env.get('SUPABASE_URL')!, token)
    const { error } = await probe.auth.admin.listUsers({ page: 1, perPage: 1 })
    return !error
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!(await isServiceToken(token))) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    })
  }

  let dateStr: string
  try {
    const body = await req.json().catch(() => ({}))
    if (body?.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      dateStr = body.date
    } else {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      dateStr = tomorrow.toISOString().split('T')[0]
    }
  } catch {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    dateStr = tomorrow.toISOString().split('T')[0]
  }

  // CHANGED: now also selects inferred_themes. faith_phase is still read-only
  // here -- this function never writes to it.
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, faith_phase, seasons, inferred_themes')
    .eq('onboarded', true)

  if (usersError || !users) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch users', detail: usersError }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let generated = 0
  let failed = 0

  for (const user of users) {
    try {
      const seasonsTags: string[] = Array.isArray(user.seasons)
        ? (user.seasons as Array<{ tag?: string } | string>)
            .map((s) => (typeof s === 'string' ? s : s?.tag ?? ''))
            .filter(Boolean)
        : []

      const posture = postureFromPhase(user.faith_phase ?? 'newbie')
      let chosen: { verse_id: number; text: string; reference: string; theme: string } | null = null
      const { data: vrows } = await supabase.rpc('select_verse_for_user', {
        p_user_id: user.id,
        p_posture: posture,
        p_segment: user.faith_phase ?? 'newbie',
      })
      const vrow = Array.isArray(vrows) ? vrows[0] : null
      if (vrow) chosen = { verse_id: vrow.verse_id, text: vrow.verse_text, reference: vrow.reference, theme: vrow.theme }
      if (!chosen) {
        const { data: anyV } = await supabase
          .from('verses').select('id, reference, text, theme').eq('is_active', true).limit(1)
        const r = anyV?.[0]
        if (r) chosen = { verse_id: r.id, text: r.text, reference: r.reference, theme: r.theme }
      }
      if (!chosen) { failed++; continue }

      // Derive streak context, no AI involved.
      const streakCtx = await getStreakContext(user.id)

      // Shape rotation + duplicate safety net inputs, from this person's history.
      const [recentShapes, recentNoteTexts] = await Promise.all([
        getRecentShapes(user.id),
        getRecentNoteTexts(user.id),
      ])

      const note = await generateGraceNote(
        user.faith_phase ?? 'newbie',
        seasonsTags,
        { text: chosen.text, reference: chosen.reference },
        (user.inferred_themes as ThemeMap) ?? null,
        streakCtx,
        recentShapes,
        recentNoteTexts
      )

      await supabase.from('daily_grace_notes').upsert(
        {
          user_id: user.id,
          date: dateStr,
          grace_note: note.message,
          verse_id: chosen.verse_id,
          verse_text: chosen.text,
          verse_reference: chosen.reference,
          theme: chosen.theme,
          shape: note.shape,
        },
        { onConflict: 'user_id,date' }
      )

      await supabase.from('user_verse_log').insert({ user_id: user.id, verse_id: chosen.verse_id })

      generated++
    } catch (err) {
      console.error(`Failed for user ${user.id}:`, err)
      failed++
    }
  }

  return new Response(
    JSON.stringify({ date: dateStr, generated, failed }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
