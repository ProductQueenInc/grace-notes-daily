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
// and seasons -- inferred_themes (generalized signal, fades over time) and
// streak_context (steady / returning, derived from daily_habits). Both follow
// the exact same pattern as the existing seasonLine(): if there's nothing
// meaningful to say, they contribute an empty string and cost nothing extra.
// faith_phase itself is untouched -- still 100% user-declared, never
// auto-changed by this function.
//
// UPDATED AGAIN (2026-08-11): inferred_themes was supposed to be driven by
// the daily chat someone actually uses every day, but it was ONLY ever wired
// to a separate, rarely-used journaling feature (Heart Notes) -- and that
// path had its own bug (classifier fired before the summary it needed even
// existed; see migration 20260811120000). This cron now classifies each
// user's chat from the day that just ended, right before reading
// inferred_themes below, so daily chat is the primary signal and Heart Notes
// remains a secondary one. See classifyDailyChatTheme() further down.
//
// UPDATED (2026-10-12): see 'variety engine' below. Examples removed from the
// prompt, shape assigned by code, cross-reader opener ban computed from the
// database each run, verse-specific truth required. dry_run/limit/skip_chat
// body options added for testing.
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

// ─── daily chat theme classification (added 2026-08-11) ────────────────────
// The primary source of inferred_themes. Previously ONLY Heart Notes (a
// separate journaling feature) fed this column -- the daily chat someone
// actually talks to every day never did, and on top of that the Heart Notes
// path had its own bug (see migration 20260811120000). This runs once per
// user per night, right here in the same cron that's about to read
// inferred_themes to write tomorrow's note, so today's chat shapes tomorrow's
// note immediately instead of waiting on a separate job.
//
// Same fixed vocabulary and same privacy design as
// supabase/functions/classify-heart-note-theme/index.ts: only ever writes a
// generalized tag, never raw chat content. Kept as a self-contained copy
// here (this repo's edge functions don't share code between deployments;
// see the existing CHAT_REPLY_PROMPT duplication note in chat-reply/index.ts
// for the same reason) -- if you change the vocabulary or the storage shape,
// change it in both files.
const THEME_VOCAB = [
  'abundance', 'anxiety', 'belonging', 'burnout', 'comfort', 'contentment', 'courage',
  'disconnection', 'doubt', 'exhaustion', 'expansion', 'faith', 'fear', 'gratitude',
  'grief', 'growth', 'hope', 'joy', 'loneliness', 'longing', 'new-beginnings',
  'opposition', 'overwhelm', 'presence', 'purpose', 'renewal', 'returning',
  'self-doubt', 'shame', 'uncertainty', 'unworthiness', 'waiting', 'worry', 'worth',
] as const

// Guards against profiles.inferred_themes' stale '[]'::jsonb default (or any
// other non-object value) before merging -- merging a tag into an array in
// JS sets a non-index property that JSON.stringify silently drops on write.
function asThemeMap(raw: unknown): ThemeMap {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as ThemeMap
  }
  return {}
}

// One short, generalized sentence describing the emotional/spiritual thread
// of that day's chat -- never a transcript, never specifics. Returns null if
// there was no chat that day, or the model judges it too light to summarize.
async function summarizeChatDay(userId: string, chatDate: string): Promise<string | null> {
  const { data: msgs } = await supabase
    .from('daily_messages')
    .select('role, text')
    .eq('user_id', userId)
    .eq('date', chatDate)
    .order('ts', { ascending: true })

  if (!msgs?.length) return null

  const transcript = msgs
    .slice(-30) // cap length; a full day's back-and-forth can run long
    .map((m) => `${m.role === 'user' ? 'Them' : 'GraceNote'}: ${m.text}`)
    .join('\n')
    .slice(0, 6000)

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 80,
    temperature: 0.2,
    system: `You summarize a private conversation in ONE short, generalized sentence describing its emotional/spiritual thread. Never quote or restate specific details, names, or events from the conversation -- describe the general shape of what someone was carrying, nothing identifiable. If the conversation is too light or surface-level to summarize meaningfully, respond with exactly: NONE.`,
    messages: [{ role: 'user', content: transcript }],
  })
  const block = msg.content[0] as { type: string; text?: string }
  const raw = (block.type === 'text' ? block.text ?? '' : '').trim()
  if (!raw || raw.toUpperCase() === 'NONE') return null
  return raw
}

