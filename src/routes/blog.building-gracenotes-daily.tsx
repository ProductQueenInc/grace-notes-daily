import { createFileRoute, Link } from "@tanstack/react-router";
import { marked } from "marked";
import { useMemo } from "react";
import essayMd from "@/content/blog/building-gracenotes-daily.md?raw";
import { DoveMark } from "@/components/dove-mark";

const BASE_URL = "https://www.gracenotesdaily.com";
const PATH = "/blog/building-gracenotes-daily";
const URL = `${BASE_URL}${PATH}`;

const TITLE =
  "How I built GraceNotes Daily. The honest, founder to founder version.";
const SHARE_TITLE = "How I built GraceNotes Daily";
const DESCRIPTION =
  "A field note from inside the build. What I let the model do, what I refused to outsource, and the calls that shaped the product more than any prompt did.";
const PUBLISHED = "2026-06-29";
const IMAGE = `${BASE_URL}/icons/icon-512.png`;

// Eyebrow labels for each H2, in document order.
const EYEBROWS: Record<string, string> = {
  "tl-dr": "Start here",
  "the-product-thesis": "Why this product",
  "the-stack-at-a-glance": "The stack",
  "lovable-and-claude-code-the-actual-dance": "Workflow",
  "the-mistakes-that-cost-me-the-most": "What went wrong",
  "the-two-supabase-nightmare-in-more-detail": "Deep dive",
  "product-calls-i-refused-to-hand-to-the-model": "Taste and conviction",
  "where-lovable-shined-and-where-i-stepped-in": "Tool fit",
  "how-i-think-about-seo-for-this-product": "SEO",
  "the-claude-md-rule": "Reliability",
  "where-this-is-going": "Roadmap",
  "when-the-content-is-mostly-ai-generated": "AI surface",
  "security-posture": "Security",
  "what-i-would-do-differently-next-monday": "Do over",
  "closing": "Closing",
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

interface Section {
  id: string;
  title: string;
  eyebrow: string;
  html: string;
}

function parseSections(md: string): { intro: string; sections: Section[] } {
  // Split on H2 boundaries while keeping headings.
  const lines = md.split("\n");
  const blocks: { heading: string | null; body: string[] }[] = [
    { heading: null, body: [] },
  ];
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      blocks.push({ heading: m[1], body: [] });
    } else {
      blocks[blocks.length - 1].body.push(line);
    }
  }

  // First H1 line: skip from intro (we render the title in the hero).
  const introBody = blocks[0].body
    .filter((l) => !/^#\s+/.test(l))
    .join("\n")
    .trim();
  const intro = marked.parse(introBody) as string;

  const sections: Section[] = blocks.slice(1).map((b) => {
    const title = b.heading ?? "";
    const id = slugify(title);
    const eyebrow = EYEBROWS[id] ?? "Section";
    const html = marked.parse(b.body.join("\n")) as string;
    return { id, title, eyebrow, html };
  });

  return { intro, sections };
}

marked.setOptions({ gfm: true, breaks: false });

export const Route = createFileRoute("/blog/building-gracenotes-daily")({
  head: () => {
    const articleJsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: SHARE_TITLE,
      description: DESCRIPTION,
      image: [IMAGE],
      datePublished: PUBLISHED,
      dateModified: PUBLISHED,
      author: {
        "@type": "Person",
        name: "Cindy",
        url: "https://product-queen.com",
      },
      publisher: {
        "@type": "Organization",
        name: "GraceNotes Daily",
        logo: { "@type": "ImageObject", url: `${BASE_URL}/icons/icon-512.png` },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": URL },
    };
    const breadcrumbJsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Build guide", item: URL },
      ],
    };
    return {
      meta: [
        { title: `${SHARE_TITLE} | GraceNotes Daily` },
        { name: "description", content: DESCRIPTION },
        { property: "og:title", content: SHARE_TITLE },
        { property: "og:description", content: DESCRIPTION },
        { property: "og:url", content: URL },
        { property: "og:type", content: "article" },
        { property: "og:image", content: IMAGE },
        { property: "article:published_time", content: PUBLISHED },
        { property: "article:author", content: "Cindy" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: SHARE_TITLE },
        { name: "twitter:description", content: DESCRIPTION },
        { name: "twitter:image", content: IMAGE },
      ],
      links: [{ rel: "canonical", href: URL }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(articleJsonLd) },
        { type: "application/ld+json", children: JSON.stringify(breadcrumbJsonLd) },
      ],
    };
  },
  component: BuildGuide,
});

