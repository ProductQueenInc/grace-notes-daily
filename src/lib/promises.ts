// Rotating "voice-of-God" footer lines. These replace the old
// "Walk gently. You are loved." platitude with first-person promises grounded
// in biblical themes (provision, peace, power, presence). Cindy's seed copy.
//
// One line is shown per calendar day, deterministic per local date so the
// user doesn't see it flicker between renders. Backend can later swap this
// for an AI-generated, per-user rotation stored in Supabase — keep the same
// export signature (`pickDailyPromise(date?: Date): string`) when you do.

const PROMISES: string[] = [
  "I feed the birds daily. I'll feed you too. Relax.",
  "Remember, I can bring dead bones to life.",
  "That peace you're looking for: I have it. Come to Me.",
  "If it's heavy, it's Mine. Bring it to Me.",
  "I long to be good to you. Relax and watch Me do it.",
  "Yes, you want it. But have you asked Me for it?",
  "I already gave you power, love, and a sound mind. Don't be afraid.",
  "I see you in the quiet. You are not overlooked.",
  "Before you spoke, I already heard. Keep going.",
  "The same hands that hold the stars are holding you.",
  "I am not in a hurry with you. Breathe.",
  "What you carry alone, I carry with you.",
  "I called you by name. You belong to Me.",
  "My mercy is new again this morning. Take it.",
  "You don't have to earn your place at My table.",
  "Come closer today.",
  "You can put it down. I already picked it up.",
  "I'm not keeping score. I never was.",
  "Say it messy. I'm not grading the delivery.",
  "You already have what today needs.",
  "I'm not far. I'm close enough to touch.",
  "Bring Me the version of you that's tired. That one's welcome too.",
  "You don't need a better mood to talk to Me.",
  "I noticed. Even the small thing.",
  "Whatever you're bracing for, brace less. I'm already in it.",
  "You can stop performing for Me. I already know you.",
  "I'm not waiting for you to fix yourself first.",
  "The version of you right now is enough.",
  "I'm not tired of you asking again.",
  "You get to come back as many times as it takes.",
  "I'm close enough to hear what you didn't say out loud.",
  "Nothing you bring Me today is too small to matter.",
  "I already know what the next step needs. Walk it with Me.",
  "You're allowed to need Me again today.",
  "I'm not disappointed. I'm just here.",
];

// --- No-repeat-within-a-month shuffle ---
//
// Cindy's rule (2026-09-09): a line should never repeat within the same
// calendar month, and the order doesn't need to match the list above.
//
// How it works: every calendar month gets its own shuffled ordering of all
// PROMISES.length lines (seeded from that month's year + month number, so
// it's the same shuffle for everyone, every time, with no database needed).
// Day 1 of the month shows the first line in that month's shuffled order,
// day 2 shows the second, and so on. Because every entry in a shuffled list
// is unique, and no month has more days (max 31) than we have lines (35),
// nothing can repeat inside a single month. Each new month reshuffles, so
// the pattern doesn't feel mechanical from month to month either.
//
// (With 35 lines and up to 31 days in a month, 4-6 lines will sit out in any
// given month — that's expected, not a bug. Add more lines to PROMISES any
// time; this logic adapts automatically since it always shuffles the full
// current list.)

function mulberry32(seed: number) {
  return function random(): number {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledOrder(seed: number, length: number): number[] {
  const random = mulberry32(seed);
  const order = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function pickDailyPromise(date: Date = new Date()): string {
  const length = PROMISES.length;
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  const dayOfMonth = date.getDate(); // 1-31

  // One seed per calendar month, so the shuffle is stable all month long
  // and changes again next month.
  const monthSeed = year * 12 + month + 1;
  const order = shuffledOrder(monthSeed, length);

  return PROMISES[order[(dayOfMonth - 1) % length]];
}
