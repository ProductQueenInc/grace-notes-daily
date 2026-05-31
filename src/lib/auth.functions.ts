import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Reads the Cloudflare IP-country header server-side and persists it to the
// user's profile. Runs on every login; safe to call repeatedly (idempotent update).
export const syncCountryCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ({}))
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const country =
      getRequestHeader("cf-ipcountry") ??
      getRequestHeader("x-vercel-ip-country") ??
      null;

    // XX = unknown / VPN exit node — don't persist
    if (!country || country === "XX") return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("profiles") as any)
      .update({ country_code: country })
      .eq("id", userId);

    return country;
  });
