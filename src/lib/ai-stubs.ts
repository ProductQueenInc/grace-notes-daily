import type { Profile } from "@/hooks/use-auth";
import {
  getOrCreateGraceNote,
  getOrCreateDevotional,
  callRespondToHeartNote,
  callRespondToDailyMessage,
  buildAIProfile,
  type GraceNoteResult,
  type DevotionalResult,
} from "@/lib/ai.functions";

// Thin wrappers around the server functions.
// Caching, auth, and the AI call all happen server-side in one RPC.

export async function generateGraceNote(
  profileOrName: Profile | string | null,
): Promise<GraceNoteResult> {
  const profile = typeof profileOrName === "string" || !profileOrName ? null : profileOrName;
  return getOrCreateGraceNote({ data: buildAIProfile(profile) });
}

export async function generateDevotional(
  profile?: Profile | null,
): Promise<DevotionalResult> {
  return getOrCreateDevotional({ data: buildAIProfile(profile ?? null) });
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
