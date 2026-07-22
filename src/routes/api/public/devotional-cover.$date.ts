// Public proxy that serves devotional cover images from the PRIVATE
// TKOEBO `devotional-covers` bucket. We can't use a public bucket, and
// signed URLs expire and break social share previews - so we serve a stable
// public URL through this route and let CDNs cache it long-term.
//
// URL shape: /api/public/devotional-cover/<YYYY-MM-DD>.png
//
// Storage source of truth: TKOEBO GraceNotes backend
// (tkoebogweygaabndrsvl), where the live `generate-daily-devotional` edge
// function writes cover images. Do not try Lovable Cloud first.

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

// TKOEBO is not injected by Lovable Cloud, so we build a fresh service-role
// client on demand. Key stored as TKOEBO_SERVICE_ROLE_KEY.
async function downloadFromTkoebo(key: string): Promise<ArrayBuffer | null> {
  const serviceKey = process.env.TKOEBO_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("[devotional-cover-proxy] TKOEBO_SERVICE_ROLE_KEY missing");
    return null;
  }
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(TKOEBO_URL, serviceKey, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (serviceKey.startsWith("sb_") && headers.get("Authorization") === `Bearer ${serviceKey}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", serviceKey);
          return fetch(input, { ...init, headers });
        },
      },
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

        const tkoeboBuf = await downloadFromTkoebo(key);
        if (tkoeboBuf) return pngResponse(tkoeboBuf);

        return new Response("Not found", { status: 404 });
      },
    },
  },
});
