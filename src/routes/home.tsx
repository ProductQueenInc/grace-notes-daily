import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { NatureBackground } from "@/components/nature-background";
import { useAuth } from "@/hooks/use-auth";
import { useHabits, type HabitKey } from "@/hooks/use-habits";
import { useDailyChat } from "@/hooks/use-daily-chat";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { generateGraceNote, generateDevotional, respondToDailyMessage } from "@/lib/ai-stubs";
import { useStreak } from "@/hooks/use-streak";
import { supabase } from "@/lib/supabase";
import { DevotionalModal } from "@/components/devotional-modal";
import {
  Send, Flame, BookOpen, MessageCircle, NotebookPen,
  ChevronLeft, ChevronRight, Sparkles, Check, Info, Flag,
} from "lucide-react";
import { Icon } from "@/components/icon";
import { pickRhythmGreeting } from "@/lib/personalization";
import { badgeForCount, badgeLabel, badgeColors, type BadgeTier } from "@/lib/badges";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { openTallyForm } from "@/lib/tally";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export const Route = createFileRoute("/home")({
  head: () => ({ meta: [{ title: "Home - GraceNotes Daily" }] }),
  component: () => <RequireAuth><AppShell><Home /></AppShell></RequireAuth>,
});

function Home() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const name = profile?.name || "Friend";
  const queryClient = useQueryClient();

  const [showVerse, setShowVerse] = useState(false);
  const [devotionalOpen, setDevotionalOpen] = useState(false);

  const { habits, markComplete } = useHabits();
  const completedCount = Object.values(habits).filter(Boolean).length;
  const tier = badgeForCount(completedCount);
  const streak = useStreak();

  const today = todayISO();
  const { data: graceNote } = useQuery({
    queryKey: ["grace-note", today],
    queryFn: () => generateGraceNote(profile),
    enabled: !!profile,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  });

  // Warm the devotional cache in the background so the modal opens instantly.
  useEffect(() => {
    if (!profile) return;
    queryClient.prefetchQuery({
      queryKey: ["devotional", today],
      queryFn: () => generateDevotional(profile),
      staleTime: Infinity,
    });
  }, [profile, today, queryClient]);


  function handleHabitClick(k: HabitKey) {
    if (k === "devotional") { setDevotionalOpen(true); return; }
    if (k === "dailyMessage") {
      document.getElementById("daily-message")?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => document.getElementById("daily-message-input")?.focus(), 400);
      return;
    }
    if (k === "journal") navigate({ to: "/heart-notes" });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <NatureBackground />
      <section className="max-w-7xl mx-auto px-4 md:px-8 pt-6 md:pt-10">
        {/* Hero */}
        <div className="mb-8 fade-up max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/70 mb-3 flex items-center gap-1.5">
            <Icon icon={Sparkles} size="sm" className="text-gold" /> Today
          </p>
          <h1 className="font-display text-4xl md:text-6xl text-white leading-[1.05] tracking-tight">
            {pickRhythmGreeting(profile)}.
          </h1>
          <p className="text-white/80 mt-3 text-base md:text-lg max-w-xl">
            Your daily space for spiritual growth and reflection. Walk gently - you are loved.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Today's Grace Note + Daily Message chat */}
            <div id="daily-message" className="glass-on-hue rounded-3xl overflow-hidden">
              <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 border-b border-white/10">
                <div className="flex items-center gap-2 font-semibold text-white min-w-0">
                  <Icon icon={MessageCircle} size="md" tone="inherit" />
                  <span className="truncate">Today's Grace Note</span>
                </div>
                <button onClick={() => setShowVerse((v) => !v)} className="shrink-0 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-2 min-h-9 rounded-full">
                  {showVerse ? "Hide Verse" : "Show Verse"}
                </button>
              </div>
              <div className="p-4 sm:p-6">
                {!graceNote ? (
                  <div className="text-center py-10">
                    <div className="inline-block w-7 h-7 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-white/70 mt-2">Loading your fresh grace note…</p>
                  </div>
                ) : (
                  <>
                    <p className="text-white/90 leading-relaxed font-display text-xl">{graceNote.message}</p>
                    {showVerse && (
                      <div className="mt-4 border-l-4 border-gold pl-4 py-2 italic text-white/80">
                        {graceNote.verse}
                      </div>
                    )}
                    <p className="text-right text-sm text-white/55 italic mt-4">- {graceNote.signed}</p>
                  </>
                )}

                <DailyMessageChat onSent={() => markComplete("dailyMessage")} />
              </div>
            </div>

            {/* Daily Devotional CTA */}
            <button
              onClick={() => setDevotionalOpen(true)}
              className="w-full text-left rounded-3xl p-5 sm:p-6 glass-on-hue hover:scale-[1.005] transition group"
            >
              <div className="flex items-center gap-2 text-gold font-semibold mb-1 text-sm uppercase tracking-wider">
                <Icon icon={BookOpen} size="sm" tone="inherit" /> Daily Devotional
              </div>
              <h3 className="font-display text-2xl sm:text-3xl text-white">A Journey of New Beginnings</h3>
              <p className="text-sm text-white/70 mt-1">Lamentations 3:22-23 · Fresh mercies for today</p>
              <span className="inline-block mt-3 text-sm font-semibold text-gold">Read Today's Devotional →</span>
            </button>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <div className="glass-on-hue rounded-3xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display text-xl text-white">Daily Rhythms</h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button aria-label="How this works" className="text-white/55 hover:text-white/90">
                        <Icon icon={Info} size="sm" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-black/85 text-white border border-white/10 max-w-[220px]">
                      Tap a circle to go to its space. Complete the action to fill the circle.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gold/20 text-gold text-xs font-semibold">
                  <Icon icon={Flame} size="sm" tone="inherit" /> {streak} day
                </span>
              </div>
              <p className="text-sm text-white/75">
                {completedCount === 3
                  ? "You completed today's gold day."
                  : `Almost there, ${name} - ${3 - completedCount} more step${3 - completedCount > 1 ? "s" : ""} to complete your gold day.`}
              </p>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden mt-3">
                <div className="h-full gradient-gold transition-all" style={{ width: `${(completedCount / 3) * 100}%` }} />
              </div>

              <div className="grid grid-cols-3 gap-3 mt-5">
                <HabitCircle icon={BookOpen} label="Devotional" hint="Read & receive" done={habits.devotional} onClick={() => handleHabitClick("devotional")} />
                <HabitCircle icon={MessageCircle} label="Daily Message" hint="Reply below" done={habits.dailyMessage} onClick={() => handleHabitClick("dailyMessage")} />
                <HabitCircle icon={NotebookPen} label="Journal" hint="In Heart Notes" done={habits.journal} onClick={() => handleHabitClick("journal")} />
              </div>

              <div className="mt-5 flex items-center gap-2 text-sm text-white/85">
                <BadgeCoin tier={tier} size={22} />
                <span>{tier === "none" ? "Earn your first badge today." : `You've earned a ${badgeLabel(tier)}.`}</span>
              </div>
            </div>

            <CalendarCard todayTier={tier} />
          </div>
        </div>

        <p className="text-center text-xs text-white/60 mt-10 mb-4 flex items-center justify-center gap-1.5">
          <Icon icon={Sparkles} size="sm" className="text-gold" /> Walk gently. You are loved.
        </p>
      </section>

      <DevotionalModal
        open={devotionalOpen}
        onClose={() => setDevotionalOpen(false)}
        onReceived={() => markComplete("devotional")}
      />
    </TooltipProvider>
  );
}

