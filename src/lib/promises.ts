// Rotating "voice-of-God" footer lines. These replace the old
// "Walk gently. You are loved." platitude with first-person promises grounded
// in biblical themes (provision, peace, power, presence). Cindy's seed copy.
//
// A new line is shown each day, deterministic per local date so the user
// doesn't see it flicker between renders. Backend can later swap this for an
// AI-generated, per-user rotation stored in Supabase — keep the same export
// signature (`pickDailyPromise(date?: Date): string`) when you do.

const PROMISES: string[] = [
  "I feed the birds daily. I'll feed you too. Relax.",
  "Remember, I can bring dead bones to life.",
  "That peace you're looking for — I have it. Come to Me.",
  "If it's heavy, it's Mine. Bring it to Me.",
  "I long to be good to you. Relax and watch Me do it.",
  "Yes, you want it — but have you asked Me for it?",
  "I already gave you power, love, and a sound mind. Don't be afraid.",
  "I see you in the quiet. You are not overlooked.",
  "Before you spoke, I already heard. Keep going.",
  "The same hands that hold the stars are holding you.",
  "I am not in a hurry with you. Breathe.",
  "What you carry alone, I carry with you.",
  "I called you by name. You belong to Me.",
  "My mercy is new again this morning. Take it.",
  "You don't have to earn your place at My table.",
];

export function pickDailyPromise(date: Date = new Date()): string {
  // Deterministic per-day index in the user's local time.
  const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dayKey.length; i++) hash = (hash * 31 + dayKey.charCodeAt(i)) >>> 0;
  return PROMISES[hash % PROMISES.length];
}
