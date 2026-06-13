import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { ArticleCard } from "@/components/article-card";
import { DoveMark } from "@/components/dove-mark";
import { useAuth } from "@/hooks/use-auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SlidersHorizontal, ArrowRight } from "lucide-react";
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
  const setActiveTag = (t: LibraryTag | "All") => {
    navigate({
      search: t === "All" ? {} : { tag: t },
      replace: true,
      resetScroll: false,
    });
    // Smooth-scroll to the all-essays grid when user picks a tag
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

  // Newest-first across all articles
  const sorted = useMemo(
    () => [...LIBRARY].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    [],
  );

  // Latest essay = newest non-series article (foundations are evergreen)
  const latest: LibraryArticle | undefined = useMemo(
    () => sorted.find((a) => !a.series),
    [sorted],
  );

  // Themed sections: up to 3 primary tags that have ≥2 articles available.
  // Exclude the "latest" article from these to avoid double-showing it.
  const themedSections = useMemo(() => {
    const pool = sorted.filter((a) => a.slug !== latest?.slug);
    const used = new Set<string>();
    const sections: { tag: LibraryTag; items: LibraryArticle[] }[] = [];
    for (const tag of PRIMARY_TAGS) {
      const items = pool
        .filter((a) => a.tags.includes(tag) && !used.has(a.slug))
        .slice(0, 3);
      if (items.length >= 2) {
        sections.push({ tag, items });
        items.forEach((a) => used.add(a.slug));
      }
      if (sections.length === 3) break;
    }
    return sections;
  }, [sorted, latest]);

  const filtered = useMemo(() => {
    if (activeTag === "All") return sorted;
    return sorted.filter((a) => a.tags.includes(activeTag));
  }, [sorted, activeTag]);

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

      <header className="px-6 py-5 flex items-center justify-between text-white relative z-10">
        <Link to="/" className="flex items-center gap-2">
          <DoveMark variant="medallion" className="w-10 h-10" />
          <span className="font-display text-2xl">GraceNotes Daily</span>
        </Link>
        {isLoggedIn ? (
          <Link to="/home" className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-grace">
            Home
          </Link>
        ) : (
          <Link to="/signup" className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-grace">
            Come on in
          </Link>
        )}
      </header>

      {/* Hero */}
      <section className="px-6 pt-10 pb-10 relative z-10 text-center">
        <p className="text-gold uppercase tracking-widest text-xs font-semibold mb-3">
          Notes &amp; Letters
        </p>
        <h1 className="font-display text-5xl md:text-6xl text-white drop-shadow max-w-3xl mx-auto leading-tight">
          Essays for the long walk home.
        </h1>
        <p className="mt-4 text-white/90 text-lg max-w-2xl mx-auto leading-relaxed">
          Unhurried thoughts on prayer, journaling, and the quiet work of walking with God.
        </p>
      </section>

      {/* Series strip — Foundations */}
      {seriesArticles.length > 0 && (
        <section className="px-6 pb-10 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="glass-parchment rounded-3xl p-6 md:p-8">
              <div className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
                <div>
                  <p className="text-gold uppercase tracking-widest text-xs font-semibold mb-1">
                    Series · Foundations
                  </p>
                  <h2 className="font-display text-2xl md:text-3xl text-grace">
                    {SERIES.foundations.description}
                  </h2>
                </div>
                <span className="text-foreground/50 text-xs">
                  {seriesArticles.length} parts
                </span>
              </div>
              <ol className="space-y-2">
                {seriesArticles.map((a) => (
                  <li key={a.slug}>
                    <Link
                      to="/library/$slug"
                      params={{ slug: a.slug }}
                      className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-grace/5 transition group"
                    >
                      <span className="font-display text-gold text-lg w-8 shrink-0">
                        {a.series!.order}
                      </span>
                      <span className="flex-1">
                        <span className="block font-display text-grace text-lg group-hover:text-grace-deep">
                          {a.title}
                        </span>
                        <span className="block text-foreground/60 text-sm">
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

      {/* Latest essay — featured */}
      {latest && (
        <section className="px-6 pb-12 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-baseline justify-between mb-4">
              <p className="text-gold uppercase tracking-widest text-xs font-semibold">
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
              <div className="p-6 md:p-10 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3 text-xs">
                  {latest.tags[0] && (
                    <span className="text-foreground/60 uppercase tracking-wider">
                      {latest.tags[0]}
                    </span>
                  )}
                </div>
                <h3 className="font-display text-3xl md:text-4xl text-grace leading-tight mb-3 group-hover:text-grace-deep transition">
                  {latest.title}
                </h3>
                <p className="text-foreground/75 leading-relaxed mb-4">
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

      {/* Themed sections — Browse by theme */}
      {/* All letters — tag-filtered grid */}
      <section id="all-essays" className="px-6 pb-6 relative z-10 scroll-mt-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-2xl md:text-[1.7rem] text-white drop-shadow mb-4">
            All letters
          </h2>
          </h2>
          <div className="flex gap-2 flex-wrap items-center">
            <TagChip
              label="All"
              active={activeTag === "All"}
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
            {activeTag !== "All" &&
              !(PRIMARY_TAGS as LibraryTag[]).includes(activeTag) && (
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
                        activeTag === "All"
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

      <section className="px-6 pb-20 pt-6 relative z-10">
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

      <SiteFooter />
    </>
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
