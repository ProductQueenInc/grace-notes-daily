import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { NatureBackground } from "@/components/nature-background";
import { useAuth } from "@/hooks/use-auth";
import { useHabits, type HabitKey } from "@/hooks/use-habits";
import { useDailyChat } from "@/hooks/use-daily-chat";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { generateDevotional } from "@/lib/ai-stubs";
import { useDailyGraceNote, type DailyGraceNote } from "@/hooks/use-daily-grace-note";
import { useStreak } from "@/hooks/use-streak";
import { supabase } from "@/lib/supabase";
import { DevotionalModal } from "@/components/devotional-modal";
import {
  Send, Flame, BookOpen, MessageCircle, NotebookPen,
  ChevronLeft, ChevronRight, Sparkles, Check, Info, Flag,
} from "lucide-react";
import { Icon } from "@/components/icon";
import { DoveMark } from "@/components/dove-mark";
import { pickRhythmGreeting } from "@/lib/personalization";
import { badgeForCount, badgeLabel, badgeColors, type BadgeTier } from "@/lib/badges";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { openTallyForm } from "@/lib/tally";
import { pickDailyPromise } from "@/lib/promises";

import { localTodayISO } from "@/lib/today";

function todayISO() {
  return localTodayISO();
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
  const {
    data: graceNote,
    isError: graceError,
    refetch: refetchGrace,
    isFetching: graceFetching,
  } = useDailyGraceNote();

  const { data: devotionalPreview } = useQuery({
    queryKey: ["devotional", today],
    queryFn: () => generateDevotional(profile!),
    enabled: !!profile && !graceFetching,
    staleTime: Infinity,
  });

  // Warm the devotional cache in the background AFTER the grace note settles, so
  // the two AI calls don't compete for the same mobile connection on first load.
  useEffect(() => {
    if (!profile) return;
    if (graceFetching) return;
    const t = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: ["devotional", today],
        queryFn: () => generateDevotional(profile),
        staleTime: Infinity,
      });
    }, 600);
    return () => clearTimeout(t);
  }, [profile, today, queryClient, graceFetching]);



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
      <section
        className="max-w-7xl mx-auto px-4 md:px-8 md:pt-10"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 3.5rem, 4rem)" }}
      >


        {/* Hero */}
        <div className="mb-8 fade-up max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/70 mb-3 flex items-center gap-1.5">
            <Icon icon={Sparkles} size="sm" className="text-gold" /> Today
          </p>
          <h1 className="font-display text-4xl md:text-6xl text-white leading-[1.05] tracking-tight">
            {pickRhythmGreeting(profile)}.
          </h1>
          <p className="text-white/80 mt-3 text-base md:text-lg max-w-xl">
            Your daily space for spiritual growth and reflection.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Today's Grace Note + Daily Message chat */}
            <div id="daily-message" className="glass-on-hue rounded-3xl overflow-hidden">
              <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 border-b border-white/10">
                <div className="flex items-center gap-2 font-semibold text-white min-w-0">
                  <DoveMark variant="medallion" className="w-8 h-8 shrink-0 drop-shadow-sm" alt="" />
                  <span className="truncate">Today's Grace Note</span>

                  {/* Info: explains personalization, links to settings */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        aria-label="About today's Grace Note"
                        className="ml-1 text-white/75 hover:text-white/90 shrink-0"
                      >
                        <Icon icon={Info} size="sm" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="bottom"
                      align="start"
                      className="max-w-[280px] text-sm bg-black/85 text-white border-white/10"
                    >
                      <p className="leading-relaxed">
                        This note is written using what you told us at sign-up:
                        your faith phase, the voice you chose, and any seasons you
                        picked. If any of that has changed, update it and the next
                        note will reflect it.
                      </p>
                      <Link
                        to="/settings"
                        className="mt-3 inline-block text-gold font-semibold hover:underline"
                      >
                        Edit your preferences →
                      </Link>
                    </PopoverContent>
                  </Popover>

                  {/* Flag: opens Tally feedback form (has "Flag content" option) */}
                  <button
                    onClick={() => openTallyForm("VL4NY6")}
                    aria-label="Flag this note"
                    className="text-white/75 hover:text-white/90 shrink-0"
                  >
                    <Icon icon={Flag} size="sm" />
                  </button>
                </div>
                <button onClick={() => setShowVerse((v) => !v)} className="shrink-0 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-2 min-h-9 rounded-full">
                  {showVerse ? "Hide Verse" : "Show Verse"}
                </button>
              </div>
              <div className="p-4 sm:p-6">
                {!graceNote ? (
                  graceError && !graceFetching ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-white/80 mb-3">
                        Today's note didn't come through. The line to the kitchen is quiet for a moment.
                      </p>
                      <button
                        onClick={() => refetchGrace()}
                        className="px-4 py-2 rounded-full bg-gold text-gold-foreground text-sm font-semibold hover:opacity-95"
                      >
                        Try again
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div className="inline-block w-7 h-7 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-white/70 mt-2">Loading your fresh grace note…</p>
                    </div>
                  )
                ) : (
                  <>
                    <p className="text-white/90 leading-relaxed font-display text-xl">{graceNote.message}</p>
                    {showVerse && (() => {
                      // verse is stored as "Full verse text - Book Chapter:Verse".
                      // Split on the LAST " - " so verse text containing hyphens stays intact.
                      const raw = graceNote.verse || "";
                      const idx = raw.lastIndexOf(" - ");
                      const hasSplit = idx > 0 && idx < raw.length - 3;
                      const text = hasSplit ? raw.slice(0, idx).trim() : "";
                      const ref = hasSplit ? raw.slice(idx + 3).trim() : raw.trim();
                      return (
                        <div className="mt-4 border-l-4 border-gold pl-4 py-2 italic text-white/85">
                          {text && <p className="mb-1">&ldquo;{text}&rdquo;</p>}
                          <p className="text-sm not-italic font-semibold text-white/70">{ref}</p>
                        </div>
                      );
                    })()}
                    {graceNote.signed && graceNote.signed.trim() && (
                      <p className="text-right text-sm text-white/75 italic mt-4">{graceNote.signed}</p>
                    )}
                  </>
                )}

                <DailyMessageChat graceContext={graceNote ?? null} onSent={() => markComplete("dailyMessage")} />
              </div>
            </div>

            {/* Daily Devotional CTA */}
            <button
              onClick={() => setDevotionalOpen(true)}
              className="w-full text-left rounded-3xl p-5 sm:p-6 glass-on-hue hover:scale-[1.005] transition group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-gold font-semibold mb-1 text-sm uppercase tracking-wider">
                  <Icon icon={BookOpen} size="sm" tone="inherit" /> Daily Devotional
                </div>
                {habits.devotional && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-white/80 bg-white/10 rounded-full px-2.5 py-1 shrink-0">
                    <Icon icon={Check} size="sm" tone="inherit" /> Received
                  </span>
                )}
              </div>
              <h3 className="font-display text-2xl sm:text-3xl text-white">{devotionalPreview?.title ?? "Today's Devotional"}</h3>
              <p className="text-sm text-white/70 mt-1">{devotionalPreview ? `${devotionalPreview.verseRef} · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}` : "Loading…"}</p>
              <span className={`inline-block mt-3 text-sm font-semibold ${habits.devotional ? "text-white/75" : "text-gold"}`}>
                {habits.devotional ? "Read again →" : "Read Today's Devotional →"}
              </span>
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
                      <button aria-label="How this works" className="text-white/75 hover:text-white/90">
                        <Icon icon={Info} size="sm" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-black/85 text-white border border-white/10 max-w-[240px]">
                      Gold days update automatically; the rest update at midnight. Tap a circle to go to its space.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gold/20 text-gold text-xs font-semibold">
                  <Icon icon={Flame} size="sm" tone="inherit" /> {streak} {streak === 1 ? "day" : "days"}
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

        <p className="text-center text-sm md:text-base text-white/75 italic font-display mt-10 mb-4 flex items-center justify-center gap-2 px-4">
          <Icon icon={Sparkles} size="sm" className="text-gold shrink-0" />
          <span>{pickDailyPromise()}</span>
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

