import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { NatureBackground } from "@/components/nature-background";
import { PageHeader } from "@/components/page-header";
import { useHabits } from "@/hooks/use-habits";
import { useEffect, useState } from "react";
import { respondToHeartNote } from "@/lib/ai-stubs";
import { useAuth } from "@/hooks/use-auth";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { BookHeart, Send } from "lucide-react";

export const Route = createFileRoute("/heart-notes")({
  head: () => ({ meta: [{ title: "Heart Notes - GraceNotes Daily" }] }),
  component: () => <RequireAuth><AppShell><HeartNotes /></AppShell></RequireAuth>,
});

const LIMIT = 250;

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function HeartNotes() {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { markComplete } = useHabits();
  const { user, profile } = useAuth();

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  useEffect(() => {
    if (!supabaseConfigured || !user) return;
    supabase
      .from("heart_notes")
      .select("body, ai_response")
      .eq("user_id", user.id)
      .eq("date", todayISO())
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSubmitted(data.body as string);
          setResponse(data.ai_response as string | null);
        }
      });
  }, [user]);

  async function submit() {
    if (!text.trim() || words > LIMIT) return;
    setSubmitted(text);
    setLoading(true);
    markComplete("journal");

    const r = await respondToHeartNote(text, profile);
    setResponse(r);
    setLoading(false);

    if (supabaseConfigured && user) {
      await supabase.from("heart_notes").upsert(
        { user_id: user.id, date: todayISO(), body: text, ai_response: r },
        { onConflict: "user_id,date" },
      );
    }
  }

  return (
    <>
      <NatureBackground />
      <section className="max-w-3xl mx-auto px-4 md:px-8 pt-6 md:pt-10">
        <PageHeader
          icon={BookHeart}
          eyebrow="Today's reflection"
          title="Heart Notes"
          subtitle="A daily space to pour out your heart - one entry per day."
        />

        {!submitted ? (
          <div className="glass rounded-3xl p-5 sm:p-6">
            <label className="block text-sm font-medium mb-2">What's on your heart today?</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="Pour it out gently - there's no rush."
              className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-border focus:outline-none focus:ring-2 focus:ring-grace resize-none"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
              <span className={`text-xs ${words > LIMIT ? "text-destructive" : "text-foreground/55"}`}>
                {words}/{LIMIT} words
              </span>
              <button
                onClick={submit}
                disabled={!text.trim() || words > LIMIT}
                className="px-5 py-3 min-h-11 rounded-full bg-grace text-white font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> Share with Him
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="glass rounded-3xl p-5 sm:p-6">
              <p className="text-xs uppercase tracking-wider text-foreground/55 mb-2">Your note</p>
              <p className="text-foreground/85 whitespace-pre-wrap">{submitted}</p>
            </div>
            <div className="glass rounded-3xl p-5 sm:p-6 border-l-4 border-gold">
              {loading ? (
                <div className="flex items-center gap-2 text-foreground/60">
                  <div className="w-4 h-4 border-2 border-grace border-t-transparent rounded-full animate-spin" /> Listening…
                </div>
              ) : (
                <p className="font-display text-lg text-foreground/85 italic whitespace-pre-wrap">{response}</p>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
