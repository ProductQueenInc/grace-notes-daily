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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage
          .from(BUCKET)
          .download(`${date}.png`);
        if (error || !data) {
          return new Response("Not found", { status: 404 });
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
      },
    },
  },
});
