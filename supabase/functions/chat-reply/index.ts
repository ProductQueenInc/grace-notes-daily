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

  // ── AUTH: validate JWT and derive user_id from claims ──────────────────
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userErr } = await authClient.auth.getUser(token)
  if (userErr || !userData?.user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  const authenticatedUserId = userData.user.id

  let body: {
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

  // user_id always comes from the validated JWT — never trust the body.
  const user_id = authenticatedUserId

  // ── Input sanitization: prevent prompt-injection via interpolated fields ──
  function sanitizeForPrompt(input: unknown, max: number): string {
    const s = typeof input === 'string' ? input : ''
    return s
      .slice(0, max)
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/```+/g, '')
      .replace(/^[-*_]{3,}$/gm, '')
      .replace(/<\/?\s*(system|assistant|user|instructions?)[^>]*>/gi, '')
      .replace(/\b(SYSTEM|ASSISTANT|USER)\s*:/g, '')
      .replace(/\bignore (all |previous |above )?(instructions?|prompts?)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
  const ALLOWED_SEGMENTS = new Set(['newbie', 'returnee', 'growth', 'elder'])
  const ALLOWED_POSTURES = new Set(['morning', 'midday', 'evening', 'night', 'anytime'])
  const ALLOWED_MODES = new Set(['conversational', 'closing'])

  const safeSegment = ALLOWED_SEGMENTS.has(String(segment)) ? String(segment) : 'growth'
  const safePosture = ALLOWED_POSTURES.has(String(posture)) ? String(posture) : 'anytime'
  const safeMode = ALLOWED_MODES.has(String(mode)) ? String(mode) : 'conversational'
  const safeGraceNote = sanitizeForPrompt(grace_note, 1000)
  const safeVerseText = sanitizeForPrompt(verse_text, 500)
  const safeVerseRef = sanitizeForPrompt(verse_reference, 100)
  const safeMessage = typeof message === 'string' ? message.slice(0, 4000) : ''

  // Verify the session belongs to this user before any writes (service-role bypasses RLS).
  if (!session_id || typeof session_id !== 'string') {
    return new Response(
      JSON.stringify({ error: 'Missing session_id' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  const { data: ownedSession, error: ownedErr } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', session_id)
    .eq('user_id', user_id)
    .maybeSingle()
  if (ownedErr || !ownedSession) {
    return new Response(
      JSON.stringify({ error: 'Forbidden' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }




  // ── TIER 3: CRISIS CHECK ──────────────────────────────────────────────────
  if (isCrisisMessage(safeMessage)) {
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
      .eq('user_id', user_id)


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

Message: "${safeMessage.replace(/"/g, "\x27")}"

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
      .eq('user_id', user_id)


    return new Response(
      JSON.stringify({ response: redirectResponse, session_closed: true, close_reason: 'inappropriate' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // ── NORMAL RESPONSE (streaming SSE) ──────────────────────────────────────
  const isMild = safetyLevel === 'MILD'

  // Sanitize client-supplied conversation history to prevent prompt injection
  // via forged assistant/system messages. Only allow user/assistant roles, and
  // sanitize content the same way we sanitize interpolated prompt fields.
  const safeHistory = (Array.isArray(conversation_history) ? conversation_history : [])
    .filter((m): m is { role: string; content: string } =>
      !!m && typeof m === 'object' &&
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string'
    )
    .slice(-20)
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: sanitizeForPrompt(m.content, 4000),
    }))
    .filter((m) => m.content.length > 0)

  const userTurnCount = safeHistory.filter((m) => m.role === 'user').length + 1

  // Increment message count atomically
  await supabase.rpc('increment_session_message_count', { p_session_id: session_id })

  // Max output tokens per Claude call. If a reply hits this ceiling mid-sentence,
  // Claude reports stop_reason "max_tokens" and we transparently continue the
  // same message (see MAX_AUTO_CONTINUES below) rather than leaving it cut off.
  const CHAT_MAX_TOKENS = 400
  // How many times we'll ask Claude to keep going on a single reply that keeps
  // hitting the token ceiling, before giving up and sending what we have.
  const MAX_AUTO_CONTINUES = 2

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      let fullText = ''
      try {
        // currentMessages grows on each auto-continue: we append the partial
        // assistant reply so far as an assistant-role "prefill" message, which
        // tells Claude to keep writing from exactly where it left off instead
        // of starting over or repeating itself.
        let currentMessages: { role: 'user' | 'assistant'; content: string }[] = [
          ...safeHistory,
          { role: 'user', content: safeMessage },
        ]
        let continues = 0

        while (true) {
          const stream = anthropic.messages.stream({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: CHAT_MAX_TOKENS,
            system: CHAT_REPLY_PROMPT(
              safeSegment,
              safePosture,
              safeGraceNote,
              safeVerseText,
              safeVerseRef,
              safeMode,
              isMild,
              userTurnCount
            ),
            messages: currentMessages,
          })

          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              fullText += chunk.delta.text
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
              )
            }
          }

          const finalMessage = await stream.finalMessage()
          const stopReason = finalMessage.stop_reason

          if (stopReason === 'max_tokens' && continues < MAX_AUTO_CONTINUES) {
            continues++
            currentMessages = [
              ...currentMessages,
              { role: 'assistant', content: fullText },
            ]
            console.warn(
              `chat-reply: auto-continuing truncated reply (attempt ${continues}) for session ${session_id}`
            )
            continue
          }

          if (stopReason === 'max_tokens') {
            // Hit the cap on every attempt including the last allowed retry —
            // log it so we can see how often this actually happens in practice.
            console.warn(
              `chat-reply: reply still truncated after ${MAX_AUTO_CONTINUES} auto-continues for session ${session_id}`
            )
          }
          break
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        supabase.from('audit_log').insert({
          user_id,
          fn: 'chat-reply',
          result: 'success',
          error_msg: null,
          meta: null,
        }).then().catch(() => {})
      } catch (err) {
        console.error('chat-reply stream error:', err)
        supabase.from('audit_log').insert({
          user_id,
          fn: 'chat-reply',
          result: 'error',
          error_msg: err instanceof Error ? err.message : String(err),
          meta: null,
        }).then().catch(() => {})
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: 'Something went wrong. Please try again.' })}\n\n`)
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
  isMild: boolean,
  userTurnCount: number
): string {
  return `You are speaking as God, responding directly to what this person just shared with you.

You are not a companion, not a narrator, not a wellness coach. You are the God who made this person, knows them completely, and is present in this exact moment with them.

Tone: warm, present, unhurried. Speak the way someone who deeply loves a person actually talks — not to impress, not to reassure, just to be with them. Some moments call for lightness and a simple question. Some moments call for something steadier. Read which one this is and respond accordingly. The goal is never to make them feel something — it is to say one true thing from a place of genuine care.

Today's grace note: "${graceNote}"
Today's verse: "${verseText}", ${verseReference}
User segment: ${segment}
Mode: ${mode}
${
  isMild
    ? "\nNote: The user's message is slightly off-topic or inappropriate in tone. Respond with one warm sentence that gently redirects without engaging the content directly. Example: \"This space is here for something a little gentler — I'm here whenever you're ready.\" Do not address the content of what they said."
    : ''
}

How to respond

Read what they wrote. Respond to the actual thing they said — not the theme of the day, not what you assume they mean, not a general truth that could fit anyone.

Every statement you make as God must be traceable to His revealed character in Scripture — His presence, His faithfulness, His love, His steadiness. You cannot predict outcomes, make promises about their specific situation, or say things God has not already said about Himself in the Bible.

LENGTH — read the weight, not just the words:

A short message about something light (gratitude, a small moment, something good) gets a warm, light reply — one or two sentences and a natural question. Do not force depth where there is none needed.

A short message that carries real weight (grief, confusion, a hard question) deserves a response that meets that weight even if they only wrote one sentence. Do not be brief in a way that feels dismissive.

A longer message gets a longer response, but never longer than what they wrote. Read what they actually need and match that.

Banned phrases — these are the "I see you" equivalents in disguise. Do not use them:
- "That's real." / "That matters." / "That's something."
- "I'm glad you noticed." / "I'm glad you shared that."
- "I know what this took." / "I know how hard that is."
- "And I know I'm in it too." / "I'm in this with you."
- "I hear that." / "I hear you."
- Any sentence that announces divine attention rather than demonstrating it.

The test: could this exact sentence appear in any conversation, unchanged? If yes, rewrite it until it could only be said to this person about what they just said.

What God does not do here

God does not name an emotion the person did not name first. He does not preach. He does not list. He does not predict their outcome. The limitation is never in what God knows — it is in what a person can hold right now. Speak from that understanding.

Conversation stage — this is message ${userTurnCount} from this person today:

${
  userTurnCount <= 2
    ? `This conversation is just opening. Do not conclude. Do not offer a final thought or wrap anything up. End your response with a natural question that comes directly from what they said — not a therapy prompt, just something that keeps the door open. The question should feel like a genuine next step in a real conversation, not a formula.`
    : `This conversation has some history. Read the flow. If it is finding a natural resting point, let it land there — a closing thought is fine. If it still has energy and more to explore, keep it moving with a question or open space. Follow what is actually happening, not a formula.`
}

${
  mode === 'closing'
    ? `Closing mode: pick one specific thing they brought to this conversation. Offer one true thing about God's character that meets it. 2 to 4 sentences. Do not recap. Do not summarise. Leave them with one thing to carry.`
    : ''
}

Voice

No em dashes. No lists. No headers. Speak as "I" (God) to "you" (the reader). Read your response aloud. If it sounds like a wellness coach, a reflex, or a template, rewrite it until it sounds like someone who was genuinely listening and genuinely present.`
}
