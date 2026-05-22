import type { Profile } from "@/hooks/use-auth";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import {
  callGenerateGraceNote,
  callGenerateDevotional,
  callRespondToHeartNote,
  callRespondToDailyMessage,
  buildAIProfile,
  type GraceNoteResult,
  type DevotionalResult,
} from "@/lib/ai.functions";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// ── Grace Note ────────────────────────────────────────────────────────────────
// Cached per user per day in daily_content. Generated once on first load.

export async function generateGraceNote(
  profileOrName: Profile | string | null,
  _phase?: string,
): Promise<GraceNoteResult> {
  const profile = typeof profileOrName === "string" || !profileOrName ? null : profileOrName;
  const aiProfile = buildAIProfile(profile);

  if (supabaseConfigured) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Return cached version if it exists for today
      const { data: cached } = await supabase
        .from("daily_content")
        .select("grace_note")
        .eq("user_id", user.id)
        .eq("date", todayISO())
        .maybeSingle();

      if (cached?.grace_note) return cached.grace_note as GraceNoteResult;

      // Generate fresh
      const result = await callGenerateGraceNote({ data: aiProfile });

      // Cache it
      await supabase.from("daily_content").upsert({
        user_id: user.id,
        date: todayISO(),
        grace_note: result,
      });

      return result;
    }
  }

  // Fallback when not authenticated or Supabase not configured
  return callGenerateGraceNote({ data: aiProfile });
}

// ── Heart Note Response ───────────────────────────────────────────────────────

export async function respondToHeartNote(
  text: string,
  profile?: Profile | null,
): Promise<string> {
  return callRespondToHeartNote({ data: { text, profile: buildAIProfile(profile ?? null) } });
}

// ── Daily Message Conversation ────────────────────────────────────────────────
// History is passed in by the caller (useDailyChat hook).

export async function respondToDailyMessage(
  text: string,
  profile?: Profile | null,
  history?: { role: string; text: string }[],
): Promise<string> {
  return callRespondToDailyMessage({
    data: {
      text,
      profile: buildAIProfile(profile ?? null),
      history: history ?? [],
    },
  });
}

// ── Devotional ────────────────────────────────────────────────────────────────
// Cached per user per day alongside the grace note.

export async function generateDevotional(
  profile?: Profile | null,
): Promise<DevotionalResult> {
  const aiProfile = buildAIProfile(profile ?? null);

  if (supabaseConfigured) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Return cached version
      const { data: cached } = await supabase
        .from("daily_content")
        .select("devotional")
        .eq("user_id", user.id)
        .eq("date", todayISO())
        .maybeSingle();

      if (cached?.devotional) return cached.devotional as DevotionalResult;

      // Generate fresh
      const result = await callGenerateDevotional({ data: aiProfile });

      // Cache alongside grace note (upsert merges)
      await supabase.from("daily_content").upsert({
        user_id: user.id,
        date: todayISO(),
        devotional: result,
      });

      return result;
    }
  }

  return callGenerateDevotional({ data: aiProfile });
}
