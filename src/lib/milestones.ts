import type { MilestoneTier } from "@/lib/share";
import { milestoneShareSeen } from "@/lib/share-dismissals";

// Tiers per the plan: 1st gold day, then 5 / 10 / 30 / 60 / 100.
// Every-gold-day celebration is intentionally omitted (share fatigue).
export const TIERS: MilestoneTier[] = [1, 5, 10, 30, 60, 100];

/**
 * Highest tier reached (or crossed) at this streak count. Null if none.
 * Used to know *which* milestone card to render, once the watcher decides
 * a celebration should fire.
 */
export function nextMilestoneTier(streakDays: number): MilestoneTier | null {
  let hit: MilestoneTier | null = null;
  for (const t of TIERS) {
    if (streakDays >= t) hit = t;
  }
  return hit;
}

/**
 * Should the auto-watcher celebrate right now?
 * Fires only when the streak *equals* a tier boundary AND that tier hasn't
 * been shown before. Prevents re-firing on refresh or if the user climbs
 * past a tier without seeing it (they'll get the next boundary instead).
 */
export function shouldCelebrate(streakDays: number): MilestoneTier | null {
  for (const t of TIERS) {
    if (streakDays === t && !milestoneShareSeen(t)) return t;
  }
  return null;
}
