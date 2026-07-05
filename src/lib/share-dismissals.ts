// Tiny localStorage helpers for share-prompt dismissals. Keys are namespaced
// per trigger. Never stored server-side (yet) — the whole point is a quiet
// "not right now" for the current device.

import type { MilestoneTier, ShareType } from "@/lib/share";

const NS = "gn:share-dismiss";

type DismissKind = ShareType | "milestone-tier";

function key(kind: DismissKind, id: string | number): string {
  return `${NS}:${kind}:${id}`;
}

function safeGet(k: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(k);
  } catch {
    return null;
  }
}

function safeSet(k: string, v: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(k, v);
  } catch {
    /* quota / private mode */
  }
}

// Devotional: one-shot per devotional date (YYYY-MM-DD).
export const devotionalShareDismissed = (date: string) =>
  safeGet(key("devotional", date)) === "1";
export const dismissDevotionalShare = (date: string) =>
  safeSet(key("devotional", date), "1");

// Answered prayer: one-shot per prayer submission.
export const answeredPrayerShareDismissed = (id: string) =>
  safeGet(key("answered_prayer", id)) === "1";
export const dismissAnsweredPrayerShare = (id: string) =>
  safeSet(key("answered_prayer", id), "1");

// Milestone: one dismiss per tier, forever.
export const milestoneShareDismissed = (tier: MilestoneTier) =>
  safeGet(key("milestone-tier", tier)) === "1";
export const dismissMilestoneShare = (tier: MilestoneTier) =>
  safeSet(key("milestone-tier", tier), "1");

// Also track that a milestone has been *seen* (either shared or dismissed)
// so the watcher never auto-opens the same tier twice.
export const milestoneShareSeen = (tier: MilestoneTier) =>
  safeGet(key("milestone-tier", `${tier}:seen`)) === "1" ||
  milestoneShareDismissed(tier);
export const markMilestoneShareSeen = (tier: MilestoneTier) =>
  safeSet(key("milestone-tier", `${tier}:seen`), "1");