function DailyMessageChat({
  graceContext,
  onSent,
}: {
  graceContext: DailyGraceNote | null;
  onSent: () => void;
}) {
  const { messages, send, pending, closeReason } = useDailyChat(graceContext);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending]);

  async function onSubmit() {
    if (!text.trim() || pending || closeReason) return;
    const t = text;
    setText("");
    const ok = await send(t);
    if (ok) onSent();
  }

  return (
    <div className="mt-5 border-t border-white/10 pt-4">
      <label className="block text-sm font-medium mb-2 text-white/85">{graceContext?.chatPrompt || "What's on your heart today?"}</label>

      {messages.length > 0 && (
        <div
          ref={scrollRef}
          className="max-h-72 overflow-y-auto space-y-2 mb-3 pr-1 scroll-smooth"
        >
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-gold/90 text-gold-foreground rounded-br-sm"
                    : "bg-white/10 text-white/90 rounded-bl-sm border border-white/10"
                }`}
              >
                {m.text || (m.pending ? (
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse [animation-delay:120ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse [animation-delay:240ms]" />
                  </span>
                ) : null)}
              </div>
            </div>
          ))}
        </div>
      )}

      {closeReason === "crisis" && (
        <div className="mb-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/85">
          This conversation is paused for today. Please reach out to someone who can be with you. A fresh thread will be here tomorrow.
        </div>
      )}
      {closeReason === "inappropriate" && (
        <div className="mb-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/75">
          This thread is closed for today. A fresh conversation will be here tomorrow.
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
        disabled={!!closeReason}
        placeholder={
          closeReason
            ? "Conversation paused for today."
            : messages.length
            ? "Keep the conversation going…"
            : "Share what's on your heart…"
        }
        className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/15 focus:outline-none focus:ring-2 focus:ring-gold text-white placeholder:text-white/60 resize-none disabled:opacity-60"
      />
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-white/75">Conversation resets at midnight</p>
        <button
          onClick={onSubmit}
          disabled={!text.trim() || pending || !!closeReason}
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
      <span className="text-[10px] text-white/75">{hint}</span>
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
