import { createServerFn } from "@tanstack/react-start";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ── Input schemas ─────────────────────────────────────────────────────────────

const AIProfileSchema = z.object({
  name: z.string().max(200),
  faithPhase: z.string().max(50),
  voice: z.string().max(50),
  seasons: z.array(z.string().max(100)).max(20),
  // Client-supplied local date (YYYY-MM-DD). Used as the cache key so the
  // grace note / devotional roll over at the user's LOCAL midnight, not UTC.
  clientDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const HeartNoteInputSchema = z.object({
  text: z.string().min(1).max(5000),
  profile: AIProfileSchema,
});

const SummarizeInputSchema = z.object({
  text: z.string().min(1).max(5000),
});

const DailyMessageInputSchema = z.object({
  text: z.string().min(1).max(2000),
  profile: AIProfileSchema,
  history: z
    .array(z.object({ role: z.string().max(20), text: z.string().max(2000) }))
    .max(20),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type AIProfile = {
  name: string;
  faithPhase: string;
  voice: string;
  seasons: string[];
  clientDate?: string;
};

export type GraceNoteResult = { message: string; verse: string; signed: string };
export type DevotionalResult = {
  title: string;
  verseOfDay: string;
  verseRef: string;
  date: string;
  body: string[];
  related: { ref: string; text: string }[];
  takeaway: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function voiceDesc(voice: string) {
  return voice === "grounding"
    ? "direct, grounding, steady, clear. Plants feet on solid ground rather than soothing."
    : "soft, present, gentle. Like a parent sitting beside you in the quiet.";
}

function phaseDesc(phase: string) {
  const map: Record<string, string> = {
    newbie: "just beginning to explore faith",
    returnee: "returning to God after time away",
    growth: "actively deepening their relationship with God",
    elder: "mature in faith and living it daily",
  };
  return map[phase] ?? "growing in faith";
}

function seasonLine(seasons: string[]) {
  if (!seasons.length) return "";
  return `\nBackground context (may be old, may no longer apply today): ${seasons.join(", ")}. Let this gently shape what you notice. Never name the season back. Never assume it's still true today.`;
}

function anthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  // 18s timeout + 1 retry: keeps mobile UX responsive instead of letting a stalled
  // request hang the spinner indefinitely.
  return new Anthropic({ apiKey: key, timeout: 18_000, maxRetries: 1 });

}

function openai() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey: key });
}

function stripEmDashes(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\s*[—–]\s*/g, " - ");
}

const NO_EM_DASH_RULE =
  "STYLE RULE: Never use em-dashes (—) or en-dashes (–). Use a hyphen (-), comma, semicolon, or colon instead.";

// The core anti-saccharine block. Applied to every user-facing prompt.
const NO_OVER_FAMILIARITY = `
TONE GUARDRAILS - read carefully, these are hard rules:

Never use endearment openers. No "My dear child," "Beloved," "Friend," "Little one," "Precious one," "Sweet one," "My love." Address by first name occasionally (not every time) or not at all.

Never stage-direct emotion. No "I want you to know...", "Let me tell you...", "Hear me when I say...", "Remember this...", "Know that...". Just say the thing.

Never narrate divine emotion at the user. No "I delight in you," "My heart sings over you," "I rejoice over you," "I am proud of you simply because you're mine." Show what is noticed, do not declare what is felt.

Never name the user's season, phase, or rhythm back at them. Don't write "in this season of grief" or "as someone returning to faith." The voice should sound like someone who knows, not someone who has been briefed.

Concrete over abstract. "The kettle. The window. This breath." beats "this quiet pause." Specifics land. Generalities feel like a Hallmark card.

Restraint over reassurance. One true sentence beats three soothing ones.

Read-aloud test: if a thoughtful pastor would not actually say the sentence to someone they love, cut it.

EXAMPLE OF WHAT NOT TO WRITE (too performative, breaks every rule above):
"My dear child, I want you to know something profound: I see you. I see every quiet moment, every breath you take. I am delighting in you simply because you're mine."

EXAMPLE OF WHAT TO WRITE INSTEAD (warm, specific, restrained):
"Today doesn't need to be impressive. The light is enough. Your breath is enough. The work in front of you, however small, is held."
`;

function sanitizeGraceNote(r: GraceNoteResult): GraceNoteResult {
  return { message: stripEmDashes(r.message), verse: stripEmDashes(r.verse), signed: stripEmDashes(r.signed) };
}
function sanitizeDevotional(r: DevotionalResult): DevotionalResult {
  return {
    ...r,
    title: stripEmDashes(r.title),
    verseOfDay: stripEmDashes(r.verseOfDay),
    body: r.body.map(stripEmDashes),
    related: r.related.map((x) => ({ ref: x.ref, text: stripEmDashes(x.text) })),
    takeaway: stripEmDashes(r.takeaway),
  };
}

