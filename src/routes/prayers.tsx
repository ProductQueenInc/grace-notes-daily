import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { NatureBackground } from "@/components/nature-background";
import { PageHeader } from "@/components/page-header";
import { useEffect, useState } from "react";
import { HandHeart, CheckCircle2, Clock, Plus, X, MoreHorizontal, Pencil, Trash2, Sparkles } from "lucide-react";
import { generousAnsweredConfetti, subtleConfetti } from "@/lib/confetti";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/prayers")({
  head: () => ({ meta: [{ title: "Prayers - GraceNotes Daily" }] }),
  component: () => <RequireAuth><AppShell><Prayers /></AppShell></RequireAuth>,
});

type Prayer = { id: string; text: string; createdAt: string; answeredAt?: string; thanksgiving?: string };

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function Prayers() {
  const [items, setItems] = useState<Prayer[]>([]);
  const [draft, setDraft] = useState("");
  const [celebrating, setCelebrating] = useState<Prayer | null>(null);
  const [thanksgivingText, setThanksgivingText] = useState("");
  const [editing, setEditing] = useState<Prayer | null>(null);
  const [editText, setEditText] = useState("");
  
  const [deleting, setDeleting] = useState<Prayer | null>(null);
  const { user } = useAuth();

  const active = items.filter((p) => !p.answeredAt);
  const answered = items.filter((p) => p.answeredAt);

  function openEdit(p: Prayer) {
    setEditing(p);
    setEditText(p.text);
  }

  async function saveEdit() {
    if (!editing) return;
    const text = editText.trim();
    if (!text) { toast.error("Prayer cannot be empty."); return; }
    const target = editing;

    setItems((s) => s.map((x) => x.id === target.id ? { ...x, text } : x));

    if (supabaseConfigured && user) {
      await supabase.from("prayers").update({ body: text }).eq("id", target.id).eq("user_id", user.id);
    }
    setEditing(null);
    toast.success("Prayer updated.");
  }

  async function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setItems((s) => s.filter((x) => x.id !== target.id));
    if (supabaseConfigured && user) {
      await supabase.from("prayers").update({ deleted_at: new Date().toISOString() }).eq("id", target.id).eq("user_id", user.id);
    }
    setDeleting(null);
    toast.success("Prayer removed.");
  }

  function PrayerMenu({ p, tone }: { p: Prayer; tone: "light" | "gold" }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Prayer options"
            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition ${tone === "gold" ? "text-gold-foreground/70 hover:bg-gold/20" : "text-foreground/60 hover:bg-foreground/10"}`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openEdit(p)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDeleting(p)} className="text-destructive focus:text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  useEffect(() => {
    if (!supabaseConfigured || !user) return;
    (async () => {
      const { data: prayers } = await supabase
        .from("prayers")
        .select("id, body, answered, answered_at, created_at")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (!prayers?.length) return;

      const prayerIds = prayers.map((p) => p.id as string);
      const { data: thanks } = await supabase
        .from("thanksgivings")
        .select("prayer_id, content")
        .in("prayer_id", prayerIds);

      const thanksMap = Object.fromEntries((thanks ?? []).map((t) => [t.prayer_id as string, t.content as string]));

      setItems(
        prayers.map((p) => ({
          id: p.id as string,
          text: p.body as string,
          createdAt: fmt(p.created_at as string),
          answeredAt: p.answered_at ? fmt(p.answered_at as string) : undefined,
          thanksgiving: thanksMap[p.id as string],
        })),
      );
    })();
  }, [user]);

  async function add() {
    if (!draft.trim()) return;
    const text = draft.trim();
    const now = new Date().toISOString();
    const newPrayer: Prayer = { id: crypto.randomUUID(), text, createdAt: fmt(now) };

    if (supabaseConfigured && user) {
      const { data } = await supabase
        .from("prayers")
        .insert({ user_id: user.id, body: text })
        .select("id, created_at")
        .single();
      if (data) newPrayer.id = data.id as string;
    }

    setItems((s) => [newPrayer, ...s]);
    setDraft("");
    toast.success("Prayer added.");
  }

  function markAnswered(p: Prayer) {
    generousAnsweredConfetti();
    setTimeout(() => setCelebrating(p), 1500);
  }

  async function submitThanks() {
    if (!celebrating) return;
    const answeredAt = new Date().toLocaleDateString("en-US");

    setItems((s) =>
      s.map((x) => (x.id === celebrating.id ? { ...x, answeredAt, thanksgiving: thanksgivingText } : x)),
    );

    if (supabaseConfigured && user) {
      await supabase
        .from("prayers")
        .update({ answered: true, answered_at: new Date().toISOString() })
        .eq("id", celebrating.id)
        .eq("user_id", user.id);

      if (thanksgivingText.trim()) {
        await supabase
          .from("thanksgivings")
          .insert({ user_id: user.id, prayer_id: celebrating.id, content: thanksgivingText.trim() });
      }
    }

    subtleConfetti();
    toast.success("Thanksgiving received. Praise be");
    setCelebrating(null);
    setThanksgivingText("");
  }

  return (
    <>
      <NatureBackground />
      <section className="max-w-3xl mx-auto px-4 md:px-8 md:pt-10" style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 3.5rem, 4rem)" }}>
        <PageHeader
          icon={HandHeart}
          eyebrow="Prayer"
          title="Prayer List"
          subtitle="Keep track of your prayer requests and celebrate the answers."
        />

        <div className="glass rounded-3xl overflow-hidden mb-5">
          <div className="gradient-grace text-white px-6 py-4 font-semibold flex items-center gap-2">
            <HandHeart className="w-5 h-5" /> Add a New Prayer
          </div>
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Be bold and specific in your prayer…"
              className="flex-1 px-4 py-3 rounded-2xl bg-white/80 border border-border focus:outline-none focus:ring-2 focus:ring-grace"
            />
            <button onClick={add} className="px-5 py-3 min-h-11 rounded-2xl bg-grace text-white font-semibold flex items-center justify-center gap-1"><Plus className="w-4 h-4" /> Add</button>
          </div>
          <p className="text-xs text-foreground/55 px-5 pb-4 text-right hidden sm:block">Press Enter to add</p>
        </div>

        <div className="glass-on-hue rounded-2xl px-5 py-3 mb-3 flex items-center gap-2">
          <HandHeart className="w-5 h-5 text-white" />
          <h2 className="font-display text-2xl text-white">Active Prayers</h2>
          <span className="ml-auto text-xs font-semibold bg-white/15 text-white px-2.5 py-1 rounded-full">{active.length}</span>
        </div>
        <div className="space-y-3 mb-8">
          {active.map((p) => (
            <div key={p.id} className="glass rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold break-words">{p.text}</p>
                <p className="text-xs text-foreground/70 mt-1 flex items-center gap-1"><Clock className="w-3 h-3 shrink-0" /> Added {p.createdAt}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto">
                <button onClick={() => markAnswered(p)} className="flex-1 sm:flex-initial px-3 py-2.5 min-h-11 rounded-full border-2 border-grace text-grace hover:bg-grace hover:text-white transition text-sm font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Mark as Answered
                </button>
                <PrayerMenu p={p} tone="light" />
              </div>
            </div>
          ))}
          {!active.length && <p className="text-sm text-white/80 italic text-center py-6 glass-on-hue rounded-2xl">No active prayers. Add one above.</p>}
        </div>

        <div className="glass-on-hue rounded-2xl px-5 py-3 mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-gold" />
          <h2 className="font-display text-2xl text-white">Answered Prayers</h2>
          <span className="ml-auto text-xs font-semibold bg-gold text-gold-foreground px-2.5 py-1 rounded-full">{answered.length}</span>
        </div>
        <div className="space-y-3">
          {answered.map((p) => (
            <div key={p.id} className="rounded-2xl border-l-4 border-gold bg-gold-soft/90 backdrop-blur p-5 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gold-foreground">{p.text}</p>
                {p.thanksgiving && <p className="text-sm italic mt-1 text-foreground/85">"{p.thanksgiving}"</p>}
                <p className="text-xs text-foreground/70 mt-1">Answered {p.answeredAt}</p>
              </div>
              <PrayerMenu p={p} tone="gold" />
            </div>
          ))}
          {!answered.length && <p className="text-sm text-white/80 italic text-center py-6 glass-on-hue rounded-2xl">Your testimonies will gather here.</p>}
        </div>
      </section>

      {celebrating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-background w-full max-w-md rounded-3xl overflow-hidden shadow-2xl fade-up">
            <div className="gradient-grace text-white px-6 py-4 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-2">Celebrate this Answer!</span>
              <button onClick={() => setCelebrating(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <div className="rounded-2xl bg-grace-soft p-5 text-center mb-4">
                <CheckCircle2 className="w-7 h-7 text-grace mx-auto mb-2" />
                <p className="font-semibold text-grace">{celebrating.text}</p>
                <p className="text-xs text-foreground/55 mt-1">Added {celebrating.createdAt}</p>
              </div>
              <label className="block text-sm font-medium mb-2">Express your thanksgiving (optional):</label>
              <textarea value={thanksgivingText} onChange={(e) => setThanksgivingText(e.target.value)} rows={4} placeholder="Share how God answered this prayer…" className="w-full px-4 py-3 rounded-2xl bg-white/90 border border-border focus:outline-none focus:ring-2 focus:ring-grace resize-none" />
              <button onClick={submitThanks} className="w-full mt-4 py-3 rounded-full gradient-gold text-gold-foreground font-semibold shadow-lg">
                ✓ Submit Thanksgiving
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-background w-full max-w-md rounded-3xl overflow-hidden shadow-2xl fade-up">
            <div className="gradient-grace text-white px-6 py-4 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-2"><Pencil className="w-4 h-4" /> Edit Prayer</span>
              <button onClick={() => setEditing(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Prayer</label>
                <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-2xl bg-white/90 border border-border focus:outline-none focus:ring-2 focus:ring-grace resize-none" />
              </div>
              <p className="text-xs text-foreground/60">Original date kept: {editing.answeredAt ? `Answered ${editing.answeredAt}` : `Added ${editing.createdAt}`}</p>
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="flex-1 py-3 rounded-full border border-border font-semibold">Cancel</button>
                <button onClick={saveEdit} className="flex-1 py-3 rounded-full bg-grace text-white font-semibold shadow-lg">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this prayer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the prayer from your list. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
