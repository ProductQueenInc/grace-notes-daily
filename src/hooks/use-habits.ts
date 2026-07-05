import { useEffect, useState, useCallback } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { localTodayISO } from "@/lib/today";

export type HabitKey = "devotional" | "dailyMessage" | "journal";
export type HabitState = Record<HabitKey, boolean>;

const EMPTY: HabitState = { devotional: false, dailyMessage: false, journal: false };

// ── localStorage helpers (fallback when not authenticated) ────────────────────
// Keys are date-scoped (local YYYY-MM-DD) so each day's state is independent.

function keyFor(date: string) {
  return `gn:habits:${date}`;
}

function readLocal(date: string): HabitState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(keyFor(date));
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeLocal(date: string, state: HabitState) {
  localStorage.setItem(keyFor(date), JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("gn:habits-change", { detail: { date, state } }));
}

// ── DB helpers ────────────────────────────────────────────────────────────────

const DB_COL: Record<HabitKey, string> = {
  devotional: "devotional",
  dailyMessage: "daily_message",
  journal: "journal",
};

async function fetchFromDB(userId: string, date: string): Promise<HabitState> {
  const { data } = await supabase
    .from("daily_habits")
    .select("devotional, daily_message, journal")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (!data) return EMPTY;
  return {
    devotional: data.devotional ?? false,
    dailyMessage: data.daily_message ?? false,
    journal: data.journal ?? false,
  };
}

async function markInDB(userId: string, key: HabitKey, date: string): Promise<HabitState> {
  const col = DB_COL[key];
  await supabase.from("daily_habits").upsert(
    { user_id: userId, date, [col]: true },
    { onConflict: "user_id,date" },
  );
  return fetchFromDB(userId, date);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Habits can only be marked complete by performing the underlying action.
 * - devotional  → user taps "I Receive This" in DevotionalModal
 * - dailyMessage → user sends a reply in the Grace Note chat
 * - journal     → user submits a Heart Note
 *
 * State is DATE-SCOPED:
 * - Pass an explicit `date` (local YYYY-MM-DD) to anchor the hook to that
 *   specific day — e.g. the devotional the user actually has open. Marks
 *   write to THAT day's row, never to "now".
 * - Without a date, the hook tracks the rolling local today and re-anchors
 *   at the user's local midnight (interval + tab refocus), so yesterday's
 *   checkmarks never leak into the new day.
 */
export function useHabits(date?: string) {
  const [rollingToday, setRollingToday] = useState(localTodayISO);
  const effectiveDate = date ?? rollingToday;

  const [habits, setHabits] = useState<HabitState>(EMPTY);
  const [userId, setUserId] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(!supabaseConfigured);

  // Re-anchor "today" at local midnight. Skipped when explicitly anchored.
  useEffect(() => {
    if (date) return;
    const check = () => {
      const now = localTodayISO();
      setRollingToday((prev) => (prev === now ? prev : now));
    };
    const id = window.setInterval(check, 30_000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [date]);

  // Resolve the user once.
  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthResolved(true);
    });
  }, []);

  // (Re)load state whenever the effective date changes (mount, midnight
  // rollover, or a new anchored date).
  useEffect(() => {
    if (!authResolved) return;
    if (supabaseConfigured && userId) {
      let cancelled = false;
      setHabits(EMPTY); // never show a previous day's state while loading
      fetchFromDB(userId, effectiveDate).then((s) => {
        if (!cancelled) setHabits(s);
      });
      return () => {
        cancelled = true;
      };
    }
    setHabits(readLocal(effectiveDate));
  }, [authResolved, userId, effectiveDate]);

  // Cross-instance sync (home card + modal + heart notes). Events are
  // date-stamped; only apply updates for OUR date, so marking yesterday's
  // devotional never flips today's circles.
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { date?: string; state?: HabitState }
        | undefined;
      if (!detail?.date || detail.date !== effectiveDate) return;
      if (detail.state) setHabits(detail.state);
    };
    window.addEventListener("gn:habits-change", onChange);
    const onStorage = () => {
      if (!(supabaseConfigured && userId)) setHabits(readLocal(effectiveDate));
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("gn:habits-change", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [effectiveDate, userId]);

  const markComplete = useCallback(
    async (key: HabitKey) => {
      // Stamp with the hook's anchored date, NOT the wall-clock date at click
      // time. This is the fix for the midnight-crossing bug: marking
      // yesterday's devotional writes to yesterday's row only.
      const targetDate = effectiveDate;
      if (supabaseConfigured && userId) {
        const next = await markInDB(userId, key, targetDate);
        setHabits(next);
        // Notify other hook instances + the streak flame.
        window.dispatchEvent(
          new CustomEvent("gn:habits-change", { detail: { date: targetDate, state: next } }),
        );
      } else {
        const next = { ...readLocal(targetDate), [key]: true };
        writeLocal(targetDate, next);
        setHabits(next);
      }
    },
    [userId, effectiveDate],
  );

  return { habits, markComplete, date: effectiveDate };
}
