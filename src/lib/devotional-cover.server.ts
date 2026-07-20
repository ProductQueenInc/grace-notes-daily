// Server-only helper. Generates an AI cover image for a devotional using the
// Lovable AI Gateway (google/gemini-3.1-flash-image) and uploads it to the
// PRIVATE `devotional-covers` bucket. Returns the stable public proxy URL
// (served by /api/public/devotional-cover/<date>.png) or null on failure.
//
// Failure is non-fatal: the devotional row still ships without a cover;
// callers fall back to the parchment/DoveMark tile on the frontend.
//
// PROMPT POLICY: this file is the canonical cover-image builder used by
// getOrCreateSharedDevotional in src/lib/ai.functions.ts. The overnight
// cron in supabase/functions/generate-daily-devotional/index.ts carries an
// INLINED copy of the same prompt (edge functions can't import from src/).
// If you change the prompt here, update the cron too - see CLAUDE.md §5.

import { supabaseAdmin } from "@/integrations/supabase/admin.server";
import { BASE_URL } from "@/lib/library";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/images/generations";
const MODEL = "google/gemini-3.1-flash-image";
const BUCKET = "devotional-covers";

// Stable public URL served by the proxy route (see
// src/routes/api/public/devotional-cover.$date.ts). The bucket is private,
// so we never expose signed URLs (they expire and break social previews).
export function coverPublicUrl(date: string) {
  return `${BASE_URL}/api/public/devotional-cover/${date}.png`;
}

// Deterministic demographic rotation — one specific person per date,
// cycling through the full list so no demographic becomes the default.
// Add or reorder entries here to adjust representation over time.
const SUBJECT_ROTATION = [
  "a Black woman in her early 30s",
  "a white man in his late 40s",
  "a South Asian woman in her mid-30s",
  "a Latina woman in her late 20s",
  "an East Asian man in his early 50s",
  "a Middle Eastern woman in her early 40s",
  "a white woman in her late 30s",
  "a mixed-race man in his late 40s",
  "a Black man in his early 40s",
  "a Latina woman in her early 50s",
];

// Maps devotional theme to a setting tone and emotional posture.
// Steers the AI toward the right environment without prescribing it literally.
const THEME_CONTEXT: Record<string, { setting: string; moment: string }> = {
  hope: {
    setting: "a modern kitchen, office window, or city park — morning light, the start of something",
    moment: "quietly open to something they cannot quite name yet",
  },
  peace: {
    setting: "a private interior — parked car, apartment living room, corner of a coffee shop",
    moment: "still. not needing to fix anything right now",
  },
  "grief & comfort": {
    setting: "a private space — parked car after arriving home, living room at night, clean modern hospital room, empty office after hours",
    moment: "sitting with something that cannot be solved. not crying, or just finished crying",
  },
  grief: {
    setting: "a private space — parked car after arriving home, living room at night, clean modern hospital room",
    moment: "sitting with something that cannot be solved. not crying, or just finished crying",
  },
  gratitude: {
    setting: "a domestic or quiet social moment — kitchen with morning light, table after dinner, a window with a view",
    moment: "quietly aware of something good that almost went unnoticed",
  },
  courage: {
    setting: "a threshold — hallway outside an office door, parking lot before walking in, desk before making a difficult call",
    moment: "about to do the hard thing. still deciding, but leaning toward yes",
  },
  rest: {
    setting: "a quiet interior — bedroom with morning light, couch at the end of a long week, coffee shop with no laptop open",
    moment: "finally allowed to stop. the exhale after a long hold",
  },
  purpose: {
    setting: "a professional or creative space — desk, modern office, coffee shop with an open notebook",
    moment: "seeing their work with new eyes. not burned out — something just became clear",
  },
};

const DEFAULT_CONTEXT = {
  setting: "a modern everyday space — office, apartment, coffee shop, or city park",
  moment: "in a quiet, honest moment with themselves",
};

// Converts YYYY-MM-DD to a stable integer for rotation indexing.
function dateIndex(dateStr: string): number {
  return parseInt(dateStr.replace(/-/g, ""), 10);
}

export function buildCoverPrompt(theme: string, title: string, takeaway: string, dateStr: string): string {
  const subject = SUBJECT_ROTATION[dateIndex(dateStr) % SUBJECT_ROTATION.length];
  const ctx = THEME_CONTEXT[theme.toLowerCase()] ?? DEFAULT_CONTEXT;

  return `Generate a photographic cover image for a Christian devotional article.

DEVOTIONAL TITLE: "${title}"
EMOTIONAL CORE (use for tone only — do not depict literally): "${takeaway}"

SUBJECT: ${subject}, ${ctx.setting}.

This person is ${ctx.moment}. The specific emotional truth of this devotional — based on the title above — should be visible in their face, their posture, or their stillness. Not a posed expression. A real moment you were not supposed to see.

AUDIENCE: Middle-income professionals aged 25–50. Show environments they actually live in — modern offices, clean apartments, decent hospitals, city parks, cars, kitchens, coffee shops, airport lounges. Not aspirational luxury. Not under-resourced or visibly underfunded settings.

PHOTOGRAPHIC STYLE:
- 35mm film photograph or cinematic documentary still
- Muted, desaturated palette
- Subtle sage or forest green in the environment — plants, window light, curtains, or a light color grade. Present but not dominant.
- Natural light only (morning, golden hour, overcast window light, lamp)
- Candid — not posed, not smiling at camera, not stock photo aesthetics
- One person; occasionally two in quiet proximity

DO NOT INCLUDE: text of any kind, watermarks, crosses or religious symbols used decoratively (halos, angels, doves as icons), brand logos, stock photo smile-at-camera poses, visual markers of poverty or neglect, overtly staged or editorial compositions.

The image should make someone scrolling past pause — not because it is dramatic, but because it is honest and specific.`;
}


async function generateImageBase64(prompt: string): Promise<string | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    console.warn("[devotional-cover] LOVABLE_API_KEY missing; skipping image generation");
    return null;
  }
  try {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: MODEL,
        // Gemini image models use the chat-completions image shape.
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[devotional-cover] gateway ${res.status}:`, text.slice(0, 500));
      return null;
    }
    const json = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) console.error("[devotional-cover] gateway returned no b64_json");
    return b64 ?? null;
  } catch (err) {
    console.error("[devotional-cover] gateway fetch failed:", err);
    return null;
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function generateAndStoreDevotionalCover(params: {
  date: string;
  theme: string;
  title: string;
  takeaway: string;
}): Promise<string | null> {
  const prompt = buildCoverPrompt(params.theme, params.title, params.takeaway, params.date);
  const b64 = await generateImageBase64(prompt);
  if (!b64) return null;
  try {
    const bytes = base64ToBytes(b64);
    const path = `${params.date}.png`;
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: "image/png",
        upsert: true,
        cacheControl: "31536000",
      });
    if (error) {
      console.error(`[devotional-cover] upload failed for ${params.date}:`, error.message);
      return null;
    }
    return coverPublicUrl(params.date);
  } catch (err) {
    console.error("[devotional-cover] unexpected error:", err);
    return null;
  }
}
