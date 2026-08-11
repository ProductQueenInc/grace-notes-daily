import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type InferredTheme = {
  theme: string;
  weight?: number;
  last_seen?: string;
};

export type InferredThemesPayload = {
  themes: InferredTheme[];
  updated_at: string | null;
};

// ACTUAL storage shape of profiles.inferred_themes, written by the nightly
// daily-chat classifier (generate-daily-grace-notes/index.ts) and the
// heart-notes classifier (classify-heart-note-theme/index.ts): a flat map of
// { [tag]: { weight, last_seen } }. This function used to assume a totally
// different shape ({ themes: [...], updated_at }), which meant Settings could
// never display a theme even once the classifiers were writing correctly --
// found and fixed 2026-08-11. Keep this shape in sync with the `ThemeMap`
// type in both edge functions above if it ever changes.
type StoredThemeMap = Record<string, { weight?: number; last_seen?: string } | null | undefined>;

function normalize(raw: unknown): InferredThemesPayload {
  // The column also currently defaults to '[]'::jsonb for new profiles
  // (array, not object) -- treat that the same as "nothing yet".
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { themes: [], updated_at: null };
  }
  const map = raw as StoredThemeMap;
  const themes: InferredTheme[] = [];
  let latest: string | null = null;
  for (const [tag, v] of Object.entries(map)) {
    if (!tag || !v || typeof v !== "object") continue;
    const entry: InferredTheme = { theme: tag };
    if (typeof v.weight === "number") entry.weight = v.weight;
    if (typeof v.last_seen === "string") {
      entry.last_seen = v.last_seen;
      if (!latest || v.last_seen > latest) latest = v.last_seen;
    }
    themes.push(entry);
  }
  // Strongest theme first so it's the first chip a user sees in Settings.
  themes.sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
  return { themes, updated_at: latest };
}

function toStoredMap(themes: InferredTheme[]): StoredThemeMap {
  const map: StoredThemeMap = {};
  for (const t of themes) {
    map[t.theme] = { weight: t.weight, last_seen: t.last_seen };
  }
  return map;
}

export const getInferredThemes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InferredThemesPayload> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("inferred_themes")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return normalize((data as { inferred_themes?: unknown } | null)?.inferred_themes);
  });

export const deleteInferredTheme = createServerFn({ method: "POST" })
  .inputValidator((input: { theme: string }) => {
    if (!input || typeof input.theme !== "string" || !input.theme.trim()) {
      throw new Error("theme is required");
    }
    return { theme: input.theme.trim() };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<InferredThemesPayload> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("profiles")
      .select("inferred_themes")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    const current = normalize((row as { inferred_themes?: unknown } | null)?.inferred_themes);
    const nextThemes = current.themes.filter((t) => t.theme !== data.theme);
    // Write back in the SAME flat tag-map shape the classifiers use --
    // writing the old {themes, updated_at} wrapper here would silently break
    // the next classifier run or note-generation read of this column.
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ inferred_themes: toStoredMap(nextThemes) })
      .eq("id", userId);
    if (updateError) throw updateError;
    return { themes: nextThemes, updated_at: new Date().toISOString() };
  });
