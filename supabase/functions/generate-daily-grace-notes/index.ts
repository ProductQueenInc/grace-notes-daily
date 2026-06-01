// supabase/functions/generate-daily-grace-notes/index.ts
// Overnight cron — pre-generates grace notes for all onboarded users.
// Scheduled to run at 1:00 AM UTC daily (see migration SQL for cron setup).

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

// Maps faith_phase to a default posture tag for verse selection
function postureFromPhase(faithPhase: string | null): string {
  const map: Record<string, string> = {
    newbie: 'hope',
    returnee: 'hope',
    growth: 'purpose',
    elder: 'faith',
  }
  return map[faithPhase ?? ''] ?? 'hope'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Auth guard: only the scheduled cron (which sends the service role key) may invoke this.
  const authHeader = req.headers.get('Authorization')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!authHeader || !serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    })
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateStr = tomorrow.toISOString().split('T')[0]

  // Fetch all onboarded users
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, faith_phase')
    .eq('onboarded', true)

  if (usersError || !users) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch users', detail: usersError }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let generated = 0
  let skipped = 0
  let failed = 0

  for (const user of users) {
    try {
      const posture = postureFromPhase(user.faith_phase)

      // Select verse for this user (60-day rotation)
      const { data: verseRows } = await supabase.rpc('select_verse_for_user', {
        p_user_id: user.id,
        p_posture: posture,
        p_segment: user.faith_phase ?? 'newbie',
      })

      if (!verseRows?.length) {
        skipped++
        continue
      }
      const verse = verseRows[0]

      // Generate grace note
      const graceNote = await generateGraceNote(
        user.faith_phase ?? 'newbie',
        posture,
        verse.verse_text,
        verse.reference
      )

      // Log verse as assigned to this user
      await supabase.from('user_verse_log').insert({
        user_id: user.id,
        verse_id: verse.verse_id,
      })

      // Store pre-generated grace note (upsert in case cron runs twice)
      await supabase.from('daily_grace_notes').upsert(
        {
          user_id: user.id,
          date: dateStr,
          grace_note: graceNote,
          verse_id: verse.verse_id,
          verse_text: verse.verse_text,
          verse_reference: verse.reference,
          theme: verse.theme,
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
    JSON.stringify({ date: dateStr, generated, skipped, failed }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

async function generateGraceNote(
  faithPhase: string,
  posture: string,
  verseText: string,
  verseReference: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{ role: 'user', content: GRACE_NOTE_PROMPT(faithPhase, posture, verseText, verseReference) }],
  })
  return (message.content[0] as { text: string }).text.trim()
}

function GRACE_NOTE_PROMPT(
  segment: string,
  posture: string,
  verseText: string,
  verseReference: string
): string {
  return `You are generating the daily grace note for GraceNotes Daily.

User segment: ${segment}
User posture: ${posture}
Today's verse: "${verseText}" — ${verseReference}

Your job is to write a grace note that earns the verse. The verse is the
destination. The grace note is the path to it. By the time the reader
reaches the verse, it should feel like the most natural thing in the world
that it appears there.

Write 2 to 4 sentences. The voice is warm, unhurried, human — like a note
left on someone's table by someone who loves them. You are not teaching.
You are not naming what the reader is going through. You are offering
something true and soft enough that they can receive it wherever they are.

The grace note must not quote or paraphrase the verse. It should arrive at
the same truth from a different angle, so that when the verse appears,
it lands with weight.

Segment guidance — tone only, never reflect the label back to the user:
- newbie: gentle entry, nothing assumes prior knowledge
- returnee: warm, low barrier, no dwelling on any gap
- growth: slightly more direct, assumes some familiarity
- elder: peer tone, can hold complexity

Rules:
- No em dashes
- No three-part parallel structure
- No announcing what you are doing
- Do not tell the reader what they are feeling or have been through
- Speak directly as "you"
- Capitalize pronouns referring to God: He, Him, His
- 2 to 4 sentences only
- Read it aloud. If it sounds written, rewrite it until it sounds spoken.

Return the grace note text only. No labels, no preamble, no explanation.`
}