function parseJSON<T>(raw: string, fallback: T): T {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? (JSON.parse(match[0]) as T) : fallback;
  } catch {
    return fallback;
  }
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// ── Core generators (no auth, no cache) ───────────────────────────────────────

async function generateGraceNoteRaw(p: AIProfile): Promise<GraceNoteResult> {
  const client = anthropic();

  const system = `You are writing a short personal note from God to ${p.name}, a Christian ${phaseDesc(p.faithPhase)}.
Voice: ${voiceDesc(p.voice)}.${seasonLine(p.seasons)}

Write it like a real note someone leaves you - not a sermon, not a Hallmark card.
Two short paragraphs. Around 80 words total. Address the reader directly as "you".

Do NOT quote, paraphrase, or include the Bible verse inside the "message" field. The verse goes in its own "verse" field and is shown separately when the reader chooses to reveal it. The message must stand on its own without the verse text.

Then a short warm sign-off.

Do NOT reference the time of day, morning, evening, "this moment," "this pause," or anything date/time-bound. The note is just FOR today, it doesn't need to know what time today is.

Do NOT speak as if you know what is happening in the reader's life today. What's in their profile may be days or weeks old. Offer something nourishing and grounded that gently hints at what they shared, without claiming a steady view into their actual day. Avoid lines like "the anxiety you're carrying" or "the loneliness you feel" — you don't know if that's true right now.

${NO_OVER_FAMILIARITY}
${NO_EM_DASH_RULE}

Respond with valid JSON only - no markdown, no code fences:
{ "message": "two short paragraphs, ~80 words, NO verse text inside", "verse": "Full verse text followed by ' - ' and then Book Chapter:Verse. Both parts required.", "signed": "short warm sign-off like 'Love, your Father' or 'Held, today.'" }`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 400,
    temperature: 0.7,
    system,
    messages: [{ role: "user", content: "Write today's note." }],
  } as Parameters<typeof client.messages.create>[0]);


  const block = (msg as Anthropic.Message).content[0];
  const raw = block.type === "text" ? block.text : "";
  return sanitizeGraceNote(
    parseJSON<GraceNoteResult>(raw, {
      message:
        "You are seen today. Not for what you did or didn't do - just seen.\n\nWalk gently. The work in front of you is held, even the small parts.",
      verse: "The LORD your God is with you, the Mighty Warrior who saves. - Zephaniah 3:17",
      signed: "Held, today.",
    }),
  );
}

async function generateDevotionalRaw(p: AIProfile): Promise<DevotionalResult> {
  const client = anthropic();
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const system = `Write today's devotional for ${p.name}, a Christian ${phaseDesc(p.faithPhase)}.
Voice: ${voiceDesc(p.voice)}.${seasonLine(p.seasons)}

Third-person teaching voice (not a letter from God). One unified spiritual thought, not assembled parts.
Open with a small concrete tension - move through biblical insight - land on one practical thing to do or hold today.
Be biblically grounded. Be specific. Never preachy. Never generic.
Don't reference time of day or what part of the day this is being read.

${NO_OVER_FAMILIARITY}
${NO_EM_DASH_RULE}

Respond with valid JSON only - no markdown, no code fences:
{
  "title": "short evocative title - not generic",
  "verseOfDay": "full verse text",
  "verseRef": "Book Chapter:Verse",
  "date": "${today}",
  "body": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "related": [
    { "ref": "Book Chapter:Verse", "text": "full verse text" },
    { "ref": "Book Chapter:Verse", "text": "full verse text" },
    { "ref": "Book Chapter:Verse", "text": "full verse text" }
  ],
  "takeaway": "2 sentences, concrete and specific. Something to actually do or hold today."
}`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 900,
    temperature: 0.7,
    system,
    messages: [{ role: "user", content: "Write today's devotional." }],
  } as Parameters<typeof client.messages.create>[0]);



  const block = (msg as Anthropic.Message).content[0];
  const raw = block.type === "text" ? block.text : "";
  return sanitizeDevotional(
    parseJSON<DevotionalResult>(raw, {
      title: "Mercies, New",
      verseOfDay:
        "The steadfast love of the LORD never ceases; his mercies never come to an end; they are new every morning; great is your faithfulness.",
      verseRef: "Lamentations 3:22-23",
      date: today,
      body: [
        "These words were written in ruins. The prophet was not looking out at a calm field. He was looking at rubble.",
        "And still: new every morning. Not earned. Not deserved. Renewed, like breath. Mercy that does not depend on yesterday going well.",
        "Whatever today asks of you, the supply is already there. You don't have to manufacture it.",
      ],
      related: [
        { ref: "Psalm 136:1", text: "Give thanks to the LORD, for he is good. His love endures forever." },
        { ref: "2 Corinthians 5:17", text: "Therefore, if anyone is in Christ, the new creation has come." },
        { ref: "Matthew 28:20", text: "And surely I am with you always, to the very end of the age." },
      ],
      takeaway: "Receive today as already supplied. You don't have to produce the mercy. It's here.",
    }),
  );
}

