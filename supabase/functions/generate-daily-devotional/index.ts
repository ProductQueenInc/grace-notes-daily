// supabase/functions/generate-daily-devotional/index.ts
// Day-ahead cron: pre-generates the shared daily devotional for a given date
// (defaults to tomorrow UTC) AND its AI-generated nature cover image. Safe
// to call multiple times - skips text generation if a row already exists,
// and backfills a missing cover image on that same row when needed.
// Scheduled by pg_cron at 09:00 UTC daily.
//
// Modes (POST body):
//   {}                              -> generate tomorrow (default)
//   { "date": "YYYY-MM-DD" }        -> generate that specific date
//   { "backfill": true, "limit": N} -> backfill covers for the N oldest rows
//                                      missing cover_image_url (default 5)
//
// PROMPT POLICY: the devotional system prompt below mirrors
// getOrCreateSharedDevotional in src/lib/ai.functions.ts, and the cover
// prompt mirrors buildCoverPrompt in src/lib/devotional-cover.server.ts.
// If you change one, change the other (edge functions can't import from src/).

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') ?? ''
const COVER_BUCKET = 'devotional-covers'
const IMAGE_MODEL = 'google/gemini-3.1-flash-image'
const IMAGE_GATEWAY = 'https://ai.gateway.lovable.dev/v1/images/generations'
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

Vary the entry point every time. Rotate across these approaches instead of settling into one:
- a scene already in motion, no setup
- direct address to the reader mid-action ("you" doing something specific)
- a flat statement with no framing at all
- a small first-person confession
- a single sharp, unexplained image
- a remembered or overheard line

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

function coverPublicUrl(date: string): string {
  return `${SITE_BASE_URL}/api/public/devotional-cover/${date}.png`
}

function buildCoverPrompt(theme: string, title: string, takeaway: string): string {
  return `A reverent nature photograph that accompanies a Christian devotional titled "${title}" on the theme of ${theme}.

The image should make the viewer feel something aligned with the theme. Use the takeaway only for emotional tone, NOT for literal depiction:
"${takeaway}"

STYLE: cinematic, painterly natural light, quiet, atmospheric, contemplative. Wide landscape 16:9 orientation. Subjects that stir feeling - a stormy sky for grief, a wide-open calm field for rest, dawn light through mist for hope, a lantern-lit path at night for courage, dew on grass at first light for gratitude, still water for peace, a single tree standing against wind for purpose.

ALLOWED: forests, meadows, mountains, valleys, still water, rivers, oceans, mist, fog, dawn skies, night skies, storms, rain, snow, wildflowers, trees, plants, leaves, moss, stone, open fields, distant paths, gardens.

STRICTLY FORBIDDEN: any human figure or body part (hands, silhouettes, shadows of people), any text or lettering or watermarks, any religious symbols (crosses, doves, chalices, angels, halos), any brand logos, farmed animals or slaughter imagery, weapons, alcohol, cigarettes, vehicles, buildings (except a distant fence, footbridge, or dirt path at most), any commercial or man-made imagery. Do not draw a cross out of tree branches or clouds.`
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function generateAndStoreCover(
  date: string,
  theme: string,
  title: string,
  takeaway: string,
): Promise<string | null> {
  if (!LOVABLE_API_KEY) {
    console.warn('[cover] LOVABLE_API_KEY missing; skipping image generation')
    return null
  }
  try {
    const res = await fetch(IMAGE_GATEWAY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': LOVABLE_API_KEY },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [{ role: 'user', content: buildCoverPrompt(theme, title, takeaway) }],
        modalities: ['image', 'text'],
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error(`[cover] gateway ${res.status}:`, text.slice(0, 500))
      return null
    }
    const json = (await res.json()) as { data?: { b64_json?: string }[] }
    const b64 = json?.data?.[0]?.b64_json
    if (!b64) {
      console.error('[cover] gateway returned no b64_json')
      return null
    }
    const bytes = base64ToBytes(b64)
    const { error } = await supabase.storage
      .from(COVER_BUCKET)
      .upload(`${date}.png`, bytes, { contentType: 'image/png', upsert: true, cacheControl: '31536000' })
    if (error) {
      console.error(`[cover] upload failed for ${date}:`, error.message)
      return null
    }
    return coverPublicUrl(date)
  } catch (err) {
    console.error('[cover] unexpected error:', err)
    return null
  }
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
  const results: { date: string; ok: boolean; url?: string }[] = []
  for (const row of targets) {
    const url = await generateAndStoreCover(row.date, row.theme, row.title, row.takeaway ?? '')
    if (url) {
      const { error: updErr } = await supabase
        .from('daily_devotionals')
        .update({ cover_image_url: url })
        .eq('date', row.date)
      if (updErr) console.error(`[backfill] update failed for ${row.date}:`, updErr.message)
    }
    results.push({ date: row.date, ok: !!url, url: url ?? undefined })
  }
  return { processed: results.length, results }
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
    let bodyIn: { date?: string; backfill?: boolean; limit?: number } = {}
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

    // Skip text generation if the row already exists, but still backfill the
    // cover on that row if it doesn't have one yet.
    const { data: existing } = await supabase
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

    const system = `Write today's GraceNotes Daily devotional. This devotional is shared - the same one goes to everyone today - so write it generalized, not personalized. Today's theme is ${themeName}.

The verse for today has already been chosen and will be shown to the reader. Build the devotional around it. Do NOT introduce, quote, or invent any other scripture beyond this verse and the related passages listed below.
Verse of the day: "${chosen.text}" - ${chosen.reference}${relatedBlock}

Third-person teaching voice (not a letter from God). One unified spiritual thought, not assembled parts.
Open with a small concrete tension, move through biblical insight, land on one practical thing to hold today.
Be biblically grounded. Be specific. Never preachy. Never generic.
Write it deep enough to matter, but general enough that a reader who is not personally in this theme today could send it to someone in their life who is walking through it. Do not assume the reader's circumstances.
Don't reference time of day or what part of the day this is being read.

${OPENING_RULE}

GENDER RULE: Never use gendered pronouns for the reader. Use "you" and "your". If third-person is unavoidable, use "they" or "them".
STRUCTURE RULE: No three-part parallel structure, no rhetorical triplets, no rule-of-threes. Vary sentence shape and length.

${NO_OVER_FAMILIARITY}
${NO_EM_DASH_RULE}

Respond with valid JSON only - no markdown, no code fences:
{
  "title": "short evocative title - not generic",
  "body": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "takeaway": "2 sentences, concrete and specific. Something to actually do or hold today."
}`

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 900,
      temperature: 0.7,
      system,
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

    const title = sanitizeText(parsed.title)
    const body = parsed.body.map((p) => sanitizeText(p))
    const takeaway = sanitizeText(parsed.takeaway ?? '')

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
      JSON.stringify({ ok: true, date, theme: themeName, title, cover_generated: !!coverUrl }),
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
