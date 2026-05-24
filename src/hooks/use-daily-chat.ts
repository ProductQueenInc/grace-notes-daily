import { useEffect, useState, useCallback } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { callRespondToDailyMessage, buildAIProfile } from "@/lib/ai.functions";
import type { Profile } from "@/hooks/use-auth";

export type ChatRole = "user" | "assistant";
export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  ts: number;
}

// ── localStorage helpers (fallback) ───────────────────────────────────────────

function todayKey() {
  const d = new Date();
  return `gn:daily-message:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function readLocal(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(todayKey());
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(msgs: ChatMessage[]) {
  localStorage.setItem(todayKey(), JSON.stringify(msgs));
  window.dispatchEvent(new CustomEvent("gn:daily-chat-change"));
}

// ── DB helpers ─────────────────────────────────────────────────────────────────

async function fetchFromDB(userId: string): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from("daily_messages")
    .select("id, role, text, ts")
    .eq("user_id", userId)
    .eq("date", todayISO())
    .order("ts", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id as string,
    role: row.role as ChatRole,
    text: row.text as string,
    ts: new Date(row.ts as string).getTime(),
  }));
}

async function insertMessage(
  userId: string,
  role: ChatRole,
  text: string,
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from("daily_messages")
    .insert({ user_id: userId, date: todayISO(), role, text })
    .select("id, role, text, ts")
    .single();

  if (error || !data) {
    return { id: crypto.randomUUID(), role, text, ts: Date.now() };
  }
  return {
    id: data.id as string,
    role: data.role as ChatRole,
    text: data.text as string,
    ts: new Date(data.ts as string).getTime(),
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Daily-message chat thread. Resets at midnight (date-keyed).
 * When Supabase is configured, messages are persisted server-side and
 * the AI call is made via a server function - no replyStub needed.
 * The replyStub param is kept for API compatibility; it is only used as a
 * fallback when Supabase is not configured.
 */
export function useDailyChat(profile?: Profile | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setMessages(readLocal());
      const sync = () => setMessages(readLocal());
      window.addEventListener("gn:daily-chat-change", sync);
      window.addEventListener("storage", sync);
      return () => {
        window.removeEventListener("gn:daily-chat-change", sync);
        window.removeEventListener("storage", sync);
      };
    }

    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) fetchFromDB(uid).then(setMessages);
    });
  }, []);

  const send = useCallback(
    async (text: string, replyStub?: (userText: string) => Promise<string> | string) => {
      const t = text.trim();
      if (!t) return;

      if (supabaseConfigured && userId) {
        // Persist user message
        const userMsg = await insertMessage(userId, "user", t);
        setMessages((prev) => [...prev, userMsg]);

        // Build history for context (last 6 messages)
        const history = [...messages, userMsg].slice(-6).map((m) => ({
          role: m.role,
          text: m.text,
        }));

        // Call AI via server function
        const replyText = await callRespondToDailyMessage({
          data: {
            text: t,
            profile: buildAIProfile(profile ?? null),
            history,
          },
        });

        const assistantMsg = await insertMessage(userId, "assistant", replyText);
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        // localStorage fallback
        const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text: t, ts: Date.now() };
        const next = [...readLocal(), userMsg];
        writeLocal(next);
        setMessages(next);

        if (replyStub) {
          const reply = await replyStub(t);
          const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", text: reply, ts: Date.now() };
          const final = [...readLocal(), assistantMsg];
          writeLocal(final);
          setMessages(final);
        }
      }
    },
    [userId, messages, profile],
  );

  return { messages, send };
}
