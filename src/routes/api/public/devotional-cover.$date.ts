// Public proxy that serves devotional cover images from the PRIVATE
// `devotional-covers` bucket. We can't use a public bucket (workspace
// policy blocks them), and signed URLs expire and break social share
// previews - so we serve a stable public URL through this route and let
// CDNs cache it long-term.
//
// URL shape: /api/public/devotional-cover/<YYYY-MM-DD>.png
//
// Storage lives across TWO Supabase projects:
//   - Lovable Cloud (env SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)
//   - TKOEBO GraceNotes backend (tkoebogweygaabndrsvl) - where the live
//     `generate-daily-devotional` edge function (currently on Unsplash)
//     writes new covers.
// Older covers landed in Lovable Cloud; newer covers land in TKOEBO. We
// try Lovable Cloud first, fall back to TKOEBO. Either hit wins.

import { createFileRoute } from "@tanstack/react-router";

const BUCKET = "devotional-covers";
const TKOEBO_URL = "https://tkoebogweygaabndrsvl.supabase.co";

function parseDate(param: string): string | null {
  const stripped = param.replace(/\.(png|jpg|jpeg|webp)$/i, "");
  return /^\d{4}-\d{2}-\d{2}$/.test(stripped) ? stripped : null;
}

function pngResponse(buffer: ArrayBuffer) {
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      // Long-lived cache; bump COVER_URL_VERSION in devotional-cover.server.ts
      // to force viewers past this.
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}

// TKOEBO fallback: this project is not injected by Lovable Cloud, so we
// build a fresh service-role client on demand. Key stored as
// TKOEBO_SERVICE_ROLE_KEY (existing project secret).
async function downloadFromTkoebo(key: string): Promise<ArrayBuffer | null> {
  const serviceKey = process.env.TKOEBO_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("[devotional-cover-proxy] TKOEBO_SERVICE_ROLE_KEY missing; cannot fall back");
    return null;
  }
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(TKOEBO_URL, serviceKey, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.storage.from(BUCKET).download(key);
    if (error || !data) {
      console.error("[devotional-cover-proxy] tkoebo download failed", {
        key,
        message: error?.message,
        name: error?.name,
      });
      return null;
    }
    return await data.arrayBuffer();
  } catch (err) {
    console.error("[devotional-cover-proxy] tkoebo handler threw", {
      key,
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export const Route = createFileRoute("/api/public/devotional-cover/$date")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const date = parseDate(params.date);
        if (!date) return new Response("Invalid date", { status: 400 });
        const key = `${date}.png`;

        // 1. Try Lovable Cloud first (older covers live here).
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
          const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(key);
          if (!error && data) {
            return pngResponse(await data.arrayBuffer());
          }
          console.warn("[devotional-cover-proxy] cloud miss, trying tkoebo", {
            key,
            message: error?.message,
          });
        } catch (err) {
          console.error("[devotional-cover-proxy] cloud handler threw, trying tkoebo", {
            key,
            message: err instanceof Error ? err.message : String(err),
          });
        }

        // 2. Fall back to TKOEBO (newer covers, from the live edge function).
        const tkoeboBuf = await downloadFromTkoebo(key);
        if (tkoeboBuf) return pngResponse(tkoeboBuf);

        return new Response("Not found", { status: 404 });
      },
    },
  },
});
