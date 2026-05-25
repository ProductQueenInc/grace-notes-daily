import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { isoForDate } from "@/lib/today";

/**
 * Duolingo-style streak: a streak day = any one of devotional / daily_message
 * / journal is true. The walk starts from YESTERDAY, not today — today's
 * tasks count toward the streak only after midnight. This keeps the
 * satisfaction in the rhythm rather than in watching the counter tick over
 * the moment a task is finished.
 */
export function useStreak() {
  const [streak, setStreak] = useState(0);

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

          let count = 0;
          const cursor = new Date();
          cursor.setHours(0, 0, 0, 0);
          // Start from yesterday — today's effort counts tomorrow.
          cursor.setDate(cursor.getDate() - 1);

          while (qualifying.has(isoForDate(cursor))) {
            count++;
            cursor.setDate(cursor.getDate() - 1);
          }
          setStreak(count);
        });
    });
  }, []);

  return streak;
}
