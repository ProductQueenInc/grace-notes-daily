import { createServerFn } from "@tanstack/react-start";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { z } from "zod";
import { requireTkoebo as requireSupabaseAuth } from "@/lib/auth-tkoebo.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { SupabaseClient } from "@supabase/supabase-js";

// Generated Database types can lag behind migrations (this is why logAudit casts
// supabaseAdmin), so use a schema-agnostic view of the admin client for the
// verse-grounding queries below (RPC + verses + user_verse_log).
const admin = supabaseAdmin as unknown as SupabaseClient;

// ── Audit logging ─────────────────────────────────────────────────────────────
// Fire-and-forget: never awaited, never throws, never slows down the response.

function logAudit(
  userId: string,
  fn: string,
  result: "success" | "cached" | "error",
  opts?: { error_msg?: string; meta?: Record<string, unknown> }
) {
  void (supabaseAdmin as unknown as { from: (t: string) => { insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }> } })
    .from("audit_log")
    .insert({ user_id: userId, fn, result, error_msg: opts?.error_msg ?? null, meta: opts?.meta ?? null })
    .then(({ error }) => { if (error) console.warn("audit_log insert failed:", error.message) })
    .catch(() => {});
}

// ── Input schemas ─────────────────────────────────────────────────────────────

