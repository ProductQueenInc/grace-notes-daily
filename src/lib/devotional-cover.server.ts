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

export function buildCoverPrompt(theme: string, title: string, takeaway: string) {
  return `A reverent nature photograph that accompanies a Christian devotional titled "${title}" on the theme of ${theme}.

The image should make the viewer feel something aligned with the theme. Use the takeaway only for emotional tone, NOT for literal depiction:
"${takeaway}"

STYLE: cinematic, painterly natural light, quiet, atmospheric, contemplative. Wide landscape 16:9 orientation. Subjects that stir feeling - a stormy sky for grief, a wide-open calm field for rest, dawn light through mist for hope, a lantern-lit path at night for courage, dew on grass at first light for gratitude, still water for peace, a single tree standing against wind for purpose.

ALLOWED: forests, meadows, mountains, valleys, still water, rivers, oceans, mist, fog, dawn skies, night skies, storms, rain, snow, wildflowers, trees, plants, leaves, moss, stone, open fields, distant paths, gardens.

STRICTLY FORBIDDEN: any human figure or body part (hands, silhouettes, shadows of people), any text or lettering or watermarks, any religious symbols (crosses, doves, chalices, angels, halos), any brand logos, farmed animals or slaughter imagery, weapons, alcohol, cigarettes, vehicles, buildings (except a distant fence, footbridge, or dirt path at most), any commercial or man-made imagery. Do not draw a cross out of tree branches or clouds.`;
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
  const prompt = buildCoverPrompt(params.theme, params.title, params.takeaway);
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
