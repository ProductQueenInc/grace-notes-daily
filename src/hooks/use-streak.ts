import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { isoForDate } from "@/lib/today";
import type { HabitState } from "@/hooks/use-habits";

/**
 * Show-up streak: counts the TOTAL number of days the user has shown up
 * (completed at least one of devotional / daily_message / journal). Skipping
 * a day does not reset the count — every qualifying day is counted forever.
 *
 * Today is included as soon as the user completes any one habit. Live updates
 * arrive via the "gn:habits-change" custom event dispatched from use-habits.
 */
export function useStreak() {
  const [streak, setStreak] = useState(0);
  const [liveTodayQualifies, setLiveTodayQualifies] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const onHabitsChange = (e: Event) => {
      const detail = (e as CustomEvent<{ date?: string; state?: HabitState }>).detail;
      if (!detail?.state) return;
      // Events are date-stamped (use-habits). Only a mark for TODAY makes
      // today qualify live — marking a past day's devotional must not.
      if (detail.date === isoForDate(new Date())) {
        const { devotional, dailyMessage, journal } = detail.state;
        setLiveTodayQualifies(!!(devotional || dailyMessage || journal));
      }
      // Any mark (today or a past day) can add a newly qualifying day.
      setRefreshTick((t) => t + 1);
    };
    window.addEventListener("gn:habits-change", onHabitsChange);
    return () => window.removeEventListener("gn:habits-change", onHabitsChange);
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;

      supabase
        .from("daily_habits")
        .select("date, devotional, daily_message, journal")
        .eq("user_id", uid)
        .then(({ data: rows }) => {
          const qualifying = new Set(
            (rows ?? [])
              .filter((r) => r.devotional || r.daily_message || r.journal)
              .map((r) => (r.date as string).slice(0, 10)),
          );
          if (liveTodayQualifies) {
            qualifying.add(isoForDate(new Date()));
          }
          setStreak(qualifying.size);
        });
    });
  }, [liveTodayQualifies, refreshTick]);

  return streak;
}