// Strip characters/markers commonly used for prompt-boundary injection.
// Removes backtick fences, role markers, common override phrases, and control chars.
function sanitizeForPrompt(input: string): string {
  return input
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/```+/g, "")
    .replace(/^[-*_]{3,}$/gm, "")
    .replace(/<\/?\s*(system|assistant|user|instructions?)[^>]*>/gi, "")
    .replace(/\b(SYSTEM|ASSISTANT|USER)\s*:/g, "")
    .replace(/\bignore (all |previous |above )?(instructions?|prompts?)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

const safeStr = (max: number) =>
  z.string().max(max).transform(sanitizeForPrompt);

const AIProfileSchema = z.object({
  name: safeStr(200),
  faithPhase: safeStr(50),
  voice: safeStr(50),
  seasons: z.array(safeStr(100)).max(20),
  // Client-supplied local date (YYYY-MM-DD). Used as the cache key so the
  // grace note / devotional roll over at the user's LOCAL midnight, not UTC.
  clientDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // Recent verse references used in previous grace notes — injected at generation
  // time to prevent the same verse / theme repeating on consecutive days.
  recentVerses: z.array(z.string().max(200)).max(14).optional(),
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
  recentVerses?: string[];
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
  // AI-generated nature cover image (public proxy URL). Null when generation
  // failed or the row was created before cover images shipped.
  coverImageUrl?: string | null;
  // Present only when the requested date's devotional could not be generated
  // or persisted and the most recent stored devotional was served instead
  // (see the fallback branch in getOrCreateSharedDevotional). servedDate is
  // the YYYY-MM-DD of the row actually returned.
  isFallback?: boolean;
  servedDate?: string;
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

// Devotional openings only. Applied to the shared devotional generator.
// Bans the "The [adjective] thing about X is Y" tic and gives concrete,
// varied alternatives so openings stop converging on one shape.
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

// Grace notes and devotionals ground their verse from the curated NIV `verses`
// table (verified scripture). The select_verse_for_user RPC picks a verse and
// already enforces a 60-day no-repeat rotation via user_verse_log. The model
// never writes scripture, which guarantees accurate, non-hallucinated verses.
function postureFromPhase(phase: string): string {
  const map: Record<string, string> = {
    newbie: "hope",
    returnee: "hope",
    growth: "purpose",
    elder: "faith",
  };
  return map[phase] ?? "hope";
}

async function generateGraceNoteRaw(
  p: AIProfile,
  verse: { text: string; reference: string },
): Promise<GraceNoteResult> {
  const client = anthropic();

  const system = `You are writing today's grace note for GraceNotes Daily. You speak as God (I) directly to the reader (you).
Faith phase: ${phaseDesc(p.faithPhase)}.${seasonLine(p.seasons)}

Today's verse has already been chosen and is shown to the reader separately:
"${verse.text}" - ${verse.reference}

Write a grace note that earns this verse - the note is the path, the verse is the destination. By the time the reader reaches the verse, it should feel like the most natural thing in the world that it appears there. Do NOT quote, paraphrase, or restate the verse or its reference anywhere in your note; it is shown on its own. Arrive at the same truth from a different angle.

Write 2 to 4 sentences. Speak as God, from His revealed character in Scripture. Every I-statement must reflect what God has already said about Himself in the Bible — His presence, His faithfulness, His love, His steadiness, His knowledge of this person. Do not make predictions about the reader's specific situation. Do not speculate about what they are going through.

The grace note must NOT quote or paraphrase the verse. It arrives at the same truth from a different angle.

Faith phase guidance — tone only, never reflect the label back:
- just beginning: gentle, nothing assumes prior knowledge
- returning to faith: warm, low barrier, no dwelling on any gap
- actively deepening: slightly more direct, assumes some familiarity
- mature in faith: peer tone, can hold complexity

Rules (in priority order — the first two are the most important):
- HARD BAN on observing the reader. Never write any sentence that describes the reader's behavior, faithfulness, effort, choices, struggles, growth, or inner state. Banned openings and phrasings include: "You have been...", "I see you...", "I see the way you...", "I see the daily...", "I notice...", "You are doing...", "Your faithfulness...", "Your steadiness...", "That steadiness of yours...", "Your heart is...". God speaks from who He is, not from what He observes about the reader.
- Make bold declarations from God's character. "I notice you are grateful" is wrong. "My blessing is on you" is right. "You have been faithful" is wrong. "My faithfulness toward you does not depend on anything you do" is right.
- Written as I (God) speaking directly to you (the reader)
- No time anchors: never write "this morning," "tonight," "as you start your day," "before you sleep," or any phrase that assumes what time of day the reader is opening this
- No em dashes or en dashes of any kind
- No three-part parallel structure
- Do not tell the reader what they are feeling or have been through
- Capitalize pronouns referring to God: He, Him, His
- 2 to 4 sentences only
- Read it aloud — if it sounds written, rewrite it until it sounds spoken
- Never open with "I notice." This is a stage direction, not a declaration.

CRITICAL — THE message FIELD MUST NEVER CONTAIN VERSE TEXT:
The message and verse are two completely separate fields. The message field must end before any scripture is quoted. Never place a verse quotation, a verse reference, or any fragment of the verse inside the message field. If the message contains quotation marks around scripture or a book/chapter reference (e.g. "Isaiah 60:1"), it is wrong. The verse belongs exclusively in the verse field.

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

NEGATIVE EXAMPLES — these violate the HARD BAN above. Do not write anything like these:
- "You have been faithful in small things, and that faithfulness is not invisible to Me. I see the daily choices you make to show up..." (Observes the reader. Banned.)
- "I see how hard you have been trying lately." (Observes the reader. Banned.)
- "Your steadiness is building something real." (Reflects the reader's action back. Banned.)

${NO_EM_DASH_RULE}

Respond with valid JSON only - no markdown, no code fences:
{ "message": "2 to 4 sentences, God speaking as I to you, NO verse text inside, NO observation of the reader", "chatPrompt": "a single question or gentle invitation that flows naturally from this specific grace note. Specific - could only follow this note, not any other. Example style: 'What is one thing you have been waiting for?' or 'Where does it feel hardest to be still right now?'" }`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 400,
    temperature: 0.9,
    system,
    messages: [{ role: "user", content: "Write today's note." }],
  } as Parameters<typeof client.messages.create>[0]);


  const block = (msg as Anthropic.Message).content[0];
  const raw = block.type === "text" ? block.text : "";
  // Throw on empty or unparseable response so the caller does NOT cache the
  // fallback as real content. The next request will try again fresh.
  if (!raw.trim()) throw new Error("Grace note: AI returned empty response");
  const parsed = parseJSON<{ message?: string; chatPrompt?: string } | null>(raw, null);
  if (!parsed?.message) {
    throw new Error("Grace note: AI returned invalid JSON — will retry on next request");
  }
  // Verse text is grounded from the curated NIV `verses` table, never written by
  // the model. This guarantees accurate, verified scripture every day.
  return {
    message: stripEmDashes(parsed.message),
    verse: `${verse.text} - ${verse.reference}`,
    signed: "",
    chatPrompt: parsed.chatPrompt ?? "",
  };
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

    // Sanitize cached content on the way out so em-dashes stored in old cache
    // entries are stripped even if they pre-date the sanitizer being added.
    if (cached?.grace_note) {
      logAudit(userId, "getOrCreateGraceNote", "cached")
      return sanitizeGraceNote(cached.grace_note as GraceNoteResult)
    }

    // Ground the verse from the curated NIV `verses` table so the displayed
    // scripture is always verified and never written by the model. The
    // select_verse_for_user RPC enforces a 60-day no-repeat rotation.
    const posture = postureFromPhase(data.faithPhase);
    let chosen: { verse_id: number; text: string; reference: string } | null = null;
    try {
      const { data: vrows } = await admin.rpc("select_verse_for_user", {
        p_user_id: userId,
        p_posture: posture,
        p_segment: data.faithPhase,
      });
      const row = (Array.isArray(vrows) ? vrows[0] : null) as
        { verse_id: number; reference: string; verse_text: string } | null;
      if (row) chosen = { verse_id: row.verse_id, text: row.verse_text, reference: row.reference };
    } catch {
      /* fall through to the any-active fallback below */
    }

    if (!chosen) {
      const { data: anyV } = await admin
        .from("verses")
        .select("id, reference, text")
        .eq("is_active", true)
        .limit(1);
      const row = (anyV as { id: number; reference: string; text: string }[] | null)?.[0];
      if (row) chosen = { verse_id: row.id, text: row.text, reference: row.reference };
    }
    if (!chosen) throw new Error("Grace note: no active verse available to ground from the verses table");

    try {
      const result = await generateGraceNoteRaw(data, { text: chosen.text, reference: chosen.reference });
      await supabase.from("daily_content").upsert({ user_id: userId, date, grace_note: result });
      // Log the verse so the 60-day rotation can avoid repeats (fire-and-forget).
      void admin
        .from("user_verse_log")
        .insert({ user_id: userId, verse_id: chosen.verse_id })
        .then(() => {}, () => {});
      logAudit(userId, "getOrCreateGraceNote", "success")
      return result;
    } catch (err) {
      logAudit(userId, "getOrCreateGraceNote", "error", { error_msg: err instanceof Error ? err.message : String(err) })
      throw err
    }
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
  .handler(async ({ data, context }) => {
    const { userId } = context
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
    const final = reply ? stripEmDashes(reply) : "He hears every whisper, every sigh."
    logAudit(userId, "callRespondToHeartNote", "success", { meta: { retried: issues.length > 0 } })
    return final
  });


// ── Server Function: Respond to Daily Message (conversation) ──────────────────

export const callRespondToDailyMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => DailyMessageInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context
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

    logAudit(userId, "callRespondToDailyMessage", "success")
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
  .handler(async ({ data, context }) => {
    const { userId } = context
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
      logAudit(userId, "callSummarizeHeartNote", "success")
      return cleaned || "Heart Note";
    } catch {
      logAudit(userId, "callSummarizeHeartNote", "error")
      return "Heart Note";
    }
  });

// ── Shared daily devotional (same for everyone, one per date) ─────────────────
// Public (no auth middleware): used by the in-app modal AND the public
// /devotional/<date> page. Get-or-create: reads daily_devotionals by date;
// generates on a miss. Verse is grounded from the curated NIV `verses` table,
// rotated by weekday theme with an 8-occurrence no-repeat per theme.

const SharedDevotionalInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// One theme per weekday. Names must match `verses.theme` values exactly.
const WEEKDAY_THEME: Record<number, string> = {
  0: "Purpose",         // Sunday
  1: "Hope",            // Monday
  2: "Peace",           // Tuesday
  3: "Grief & Comfort", // Wednesday
  4: "Gratitude",       // Thursday
  5: "Courage",         // Friday
  6: "Rest",            // Saturday
};

function themeForDate(dateISO: string): string {
  const d = new Date(dateISO + "T12:00:00Z");
  return WEEKDAY_THEME[d.getUTCDay()] ?? "Hope";
}

function devotionalDisplayDate(dateISO: string): string {
  return new Date(dateISO + "T12:00:00Z").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function generateSharedDevotionalRaw(
  themeName: string,
  verse: { text: string; reference: string },
  related: { ref: string; text: string }[],
): Promise<{ title: string; body: string[]; takeaway: string }> {
  const client = anthropic();
  const relatedBlock = related.length
    ? `\nRelated passages (already shown to the reader; do not restate their full text in the body):\n${related.map((r) => `- ${r.ref}: ${r.text}`).join("\n")}\n`
    : "";

  const system = `Write today's GraceNotes Daily devotional. This devotional is shared - the same one goes to everyone today - so write it generalized, not personalized. Today's theme is ${themeName}.

The verse for today has already been chosen and will be shown to the reader. Build the devotional around it. Do NOT introduce, quote, or invent any other scripture beyond this verse and the related passages listed below.
Verse of the day: "${verse.text}" - ${verse.reference}${relatedBlock}

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
}`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 900,
    temperature: 0.7,
    system,
    messages: [{ role: "user", content: "Write today's shared devotional." }],
  } as Parameters<typeof client.messages.create>[0]);

  const block = (msg as Anthropic.Message).content[0];
  const raw = block.type === "text" ? block.text : "";
  if (!raw.trim()) throw new Error("Shared devotional: AI returned empty response");
  const parsed = parseJSON<{ title?: string; body?: string[]; takeaway?: string } | null>(raw, null);
  if (!parsed?.title || !parsed?.body?.length) {
    throw new Error("Shared devotional: AI returned invalid JSON - will retry on next request");
  }
  return { title: parsed.title, body: parsed.body, takeaway: parsed.takeaway ?? "" };
}

type SharedDevotionalRow = {
  verse_text: string; verse_reference: string; title: string;
  body: string[] | null; related: { ref: string; text: string }[] | null; takeaway: string | null;
  cover_image_url?: string | null;
};

// Columns selected everywhere we read a shared devotional. Keep this in sync
// with SharedDevotionalRow above so sharedRowToResult never sees `undefined`
// for a column it needs.
const SHARED_DEVOTIONAL_SELECT =
  "theme, verse_text, verse_reference, title, body, related, takeaway, cover_image_url";

function sharedRowToResult(row: SharedDevotionalRow, dateDisplay: string): DevotionalResult {
  return sanitizeDevotional({
    title: row.title,
    verseOfDay: row.verse_text,
    verseRef: row.verse_reference,
    date: dateDisplay,
    body: row.body ?? [],
    related: row.related ?? [],
    takeaway: row.takeaway ?? "",
    coverImageUrl: row.cover_image_url ?? null,
  });
}

export const getOrCreateSharedDevotional = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => SharedDevotionalInputSchema.parse(data))
  .handler(async ({ data }): Promise<DevotionalResult> => {
    const date = data.date;
    const dateDisplay = devotionalDisplayDate(date);

    // 1. Return the stored shared devotional if the row already exists.
    const { data: existing } = await admin
      .from("daily_devotionals")
      .select("theme, verse_text, verse_reference, title, body, related, takeaway")
      .eq("date", date)
      .maybeSingle();
    if (existing) return sharedRowToResult(existing as SharedDevotionalRow, dateDisplay);

    // Kept so the fallback branch can serve the local generation as an
    // absolute last resort (generation succeeded but nothing could be
    // persisted or re-read, and the table has no previous row either).
    let generated: DevotionalResult | null = null;

    try {
      // 2. Otherwise generate it. Weekday theme + grounded verse (8-occurrence
      //    no-repeat per theme) + up to 3 related passages from the same theme.
      const themeName = themeForDate(date);
      const { data: poolRows } = await admin
        .from("verses")
        .select("id, reference, text")
        .eq("is_active", true)
        .eq("theme", themeName);
      const pool = (poolRows as { id: number; reference: string; text: string }[] | null) ?? [];
      if (!pool.length) throw new Error(`Shared devotional: no active verses for theme ${themeName}`);

      const { data: recentRows } = await admin
        .from("daily_devotionals")
        .select("verse_id")
        .eq("theme", themeName)
        .order("date", { ascending: false })
        .limit(8);
      const recent = new Set(
        ((recentRows as { verse_id: number | null }[] | null) ?? []).map((r) => r.verse_id),
      );
      const fresh = pool.filter((v) => !recent.has(v.id));
      const candidates = fresh.length ? fresh : pool;
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      const related = pool
        .filter((v) => v.id !== chosen.id)
        .slice(0, 3)
        .map((v) => ({ ref: v.reference, text: v.text }));

      const gen = await generateSharedDevotionalRaw(
        themeName,
        { text: chosen.text, reference: chosen.reference },
        related,
      );

      const result = sanitizeDevotional({
        title: gen.title,
        verseOfDay: chosen.text,
        verseRef: chosen.reference,
        date: dateDisplay,
        body: gen.body,
        related,
        takeaway: gen.takeaway,
      });
      generated = result;

      // 3. Persist first-writer-wins, then return the PERSISTED row.
      // Two devices can race into this generation branch for the same date
      // (common for local timezones at/east of UTC+3, whose midnight arrives
      // before the 22:00 UTC day-ahead cron). A blind upsert let each device
      // display its own generation while the last write silently overwrote the
      // first - same account, two different devotionals. ignoreDuplicates makes
      // this INSERT ... ON CONFLICT DO NOTHING (first insert wins), and the
      // re-select guarantees every caller returns the one stored devotional.
      const { error: persistError } = await admin.from("daily_devotionals").upsert(
        {
          date,
          theme: themeName,
          verse_id: chosen.id,
          verse_text: chosen.text,
          verse_reference: chosen.reference,
          title: result.title,
          body: result.body,
          related: result.related,
          takeaway: result.takeaway,
        },
        { onConflict: "date", ignoreDuplicates: true },
      );

      const { data: persisted } = await admin
        .from("daily_devotionals")
        .select("verse_text, verse_reference, title, body, related, takeaway")
        .eq("date", date)
        .maybeSingle();
      if (persisted) return sharedRowToResult(persisted as SharedDevotionalRow, dateDisplay);

      // Nothing persisted and nothing to re-read: fall through to the
      // last-good fallback below rather than returning content no other
      // device will ever see.
      throw new Error(
        `Shared devotional: persist failed - ${persistError?.message ?? "row missing after insert"}`,
      );
    } catch (err) {
      // 4. FALLBACK: the devotional is opened intentionally, often as part of
      // a morning ritual. An empty "try again" screen at that moment is a
      // worse experience than briefly seeing the most recent reflection. So
      // serve the last successfully stored devotional, flagged (isFallback +
      // servedDate) so clients can label it quietly and retry in the
      // background. Every device falls back to the SAME stored row, so this
      // path cannot reintroduce divergence. Only rethrow when there is
      // nothing at all to serve.
      const { data: lastGood } = await admin
        .from("daily_devotionals")
        .select("date, verse_text, verse_reference, title, body, related, takeaway")
        .lt("date", date)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastGood) {
        console.error("[shared-devotional] generation/persist failed; serving most recent devotional:", err);
        const row = lastGood as SharedDevotionalRow & { date: string };
        return {
          ...sharedRowToResult(row, devotionalDisplayDate(row.date)),
          isFallback: true,
          servedDate: row.date,
        };
      }
      // Absolute last resort: table is empty AND persist failed, but we do
      // have a locally generated devotional. Serve it (possibly divergent
      // across devices) rather than an empty screen - and log loudly so the
      // persist failure is visible in worker logs.
      if (generated) {
        console.error("[shared-devotional] persist failed with no stored fallback; serving local generation:", err);
        return generated;
      }
      throw err;
    }
  });

// Read-only lookup for the dated archive route (/devotional/$date): returns
// the stored devotional or null, NEVER generates. Archive URLs should 404
// until the row actually exists - no empty "being prepared" placeholder, and
// no letting crawlers or curious visitors trigger generation for arbitrary
// (including future) dates. Generation happens only via the cron and the
// today paths (in-app + /devotional index), which use getOrCreateSharedDevotional.
export const getStoredSharedDevotional = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => SharedDevotionalInputSchema.parse(data))
  .handler(async ({ data }): Promise<DevotionalResult | null> => {
    const { data: existing } = await admin
      .from("daily_devotionals")
      .select("theme, verse_text, verse_reference, title, body, related, takeaway")
      .eq("date", data.date)
      .maybeSingle();
    if (!existing) return null;
    return sharedRowToResult(existing as SharedDevotionalRow, devotionalDisplayDate(data.date));
  });

