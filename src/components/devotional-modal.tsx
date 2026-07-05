import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { X, BookOpen, Heart, Check, RefreshCw, Share2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSharedDevotional } from "@/lib/ai-stubs";
import { softGoldConfetti } from "@/lib/confetti";
import { toast } from "sonner";
import { ReadingSurface } from "@/components/reading-surface";
import { Icon } from "@/components/icon";
import { useHabits } from "@/hooks/use-habits";
import { localTodayISO, isoForDate } from "@/lib/today";
import { ShareCardModal } from "@/components/share-card-modal";
import {
  devotionalShareDismissed,
  dismissDevotionalShare,
} from "@/lib/share-dismissals";

function formatDisplayDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function previousDayISO(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return isoForDate(d);
}

export function DevotionalModal({ open, onClose, onReceived }: { open: boolean; onClose: () => void; onReceived?: () => void }) {
  // DATE ANCHOR: freeze the devotional's date at the moment the modal opens.
  // If the user leaves the modal open across midnight, they are still reading
  // (and marking) THAT day's devotional — content, date label, and check
  // state all stay tied to this one date. Reopening re-anchors to the new day.
  const [devotionalDate, setDevotionalDate] = useState(localTodayISO);
  useEffect(() => {
    if (open) setDevotionalDate(localTodayISO());
  }, [open]);

  // Habit state scoped to the devotional's own date — never the wall-clock
  // date at click time. Marking here can only affect devotionalDate's row.
  const { habits, markComplete } = useHabits(devotionalDate);
  const received = habits.devotional;
  // Display the anchored date — never what the server or AI returns for the
  // date field, which can be stale from cache or hallucinated by the model.
  const dateDisplay = formatDisplayDate(devotionalDate);

  // The devotional is SHARED (same for everyone, keyed by date). Shares the
  // cache key with home.tsx prefetch - opens instantly if warmed.
  const { data, isError, refetch, isFetching } = useQuery({
    queryKey: ["devotional", devotionalDate],
    queryFn: () => getSharedDevotional(devotionalDate),
    enabled: open,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    // If the server had to fall back to a previous day's devotional, retry
    // quietly in the background until the real one exists, then stop.
    refetchInterval: (query) => (query.state.data?.isFallback ? 60_000 : false),
  });

  // Quiet label when showing a fallback: "Yesterday's reflection" when it is
  // literally yesterday's, otherwise the served devotional's own date. Never
  // label a past reflection with today's date.
  const dateLabel = data?.isFallback
    ? data.servedDate === previousDayISO(devotionalDate)
      ? "Yesterday's reflection"
      : formatDisplayDate(data.servedDate ?? devotionalDate)
    : dateDisplay;

  if (!open || typeof document === "undefined") return null;

  function receive() {
    softGoldConfetti();
    toast.success("Received. His word is alive in you.");
    // Mark via the date-anchored hook (writes to devotionalDate's row).
    // Other useHabits instances (home card, rhythm circles) sync via the
    // date-stamped "gn:habits-change" event and ignore non-matching dates.
    markComplete("devotional");
    onReceived?.();
    setTimeout(onClose, 700);
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-md p-0 md:p-6">
      <ReadingSurface className="w-full md:max-w-2xl max-h-[92vh] overflow-y-auto md:rounded-3xl rounded-t-3xl shadow-2xl fade-up">
        <div className="sticky top-0 z-10 bg-gradient-to-b from-[color:var(--surface-parchment-from)] to-transparent px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-grace">
            <Icon icon={BookOpen} size="md" tone="inherit" />
            <span className="font-semibold">Daily Devotional</span>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full hover:bg-black/5 flex items-center justify-center text-foreground/60">
            <Icon icon={X} size="md" />
          </button>
        </div>

        {isError ? (
          <div className="p-12 text-center">
            <p className="text-sm text-foreground/70 mb-4">
              Today's devotional couldn't load. Let's try again.
            </p>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-grace text-white font-semibold disabled:opacity-60"
            >
              <Icon icon={RefreshCw} size="sm" tone="inherit" />
              {isFetching ? "Trying again…" : "Try again"}
            </button>
          </div>
        ) : !data ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-2 border-grace border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-foreground/60 mt-3">Loading today's devotional…</p>
          </div>
        ) : (
          <div className="px-6 md:px-10 pb-10">
            <div className="border-l-4 border-gold rounded-r-2xl pl-5 py-3 my-4">
              <p className="font-display italic text-xl md:text-2xl text-grace leading-snug mb-2">
                {data.verseOfDay}
              </p>
              <p className="text-grace/80 text-sm font-semibold tracking-wide">{data.verseRef}</p>
            </div>

            <h2 className="font-display text-3xl md:text-4xl text-grace mb-1">{data.title}</h2>
            <p className="text-xs text-foreground/55 uppercase tracking-[0.18em] mb-6">{dateLabel}</p>

            <div className="space-y-4 text-foreground/85 leading-relaxed max-w-[64ch]">
              {data.body.map((p, i) => <p key={i}>{p}</p>)}
            </div>

            <div className="mt-7 rounded-2xl bg-gold-soft/60 border-l-4 border-gold p-5">
              <div className="flex items-center gap-2 text-gold-foreground font-semibold mb-3">
                <Icon icon={BookOpen} size="sm" tone="inherit" /> Related Scripture
              </div>
              <div className="space-y-3 text-sm">
                {data.related.map((r) => (
                  <div key={r.ref}>
                    <span className="font-semibold text-gold-foreground">{r.ref}:</span>{" "}
                    <span className="text-foreground/75">{r.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-grace-soft border-l-4 border-grace p-5 italic text-foreground/85">
              {data.takeaway}
            </div>

            {received ? (
              <div className="mt-7 w-full md:w-auto md:px-12 md:mx-auto md:flex py-3.5 rounded-full bg-grace-soft text-grace font-semibold flex items-center justify-center gap-2 cursor-default opacity-90">
                <Icon icon={Check} size="sm" tone="inherit" />{" "}
                {devotionalDate === localTodayISO() ? "Received today" : "Received"}
              </div>
            ) : (
              <button
                onClick={receive}
                className="mt-7 w-full md:w-auto md:px-12 md:mx-auto md:flex py-3.5 rounded-full gradient-gold text-gold-foreground font-semibold shadow-lg hover:scale-[1.02] transition flex items-center justify-center gap-2"
              >
                <Icon icon={Heart} size="sm" tone="inherit" /> I Receive This
              </button>
            )}
          </div>
        )}
      </ReadingSurface>
    </div>,
    document.body
  );
}
