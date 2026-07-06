// Public proxy that serves rendered share cards from the PRIVATE
// `share-cards` bucket (same pattern as devotional-cover.$date: public
// buckets are blocked by workspace policy, and signed URLs expire and
// break share previews - so we serve a stable public URL and let CDNs
// cache it long-term).
//
// URL shape: /api/public/share-card/<template>-<WxH>-<hash32>.png
// Keys are content-addressed by the render-share-card edge function
// (sha256 of the render inputs + template version), hence immutable.

import { createFileRoute } from "@tanstack/react-router";

const BUCKET = "share-cards";
const KEY_RE = /^(grace-note|devotional|answered-prayer|streak-calendar)-\d{3,4}x\d{3,4}-[0-9a-f]{32}\.png$/;

export const Route = createFileRoute("/api/public/share-card/$key")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const key = params.key;
        if (!KEY_RE.test(key)) return new Response("Invalid key", { status: 400 });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(key);
          if (error || !data) {
            console.error("[share-card-proxy] download failed", {
              bucket: BUCKET,
              key,
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
              // Content-addressed keys are immutable; template changes bump
              // TEMPLATE_VERSION in the edge function and produce new keys.
              "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
            },
          });
        } catch (err) {
          // Catches failures BEFORE the storage call too (e.g. the admin
          // client's env-var guard throwing), which previously surfaced as
          // an indistinguishable 404 with no trace of the real cause.
          console.error("[share-card-proxy] handler threw before/around download", {
            bucket: BUCKET,
            key,
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
