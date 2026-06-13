import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { isoForDate } from "@/lib/today";
import type { HabitState } from "@/hooks/use-habits";

/**
 * Duolingo-style streak: a streak day = any one of devotional / daily_message
 * / journal is true.
 *
 * Gold-day exception: if the user has completed all three habits today,
 * today counts toward the streak immediately — the flame updates in real time
 * rather than waiting until tomorrow's midnight roll-over.
 *
 * This works without any prop-drilling: use-habits dispatches a
 * "gn:habits-change" custom event (with the full state in event.detail) both
 * on the localStorage path and the DB path. useStreak listens for that event
 * and re-computes whenever it fires. This means all call sites (home.tsx,
 * app-shell.tsx, app-sidebar.tsx) pick up the live update automatically.
 */
export function useStreak() {
  const [streak, setStreak] = useState(0);
  const [liveIsGold, setLiveIsGold] = useState(false);

  // Listen for habit completions dispatched from use-habits.ts.
  useEffect(() => {
    const onHabitsChange = (e: Event) => {
      const detail = (e as CustomEvent<{ state?: HabitState }>).detail;
      if (detail?.state) {
        const { devotional, dailyMessage, journal } = detail.state;
        setLiveIsGold(!!(devotional && dailyMessage && journal));
      }
    };
    window.addEventListener("gn:habits-change", onHabitsChange);
    return () => window.removeEventListener("gn:habits-change", onHabitsChange);
  }, []);

  // Re-compute the streak whenever liveIsGold changes (or on mount).
  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;

      supabase
        .from("daily_habits")
        .select("date, devotional, daily_message, journal")
        .eq("user_id", uid)
        .order("date", { ascending: false })
        .then(({ data: rows }) => {
          if (!rows?.length) { setStreak(0); return; }

          // Keep only days where the user showed up for at least one task.
          const qualifying = new Set(
            rows
              .filter((r) => r.devotional || r.daily_message || r.journal)
              .map((r) => (r.date as string).slice(0, 10)),
          );

          // On initial load, check the DB directly for today's gold status
          // (in case the user is returning to a session where they already
          // completed all three habits).
          const todayStr = isoForDate(new Date());
          const todayRow = rows.find((r) => (r.date as string).slice(0, 10) === todayStr);
          const dbIsGold = !!(todayRow?.devotional && todayRow?.daily_message && todayRow?.journal);
          const isGold = liveIsGold || dbIsGold;

          const cursor = new Date();
          cursor.setHours(0, 0, 0, 0);
          // Gold-day exception: count today now. Otherwise start from yesterday
          // so a partial day doesn't inflate the count.
          if (!isGold) {
            cursor.setDate(cursor.getDate() - 1);
          }

          let count = 0;
          while (qualifying.has(isoForDate(cursor))) {
            count++;
            cursor.setDate(cursor.getDate() - 1);
          }
          setStreak(count);
        });
    });
  }, [liveIsGold]);

  return streak;
}
