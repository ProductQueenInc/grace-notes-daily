import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const SIGNED_URL_TTL = 3600; // 1 hour

export const getSignedAudioUrl = createServerFn({ method: "GET" })
  .validator(z.object({ path: z.string().min(1) }))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      throw new Error("Supabase service role key not configured");
    }

    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: signed, error } = await supabase.storage
      .from("listen-audio")
      .createSignedUrl(data.path, SIGNED_URL_TTL);

    if (error || !signed?.signedUrl) {
      throw new Error(`Could not sign audio URL: ${error?.message}`);
    }

    return { signedUrl: signed.signedUrl };
  });
