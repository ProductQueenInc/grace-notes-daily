// Share card contract — frozen. Backend will replace `generateShareCard`'s
// body with the real Satori/CDN pipeline. UI must not change the shape.
//
// Version A (2026-07-05): native share sends { title, url } only. The
// backend sets og:image on `deep_link` so unfurls show the card. The
// `image_url` here is what the modal displays in-app for preview + copy.

export type ShareType =
  | "grace_note"
  | "devotional"
  | "answered_prayer"
  | "milestone";

export type MilestoneTier = 1 | 5 | 10 | 30 | 60 | 100;

export type ShareContext =
  | { type: "grace_note"; note_id: string; theme?: string }
  | { type: "devotional"; date: string; theme?: string }
  | { type: "answered_prayer"; prayer_id: string }
  | { type: "milestone"; tier: MilestoneTier; streak: number };

export type ShareCard = {
  image_url: string;
  caption: string;
  deep_link: string;
};

const APP_ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "https://gracenotesdaily.com";

// Mock captions per trigger. Backend swaps these for the real caption bank.
const MOCK_CAPTIONS: Record<ShareType, string[]> = {
  grace_note: [
    "A quiet word from the Father, for today.",
    "This one settled me. Sending it your way.",
  ],
  devotional: [
    "Today's devotional. In case it meets you where you are.",
    "A small light for the middle of your day.",
  ],
  answered_prayer: [
    "He heard. He answered. Giving thanks today.",
    "Adding this one to the pile of quiet miracles.",
  ],
  milestone: [
    "Small daily returns. That's the whole thing.",
    "Showing up, one gentle day at a time.",
  ],
};

function pickCaption(type: ShareType): string {
  const bank = MOCK_CAPTIONS[type];
  return bank[Math.floor(Math.random() * bank.length)];
}

function buildDeepLink(ctx: ShareContext): string {
  switch (ctx.type) {
    case "grace_note":
      return `${APP_ORIGIN}/share/grace-note/${ctx.note_id}`;
    case "devotional":
      return `${APP_ORIGIN}/library/devotional/${ctx.date}`;
    case "answered_prayer":
      return `${APP_ORIGIN}/share/answered-prayer/${ctx.prayer_id}`;
    case "milestone":
      return `${APP_ORIGIN}/share/milestone/${ctx.tier}`;
  }
}

// Mocked image URL — reuses the existing OG image so the modal preview
// looks real during dev. Backend replaces with the rendered share card.
const MOCK_IMAGE = "/og/daily-devotional.png";

/**
 * Frozen contract. Backend swaps the body — must return the same shape.
 * UI treats every rejection as an error state with retry.
 */
export async function generateShareCard(ctx: ShareContext): Promise<ShareCard> {
  // Simulate network latency so the loading skeleton renders visibly.
  await new Promise((r) => setTimeout(r, 550));

  return {
    image_url: MOCK_IMAGE,
    caption: pickCaption(ctx.type),
    deep_link: buildDeepLink(ctx),
  };
}
