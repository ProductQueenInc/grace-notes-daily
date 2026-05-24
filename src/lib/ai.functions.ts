import { createServerFn } from "@tanstack/react-start";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { currentRhythmWindow } from "@/lib/personalization";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AIProfile = {
  name: string;
  faithPhase: string;
  voice: string;
  seasons: string[];
  rhythmWindow: string;
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
    ? "direct, grounding, steady, and clear - like a father planting feet on solid ground"
    : "soft, comforting, nurturing, and gentle - like a father holding his child close";
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
  return `\nThis season they are carrying: ${seasons.join(", ")}. Let your message meet them there.`;
}

function rhythmLine(rw: string) {
  const map: Record<string, string> = {
    morning: "morning - a fresh start with God",
    midday: "midday - a pause in the day",
    evening: "evening - winding down and reflecting",
    night: "night - still and quiet before rest",
  };
  return map[rw] ?? rw;
}

function anthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic({ apiKey: key });
}

function openai() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey: key });
}

function stripEmDashes(s: string): string {
  // Replace em-dash (—) and en-dash (–) with " - " or appropriate punctuation.
  return s.replace(/\s*[—–]\s*/g, " - ");
}

const NO_EM_DASH_RULE =
  "STYLE RULE: Never use em-dashes (—) or en-dashes (–) anywhere. Use a hyphen (-), comma, semicolon, or colon instead.";

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

// ── Server Function: Generate Grace Note ──────────────────────────────────────

export const callGenerateGraceNote = createServerFn({ method: "POST" })
  .inputValidator((data: AIProfile) => data)
  .handler(async ({ data }) => {
    const client = anthropic();
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const system = `You are writing a personal, loving message from God to ${data.name}, a Christian believer ${phaseDesc(data.faithPhase)}.
Your tone should be ${voiceDesc(data.voice)}.${seasonLine(data.seasons)}
Time of day: ${rhythmLine(data.rhythmWindow)}. Shape your opening to match this moment.
Date: ${today}.

Write as a loving Father who adores this child and is both gentle and powerful. Address them directly as "you". Sign off warmly.
Include ONE Bible verse that perfectly fits the message - quote it fully, then give the reference.
2-3 paragraphs. Deep, not preachy. Conversational, not formal. Never hollow.
${NO_EM_DASH_RULE}

Respond with valid JSON only - no markdown, no code fences:
{ "message": "your full message", "verse": "Full verse text - Book Chapter:Verse", "signed": "With love, always" }`;

    const msg = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 800,
      temperature: 0.85,
      system,
      messages: [{ role: "user", content: "Write today's Grace Note." }],
    } as Parameters<typeof client.messages.create>[0]);

    const block = (msg as Anthropic.Message).content[0]; const raw = block.type === "text" ? block.text : "";
    return sanitizeGraceNote(parseJSON<GraceNoteResult>(raw, {
      message: "Beloved, you are seen and held today. Walk gently, the Maker of mornings holds your hand.",
      verse: "The LORD your God is with you, the Mighty Warrior who saves. - Zephaniah 3:17",
      signed: "With love, always",
    }));
  });

// ── Server Function: Generate Devotional ──────────────────────────────────────

export const callGenerateDevotional = createServerFn({ method: "POST" })
  .inputValidator((data: AIProfile) => data)
  .handler(async ({ data }) => {
    const client = anthropic();
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const system = `Create a unified daily devotional for ${data.name}, a Christian ${phaseDesc(data.faithPhase)}.
Tone: ${voiceDesc(data.voice)}.${seasonLine(data.seasons)}

All sections must be internally coherent - one unified spiritual thought, not assembled parts.
Write as a caring Father who deeply wants their growth. Biblically grounded. Practical. Never generic or preachy.
The body should: open with tension → move through biblical insight → land on practical application.
The takeaway must be specific to their faith phase (${data.faithPhase}) and season.

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
  "takeaway": "2–3 sentences, intimate and direct, specific to this person's phase and season"
}`;

    const msg = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1200,
      temperature: 0.8,
      system,
      messages: [{ role: "user", content: "Write today's devotional." }],
    } as Parameters<typeof client.messages.create>[0]);

    const block = (msg as Anthropic.Message).content[0]; const raw = block.type === "text" ? block.text : "";
    return sanitizeDevotional(parseJSON<DevotionalResult>(raw, {
      title: "Fresh Grace Each Morning",
      verseOfDay:
        "The steadfast love of the LORD never ceases; his mercies never come to an end; they are new every morning; great is your faithfulness.",
      verseRef: "Lamentations 3:22-23",
      date: today,
      body: [
        "God's love never fails. Never wavers. Never ends. In a world of constant change, the Creator's faithfulness remains absolute.",
        "Consider the context: these words were penned amid devastation. Yet there, standing in ruins, the prophet proclaimed this radical truth.",
        "Scripture confirms this reality: Jesus Christ is the same yesterday, today, and forever. His character stands immovable.",
      ],
      related: [
        { ref: "Psalm 136:1", text: "Give thanks to the LORD, for he is good. His love endures forever." },
        { ref: "2 Corinthians 5:17", text: "Therefore, if anyone is in Christ, the new creation has come." },
        { ref: "Matthew 28:20", text: "And surely I am with you always, to the very end of the age." },
      ],
      takeaway: "His mercies are new today, for exactly where you are. Receive them.",
    }));
  });

// ── Server Function: Respond to Heart Note ────────────────────────────────────

export const callRespondToHeartNote = createServerFn({ method: "POST" })
  .inputValidator((data: { text: string; profile: AIProfile }) => data)
  .handler(async ({ data }) => {
    const client = anthropic();
    const system = `You are responding to ${data.profile.name}'s personal heart note as God, their loving Father.
Faith phase: ${phaseDesc(data.profile.faithPhase)}.
Tone: ${voiceDesc(data.profile.voice)}.${seasonLine(data.profile.seasons)}

Be warm, personal, and fully present with what they shared. 3-5 sentences. Not preachy. Not generic.
${NO_EM_DASH_RULE}
Respond to what they actually wrote, meet them exactly there. Sign as "Dad" or "Your Father" or "Love, your Father".`;

    const msg = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 300,
      temperature: 0.85,
      system,
      messages: [{ role: "user", content: data.text }],
    } as Parameters<typeof client.messages.create>[0]);

    const block = (msg as Anthropic.Message).content[0]; return block.type === "text"
      ? stripEmDashes(block.text)
      : "Thank you for sharing your heart. He hears every whisper, every sigh.";
  });

// ── Server Function: Respond to Daily Message (conversation) ──────────────────

export const callRespondToDailyMessage = createServerFn({ method: "POST" })
  .inputValidator((data: { text: string; profile: AIProfile; history: { role: string; text: string }[] }) => data)
  .handler(async ({ data }) => {
    const client = openai();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are responding to ${data.profile.name} as God, their loving Father, in an ongoing daily conversation.
Faith phase: ${phaseDesc(data.profile.faithPhase)}.
Tone: ${voiceDesc(data.profile.voice)}.${seasonLine(data.profile.seasons)}
2-4 sentences. Conversational. Personal. No sign-off, this is mid-conversation. Not preachy. Just present and loving.
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
      temperature: 0.9,
      messages,
    });

    return res.choices[0]?.message?.content ?? "Beloved, He hears you. Stay close.";
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
    rhythmWindow: currentRhythmWindow(),
  };
}
