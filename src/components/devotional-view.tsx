import { Link } from "@tanstack/react-router";
import { BookOpen, Share2, ArrowRight, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { BASE_URL } from "@/lib/library";
import type { DevotionalResult } from "@/lib/ai.functions";

function devotionalUrl(dateISO: string) {
  return `${BASE_URL}/devotional/${dateISO}`;
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
      { "@type": "ListItem", position: 2, name: "Daily Devotional", item: `${BASE_URL}/devotional` },
      { "@type": "ListItem", position: 3, name: devotional.title, item: url },
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

export function DevotionalView({
  devotional,
  date,
}: {
  devotional: DevotionalResult | null;
  date: string;
}) {
  if (!devotional) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center"
        style={{
          background:
            "radial-gradient(1100px 560px at 50% -8%, var(--grace-haze, #e7efe9), transparent), #f7f4ee",
        }}
      >
        <div className="max-w-md mx-auto px-5 py-16 text-center">
          <Link to="/" className="font-display text-xl text-grace block mb-12">
            GraceNotes Daily
          </Link>
          <div className="glass-parchment rounded-3xl p-8 shadow-sm">
            <Icon icon={BookOpen} size="md" tone="hue" className="mx-auto mb-4 opacity-50" />
            <h1 className="font-display text-2xl text-grace mb-3">
              Today's devotional is being prepared
            </h1>
            <p className="text-foreground/70 text-sm leading-relaxed mb-6">
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
          <p className="text-xs text-foreground/45 mt-8">
            <Link to="/" className="hover:text-grace">
              GraceNotes Daily
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // narrowed: null case is handled by early return above
  const d = devotional as DevotionalResult;

  function onShare() {
    if (typeof navigator === "undefined") return;
    const url = devotionalUrl(date);
    const title = `${d.title} - GraceNotes Daily`;
    if (typeof navigator.share === "function") {
      navigator.share({ title, text: d.verseRef, url }).catch(() => {});
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(url)
        .then(() => toast.success("Link copied. Share it with someone."))
        .catch(() => {});
    }
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          "radial-gradient(1100px 560px at 50% -8%, var(--grace-haze, #e7efe9), transparent), #f7f4ee",
      }}
    >
      <div className="max-w-2xl mx-auto px-5 py-8 md:py-14">
        {/* Wordmark */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="font-display text-xl text-grace">
            GraceNotes Daily
          </Link>
          <button
            onClick={onShare}
            className="inline-flex items-center gap-1.5 text-sm text-grace/80 hover:text-grace px-3 py-1.5 rounded-full border border-grace/20 bg-white/70 transition"
            aria-label="Share this devotional"
          >
            <Icon icon={Share2} size="sm" tone="inherit" /> Share
          </button>
        </div>

        {/* Reading card */}
        <article className="glass-parchment rounded-3xl p-6 md:p-10 shadow-sm">
          <div className="flex items-center gap-2 text-grace/70 text-[11px] uppercase tracking-[0.2em] mb-5">
            <Icon icon={BookOpen} size="sm" tone="inherit" /> Daily Devotional
            <span aria-hidden>·</span>
            <span>{d.date}</span>
          </div>

          <div className="border-l-4 border-gold rounded-r-2xl pl-5 py-3 mb-6">
            <p className="font-display italic text-xl md:text-2xl text-grace leading-snug mb-2">
              {d.verseOfDay}
            </p>
            <p className="text-grace/80 text-sm font-semibold tracking-wide">{d.verseRef}</p>
          </div>

          <h1 className="font-display text-3xl md:text-4xl text-grace mb-6 leading-tight">
            {d.title}
          </h1>

          <div className="space-y-4 text-foreground/85 leading-relaxed max-w-[64ch]">
            {d.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {d.related.length > 0 && (
            <div className="mt-8 rounded-2xl bg-gold-soft/60 border-l-4 border-gold p-5">
              <div className="flex items-center gap-2 text-gold-foreground font-semibold mb-3">
                <Icon icon={BookOpen} size="sm" tone="inherit" /> Related Scripture
              </div>
              <div className="space-y-3 text-sm">
                {d.related.map((r) => (
                  <div key={r.ref}>
                    <span className="font-semibold text-gold-foreground">{r.ref}:</span>{" "}
                    <span className="text-foreground/75">{r.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 rounded-2xl bg-grace-soft border-l-4 border-grace p-5 italic text-foreground/85">
            {d.takeaway}
          </div>

          <p className="text-[11px] text-foreground/45 mt-6">
            Scripture quotations are from the Holy Bible, New International Version (NIV).
          </p>
        </article>

        {/* Soft CTA */}
        <div className="mt-7 rounded-3xl bg-grace text-white p-6 md:p-8 text-center shadow-sm">
          <div className="flex items-center justify-center gap-1.5 text-gold text-xs uppercase tracking-[0.2em] mb-2">
            <Icon icon={Sparkles} size="sm" tone="inherit" /> A quiet moment, every day
          </div>
          <h2 className="font-display text-2xl md:text-3xl mb-2">Start your own daily grace</h2>
          <p className="text-white/80 text-sm max-w-md mx-auto mb-5">
            A short devotional and a grace note, written to meet you where you are. Free to begin.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-gold text-gold-foreground font-semibold hover:scale-[1.02] transition"
          >
            Begin <Icon icon={ArrowRight} size="sm" tone="inherit" />
          </Link>
        </div>

        <p className="text-center text-xs text-foreground/45 mt-6">
          <Link to="/" className="hover:text-grace">
            GraceNotes Daily
          </Link>
        </p>
      </div>
    </div>
  );
}
