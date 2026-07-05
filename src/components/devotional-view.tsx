import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Share2,
  RefreshCw,
  Library,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { DoveMark } from "@/components/dove-mark";
import { BASE_URL } from "@/lib/library";
import { useAuth } from "@/hooks/use-auth";
import type { DevotionalResult } from "@/lib/ai.functions";
import type { NeighbourInfo } from "@/lib/devotional-archive.functions";

// Canonical share URL for a devotional.
function devotionalUrl(dateISO: string) {
  return `${BASE_URL}/library/devotional/${dateISO}`;
}

function formatLongDate(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatShortDate(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Vetted forest imagery (from src/components/nature-background.tsx). Static
// bands - the "envelope" that frames the letter. Not the full-page ambient
// slideshow we use in the authenticated app.
const ENVELOPE_TOP =
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=70&auto=format&fit=crop";
const ENVELOPE_BOTTOM =
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=70&auto=format&fit=crop";

// Shared head builder so the dated route and the index (today) route stay in sync.
export function devotionalHead(devotional?: DevotionalResult, dateISO?: string) {
  if (!devotional || !dateISO) {
    return { meta: [{ title: "Daily Devotional | GraceNotes Daily" }] };
  }
  const url = devotionalUrl(dateISO);
  // Prefer the per-devotional AI-generated cover; fall back to the shared OG
  // image only when the row has no cover yet (pre-cover rows still being
  // backfilled). Both are absolute URLs so crawlers can fetch them.
  const ogImage = devotional.coverImageUrl || `${BASE_URL}/og/daily-devotional.png`;
  const title = `${devotional.title} | Daily Devotional`;
  const description = `${devotional.verseRef}. ${devotional.takeaway || devotional.verseOfDay}`.slice(0, 200);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: devotional.title,
    description,
    image: [ogImage],
    datePublished: dateISO,
    author: { "@type": "Organization", name: "GraceNotes Daily" },
    publisher: {
      "@type": "Organization",
      name: "GraceNotes Daily",
      logo: { "@type": "ImageObject", url: `${BASE_URL}/icons/icon-512.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleBody: devotional.body.join("\n\n"),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Library", item: `${BASE_URL}/library` },
      {
        "@type": "ListItem",
        position: 3,
        name: "Daily Devotionals",
        item: `${BASE_URL}/library/devotional`,
      },
      { "@type": "ListItem", position: 4, name: devotional.title, item: url },
    ],
  };

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: devotional.title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:type", content: "article" },
      { property: "og:image", content: ogImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: devotional.title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: ogImage },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(articleJsonLd) },
      { type: "application/ld+json", children: JSON.stringify(breadcrumbJsonLd) },
    ],
  };
}

// Small pill floating above the title card, right-aligned. Matches the
// prototype's felt hierarchy: primary CTA lives with the letter, not in nav.
function BeginPill({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className="flex justify-end mb-4">
      <Link
        to={isLoggedIn ? "/home" : "/signup"}
        className="inline-flex items-center gap-2 bg-grace text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-md hover:bg-grace-deep transition-colors"
      >
        <span>{isLoggedIn ? "Go Home" : "Begin Today"}</span>
        <Icon icon={ArrowRight} size="sm" tone="inherit" />
      </Link>
    </div>
  );
}

function TitleCard({ date, title }: { date: string; title?: string }) {
  return (
    <header className="bg-white/85 backdrop-blur-sm border border-stone-200/70 px-8 py-10 md:px-12 md:py-12 text-center rounded-t-sm">
      <p className="text-xs uppercase tracking-widest text-stone-500 mb-4 font-semibold">
        {formatLongDate(date)}
      </p>
      <h1 className="font-display text-grace text-4xl md:text-5xl leading-tight tracking-tight">
        {title || "Today's Devotional"}
      </h1>
    </header>
  );
}

function NavStrip({ onShare }: { onShare?: () => void }) {
  return (
    <nav
      className="flex justify-between items-center px-6 md:px-8 py-4 border-y border-stone-200/70 bg-white/50 backdrop-blur-sm"
      aria-label="Devotional actions"
    >
      <Link
        to="/library"
        className="flex items-center gap-2 text-stone-600 hover:text-grace transition-colors group"
        aria-label="Back to Library"
      >
        <Icon icon={Library} size="sm" tone="inherit" />
        <span className="text-sm font-semibold">Library</span>
      </Link>
      {onShare ? (
        <button
          onClick={onShare}
          className="flex items-center gap-2 text-stone-600 hover:text-grace transition-colors"
          aria-label="Share this devotional"
        >
          <span className="text-sm font-semibold">Share</span>
          <Icon icon={Share2} size="sm" tone="inherit" />
        </button>
      ) : (
        <span aria-hidden />
      )}
    </nav>
  );
}

function EnvelopeTop() {
  return (
    <div className="relative w-full h-32 md:h-40 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${ENVELOPE_TOP})` }}
        aria-hidden
      />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, oklch(0 0 0 / 0.15), #fdfcf7)",
        }}
        aria-hidden
      />
    </div>
  );
}