function DailyMessageChat({ onSent }: { onSent: () => void }) {
  const { profile } = useAuth();
  const { messages, send } = useDailyChat();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending]);

  async function onSubmit() {
    if (!text.trim() || pending) return;
    const t = text;
    setText("");
    setPending(true);
    onSent();
    await send(t, (u) => respondToDailyMessage(u, profile));
    setPending(false);
  }

  return (
    <div className="mt-5 border-t border-white/10 pt-4">
      <label className="block text-sm font-medium mb-2 text-white/85">What's on your heart today?</label>

      {messages.length > 0 && (
        <div
          ref={scrollRef}
          className="max-h-72 overflow-y-auto space-y-2 mb-3 pr-1 scroll-smooth"
        >
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-gold/90 text-gold-foreground rounded-br-sm"
                    : "bg-white/10 text-white/90 rounded-bl-sm border border-white/10"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {pending && (
            <div className="flex justify-start">
              <div className="bg-white/10 text-white/70 rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm border border-white/10">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse [animation-delay:120ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse [animation-delay:240ms]" />
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <textarea
        id="daily-message-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); }
        }}
        rows={2}
        placeholder={messages.length ? "Keep the conversation going…" : "Share what's on your heart…"}
        className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/15 focus:outline-none focus:ring-2 focus:ring-gold text-white placeholder:text-white/45 resize-none"
      />
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-white/55">Conversation resets at midnight</p>
        <button
          onClick={onSubmit}
          disabled={!text.trim() || pending}
          className="px-5 py-2.5 rounded-full bg-gold text-gold-foreground font-semibold flex items-center gap-2 shadow-soft hover:opacity-95 disabled:opacity-50"
        >
          <Icon icon={Send} size="sm" tone="inherit" /> Send
        </button>
      </div>
    </div>
  );
}

function HabitCircle({
  icon, label, hint, done, onClick,
}: { icon: typeof BookOpen; label: string; hint: string; done: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 group" title={hint}>
      <span
        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
          done ? "bg-gold border-gold text-gold-foreground animate-glow" : "bg-white/8 border-white/25 text-white/70 group-hover:border-gold"
        }`}
      >
        {done ? <Icon icon={Check} size="md" tone="inherit" /> : <Icon icon={icon} size="md" tone="inherit" />}
      </span>
      <span className="text-xs text-white/80 font-medium">{label}</span>
      <span className="text-[10px] text-white/50">{hint}</span>
    </button>
  );
}

function BadgeCoin({ tier, size = 28 }: { tier: BadgeTier; size?: number }) {
  if (tier === "none") return null;
  const c = badgeColors(tier);
  return (
    <span
      aria-label={badgeLabel(tier)}
      style={{
        width: size,
        height: size,
        background: c.bg,
        borderColor: c.ring,
        color: c.fg,
      }}
      className="inline-flex items-center justify-center rounded-full border-2 shadow-soft text-[10px] font-bold tracking-wide"
    >
      {tier === "gold" ? "★" : tier === "silver" ? "◆" : "●"}
    </span>
  );
}

function CalendarCard({ todayTier }: { todayTier: BadgeTier }) {
  const { user } = useAuth();
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const monthName = cursor.toLocaleString("en-US", { month: "long", year: "numeric" });
  const today = new Date();
  const sameMonth = today.getFullYear() === cursor.getFullYear() && today.getMonth() === cursor.getMonth();
  const [monthTiers, setMonthTiers] = useState<Record<string, BadgeTier>>({});

  useEffect(() => {
    if (!user) return;
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const first = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const last = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    supabase
      .from("daily_habits")
      .select("date, devotional, daily_message, journal")
      .eq("user_id", user.id)
      .gte("date", first)
      .lte("date", last)
      .then(({ data }: { data: { date: string; devotional: boolean | null; daily_message: boolean | null; journal: boolean | null }[] | null }) => {
        const map: Record<string, BadgeTier> = {};
        for (const row of data ?? []) {
          const count =
            (row.devotional ? 1 : 0) +
            (row.daily_message ? 1 : 0) +
            (row.journal ? 1 : 0);
          map[(row.date as string).slice(0, 10)] = badgeForCount(count);
        }
        setMonthTiers(map);
      });
  }, [user, cursor]);

  const grid = useMemo(() => {
    const first = new Date(cursor);
    const startDow = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (number | null)[] = Array(startDow).fill(null);
    for (let i = 1; i <= daysInMonth; i++) cells.push(i);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  function isoFor(d: number) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-${String(d).padStart(2, "0")}`;
  }

  return (
    <div className="glass-on-hue rounded-3xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-xl text-white">Spiritual Journey</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <button aria-label="How this works" className="text-white/70 hover:text-white">
                <Icon icon={Info} size="sm" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="bg-black/85 text-white border border-white/10 max-w-[220px]">
              Each day fills with the badge you earn - copper, silver, or gold.
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/90">
          <button aria-label="Previous month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center"><Icon icon={ChevronLeft} size="sm" /></button>
          <span className="font-medium">{monthName}</span>
          <button aria-label="Next month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center"><Icon icon={ChevronRight} size="sm" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] uppercase text-white/70 mb-1">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 text-sm">
        {grid.map((d, i) => {
          const isToday = sameMonth && d === today.getDate();
          const iso = d ? isoFor(d) : "";
          const tier: BadgeTier = isToday ? todayTier : (monthTiers[iso] ?? "none");
          const showCoin = !!d && tier !== "none";
          return (
            <div key={i} className="aspect-square flex items-center justify-center">
              {d && (
                showCoin ? (
                  <span className="relative inline-flex items-center justify-center" title={iso}>
                    <BadgeCoin tier={tier} size={30} />
                  </span>
                ) : (
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center ${isToday ? "ring-2 ring-gold/60 text-white font-semibold" : "text-white/85 hover:bg-white/8"}`}>
                    {d}
                  </span>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
