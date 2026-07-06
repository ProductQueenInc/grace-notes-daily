// Public proxy that serves devotional cover images from the PRIVATE
// `devotional-covers` bucket. We can't use a public bucket (workspace
// policy blocks them), and signed URLs expire and break social share
// previews - so we serve a stable public URL through this route and let
// CDNs cache it long-term.
//
// URL shape: /api/public/devotional-cover/<YYYY-MM-DD>.png
// The `.png` suffix is cosmetic (helps some crawlers detect the type);
// the actual date lookup strips any trailing extension.

import { createFileRoute } from "@tanstack/react-router";

const BUCKET = "devotional-covers";

function parseDate(param: string): string | null {
  const stripped = param.replace(/\.(png|jpg|jpeg|webp)$/i, "");
  return /^\d{4}-\d{2}-\d{2}$/.test(stripped) ? stripped : null;
}

export const Route = createFileRoute("/api/public/devotional-cover/$date")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const date = parseDate(params.date);
        if (!date) return new Response("Invalid date", { status: 400 });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
          const { data, error } = await supabaseAdmin.storage
            .from(BUCKET)
            .download(`${date}.png`);
          if (error || !data) {
            console.error("[devotional-cover-proxy] download failed", {
              bucket: BUCKET,
              key: `${date}.png`,
              message: error?.message,
              name: error?.name,
            });
            // TEMP DIAGNOSTIC: surface the real cause in the response body
            // itself (no secrets in a storage error message) so it can be
            // read via a plain request instead of digging through logs.
            // Revert to a bare "Not found" once the root cause is fixed.
            return new Response(
              `Not found (diag: ${error?.name ?? "no-error"}: ${error?.message ?? "no data returned"})`,
              { status: 404 },
            );
          }

          const buffer = await data.arrayBuffer();
          return new Response(buffer, {
            status: 200,
            headers: {
              "Content-Type": "image/png",
              // Long-lived cache; covers are immutable per date. If we ever
              // regenerate one, bust the URL by appending a version query.
              "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
            },
          });
        } catch (err) {
          // Catches failures BEFORE the storage call too (e.g. the admin
          // client's env-var guard throwing), which previously surfaced as
          // an indistinguishable 404 with no trace of the real cause.
          console.error("[devotional-cover-proxy] handler threw before/around download", {
            bucket: BUCKET,
            key: `${date}.png`,
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
          });
          // TEMP DIAGNOSTIC: same reasoning as above - safe to surface,
          // revert once fixed.
          return new Response(
            `Not found (diag: threw before download: ${err instanceof Error ? err.message : String(err)})`,
            { status: 404 },
          );
        }
      },
    },
  },
});
