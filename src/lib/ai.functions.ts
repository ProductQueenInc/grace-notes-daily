import { createServerFn } from "@tanstack/react-start";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { z } from "zod";
import { requireTkoebo as requireSupabaseAuth } from "@/lib/auth-tkoebo.server";
import { supabaseAdmin } from "@/integrations/supabase/admin.server";
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
  opts?: { error_msg?: string; meta?: Record<string, unknown> },
) {
  void (
    supabaseAdmin as unknown as {
      from: (t: string) => {
        insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      };
    }
  )
    .from("audit_log")
    .insert({
      user_id: userId,
      fn,
      result,
      error_msg: opts?.error_msg ?? null,
      meta: opts?.meta ?? null,
    })
    .then(({ error }) => {
      if (error) console.warn("audit_log insert failed:", error.message);
    })
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

const safeStr = (max: number) => z.string().max(max).transform(sanitizeForPrompt);

const AIProfileSchema = z.object({
  name: safeStr(200),
  faithPhase: safeStr(50),
  voice: safeStr(50),
  seasons: z.array(safeStr(100)).max(20),
  // Client-supplied local date (YYYY-MM-DD). Used as the cache key so the
  // grace note / devotional roll over at the user's LOCAL midnight, not UTC.
  clientDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  // Recent verse references used in previous grace notes — injected at generation
  // time to prevent the same verse / theme repeating on consecutive days.
  recentVerses: z.array(z.string().max(200)).max(14).optional(),
});

// Heart Notes allow up to 2,500 words in the UI (src/routes/heart-notes.tsx LIMIT).
// At roughly 6 characters per word plus whitespace that is ~15,000 characters,
// so cap at 20,000 to leave headroom. A note that passes the UI limit must
// never be rejected here: the client saves first, but the reply would fail.
const HEART_NOTE_MAX_CHARS = 20_000;

const HeartNoteInputSchema = z.object({
  text: z.string().min(1).max(HEART_NOTE_MAX_CHARS),
  profile: AIProfileSchema,
});

const SummarizeInputSchema = z.object({
  text: z.string().min(1).max(HEART_NOTE_MAX_CHARS),
});

const DailyMessageInputSchema = z.object({
  text: z.string().min(1).max(2000),
  profile: AIProfileSchema,
  history: z.array(z.object({ role: z.string().max(20), text: z.string().max(2000) })).max(20),
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

export type GraceNoteResult = {
  message: string;
  verse: string;
  signed: string;
  chatPrompt: string;
  shape?: string | null;
};
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

// ── Grace note variety engine (rewritten 2026-10-12) ───────────────────────────
// Mirrors the engine in supabase/functions/generate-daily-grace-notes/index.ts.
// KEEP BOTH IN SYNC (edge functions cannot import from src/).
// WHY: the old design asked the model to vary itself (self-reported shape, ~50
// example sentences, a same-reader first-6-words check). Real output showed
// word-for-word copies of the examples, an ignored shape rotation, and every
// ban just moving the tic. Variety is now enforced by code: no examples in the
// prompt, shape assigned by code, the note built from the specific truth in
// today's verse, the reader's recent notes and a live cross-reader list of
// overused openers shown to the model, and a code gate that rejects repeats.
const GRACE_NOTE_SHAPES = ["declaration", "image", "question", "invitation", "promise"] as const;
type GraceNoteShape = (typeof GRACE_NOTE_SHAPES)[number];

const SHAPE_GUIDE: Record<GraceNoteShape, string> = {
  declaration:
    "a flat, confident statement of who I am or what I have done. No setup, no negation.",
  image:
    'open inside one concrete, ordinary physical scene that carries the truth without explaining it. Start with the scene itself; never begin with "Picture" or "Imagine". Do not use light, water, doors, threads, hands, anchors, lighthouses, seeds, foundations, walls, or trees; the library has overused them.',
  question:
    'I ask one question about My own character, then answer it directly. Do not start with "Do I" or "Do you"; open with a different question word.',
  invitation: "a short invitation or instruction, then the reason it is safe to follow it.",
  promise: "a forward-looking commitment: what I am doing, will do, or will not stop doing.",
};

function isGraceNoteShape(s: unknown): s is GraceNoteShape {
  return typeof s === "string" && (GRACE_NOTE_SHAPES as readonly string[]).includes(s);
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Code decides the shape: deterministic per reader per day, skipping the last two used.
function pickShape(userId: string, dateStr: string, recentShapes: string[]): GraceNoteShape {
  const start = hashString(`${userId}|${dateStr}`) % GRACE_NOTE_SHAPES.length;
  const avoid = recentShapes.slice(0, 2);
  for (let i = 0; i < GRACE_NOTE_SHAPES.length; i++) {
    const s = GRACE_NOTE_SHAPES[(start + i) % GRACE_NOTE_SHAPES.length];
    if (!avoid.includes(s)) return s;
  }
  return GRACE_NOTE_SHAPES[start];
}

function normalizeForCompare(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function wordsOf(s: string): string[] {
  return normalizeForCompare(s).split(/\s+/).filter(Boolean);
}

function openerOf(s: string, n = 3): string {
  return wordsOf(s).slice(0, n).join(" ");
}

function sharesPhrase(a: string, b: string, n = 6): boolean {
  const aw = wordsOf(a);
  const bw = wordsOf(b);
  if (aw.length < n || bw.length < n) return false;
  const grams = new Set<string>();
  for (let i = 0; i + n <= bw.length; i++) grams.add(bw.slice(i, i + n).join(" "));
  for (let i = 0; i + n <= aw.length; i++) {
    if (grams.has(aw.slice(i, i + n).join(" "))) return true;
  }
  return false;
}

// Library-wide usage counts over the last 14 days (all readers), updated live
// as this run produces notes. One map holds everything, keyed by kind:
//   "<three words>" and "<two words>"  openings
//   "f:<word>"                         first word of a note
//   "w:<stem>"                         a content word appearing anywhere in a note
//   "#total"                           number of notes counted
// Nothing here is a hand-kept ban list: whatever the library is overusing
// right now closes itself, and reopens when the library moves on.
type OpenerCounts = Map<string, number>;

const STOP_WORDS = new Set(
  (
    "that this with from have will your they them then than what when where which while there here been were into over " +
    "just only even ever every each about because before after again does doesn dont also more most much such some same " +
    "still never always make made makes take takes come comes came give gives gave know knows knew want wants need needs " +
    "like look looks thing things whom whose their these those would could should other another being both until through " +
    "toward towards upon down back away well long right today anything nothing something everything someone yours mine " +
    "itself myself yourself himself love loved loves grace faith peace hope joy heart life days day world " +
    "wait waits hear hears keep keeps stay stays rest rests walk walks hold holds"
  ).split(" "),
);

function stem(w: string): string {
  return w.length > 5 ? w.replace(/(ing|ed|es|s)$/, "") : w.replace(/s$/, "");
}

function contentStems(s: string, allowed: Set<string> = new Set()): Set<string> {
  const out = new Set<string>();
  for (const w of wordsOf(s)) {
    if (w.length < 4 || STOP_WORDS.has(w)) continue;
    const st = stem(w);
    if (!allowed.has(st)) out.add(st);
  }
  return out;
}

function bumpOpener(counts: OpenerCounts, text: string): void {
  for (const n of [3, 2]) {
    const op = openerOf(text, n);
    if (op) counts.set(op, (counts.get(op) ?? 0) + 1);
  }
  const first = openerOf(text, 1);
  if (first) counts.set(`f:${first}`, (counts.get(`f:${first}`) ?? 0) + 1);
  for (const st of contentStems(text)) counts.set(`w:${st}`, (counts.get(`w:${st}`) ?? 0) + 1);
  counts.set("#total", (counts.get("#total") ?? 0) + 1);
}

const OVERUSED_AT = 2; // a 3-word opener used this often in 14 days is closed
const OVERUSED_AT_2 = 4; // a 2-word opener used this often in 14 days is closed
const FIRST_WORD_SHARE = 0.15; // one first word may open at most this share of notes
const WORD_SHARE = 0.1; // one content word may appear in at most this share of notes
const MIN_SAMPLE = 20; // shares are only enforced once this many notes are counted

function isClosed(key: string, count: number, total: number): boolean {
  if (key === "#total") return false;
  if (key.startsWith("w:")) return total >= MIN_SAMPLE && count / total >= WORD_SHARE;
  if (key.startsWith("f:")) return total >= MIN_SAMPLE && count / total >= FIRST_WORD_SHARE;
  return count >= (key.split(" ").length === 2 ? OVERUSED_AT_2 : OVERUSED_AT);
}

function closedLists(counts: OpenerCounts): { openers: string[]; words: string[] } {
  const total = counts.get("#total") ?? 0;
  const closed = [...counts.entries()]
    .filter(([k, c]) => isClosed(k, c, total))
    .sort((a, b) => b[1] - a[1]);
  return {
    openers: closed
      .filter(([k]) => !k.startsWith("w:"))
      .slice(0, 25)
      .map(([k]) => (k.startsWith("f:") ? k.slice(2) : k)),
    words: closed
      .filter(([k]) => k.startsWith("w:"))
      .slice(0, 15)
      .map(([k]) => k.slice(2)),
  };
}

// One idea ("you do not have to earn it, it is already settled") dominated the
// library, so the words that carry it are closed outright.
const STOCK_IDEA = /\b(already|earn\w*|perform\w*|measure up|prove yourself)\b/i;

// Negation is closed outright. The "not X, it is Y" construction has been
// banned in the prompt since July and the model keeps writing it, so the code
// rejects any note that uses "not", "nor" or an n't contraction. (Nothing is
// lost: "I never run out" says what "I do not run out" does.)
const NEGATION = /\bnot\b|\bnor\b|n't\b/i;

function collisionReason(
  candidate: string,
  ownRecent: string[],
  counts: OpenerCounts,
  verseText: string,
): string | null {
  const total = counts.get("#total") ?? 0;
  const candNorm = normalizeForCompare(candidate);
  const candOpener = openerOf(candidate);
  const cand2 = openerOf(candidate, 2);
  const first = openerOf(candidate, 1);
  if (NEGATION.test(candidate)) {
    return 'it uses "not", "nor" or an n\'t contraction, and negation is banned; say only what IS true ("I never run out", not "I do not run out")';
  }
  const stock = candidate.match(STOCK_IDEA);
  if (stock)
    return `it uses the word "${stock[0]}", which is closed because it carries the library's most overused idea`;
  if (isClosed(candOpener, counts.get(candOpener) ?? 0, total)) {
    return `it opens with "${candOpener}...", which many readers have received lately`;
  }
  if (isClosed(cand2, counts.get(cand2) ?? 0, total)) {
    return `it opens with "${cand2}...", an opening family many readers have received lately`;
  }
  if (isClosed(`f:${first}`, counts.get(`f:${first}`) ?? 0, total)) {
    return `it starts with the word "${first}", which too many recent notes start with; open with a different kind of word`;
  }
  const verseStems = contentStems(verseText);
  const overusedWords = closedLists(counts).words;
  const hit = [...contentStems(candidate)].find(
    (w) => overusedWords.includes(w) && !verseStems.has(w),
  );
  if (hit)
    return `it uses the word "${hit}", which too many recent notes use; find a fresher word or image`;
  for (const r of ownRecent) {
    if (!r) continue;
    if (candNorm === normalizeForCompare(r))
      return "it is identical to a note this reader already received";
    if (candOpener && candOpener === openerOf(r))
      return `this reader already received a note opening with "${candOpener}..."`;
    if (sharesPhrase(candidate, r))
      return "it repeats a phrase from a note this reader already received";
  }
  return null;
}

function recentNotesBlock(ownRecent: string[]): string {
  const shown = ownRecent.slice(0, 8);
  if (!shown.length) return "";
  return `\n\nVARIETY - notes this reader already received, newest first. Do not reuse their opening words, images, key phrases, or central idea:\n${shown.map((n, i) => `${i + 1}. ${n}`).join("\n")}`;
}

function overusedBlock(closed: { openers: string[]; words: string[] }): string {
  let out = "";
  if (closed.openers.length) {
    out += `\n\nOpening words already used by several readers lately. Do not begin with any of these, or anything close to them:\n${closed.openers.map((o) => `- "${o}..."`).join("\n")}`;
  }
  if (closed.words.length) {
    out += `\n\nWords that too many recent notes have used. Do not use any of them (unless the verse itself contains the word); reach for a fresher word or image: ${closed.words.join(", ")}`;
  }
  return out;
}

function avoidAttemptLine(avoid: string | null, reason: string | null): string {
  if (!avoid) return "";
  return `\n\nYour last attempt was rejected because ${reason ?? "it was too close to an earlier note"}: "${avoid}" Write a clearly different note: different opening words, different image, different angle on the verse.`;
}

// Cross-reader opener counts from the nightly library (daily_grace_notes).
async function loadOpenerCounts(dateStr: string): Promise<OpenerCounts> {
  const counts: OpenerCounts = new Map();
  try {
    const from = new Date(`${dateStr}T00:00:00Z`);
    from.setUTCDate(from.getUTCDate() - 14);
    const { data } = await admin
      .from("daily_grace_notes")
      .select("grace_note")
      .gte("date", from.toISOString().split("T")[0])
      .lt("date", dateStr)
      .limit(3000);
    for (const r of (data ?? []) as { grace_note: string | null }[])
      bumpOpener(counts, r.grace_note ?? "");
  } catch {
    /* variety is best-effort; never block a note on it */
  }
  return counts;
}

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
`;

function sanitizeGraceNote(r: GraceNoteResult): GraceNoteResult {
  return {
    message: stripEmDashes(r.message),
    verse: stripEmDashes(r.verse),
    signed: "",
    chatPrompt: r.chatPrompt ?? "",
    shape: r.shape ?? null,
  };
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
  verse: { text: string; reference: string; theme: string },
  shape: GraceNoteShape,
  ownRecent: string[],
  counts: OpenerCounts,
): Promise<GraceNoteResult> {
  const client = anthropic();

  const buildSystem = (
    avoidNote: string | null,
    avoidReason: string | null,
  ) => `You are writing today's grace note for GraceNotes Daily. You speak as God (I) directly to the reader (you).
Faith phase: ${phaseDesc(p.faithPhase)}.${seasonLine(p.seasons)}

Today's verse has already been chosen and is shown to the reader separately (its theme is ${verse.theme}):
"${verse.text}" - ${verse.reference}

THE JOB: Before writing, decide privately what this specific passage shows about who God is or what God does. Not a general truth like "God loves you" or "God is faithful": the particular thing this passage says (a person in it, an image in it, an action in it, a promise inside it). Write the note from that one particular truth, so the note could not be pasted onto a different verse. Do NOT quote, paraphrase, or restate the verse or its reference anywhere in the note; it is shown on its own. The note is the path; the verse is the destination.

TODAY'S SHAPE: ${shape}. ${SHAPE_GUIDE[shape]} Use exactly this shape.

Write 2 to 4 sentences. Speak as God, from His revealed character in Scripture. Every I-statement must reflect what God has said about Himself in the Bible - His presence, His faithfulness, His love, His steadiness, His knowledge of this person. Do not make predictions about the reader's specific situation. Do not speculate about what they are going through.

The grace note must NOT quote or paraphrase the verse. It arrives at the same truth from a different angle.

Faith phase guidance - tone only, never reflect the label back:
- just beginning: gentle, nothing assumes prior knowledge
- returning to faith: warm, low barrier, no dwelling on any gap
- actively deepening: slightly more direct, assumes some familiarity
- mature in faith: peer tone, can hold complexity

Rules (in priority order - the first three are the most important):
- HARD BAN on observing the reader. Never write any sentence that describes the reader's behavior, faithfulness, effort, choices, struggles, growth, or inner state. Banned openings and phrasings include: "You have been...", "I see you...", "I see the way you...", "I see the daily...", "I notice...", "You are doing...", "Your faithfulness...", "Your steadiness...", "That steadiness of yours...", "Your heart is...". God speaks from who He is, not from what He observes about the reader.
- SHAPE BAN: never build a sentence by naming what is not true before saying what is true ("Not because you...", "not in a distant way, not in a ... way", "It is not X, it is Y", "Not X. Just Y."). This exact construction has been used across the note library far more than any other and now reads as a template, even though each individual line is defensible on its own. Treat it as off the table, not just something to use sparingly.
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

OPENING BAN (added 2026-09-15, verified against real output across every active user): a second wave of templates has taken over the note library, the same way "Not X... it is Y" did before it was banned in July. These are now BANNED - do not use them or a close paraphrase of any of them:
- "I am holding..." as a catch-all opener (holding you steady, holding the door open, holding what you cannot see yet, holding the ground, holding the outcome, holding the thing you carry)
- "I am steady" / "I am [already] standing between you and..."
- "I am closer to you than [the air you breathe / your next breath / the ground you stand on]"
- "What does it look like when I...? It looks like..." or "What would it look like if I...?"
- picturing "the thread of your life" or "the thread of your story"
Banning the exact wording is not enough - the underlying move (open with "I am holding/steady/standing/closer" as a safe default) must not repeat either, even reworded. If a candidate opening feels like the most obvious, safest way to start, that is a signal to pick a different shape or image entirely.

NEGATIVE EXAMPLES - these violate the HARD BAN, SHAPE BAN, or OPENING BAN above. Do not write anything like these:
- "You have been faithful in small things, and that faithfulness is not invisible to Me. I see the daily choices you make to show up..." (Observes the reader. Banned.)
- "I see how hard you have been trying lately." (Observes the reader. Banned.)
- "Your steadiness is building something real." (Reflects the reader's action back. Banned.)
- "My blessing is on you right now. Not because of what you have done or have not done; it is just on you." (First-wave template. Banned.)
- "I am holding you steady right now, whether you feel it or not." (Second-wave template. Banned.)
- "I am closer to you than the air you are breathing." (Second-wave template. Banned.)
- "What does it look like when I walk with you? It looks like staying close on the ordinary days too." (Second-wave template. Banned.)
- "I am already standing between you and what is coming." (Second-wave template. Banned.)

NO NEGATION: do not use the word "not", "nor", or any n't contraction anywhere in the note. Say only what IS true. "I never run out" works; "I do not run out" does not. Any note that says what God is not, or what the reader does not have to do, will be rejected.

IDEA WARNING: one idea has dominated the note library: that the reader does not have to earn something, that it was already settled before they woke, that God is not waiting for them to measure up. Say what THIS verse says instead. These words are closed and will be rejected: already, earn, earned, perform, performance, prove yourself, measure up.${recentNotesBlock(ownRecent)}${overusedBlock(closedLists(counts))}${avoidAttemptLine(avoidNote, avoidReason)}

${NO_EM_DASH_RULE}

Respond with valid JSON only - no markdown, no code fences:
{ "message": "2 to 4 sentences, God speaking as I to you, NO verse text inside, NO observation of the reader", "chatPrompt": "a single question or gentle invitation that flows naturally from this specific grace note. Specific - could only follow this note, not any other. Example style: 'What is one thing you have been waiting for?' or 'Where does it feel hardest to be still right now?'" }`;

  const MAX_ATTEMPTS = 4;
  let avoidNote: string | null = null;
  let avoidReason: string | null = null;
  const tried: { text: string; chatPrompt: string; hard: boolean }[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 400,
      temperature: 0.9,
      system: buildSystem(avoidNote, avoidReason),
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
    const candidate = stripEmDashes(parsed.message);
    const reason = collisionReason(candidate, ownRecent, counts, verse.text);
    // "Hard" problems (negation, the dominant stock idea) are worse than a
    // merely common opening, so if every attempt fails we keep a soft one.
    tried.push({
      text: candidate,
      chatPrompt: parsed.chatPrompt ?? "",
      hard: !!reason && /negation|most overused idea/.test(reason),
    });
    if (!reason) break;
    avoidNote = candidate;
    avoidReason = reason;
  }

  // Verse text is grounded from the curated NIV `verses` table, never written
  // by the model. If nothing passed the gate, accept the best of what we have
  // rather than fail.
  const pick = [...tried].reverse().find((t) => !t.hard) ?? tried[tried.length - 1];
  return {
    message: pick.text,
    verse: `${verse.text} - ${verse.reference}`,
    signed: "",
    chatPrompt: pick.chatPrompt,
    shape,
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
      logAudit(userId, "getOrCreateGraceNote", "cached");
      return sanitizeGraceNote(cached.grace_note as GraceNoteResult);
    }

    // Ground the verse from the curated NIV `verses` table so the displayed
    // scripture is always verified and never written by the model. The
    // select_verse_for_user RPC enforces a 60-day no-repeat rotation.
    const posture = postureFromPhase(data.faithPhase);
    let chosen: { verse_id: number; text: string; reference: string; theme: string } | null = null;
    try {
      const { data: vrows } = await admin.rpc("select_verse_for_user", {
        p_user_id: userId,
        p_posture: posture,
        p_segment: data.faithPhase,
      });
      const row = (Array.isArray(vrows) ? vrows[0] : null) as {
        verse_id: number;
        reference: string;
        verse_text: string;
        theme: string | null;
      } | null;
      if (row)
        chosen = {
          verse_id: row.verse_id,
          text: row.verse_text,
          reference: row.reference,
          theme: row.theme ?? "",
        };
    } catch {
      /* fall through to the any-active fallback below */
    }

    if (!chosen) {
      const { data: anyV } = await admin
        .from("verses")
        .select("id, reference, text, theme")
        .eq("is_active", true)
        .limit(1);
      const row = (
        anyV as { id: number; reference: string; text: string; theme: string | null }[] | null
      )?.[0];
      if (row)
        chosen = {
          verse_id: row.id,
          text: row.text,
          reference: row.reference,
          theme: row.theme ?? "",
        };
    }
    if (!chosen)
      throw new Error("Grace note: no active verse available to ground from the verses table");

    // Variety engine: this reader's recent notes. The nightly library
    // (daily_grace_notes) is the main history; daily_content holds notes made
    // by this on-demand path. Both count.
    const [{ data: libRows }, { data: recentRows }] = await Promise.all([
      admin
        .from("daily_grace_notes")
        .select("grace_note, shape, date")
        .eq("user_id", userId)
        .lt("date", date)
        .order("date", { ascending: false })
        .limit(30),
      supabase
        .from("daily_content")
        .select("grace_note, date")
        .eq("user_id", userId)
        .lt("date", date)
        .order("date", { ascending: false })
        .limit(10),
    ]);
    const libNotes = (libRows ?? []) as {
      grace_note: string | null;
      shape: string | null;
      date: string;
    }[];
    const onDemand = (recentRows ?? [])
      .map((r) => r.grace_note as GraceNoteResult | null)
      .filter((g): g is GraceNoteResult => !!g);
    const ownRecent = [
      ...libNotes.map((r) => r.grace_note ?? ""),
      ...onDemand.map((g) => g.message),
    ].filter(Boolean);
    const recentShapes = [
      ...libNotes.map((r) => r.shape ?? ""),
      ...onDemand.map((g) => g.shape ?? ""),
    ].filter((x): x is string => !!x);
    const shape = pickShape(userId, date, recentShapes);
    const openerCounts = await loadOpenerCounts(date);

    try {
      const result = await generateGraceNoteRaw(
        data,
        { text: chosen.text, reference: chosen.reference, theme: chosen.theme },
        shape,
        ownRecent,
        openerCounts,
      );
      await supabase.from("daily_content").upsert({ user_id: userId, date, grace_note: result });
      // Log the verse so the 60-day rotation can avoid repeats (fire-and-forget).
      void admin
        .from("user_verse_log")
        .insert({ user_id: userId, verse_id: chosen.verse_id })
        .then(
          () => {},
          () => {},
        );
      logAudit(userId, "getOrCreateGraceNote", "success");
      return result;
    } catch (err) {
      logAudit(userId, "getOrCreateGraceNote", "error", {
        error_msg: err instanceof Error ? err.message : String(err),
      });
      throw err;
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
    const { userId } = context;
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
    const final = reply ? stripEmDashes(reply) : "He hears every whisper, every sigh.";
    logAudit(userId, "callRespondToHeartNote", "success", { meta: { retried: issues.length > 0 } });
    return final;
  });

// ── Server Function: Respond to Daily Message (conversation) ──────────────────

export const callRespondToDailyMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => DailyMessageInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
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

    logAudit(userId, "callRespondToDailyMessage", "success");
    return stripEmDashes(res.choices[0]?.message?.content ?? "He hears you. Stay close.");
  });

// ── Helper: build AIProfile from Profile ─────────────────────────────────────

export function buildAIProfile(
  profile: {
    name?: string | null;
    faith_phase?: string | null;
    voice?: string | null;
    seasons?: { tag: string; set_at: string }[] | null;
  } | null,
): AIProfile {
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
    const { userId } = context;
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
      logAudit(userId, "callSummarizeHeartNote", "success");
      return cleaned || "Heart Note";
    } catch {
      logAudit(userId, "callSummarizeHeartNote", "error");
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
  0: "Purpose", // Sunday
  1: "Hope", // Monday
  2: "Peace", // Tuesday
  3: "Grief & Comfort", // Wednesday
  4: "Gratitude", // Thursday
  5: "Courage", // Friday
  6: "Rest", // Saturday
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

// ── Devotional variety engine (2026-10-12) ───────────────────────────────────
// Mirrors supabase/functions/generate-daily-devotional/index.ts. KEEP IN SYNC.
// The takeaway form is chosen by code per date, so the ending cannot settle
// into "Name one thing you...". Six forms; the weekday theme cycles every 7
// days, so a theme meets a different form each week.
const TAKEAWAY_FORMS = [
  "a question to sit with today. It ends with a question mark and does not ask the reader to name, list, or identify anything.",
  "one small, specific thing to do for another person today.",
  "a short sentence to say aloud or pray today, written out in full inside quotation marks.",
  "one thing to set down or stop doing for today, and what to do with the moment that frees up.",
  "one ordinary thing in the physical world to look at or listen for today, and what it says about this verse.",
  "a single line to carry in your pocket: the one sentence worth remembering from this devotional, stated plainly.",
];

function takeawayFormForDate(dateISO: string): string {
  const dayNumber = Math.floor(new Date(dateISO + "T12:00:00Z").getTime() / 86_400_000);
  return TAKEAWAY_FORMS[dayNumber % TAKEAWAY_FORMS.length];
}

function norm(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstN(s: string, n: number): string {
  return norm(s).split(" ").slice(0, n).join(" ");
}

function firstSentence(s: string): string {
  const m = (s ?? "").match(/^[\s\S]*?[.!?](\s|$)/);
  return (m ? m[0] : (s ?? "").slice(0, 160)).trim();
}

type PastDevotional = {
  date: string;
  theme: string;
  title: string;
  opener: string;
  takeaway: string;
};

async function loadPastDevotionals(beforeDate: string): Promise<PastDevotional[]> {
  const { data } = await admin
    .from("daily_devotionals")
    .select("date, theme, title, body, takeaway")
    .lt("date", beforeDate)
    .order("date", { ascending: false })
    .limit(400);
  return (
    (data ?? []) as {
      date: string;
      theme: string;
      title: string;
      body: unknown;
      takeaway: string | null;
    }[]
  ).map((r) => ({
    date: r.date,
    theme: r.theme,
    title: r.title ?? "",
    opener: firstSentence(Array.isArray(r.body) ? String(r.body[0] ?? "") : ""),
    takeaway: r.takeaway ?? "",
  }));
}

function memoryBlock(past: PastDevotional[], themeName: string): string {
  if (!past.length) return "";
  const titles = past
    .slice(0, 60)
    .map((p) => p.title)
    .filter(Boolean);
  const recentOpeners = past
    .slice(0, 14)
    .map((p) => p.opener)
    .filter(Boolean);
  const themeOpeners = past
    .filter((p) => p.theme === themeName)
    .slice(0, 6)
    .map((p) => p.opener)
    .filter(Boolean);
  const takeaways = past
    .slice(0, 8)
    .map((p) => firstSentence(p.takeaway))
    .filter(Boolean);
  return `
WHAT HAS ALREADY BEEN PUBLISHED - do not repeat any of it:
Titles already used (never reuse one, and do not copy their pattern, for example "The X That Y" or "The Arithmetic of Z"): ${titles.map((t) => `"${t}"`).join("; ")}

Opening sentences from the last two weeks (do not open with the same words, the same sentence shape, or the same image):
${recentOpeners.map((o) => `- ${o}`).join("\n")}
${themeOpeners.length ? `\nOpening sentences from earlier ${themeName} devotionals (this theme comes around every week, so make this one open somewhere new):\n${themeOpeners.map((o) => `- ${o}`).join("\n")}\n` : ""}
Recent takeaways (yours must differ in form and in wording):
${takeaways.map((t) => `- ${t}`).join("\n")}
`;
}

function devotionalCollisionReason(
  title: string,
  body: string[],
  takeaway: string,
  past: PastDevotional[],
): string | null {
  const t = norm(title);
  if (past.some((p) => norm(p.title) === t)) return `the title "${title}" has already been used`;
  const t2 = firstN(title, 2);
  if (t2 && past.slice(0, 60).some((p) => firstN(p.title, 2) === t2))
    return `the title starts with "${t2}...", like an earlier title; pick a different image for it`;
  const opener = firstSentence(body[0] ?? "");
  const o4 = firstN(opener, 4);
  if (past.slice(0, 120).some((p) => firstN(p.opener, 4) === o4))
    return `it opens with "${o4}...", which an earlier devotional already did`;
  if (/^[a-z]+(\s[a-z]+)?\s(is|are)\s+not\b/i.test(opener.trim()))
    return 'it opens by defining the theme word with "X is not Y"';
  if (/^most people\b/i.test(opener.trim())) return 'it opens with "Most people..."';
  const k3 = firstN(takeaway, 3);
  if (k3 && past.slice(0, 30).some((p) => firstN(p.takeaway, 3) === k3))
    return `the takeaway starts with "${k3}...", like a recent one`;
  if (/^(today,?\s+)?(name|notice|identify)\b/i.test(takeaway.trim()))
    return 'the takeaway starts with "Name/Notice/Identify", which is overused';
  return null;
}

async function generateSharedDevotionalRaw(
  date: string,
  themeName: string,
  verse: { text: string; reference: string },
  related: { ref: string; text: string }[],
): Promise<{ title: string; body: string[]; takeaway: string }> {
  const client = anthropic();
  const relatedBlock = related.length
    ? `\nRelated passages (already shown to the reader; do not restate their full text in the body):\n${related.map((r) => `- ${r.ref}: ${r.text}`).join("\n")}\n`
    : "";

  const past = await loadPastDevotionals(date);
  const memory = memoryBlock(past, themeName);
  const takeawayForm = takeawayFormForDate(date);

  const buildSystem = (
    avoid: string | null,
  ) => `Write today's GraceNotes Daily devotional. This devotional is shared - the same one goes to everyone today - so write it generalized, not personalized. Today's theme is ${themeName}.

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

TITLE RULE: A short, specific title drawn from this passage's own image, person, or phrase. Not a formula.

TAKEAWAY FORM FOR TODAY: ${takeawayForm} One or two sentences. Do not begin it with "Name", "Notice", "Identify", or "Today".
${memory}${avoid ? `\nYour last attempt was rejected because ${avoid}. Write it again so that problem is gone and nothing else repeats.\n` : ""}
${NO_OVER_FAMILIARITY}
${NO_EM_DASH_RULE}

Respond with valid JSON only - no markdown, no code fences:
{
  "title": "short evocative title - not generic",
  "body": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "takeaway": "one or two sentences in today's takeaway form"
}`;

  const MAX_ATTEMPTS = 3;
  let avoid: string | null = null;
  let last: { title: string; body: string[]; takeaway: string } | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1400,
      temperature: 0.8,
      system: buildSystem(avoid),
      messages: [{ role: "user", content: "Write today's shared devotional." }],
    } as Parameters<typeof client.messages.create>[0]);

    const block = (msg as Anthropic.Message).content[0];
    const raw = block.type === "text" ? block.text : "";
    if (!raw.trim()) throw new Error("Shared devotional: AI returned empty response");
    const parsed = parseJSON<{ title?: string; body?: string[]; takeaway?: string } | null>(
      raw,
      null,
    );
    if (!parsed?.title || !parsed?.body?.length) {
      throw new Error("Shared devotional: AI returned invalid JSON - will retry on next request");
    }
    last = { title: parsed.title, body: parsed.body, takeaway: parsed.takeaway ?? "" };
    const reason = devotionalCollisionReason(
      stripEmDashes(last.title),
      last.body.map(stripEmDashes),
      stripEmDashes(last.takeaway),
      past,
    );
    if (!reason) return last;
    avoid = reason;
  }
  // Accept the last attempt rather than publishing nothing.
  return last as { title: string; body: string[]; takeaway: string };
}

type SharedDevotionalRow = {
  verse_text: string;
  verse_reference: string;
  title: string;
  body: string[] | null;
  related: { ref: string; text: string }[] | null;
  takeaway: string | null;
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
      .select(SHARED_DEVOTIONAL_SELECT)
      .eq("date", date)
      .maybeSingle();
    if (existing) {
      const row = existing as SharedDevotionalRow;
      // Backfill a missing cover in the background - doesn't block the read
      // and doesn't affect fallback logic. Fire-and-forget.
      if (!row.cover_image_url)
        void backfillCoverForRow(
          date,
          existing as { theme?: string | null; title?: string | null; takeaway?: string | null },
        );
      return sharedRowToResult(row, dateDisplay);
    }

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
      if (!pool.length)
        throw new Error(`Shared devotional: no active verses for theme ${themeName}`);

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
        date,
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
        .select(SHARED_DEVOTIONAL_SELECT)
        .eq("date", date)
        .maybeSingle();
      if (persisted) {
        const persistedRow = persisted as SharedDevotionalRow;
        // Generate the cover image now that the text is stored. First writer
        // to persist owns cover generation too; a second racer sees a row
        // and skips this branch entirely. Result: exactly one cover per date.
        // Cover generation runs sequentially here (not fire-and-forget) so
        // the returned devotional carries coverImageUrl and shares/OG cards
        // render immediately without a second round-trip.
        if (!persistedRow.cover_image_url) {
          const { generateAndStoreDevotionalCover } = await import("@/lib/devotional-cover.server");
          const url = await generateAndStoreDevotionalCover({
            date,
            theme: themeName,
            title: result.title,
            takeaway: result.takeaway,
          });
          if (url) {
            await admin.from("daily_devotionals").update({ cover_image_url: url }).eq("date", date);
            persistedRow.cover_image_url = url;
          }
        }
        return sharedRowToResult(persistedRow, dateDisplay);
      }

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
        .select(
          "date, theme, verse_text, verse_reference, title, body, related, takeaway, cover_image_url",
        )
        .lt("date", date)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastGood) {
        console.error(
          "[shared-devotional] generation/persist failed; serving most recent devotional:",
          err,
        );
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
        console.error(
          "[shared-devotional] persist failed with no stored fallback; serving local generation:",
          err,
        );
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
      .select(SHARED_DEVOTIONAL_SELECT)
      .eq("date", data.date)
      .maybeSingle();
    if (!existing) return null;
    const row = existing as SharedDevotionalRow;
    if (!row.cover_image_url)
      void backfillCoverForRow(
        data.date,
        existing as { theme?: string | null; title?: string | null; takeaway?: string | null },
      );
    return sharedRowToResult(row, devotionalDisplayDate(data.date));
  });

// Fire-and-forget cover backfill for a devotional row that pre-dates the
// cover-image column (or where the cover generation failed on the original
// write). Never throws, never blocks the caller.
async function backfillCoverForRow(
  date: string,
  row: { theme?: string | null; title?: string | null; takeaway?: string | null },
) {
  try {
    const { generateAndStoreDevotionalCover } = await import("@/lib/devotional-cover.server");
    const url = await generateAndStoreDevotionalCover({
      date,
      theme: row.theme ?? "Hope",
      title: row.title ?? "",
      takeaway: row.takeaway ?? "",
    });
    if (url)
      await admin.from("daily_devotionals").update({ cover_image_url: url }).eq("date", date);
  } catch (err) {
    console.error("[shared-devotional] cover backfill failed:", err);
  }
}
