import { Link } from "@tanstack/react-router";
import type { LibraryArticle } from "@/lib/library";
import { SERIES } from "@/lib/library";

interface ArticleCardProps {
  article: LibraryArticle;
}

export function ArticleCard({ article }: ArticleCardProps) {
  const seriesTitle = article.series ? SERIES[article.series.slug]?.title : null;

  return (
    <Link
      to="/library/$slug"
      params={{ slug: article.slug }}
      className="group glass-parchment rounded-3xl overflow-hidden flex flex-col transition hover:scale-[1.01] hover:shadow-lg"
    >
      <div className="aspect-[16/10] overflow-hidden bg-grace-haze">
        <img
          src={article.cover}
          alt=""
          loading="lazy"
          width={1600}
          height={1000}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </div>
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3 text-xs">
          {seriesTitle && (
            <span className="text-gold uppercase tracking-widest font-semibold">
              {seriesTitle}
              {article.series?.order ? ` · Part ${article.series.order}` : ""}
            </span>
          )}
          {seriesTitle && article.tags[0] && <span className="text-foreground/40">·</span>}
          {article.tags[0] && (
            <span className="text-foreground/60">{article.tags[0]}</span>
          )}
        </div>
        <h3 className="font-display text-2xl text-grace leading-tight mb-2 group-hover:text-grace-deep transition">
          {article.title}
        </h3>
        <p className="text-foreground/70 text-sm leading-relaxed flex-1">{article.excerpt}</p>
        <p className="mt-4 text-foreground/50 text-xs">
          {article.readMinutes} min read
        </p>
      </div>
    </Link>
  );
}
