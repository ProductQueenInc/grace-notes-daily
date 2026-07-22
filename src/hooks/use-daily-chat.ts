import { useEffect, useState, useCallback, useRef } from "react";
import { supabase, SUPABASE_FUNCTIONS_URL, SUPABASE_PROJECT_ANON_KEY } from "@/lib/supabase";
import { localTodayISO } from "@/lib/today";
import type { DailyGraceNote } from "@/hooks/use-daily-grace-note";
import { capture } from "@/lib/analytics";

export type ChatRole = "user" | "assistant";
export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  ts: number;
  pending?: boolean;
}

export type ChatCloseReason = "crisis" | "inappropriate" | null;

function stripEmDashes(s: string): string {
  return s.replace(/\s*[—–]\s*/g, " - ");
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function fetchMessages(userId: string): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from("daily_messages")
    .select("id, role, text, ts")
    .eq("user_id", userId)
    .eq("date", localTodayISO())
    .order("ts", { ascending: true });
  return (data ?? []).map((row) => ({
    id: row.id as string,
    role: row.role as ChatRole,
    text: stripEmDashes(row.text as string),
    ts: new Date(row.ts as string).getTime(),
  }));
}

async function insertMessage(
  userId: string,
  role: ChatRole,
  text: string,
): Promise<ChatMessage> {
  const { data } = await supabase
    .from("daily_messages")
    .insert({ user_id: userId, date: localTodayISO(), role, text })
    .select("id, role, text, ts")
    .single();
  if (!data) {
    return { id: crypto.randomUUID(), role, text, ts: Date.now() };
  }
  return {
    id: data.id as string,
    role: data.role as ChatRole,
    text: data.text as string,
    ts: new Date(data.ts as string).getTime(),
  };
}

// Find or create today's chat_sessions row. The backend table is expected to
// have at least: id (uuid), user_id, date, status. We tolerate missing extra
// columns so missing nullable fields don't break the create.
async function getOrCreateSession(userId: string): Promise<{
  id: string;
  status: string;
} | null> {
  const today = localTodayISO();
  const { data: existing } = await supabase
    .from("chat_sessions")
    .select("id, status")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();
  if (existing?.id) {
    return { id: existing.id as string, status: (existing.status as string) ?? "open" };
  }
  const { data: created, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: userId, date: today })
    .select("id, status")
    .single();
  if (error || !created) return null;
  return { id: created.id as string, status: (created.status as string) ?? "open" };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDailyChat(graceContext?: DailyGraceNote | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [closeReason, setCloseReason] = useState<ChatCloseReason>(null);
  const [pending, setPending] = useState(false);
  const streamingIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      if (!uid || cancelled) return;
      setUserId(uid);
      const [msgs, session] = await Promise.all([
        fetchMessages(uid),
        getOrCreateSession(uid),
      ]);
      if (cancelled) return;
      setMessages(msgs);
      if (session) {
        setSessionId(session.id);
        if (session.status === "closed_crisis") setCloseReason("crisis");
        else if (session.status === "closed_inappropriate") setCloseReason("inappropriate");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const send = useCallback(
    async (text: string, opts?: { mode?: "conversational" | "closing" }): Promise<boolean> => {
      const t = text.trim();
      if (!t || !userId || closeReason || pending) return false;

      if (!sessionId) {
        const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text: t, ts: Date.now() };
        const errMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "Something went quiet on our end. Please refresh the page and try again.",
          ts: Date.now() + 1,
        };
        setMessages((prev) => [...prev, userMsg, errMsg]);
        return false;
      }

      setPending(true);

      // 1. Persist + show user message
      const userMsg = await insertMessage(userId, "user", t);
      const historyBefore = [...messages, userMsg];
      setMessages(historyBefore);

      // Fire grace_note_responded_to once per user per local day, the first
      // time they send a message in the daily chat. Dedupe via localStorage.
      try {
        const today = localTodayISO();
        const key = `gn:analytics:responded:${today}`;
        if (typeof window !== "undefined" && !localStorage.getItem(key)) {
          const priorUserMsgs = messages.filter((m) => m.role === "user").length;
          if (priorUserMsgs === 0) {
            localStorage.setItem(key, "1");
            capture("grace_note_responded_to", { date: today });
          }
        }
      } catch {
        /* ignore analytics dedupe errors */
      }


      // 2. Optimistic streaming assistant bubble
      const streamId = `streaming-${crypto.randomUUID()}`;
      streamingIdRef.current = streamId;
      setMessages((prev) => [
        ...prev,
        { id: streamId, role: "assistant", text: "", ts: Date.now(), pending: true },
      ]);

      // 3. Get current bearer
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token ?? "";

      const body = {
        user_id: userId,
        session_id: sessionId,
        message: t,
        conversation_history: historyBefore.slice(-10).map((m) => ({
          role: m.role,
          content: m.text,
        })),
        segment: graceContext?.segment ?? "newbie",
        posture: graceContext?.posture ?? "hope",
        grace_note: graceContext?.graceNoteRaw ?? "",
        verse_text: graceContext?.verseText ?? "",
        verse_reference: graceContext?.verseReference ?? "",
        mode: opts?.mode ?? "conversational",
      };

      let finalText = "";
      try {
        const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/chat-reply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_PROJECT_ANON_KEY,
            Authorization: `Bearer ${accessToken || SUPABASE_PROJECT_ANON_KEY}`,
          },
          body: JSON.stringify(body),
        });

        const contentType = res.headers.get("content-type") ?? "";

        if (contentType.includes("application/json")) {
          // Crisis or inappropriate closure
          const json = (await res.json()) as {
            response?: string;
            session_closed?: boolean;
            close_reason?: "crisis" | "inappropriate";
            error?: string;
          };
          finalText = json.response ?? json.error ?? "Something went quiet on our end.";
          if (json.session_closed && json.close_reason) {
            setCloseReason(json.close_reason);
            // Trust-and-safety signal — zero message content attached, just the flag.
            capture("chat_session_closed", { close_reason: json.close_reason });
          }
        } else if (res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (payload === "[DONE]") continue;
              try {
                const parsed = JSON.parse(payload) as { text?: string; error?: string };
                if (parsed.text) {
                  finalText += parsed.text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === streamId ? { ...m, text: finalText } : m,
                    ),
                  );
                }
              } catch {
                /* ignore malformed chunk */
              }
            }
          }
        } else {
          finalText = await res.text();
        }
      } catch (err) {
        console.error("chat-reply failed", err);
        finalText = "Something went quiet on our end. Try again in a moment.";
      }

      // 4. Persist the assistant reply and swap the streaming bubble for the
      //    saved row. Strip em-dashes the model may have produced despite the prompt rule.
      finalText = stripEmDashes(finalText);
      const saved = finalText.trim()
        ? await insertMessage(userId, "assistant", finalText.trim())
        : null;
      setMessages((prev) => {
        const withoutStream = prev.filter((m) => m.id !== streamId);
        return saved ? [...withoutStream, saved] : withoutStream;
      });
      streamingIdRef.current = null;
      setPending(false);
      // The meaningful unit here is a completed exchange, not "chat opened".
      capture("chat_message_sent", { is_first_message_of_day: messages.length === 0 });
      return true;
    },
    [userId, sessionId, messages, closeReason, pending, graceContext],
  );

  return { messages, send, pending, closeReason, sessionId };
}
