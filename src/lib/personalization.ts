import type { Profile } from "@/hooks/use-auth";

export type Rhythm = "morning" | "midday" | "evening" | "night";
export type Voice = "gentle" | "grounding";

/**
 * Capitalize only the first character. Preserve every other character as the
 * user typed it: "hellen" -> "Hellen", "mcDonald" -> "McDonald", "JOHN" -> "JOHN".
 */
export function capitalizeFirst(input: string | null | undefined): string {
  if (!input) return "";
  const s = input.trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Convenience: take the first whitespace-delimited token and capitalize it. */
export function firstNameCap(input: string | null | undefined, fallback = "Friend"): string {
  const raw = (input ?? "").trim();
  if (!raw) return fallback;
  const first = raw.split(/\s+/)[0] || fallback;
  return capitalizeFirst(first);
}

export function currentRhythmWindow(date = new Date()): Rhythm {
  const h = date.getHours();
  if (h < 12) return "morning";
  if (h < 16) return "midday";
  if (h < 21) return "evening";
  return "night";
}

export function pickRhythmGreeting(profile: Profile | null, date = new Date()) {
  const name = firstNameCap(profile?.name);
  const w = currentRhythmWindow(date);
  if (w === "morning") return `Good morning, ${name}`;
  if (w === "midday") return `A midday breath, ${name}`;
  if (w === "evening") return `Welcome back this evening, ${name}`;
  return `Rest gently tonight, ${name}`;
}

export function pickListenRailTitle(profile: Profile | null, date = new Date()) {
  const w = currentRhythmWindow(date);
  if (w === "morning") return "Morning stillness";
  if (w === "midday") return "A midday reset";
  if (w === "evening") return "Evening stillness";
  return "For the quiet of night";
  void profile; // reserved
}

export function toneFromVoice(profile: Profile | null): Voice {
  return (profile?.voice as Voice) || "gentle";
}

export function topSeason(profile: Profile | null): string | null {
  const list = profile?.seasons;
  if (!list || !list.length) return null;
  return list[0]?.tag ?? null;
}
