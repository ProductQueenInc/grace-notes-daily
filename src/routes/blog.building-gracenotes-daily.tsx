import { createFileRoute, Link } from "@tanstack/react-router";
import { marked } from "marked";
import essayMd from "@/content/blog/building-gracenotes-daily.md?raw";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { ShareBar } from "@/components/share-bar";

const BASE_URL = "https://www.gracenotesdaily.com";
const PATH = "/blog/building-gracenotes-daily";
const URL = `${BASE_URL}${PATH}`;

const TITLE =
  "Building GraceNotes Daily: A PM's Field Guide to Shipping with Lovable, Claude, and AI";
const DESCRIPTION =
  "An honest, detailed how-to for founders and PMs building real AI products with Lovable, Claude Code, and Supabase. Mistakes, security, prompts, and the decisions you cannot outsource.";
const PUBLISHED = "2026-06-29";
const IMAGE = `${BASE_URL}/icons/icon-512.png`;

marked.setOptions({ gfm: true, breaks: false });
const html = marked.parse(essayMd) as string;

export const Route = createFileRoute("/blog/building-gracenotes-daily")({
  head: () => {
    const articleJsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: TITLE,
      description: DESCRIPTION,
      image: [IMAGE],
      datePublished: PUBLISHED,
      dateModified: PUBLISHED,
      author: { "@type": "Person", name: "Cindy", url: "https://product-queen.com" },
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
        { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog/building-gracenotes-daily` },
      ],
    };
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESCRIPTION },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESCRIPTION },
        { property: "og:url", content: URL },
        { property: "og:type", content: "article" },
        { property: "og:image", content: IMAGE },
        { property: "article:published_time", content: PUBLISHED },
        { property: "article:author", content: "Cindy" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: TITLE },
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
  component: BlogPost,
});

function BlogPost() {
  return (
    <div className="relative min-h-screen">
      <NatureBackground />
      <div className="relative z-10">
        <header className="px-6 pt-8 pb-4 max-w-3xl mx-auto">
          <Link to="/" className="text-sm text-[var(--grace)] hover:underline">
            ← GraceNotes Daily
          </Link>
        </header>
        <article className="glass-parchment mx-auto my-6 max-w-3xl rounded-2xl px-6 py-10 sm:px-10 sm:py-14">
          <div
            className="prose-essay"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <div className="mt-10 pt-6 border-t border-black/10">
            <ShareBar title={TITLE} url={URL} />
          </div>
        </article>
        <SiteFooter />
      </div>
      <style>{`
        .prose-essay { color: #2a2a28; font-family: 'Nunito', system-ui, sans-serif; line-height: 1.7; font-size: 1.05rem; }
        .prose-essay h1 { font-family: 'Fraunces', Georgia, serif; font-size: 2.1rem; line-height: 1.2; margin: 0 0 0.5rem; color: var(--grace-deep, #1d4327); font-weight: 600; }
        .prose-essay h2 { font-family: 'Fraunces', Georgia, serif; font-size: 1.5rem; line-height: 1.25; margin: 2.25rem 0 0.75rem; color: var(--grace-deep, #1d4327); font-weight: 600; }
        .prose-essay h3 { font-family: 'Fraunces', Georgia, serif; font-size: 1.2rem; margin: 1.5rem 0 0.5rem; color: var(--grace-deep, #1d4327); font-weight: 600; }
        .prose-essay p { margin: 0 0 1rem; }
        .prose-essay ul, .prose-essay ol { margin: 0 0 1rem 1.25rem; padding: 0; }
        .prose-essay li { margin-bottom: 0.4rem; }
        .prose-essay a { color: var(--grace, #285c37); text-decoration: underline; text-underline-offset: 2px; }
        .prose-essay strong { font-weight: 700; color: #1a1a18; }
        .prose-essay em { font-style: italic; }
        .prose-essay hr { border: 0; border-top: 1px solid rgba(0,0,0,0.12); margin: 2rem 0; }
        .prose-essay code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: rgba(0,0,0,0.06); padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.92em; }
        .prose-essay table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.95rem; }
        .prose-essay th, .prose-essay td { border: 1px solid rgba(0,0,0,0.12); padding: 0.5rem 0.7rem; text-align: left; vertical-align: top; }
        .prose-essay th { background: rgba(40,92,55,0.08); font-weight: 600; }
        .prose-essay blockquote { border-left: 3px solid var(--gold, #debe36); padding-left: 1rem; margin: 1rem 0; color: #4a4a45; font-style: italic; }
      `}</style>
    </div>
  );
}
