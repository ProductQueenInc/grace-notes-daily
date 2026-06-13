import { useEffect, useState, useCallback } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { localTodayISO } from "@/lib/today";

export type HabitKey = "devotional" | "dailyMessage" | "journal";
export type HabitState = Record<HabitKey, boolean>;

const EMPTY: HabitState = { devotional: false, dailyMessage: false, journal: false };

// ── localStorage helpers (fallback when not authenticated) ────────────────────
// Keys are local-date based so they roll over at the user's midnight, not UTC.

function todayKey() {
  return `gn:habits:${localTodayISO()}`;
}

function todayISO() {
  return localTodayISO();
}

function readLocal(): HabitState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(todayKey());
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeLocal(state: HabitState) {
  localStorage.setItem(todayKey(), JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("gn:habits-change", { detail: { state } }));
}

// ── DB helpers ────────────────────────────────────────────────────────────────

const DB_COL: Record<HabitKey, string> = {
  devotional: "devotional",
  dailyMessage: "daily_message",
  journal: "journal",
};

async function fetchFromDB(userId: string): Promise<HabitState> {
  const { data } = await supabase
    .from("daily_habits")
    .select("devotional, daily_message, journal")
    .eq("user_id", userId)
    .eq("date", todayISO())
    .maybeSingle();

  if (!data) return EMPTY;
  return {
    devotional: data.devotional ?? false,
    dailyMessage: data.daily_message ?? false,
    journal: data.journal ?? false,
  };
}

async function markInDB(userId: string, key: HabitKey): Promise<HabitState> {
  const col = DB_COL[key];
  await supabase.from("daily_habits").upsert(
    { user_id: userId, date: todayISO(), [col]: true },
    { onConflict: "user_id,date" },
  );
  return fetchFromDB(userId);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Habits can only be marked complete by performing the underlying action.
 * - devotional  → user taps "I Receive This" in DevotionalModal
 * - dailyMessage → user sends a reply in the Grace Note chat
 * - journal     → user submits a Heart Note
 */
export function useHabits() {
  const [habits, setHabits] = useState<HabitState>(EMPTY);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setHabits(readLocal());
      const onChange = () => setHabits(readLocal());
      window.addEventListener("gn:habits-change", onChange);
      window.addEventListener("storage", onChange);
      return () => {
        window.removeEventListener("gn:habits-change", onChange);
        window.removeEventListener("storage", onChange);
      };
    }

    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        fetchFromDB(uid).then(setHabits);
      } else {
        setHabits(readLocal());
      }
    });
  }, []);

  const markComplete = useCallback(
    async (key: HabitKey) => {
      if (supabaseConfigured && userId) {
        const next = await markInDB(userId, key);
        setHabits(next);
        // Notify streak hook so the flame updates immediately on gold day.
        window.dispatchEvent(new CustomEvent("gn:habits-change", { detail: { state: next } }));
      } else {
        const next = { ...readLocal(), [key]: true };
        writeLocal(next);
        setHabits(next);
      }
    },
    [userId],
  );

  return { habits, markComplete };
}
