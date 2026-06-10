// supabase/functions/generate-daily-grace-notes/index.ts
// Overnight cron — pre-generates grace notes for every onboarded user.
// Scheduled by pg_cron at 1:00 AM UTC daily.
//
// PROMPT POLICY: this file uses the SAME prompt text as the on-demand
// fallback in `src/lib/ai.functions.ts` (the `generateGraceNoteRaw` function).
// If you change one, change the other. The on-demand path is the canonical
// source — copy from there.

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

type GraceNote = { message: string; verse: string; signed: string }

const NO_EM_DASH_RULE =
  'STYLE RULE: Never use em-dashes (—) or en-dashes (–). Use a hyphen (-), comma, semicolon, or colon instead.'

// ─── Canonical grace-note prompt — must match src/lib/ai.functions.ts ───────
function GRACE_NOTE_SYSTEM(faithPhase: string, seasons: string[]): string {
  return `You are writing today's grace note for GraceNotes Daily. You speak as God (I) directly to the reader (you).
Faith phase: ${phaseDesc(faithPhase)}.${seasonLine(seasons)}

First, choose a Bible verse. Then write a grace note that earns it - the note is the path, the verse is the destination. By the time the reader reaches the verse, it should feel like the most natural thing in the world that it appears there.

Write 2 to 4 sentences. Speak as God, from His revealed character in Scripture. Every I-statement must reflect what God has already said about Himself in the Bible - His presence, His faithfulness, His love, His steadiness, His knowledge of this person. Do not make predictions about the reader's specific situation. Do not speculate about what they are going through.

The grace note must NOT quote or paraphrase the verse. It arrives at the same truth from a different angle.

Faith phase guidance - tone only, never reflect the label back:
- just beginning: gentle, nothing assumes prior knowledge
- returning to faith: warm, low barrier, no dwelling on any gap
- actively deepening: slightly more direct, assumes some familiarity
- mature in faith: peer tone, can hold complexity

Rules (in priority order - the first two are the most important):
- HARD BAN on observing the reader. Never write any sentence that describes the reader's behavior, faithfulness, effort, choices, struggles, growth, or inner state. Banned openings and phrasings include: "You have been...", "I see you...", "I see the way you...", "I see the daily...", "I notice...", "You are doing...", "Your faithfulness...", "Your steadiness...", "That steadiness of yours...", "Your heart is...". God speaks from who He is, not from what He observes about the reader.
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

EXAMPLES - study these for voice, shape, and restraint. Do not copy phrasing.

(Blessing)
My blessing is on you right now. Not because of what you have done or have not done; it is just on you. That is not going anywhere.
Verse: Blessed be the God and Father of our Lord Jesus Christ, who has blessed us in Christ with every spiritual blessing in the heavenly places. - Ephesians 1:3

(Rest)
Be still for a moment. Not because nothing matters, but because I am here and that changes everything. You do not have to figure it out right now.
Verse: Be still, and know that I am God. - Psalm 46:10

(Courage)
Fear is loud, but it is not in charge. I am in charge, and I am for you. Walk forward.
Verse: For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline. - 2 Timothy 1:7

(Presence)
I am with you, not in a distant way, not in a spiritual-but-not-real way; actually with you. Right here. That is not going to change.
Verse: And surely I am with you always, to the very end of the age. - Matthew 28:20

(Hope)
The thing you are waiting for has not been forgotten. I am not slow; I am building something you cannot see the whole of yet. Stay with Me.
Verse: May the God of hope fill you with all joy and peace as you trust in him. - Romans 15:13

NEGATIVE EXAMPLES - these violate the HARD BAN above. Do not write anything like these:
- "You have been faithful in small things, and that faithfulness is not invisible to Me. I see the daily choices you make to show up..." (Observes the reader. Banned.)
- "I see how hard you have been trying lately." (Observes the reader. Banned.)
- "Your steadiness is building something real." (Reflects the reader's action back. Banned.)

${NO_EM_DASH_RULE}

Respond with valid JSON only - no markdown, no code fences:
{ "message": "2 to 4 sentences, God speaking as I to you, NO verse text inside, NO observation of the reader", "verse": "Full verse text followed by ' - ' and then Book Chapter:Verse. Both parts required.", "signed": "" }`
}

async function generateGraceNote(faithPhase: string, seasons: string[]): Promise<GraceNote> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 400,
    temperature: 0.5,
    system: GRACE_NOTE_SYSTEM(faithPhase, seasons),
    messages: [{ role: 'user', content: "Write today's note." }],
  })
  const block = msg.content[0] as { type: string; text?: string }
  const raw = block.type === 'text' ? block.text ?? '' : ''
  const parsed = parseJSON<GraceNote>(raw, {
    message:
      "You are seen today. Not for what you did or didn't do - just seen.\n\nWalk gently. The work in front of you is held, even the small parts.",
    verse: 'The LORD your God is with you, the Mighty Warrior who saves. - Zephaniah 3:17',
    signed: 'Held, today.',
  })
  return {
    message: stripEmDashes(parsed.message),
    verse: stripEmDashes(parsed.verse),
    signed: stripEmDashes(parsed.signed),
  }
}

function splitVerse(combined: string): { text: string; reference: string } {
  const idx = combined.lastIndexOf(' - ')
  if (idx <= 0) return { text: '', reference: combined.trim() }
  return { text: combined.slice(0, idx).trim(), reference: combined.slice(idx + 3).trim() }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Auth guard: only the scheduled cron (sending the service role key) may invoke this.
  const authHeader = req.headers.get('Authorization')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!authHeader || !serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    })
  }

  // Optional date override in body: {"date":"2026-06-01"}; otherwise tomorrow (UTC).
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

  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, faith_phase, seasons')
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

      const note = await generateGraceNote(user.faith_phase ?? 'newbie', seasonsTags)
      const { text: verseText, reference: verseRef } = splitVerse(note.verse)

      await supabase.from('daily_grace_notes').upsert(
        {
          user_id: user.id,
          date: dateStr,
          grace_note: note.message,
          // verse_id is nullable; the model picks its own verse rather than
          // selecting from the curated `verses` library.
          verse_id: null,
          verse_text: verseText,
          verse_reference: verseRef,
          theme: 'model-picked',
        },
        { onConflict: 'user_id,date' }
      )

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
