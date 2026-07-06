import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Returns a short-lived signed URL for a private audio file in the
 * `listen-audio` Supabase Storage bucket. The bucket is private; this
 * function is the only way the client can play a track.
 *
 * Auth-gated: only signed-in users can request URLs. Path is validated
 * to prevent traversal. URLs expire in 1 hour — long enough to play a
 * full track, short enough to keep links un-shareable.
 */
export const getSignedAudioUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        // e.g. "album-1/track-03.mp3" — no leading slash, no ".."
        path: z
          .string()
          .min(1)
          .max(255)
          .regex(/^[a-zA-Z0-9_\-/.]+$/, "invalid characters")
          .refine((p) => !p.includes(".."), "path traversal not allowed")
          .refine((p) => !p.startsWith("/"), "no leading slash"),
        expiresIn: z.number().int().min(60).max(3600).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/admin.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("listen-audio")
      .createSignedUrl(data.path, data.expiresIn ?? 3600);

    if (error || !signed) {
      console.error("getSignedAudioUrl error:", error?.message);
      return { url: null as string | null, error: "Could not sign URL" };
    }
    return { url: signed.signedUrl, error: null as string | null };
  });
