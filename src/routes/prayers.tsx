import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { NatureBackground } from "@/components/nature-background";
import { PageHeader } from "@/components/page-header";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HandHeart, CheckCircle2, Clock, Plus, X, MoreHorizontal, Pencil, Trash2, Sparkles } from "lucide-react";
import { generousAnsweredConfetti, subtleConfetti } from "@/lib/confetti";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ShareCardModal } from "@/components/share-card-modal";
import { dismissAnsweredPrayerShare } from "@/lib/share-dismissals";

export const Route = createFileRoute("/prayers")({
  head: () => ({ meta: [{ title: "Prayers - GraceNotes Daily" }] }),
  component: () => <RequireAuth><AppShell><Prayers /></AppShell></RequireAuth>,
});

type Prayer = { id: string; text: string; createdAt: string; answeredAt?: string; thanksgiving?: string };

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

type Filter = "all" | "active" | "answered";
const PAGE_SIZE = 10;

/** Tiny deterministic shuffle so "Remember When" picks rotate daily, not per load. */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  // FNV-1a-ish hash of the seed string.
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = (h ^ seed.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function localTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function Prayers() {
  const [items, setItems] = useState<Prayer[]>([]);
  const [draft, setDraft] = useState("");
  const [celebrating, setCelebrating] = useState<Prayer | null>(null);
  const [thanksgivingText, setThanksgivingText] = useState("");
  const [editing, setEditing] = useState<Prayer | null>(null);
  const [editText, setEditText] = useState("");
  const [sharingPrayer, setSharingPrayer] = useState<Prayer | null>(null);
  
  const [deleting, setDeleting] = useState<Prayer | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [activePage, setActivePage] = useState(1);
  const [answeredPage, setAnsweredPage] = useState(1);
  const { user } = useAuth();

  const active = items.filter((p) => !p.answeredAt);
  const answered = items.filter((p) => p.answeredAt);

  // Daily-seeded picks for the "Remember When" carousel.
  const rememberWhen = answered.length >= 3
    ? seededShuffle(answered, `${user?.id ?? "anon"}:${localTodayISO()}`).slice(0, 3)
    : [];

  const showRememberWhen = filter === "all" && rememberWhen.length === 3;
  const showActive = filter === "all" || filter === "active";
  const showAnswered = filter === "all" || filter === "answered";

  const visibleActive = active.slice(0, activePage * PAGE_SIZE);
  const visibleAnswered = answered.slice(0, answeredPage * PAGE_SIZE);

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
    const target = celebrating;

    setItems((s) =>
      s.map((x) => (x.id === target.id ? { ...x, answeredAt, thanksgiving: thanksgivingText } : x)),
    );

    if (supabaseConfigured && user) {
      await supabase
        .from("prayers")
        .update({ answered: true, answered_at: new Date().toISOString() })
        .eq("id", target.id)
        .eq("user_id", user.id);

      if (thanksgivingText.trim()) {
        await supabase
          .from("thanksgivings")
          .insert({ user_id: user.id, prayer_id: target.id, content: thanksgivingText.trim() });
      }
    }

    subtleConfetti();
    toast.success("Thanksgiving received. Praise be");
    setCelebrating(null);
    setThanksgivingText("");
    // Morph into the share prompt (one-shot per prayer).
    setTimeout(() => setSharingPrayer({ ...target, answeredAt, thanksgiving: thanksgivingText }), 350);
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

        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-5">
          {(["all", "active", "answered"] as Filter[]).map((f) => {
            const label = f === "all" ? "All" : f === "active" ? "Active" : "Answered";
            const isActive = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={[
                  "px-4 py-2 rounded-full text-sm font-semibold transition",
                  isActive
                    ? "bg-gold text-gold-foreground shadow"
                    : "bg-white/15 text-white hover:bg-white/25",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Remember When: shows only when filter=All and there are 3+ answered prayers. */}
        {showRememberWhen && (
          <div className="mb-8">
            <div className="glass-on-hue rounded-2xl px-5 py-3 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold" />
              <h2 className="font-display text-2xl text-white">Remember When</h2>
              <span className="ml-auto text-xs text-white/70 italic">Refreshes daily</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {rememberWhen.map((p) => (
                <div
                  key={p.id}
                  className="snap-start shrink-0 w-[78vw] max-w-[320px] rounded-2xl border-l-4 border-gold bg-gold-soft/90 backdrop-blur p-5"
                >
                  <p className="font-semibold text-gold-foreground line-clamp-3">{p.text}</p>
                  {p.thanksgiving && (
                    <p className="text-sm italic mt-2 text-foreground/85 line-clamp-3">"{p.thanksgiving}"</p>
                  )}
                  <p className="text-xs text-foreground/70 mt-2">Answered {p.answeredAt}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {showActive && (
          <>
            <div className="glass-on-hue rounded-2xl px-5 py-3 mb-3 flex items-center gap-2">
              <HandHeart className="w-5 h-5 text-white" />
              <h2 className="font-display text-2xl text-white">Active Prayers</h2>
              <span className="ml-auto text-xs font-semibold bg-white/15 text-white px-2.5 py-1 rounded-full">{active.length}</span>
            </div>
            <div className="space-y-3 mb-8">
              {visibleActive.map((p) => (
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
              {visibleActive.length < active.length && (
                <button
                  onClick={() => setActivePage((p) => p + 1)}
                  className="w-full py-3 rounded-2xl bg-white/15 text-white font-semibold hover:bg-white/25 transition"
                >
                  View more ({active.length - visibleActive.length} more)
                </button>
              )}
            </div>
          </>
        )}

        {showAnswered && (
          <>
            <div className="glass-on-hue rounded-2xl px-5 py-3 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-gold" />
              <h2 className="font-display text-2xl text-white">Answered Prayers</h2>
              <span className="ml-auto text-xs font-semibold bg-gold text-gold-foreground px-2.5 py-1 rounded-full">{answered.length}</span>
            </div>
            <div className="space-y-3">
              {visibleAnswered.map((p) => (
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
              {visibleAnswered.length < answered.length && (
                <button
                  onClick={() => setAnsweredPage((p) => p + 1)}
                  className="w-full py-3 rounded-2xl bg-white/15 text-white font-semibold hover:bg-white/25 transition"
                >
                  View more ({answered.length - visibleAnswered.length} more)
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {celebrating && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 overflow-y-auto py-6">
          <div className="bg-background w-full max-w-md rounded-3xl overflow-hidden shadow-2xl fade-up my-auto">
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
        </div>,
        document.body,
      )}

      {editing && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 overflow-y-auto py-6">
          <div className="bg-background w-full max-w-md rounded-3xl overflow-hidden shadow-2xl fade-up my-auto">
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
        </div>,
        document.body,
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

      <ShareCardModal
        open={!!sharingPrayer}
        ctx={sharingPrayer ? { type: "answered_prayer", prayer_id: sharingPrayer.id, prayer_text: sharingPrayer.text, answered_date: sharingPrayer.answeredAt } : null}
        heading={{
          eyebrow: "Prayer answered",
          title: "Mark the moment",
          subtitle: "A small record of what He did.",
        }}
        onClose={() => setSharingPrayer(null)}
        onDismiss={() => sharingPrayer && dismissAnsweredPrayerShare(sharingPrayer.id)}
      />
    </>
  );
}
