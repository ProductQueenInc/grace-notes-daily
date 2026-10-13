// supabase/functions/generate-daily-devotional/index.ts
// Day-ahead cron: pre-generates the shared daily devotional for a given date
// (defaults to tomorrow UTC) AND its cover image (an Unsplash stock photo,
// searched per weekday theme). Safe to call multiple times - skips text
// generation if a row already exists, and backfills a missing cover image
// on that same row when needed.
// Scheduled by pg_cron at 09:00 UTC daily.
//
// Modes (POST body):
//   {}                              -> generate tomorrow (default)
//   { "date": "YYYY-MM-DD" }        -> generate that specific date
//   { "date": "...", "dry_run": true } -> generate and RETURN the devotional
//                                      without saving anything (testing)
//   { "backfill": true, "limit": N} -> backfill covers for the N oldest rows
//                                      missing cover_image_url (default 5)
//
// PROMPT POLICY: the devotional system prompt below mirrors
// getOrCreateSharedDevotional in src/lib/ai.functions.ts. The cover-image
// search terms mirror THEME_SEARCH_TERMS in src/lib/devotional-cover.server.ts.
// If you change one, change the other (edge functions can't import from src/).
//
// UPDATED (2026-10-12): variety engine. The devotional kept opening with
// "Hope is not optimism" style definitions, reusing titles ("The Anchor
// Holds" seven times), and ending in "Name one thing..." because the model
// never saw what had already been published. Now: Sonnet instead of Haiku,
// the model is shown recent titles/openers/takeaways, the takeaway FORM is
// assigned by code per date, and a code gate rejects repeated titles,
// repeated openers, "X is not Y" definition openers and repeated takeaway
// starts (retry up to 3 attempts, then accept). Theme-per-weekday and verse
// rotation are unchanged on purpose.

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const COVER_BUCKET = 'devotional-covers'
// 2026-07-21: switched off Gemini image generation (Google API key ran out
// of credits) to Unsplash stock photos, searched per weekday theme. Needs
// UNSPLASH_ACCESS_KEY set as an edge function secret (Project Settings ->
// Edge Functions -> generate-daily-devotional -> Secrets in the Supabase
// dashboard), same way GEMINI_API_KEY was set.
const UNSPLASH_ACCESS_KEY = Deno.env.get('UNSPLASH_ACCESS_KEY') ?? ''
const UNSPLASH_SEARCH_ENDPOINT = 'https://api.unsplash.com/search/photos'
// Public proxy that serves cover images from the private bucket.
// Keep in sync with coverPublicUrl in src/lib/devotional-cover.server.ts and
// the BASE_URL in src/lib/library.ts.
const SITE_BASE_URL = 'https://www.gracenotesdaily.com'



const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// One theme per weekday — must match verses.theme values exactly.
const WEEKDAY_THEME: Record<number, string> = {
  0: 'Purpose',
  1: 'Hope',
  2: 'Peace',
  3: 'Grief & Comfort',
  4: 'Gratitude',
  5: 'Courage',
  6: 'Rest',
}

function themeForDate(dateISO: string): string {
  const d = new Date(dateISO + 'T12:00:00Z')
  return WEEKDAY_THEME[d.getUTCDay()] ?? 'Hope'
}

