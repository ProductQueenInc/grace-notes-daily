import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { ArticleCard } from "@/components/article-card";
import { DoveMark } from "@/components/dove-mark";
import { useAuth } from "@/hooks/use-auth";
import { LIBRARY, ALL_TAGS, SERIES, BASE_URL, type LibraryTag } from "@/lib/library";

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
  const setActiveTag = (t: LibraryTag | "All") =>
    navigate({ search: t === "All" ? {} : { tag: t }, replace: true });

  const seriesArticles = useMemo(
    () =>
      LIBRARY.filter((a) => a.series).sort(
        (a, b) => (a.series!.order ?? 0) - (b.series!.order ?? 0),
      ),
    [],
  );

  const filtered = useMemo(() => {
    if (activeTag === "All") return LIBRARY;
    return LIBRARY.filter((a) => a.tags.includes(activeTag));
  }, [activeTag]);

  const tagsInUse = useMemo(() => {
    const set = new Set<LibraryTag>();
    LIBRARY.forEach((a) => a.tags.forEach((t) => set.add(t)));
    return ALL_TAGS.filter((t) => set.has(t));
  }, []);

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
            Open app
          </Link>
        ) : (
          <Link to="/signup" className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-grace">
            Get started
          </Link>
        )}
      </header>

      {/* Hero */}
      <section className="px-6 pt-10 pb-10 relative z-10 text-center">
        <p className="text-gold uppercase tracking-widest text-xs font-semibold mb-3">
          Notes &amp; Letters
        </p>
        <h1 className="font-display text-5xl md:text-6xl text-white drop-shadow max-w-3xl mx-auto leading-tight">
          Slow reads for the long walk.
        </h1>
        <p className="mt-4 text-white/80 text-lg max-w-2xl mx-auto">
          Long-form writing on prayer, journaling, and walking with God. Quiet, honest, free to read.
        </p>
      </section>

      {/* Series strip */}
      {seriesArticles.length > 0 && (
        <section className="px-6 pb-8 relative z-10">
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

      {/* Tag chips */}
      <section className="px-6 pb-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-2 flex-wrap">
            <TagChip
              label="All"
              active={activeTag === "All"}
              onClick={() => setActiveTag("All")}
            />
            {tagsInUse.map((t) => (
              <TagChip
                key={t}
                label={t}
                active={activeTag === t}
                onClick={() => setActiveTag(t)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Article grid */}
      <section className="px-6 pb-20 relative z-10">
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
