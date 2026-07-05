// PLG sharing server functions (roadmap.md Stage 2).
//
// - logShareClick: fire-and-forget ?s= click logging into `share_clicks`.
//   Called from the /library/devotional/$date loader (and, at Stage 4, any
//   other landing surface Lovable wires up). Never throws to the caller.
// - Attribution claim on signup is the `claim_share_attribution(p_token)` RPC
//   (SECURITY DEFINER, authenticated only) - Lovable calls it post-onboarding
//   with the token persisted from the landing page (Stage 4 work).
//
// The render pipeline itself lives in the `render-share-card` edge function;
// nothing in the app generates share images.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { SupabaseClient } from "@supabase/supabase-js";

// `share_clicks` was added after the generated types were last regenerated,
// so cast to a schema-agnostic client (same pattern as ai.functions.ts).
const admin = supabaseAdmin as unknown as SupabaseClient;

// Tokens are 32-char hex (crypto.randomUUID without dashes), minted by
// render-share-card. Reject anything else without touching the DB.
const TokenSchema = z.string().regex(/^[0-9a-f]{32}$/i);

export const logShareClick = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        token: TokenSchema,
        userAgent: z.string().max(400).optional(),
        referrer: z.string().max(600).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    try {
      // FK to share_events(share_token) rejects unknown tokens server-side.
      const { error } = await admin.from("share_clicks").insert({
        share_token: data.token.toLowerCase(),
        user_agent: data.userAgent ?? null,
        referrer: data.referrer ?? null,
      });
      if (error) console.warn("[share] click log skipped:", error.message);
      return { ok: !error };
    } catch (e) {
      console.warn("[share] click log failed:", e);
      return { ok: false };
    }
  });