function EnvelopeBottom() {
  return (
    <>
      <div className="relative w-full h-40 md:h-48 overflow-hidden mt-16">
        <div
          className="absolute inset-0 bg-cover bg-bottom opacity-25"
          style={{ backgroundImage: `url(${ENVELOPE_BOTTOM})` }}
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, transparent, #fdfcf7)",
          }}
          aria-hidden
        />
      </div>
      <div className="bg-stone-100 py-6 border-t border-stone-200 text-center">
        <Link
          to="/"
          className="text-[11px] text-stone-500 font-semibold tracking-[0.25em] uppercase hover:text-grace transition-colors"
        >
          GraceNotes Daily &middot; Peace be with you
        </Link>
      </div>
    </>
  );
}

export function DevotionalView({
  devotional,
  date,
  prev,
  next,
}: {
  devotional: DevotionalResult | null;
  date: string;
  prev?: NeighbourInfo;
  next?: NeighbourInfo;
}) {
  const { session, loading } = useAuth();
  const isLoggedIn = !loading && !!session;

  function onShare() {
    if (typeof navigator === "undefined") return;
    const url = devotionalUrl(date);
    const title = devotional
      ? `${devotional.title} - GraceNotes Daily`
      : "Daily Devotional - GraceNotes Daily";
    if (typeof navigator.share === "function") {
      navigator.share({ title, url }).catch(() => {});
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(url)
        .then(() => toast.success("Link copied. Share it with someone."))
        .catch(() => {});
    }
  }

  // Empty / error state - same envelope shell so the page still feels held.
  if (!devotional) {
    return (
      <div className="min-h-screen w-full bg-[#fdfcf7] flex flex-col selection:bg-gold/30">
        <EnvelopeTop />
        <div className="max-w-3xl w-full mx-auto px-6 -mt-16 z-10 flex flex-col">
          <BeginPill isLoggedIn={isLoggedIn} />
          <TitleCard date={date} title="Today's devotional is being prepared" />
          <NavStrip />
          <div className="bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-10 md:p-14 rounded-b-sm border-x border-b border-stone-200/50 text-center">
            <Icon icon={BookOpen} size="nav" tone="inherit" className="mx-auto mb-4 text-grace/50" />
            <p className="text-stone-600 leading-relaxed mb-6 max-w-md mx-auto">
              Something interrupted the preparation of today's reading. Try refreshing in a
              moment - it should be ready shortly.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-grace/30 text-grace text-sm font-semibold hover:bg-grace/5 transition"
            >
              <Icon icon={RefreshCw} size="sm" tone="inherit" /> Try again
            </button>
          </div>
        </div>
        <EnvelopeBottom />
      </div>
    );
  }

  const d = devotional;

  return (
    <div className="min-h-screen w-full bg-[#fdfcf7] text-stone-800 flex flex-col selection:bg-gold/30">
      <EnvelopeTop />

      <div className="max-w-3xl w-full mx-auto px-6 -mt-16 z-10 flex flex-col">
        <BeginPill isLoggedIn={isLoggedIn} />

        <TitleCard date={date} title={d.title} />
        <NavStrip onShare={onShare} />

        {/* Content card */}
        <article className="bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] px-8 py-10 md:px-14 md:py-14 flex flex-col gap-8 rounded-b-sm border-x border-b border-stone-200/50">
          {/* Verse hero */}
          <blockquote className="text-center">
            <p className="font-display italic text-grace text-2xl md:text-3xl leading-relaxed">
              &ldquo;{d.verseOfDay}&rdquo;
            </p>
            <cite className="block mt-4 text-stone-500 not-italic text-xs font-bold tracking-[0.2em] uppercase">
              {d.verseRef}
            </cite>
          </blockquote>

          {/* Body */}
          <div className="space-y-6 text-lg leading-relaxed text-stone-700">
            {d.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {/* Related Scripture inset */}
          {d.related.length > 0 && (
            <aside className="bg-gold-soft/40 border-l-4 border-gold p-6 rounded-r-lg">
              <h3 className="font-display text-[color:var(--gold-foreground)] text-sm font-bold mb-3 uppercase tracking-widest">
                Related Scripture
              </h3>
              <ul className="space-y-2 text-base">
                {d.related.map((r) => (
                  <li key={r.ref} className="text-stone-700">
                    <span className="font-semibold text-grace">{r.ref}</span>
                    {r.text ? (
                      <span className="text-stone-600">
                        {" - "}
                        <span className="italic">{r.text}</span>
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </aside>
          )}

          {/* Takeaway pull-quote */}
          <div className="bg-grace-soft border-l-4 border-grace p-6 rounded-r-lg">
            <h3 className="font-display text-grace text-sm font-bold mb-2 uppercase tracking-widest">
              Heart Takeaway
            </h3>
            <p className="text-stone-800 leading-relaxed italic">{d.takeaway}</p>
          </div>

          {/* NIV notice */}
          <p className="text-[11px] text-stone-500 leading-relaxed mt-2">
            Scripture taken from the Holy Bible, New International Version&reg;, NIV&reg;
            Copyright &copy; 1973, 1978, 1984, 2011 by Biblica, Inc.&reg; Used by permission.
            All rights reserved worldwide.
          </p>
        </article>

        {/* Prev/Next thumbnails */}
        {(prev || next) && (
          <nav
            className="grid grid-cols-2 gap-px bg-stone-200 mt-6 rounded-sm overflow-hidden border border-stone-200"
            aria-label="Devotional navigation"
          >
            {prev ? (
              <Link
                to="/library/devotional/$date"
                params={{ date: prev.date }}
                className="bg-white p-6 hover:bg-stone-50 transition-colors flex flex-col gap-1 text-left group"
                aria-label={`Previous devotional: ${prev.title}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 group-hover:text-grace transition-colors">
                  Previous
                </span>
                <span className="font-display text-grace text-lg leading-snug">
                  {prev.title}
                </span>
                <span className="text-xs text-stone-500 mt-1">
                  {formatShortDate(prev.date)}
                </span>
              </Link>
            ) : (
              <span className="bg-white p-6" aria-hidden />
            )}
            {next ? (
              <Link
                to="/library/devotional/$date"
                params={{ date: next.date }}
                className="bg-white p-6 hover:bg-stone-50 transition-colors flex flex-col gap-1 text-right group"
                aria-label={`Next devotional: ${next.title}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 group-hover:text-grace transition-colors">
                  Next
                </span>
                <span className="font-display text-grace text-lg leading-snug">
                  {next.title}
                </span>
                <span className="text-xs text-stone-500 mt-1">
                  {formatShortDate(next.date)}
                </span>
              </Link>
            ) : (
              <span className="bg-white p-6" aria-hidden />
            )}
          </nav>
        )}

        {/* Closing CTA block */}
        <section className="mt-12 py-12 flex flex-col items-center text-center gap-6">
          <DoveMark variant="medallion" className="w-16 h-16" alt="GraceNotes Daily" />
          <div>
            <h2 className="font-display text-grace text-2xl md:text-3xl mb-2">
              {isLoggedIn
                ? "Keep walking with GraceNotes"
                : "Walk deeper with GraceNotes"}
            </h2>
            <p className="text-stone-600 max-w-sm mx-auto leading-relaxed">
              {isLoggedIn
                ? "Return to your home to continue today's rhythm."
                : "Receive a quiet reading like this every morning."}
            </p>
          </div>
          <Link
            to={isLoggedIn ? "/home" : "/signup"}
            className="inline-flex items-center gap-2 bg-gold text-grace px-8 py-3 rounded-full font-bold shadow-sm hover:brightness-95 active:scale-95 transition-all"
          >
            {isLoggedIn ? "Go Home" : "Begin Today"}
            <Icon icon={ArrowRight} size="sm" tone="inherit" />
          </Link>
        </section>
      </div>

      <EnvelopeBottom />
    </div>
  );
}