function tomorrowISO(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function stripEmDashes(s: string): string {
  return s.replace(/[—–]/g, '-').trim()
}

function sanitizeText(s: string): string {
  return stripEmDashes(typeof s === 'string' ? s : '')
}

const NO_EM_DASH_RULE =
  'STYLE RULE: Never use em-dashes (—) or en-dashes (–). Use a hyphen (-), comma, semicolon, or colon instead.'

const NO_OVER_FAMILIARITY = `TONE GUARDRAILS - read carefully, these are hard rules:

Never use endearment openers. No "My dear child," "Beloved," "Friend," "Little one," "Precious one," "Sweet one," "My love." Address by first name occasionally (not every time) or not at all.

Never stage-direct emotion. No "I want you to know...", "Let me tell you...", "Hear me when I say...", "Remember this...", "Know that...". Just say the thing.

Never narrate divine emotion at the user. No "I delight in you," "My heart sings over you," "I rejoice over you," "I am proud of you simply because you're mine." Show what is noticed, do not declare what is felt.

Never name the user's season, phase, or rhythm back at them. Don't write "in this season of grief" or "as someone returning to faith." The voice should sound like someone who knows, not someone who has been briefed.

Concrete over abstract. "The kettle. The window. This breath." beats "this quiet pause." Specifics land. Generalities feel like a Hallmark card.

Restraint over reassurance. One true sentence beats three soothing ones.

Read-aloud test: if a thoughtful pastor would not actually say the sentence to someone they love, cut it.`

// Devotional openings only. Mirrors OPENING_RULE in src/lib/ai.functions.ts -
// keep both in sync (edge functions can't import from src/, see CLAUDE.md §5/§9).
const OPENING_RULE = `
OPENING RULE: Never open with "The [adjective] thing about [X] is [Y]" or a close variant ("What's strange about X is...", "There's something hard about X...", "Here's the difficult part about X..."). This construction has become a tic. Banning the exact words is not enough - the underlying shape (name a quality of the topic, then explain it) must not repeat either, even worded differently.

Also never open by defining the theme word ("Hope is not optimism.", "Peace is not the absence of...", "Gratitude is not a feeling...", "Courage is not..."), and never open with "Most people...". These have become tics too.

Vary the entry point every time. Rotate across these approaches instead of settling into one:
- a scene already in motion, no setup
- direct address to the reader mid-action ("you" doing something specific)
- a flat statement with no framing at all
- a small first-person confession
- a single sharp, unexplained image
- a remembered or overheard line
- the biblical person or place the verse comes from, already in the middle of it

Never signal that a sentence is coming ("Here's the truth:", "Consider this:", "The truth about X is..."). Just say the thing.

NEGATIVE EXAMPLES - do not open like these, or in this shape with different words:
"The strange thing about waiting is that it teaches you what you actually believe."
"The hard part about forgiveness is that it rarely feels like relief."
"What's difficult about rest is how much it resembles doing nothing."

POSITIVE EXAMPLES - different entry points, shown to illustrate range of shape, not to be reused verbatim:
"The line at the pharmacy hasn't moved in ten minutes, and neither have you."
"You have checked your phone four times since you sat down to read this."
"Waiting rearranges you before you notice it happening."
"I have prayed the same prayer for three years and nothing has changed."
"A kettle, left on the stove past its whistle."
`

// ── Variety engine (2026-10-12) ───────────────────────────────────────────

// The takeaway form is chosen by code per date, so the ending cannot settle
// into "Name one thing you...". Six forms; the weekday theme cycles every 7
// days, so a theme meets a different form each week.
const TAKEAWAY_FORMS = [
  'a question to sit with today. It ends with a question mark and does not ask the reader to name, list, or identify anything.',
  'one small, specific thing to do for another person today.',
  'a short sentence to say aloud or pray today, written out in full inside quotation marks.',
  'one thing to set down or stop doing for today, and what to do with the moment that frees up.',
  'one ordinary thing in the physical world to look at or listen for today, and what it says about this verse.',
  'a single line to carry in your pocket: the one sentence worth remembering from this devotional, stated plainly.',
]

function takeawayFormForDate(dateISO: string): string {
  const dayNumber = Math.floor(new Date(dateISO + 'T12:00:00Z').getTime() / 86_400_000)
  return TAKEAWAY_FORMS[dayNumber % TAKEAWAY_FORMS.length]
}

function norm(s: string): string {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function firstN(s: string, n: number): string {
  return norm(s).split(' ').slice(0, n).join(' ')
}

function firstSentence(s: string): string {
  const m = (s ?? '').match(/^[\s\S]*?[.!?](\s|$)/)
  return (m ? m[0] : (s ?? '').slice(0, 160)).trim()
}

type PastDevotional = { date: string; theme: string; title: string; opener: string; takeaway: string }

async function loadPastDevotionals(beforeDate: string): Promise<PastDevotional[]> {
  const { data } = await supabase
    .from('daily_devotionals')
    .select('date, theme, title, body, takeaway')
    .lt('date', beforeDate)
    .order('date', { ascending: false })
    .limit(400)
  return ((data ?? []) as { date: string; theme: string; title: string; body: unknown; takeaway: string | null }[]).map((r) => ({
    date: r.date,
    theme: r.theme,
    title: r.title ?? '',
    opener: firstSentence(Array.isArray(r.body) ? String(r.body[0] ?? '') : ''),
    takeaway: r.takeaway ?? '',
  }))
}

function memoryBlock(past: PastDevotional[], themeName: string): string {
  if (!past.length) return ''
  const titles = past.slice(0, 60).map((p) => p.title).filter(Boolean)
  const recentOpeners = past.slice(0, 14).map((p) => p.opener).filter(Boolean)
  const themeOpeners = past.filter((p) => p.theme === themeName).slice(0, 6).map((p) => p.opener).filter(Boolean)
  const takeaways = past.slice(0, 8).map((p) => firstSentence(p.takeaway)).filter(Boolean)
  return `
WHAT HAS ALREADY BEEN PUBLISHED - do not repeat any of it:
Titles already used (never reuse one, and do not copy their pattern, for example "The X That Y" or "The Arithmetic of Z"): ${titles.map((t) => `"${t}"`).join('; ')}

Opening sentences from the last two weeks (do not open with the same words, the same sentence shape, or the same image):
${recentOpeners.map((o) => `- ${o}`).join('\n')}
${themeOpeners.length ? `\nOpening sentences from earlier ${themeName} devotionals (this theme comes around every week, so make this one open somewhere new):\n${themeOpeners.map((o) => `- ${o}`).join('\n')}\n` : ''}
Recent takeaways (yours must differ in form and in wording):
${takeaways.map((t) => `- ${t}`).join('\n')}
`
}

// Body checks (added 2026-10-13): the "not X, but Y" tic and the "Paul says..., John
// records..., Isaiah says..." verse parade had survived in the body even after
// the title, opening and takeaway were gated.
const CONTRAST_NEGATION = /\bnot because\b|\bnot\b[^.!?\n]{1,60}[,;]\s*(?:but|just|only|rather|instead)\b|\bnot\b[^.!?;\n]{1,40}\bbut\b/gi
const NEG_WORDS = /\bnot\b|\bnor\b|\bnever\b|n't\b/gi
const NAMED_SAYS = /\b[A-Z][a-z]+ (?:says|writes|records|tells|promises|declares|reminds|asks|speaks)\b/g

// How bad is a draft's body? Used only to pick the best of the attempts when
// none passes the gate (a duplicate title or opener is far worse than a few
// negations, so those get +100).
function bodyScore(body: string[]): number {
  const t = body.join('\n')
  const c = (t.match(CONTRAST_NEGATION) ?? []).length
  const n = (t.match(NEG_WORDS) ?? []).length
  const says = body.some((p) => (p.match(NAMED_SAYS) ?? []).length >= 3) ? 5 : 0
  return c * 4 + n + says
}

function collisionReason(
  title: string,
  body: string[],
  takeaway: string,
  past: PastDevotional[],
): string | null {
  const t = norm(title)
  if (past.some((p) => norm(p.title) === t)) return `the title "${title}" has already been used`
  const t2 = firstN(title, 2)
  if (t2 && past.slice(0, 60).some((p) => firstN(p.title, 2) === t2)) return `the title starts with "${t2}...", like an earlier title; pick a different image for it`
  const opener = firstSentence(body[0] ?? '')
  const o4 = firstN(opener, 4)
  if (past.slice(0, 120).some((p) => firstN(p.opener, 4) === o4)) return `it opens with "${o4}...", which an earlier devotional already did`
  if (/^[a-z]+(\s[a-z]+)?\s(is|are)\s+not\b/i.test(opener.trim())) return 'it opens by defining the theme word with "X is not Y"'
  if (/^most people\b/i.test(opener.trim())) return 'it opens with "Most people..."'
  const bodyText = body.join('\n')
  const contrasts = bodyText.match(CONTRAST_NEGATION) ?? []
  if (contrasts.length > 1) return `the body leans on the "not X, but Y" construction more than once (for example: "${contrasts.slice(0, 2).join('" and "').slice(0, 160)}"); say what IS true instead, with no contrast`
  const negations = bodyText.match(NEG_WORDS) ?? []
  if (negations.length > 7) return `the body uses ${negations.length} negations (not / nor / never / n't); rewrite so most sentences state what IS true`
  if (body.some((p) => (p.match(NAMED_SAYS) ?? []).length >= 3)) return 'one paragraph strings together three "[Name] says / writes / records..." sentences; use at most one passage per paragraph and weave it in'
  const k3 = firstN(takeaway, 3)
  if (k3 && past.slice(0, 30).some((p) => firstN(p.takeaway, 3) === k3)) return `the takeaway starts with "${k3}...", like a recent one`
  if (/^(today,?\s+)?(name|notice|identify)\b/i.test(takeaway.trim())) return 'the takeaway starts with "Name/Notice/Identify", which is overused'
  return null
}

// Service-token check. The cron sends the legacy service_role JWT from the
// vault, but the edge runtime's injected SUPABASE_SERVICE_ROLE_KEY can be a
// different format (new sb_secret keys), so plain equality can 401 a
// genuinely privileged token. Fast-path the env match; otherwise prove the
// token has service-level power with a harmless admin call.
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

// ── Cover image helpers ───────────────────────────────────────────────────

// CACHE-BUST VERSION (2026-07-22): keep this identical to COVER_URL_VERSION
// in src/lib/devotional-cover.server.ts (§5/§9 CLAUDE.md sync rule). The
// proxy route serves this URL with a 1-year immutable Cache-Control header;
// bumping this value changes the cache key so previously-cached responses
// (including stale 404s cached before an image existed) are bypassed.
const COVER_URL_VERSION = '2'

function coverPublicUrl(date: string): string {
  return `${SITE_BASE_URL}/api/public/devotional-cover/${date}.png?v=${COVER_URL_VERSION}`
}

// NOTE: the Gemini-generation era had SUBJECT_ROTATION here to deliberately
// rotate the depicted person's race/gender/age across covers. Unsplash
// search can't target that (we don't control who's in the stock photo, only
// the scene/mood) — that intentional representation control is gone with
// this pivot. Flagging so it doesn't silently disappear unnoticed; worth a
// product call on whether that matters enough to curate photo sets by hand
// instead of live search.

const THEME_CONTEXT: Record<string, { setting: string; moment: string }> = {
  hope: {
    setting: "a modern kitchen, office window, or city park — morning light, the start of something",
    moment: "quietly open to something they cannot quite name yet",
  },
  peace: {
    setting: "a private interior — parked car, apartment living room, corner of a coffee shop",
    moment: "still. not needing to fix anything right now",
  },
  "grief & comfort": {
    setting: "a private space — parked car after arriving home, living room at night, clean modern hospital room, empty office after hours",
    moment: "sitting with something that cannot be solved. not crying, or just finished crying",
  },
  grief: {
    setting: "a private space — parked car after arriving home, living room at night, clean modern hospital room",
    moment: "sitting with something that cannot be solved. not crying, or just finished crying",
  },
  gratitude: {
    setting: "a domestic or quiet social moment — kitchen with morning light, table after dinner, a window with a view",
    moment: "quietly aware of something good that almost went unnoticed",
  },
  courage: {
    setting: "a threshold — hallway outside an office door, parking lot before walking in, desk before making a difficult call",
    moment: "about to do the hard thing. still deciding, but leaning toward yes",
  },
  rest: {
    setting: "a quiet interior — bedroom with morning light, couch at the end of a long week, coffee shop with no laptop open",
    moment: "finally allowed to stop. the exhale after a long hold",
  },
  purpose: {
    setting: "a professional or creative space — desk, modern office, coffee shop with an open notebook",
    moment: "seeing their work with new eyes. not burned out — something just became clear",
  },
}

const DEFAULT_CONTEXT = {
  setting: "a modern everyday space — office, apartment, coffee shop, or city park",
  moment: "in a quiet, honest moment with themselves",
}

// Short, concrete Unsplash search terms per theme. Unsplash search works best
// with a handful of plain nouns, not a full sentence — this is deliberately
// terser than THEME_CONTEXT above (which still describes the brand's visual
// direction for reference/future prompt-based generation).
// Keep in sync with the canonical copy in src/lib/devotional-cover.server.ts.
const THEME_SEARCH_TERMS: Record<string, string> = {
  hope: "sunrise window morning light",
  peace: "quiet coffee shop window light",
  "grief & comfort": "empty room window soft light solitude",
  grief: "empty room window soft light solitude",
  gratitude: "kitchen morning light table",
  courage: "doorway hallway morning light",
  rest: "bedroom morning light couch quiet",
  purpose: "desk notebook coffee shop morning",
}
const DEFAULT_SEARCH_TERMS = "quiet morning window light"

function dateIndex(dateStr: string): number {
  return parseInt(dateStr.replace(/-/g, ""), 10)
}

type CoverResult = {
  url: string | null
  error?: string
  photographerName?: string
  photographerUrl?: string
}

// Unsplash requires (per their API guidelines, help.unsplash.com/en/articles/2511315)
// that apps using a photo "hotlink" a download-tracking pixel at the moment
// the photo is used, and that the photographer + Unsplash are credited
// wherever the photo is shown. This function handles the tracking ping.
// ATTRIBUTION STILL NEEDS TO BE ADDED IN THE FRONTEND where the cover image
// renders — see the note printed at the end of the backfill/response. That's
// a display/UI decision, not something to bake in silently on the backend.
async function pingUnsplashDownload(downloadLocation: string): Promise<void> {
  try {
    await fetch(`${downloadLocation}${downloadLocation.includes('?') ? '&' : '?'}client_id=${UNSPLASH_ACCESS_KEY}`)
  } catch (err) {
    console.warn('[cover] unsplash download-tracking ping failed (non-fatal):', err)
  }
}

async function generateAndStoreCoverDetailed(
  date: string,
  theme: string,
  _title: string,
  _takeaway: string,
): Promise<CoverResult> {
  if (!UNSPLASH_ACCESS_KEY) {
    console.warn('[cover] UNSPLASH_ACCESS_KEY missing; skipping cover image')
    return { url: null, error: 'UNSPLASH_ACCESS_KEY missing' }
  }
  try {
    const query = THEME_SEARCH_TERMS[theme.toLowerCase()] ?? DEFAULT_SEARCH_TERMS
    const searchUrl = `${UNSPLASH_SEARCH_ENDPOINT}?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape&content_filter=high`
    const res = await fetch(searchUrl, {
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error(`[cover] unsplash search ${res.status}:`, text.slice(0, 2000))
      return { url: null, error: `unsplash search ${res.status}: ${text.slice(0, 500)}` }
    }
    const json = (await res.json()) as {
      results?: {
        urls?: { regular?: string }
        links?: { download_location?: string }
        user?: { name?: string; links?: { html?: string } }
      }[]
    }
    const results = json.results ?? []
    if (!results.length) {
      console.error(`[cover] unsplash returned no results for query "${query}"`)
      return { url: null, error: `no unsplash results for query "${query}"` }
    }
    const photo = results[dateIndex(date) % results.length]
    const imageUrl = photo.urls?.regular
    if (!imageUrl) {
      console.error('[cover] unsplash result missing urls.regular:', JSON.stringify(photo).slice(0, 300))
      return { url: null, error: 'unsplash result missing image url' }
    }

    // Required by Unsplash's API guidelines whenever a photo is used, not
    // just when a user clicks "download" - fire-and-forget, non-fatal.
    if (photo.links?.download_location) {
      await pingUnsplashDownload(photo.links.download_location)
    }

    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) {
      return { url: null, error: `failed to fetch unsplash image bytes: ${imgRes.status}` }
    }
    const bytes = new Uint8Array(await imgRes.arrayBuffer())
    const { error } = await supabase.storage
      .from(COVER_BUCKET)
      .upload(`${date}.png`, bytes, { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' })
    if (error) {
      console.error(`[cover] upload failed for ${date}:`, error.message)
      return { url: null, error: `upload failed: ${error.message}` }
    }
    return {
      url: coverPublicUrl(date),
      photographerName: photo.user?.name,
      photographerUrl: photo.user?.links?.html,
    }
  } catch (err) {
    console.error('[cover] unexpected error:', err)
    return { url: null, error: `unexpected error: ${String(err)}` }
  }
}

async function generateAndStoreCover(
  date: string,
  theme: string,
  title: string,
  takeaway: string,
): Promise<string | null> {
  return (await generateAndStoreCoverDetailed(date, theme, title, takeaway)).url
}

// ── Backfill mode ──────────────────────────────────────────────────────────

async function runBackfill(limit: number) {
  const { data: rows, error } = await supabase
    .from('daily_devotionals')
    .select('date, theme, title, takeaway')
    .is('cover_image_url', null)
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`backfill query failed: ${error.message}`)
  const targets = (rows ?? []) as { date: string; theme: string; title: string; takeaway: string | null }[]
  const results: { date: string; ok: boolean; url?: string; error?: string; photographer?: string }[] = []
  for (const row of targets) {
    const cover = await generateAndStoreCoverDetailed(row.date, row.theme, row.title, row.takeaway ?? '')
    if (cover.url) {
      const { error: updErr } = await supabase
        .from('daily_devotionals')
        .update({ cover_image_url: cover.url })
        .eq('date', row.date)
      if (updErr) console.error(`[backfill] update failed for ${row.date}:`, updErr.message)
    }
    results.push({
      date: row.date,
      ok: !!cover.url,
      url: cover.url ?? undefined,
      error: cover.error,
      photographer: cover.photographerName,
    })
  }
  return { processed: results.length, results }
}

// ── Devotional text generation ────────────────────────────────────────────

type DevotionalDraft = { title: string; body: string[]; takeaway: string; attempts: number }

function buildSystem(
  themeName: string,
  verse: { text: string; reference: string },
  relatedBlock: string,
  takeawayForm: string,
  memory: string,
  avoid: string | null,
): string {
  return `Write today's GraceNotes Daily devotional. This devotional is shared - the same one goes to everyone today - so write it generalized, not personalized. Today's theme is ${themeName}.

The verse for today has already been chosen and will be shown to the reader. Build the devotional around it. Do NOT introduce, quote, or invent any other scripture beyond this verse and the related passages listed below.
Verse of the day: "${verse.text}" - ${verse.reference}${relatedBlock}

Third-person teaching voice (not a letter from God). One unified spiritual thought, not assembled parts.
Open with a small concrete tension, move through biblical insight, land on one practical thing to hold today.
Be biblically grounded. Be specific. Never preachy. Never generic.
Build it from what this particular passage says and who said it to whom, not from a general lesson about the theme. If the passage has a person, a place, or an image in it, start there.
Write it deep enough to matter, but general enough that a reader who is not personally in this theme today could send it to someone in their life who is walking through it. Do not assume the reader's circumstances.
Don't reference time of day or what part of the day this is being read.

${OPENING_RULE}

GENDER RULE: Never use gendered pronouns for the reader. Use "you" and "your". If third-person is unavoidable, use "they" or "them".
STRUCTURE RULE: No three-part parallel structure, no rhetorical triplets, no rule-of-threes. Vary sentence shape and length.
NEGATION RULE: Say what is true. Do not build sentences as "not because X, but because Y" or "not X, but Y"; use at most one such contrast in the whole devotional, and prefer none. Avoid piling up "not", "never" and "nor".
PASSAGE RULE: Build the body on the main verse. Use a related passage only if it adds something the main verse does not, and never walk through several passages one after another ("Paul says..., John records..., Isaiah says...").

TITLE RULE: A short, specific title drawn from this passage's own image, person, or phrase. Not a formula.

TAKEAWAY FORM FOR TODAY: ${takeawayForm} One or two sentences. Do not begin it with "Name", "Notice", "Identify", or "Today".
${memory}${avoid ? `\nYour last attempt was rejected because ${avoid}. Write it again so that problem is gone and nothing else repeats.\n` : ''}
${NO_OVER_FAMILIARITY}
${NO_EM_DASH_RULE}

Respond with valid JSON only - no markdown, no code fences:
{
  "title": "short evocative title - not generic",
  "body": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "takeaway": "one or two sentences in today's takeaway form"
}`
}

async function generateDevotional(
  date: string,
  themeName: string,
  verse: { text: string; reference: string },
  relatedBlock: string,
  maxAttempts = 4,
): Promise<DevotionalDraft> {
  const past = await loadPastDevotionals(date)
  const memory = memoryBlock(past, themeName)
  const form = takeawayFormForDate(date)

  let avoid: string | null = null
  const tried: { draft: DevotionalDraft; score: number }[] = []

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1400,
      temperature: 0.8,
      system: buildSystem(themeName, verse, relatedBlock, form, memory, avoid),
      messages: [{ role: 'user', content: "Write today's shared devotional." }],
    })

    const block = msg.content[0]
    const raw = block.type === 'text' ? block.text : ''
    if (!raw.trim()) throw new Error('AI returned empty response')

    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(cleaned) as { title?: string; body?: string[]; takeaway?: string }
    if (!parsed?.title || !Array.isArray(parsed?.body) || !parsed.body.length) {
      throw new Error('AI returned invalid JSON structure')
    }

    const draft: DevotionalDraft = {
      title: sanitizeText(parsed.title),
      body: parsed.body.map((p) => sanitizeText(p)),
      takeaway: sanitizeText(parsed.takeaway ?? ''),
      attempts: attempt,
    }
    const reason = collisionReason(draft.title, draft.body, draft.takeaway, past)
    if (!reason) return draft
    const bodyOnly = /^(the body|one paragraph)/.test(reason)
    tried.push({ draft, score: bodyScore(draft.body) + (bodyOnly ? 0 : 100) })
    console.warn(`[devotional] attempt ${attempt} rejected: ${reason}`)
    avoid = reason
  }
  // Nothing passed: publish the least-bad attempt rather than nothing.
  tried.sort((x, y) => x.score - y.score)
  return tried[0].draft
}

// ── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!(await isServiceToken(token))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    let bodyIn: { date?: string; backfill?: boolean; limit?: number; dry_run?: boolean } = {}
    try { bodyIn = await req.json() } catch { /* empty body is fine */ }

    // Backfill mode: generate covers for existing rows missing cover_image_url.
    if (bodyIn.backfill) {
      const limit = Math.min(Math.max(Number(bodyIn.limit ?? 5), 1), 30)
      const summary = await runBackfill(limit)
      return new Response(
        JSON.stringify({ ok: true, mode: 'backfill', ...summary }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Normal mode: generate a devotional (defaults to tomorrow UTC).
    let date = tomorrowISO()
    if (bodyIn.date && /^\d{4}-\d{2}-\d{2}$/.test(bodyIn.date)) date = bodyIn.date
    const dryRun = bodyIn.dry_run === true

    // Skip text generation if the row already exists, but still backfill the
    // cover on that row if it doesn't have one yet.
    const { data: existing } = dryRun ? { data: null } : await supabase
      .from('daily_devotionals')
      .select('date, theme, title, takeaway, cover_image_url')
      .eq('date', date)
      .maybeSingle()
    if (existing) {
      const row = existing as { date: string; theme: string; title: string; takeaway: string | null; cover_image_url: string | null }
      if (!row.cover_image_url) {
        const url = await generateAndStoreCover(row.date, row.theme, row.title, row.takeaway ?? '')
        if (url) await supabase.from('daily_devotionals').update({ cover_image_url: url }).eq('date', row.date)
        return new Response(
          JSON.stringify({ ok: true, date, skipped: 'text-exists', cover_generated: !!url }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      return new Response(
        JSON.stringify({ ok: true, date, skipped: true, reason: 'already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Pick a verse for the weekday theme with an 8-occurrence no-repeat.
    const themeName = themeForDate(date)
    const { data: poolRows, error: poolErr } = await supabase
      .from('verses')
      .select('id, reference, text')
      .eq('is_active', true)
      .eq('theme', themeName)
    if (poolErr || !poolRows?.length) {
      throw new Error(`No active verses for theme: ${themeName}`)
    }
    const pool = poolRows as { id: number; reference: string; text: string }[]

    const { data: recentRows } = await supabase
      .from('daily_devotionals')
      .select('verse_id')
      .eq('theme', themeName)
      .order('date', { ascending: false })
      .limit(8)
    const recent = new Set(
      ((recentRows ?? []) as { verse_id: number | null }[]).map((r) => r.verse_id),
    )
    const fresh = pool.filter((v) => !recent.has(v.id))
    const candidates = fresh.length ? fresh : pool
    const chosen = candidates[Math.floor(Math.random() * candidates.length)]
    const related = pool
      .filter((v) => v.id !== chosen.id)
      .slice(0, 3)
      .map((v) => ({ ref: v.reference, text: v.text }))

    // Generate the devotional.
    const relatedBlock = related.length
      ? `\nRelated passages (already shown to the reader; do not restate their full text in the body):\n${related.map((r) => `- ${r.ref}: ${r.text}`).join('\n')}\n`
      : ''

    const draft = await generateDevotional(date, themeName, { text: chosen.text, reference: chosen.reference }, relatedBlock)
    const { title, body, takeaway } = draft

    if (dryRun) {
      return new Response(
        JSON.stringify({ ok: true, dry_run: true, date, theme: themeName, verse: chosen.reference, attempts: draft.attempts, title, body, takeaway }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Persist text first (first-writer-wins).
    const { error: persistError } = await supabase.from('daily_devotionals').upsert(
      {
        date,
        theme: themeName,
        verse_id: chosen.id,
        verse_text: chosen.text,
        verse_reference: chosen.reference,
        title,
        body,
        related,
        takeaway,
      },
      { onConflict: 'date', ignoreDuplicates: true },
    )
    if (persistError) throw new Error(`persist failed: ${persistError.message}`)

    // Generate cover after text is safely stored. Failure is non-fatal.
    const coverUrl = await generateAndStoreCover(date, themeName, title, takeaway)
    if (coverUrl) {
      await supabase.from('daily_devotionals').update({ cover_image_url: coverUrl }).eq('date', date)
    }

    return new Response(
      JSON.stringify({ ok: true, date, theme: themeName, title, attempts: draft.attempts, cover_generated: !!coverUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[generate-daily-devotional] error:', err)
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
