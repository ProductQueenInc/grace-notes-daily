import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { NatureBackground } from "@/components/nature-background";
import { PageHeader } from "@/components/page-header";
import { useEffect, useState } from "react";
import { HandHeart, CheckCircle2, Clock, Plus, X } from "lucide-react";
import { generousAnsweredConfetti, subtleConfetti } from "@/lib/confetti";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/prayers")({
  head: () => ({ meta: [{ title: "Prayers — GraceNotes Daily" }] }),
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
  const { user } = useAuth();

  const active = items.filter((p) => !p.answeredAt);
  const answered = items.filter((p) => p.answeredAt);

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
      <section className="max-w-3xl mx-auto px-4 md:px-8 pt-6 md:pt-10">
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
          <div className="p-5 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Be bold and specific in your prayer…"
              className="flex-1 px-4 py-3 rounded-2xl bg-white/80 border border-border focus:outline-none focus:ring-2 focus:ring-grace"
            />
            <button onClick={add} className="px-5 rounded-2xl bg-grace text-white font-semibold flex items-center gap-1"><Plus className="w-4 h-4" /> Add</button>
          </div>
          <p className="text-xs text-foreground/55 px-5 pb-4 text-right">Press Enter to add</p>
        </div>

        <h2 className="flex items-center gap-2 font-display text-2xl text-grace mb-3">
          <HandHeart className="w-5 h-5" /> Active Prayers <span className="text-sm bg-grace-soft px-2 py-0.5 rounded-full">{active.length}</span>
        </h2>
        <div className="space-y-3 mb-8">
          {active.map((p) => (
            <div key={p.id} className="glass rounded-2xl p-5 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{p.text}</p>
                <p className="text-xs text-foreground/55 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Added {p.createdAt}</p>
              </div>
              <button onClick={() => markAnswered(p)} className="shrink-0 px-3 py-2 rounded-full border-2 border-grace text-grace hover:bg-grace hover:text-white transition text-sm font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Mark as Answered
              </button>
            </div>
          ))}
          {!active.length && <p className="text-sm text-foreground/55 italic text-center py-6">No active prayers. Add one above.</p>}
        </div>

        <h2 className="flex items-center gap-2 font-display text-2xl mb-3" style={{ color: "var(--gold)" }}>
          <CheckCircle2 className="w-5 h-5" /> Answered Prayers <span className="text-sm bg-gold-soft px-2 py-0.5 rounded-full text-gold-foreground">{answered.length}</span>
        </h2>
        <div className="space-y-3">
          {answered.map((p) => (
            <div key={p.id} className="rounded-2xl border-l-4 border-gold bg-gold-soft/60 backdrop-blur p-5">
              <p className="font-semibold">{p.text}</p>
              {p.thanksgiving && <p className="text-sm italic mt-1 text-foreground/75">"{p.thanksgiving}"</p>}
              <p className="text-xs text-foreground/55 mt-1">Answered {p.answeredAt}</p>
            </div>
          ))}
          {!answered.length && <p className="text-sm text-foreground/55 italic text-center py-6">Your testimonies will gather here.</p>}
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
    </>
  );
}
