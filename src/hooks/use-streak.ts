import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { isoForDate } from "@/lib/today";

/**
 * Returns the current consecutive gold-day streak.
 * A gold day = devotional + daily_message + journal all true.
 * Counts backwards from today (in the user's LOCAL timezone) and breaks on
 * any gap. Using UTC dates here would mis-attribute days near midnight.
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
        .select("date")
        .eq("user_id", uid)
        .eq("devotional", true)
        .eq("daily_message", true)
        .eq("journal", true)
        .order("date", { ascending: false })
        .then(({ data: rows }) => {
          if (!rows?.length) { setStreak(0); return; }

          let count = 0;
          const cursor = new Date();
          cursor.setHours(0, 0, 0, 0);

          for (const row of rows) {
            const rowDate = (row.date as string).slice(0, 10);
            const expected = isoForDate(cursor);
            if (rowDate === expected) {
              count++;
              cursor.setDate(cursor.getDate() - 1);
            } else {
              break;
            }
          }
          setStreak(count);
        });
    });
  }, []);

  return streak;
}

