import { Link } from "@tanstack/react-router";
import type { LibraryArticle } from "@/lib/library";

interface ArticleCardCompactProps {
  article: LibraryArticle;
}

/**
 * Compact, title-only card used inside horizontal swipe rows on mobile
 * and inside the Foundations row on desktop. No excerpt, no min-read on
 * the card face — the goal is a small, scannable tile (Calm-style).
 */
export function ArticleCardCompact({ article }: ArticleCardCompactProps) {
  return (
    <Link
      to="/library/$slug"
      params={{ slug: article.slug }}
      className="group glass-parchment rounded-2xl overflow-hidden flex flex-col transition hover:shadow-lg w-full h-full"
    >
      <div className="aspect-[4/3] overflow-hidden bg-grace-haze">
        <img
          src={article.cover}
          alt=""
          loading="lazy"
          width={800}
          height={600}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </div>
      <div className="p-3.5 flex flex-col gap-1.5">
        {article.tags[0] && (
          <span className="text-foreground/55 text-[10px] uppercase tracking-widest font-semibold">
            {article.tags[0]}
          </span>
        )}
        <h3 className="font-display text-[1.05rem] leading-tight text-grace line-clamp-2 group-hover:text-grace-deep transition">
          {article.title}
        </h3>
        <p className="text-foreground/50 text-[11px] mt-0.5">
          {article.readMinutes} min read
        </p>
      </div>
    </Link>
  );
}

/**
 * "See all" tile placed at the end of a swipe row. Links back to /library
 * with the given tag pre-selected (or no tag for "All letters").
 */
export function SeeAllTile({
  tag,
  label,
}: {
  tag?: string;
  label: string;
}) {
  return (
    <Link
      to="/library"
      search={tag ? { tag } : {}}
      className="glass-parchment rounded-2xl flex flex-col items-center justify-center text-center p-6 w-full h-full transition hover:shadow-lg hover:bg-grace/5"
    >
      <span className="font-display text-grace text-lg leading-tight">
        See all
      </span>
      <span className="text-foreground/55 text-xs mt-1">{label}</span>
      <span className="mt-3 inline-flex items-center justify-center w-9 h-9 rounded-full bg-gold/20 text-grace text-lg">
        →
      </span>
    </Link>
  );
}
