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

function normalize(raw: unknown): InferredThemesPayload {
  if (!raw || typeof raw !== "object") return { themes: [], updated_at: null };
  const obj = raw as Record<string, unknown>;
  const rawThemes = Array.isArray(obj.themes) ? obj.themes : [];
  const themes: InferredTheme[] = rawThemes
    .map((t) => {
      if (!t || typeof t !== "object") return null;
      const r = t as Record<string, unknown>;
      const theme = typeof r.theme === "string" ? r.theme : null;
      if (!theme) return null;
      return {
        theme,
        weight: typeof r.weight === "number" ? r.weight : undefined,
        last_seen: typeof r.last_seen === "string" ? r.last_seen : undefined,
      };
    })
    .filter((t): t is InferredTheme => t !== null);
  return {
    themes,
    updated_at: typeof obj.updated_at === "string" ? obj.updated_at : null,
  };
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
    const next = {
      themes: nextThemes,
      updated_at: new Date().toISOString(),
    };
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ inferred_themes: next })
      .eq("id", userId);
    if (updateError) throw updateError;
    return next;
  });