async function classifyThemesFromSummary(summary: string): Promise<string[]> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 100,
    temperature: 0.2,
    system: `You classify a private conversation summary into general emotional/spiritual themes. You must ONLY output tags from this fixed list, nothing else:
${THEME_VOCAB.join(', ')}

Rules:
- Choose 1 to 3 tags that best capture the emotional/spiritual weather of the summary.
- Always generalize. A disclosure of a specific trauma, diagnosis, or crisis (abuse, PTSD, addiction, a specific illness, self-harm, etc.) must map to the nearest general tag (e.g. "grief", "fear", "exhaustion", "shame") -- never output anything outside the fixed list.
- If nothing meaningfully applies, return an empty array.

Respond with valid JSON only, no markdown: { "themes": ["tag1", "tag2"] }`,
    messages: [{ role: 'user', content: summary }],
  })
  const block = msg.content[0] as { type: string; text?: string }
  const raw = block.type === 'text' ? block.text ?? '' : ''
  const parsed = parseJSON<{ themes?: string[] }>(raw, { themes: [] })
  return (parsed.themes ?? []).filter((t) => (THEME_VOCAB as readonly string[]).includes(t)).slice(0, 3)
}

// Classifies this user's chat from `chatDate` (if any) and writes the result
// into profiles.inferred_themes using the same reinforcement/decay shape as
// classify-heart-note-theme. Returns the up-to-date theme map so the caller
// can use it immediately for tonight's note, without a second DB read.
// Never throws -- a classification failure falls back to the themes already
// on the profile rather than blocking that user's note generation.
async function classifyDailyChatTheme(
  userId: string,
  chatDate: string,
  currentThemes: ThemeMap | null
): Promise<ThemeMap | null> {
  try {
    const summary = await summarizeChatDay(userId, chatDate)
    if (!summary) return currentThemes

    const { data: session } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('date', chatDate)
      .maybeSingle()
    if (session?.id) {
      await supabase.from('chat_sessions').update({ summary }).eq('id', session.id)
    }

    const themes = await classifyThemesFromSummary(summary)
    if (!themes.length) return currentThemes

    const existing = asThemeMap(currentThemes)
    const now = new Date().toISOString()
    for (const tag of themes) {
      const prior = existing[tag]?.weight ?? 0
      existing[tag] = { weight: Math.min(1, prior + 0.5), last_seen: now }
    }

    await supabase.from('profiles').update({ inferred_themes: existing }).eq('id', userId)
    await supabase.rpc('posthog_capture', {
      p_event: 'theme_inferred',
      p_distinct: userId,
      p_props: { themes, source: 'daily_chat' },
    })

    return existing
  } catch (err) {
    console.error(`classifyDailyChatTheme failed for user ${userId}:`, err)
    return currentThemes
  }
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

// ─── variety engine (rewritten 2026-10-12) ───────────────────────────────────
// WHY: the old design asked the model to vary itself (self-reported shape,
// 50 example sentences, a same-reader first-6-words check). Real output
// showed the model copying the examples word for word (one example line was
// sent 50 times in four weeks), ignoring the shape rotation (89% "declaration"),
// and every ban just moving the tic to the next stock phrase. So variety is
// now enforced by code, not requested from the model:
//   1. NO example sentences in the prompt (nothing to copy).
//   2. The note must come from the specific truth in TODAY'S verse, so the
//      verse (which already rotates) drives content variety.
//   3. Code assigns the shape per reader per day (deterministic, no repeats
//      of the last two shapes).
//   4. The prompt shows the reader's last notes and a live list of opening
//      words overused across ALL readers, computed from the database each
//      run, so bans update themselves.
//   5. A code gate rejects openers that are overused (or already used by this
//      reader), and any 6-word phrase this reader already received; retries
//      up to MAX_ATTEMPTS, then accepts the last try rather than failing.
const SHAPES = ['declaration', 'image', 'question', 'invitation', 'promise'] as const
type Shape = (typeof SHAPES)[number]

const SHAPE_GUIDE: Record<Shape, string> = {
  declaration: 'a flat, confident statement of who I am or what I have done. No setup, no negation.',
  image: 'open inside one concrete, ordinary physical scene that carries the truth without explaining it. Start with the scene itself; never begin with "Picture" or "Imagine". Do not use light, water, doors, threads, hands, anchors, lighthouses, seeds, foundations, walls, or trees; the library has overused them.',
  question: 'I ask one question about My own character, then answer it directly. Do not start with "Do I" or "Do you"; open with a different question word.',
  invitation: 'a short invitation or instruction, then the reason it is safe to follow it.',
  promise: 'a forward-looking commitment: what I am doing, will do, or will not stop doing.',
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Code decides the shape. Deterministic per reader per day, so re-running a
// date gives the same shape, and skips the shapes this reader just received.
function pickShape(userId: string, dateStr: string, recentShapes: string[]): Shape {
  const start = hashString(`${userId}|${dateStr}`) % SHAPES.length
  const avoid = recentShapes.slice(0, 2)
  for (let i = 0; i < SHAPES.length; i++) {
    const s = SHAPES[(start + i) % SHAPES.length]
    if (!avoid.includes(s)) return s
  }
  return SHAPES[start]
}

function normalizeForCompare(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
}

function wordsOf(s: string): string[] {
  return normalizeForCompare(s).split(/\s+/).filter(Boolean)
}

function openerOf(s: string, n = 3): string {
  return wordsOf(s).slice(0, n).join(' ')
}

function sharesPhrase(a: string, b: string, n = 6): boolean {
  const aw = wordsOf(a)
  const bw = wordsOf(b)
  if (aw.length < n || bw.length < n) return false
  const grams = new Set<string>()
  for (let i = 0; i + n <= bw.length; i++) grams.add(bw.slice(i, i + n).join(' '))
  for (let i = 0; i + n <= aw.length; i++) {
    if (grams.has(aw.slice(i, i + n).join(' '))) return true
  }
  return false
}

// Library-wide usage counts over the last 14 days (all readers), updated live
// as this run produces notes. One map holds everything, keyed by kind:
//   "<three words>" and "<two words>"  openings
//   "f:<word>"                         first word of a note
//   "w:<stem>"                         a content word appearing anywhere in a note
//   "#total"                           number of notes counted
// Nothing here is a hand-kept ban list: whatever the library is overusing
// right now closes itself, and reopens when the library moves on.
type OpenerCounts = Map<string, number>

async function loadOpenerCounts(dateStr: string): Promise<OpenerCounts> {
  const from = new Date(`${dateStr}T00:00:00Z`)
  from.setUTCDate(from.getUTCDate() - 14)
  const { data } = await supabase
    .from('daily_grace_notes')
    .select('grace_note')
    .gte('date', from.toISOString().split('T')[0])
    .lt('date', dateStr)
    .limit(3000)
  const counts: OpenerCounts = new Map()
  for (const r of data ?? []) {
    bumpOpener(counts, r.grace_note ?? '')
  }
  return counts
}

const STOP_WORDS = new Set((
  'that this with from have will your they them then than what when where which while there here been were into over ' +
  'just only even ever every each about because before after again does doesn dont also more most much such some same ' +
  'still never always make made makes take takes come comes came give gives gave know knows knew want wants need needs ' +
  'like look looks thing things whom whose their these those would could should other another being both until through ' +
  'toward towards upon down back away well long right today anything nothing something everything someone yours mine ' +
  'itself myself yourself himself love loved loves grace faith peace hope joy heart life days day world ' +
  'wait waits hear hears keep keeps stay stays rest rests walk walks hold holds'
).split(' '))

function stem(w: string): string {
  return w.length > 5 ? w.replace(/(ing|ed|es|s)$/, '') : w.replace(/s$/, '')
}

function contentStems(s: string, allowed: Set<string> = new Set()): Set<string> {
  const out = new Set<string>()
  for (const w of wordsOf(s)) {
    if (w.length < 4 || STOP_WORDS.has(w)) continue
    const st = stem(w)
    if (!allowed.has(st)) out.add(st)
  }
  return out
}

function bumpOpener(counts: OpenerCounts, text: string): void {
  for (const n of [3, 2]) {
    const op = openerOf(text, n)
    if (op) counts.set(op, (counts.get(op) ?? 0) + 1)
  }
  const first = openerOf(text, 1)
  if (first) counts.set(`f:${first}`, (counts.get(`f:${first}`) ?? 0) + 1)
  for (const st of contentStems(text)) counts.set(`w:${st}`, (counts.get(`w:${st}`) ?? 0) + 1)
  counts.set('#total', (counts.get('#total') ?? 0) + 1)
}

const OVERUSED_AT = 2 // a 3-word opener used this often in 14 days is closed
const OVERUSED_AT_2 = 4 // a 2-word opener used this often in 14 days is closed
const FIRST_WORD_SHARE = 0.15 // one first word may open at most this share of notes
const WORD_SHARE = 0.1 // one content word may appear in at most this share of notes
const MIN_SAMPLE = 20 // shares are only enforced once this many notes are counted

function isClosed(key: string, count: number, total: number): boolean {
  if (key === '#total') return false
  if (key.startsWith('w:')) return total >= MIN_SAMPLE && count / total >= WORD_SHARE
  if (key.startsWith('f:')) return total >= MIN_SAMPLE && count / total >= FIRST_WORD_SHARE
  return count >= (key.split(' ').length === 2 ? OVERUSED_AT_2 : OVERUSED_AT)
}

function closedLists(counts: OpenerCounts): { openers: string[]; words: string[] } {
  const total = counts.get('#total') ?? 0
  const closed = [...counts.entries()].filter(([k, c]) => isClosed(k, c, total)).sort((a, b) => b[1] - a[1])
  return {
    openers: closed.filter(([k]) => !k.startsWith('w:')).slice(0, 25).map(([k]) => (k.startsWith('f:') ? k.slice(2) : k)),
    words: closed.filter(([k]) => k.startsWith('w:')).slice(0, 15).map(([k]) => k.slice(2)),
  }
}

// One idea ("you do not have to earn it, it is already settled") dominated the
// library, so the words that carry it are closed outright.
const STOCK_IDEA = /\b(already|earn\w*|perform\w*|measure up|prove yourself)\b/i

// Negation is closed outright. The "not X, it is Y" construction has been
// banned in the prompt since July and the model keeps writing it, so the code
// rejects any note that uses "not", "nor" or an n't contraction. (Nothing is
// lost: "I never run out" says what "I do not run out" does.)
const NEGATION = /\bnot\b|\bnor\b|n't\b/i

async function getRecentShapes(userId: string, dateStr: string): Promise<string[]> {
  const { data } = await supabase
    .from('daily_grace_notes')
    .select('shape')
    .eq('user_id', userId)
    .lt('date', dateStr)
    .order('date', { ascending: false })
    .limit(3)
  return (data ?? []).map((r) => r.shape).filter((s): s is string => !!s)
}

async function getRecentNoteTexts(userId: string, dateStr: string): Promise<string[]> {
  const { data } = await supabase
    .from('daily_grace_notes')
    .select('grace_note')
    .eq('user_id', userId)
    .lt('date', dateStr)
    .order('date', { ascending: false })
    .limit(30)
  return (data ?? []).map((r) => r.grace_note).filter((s): s is string => !!s)
}

// Returns why a candidate is too close to existing notes, or null if fine.
function collisionReason(candidate: string, ownRecent: string[], counts: OpenerCounts, verseText: string): string | null {
  const total = counts.get('#total') ?? 0
  const candNorm = normalizeForCompare(candidate)
  const candOpener = openerOf(candidate)
  const cand2 = openerOf(candidate, 2)
  const first = openerOf(candidate, 1)
  if (NEGATION.test(candidate)) {
    return 'it uses "not", "nor" or an n\'t contraction, and negation is banned; say only what IS true ("I never run out", not "I do not run out")'
  }
  const stock = candidate.match(STOCK_IDEA)
  if (stock) return `it uses the word "${stock[0]}", which is closed because it carries the library's most overused idea`
  if (isClosed(candOpener, counts.get(candOpener) ?? 0, total)) {
    return `it opens with "${candOpener}...", which many readers have received lately`
  }
  if (isClosed(cand2, counts.get(cand2) ?? 0, total)) {
    return `it opens with "${cand2}...", an opening family many readers have received lately`
  }
  if (isClosed(`f:${first}`, counts.get(`f:${first}`) ?? 0, total)) {
    return `it starts with the word "${first}", which too many recent notes start with; open with a different kind of word`
  }
  const verseStems = contentStems(verseText)
  const overusedWords = closedLists(counts).words
  const hit = [...contentStems(candidate)].find((w) => overusedWords.includes(w) && !verseStems.has(w))
  if (hit) return `it uses the word "${hit}", which too many recent notes use; find a fresher word or image`
  for (const r of ownRecent) {
    if (!r) continue
    if (candNorm === normalizeForCompare(r)) return 'it is identical to a note this reader already received'
    if (candOpener && candOpener === openerOf(r)) return `this reader already received a note opening with "${candOpener}..."`
    if (sharesPhrase(candidate, r)) return 'it repeats a phrase from a note this reader already received'
  }
  return null
}

function recentNotesBlock(ownRecent: string[]): string {
  const shown = ownRecent.slice(0, 8)
  if (!shown.length) return ''
  return `\n\nVARIETY - notes this reader already received, newest first. Do not reuse their opening words, images, key phrases, or central idea:\n${shown.map((n, i) => `${i + 1}. ${n}`).join('\n')}`
}

function overusedBlock(closed: { openers: string[]; words: string[] }): string {
  let out = ''
  if (closed.openers.length) {
    out += `\n\nOpening words already used by several readers lately. Do not begin with any of these, or anything close to them:\n${closed.openers.map((o) => `- "${o}..."`).join('\n')}`
  }
  if (closed.words.length) {
    out += `\n\nWords that too many recent notes have used. Do not use any of them (unless the verse itself contains the word); reach for a fresher word or image: ${closed.words.join(', ')}`
  }
  return out
}

function avoidAttemptLine(avoid: string | null, reason: string | null): string {
  if (!avoid) return ''
  return `\n\nYour last attempt was rejected because ${reason ?? 'it was too close to an earlier note'}: "${avoid}" Write a clearly different note: different opening words, different image, different angle on the verse.`
}

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

type GraceNote = { message: string; verse: string; signed: string; shape: string | null; attempts: number }

const NO_EM_DASH_RULE =
  'STYLE RULE: Never use em-dashes (—) or en-dashes (–). Use a hyphen (-), comma, semicolon, or colon instead.'

const DEFAULT_MESSAGE =
  "You are seen today. Not for what you did or didn't do - just seen.\n\nWalk gently. The work in front of you is held, even the small parts."

// ─── Canonical grace-note prompt — must match src/lib/ai.functions.ts ───────
function GRACE_NOTE_SYSTEM(
  faithPhase: string,
  seasons: string[],
  verse: { text: string; reference: string; theme: string },
  inferredThemes: ThemeMap | null,
  streakCtx: StreakContext,
  shape: Shape,
  ownRecent: string[],
  overused: { openers: string[]; words: string[] },
  avoidNote: string | null,
  avoidReason: string | null
): string {
  return `You are writing today's grace note for GraceNotes Daily. You speak as God (I) directly to the reader (you).
Faith phase: ${phaseDesc(faithPhase)}.${seasonLine(seasons)}${inferredThemesLine(inferredThemes)}${streakContextLine(streakCtx)}

Today's verse has already been chosen and is shown to the reader separately (its theme is ${verse.theme}):
"${verse.text}" - ${verse.reference}

THE JOB: Before writing, decide privately what this specific passage shows about who God is or what God does. Not a general truth like "God loves you" or "God is faithful": the particular thing this passage says (a person in it, an image in it, an action in it, a promise inside it). Write the note from that one particular truth, so the note could not be pasted onto a different verse. Do NOT quote, paraphrase, or restate the verse or its reference anywhere in the note; it is shown on its own. The note is the path; the verse is the destination.

TODAY'S SHAPE: ${shape}. ${SHAPE_GUIDE[shape]} Use exactly this shape.

Write 2 to 4 sentences. Speak as God, from His revealed character in Scripture. Every I-statement must reflect what God has said about Himself in the Bible - His presence, His faithfulness, His love, His steadiness, His knowledge of this person. Do not make predictions about the reader's specific situation. Do not speculate about what they are going through.

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

CRITICAL - THE message FIELD MUST NEVER CONTAIN VERSE TEXT:
The message and verse are two completely separate fields. The message field must end before any scripture is quoted. Never place a verse quotation, a verse reference, or any fragment of the verse inside the message field. If the message contains quotation marks around scripture or a book/chapter reference (e.g. "Isaiah 60:1"), it is wrong. The verse belongs exclusively in the verse field.

OPENING BAN (added 2026-09-15, verified against real output across every active user): a second wave of templates has taken over the note library, the same way "Not X... it is Y" did before it was banned in July. These are now BANNED - do not use them or a close paraphrase of any of them:
- "I am holding..." as a catch-all opener (holding you steady, holding the door open, holding what you cannot see yet, holding the ground, holding the outcome, holding the thing you carry)
- "I am steady" / "I am [already] standing between you and..."
- "I am closer to you than [the air you breathe / your next breath / the ground you stand on]"
- "What does it look like when I...? It looks like..." or "What would it look like if I...?"
- picturing "the thread of your life" or "the thread of your story"
Banning the exact wording is not enough - the underlying move (open with "I am holding/steady/standing/closer" as a safe default) must not repeat either, even reworded. If a candidate opening feels like the most obvious, safest way to start, that is a signal to pick a different shape or image entirely.

NEGATIVE EXAMPLES - these violate the HARD BAN, SHAPE BAN, or OPENING BAN above. Do not write anything like these:
- "You have been faithful in small things, and that faithfulness is not invisible to Me. I see the daily choices you make to show up..." (Observes the reader. Banned.)
- "I see how hard you have been trying lately." (Observes the reader. Banned.)
- "Your steadiness is building something real." (Reflects the reader's action back. Banned.)
- "My blessing is on you right now. Not because of what you have done or have not done; it is just on you." (First-wave template. Banned.)
- "I am holding you steady right now, whether you feel it or not." (Second-wave template. Banned.)
- "I am closer to you than the air you are breathing." (Second-wave template. Banned.)
- "What does it look like when I walk with you? It looks like staying close on the ordinary days too." (Second-wave template. Banned.)
- "I am already standing between you and what is coming." (Second-wave template. Banned.)

NO NEGATION: do not use the word "not", "nor", or any n't contraction anywhere in the note. Say only what IS true. "I never run out" works; "I do not run out" does not. Any note that says what God is not, or what the reader does not have to do, will be rejected.

IDEA WARNING: one idea has dominated the note library: that the reader does not have to earn something, that it was already settled before they woke, that God is not waiting for them to measure up. Say what THIS verse says instead. These words are closed and will be rejected: already, earn, earned, perform, performance, prove yourself, measure up.${recentNotesBlock(ownRecent)}${overusedBlock(overused)}${avoidAttemptLine(avoidNote, avoidReason)}

${NO_EM_DASH_RULE}

Respond with valid JSON only - no markdown, no code fences:
{ "message": "2 to 4 sentences, God speaking as I to you, NO verse text inside, NO observation of the reader", "signed": "" }`
}

async function generateGraceNote(
  faithPhase: string,
  seasons: string[],
  verse: { text: string; reference: string; theme: string },
  inferredThemes: ThemeMap | null,
  streakCtx: StreakContext,
  shape: Shape,
  ownRecent: string[],
  counts: OpenerCounts,
  maxAttempts: number
): Promise<GraceNote> {
  let avoidNote: string | null = null
  let avoidReason: string | null = null
  const tried: { text: string; hard: boolean }[] = []

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 400,
      temperature: 0.9,
      system: GRACE_NOTE_SYSTEM(
        faithPhase, seasons, verse, inferredThemes, streakCtx, shape,
        ownRecent, closedLists(counts), avoidNote, avoidReason
      ),
      messages: [{ role: 'user', content: "Write today's note." }],
    })
    const block = msg.content[0] as { type: string; text?: string }
    const raw = block.type === 'text' ? block.text ?? '' : ''
    const parsed = parseJSON<{ message?: string }>(raw, {})
    const candidate = stripEmDashes(parsed.message ?? '')

    const reason = candidate ? collisionReason(candidate, ownRecent, counts, verse.text) : 'the reply was empty'
    if (candidate) {
      // "Hard" problems (negation, the dominant stock idea) are worse than a
      // merely common opening, so if every attempt fails we keep a soft one.
      tried.push({ text: candidate, hard: !!reason && /negation|most overused idea/.test(reason) })
      if (!reason) return { message: candidate, verse: `${verse.text} - ${verse.reference}`, signed: '', shape, attempts: attempt }
    }
    avoidNote = candidate || avoidNote
    avoidReason = reason
  }

  // Nothing passed the gate: accept the best of what we have rather than fail.
  const pick = [...tried].reverse().find((t) => !t.hard) ?? tried[tried.length - 1]
  return {
    message: pick?.text || DEFAULT_MESSAGE,
    verse: `${verse.text} - ${verse.reference}`,
    signed: '',
    shape: pick ? shape : null,
    attempts: maxAttempts,
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

  // Body options (all optional):
  //   date       "YYYY-MM-DD"  generate for that date (default: tomorrow)
  //   dry_run    true          generate and RETURN the notes; write nothing,
  //                            classify nothing, log no verses. For testing.
  //   limit      N             only the first N readers (testing)
  //   skip_chat  true          do not run the nightly chat classification
  //                            (use when re-generating a date by hand so the
  //                            same chat day is not counted twice)
  const body = await req.json().catch(() => ({}))
  const dryRun = body?.dry_run === true
  const skipChat = body?.skip_chat === true || dryRun
  const limit = Number.isFinite(Number(body?.limit)) && Number(body.limit) > 0 ? Number(body.limit) : null

  let dateStr: string
  if (body?.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    dateStr = body.date
  } else {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    dateStr = tomorrow.toISOString().split('T')[0]
  }

  // CHANGED: now also selects inferred_themes. faith_phase is still read-only
  // here -- this function never writes to it.
  const { data: allUsers, error: usersError } = await supabase
    .from('profiles')
    .select('id, faith_phase, seasons, inferred_themes')
    .eq('onboarded', true)

  if (usersError || !allUsers) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch users', detail: usersError }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  const users = limit ? allUsers.slice(0, limit) : allUsers

  // The chat day that just finished: one calendar day before dateStr
  // (dateStr defaults to tomorrow, so this is "today" -- the day whose chat
  // just wrapped up, about to shape the note going out for dateStr).
  const chatDateObj = new Date(`${dateStr}T00:00:00Z`)
  chatDateObj.setUTCDate(chatDateObj.getUTCDate() - 1)
  const chatDate = chatDateObj.toISOString().split('T')[0]

  // Cross-reader opener counts, loaded once and updated as notes are made so
  // two readers cannot both be handed the same stock opening in one run.
  const openerCounts = await loadOpenerCounts(dateStr)

  // Edge functions have a wall-clock limit. If the run is getting long, stop
  // retrying (one attempt per reader) so everyone still gets a note.
  const softDeadline = Date.now() + 80_000
  const MAX_ATTEMPTS = 4
  const CONCURRENCY = 4

  let generated = 0
  let failed = 0
  const preview: Array<Record<string, unknown>> = []

  const processUser = async (user: (typeof users)[number]): Promise<void> => {
    try {
      // Classify today's chat (if any) before reading inferred_themes below,
      // so this note benefits from today's conversation right away.
      const freshThemes = skipChat
        ? asThemeMap(user.inferred_themes)
        : await classifyDailyChatTheme(user.id, chatDate, asThemeMap(user.inferred_themes))
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
      if (!chosen) { failed++; return }

      // Derive streak context, no AI involved.
      const streakCtx = await getStreakContext(user.id)

      // This reader's history (before the date being generated).
      const [recentShapes, ownRecent] = await Promise.all([
        getRecentShapes(user.id, dateStr),
        getRecentNoteTexts(user.id, dateStr),
      ])
      const shape = pickShape(user.id, dateStr, recentShapes)

      const note = await generateGraceNote(
        user.faith_phase ?? 'newbie',
        seasonsTags,
        { text: chosen.text, reference: chosen.reference, theme: chosen.theme ?? '' },
        freshThemes,
        streakCtx,
        shape,
        ownRecent,
        openerCounts,
        Date.now() > softDeadline ? 1 : MAX_ATTEMPTS
      )

      // Count this opener so later readers in the same run steer away from it.
      bumpOpener(openerCounts, note.message)

      if (dryRun) {
        preview.push({
          reader: user.id.slice(0, 8),
          phase: user.faith_phase,
          shape: note.shape,
          attempts: note.attempts,
          verse: chosen.reference,
          theme: chosen.theme,
          message: note.message,
        })
        generated++
        return
      }

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

  // Readers are independent, so run a few at a time. Sequentially, a full run
  // with retries could outlast the edge function time limit.
  const queue = [...users]
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const next = queue.shift()
      if (next) await processUser(next)
    }
  })
  await Promise.all(workers)

  return new Response(
    JSON.stringify(dryRun ? { date: dateStr, dry_run: true, generated, failed, notes: preview } : { date: dateStr, generated, failed }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
