import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Share2,
  RefreshCw,
  Library,
} from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { DoveMark } from "@/components/dove-mark";
import { NatureBackground } from "@/components/nature-background";
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

// Shared head builder so the dated route and the index (today) route stay in sync.
export function devotionalHead(devotional?: DevotionalResult, dateISO?: string) {
  if (!devotional || !dateISO) {
    return { meta: [{ title: "Daily Devotional | GraceNotes Daily" }] };
  }
  const url = devotionalUrl(dateISO);
  const ogImage = `${BASE_URL}/og/daily-devotional.png`;
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

// Reusable top bar and masthead so the empty/error state matches.
function TopBar({ isLoggedIn, onShare }: { isLoggedIn: boolean; onShare?: () => void }) {
  return (
    <nav className="glass-parchment rounded-full w-full max-w-3xl mx-auto flex items-center justify-between mb-8 md:mb-12 shadow-md px-4 sm:px-6 py-2.5">
      <Link
        to="/library"
        className="flex items-center gap-2 text-grace font-semibold hover:opacity-70 transition-opacity"
        aria-label="Back to Library"
      >
        <Icon icon={Library} size="sm" tone="inherit" />
        <span>Library</span>
      </Link>
      <div className="flex items-center gap-4 sm:gap-6">
        {onShare && (
          <button
            onClick={onShare}
            className="text-grace hover:text-gold transition-colors"
            aria-label="Share this devotional"
          >
            <Icon icon={Share2} size="md" tone="inherit" />
          </button>
        )}
        {isLoggedIn ? (
          <Link
            to="/home"
            className="bg-grace text-white px-5 py-1.5 rounded-full text-sm font-semibold shadow-sm hover:bg-grace-deep transition-all"
          >
            Go Home
          </Link>
        ) : (
          <Link
            to="/signup"
            className="bg-grace text-white px-5 py-1.5 rounded-full text-sm font-semibold shadow-sm hover:bg-grace-deep transition-all"
          >
            Begin Today
          </Link>
        )}
      </div>
    </nav>
  );
}

function Masthead({ date }: { date: string }) {
  return (
    <header className="w-full max-w-3xl mx-auto text-center mb-10 md:mb-12">
      <div className="glass-parchment rounded-sm shadow-xl px-6 py-8 md:px-10 md:py-10 inline-block">
        <p className="uppercase tracking-[0.2em] text-grace/60 text-xs font-bold mb-3">
          {formatLongDate(date)}
        </p>
        <h1 className="font-display text-grace text-5xl md:text-6xl font-bold tracking-tight mb-2">
          GraceNotes Daily
        </h1>
        <div className="flex items-center justify-center gap-4">
          <div className="h-px w-8 bg-gold"></div>
          <p className="font-display italic text-grace/80 text-lg">Daily Devotional</p>
          <div className="h-px w-8 bg-gold"></div>
        </div>
      </div>
    </header>
  );
}

// Faint parchment texture as an inline SVG data URI (no external network dep).
const PAPER_TEXTURE_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.16  0 0 0 0 0.36  0 0 0 0 0.21  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>`,
  );

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

  if (!devotional) {
    return (
      <>
        <NatureBackground />
        <div className="min-h-screen w-full selection:bg-gold/30 py-8 md:py-12 px-4">
          <TopBar isLoggedIn={isLoggedIn} />
          <Masthead date={date} />
          <main className="w-full max-w-3xl mx-auto glass-parchment rounded-sm p-8 md:p-16 text-center shadow-2xl">
            <Icon icon={BookOpen} size="md" tone="inherit" className="mx-auto mb-4 text-grace/50" />
            <h2 className="font-display text-2xl text-grace mb-3">
              Today's devotional is being prepared
            </h2>
            <p className="text-foreground/70 text-sm leading-relaxed mb-6 max-w-md mx-auto">
              Something interrupted the preparation of today's reading. Try refreshing in a
              moment - it should be ready shortly.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-grace/30 text-grace text-sm font-semibold hover:bg-grace/5 transition"
            >
              <Icon icon={RefreshCw} size="sm" tone="inherit" /> Try again
            </button>
          </main>
        </div>
      </>
    );
  }

  const d = devotional;
  const bodyLast = d.body.length - 1;

  return (
    <>
      <NatureBackground />
      <div className="min-h-screen w-full selection:bg-gold/30 py-8 md:py-12 px-4">
        <TopBar isLoggedIn={isLoggedIn} onShare={onShare} />
        <Masthead date={date} />

        {/* Reader Area */}
        <main className="w-full max-w-3xl mx-auto glass-parchment border border-gold/20 shadow-2xl rounded-sm overflow-hidden relative">
          {/* Faint parchment texture overlay */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: `url("${PAPER_TEXTURE_URL}")` }}
        />

        <div className="relative p-8 md:p-16">
          {/* Verse hero */}
          <section className="mb-12 text-center border-b border-gold/30 pb-10 md:pb-12">
            <blockquote className="font-display italic text-grace text-2xl md:text-3xl leading-relaxed mb-6">
              &ldquo;{d.verseOfDay}&rdquo;
            </blockquote>
            <cite className="text-xs uppercase tracking-widest text-gold-foreground font-bold not-italic">
              {d.verseRef}
            </cite>
          </section>

          {/* Devotional title (semantic h2 under the page h1 "GraceNotes Daily") */}
          <h2 className="font-display text-3xl md:text-4xl text-grace mb-8 leading-tight text-center">
            {d.title}
          </h2>

          {/* Body with related scripture inserted mid-flow */}
          <article className="text-grace/90 leading-relaxed max-w-none text-lg space-y-6">
            {d.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}

            {d.related.length > 0 && (
              <div className="bg-gold-soft/40 border-l-2 border-gold p-6 my-10 rounded-sm">
                <h3 className="text-xs uppercase tracking-widest font-bold mb-4 text-gold-foreground">
                  Related Scripture
                </h3>
                <ul className="space-y-3 text-base">
                  {d.related.map((r) => (
                    <li key={r.ref}>
                      <span className="font-semibold text-grace">{r.ref}</span>
                      {r.text ? (
                        <span className="text-foreground/75">
                          {" "}
                          - <span className="italic">{r.text}</span>
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Takeaway pull quote */}
            <div className="bg-grace-soft border-l-2 border-grace p-6 my-10 rounded-sm italic text-foreground/85">
              {d.takeaway}
            </div>

            {/* Ensure the last paragraph closes the flow visually. If body has
                more than one paragraph, the last has already rendered above. */}
            {bodyLast < 0 && null}
          </article>

          {/* Closing */}
          <footer className="mt-16 pt-12 border-t border-gold/20 text-center">
            <div className="mb-6 flex justify-center">
              <DoveMark variant="medallion" className="w-14 h-14" alt="GraceNotes Daily" />
            </div>
            <h4 className="font-display text-grace text-xl font-bold mb-2">
              {isLoggedIn ? "Keep walking with GraceNotes" : "Walk deeper with GraceNotes"}
            </h4>
            <p className="text-grace/70 text-sm max-w-sm mx-auto mb-8">
              {isLoggedIn
                ? "Return to your home to continue today's rhythm."
                : "Receive a quiet reading like this every morning."}
            </p>
            {isLoggedIn ? (
              <Link
                to="/home"
                className="inline-block border-2 border-grace text-grace px-8 py-2 rounded-full font-bold hover:bg-grace hover:text-white transition-all"
              >
                Go Home
              </Link>
            ) : (
              <Link
                to="/signup"
                className="inline-block border-2 border-grace text-grace px-8 py-2 rounded-full font-bold hover:bg-grace hover:text-white transition-all"
              >
                Begin Today
              </Link>
            )}
          </footer>

          <p className="text-[11px] text-foreground/45 mt-10 text-center">
            Scripture quotations are from the Holy Bible, New International Version (NIV).
          </p>
        </div>
      </main>

      {/* Prev / Next cards */}
      {(prev || next) && (
        <nav
          className="w-full max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 mt-8"
          aria-label="Devotional navigation"
        >
          {prev ? (
            <Link
              to="/library/devotional/$date"
              params={{ date: prev.date }}
              className="group p-6 bg-white/60 border border-transparent hover:border-gold transition-all rounded-sm flex flex-col items-start"
              aria-label="Previous devotional"
            >
              <span className="text-[10px] uppercase tracking-widest text-grace/50 font-bold mb-1">
                Previous
              </span>
              <span className="font-display text-grace font-bold text-lg group-hover:text-gold-foreground transition-colors leading-snug">
                {prev.title}
              </span>
              <span className="text-xs text-grace/60 mt-1">{formatShortDate(prev.date)}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              to="/library/devotional/$date"
              params={{ date: next.date }}
              className="group p-6 bg-white/60 border border-transparent hover:border-gold transition-all rounded-sm flex flex-col items-end text-right md:col-start-2"
              aria-label="Next devotional"
            >
              <span className="text-[10px] uppercase tracking-widest text-grace/50 font-bold mb-1">
                Next
              </span>
              <span className="font-display text-grace font-bold text-lg group-hover:text-gold-foreground transition-colors leading-snug">
                {next.title}
              </span>
              <span className="text-xs text-grace/60 mt-1">{formatShortDate(next.date)}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      <p className="text-center text-xs text-foreground/45 mt-8">
        <Link to="/" className="hover:text-grace">
          GraceNotes Daily
        </Link>
      </p>
      </div>
    </>
  );
}
