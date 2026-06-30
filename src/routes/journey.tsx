import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { NatureBackground } from "@/components/nature-background";
import { PageHeader } from "@/components/page-header";
import { useEffect, useMemo, useState } from "react";
import { Compass, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Pencil, Trash2, Check, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { summarizeHeartNote } from "@/lib/ai-stubs";
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

export const Route = createFileRoute("/journey")({
  head: () => ({ meta: [{ title: "Journey - GraceNotes Daily" }] }),
  component: () => <RequireAuth><AppShell><Journey /></AppShell></RequireAuth>,
});

type Entry = {
  id: string;
  type: "heart-note" | "prayer";
  isoDate: string;          // YYYY-MM-DD
  date: string;             // human
  title: string;
  body: string;
  extra?: string;           // reply / gratitude
};

const PAGE_SIZE = 15;

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
function todayISO() {
  // Use local date — UTC midnight rollover would leak today's in-progress
  // entries onto the Journey page.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n).trimEnd() + "…";
}

function Journey() {
  const [all, setAll] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<"all" | "heart-note" | "prayer">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { user } = useAuth();

  async function saveTitle(entry: Entry) {
    const t = titleDraft.trim();
    if (!t) return;
    const rawId = entry.id.replace(/^hn-/, "");
    setAll((prev) => prev.map((e) => (e.id === entry.id ? { ...e, title: t } : e)));
    setEditingId(null);
    if (supabaseConfigured && user) {
      await supabase.from("heart_notes").update({ summary: t }).eq("id", rawId);
    }
  }

  async function doDelete(entry: Entry) {
    const rawId = entry.id.replace(/^hn-/, "");
    setAll((prev) => prev.filter((e) => e.id !== entry.id));
    setConfirmDeleteId(null);
    if (open === entry.id) setOpen(null);
    if (supabaseConfigured && user) {
      await supabase.from("heart_notes").delete().eq("id", rawId);
    }
  }

  useEffect(() => {
    if (!supabaseConfigured || !user) { setLoading(false); return; }

    (async () => {
      const uid = user.id;
      const today = todayISO();

      // Heart notes: only entries from BEFORE today (today's stays on its page)
      const heartReq = supabase
        .from("heart_notes")
        .select("id, body, ai_response, summary, date, created_at")
        .eq("user_id", uid)
        .lt("date", today)
        .order("date", { ascending: false });

      // Answered prayers + their thanksgivings
      const prayerReq = supabase
        .from("prayers")
        .select("id, body, answered_at")
        .eq("user_id", uid)
        .eq("answered", true)
        .is("deleted_at", null)
        .order("answered_at", { ascending: false });

      const [heartRes, prayerRes] = await Promise.all([heartReq, prayerReq]);
      const hearts = heartRes.data;
      const prayers = prayerRes.data;

      // Surface silent failures so we can see what's wrong on /journey
      // eslint-disable-next-line no-console
      console.log("[journey] uid", uid, "today", today, {
        heartCount: hearts?.length ?? 0,
        heartError: heartRes.error?.message,
        prayerCount: prayers?.length ?? 0,
        prayerError: prayerRes.error?.message,
        sampleHearts: hearts?.slice(0, 3).map((h) => ({ id: h.id, date: h.date })),
      });

      const prayerIds = (prayers ?? []).map((p) => p.id as string);
      const { data: thanks } = prayerIds.length
        ? await supabase
            .from("thanksgivings")
            .select("prayer_id, content")
            .in("prayer_id", prayerIds)
        : { data: [] as { prayer_id: string; content: string }[] };

      const thanksMap = Object.fromEntries(
        (thanks ?? []).map((t) => [t.prayer_id as string, t.content as string]),
      );


      const entries: Entry[] = [];

      for (const h of hearts ?? []) {
        const iso = (h.date as string) || (h.created_at as string).slice(0, 10);
        const body = (h.body as string) ?? "";
        const summary = (h.summary as string | null) ?? null;
        entries.push({
          id: `hn-${h.id}`,
          type: "heart-note",
          isoDate: iso,
          date: fmt(iso),
          title: summary || truncate(body, 60) || "Heart Note",
          body,
          extra: (h.ai_response as string) || undefined,
        });
      }

      // Lazily generate summaries for older entries that don't have one yet,
      // then patch them in place so the user sees the AI title without a
      // reload. One-time per entry — once written it stays.
      const missingSummary = (hearts ?? []).filter(
        (h) => !h.summary && ((h.body as string) ?? "").trim().length > 0,
      );
      if (missingSummary.length) {
        void Promise.all(
          missingSummary.map(async (h) => {
            try {
              const title = await summarizeHeartNote(h.body as string);
              await supabase
                .from("heart_notes")
                .update({ summary: title })
                .eq("id", h.id as string);
              setAll((prev) =>
                prev.map((e) =>
                  e.id === `hn-${h.id}` ? { ...e, title } : e,
                ),
              );
            } catch {
              // leave the truncated fallback in place on failure
            }
          }),
        );
      }


      for (const p of prayers ?? []) {
        const iso = (p.answered_at as string)?.slice(0, 10) ?? today;
        const body = (p.body as string) ?? "";
        entries.push({
          id: `pr-${p.id}`,
          type: "prayer",
          isoDate: iso,
          date: fmt(iso),
          title: truncate(body, 60) || "Answered Prayer",
          body,
          extra: thanksMap[p.id as string],
        });
      }

      entries.sort((a, b) => b.isoDate.localeCompare(a.isoDate));
      setAll(entries);
      setLoading(false);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    let rows = all;
    if (type !== "all") rows = rows.filter((e) => e.type === type);
    if (q.trim()) {
      const needle = q.toLowerCase();
      rows = rows.filter((e) => (e.title + " " + e.body + " " + (e.extra ?? "")).toLowerCase().includes(needle));
    }
    return rows;
  }, [all, type, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => { setPage(0); }, [type, q]);

  return (
    <>
      <NatureBackground />
      <section className="max-w-3xl mx-auto px-4 md:px-8 md:pt-10" style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 3.5rem, 4rem)" }}>
        <PageHeader
          icon={Compass}
          eyebrow="Your story"
          title="Your Journey"
          subtitle="Find the record of your HeartNotes and your answered prayers, and delight in the journey that's been"
        />

        <div className="glass-on-hue rounded-3xl p-4 mb-5 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search your journey…"
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/15 border border-white/20 focus:outline-none focus:ring-2 focus:ring-gold text-sm text-white placeholder:text-white/60"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger className="w-auto h-auto px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-white text-sm gap-2 focus:ring-2 focus:ring-gold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entries</SelectItem>
                <SelectItem value="heart-note">Heart Notes</SelectItem>
                <SelectItem value="prayer">Answered Prayers</SelectItem>
              </SelectContent>
            </Select>

            <span className="ml-auto text-xs text-white/70">
              {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            </span>
          </div>
        </div>


        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-white/80 mt-2">Loading your journey…</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {pageRows.map((e) => {
                const isOpen = open === e.id;
                const isEditing = editingId === e.id;
                const isHeart = e.type === "heart-note";
                const replyLabel = isHeart ? "A gentle reply" : "Your gratitude";
                return (
                  <div
                    key={e.id}
                    className="glass rounded-2xl p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => !isEditing && setOpen(isOpen ? null : e.id)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="text-xs text-grace font-semibold uppercase tracking-wider">
                          {isHeart ? "Heart Note" : "Answered Prayer"} · {e.date}
                        </div>
                        {isEditing ? (
                          <div className="flex items-center gap-2 mt-1" onClick={(ev) => ev.stopPropagation()}>
                            <input
                              autoFocus
                              value={titleDraft}
                              onChange={(ev) => setTitleDraft(ev.target.value)}
                              onKeyDown={(ev) => {
                                if (ev.key === "Enter") saveTitle(e);
                                if (ev.key === "Escape") setEditingId(null);
                              }}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-white/85 border border-border focus:outline-none focus:ring-2 focus:ring-grace text-foreground"
                            />
                          </div>
                        ) : (
                          <h3 className="font-display text-xl text-foreground mt-1">{e.title}</h3>
                        )}
                        {isOpen && !isEditing && (
                          <>
                            {isHeart && (
                              <p className="text-sm text-foreground/80 mt-2 whitespace-pre-wrap">{e.body}</p>
                            )}
                            {e.extra && (
                              <div className="mt-3 border-l-4 border-gold pl-3 py-1">
                                <p className="text-[11px] uppercase tracking-wider text-gold-foreground/70 font-semibold">{replyLabel}</p>
                                <p className="text-sm italic text-foreground/80 mt-1 whitespace-pre-wrap">{e.extra}</p>
                              </div>
                            )}
                          </>
                        )}
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        {isEditing ? (
                          <>
                            <button onClick={() => saveTitle(e)} aria-label="Save title" className="p-2 rounded-full bg-grace text-white">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingId(null)} aria-label="Cancel" className="p-2 rounded-full bg-white/70 border border-border">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : isOpen && isHeart ? (
                          <>
                            <button
                              onClick={() => { setTitleDraft(e.title); setEditingId(e.id); }}
                              aria-label="Edit title"
                              className="p-2 rounded-full hover:bg-foreground/5 text-foreground/60"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(e.id)}
                              aria-label="Delete heart note"
                              className="p-2 rounded-full hover:bg-destructive/10 text-foreground/60 hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          isOpen ? <ChevronUp className="w-4 h-4 mt-1 text-foreground/60" /> : <ChevronDown className="w-4 h-4 mt-1 text-foreground/60" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {!pageRows.length && (
                <p className="text-center text-white/80 italic py-10 glass-on-hue rounded-2xl">
                  Nothing here yet - keep walking.
                </p>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="px-3 py-2 rounded-full bg-white/10 border border-white/15 text-white text-sm flex items-center gap-1 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="text-sm text-white/80">
                  Page {safePage + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  className="px-3 py-2 rounded-full bg-white/10 border border-white/15 text-white text-sm flex items-center gap-1 disabled:opacity-40"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this Heart Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this entry from your journey.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const entry = all.find((e) => e.id === confirmDeleteId);
                if (entry) doDelete(entry);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
