import type { Profile } from "@/hooks/use-auth";
import {
  getOrCreateGraceNote,
  getOrCreateDevotional,
  callRespondToHeartNote,
  callRespondToDailyMessage,
  callSummarizeHeartNote,
  buildAIProfile,
  type GraceNoteResult,
  type DevotionalResult,
} from "@/lib/ai.functions";
import { localTodayISO } from "@/lib/today";

// Thin wrappers around the server functions.
// We pass the client's LOCAL date so the server-side daily_content cache keys
// roll over at the user's midnight, not UTC midnight.

export async function generateGraceNote(
  profileOrName: Profile | string | null,
): Promise<GraceNoteResult> {
  const profile = typeof profileOrName === "string" || !profileOrName ? null : profileOrName;
  return getOrCreateGraceNote({
    data: { ...buildAIProfile(profile), clientDate: localTodayISO() },
  });
}

export async function generateDevotional(
  profile?: Profile | null,
): Promise<DevotionalResult> {
  return getOrCreateDevotional({
    data: { ...buildAIProfile(profile ?? null), clientDate: localTodayISO() },
  });
}

export async function respondToHeartNote(
  text: string,
  profile?: Profile | null,
): Promise<string> {
  return callRespondToHeartNote({
    data: { text, profile: buildAIProfile(profile ?? null) },
  });
}

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

export async function summarizeHeartNote(text: string): Promise<string> {
  return callSummarizeHeartNote({ data: { text } });
}
