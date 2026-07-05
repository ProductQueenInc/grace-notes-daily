import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, ChevronLeft, CalendarIcon, X } from "lucide-react";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { DoveMark } from "@/components/dove-mark";
import { BackHomeButton } from "@/components/back-home-cta";
import { Icon } from "@/components/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/hooks/use-auth";
import { listDevotionals, type DevotionalListItem } from "@/lib/ai-stubs";
import { BASE_URL } from "@/lib/library";

const RECENT_COUNT = 7;

function formatLongDate(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODateLocal(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const Route = createFileRoute("/library/devotional/")({
  loader: async (): Promise<{ items: DevotionalListItem[] }> => {
    // Pull a wide window so the calendar can enable every date that has a
    // devotional; the page itself defaults to the most recent 7.
    const res = await listDevotionals({ data: { limit: 400, offset: 0 } });
    return { items: res.items };
  },
  head: () => ({
    meta: [
      { title: "Daily Devotionals — GraceNotes Daily" },
      {
        name: "description",
        content:
          "The last seven daily devotionals from GraceNotes Daily, plus a calendar to open any day from the archive.",
      },
      { property: "og:title", content: "Daily Devotionals — GraceNotes Daily" },
      {
        property: "og:description",
        content:
          "The last seven daily devotionals from GraceNotes Daily, plus a calendar to open any day from the archive.",
      },
      { property: "og:url", content: `${BASE_URL}/library/devotional` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${BASE_URL}/library/devotional` }],
  }),
  component: DevotionalArchive,
});

function DevotionalArchive() {
  const { session, loading } = useAuth();
  const isLoggedIn = !loading && !!session;
  const { items } = Route.useLoaderData();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const availableDates = useMemo(
    () => new Set((items as DevotionalListItem[]).map((i) => i.date)),
    [items],
  );
  const byDate = useMemo(() => {
    const map = new Map<string, DevotionalListItem>();
    for (const i of items as DevotionalListItem[]) map.set(i.date, i);
    return map;
  }, [items]);

  const visible: DevotionalListItem[] = useMemo(() => {
    if (selectedDate) {
      const one = byDate.get(selectedDate);
      return one ? [one] : [];
    }
    return items.slice(0, RECENT_COUNT);
  }, [items, selectedDate, byDate]);

  const oldest = items.length ? parseISODateLocal(items[items.length - 1].date) : undefined;
  const newest = items.length ? parseISODateLocal(items[0].date) : undefined;

  return (
    <>
      <NatureBackground />

      <header className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between text-white backdrop-blur-md bg-grace-deep/30">
        <Link to="/" className="flex items-center gap-2">
          <DoveMark variant="medallion" className="w-9 h-9" />
          <span className="font-display text-xl sm:text-2xl">GraceNotes Daily</span>
        </Link>
        {isLoggedIn ? (
          <BackHomeButton />
        ) : (
          <Link
            to="/signup"
            className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-grace shadow"
          >
            Come on in
          </Link>
        )}
      </header>

      <section className="px-6 pt-8 pb-8 sm:pt-10 relative z-10 text-center">
        <p className="text-gold uppercase tracking-widest text-xs font-semibold mb-3">
          Daily Devotionals
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-white drop-shadow max-w-3xl mx-auto leading-tight">
          Every day, a quiet reading.
        </h1>
        <p className="mt-4 text-white/90 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          The last seven readings sit here for you. Pick a date to open any day from the archive.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/library"
            className="inline-flex items-center gap-1.5 text-sm text-white/85 hover:text-white px-4 py-2 rounded-full border border-white/25 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Library
          </Link>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full bg-white text-grace shadow hover:bg-white/90 transition"
              >
                <CalendarIcon className="w-4 h-4" />
                {selectedDate ? formatLongDate(selectedDate) : "Pick a date"}
              </button>
            </PopoverTrigger>
            <PopoverContent align="center" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate ? parseISODateLocal(selectedDate) : undefined}
                onSelect={(d) => {
                  if (!d) return;
                  const iso = toISODate(d);
                  if (!availableDates.has(iso)) return;
                  setSelectedDate(iso);
                  setPickerOpen(false);
                }}
                fromDate={oldest}
                toDate={newest}
                disabled={(d) => !availableDates.has(toISODate(d))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="inline-flex items-center gap-1.5 text-sm text-white/85 hover:text-white px-4 py-2 rounded-full border border-white/25 transition"
            >
              <X className="w-4 h-4" /> Show recent 7
            </button>
          )}
        </div>
      </section>

      <section className="px-6 pb-14 relative z-10">
        <div className="max-w-5xl mx-auto">
          {visible.length === 0 ? (
            <div className="glass-parchment rounded-3xl p-10 text-center">
              <Icon icon={BookOpen} size="md" tone="hue" className="mx-auto mb-3 opacity-60" />
              <p className="text-foreground/70">
                {selectedDate
                  ? "No devotional for that day."
                  : "No devotionals yet. Check back tomorrow."}
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((item) => (
                <Link
                  key={item.date}
                  to="/library/devotional/$date"
                  params={{ date: item.date }}
                  className="group glass-parchment rounded-2xl overflow-hidden flex flex-col hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-grace-haze/40">
                    {item.coverImageUrl ? (
                      <img
                        src={item.coverImageUrl}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-grace-haze/40 to-grace/10">
                        <DoveMark variant="medallion" className="w-10 h-10 opacity-60" />
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <span className="text-foreground/45 text-xs tabular-nums mb-1">
                      {formatLongDate(item.date)}
                    </span>
                    <h3 className="font-display text-xl text-grace leading-snug group-hover:text-grace-deep transition mb-1">
                      {item.title}
                    </h3>
                    <p className="text-grace/70 text-xs font-semibold tracking-wide mb-2">
                      {item.verseRef}
                    </p>
                    {item.takeaway && (
                      <p className="text-foreground/70 text-sm leading-relaxed line-clamp-3">
                        {item.takeaway}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
