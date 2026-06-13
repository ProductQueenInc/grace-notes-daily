import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { ArticleCard } from "@/components/article-card";
import { ArticleCardCompact, SeeAllTile } from "@/components/article-card-compact";
import { DoveMark } from "@/components/dove-mark";
import { useAuth } from "@/hooks/use-auth";
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

  const latest: LibraryArticle | undefined = useMemo(() => sorted[0], [sorted]);

  // Themed mobile rows — one per primary tag with ≥2 articles.
  // Articles MAY appear in more than one category row (no de-duplication).
  // The "latest" article is still excluded to avoid double-showing it
  // immediately below its own featured card.
  const themedSections = useMemo(() => {
    const pool = sorted.filter((a) => a.slug !== latest?.slug);
    const sections: { tag: LibraryTag; items: LibraryArticle[] }[] = [];
    for (const tag of PRIMARY_TAGS) {
      const items = pool.filter((a) => a.tags.includes(tag)).slice(0, 8);
      if (items.length >= 2) sections.push({ tag, items });
    }
    return sections;
  }, [sorted, latest]);

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
      <header className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between text-white backdrop-blur-md bg-grace-deep/30">
        <Link to="/" className="flex items-center gap-2">
          <DoveMark variant="medallion" className="w-9 h-9" />
          <span className="font-display text-xl sm:text-2xl">GraceNotes Daily</span>
        </Link>
        {isLoggedIn ? (
          <Link to="/home" className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-grace shadow">
            Home
          </Link>
        ) : (
          <Link to="/signup" className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-grace shadow">
            Come on in
          </Link>
        )}
      </header>

      {/* Hero */}
      <section className="px-6 pt-8 pb-16 sm:pt-10 sm:pb-10 relative z-10 text-center">
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

      {/* Latest essay — featured. Compact on mobile (no excerpt), full on desktop. */}
      {latest && isAll && (
        <section className="px-6 pb-10 sm:pb-12 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-baseline justify-between mb-3 sm:mb-4">
              <p className="text-gold uppercase tracking-widest text-[11px] sm:text-xs font-semibold">
                Latest letter
              </p>
            </div>
            <Link
              to="/library/$slug"
              params={{ slug: latest.slug }}
              className="group glass-parchment rounded-3xl overflow-hidden grid md:grid-cols-2 transition hover:shadow-lg"
            >
              <div className="aspect-[16/10] md:aspect-auto overflow-hidden bg-grace-haze">
                <img
                  src={latest.cover}
                  alt=""
                  loading="lazy"
                  width={1600}
                  height={1000}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="p-5 sm:p-8 md:p-10 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2 sm:mb-3 text-[11px] sm:text-xs">
                  {latest.tags[0] && (
                    <span className="text-foreground/60 uppercase tracking-wider">
                      {latest.tags[0]}
                    </span>
                  )}
                </div>
                <h3 className="font-display text-2xl sm:text-3xl md:text-4xl text-grace leading-tight mb-2 sm:mb-3 group-hover:text-grace-deep transition">
                  {latest.title}
                </h3>
                {/* Excerpt is hidden on mobile to keep the card compact. */}
                <p className="hidden sm:block text-foreground/75 leading-relaxed mb-4">
                  {latest.excerpt}
                </p>
                <p className="text-foreground/50 text-xs">
                  {latest.readMinutes} min read
                </p>
              </div>
            </Link>
          </div>
        </section>
      )}

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

      {/* ============ FOUNDATIONS ROW (mobile + desktop) ============ */}
      {seriesArticles.length > 0 && isAll && (
        <section className="px-6 pb-16 pt-6 sm:pt-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-baseline justify-between mb-5 sm:mb-4">
              <div>
                <p className="text-gold uppercase tracking-widest text-[11px] sm:text-xs font-semibold">
                  Foundations
                </p>
                <h2 className="font-display text-xl sm:text-2xl md:text-[1.7rem] text-white drop-shadow leading-tight">
                  The three quiet practices
                </h2>
              </div>
            </div>
            <div
              className="flex gap-3 sm:gap-5 overflow-x-auto pb-3 -mx-6 px-6 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {seriesArticles.map((a) => (
                <div
                  key={a.slug}
                  className="snap-start shrink-0 w-[64vw] max-w-[260px] sm:w-[280px] sm:max-w-none md:w-[320px]"
                >
                  <ArticleCardCompact article={a} />
                </div>
              ))}
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
    <section className="pt-2 pb-10">
      <div className="px-6 mb-5">
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
