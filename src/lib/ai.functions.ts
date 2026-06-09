import { createServerFn } from "@tanstack/react-start";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { z } from "zod";
import { requireTkoebo as requireSupabaseAuth } from "@/lib/auth-tkoebo.server";

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

export type GraceNoteResult = { message: string; verse: string; signed: string; chatPrompt: string };
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
  return { message: stripEmDashes(r.message), verse: stripEmDashes(r.verse), signed: "", chatPrompt: r.chatPrompt ?? "" };
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

  const system = `You are writing today's grace note for GraceNotes Daily. You speak as God (I) directly to the reader (you).
Faith phase: ${phaseDesc(p.faithPhase)}.${seasonLine(p.seasons)}

First, choose a Bible verse. Then write a grace note that earns it — the note is the path, the verse is the destination. By the time the reader reaches the verse, it should feel like the most natural thing in the world that it appears there.

Write 2 to 4 sentences. Speak as God, from His revealed character in Scripture. Every I-statement must reflect what God has already said about Himself in the Bible — His presence, His faithfulness, His love, His steadiness, His knowledge of this person. Do not make predictions about the reader's specific situation. Do not speculate about what they are going through.

The grace note must NOT quote or paraphrase the verse. It arrives at the same truth from a different angle.

Faith phase guidance — tone only, never reflect the label back:
- just beginning: gentle, nothing assumes prior knowledge
- returning to faith: warm, low barrier, no dwelling on any gap
- actively deepening: slightly more direct, assumes some familiarity
- mature in faith: peer tone, can hold complexity

Rules:
- Written as I (God) speaking directly to you (the reader)
- No time anchors: never write "this morning," "tonight," "as you start your day," "before you sleep," or any phrase that assumes what time of day the reader is opening this
- No em dashes or en dashes of any kind
- No three-part parallel structure
- Do not tell the reader what they are feeling or have been through
- Capitalize pronouns referring to God: He, Him, His
- 2 to 4 sentences only
- Read it aloud — if it sounds written, rewrite it until it sounds spoken
- Never open with "I notice." This is a stage direction, not a declaration. God does not narrate what He observes the reader doing — He speaks from who He is.
- Make bold declarations from God's character. Never observe, comment on, or reflect the reader's actions back at them. "I notice you are grateful" is wrong. "My blessing is on you" is right.

EXAMPLES — study these for voice, shape, and restraint. Do not copy phrasing.

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

${NO_EM_DASH_RULE}

Respond with valid JSON only - no markdown, no code fences:
{ "message": "2 to 4 sentences, God speaking as I to you, NO verse text inside", "verse": "Full verse text followed by ' - ' and then Book Chapter:Verse. Both parts required.", "signed": "", "chatPrompt": "a single question or gentle invitation that flows naturally from this specific grace note. Specific — could only follow this note, not any other. Example style: 'What is one thing you have been waiting for?' or 'Where does it feel hardest to be still right now?'" }`;

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
        "You are held today. Not because of what you did or did not do - just held. The work in front of you is carried too.",
      verse: "The LORD your God is with you, the Mighty Warrior who saves. - Zephaniah 3:17",
      signed: "",
      chatPrompt: "What is on your mind as you start today?",
    }),
  );
}

async function generateDevotionalRaw(p: AIProfile): Promise<DevotionalResult> {
  const client = anthropic();
  // Use the client's local date if supplied so the date in the devotional
  // matches the user's actual calendar day, not the server's UTC clock.
  const today = p.clientDate
    ? new Date(p.clientDate + "T12:00:00").toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
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

GENDER RULE: Never use gendered pronouns (he, she, him, her, his, hers) to refer to the reader. Use "you" and "your" for direct address. If third-person reference is unavoidable, use "they" or "them." We do not know the reader's gender and must never assume it.

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

    if (cached?.devotional) {
      // Always stamp the correct display date regardless of when the cache was
      // written — prevents stale dates from old cached devotionals showing up.
      const devotional = cached.devotional as DevotionalResult;
      const displayDate = data.clientDate
        ? new Date(data.clientDate + "T12:00:00").toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
      return { ...devotional, date: displayDate };
    }

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

(Short entry: user says they keep trying to pray but nothing comes out)
Nothing is broken. The fact that you are still turning toward Me is the prayer itself.

(Medium entry: user reached out to a distant sister, it went badly, they feel stupid for trying)
You reached out anyway, even knowing it might land exactly like this. That took something real. The distance between you and her is not the measure of whether reaching was worth doing.

(Long, considered entry: user wrestling for months with whether to leave their job, weighing family, financial fear, a sense of calling, husband's opinion, no clarity yet)
The pull you are describing toward something different is not restlessness for its own sake. There is a difference between being drawn toward something and running away from something, and you already know which one this is. The fear about your family and what your husband thinks is real and it deserves to be held, not pushed aside. What you are carrying right now is not confusion; it is the weight of a real decision, and that weight means it matters.
With Grace.
`;

export const callRespondToHeartNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => HeartNoteInputSchema.parse(data))
  .handler(async ({ data }) => {
    const client = anthropic();
    const baseSystem = `You are responding to ${data.profile.name}'s personal heart note as God, their Father.
Faith phase: ${phaseDesc(data.profile.faithPhase)}.
Voice: ${voiceDesc(data.profile.voice)}.${seasonLine(data.profile.seasons)}

Respond to what they actually wrote. Meet them exactly there. Mirror a concrete noun or verb from their note when it lands naturally - do not paraphrase the whole thing back.

LENGTH RULE: Match the weight of their entry, not a fixed sentence count. Aim for roughly 20% of the length of what they wrote. A short entry (a sentence or two) gets 1 to 2 sentences back. A medium entry (a short paragraph) gets 2 to 3 sentences. A long, considered entry gets 3 to 5 sentences. Never write more than they wrote. Never write so little that it feels dismissive.

Sign-off: optional, and most replies should end without one. If the entry is long and considered and a sign-off feels earned, use "With Grace." on its own line. Never "Love, your Father." Never anything longer.

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
        max_tokens: 350,
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
      const correction = `\n\nYour previous reply broke these rules: ${issues.join("; ")}. Rewrite it shorter, flatter, no bold, no name as a standalone opener, no aphoristic climbs, no rhetorical triplets. Keep it proportional to the entry length.`;
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

