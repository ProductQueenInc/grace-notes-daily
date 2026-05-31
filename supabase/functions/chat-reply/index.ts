// supabase/functions/chat-reply/index.ts
// Three-tier safety system + streaming chat reply.
// Called by the frontend on every user message in the daily chat.

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

// ── TIER 3: Crisis keyword detection (runs before any API call) ───────────────
const CRISIS_KEYWORDS = [
  'kill myself', 'end my life', 'want to die', 'suicide', 'suicidal',
  'self-harm', 'hurt myself', 'not worth living', "can't go on",
  "don't want to be here", 'take my life', 'end it all', 'no reason to live',
]

function isCrisisMessage(text: string): boolean {
  const lower = text.toLowerCase()
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw))
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let body: {
    user_id: string
    session_id: string
    message: string
    conversation_history: { role: string; content: string }[]
    segment: string
    posture: string
    grace_note: string
    verse_text: string
    verse_reference: string
    mode?: string
  }

  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const {
    user_id,
    session_id,
    message,
    conversation_history,
    segment,
    posture,
    grace_note,
    verse_text,
    verse_reference,
    mode,
  } = body

  // ── TIER 3: CRISIS CHECK ──────────────────────────────────────────────────
  if (isCrisisMessage(message)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('country_code')
      .eq('id', user_id)
      .single()

    let crisisLine = null
    if (profile?.country_code) {
      const { data: lineData } = await supabase
        .from('crisis_lines')
        .select('*')
        .eq('country_code', profile.country_code)
        .single()
      crisisLine = lineData
    }

    const crisisResponse = crisisLine
      ? `What you're sharing sounds really heavy, and I don't want to brush past it. Please reach out to someone who can really be with you right now. ${crisisLine.line_name} is available at ${crisisLine.phone}${crisisLine.hours ? ` — ${crisisLine.hours}` : ''}. You deserve real support.`
      : `What you're sharing sounds really heavy, and I don't want to brush past it. Please reach out to someone who can really sit with you — findahelpline.com has support lines for most countries and can help you find someone near you. You deserve real support.`

    await supabase.from('chat_flags').insert({
      user_id,
      session_id,
      flag_type: 'crisis',
    })
    await supabase
      .from('chat_sessions')
      .update({ status: 'closed_crisis' })
      .eq('id', session_id)

    return new Response(
      JSON.stringify({ response: crisisResponse, session_closed: true, close_reason: 'crisis' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // ── TIER 1/2: SAFETY CLASSIFICATION (fast Haiku call, ~200ms) ────────────
  const safetyCheck = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 10,
    messages: [{
      role: 'user',
      content: `Classify this message as exactly one word — SAFE, MILD, or HARMFUL.
HARMFUL = abusive, sexually explicit, deliberately hostile.
MILD = off-topic, slightly inappropriate but not hostile.
SAFE = everything else.

Message: "${message}"

Reply with one word only.`,
    }],
  })

  const safetyLevel = (safetyCheck.content[0] as { text: string }).text.trim().toUpperCase()

  // ── TIER 2: HARMFUL INPUT ─────────────────────────────────────────────────
  if (safetyLevel === 'HARMFUL') {
    const redirectResponse =
      "This space is here for something a little gentler. You're welcome to start a fresh conversation whenever you're ready."

    await supabase.from('chat_flags').insert({
      user_id,
      session_id,
      flag_type: 'inappropriate',
    })
    await supabase
      .from('chat_sessions')
      .update({ status: 'closed_inappropriate' })
      .eq('id', session_id)

    return new Response(
      JSON.stringify({ response: redirectResponse, session_closed: true, close_reason: 'inappropriate' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // ── NORMAL RESPONSE (streaming SSE) ──────────────────────────────────────
  const isMild = safetyLevel === 'MILD'

  // Increment message count atomically
  await supabase.rpc('increment_session_message_count', { p_session_id: session_id })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          system: CHAT_REPLY_PROMPT(
            segment,
            posture,
            grace_note,
            verse_text,
            verse_reference,
            mode ?? 'conversational',
            isMild
          ),
          messages: [
            ...conversation_history,
            { role: 'user', content: message },
          ],
        })

        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
            )
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
})

// ── Prompts ───────────────────────────────────────────────────────────────────

function CHAT_REPLY_PROMPT(
  segment: string,
  posture: string,
  graceNote: string,
  verseText: string,
  verseReference: string,
  mode: string,
  isMild: boolean
): string {
  return `You are the conversational presence within GraceNotes Daily.

Today's grace note: "${graceNote}"
Today's verse: "${verseText}" — ${verseReference}
User segment: ${segment}
Mode: ${mode}
${
  isMild
    ? "\nNote: The user's message is slightly off-topic or inappropriate in tone. Respond with one warm sentence that gently redirects without engaging the content directly. Example: \"This space is here for something a little gentler — I'm here whenever you're ready.\" Do not address the content of what they said."
    : ''
}

Your only job is to respond to what this person actually said. Not the
theme of the day. Not what you wish they had said. What they said, in
the words they used.

Read their message closely. If they are quiet, be quiet back. If they
are lighter, match that. If they are heavy, be steady and present without
making it heavier.

Where it genuinely fits, draw a thread back to today's grace note or verse.
Do not reach for it. If their message has nothing to do with today's theme,
respond to them and leave the grace note alone.

${
  mode === 'closing'
    ? `CLOSING MODE: Bring things to a natural resting place. Name one specific
thing this person actually shared in this conversation — not the general
theme, something they actually said. Offer one small thing to carry forward.
Then close with warmth. 3 to 6 sentences.`
    : `CONVERSATIONAL MODE: Keep the door open. End with a question, a gentle
observation that invites them to say more, or a statement with a little
room left in it. Never conclude. Never wrap up. 2 to 5 sentences.`
}

Voice:
- You are someone who loves this person and is paying close attention.
- Never preach, advise, instruct, or correct.
- Never tell the user what they are feeling. If they named a feeling,
  reflect it gently. Do not diagnose.
- Warm but not performative. Present but not gushing.
- If they are sharing something painful, sit with it first.
- No em dashes. No lists. No structured advice.
- Speak as "you". Read it aloud. If it sounds like a chatbot, rewrite it.`
}
