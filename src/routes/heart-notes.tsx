import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { NatureBackground } from "@/components/nature-background";
import { PageHeader } from "@/components/page-header";
import { useHabits } from "@/hooks/use-habits";
import { useEffect, useState } from "react";
import { respondToHeartNote, summarizeHeartNote } from "@/lib/ai-stubs";
import { useAuth } from "@/hooks/use-auth";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { BookHeart, Send, Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { localTodayISO } from "@/lib/today";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/heart-notes")({
  head: () => ({ meta: [{ title: "Heart Notes - GraceNotes Daily" }] }),
  component: () => <RequireAuth><AppShell><HeartNotes /></AppShell></RequireAuth>,
});

const LIMIT = 1000;

function todayISO() {
  return localTodayISO();
}

function HeartNotes() {
  const [text, setText] = useState("");
  const [rowId, setRowId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [titleLoading, setTitleLoading] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { markComplete } = useHabits();
  const { user, profile } = useAuth();

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  useEffect(() => {
    if (!supabaseConfigured || !user) return;
    supabase
      .from("heart_notes")
      .select("id, body, ai_response, summary")
      .eq("user_id", user.id)
      .eq("date", todayISO())
      .is("superseded_at", null)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRowId(data.id as string);
          setSubmitted(data.body as string);
          setResponse(data.ai_response as string | null);
          setTitle((data.summary as string | null) ?? null);
        }
      });
  }, [user]);

  async function submit() {
    if (!text.trim() || words > LIMIT) return;
    const body = text;
    setSubmitted(body);
    setLoading(true);
    setTitleLoading(true);
    markComplete("journal");

    const r = await respondToHeartNote(body, profile);
    setResponse(r);
    setLoading(false);

    let newId = rowId;
    if (supabaseConfigured && user) {
      const { data } = await supabase
        .from("heart_notes")
        .upsert(
          { user_id: user.id, date: todayISO(), body, ai_response: r },
          { onConflict: "user_id,date" },
        )
        .select("id")
        .maybeSingle();
      if (data?.id) {
        newId = data.id as string;
        setRowId(newId);
      }
    }

    // Generate and persist title
    try {
      const t = await summarizeHeartNote(body);
      setTitle(t);
      if (supabaseConfigured && user && newId) {
        await supabase.from("heart_notes").update({ summary: t }).eq("id", newId);
      }
    } catch {
      // leave title null; fallback shown below
    } finally {
      setTitleLoading(false);
    }
  }

  async function saveTitle() {
    const t = titleDraft.trim();
    if (!t) return;
    setTitle(t);
    setEditingTitle(false);
    if (supabaseConfigured && user && rowId) {
      await supabase.from("heart_notes").update({ summary: t }).eq("id", rowId);
    }
  }

  async function doDelete() {
    if (supabaseConfigured && user && rowId) {
      await supabase.from("heart_notes").delete().eq("id", rowId);
    }
    setRowId(null);
    setSubmitted(null);
    setResponse(null);
    setTitle(null);
    setText("");
    setConfirmDelete(false);
  }

  async function archiveAndReset() {
    // Move today's active note to Journey by stamping superseded_at, then
    // clear local state so the composer re-renders empty. The journal habit
    // stays complete for today — the user already journaled.
    if (supabaseConfigured && user && rowId) {
      await supabase
        .from("heart_notes")
        .update({ superseded_at: new Date().toISOString() })
        .eq("id", rowId);
    }
    setRowId(null);
    setSubmitted(null);
    setResponse(null);
    setTitle(null);
    setText("");
    setEditingTitle(false);
  }

  return (
    <>
      <NatureBackground />
      <section className="max-w-3xl mx-auto px-4 md:px-8 md:pt-10" style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 3.5rem, 4rem)" }}>
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
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wider text-foreground/55 mb-1">Title</p>
                  {editingTitle ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveTitle();
                          if (e.key === "Escape") setEditingTitle(false);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-white/80 border border-border focus:outline-none focus:ring-2 focus:ring-grace text-foreground"
                      />
                      <button onClick={saveTitle} aria-label="Save title" className="p-2 rounded-full bg-grace text-white">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingTitle(false)} aria-label="Cancel" className="p-2 rounded-full bg-white/70 border border-border">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-xl text-foreground truncate">
                        {title ?? (titleLoading ? "Generating title…" : "Heart Note")}
                      </h3>
                      {!titleLoading && (
                        <button
                          onClick={() => { setTitleDraft(title ?? ""); setEditingTitle(true); }}
                          aria-label="Edit title"
                          className="p-1.5 rounded-full hover:bg-foreground/5 text-foreground/60"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={archiveAndReset}
                    disabled={loading}
                    aria-label="Start a new Heart Note"
                    title="Archive this note to your Journey and start a new one"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-foreground/60 hover:text-grace hover:bg-grace/5 disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" /> New note
                  </button>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    aria-label="Delete heart note"
                    className="p-2 rounded-full hover:bg-destructive/10 text-foreground/60 hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
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

        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this Heart Note?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove today's entry. You can write a new one in its place.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={doDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </>
  );
}
