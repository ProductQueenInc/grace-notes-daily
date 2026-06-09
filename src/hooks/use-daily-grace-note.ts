import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { localTodayISO } from "@/lib/today";
import { generateGraceNote } from "@/lib/ai-stubs";
import { useAuth } from "@/hooks/use-auth";

export type DailyGraceNote = {
  message: string;
  verse: string; // "verse text - Book 1:1" (matches existing UI parser)
  signed: string;
  // Raw fields for chat context
  graceNoteRaw: string;
  verseText: string;
  verseReference: string;
  segment: string;
  posture: string;
  // Dynamic chat prompt that flows from the grace note. Empty string when
  // served from the cron path (daily_grace_notes table) until a DB column
  // is added; UI falls back to a static label in that case.
  chatPrompt: string;
};

function postureFromPhase(phase: string | null | undefined): string {
  const map: Record<string, string> = {
    newbie: "hope",
    returnee: "hope",
    growth: "purpose",
    elder: "faith",
  };
  return map[phase ?? ""] ?? "hope";
}

export function useDailyGraceNote() {
  const { profile, user } = useAuth();
  const today = localTodayISO();

  return useQuery({
    queryKey: ["daily-grace-note", today, user?.id ?? null],
    enabled: !!profile && !!user,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    queryFn: async (): Promise<DailyGraceNote> => {
      const segment = profile?.faith_phase ?? "newbie";
      const posture = postureFromPhase(profile?.faith_phase);

      // 1. Try the cron-prepared note for today.
      const { data: row } = await supabase
        .from("daily_grace_notes")
        .select("grace_note, verse_text, verse_reference")
        .eq("user_id", user!.id)
        .eq("date", today)
        .maybeSingle();

      if (row && row.grace_note) {
        const verseText = (row.verse_text as string) ?? "";
        const verseRef = (row.verse_reference as string) ?? "";
        return {
          message: row.grace_note as string,
          verse: verseText && verseRef ? `${verseText} - ${verseRef}` : verseText || verseRef,
          signed: "",
          graceNoteRaw: row.grace_note as string,
          verseText,
          verseReference: verseRef,
          segment,
          posture,
          chatPrompt: "", // not yet stored in daily_grace_notes; UI falls back to default
        };
      }

      // 2. Fallback: generate on demand via existing AI server fn.
      const fresh = await generateGraceNote(profile ?? null);
      const raw = fresh.verse || "";
      const idx = raw.lastIndexOf(" - ");
      const verseText = idx > 0 ? raw.slice(0, idx).trim() : "";
      const verseRef = idx > 0 ? raw.slice(idx + 3).trim() : raw.trim();
      return {
        message: fresh.message,
        verse: fresh.verse,
        signed: fresh.signed,
        graceNoteRaw: fresh.message,
        verseText,
        verseReference: verseRef,
        segment,
        posture,
        chatPrompt: fresh.chatPrompt || "",
      };
    },
  });
}
