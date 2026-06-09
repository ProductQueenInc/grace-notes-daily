import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArticleShell } from "@/components/article-shell";
import { getArticle, BASE_URL, DEFAULT_AUTHOR, SERIES } from "@/lib/library";

export const Route = createFileRoute("/library/$slug")({
  loader: ({ params }) => {
    if (!getArticle(params.slug)) throw notFound();
    return null;
  },
  head: ({ params }) => {
    const article = getArticle(params.slug);
    if (!article) {
      return {
        meta: [{ title: "Not found — GraceNotes Daily" }],
      };
    }
    const url = `${BASE_URL}/library/${article.slug}`;
    const coverAbs = `${BASE_URL}${article.cover}`;
    const author = article.author ?? DEFAULT_AUTHOR;
    const series = article.series ? SERIES[article.series.slug] : null;

    const articleJsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.description,
      image: [coverAbs],
      datePublished: article.publishedAt,
      author: { "@type": "Organization", name: author },
      publisher: {
        "@type": "Organization",
        name: "GraceNotes Daily",
        logo: {
          "@type": "ImageObject",
          url: `${BASE_URL}/icons/icon-512.png`,
        },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      ...(article.tags.length ? { keywords: article.tags.join(", ") } : {}),
      ...(series ? { isPartOf: { "@type": "CreativeWorkSeries", name: series.title } } : {}),
    };

    const breadcrumbJsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: "Notes & Letters",
          item: `${BASE_URL}/library`,
        },
        { "@type": "ListItem", position: 3, name: article.title, item: url },
      ],
    };

    const faqJsonLd =
      article.faqs && article.faqs.length > 0
        ? {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: article.faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }
        : null;

    return {
      meta: [
        { title: `${article.title} | GraceNotes Daily` },
        { name: "description", content: article.description },
        { property: "og:title", content: article.title },
        { property: "og:description", content: article.description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { property: "og:image", content: coverAbs },
        { property: "article:published_time", content: article.publishedAt },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: article.title },
        { name: "twitter:description", content: article.description },
        { name: "twitter:image", content: coverAbs },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(articleJsonLd) },
        { type: "application/ld+json", children: JSON.stringify(breadcrumbJsonLd) },
        ...(faqJsonLd
          ? [{ type: "application/ld+json", children: JSON.stringify(faqJsonLd) }]
          : []),
      ],
    };
  },
  component: ArticleRoute,
});

function ArticleRoute() {
  const { slug } = Route.useParams();
  const article = getArticle(slug);
  if (!article) return null;
  return <ArticleShell article={article} />;
}
