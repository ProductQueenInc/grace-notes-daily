import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { ArticleCard } from "@/components/article-card";
import { ArticleCardCompact, SeeAllTile } from "@/components/article-card-compact";
import { DoveMark } from "@/components/dove-mark";
import { BackHomeButton } from "@/components/back-home-cta";
import { Icon } from "@/components/icon";
import { useAuth } from "@/hooks/use-auth";
import { BookOpen, ArrowRight } from "lucide-react";
import { listDevotionals, type DevotionalListItem } from "@/lib/ai-stubs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SlidersHorizontal } from "lucide-react";
import {
  LIBRARY,
  ALL_TAGS,
  PRIMARY_TAGS,
  SERIES,
  BASE_URL,
  type LibraryArticle,
  type LibraryTag,
} from "@/lib/library";

type LibrarySearch = { tag?: LibraryTag | "All" };

export const Route = createFileRoute("/library/")({
  validateSearch: (search: Record<string, unknown>): LibrarySearch => {
    const t = search.tag;
    if (typeof t === "string" && (t === "All" || (ALL_TAGS as string[]).includes(t))) {
      return { tag: t as LibraryTag | "All" };
    }
    return {};
  },
  // Loader fetches recent devotionals for the hero + recent strip. Kept small
  // (8 rows) so a single query covers both. Failure is non-fatal: the hub
  // still renders without the devotional sections.
  loader: async (): Promise<{ recentDevotionals: DevotionalListItem[] }> => {
    try {
      const res = await listDevotionals({ data: { limit: 8, offset: 0 } });
      return { recentDevotionals: res.items };
    } catch (err) {
      console.error("[library] failed to load recent devotionals:", err);
      return { recentDevotionals: [] };
    }
  },
  head: () => ({
    meta: [
      { title: "Notes & Letters — GraceNotes Daily" },
      {
        name: "description",
        content:
          "Slow reads on prayer, journaling, and walking with God. Long-form Christian writing from GraceNotes Daily.",
      },
      { property: "og:title", content: "Notes & Letters — GraceNotes Daily" },
      {
        property: "og:description",
        content:
          "Slow reads on prayer, journaling, and walking with God. Long-form Christian writing from GraceNotes Daily.",
      },
      { property: "og:url", content: `${BASE_URL}/library` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${BASE_URL}/library` }],
  }),
  component: LibraryHub,
});

function LibraryHub() {
  const { session, loading } = useAuth();
  const isLoggedIn = !loading && !!session;
  const { recentDevotionals } = Route.useLoaderData();
  const todayDevotional = recentDevotionals[0];
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/library/" });
  const activeTag: LibraryTag | "All" = search.tag ?? "All";
  const isAll = activeTag === "All";
  const setActiveTag = (t: LibraryTag | "All") => {
    navigate({
      search: t === "All" ? {} : { tag: t },
      replace: true,
      resetScroll: false,
    });
    if (t !== "All" && typeof document !== "undefined") {
      requestAnimationFrame(() => {
        document
          .getElementById("all-essays")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const seriesArticles = useMemo(
    () =>
      LIBRARY.filter((a) => a.series).sort(
        (a, b) => (a.series!.order ?? 0) - (b.series!.order ?? 0),
      ),
    [],
  );

  // Newest-first across all NON-foundation articles. Foundations are pulled
  // out into their own row so card sizes stay consistent in the main grid.
  const sorted = useMemo(
    () =>
      [...LIBRARY]
        .filter((a) => !a.series)
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    [],
  );

  // Themed mobile rows — one per primary tag with ≥2 articles.
  // Articles MAY appear in more than one category row (no de-duplication).
  const themedSections = useMemo(() => {
    const sections: { tag: LibraryTag; items: LibraryArticle[] }[] = [];
    for (const tag of PRIMARY_TAGS) {
      const items = sorted.filter((a) => a.tags.includes(tag)).slice(0, 8);
      if (items.length >= 2) sections.push({ tag, items });
    }
    return sections;
  }, [sorted]);

  const filtered = useMemo(() => {
    if (isAll) return sorted;
    return sorted.filter((a) => a.tags.includes(activeTag as LibraryTag));
  }, [sorted, activeTag, isAll]);

  const tagsInUse = useMemo(() => {
    const set = new Set<LibraryTag>();
    LIBRARY.forEach((a) => a.tags.forEach((t) => set.add(t)));
    return ALL_TAGS.filter((t) => set.has(t));
  }, []);

  const primaryTagsInUse = useMemo(
    () => PRIMARY_TAGS.filter((t) => tagsInUse.includes(t)),
    [tagsInUse],
  );
  const longTailTagsInUse = useMemo(
    () => tagsInUse.filter((t) => !(PRIMARY_TAGS as LibraryTag[]).includes(t)),
    [tagsInUse],
  );
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "Notes & Letters",
            url: `${BASE_URL}/library`,
            publisher: { "@type": "Organization", name: "GraceNotes Daily" },
            blogPost: LIBRARY.map((a) => ({
              "@type": "BlogPosting",
              headline: a.title,
              url: `${BASE_URL}/library/${a.slug}`,
              datePublished: a.publishedAt,
              image: `${BASE_URL}${a.cover}`,
              description: a.description,
            })),
          }),
        }}
      />
      <NatureBackground />

      {/* Sticky page header — CTA stays pinned top-right as user scrolls. */}
      <header className="sticky top-0 z-30 px-5 sm:px-6 py-5 sm:py-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-white backdrop-blur-md bg-grace-deep/30">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <DoveMark variant="medallion" className="w-9 h-9 shrink-0" />
          <span className="font-display text-lg sm:text-2xl truncate whitespace-nowrap">GraceNotes Daily</span>
        </Link>
        {isLoggedIn ? (
          <BackHomeButton />
        ) : (
          <Link to="/signup" className="shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold bg-white text-grace shadow">
            Come on in
          </Link>
        )}
      </header>

      {/* Hero */}
      <section className="px-6 pt-10 sm:pt-14 pb-12 sm:pb-10 relative z-10 text-center">
        <p className="text-gold uppercase tracking-widest text-xs font-semibold mb-3">
          Notes &amp; Letters
        </p>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-white drop-shadow max-w-3xl mx-auto leading-tight">
          Essays for the long walk home.
        </h1>
        <p className="mt-4 text-white/90 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Unhurried thoughts on prayer, journaling, and the quiet work of walking with God.
        </p>
      </section>


      {/* Today's devotional — featured hero (desktop) + swipe carousel (mobile). */}
      {todayDevotional && isAll && (
        <>
          {/* Mobile: horizontal snap carousel of recent devotionals */}
          <section className="sm:hidden pb-8 relative z-10">
            <div className="px-6 mb-3 flex items-center gap-2 text-gold text-[11px] uppercase tracking-[0.2em]">
              <Icon icon={BookOpen} size="sm" tone="inherit" /> Daily devotionals
            </div>
            <div className="flex gap-3 overflow-x-auto px-6 pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {recentDevotionals.slice(0, 7).map((d: DevotionalListItem) => (
                <Link
                  key={d.date}
                  to="/library/devotional/$date"
                  params={{ date: d.date }}
                  className="group snap-center shrink-0 w-[85vw] max-w-[360px] glass-parchment rounded-3xl overflow-hidden flex flex-col transition hover:shadow-lg"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-grace-haze/40 relative">
                    {d.coverImageUrl ? (
                      <img
                        src={d.coverImageUrl}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-grace-haze/40 to-grace/10">
                        <DoveMark variant="medallion" className="w-12 h-12 opacity-60" />
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex flex-col gap-1.5 flex-1">
                    <span className="text-grace/60 text-[11px] uppercase tracking-wider tabular-nums">
                      {new Date(`${d.date}T12:00:00Z`).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </span>
                    <h2 className="font-display text-xl text-grace leading-snug line-clamp-2">
                      {d.title}
                    </h2>
                    <p className="text-grace/70 text-xs font-semibold tracking-wide">{d.verseRef}</p>
                    {d.takeaway && (
                      <p className="text-foreground/75 text-sm leading-relaxed line-clamp-3 mt-1">
                        {d.takeaway}
                      </p>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-gold font-semibold text-sm mt-auto pt-3">
                      Read
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Desktop: single prominent featured card */}
          <section className="hidden sm:block px-6 pb-10 sm:pb-12 relative z-10">
            <div className="max-w-6xl mx-auto">
              <Link
                to="/library/devotional/$date"
                params={{ date: todayDevotional.date }}
                className="group block glass-parchment rounded-3xl overflow-hidden transition hover:shadow-lg"
              >
                <div className="grid gap-6 md:gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] items-stretch">
                  <div className="p-6 sm:p-8 md:p-10 md:pr-0 flex flex-col">
                    <div className="flex items-center gap-2 text-gold text-[11px] uppercase tracking-[0.2em] mb-3">
                      <Icon icon={BookOpen} size="sm" tone="inherit" /> Today's devotional
                    </div>
                    <h2 className="font-display text-2xl sm:text-3xl md:text-4xl text-grace leading-tight mb-3 group-hover:text-grace-deep transition">
                      {todayDevotional.title}
                    </h2>
                    <p className="text-grace/70 text-sm font-semibold tracking-wide mb-3">
                      {todayDevotional.verseRef}
                    </p>
                    {todayDevotional.takeaway && (
                      <p className="text-foreground/75 leading-relaxed max-w-[64ch] mb-4 line-clamp-3 sm:line-clamp-none">
                        {todayDevotional.takeaway}
                      </p>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-gold font-semibold text-sm mt-auto">
                      Read today's devotional
                      <ArrowRight className="w-4 h-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </div>
                  <div className="relative aspect-[16/10] md:aspect-auto md:min-h-full overflow-hidden bg-grace-haze/40 order-first md:order-last">
                    {todayDevotional.coverImageUrl ? (
                      <img
                        src={todayDevotional.coverImageUrl}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-grace-haze/40 to-grace/10">
                        <DoveMark variant="medallion" className="w-14 h-14 opacity-60" />
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          </section>
        </>
      )}



      {/* Foundations teaser — quick numbered list so readers can jump in
          without scrolling all the way down to the Foundations row. */}
      {seriesArticles.length > 0 && isAll && (
        <section className="px-6 pb-8 sm:pb-10 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="glass-parchment rounded-3xl p-5 sm:p-7 md:p-8">
              <div className="flex items-baseline justify-between gap-4 mb-3 sm:mb-4 flex-wrap">
                <div>
                  <p className="text-gold uppercase tracking-widest text-[11px] font-semibold mb-1">
                    Series · Foundations
                  </p>
                  <h2 className="font-display text-xl sm:text-2xl md:text-3xl text-grace leading-snug">
                    {SERIES.foundations.description}
                  </h2>
                </div>
                <span className="text-foreground/50 text-xs">
                  {seriesArticles.length} parts
                </span>
              </div>
              <ol className="space-y-1">
                {seriesArticles.map((a) => (
                  <li key={a.slug}>
                    <Link
                      to="/library/$slug"
                      params={{ slug: a.slug }}
                      className="flex items-center gap-3 py-2 px-2 sm:px-3 rounded-lg hover:bg-grace/5 transition group"
                    >
                      <span className="font-display text-gold text-base sm:text-lg w-6 sm:w-8 shrink-0">
                        {a.series!.order}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-display text-grace text-[1rem] sm:text-lg leading-snug group-hover:text-grace-deep">
                          {a.title}
                        </span>
                        <span className="block text-foreground/55 text-xs sm:text-sm">
                          {a.readMinutes} min read
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}

      {/* Latest letter section intentionally removed — most recent essay
          appears first in the All Letters row below (newest-first sort). */}



      {/* Tag filter chips */}
      <section id="all-essays" className="px-6 pb-4 sm:pb-6 relative z-10 scroll-mt-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-xl sm:text-2xl md:text-[1.7rem] text-white drop-shadow mb-3 sm:mb-4">
            All letters
          </h2>
          <div className="flex gap-2 flex-wrap items-center">
            <TagChip
              label="All"
              active={isAll}
              onClick={() => setActiveTag("All")}
            />
            {primaryTagsInUse.map((t) => (
              <TagChip
                key={t}
                label={t}
                active={activeTag === t}
                onClick={() => setActiveTag(t)}
              />
            ))}
            {!isAll &&
              !(PRIMARY_TAGS as LibraryTag[]).includes(activeTag as LibraryTag) && (
                <TagChip label={activeTag} active onClick={() => setActiveTag("All")} />
              )}
            {longTailTagsInUse.length > 0 && (
              <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
                <SheetTrigger asChild>
                  <button
                    className="px-4 py-2 rounded-full text-sm font-medium bg-white/10 text-white/85 hover:bg-white/20 transition inline-flex items-center gap-2"
                    aria-label="More filters"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    More filters
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>More filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 flex gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setActiveTag("All");
                        setMoreOpen(false);
                      }}
                      className={[
                        "px-4 py-2 rounded-full text-sm font-medium transition",
                        isAll
                          ? "bg-grace text-white"
                          : "bg-grace-haze text-grace hover:bg-grace/15",
                      ].join(" ")}
                    >
                      All
                    </button>
                    {[...primaryTagsInUse, ...longTailTagsInUse].map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setActiveTag(t);
                          setMoreOpen(false);
                        }}
                        className={[
                          "px-4 py-2 rounded-full text-sm font-medium transition",
                          activeTag === t
                            ? "bg-grace text-white"
                            : "bg-grace-haze text-grace hover:bg-grace/15",
                        ].join(" ")}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </section>

      {/* ============ MOBILE LAYOUT (< sm) ============ */}
      <div className="sm:hidden relative z-10">
        {isAll ? (
          <>
            {/* All Letters — horizontal swipe row */}
            <SwipeRow
              eyebrow="All letters"
              items={sorted.slice(0, 8)}
              seeAllLabel="All letters"
              seeAllTag={undefined}
            />

            {/* Themed category rows (articles may repeat across rows) */}
            {themedSections.map(({ tag, items }) => (
              <SwipeRow
                key={tag}
                eyebrow={tag}
                items={items}
                seeAllLabel={tag}
                seeAllTag={tag}
              />
            ))}
          </>
        ) : (
          // Filtered view: compact vertical stack
          <section className="px-6 pb-6">
            {filtered.length === 0 ? (
              <p className="text-white/70 text-center py-12">
                No articles for this tag yet. More coming soon.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filtered.map((a) => (
                  <ArticleCardCompact key={a.slug} article={a} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* ============ DESKTOP LAYOUT (sm+) ============ */}
      <section className="hidden sm:block px-6 pb-12 pt-2 relative z-10">
        <div className="max-w-6xl mx-auto">
          {filtered.length === 0 ? (
            <p className="text-white/70 text-center py-12">
              No articles for this tag yet. More coming soon.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recent devotionals strip — primary entry point to the archive.
          Small horizontal cards, then a warm CTA to the full archive index. */}
      {recentDevotionals.length > 0 && isAll && (
        <section className="hidden sm:block px-6 pb-10 sm:pb-12 pt-2 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
              <div>
                <p className="text-gold uppercase tracking-widest text-[11px] sm:text-xs font-semibold mb-2">
                  Daily Devotionals
                </p>
                <h2 className="font-display text-xl sm:text-2xl md:text-[1.7rem] text-white drop-shadow leading-tight">
                  Recent readings
                </h2>
              </div>
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {recentDevotionals.slice(0, 6).map((d: DevotionalListItem) => (
                <Link
                  key={d.date}
                  to="/library/devotional/$date"
                  params={{ date: d.date }}
                  className="group glass-parchment rounded-2xl overflow-hidden flex flex-col transition hover:shadow-lg"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-grace-haze/40 relative">
                    {d.coverImageUrl ? (
                      <img
                        src={d.coverImageUrl}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-grace-haze/40 to-grace/10">
                        <DoveMark variant="medallion" className="w-12 h-12 opacity-60" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 sm:p-5 flex flex-col gap-1.5">
                    <span className="text-grace/60 text-[11px] uppercase tracking-wider tabular-nums">
                      {new Date(`${d.date}T12:00:00Z`).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </span>
                    <h3 className="font-display text-lg text-grace leading-snug group-hover:text-grace-deep transition line-clamp-2">
                      {d.title}
                    </h3>
                    <p className="text-grace/70 text-xs font-semibold tracking-wide">{d.verseRef}</p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link
                to="/library/devotional"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gold text-gold-foreground font-semibold text-sm hover:scale-[1.02] transition"
              >
                Browse all devotionals
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ============ FREE GUIDES (mobile + desktop) ============
          Foundations already appears at the top of the page as a teaser
          and as a featured row, so we use the bottom slot to surface
          our three standalone guides. */}
      {isAll && (
        <section className="px-6 pb-16 pt-6 sm:pt-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-baseline justify-between mb-5 sm:mb-4">
              <div>
                <p className="text-gold uppercase tracking-widest text-[11px] sm:text-xs font-semibold mb-2">
                  Free Guides
                </p>
                <h2 className="font-display text-xl sm:text-2xl md:text-[1.7rem] text-white drop-shadow leading-tight">
                  Take a deeper walk
                </h2>
              </div>
            </div>
            <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-3">
              <GuideCard
                to="/free-prayer-toolkit"
                eyebrow="Guide"
                title="The Effective Prayer Toolkit"
                blurb="Four ways to structure a prayer, plus what to do when you do not feel like praying."
              />
              <GuideCard
                to="/7-day-prayer-journal"
                eyebrow="Guide"
                title="7-Day Prayer Journal Starter Kit"
                blurb="A gentle week of prompts to help you put your prayers on paper."
              />
              <GuideCard
                to="/fasting-guide"
                eyebrow="Guide"
                title="A Guide to Fasting"
                blurb="A practical and pastoral primer on fasting for ordinary believers."
              />
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </>
  );
}

function SwipeRow({
  eyebrow,
  items,
  seeAllLabel,
  seeAllTag,
}: {
  eyebrow: string;
  items: LibraryArticle[];
  seeAllLabel: string;
  seeAllTag?: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="pt-6 pb-10">
      <div className="px-6 mb-6">
        <p className="text-gold uppercase tracking-widest text-[11px] font-semibold">
          {eyebrow}
        </p>
      </div>
      <div
        className="flex gap-3 overflow-x-auto px-6 pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((a) => (
          <div
            key={a.slug + eyebrow}
            className="snap-start shrink-0 w-[64vw] max-w-[260px]"
          >
            <ArticleCardCompact article={a} />
          </div>
        ))}
        <div className="snap-start shrink-0 w-[44vw] max-w-[180px]">
          <SeeAllTile tag={seeAllTag} label={seeAllLabel} />
        </div>
      </div>
    </section>
  );
}

function TagChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-4 py-2 rounded-full text-sm font-medium transition",
        active
          ? "bg-gold text-grace shadow-md"
          : "bg-white/10 text-white/85 hover:bg-white/20",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function GuideCard({
  to,
  eyebrow,
  title,
  blurb,
}: {
  to: "/free-prayer-toolkit" | "/7-day-prayer-journal" | "/fasting-guide";
  eyebrow: string;
  title: string;
  blurb: string;
}) {
  return (
    <Link
      to={to}
      className="group glass-parchment rounded-2xl p-5 sm:p-6 flex flex-col gap-2 transition hover:shadow-lg"
    >
      <span className="text-gold uppercase tracking-widest text-[10px] font-semibold">
        {eyebrow}
      </span>
      <h3 className="font-display text-lg sm:text-xl text-grace leading-tight group-hover:text-grace-deep transition">
        {title}
      </h3>
      <p className="text-foreground/70 text-sm leading-relaxed">{blurb}</p>
      <span className="mt-2 text-sm font-semibold text-gold">Read the guide →</span>
    </Link>
  );
}
