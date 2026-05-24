import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { NatureBackground } from "@/components/nature-background";
import { PageHeader } from "@/components/page-header";
import { useEffect, useState } from "react";
import { Compass, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { GraceNoteResult, DevotionalResult } from "@/lib/ai.functions";

export const Route = createFileRoute("/journey")({
  head: () => ({ meta: [{ title: "Journey - GraceNotes Daily" }] }),
  component: () => <RequireAuth><AppShell><Journey /></AppShell></RequireAuth>,
});

type Entry = {
  id: string;
  type: "grace-note" | "heart-note" | "prayer" | "devotional";
  date: string;
  isoDate: string;
  title: string;
  preview: string;
  full: string;
};

const TYPES = ["all", "grace-note", "heart-note", "prayer", "devotional"] as const;
const RANGES = ["7d", "30d", "all"] as const;

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n).trimEnd() + "…";
}

function cutoffDate(range: typeof RANGES[number]): Date | null {
  if (range === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - (range === "7d" ? 7 : 30));
  d.setHours(0, 0, 0, 0);
  return d;
}

function Journey() {
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<typeof TYPES[number]>("all");
  const [range, setRange] = useState<typeof RANGES[number]>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!supabaseConfigured || !user) { setLoading(false); return; }

    (async () => {
      const uid = user.id;

      const [
        { data: heartNotes },
        { data: prayers },
        { data: dailyContent },
      ] = await Promise.all([
        supabase
          .from("heart_notes")
          .select("id, body, date, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("prayers")
          .select("id, body, answered, answered_at, created_at")
          .eq("user_id", uid)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("daily_content")
          .select("date, grace_note, devotional")
          .eq("user_id", uid)
          .order("date", { ascending: false }),
      ]);

      const entries: Entry[] = [];

      for (const h of heartNotes ?? []) {
        const body = h.body as string;
        const iso = (h.date as string) || (h.created_at as string);
        entries.push({
          id: h.id as string,
          type: "heart-note",
          date: fmt(iso),
          isoDate: iso,
          title: truncate(body, 45),
          preview: truncate(body, 100),
          full: body,
        });
      }

      for (const p of prayers ?? []) {
        const body = p.body as string;
        const iso = p.created_at as string;
        const answeredNote = p.answered && p.answered_at
          ? `\n\nAnswered ${fmt(p.answered_at as string)}`
          : "";
        entries.push({
          id: p.id as string,
          type: "prayer",
          date: fmt(iso),
          isoDate: iso,
          title: truncate(body, 45),
          preview: truncate(body, 100),
          full: body + answeredNote,
        });
      }

      for (const dc of dailyContent ?? []) {
        const iso = dc.date as string;
        const gn = dc.grace_note as GraceNoteResult | null;
        if (gn) {
          entries.push({
            id: `gn-${iso}`,
            type: "grace-note",
            date: fmt(iso),
            isoDate: iso,
            title: gn.signed,
            preview: truncate(gn.message, 100),
            full: `${gn.message}\n\n${gn.verse}`,
          });
        }

        const dev = dc.devotional as DevotionalResult | null;
        if (dev) {
          entries.push({
            id: `dev-${iso}`,
            type: "devotional",
            date: fmt(iso),
            isoDate: iso,
            title: dev.title,
            preview: dev.verseRef,
            full: dev.takeaway ?? (dev.body?.[0] ?? ""),
          });
        }
      }

      entries.sort((a, b) => b.isoDate.localeCompare(a.isoDate));
      setAllEntries(entries);
      setLoading(false);
    })();
  }, [user]);

  const cutoff = cutoffDate(range);
  let entries = allEntries;
  if (cutoff) entries = entries.filter((e) => new Date(e.isoDate) >= cutoff!);
  if (type !== "all") entries = entries.filter((e) => e.type === type);
  if (q.trim()) entries = entries.filter((e) => (e.title + e.full).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <NatureBackground />
      <section className="max-w-3xl mx-auto px-4 md:px-8 pt-6 md:pt-10">
        <PageHeader
          icon={Compass}
          eyebrow="Your story"
          title="Your Journey"
          subtitle="Look back on how far you've come."
        />

        <div className="glass rounded-3xl p-4 mb-5 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your journey…" className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/80 border border-border focus:outline-none focus:ring-2 focus:ring-grace text-sm" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {TYPES.map((t) => (
              <button key={t} onClick={() => setType(t)} className={`px-3 py-1 rounded-full text-xs shrink-0 ${type === t ? "bg-grace text-white" : "bg-white/70 border border-border"}`}>
                {t.replace("-", " ")}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {RANGES.map((r) => (
              <button key={r} onClick={() => setRange(r)} className={`px-3 py-1 rounded-full text-xs ${range === r ? "bg-gold text-gold-foreground" : "bg-white/70 border border-border"}`}>
                {r === "7d" ? "Last 7 days" : r === "30d" ? "Last 30 days" : "All time"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block w-6 h-6 border-2 border-grace border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-foreground/55 mt-2">Loading your journey…</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((e) => {
              const isOpen = open === e.id;
              return (
                <button key={e.id} onClick={() => setOpen(isOpen ? null : e.id)} className="w-full text-left glass rounded-2xl p-5 hover:scale-[1.005] transition">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-grace font-semibold uppercase tracking-wider">{e.type.replace("-", " ")} · {e.date}</div>
                      <h3 className="font-display text-xl text-foreground mt-1">{e.title}</h3>
                      <p className="text-sm text-foreground/70 mt-1">{isOpen ? e.full : e.preview}</p>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 mt-1 text-foreground/55" /> : <ChevronDown className="w-4 h-4 mt-1 text-foreground/55" />}
                  </div>
                </button>
              );
            })}
            {!entries.length && <p className="text-center text-foreground/55 italic py-10">Nothing here yet - keep walking.</p>}
          </div>
        )}
      </section>
    </>
  );
}
