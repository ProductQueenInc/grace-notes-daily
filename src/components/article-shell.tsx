import { Link } from "@tanstack/react-router";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { ShareBar } from "@/components/share-bar";
import { ArticleCard } from "@/components/article-card";
import { DoveMark } from "@/components/dove-mark";
import { BackHomeButton, BackHomeCard } from "@/components/back-home-cta";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  type LibraryArticle,
  SERIES,
  articleUrl,
  relatedArticles,
  DEFAULT_AUTHOR,
} from "@/lib/library";

interface ArticleShellProps {
  article: LibraryArticle;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function ArticleShell({ article }: ArticleShellProps) {
  const { session, loading } = useAuth();
  const isLoggedIn = !loading && !!session;
  const Body = article.Body;
  const series = article.series ? SERIES[article.series.slug] : null;
  const url = articleUrl(article.slug);
  const related = relatedArticles(article.slug, 3);
  const author = article.author ?? DEFAULT_AUTHOR;

  return (
    <>
      <NatureBackground />

      {/* Darkening scrim behind hero so white text stays legible over bright canopy spots */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[70vh] z-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,30,18,0.55) 0%, rgba(10,30,18,0.35) 35%, rgba(10,30,18,0.15) 65%, rgba(10,30,18,0) 100%)",
        }}
      />

      <header className="px-6 py-5 flex items-center justify-between text-white relative z-10">
        <Link to="/" className="flex items-center gap-2">
          <DoveMark variant="medallion" className="w-10 h-10" />
          <span className="font-display text-2xl">GraceNotes Daily</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/library" className="hidden sm:inline text-white/90 hover:text-white text-sm">
            Notes &amp; Letters
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
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pt-8 pb-6 relative z-10 text-center max-w-4xl mx-auto [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
        <div className="text-sm text-white/95 mb-3 flex items-center justify-center gap-2 flex-wrap font-medium">
          <Link to="/library" className="hover:text-gold transition">
            Notes &amp; Letters
          </Link>
          {series && (
            <>
              <span>·</span>
              <span className="text-gold uppercase tracking-widest font-semibold">
                {series.title}
                {article.series?.order ? ` · Part ${article.series.order}` : ""}
              </span>
            </>
          )}
        </div>
        <h1 className="font-display text-4xl md:text-6xl text-white leading-tight [text-shadow:0_2px_6px_rgba(0,0,0,0.45)]">
          {article.title}
        </h1>
        <p className="mt-4 text-white text-lg max-w-2xl mx-auto font-medium leading-relaxed">
          {article.lede}
        </p>
        <p className="mt-4 text-white/85 text-sm font-medium">
          {article.readMinutes} min read · {formatDate(article.publishedAt)} · {author}
        </p>
        {article.tags.length > 0 && (
          <div className="mt-5 flex gap-2 flex-wrap justify-center">
            {article.tags.map((t) => (
              <Link
                key={t}
                to="/library"
                search={{ tag: t }}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-black/35 text-white border border-white/25 backdrop-blur-sm hover:bg-black/50 hover:border-white/40 transition [text-shadow:none]"
              >
                {t}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Cover — hidden on desktop for Notes & Letters (background is already rich) */}
      <section
        className={`px-6 pb-10 relative z-10 ${article.kind === "notes" ? "md:hidden" : ""}`}
      >
        <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-xl">
          <img
            src={article.cover}
            alt=""
            width={1600}
            height={900}
            className="w-full h-auto object-cover aspect-[16/9]"
          />
        </div>
      </section>

      {/* Body */}
      <section className="px-6 pb-12 relative z-10">
        <div className="max-w-3xl mx-auto space-y-6">
          <Body />
        </div>
      </section>

      {/* Share */}
      <section className="px-6 pb-10 relative z-10">
        <div className="max-w-3xl mx-auto">
          <ShareBar url={url} title={article.title} description={article.description} />
        </div>
      </section>

      {/* Soft CTA — signed-out only */}
      {!loading && !isLoggedIn && (
        <section className="px-6 pb-16 relative z-10">
          <div className="max-w-3xl mx-auto glass-parchment rounded-3xl p-8 md:p-12 text-center space-y-5">
            <p className="font-display text-3xl text-grace leading-tight">
              Walk a little slower with us.
            </p>
            <p className="text-foreground/75 leading-relaxed max-w-xl mx-auto">
              GraceNotes Daily is a soft, daily companion for your walk with God. A short word in
              the morning, a place to write your prayers, and a quiet record of how He has been
              faithful.
            </p>
            {/* Newsletter slot — designed for future capture; intentionally inert today */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center justify-center">
              <Link
                to="/signup"
                className="inline-block px-6 py-3 rounded-full bg-grace font-semibold text-sm hover:bg-grace-deep transition"
                style={{ color: "#ffffff" }}
              >
                Create your free account
              </Link>
              <Link
                to="/library"
                className="inline-block px-6 py-3 rounded-full bg-transparent border border-grace/30 text-grace font-semibold text-sm hover:bg-grace/5 transition"
              >
                Keep reading
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Keep reading */}
      {related.length > 0 && (
        <section className="px-6 pb-16 relative z-10">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-3xl text-white drop-shadow px-2 mb-6">
              Keep reading
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                to="/library"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/90 text-grace font-semibold text-sm hover:bg-white transition shadow-md"
              >
                Browse all Notes &amp; Letters
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {article.faqs && article.faqs.length > 0 && (
        <section className="px-6 pb-20 relative z-10">
          <div className="max-w-3xl mx-auto space-y-3">
            <h2 className="font-display text-3xl text-white drop-shadow px-2">
              Frequently Asked Questions
            </h2>
            {article.faqs.map((f, i) => (
              <FaqItem key={i} q={f.q} a={f.a} />
            ))}
          </div>
        </section>
      )}

      <SiteFooter />
    </>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-white/40 transition"
      >
        <span className="font-display text-lg text-grace">{q}</span>
        <ChevronDown
          className={`w-5 h-5 text-grace shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-foreground/75 leading-relaxed">{a}</div>
      )}
    </div>
  );
}