function BuildGuide() {
  const { intro, sections } = useMemo(() => parseSections(essayMd), []);

  return (
    <div className="min-h-screen bg-[#0a1a12] text-[#e8efe7]">
      {/* Top bar */}
      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            to="/"
            className="flex items-center gap-2 text-white hover:text-[var(--gold,#debe36)]"
          >
            <DoveMark variant="medallion" className="w-7 h-7" />
            <span className="font-display text-base tracking-tight">GraceNotes Daily</span>
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-[var(--gold,#debe36)] px-4 py-1.5 text-sm font-semibold text-[#0a1a12] hover:opacity-90"
          >
            Try the app
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(40,92,55,0.55)_0%,rgba(10,26,18,0)_60%)]"
        />
        <div className="relative mx-auto max-w-3xl px-6 pt-20 pb-16 text-center sm:pt-28 sm:pb-24">
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--gold,#debe36)]">
            Build guide
          </p>
          <h1 className="font-display text-4xl leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl">
            How I built GraceNotes Daily.
            <br />
            <span className="bg-gradient-to-r from-[#7ad29a] via-[#a8e0b8] to-[#debe36] bg-clip-text text-transparent">
              The honest, founder to founder version.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            The workflow, the stack at a glance, the mistakes that cost the
            most, and the product calls I refused to hand to the model. No
            screenshots of secrets. No copy-paste prompts. Just the choices that
            mattered.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <a
              href="#tl-dr"
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white/85 hover:bg-white/5"
            >
              Start here
            </a>
            <Link
              to="/"
              className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white hover:bg-white/15"
            >
              See the app
            </Link>
          </div>
          <p className="mt-6 text-xs text-white/40">
            By Cindy. Published {new Date(PUBLISHED).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}.
          </p>
        </div>
      </section>

      {/* Body: TOC + content */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gold,#debe36)]">
                On this page
              </p>
              <nav className="flex flex-col gap-2.5 text-sm">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="text-white/60 transition-colors hover:text-white"
                  >
                    {s.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <article>
            {intro && (
              <div
                className="essay-prose mb-12 text-white/75"
                dangerouslySetInnerHTML={{ __html: intro }}
              />
            )}

            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24 pt-10">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--gold,#debe36)]">
                  {s.eyebrow}
                </p>
                <h2 className="font-display text-3xl leading-tight tracking-tight text-white sm:text-[2rem]">
                  {s.title}
                </h2>
                <div
                  className="essay-prose mt-5 text-white/75"
                  dangerouslySetInnerHTML={{ __html: s.html }}
                />
              </section>
            ))}

            <div className="mt-16 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gold,#debe36)]">
                Try it
              </p>
              <h3 className="mt-2 font-display text-2xl text-white">
                See the product this guide is about.
              </h3>
              <p className="mt-2 text-white/65">
                A quiet daily companion. Two minutes a morning.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/signup"
                  className="rounded-full bg-[var(--gold,#debe36)] px-5 py-2 text-sm font-semibold text-[#0a1a12] hover:opacity-90"
                >
                  Open GraceNotes Daily
                </Link>
                <Link
                  to="/devotional"
                  className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white hover:bg-white/5"
                >
                  Read today's devotional
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-xs text-white/40">
        © {new Date().getFullYear()} GraceNotes Daily ·{" "}
        <Link to="/" className="hover:text-white/70">
          gracenotesdaily.com
        </Link>
      </footer>

      <style>{`
        .essay-prose { font-family: 'Nunito', system-ui, sans-serif; line-height: 1.75; font-size: 1.0625rem; }
        .essay-prose p { margin: 0 0 1.15rem; }
        .essay-prose strong { color: #ffffff; font-weight: 700; }
        .essay-prose em { font-style: italic; color: #c9d6c9; }
        .essay-prose a { color: #a8e0b8; text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px; }
        .essay-prose a:hover { color: var(--gold,#debe36); }
        .essay-prose code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: rgba(255,255,255,0.07); color: #d8e8d8; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
        .essay-prose ul, .essay-prose ol { margin: 0 0 1.15rem 1.35rem; }
        .essay-prose li { margin-bottom: 0.45rem; }
        .essay-prose blockquote { border-left: 2px solid var(--gold,#debe36); padding-left: 1rem; margin: 1rem 0; color: #b8c4b8; font-style: italic; }
      `}</style>
    </div>
  );
}