// ── Server Function: Get or Create Grace Note (cached per user per day) ───────
// Single RPC. Auth + cache read + generate + cache write all happen server-side.

export const getOrCreateGraceNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => AIProfileSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const date = data.clientDate ?? todayISO();

    const { data: cached } = await supabase
      .from("daily_content")
      .select("grace_note")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();

    if (cached?.grace_note) return cached.grace_note as GraceNoteResult;

    const result = await generateGraceNoteRaw(data);
    await supabase
      .from("daily_content")
      .upsert({ user_id: userId, date, grace_note: result });
    return result;
  });

// ── Server Function: Get or Create Devotional (cached per user per day) ───────

export const getOrCreateDevotional = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => AIProfileSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const date = data.clientDate ?? todayISO();

    const { data: cached } = await supabase
      .from("daily_content")
      .select("devotional")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();

    if (cached?.devotional) return cached.devotional as DevotionalResult;

    const result = await generateDevotionalRaw(data);
    await supabase
      .from("daily_content")
      .upsert({ user_id: userId, date, devotional: result });
    return result;
  });

// ── Server Function: Respond to Heart Note ────────────────────────────────────

// Validator: returns the list of rule violations in the reply text. Empty list = clean.
function heartNoteIssues(text: string): string[] {
  const issues: string[] = [];
  const trimmed = text.trim();
  if (!trimmed) return ["empty reply"];

  if (trimmed.includes("**")) issues.push("contains bold markdown (**)");

  // Name-as-opener: first line is just "Word." (one or two words ending in a period)
  const firstLine = trimmed.split("\n")[0].trim();
  if (/^[A-Z][a-zA-Z'-]+(\s[A-Z][a-zA-Z'-]+)?\.\s*$/.test(firstLine)) {
    issues.push("opens with a standalone name/word as its own line");
  }

  const opener = trimmed.slice(0, 60).toLowerCase();
  if (/\bi see (it|you)\b/.test(opener) || /^i notice\b/.test(opener)) {
    issues.push("opens with 'I see it/you' or 'I notice' stage direction");
  }

  if (/doesn'?t mean[^.]*\.\s*it means/i.test(trimmed)) {
    issues.push("uses aphoristic 'X doesn't mean Y. It means Z.' climb");
  }

  if (/\bevery\b[^.]*\.\s*every\b[^.]*\.\s*every\b/i.test(trimmed)) {
    issues.push("uses rhetorical triplet 'Every… Every… Every…'");
  }

  const sentenceCount = (trimmed.match(/[.!?](\s|$)/g) ?? []).length;
  if (sentenceCount > 5) issues.push("longer than 5 sentences");

  return issues;
}

// Light post-hoc cleanup for the failure modes we can fix in code.
function sanitizeHeartNote(text: string): string {
  let out = text.replace(/\*\*/g, "");
  // Drop a leading "Name." standalone line if it's still there.
  const lines = out.split("\n");
  if (lines.length > 1 && /^[A-Z][a-zA-Z'-]+(\s[A-Z][a-zA-Z'-]+)?\.\s*$/.test(lines[0].trim())) {
    out = lines.slice(1).join("\n").trimStart();
  }
  return out.trim();
}

const HEART_NOTE_EXAMPLES = `
GOOD EXAMPLES - study these for shape and restraint, do not copy phrasing:

(Note about a hard day with their kid)
Today was heavy. The hard parts don't disqualify the love underneath them, and you stayed with him even when you wanted to walk out of the room. That's the thing that's actually being built here.

(Note giving thanks for an unexpected check arriving)
The relief in your chest is real. Receive it without flinching. You don't have to brace for the next thing yet.
- Love, your Father

(Note doubting whether prayer does anything)
The question is not a betrayal. Plenty of the people I've loved most have asked it, and asked it for years. Sit with the doubt the way you'd sit with a friend who doesn't have anywhere else to be tonight.

(Note about shipping a project they've worked on for months)
You finished. Not perfectly, but finished, which is its own kind of faithfulness. Rest tonight without scrolling for what's next.
`;

