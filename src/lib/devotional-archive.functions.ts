// Public read-only server functions over the shared `daily_devotionals` table.
// Used by the library hub hero, the /library/devotional archive index,
// and the prev/next arrows on /library/devotional/$date.
//
// No auth: `daily_devotionals` has a public SELECT policy for anon +
// authenticated. Writes go through the cron + getOrCreateSharedDevotional.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { SupabaseClient } from "@supabase/supabase-js";

// `daily_devotionals` was added after the generated types were last regenerated,
// so cast to a schema-agnostic client (same pattern as ai.functions.ts).
const admin = supabaseAdmin as unknown as SupabaseClient;

export type DevotionalListItem = {
  date: string;
  title: string;
  verseRef: string;
  takeaway: string;
};

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

// Nearest existing devotional dates on either side of a given date.
// Skips gaps (missed cron days, historical holes) - the arrows always land
// on a real row, never a 404.
export const getDevotionalNeighbours = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ date: DateSchema }).parse(data))
  .handler(async ({ data }): Promise<{ prev: string | null; next: string | null }> => {
    const [{ data: prev }, { data: next }] = await Promise.all([
      admin
        .from("daily_devotionals")
        .select("date")
        .lt("date", data.date)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("daily_devotionals")
        .select("date")
        .gt("date", data.date)
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);
    return {
      prev: (prev as { date: string } | null)?.date ?? null,
      next: (next as { date: string } | null)?.date ?? null,
    };
  });

// Paginated list for the archive index (and the recent strip on the hub).
export const listDevotionals = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z
      .object({
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
      .parse(data ?? {}),
  )
  .handler(
    async ({ data }): Promise<{ items: DevotionalListItem[]; total: number }> => {
      const { data: rows, count } = await admin
        .from("daily_devotionals")
        .select("date, title, verse_reference, takeaway", { count: "exact" })
        .order("date", { ascending: false })
        .range(data.offset, data.offset + data.limit - 1);
      const items: DevotionalListItem[] = (
        (rows as
          | { date: string; title: string; verse_reference: string; takeaway: string | null }[]
          | null) ?? []
      ).map((r) => ({
        date: r.date,
        title: r.title,
        verseRef: r.verse_reference,
        takeaway: r.takeaway ?? "",
      }));
      return { items, total: count ?? items.length };
    },
  );

// Most recent stored devotional - used by the library hub hero.
// Returns null when the table is empty.
export const getLatestDevotional = createServerFn({ method: "GET" }).handler(
  async (): Promise<DevotionalListItem | null> => {
    const { data: row } = await admin
      .from("daily_devotionals")
      .select("date, title, verse_reference, takeaway")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row) return null;
    const r = row as {
      date: string;
      title: string;
      verse_reference: string;
      takeaway: string | null;
    };
    return {
      date: r.date,
      title: r.title,
      verseRef: r.verse_reference,
      takeaway: r.takeaway ?? "",
    };
  },
);
