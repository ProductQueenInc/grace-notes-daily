import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { DoveMark } from "@/components/dove-mark";
import { BackHomeButton } from "@/components/back-home-cta";
import { Icon } from "@/components/icon";
import { useAuth } from "@/hooks/use-auth";
import { listDevotionals, type DevotionalListItem } from "@/lib/ai-stubs";
import { BASE_URL } from "@/lib/library";

const PAGE_SIZE = 20;

type ArchiveSearch = { page?: number };

function formatLongDate(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function monthKey(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const Route = createFileRoute("/library/devotional/")({
  validateSearch: (search: Record<string, unknown>): ArchiveSearch => {
    const p = Number(search.page);
    if (Number.isFinite(p) && p > 1) return { page: Math.floor(p) };
    return {};
  },
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({
    deps,
  }): Promise<{ items: DevotionalListItem[]; total: number; page: number }> => {
    const page = deps.page;
    const offset = (page - 1) * PAGE_SIZE;
    const res = await listDevotionals({ data: { limit: PAGE_SIZE, offset } });
    return { items: res.items, total: res.total, page };
  },
  head: () => ({
    meta: [
      { title: "Daily Devotionals — GraceNotes Daily" },
      {
        name: "description",
        content:
          "Every daily devotional from GraceNotes Daily. Read past reflections or start with today's.",
      },
      { property: "og:title", content: "Daily Devotionals — GraceNotes Daily" },
      {
        property: "og:description",
        content:
          "Every daily devotional from GraceNotes Daily. Read past reflections or start with today's.",
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
  const { items, total, page } = Route.useLoaderData();
  const navigate = useNavigate({ from: "/library/devotional/" });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Group by month heading, preserving reverse-chron order.
  const grouped = useMemo(() => {
    const groups: { key: string; items: DevotionalListItem[] }[] = [];
    for (const item of items) {
      const key = monthKey(item.date);
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.items.push(item);
      else groups.push({ key, items: [item] });
    }
    return groups;
  }, [items]);

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

      <section className="px-6 pt-8 pb-10 sm:pt-10 relative z-10 text-center">
        <p className="text-gold uppercase tracking-widest text-xs font-semibold mb-3">
          Daily Devotionals
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-white drop-shadow max-w-3xl mx-auto leading-tight">
          Every day, a quiet reading.
        </h1>
        <p className="mt-4 text-white/90 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Browse every devotional we have published. Start with today, or wander back through the
          archive.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to="/library"
            className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white px-4 py-2 rounded-full border border-white/25 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Library
          </Link>
        </div>
      </section>

      <section className="px-6 pb-14 relative z-10">
        <div className="max-w-3xl mx-auto glass-parchment rounded-3xl p-5 sm:p-8">
          {items.length === 0 ? (
            <div className="text-center py-10">
              <Icon icon={BookOpen} size="md" tone="hue" className="mx-auto mb-3 opacity-60" />
              <p className="text-foreground/70">
                No devotionals yet. Check back tomorrow.
              </p>
            </div>
          ) : (
            grouped.map((g) => (
              <div key={g.key} className="mb-8 last:mb-0">
                <h2 className="text-grace/70 uppercase tracking-[0.2em] text-[11px] font-semibold mb-3">
                  {g.key}
                </h2>
                <ul className="divide-y divide-grace/10">
                  {g.items.map((item) => (
                    <li key={item.date}>
                      <Link
                        to="/library/devotional/$date"
                        params={{ date: item.date }}
                        className="block py-4 px-2 -mx-2 rounded-lg hover:bg-grace/5 transition group"
                      >
                        <div className="flex items-baseline justify-between gap-4 mb-1">
                          <h3 className="font-display text-lg sm:text-xl text-grace leading-snug group-hover:text-grace-deep transition">
                            {item.title}
                          </h3>
                          <span className="text-foreground/45 text-xs shrink-0 tabular-nums">
                            {formatLongDate(item.date)}
                          </span>
                        </div>
                        <p className="text-grace/70 text-xs font-semibold tracking-wide mb-1">
                          {item.verseRef}
                        </p>
                        {item.takeaway && (
                          <p className="text-foreground/70 text-sm leading-relaxed line-clamp-2">
                            {item.takeaway}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-grace/10">
              <button
                onClick={() =>
                  navigate({
                    search: page - 1 <= 1 ? {} : { page: page - 1 },
                  })
                }
                disabled={page <= 1}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-grace/25 text-grace text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-grace/5 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Newer
              </button>
              <span className="text-foreground/55 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => navigate({ search: { page: page + 1 } })}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-grace/25 text-grace text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-grace/5 transition"
              >
                Older <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