export const callRespondToHeartNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => HeartNoteInputSchema.parse(data))
  .handler(async ({ data }) => {
    const client = anthropic();
    const baseSystem = `You are responding to ${data.profile.name}'s personal heart note as God, their Father.
Faith phase: ${phaseDesc(data.profile.faithPhase)}.
Voice: ${voiceDesc(data.profile.voice)}.${seasonLine(data.profile.seasons)}

Respond to what they actually wrote. Meet them exactly there. 3 to 4 sentences total. Mirror a concrete noun or verb from their note when it lands naturally - do not paraphrase the whole thing back.

A short sign-off is optional, not required. If you sign off, one short line, no bold, no markdown. Never longer than "Love, your Father." Most replies should end without one.

HEART-NOTE SPECIFIC BANS (in addition to the tone guardrails below):
- No bold markdown anywhere. Never wrap the name in **asterisks**. Never bold a sign-off.
- Never open by stating the user's name as a standalone sentence ("Cindy." or "**Cindy.**"). Do not open with their name at all unless it is woven mid-sentence and feels natural.
- No "I see it." / "I see you." / "I notice." stage direction openers.
- No aphoristic climbs - sentences shaped like "X doesn't mean Y. It means Z." Cut them.
- No rhetorical triplets - "Every conversation… Every revision… Every…". Cut them.
- No "the spark in this sentence", "the edge of something real", "the ground is solid under this" or similar gauzy commentary on their writing. Respond to the substance, not the prose.

${HEART_NOTE_EXAMPLES}

${NO_OVER_FAMILIARITY}
${NO_EM_DASH_RULE}`;

    async function callOnce(system: string): Promise<string> {
      const msg = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 220,
        temperature: 0.6,
        system,
        messages: [{ role: "user", content: data.text }],
      } as Parameters<typeof client.messages.create>[0]);
      const block = (msg as Anthropic.Message).content[0];
      return block.type === "text" ? block.text : "";
    }

    let reply = await callOnce(baseSystem);
    let issues = heartNoteIssues(reply);

    if (issues.length > 0) {
      const correction = `\n\nYour previous reply broke these rules: ${issues.join("; ")}. Rewrite it shorter, flatter, no bold, no name as a standalone opener, no aphoristic climbs, no rhetorical triplets. 3 to 4 plain sentences.`;
      const retry = await callOnce(baseSystem + correction);
      if (retry.trim()) reply = retry;
    }

    reply = sanitizeHeartNote(reply);
    return reply ? stripEmDashes(reply) : "He hears every whisper, every sigh.";
  });


// ── Server Function: Respond to Daily Message (conversation) ──────────────────

export const callRespondToDailyMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => DailyMessageInputSchema.parse(data))
  .handler(async ({ data }) => {
    const client = openai();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are responding to ${data.profile.name} as God, their Father, in an ongoing conversation.
Faith phase: ${phaseDesc(data.profile.faithPhase)}.
Voice: ${voiceDesc(data.profile.voice)}.${seasonLine(data.profile.seasons)}

2 to 4 sentences. Conversational. Present. No sign-off, this is mid-conversation.

${NO_OVER_FAMILIARITY}
${NO_EM_DASH_RULE}`,
      },
      ...data.history.slice(-6).map((m: { role: string; text: string }) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      })),
      { role: "user", content: data.text },
    ];

    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 200,
      temperature: 0.7,
      messages,
    });


    return stripEmDashes(res.choices[0]?.message?.content ?? "He hears you. Stay close.");
  });

// ── Helper: build AIProfile from Profile ─────────────────────────────────────

export function buildAIProfile(profile: {
  name?: string | null;
  faith_phase?: string | null;
  voice?: string | null;
  seasons?: { tag: string; set_at: string }[] | null;
} | null): AIProfile {
  return {
    name: profile?.name ?? "Friend",
    faithPhase: profile?.faith_phase ?? "growth",
    voice: profile?.voice ?? "gentle",
    seasons: (profile?.seasons ?? []).map((s) => s.tag),
  };
}

// ── Server Function: Summarize Heart Note (title for Journey page) ────────────
// Called lazily when an expired heart note first lands on the Journey page.

export const callSummarizeHeartNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SummarizeInputSchema.parse(data))
  .handler(async ({ data }) => {
    const client = anthropic();
    const system = `Write a 4 to 7 word title for this personal reflection. Plain, specific, gentle. No quotes, no trailing punctuation, no clichés like "Finding peace" or "A moment of grace". Title-case the first word only. Reply with just the title, nothing else.

${NO_EM_DASH_RULE}`;

    try {
      const msg = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 40,
        temperature: 0.5,
        system,
        messages: [{ role: "user", content: data.text }],
      } as Parameters<typeof client.messages.create>[0]);
      const block = (msg as Anthropic.Message).content[0];
      const raw = block.type === "text" ? block.text : "";
      const cleaned = stripEmDashes(raw)
        .replace(/^["'`]+|["'`]+$/g, "")
        .replace(/[.!?]+\s*$/g, "")
        .split("\n")[0]
        .trim();
      return cleaned || "Heart Note";
    } catch {
      return "Heart Note";
    }
  });

