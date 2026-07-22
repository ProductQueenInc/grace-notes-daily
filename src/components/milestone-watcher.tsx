import { useEffect, useState } from "react";
import { ShareCardModal } from "@/components/share-card-modal";
import { useStreak } from "@/hooks/use-streak";
import { shouldCelebrate } from "@/lib/milestones";
import {
  dismissMilestoneShare,
  markMilestoneShareSeen,
} from "@/lib/share-dismissals";
import type { MilestoneTier } from "@/lib/share";
import { capture } from "@/lib/analytics";

/**
 * Watches the show-up streak. When it crosses a milestone tier for the
 * first time on this device, opens the share card. Waits a beat to avoid
 * racing with the daily devotional modal opening on load.
 */
export function MilestoneWatcher() {
  const streak = useStreak();
  const [openTier, setOpenTier] = useState<MilestoneTier | null>(null);

  useEffect(() => {
    if (openTier || !streak) return;
    const tier = shouldCelebrate(streak);
    if (!tier) return;

    // Don't stomp another dialog opening on the same tick.
    const t = window.setTimeout(() => {
      const dialogOpen = document.querySelector('[role="dialog"]');
      if (dialogOpen) return;
      // Split from streak_milestone_reached (use-streak.ts) on purpose: the
      // celebration can silently skip (another dialog already open), so this
      // catches the case where a milestone is objectively hit but the user
      // never actually sees the moment.
      capture("streak_milestone_celebration_shown", { tier });
      setOpenTier(tier);
    }, 1500);
    return () => window.clearTimeout(t);
  }, [streak, openTier]);

  if (!openTier) return null;

  return (
    <ShareCardModal
      open
      ctx={{ type: "milestone", tier: openTier, streak }}
      entryPoint="auto_prompt"
      heading={{
        eyebrow: `${openTier}-day rhythm`,
        title:
          openTier === 1
            ? "Your first gold day"
            : `${openTier} days of showing up`,
        subtitle: "A marker for your own walk.",
      }}
      onClose={() => {
        markMilestoneShareSeen(openTier);
        setOpenTier(null);
      }}
      onDismiss={() => dismissMilestoneShare(openTier)}
      onShared={() => markMilestoneShareSeen(openTier)}
    />
  );
}
