import { marked } from "marked";
import type { LibraryArticle, LibraryTag } from "@/lib/library";

// Raw markdown files imported at build time (Vite glob).
const rawFiles = import.meta.glob("./*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

interface Frontmatter {
  title: string;
  description: string;
  date: string;
  author: string;
  slug: string;
  podcast_url?: string;
  podcast_episode?: string;
  reading_time?: string;
  tags: string[];
}

function parseFrontmatter(raw: string): { front: Frontmatter; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error("Missing frontmatter");
  const [, yaml, body] = match;

  const front: Record<string, unknown> = {};
  const lines = yaml.split(/\r?\n/);
  let currentListKey: string | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    const listItem = line.match(/^\s+-\s+(.*)$/);
    if (listItem && currentListKey) {
      (front[currentListKey] as string[]).push(stripQuotes(listItem[1].trim()));
      continue;
    }
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawVal] = kv;
    const val = rawVal.trim();
    if (val === "") {
      front[key] = [];
      currentListKey = key;
    } else {
      front[key] = stripQuotes(val);
      currentListKey = null;
    }
  }

  return { front: front as unknown as Frontmatter, body };
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// Curated cover + tag mapping per article. Covers use vetted nature photos
// (same imagery policy as nature-background.tsx).
const META: Record<string, { tags: LibraryTag[]; cover: string }> = {
  "and-then-there-were-three": {
    tags: ["Family", "Seasons"],
    cover:
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1600&q=70&auto=format&fit=crop",
  },
  "i-still-believe-i-just-dont-believe-that-anymore": {
    tags: ["Doubt", "Seasons"],
    cover:
      "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1600&q=70&auto=format&fit=crop",
  },
  "losing-your-job-as-a-christian": {
    tags: ["Work", "Identity"],
    cover:
      "https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=1600&q=70&auto=format&fit=crop",
  },
  "still-single-what-the-church-gets-wrong": {
    tags: ["Singleness", "Waiting"],
    cover:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&q=70&auto=format&fit=crop",
  },
  "what-do-you-do-when-you-dont-recognise-your-life": {
    tags: ["Identity", "Seasons"],
    cover:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=70&auto=format&fit=crop",
  },
  "when-grief-breaks-your-theology": {
    tags: ["Grief", "Seasons"],
    cover:
      "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1600&q=70&auto=format&fit=crop",
  },
  "when-the-answer-finally-comes": {
    tags: ["Seasons", "Identity"],
    cover:
      "https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=1600&q=70&auto=format&fit=crop",
  },
};

marked.setOptions({ gfm: true, breaks: false });

function bodyToHtml(body: string): string {
  // Strip the leading H1 + byline + first --- (the page already renders title/author in the hero).
  const cleaned = body
    .replace(/^\s*#\s+.*\r?\n/, "")
    .replace(/^\s*\*By [^*]+\*\r?\n/, "")
    .replace(/^\s*---\r?\n/, "");
  return marked.parse(cleaned, { async: false }) as string;
}

function readMinutesFrom(reading: string | undefined, body: string): number {
  if (reading) {
    const n = parseInt(reading, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  const words = body.split(/\s+/).length;
  return Math.max(3, Math.round(words / 220));
}

function normalizeDate(d: string): string {
  // YAML may parse as bare date "2026-06-10" — already ISO. Keep as is.
  return d;
}

export const NOTES_AND_LETTERS: LibraryArticle[] = Object.values(rawFiles)
  .map((raw) => {
    const { front, body } = parseFrontmatter(raw);
    const meta = META[front.slug];
    const html = bodyToHtml(body);
    const podcastUrl = front.podcast_url;
    const podcastEpisode = front.podcast_episode;

    const Body = () => (
      <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
        {podcastUrl && (
          <a
            href={podcastUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-grace bg-gold/20 hover:bg-gold/30 transition rounded-full px-4 py-2"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.5 17.32a.75.75 0 0 1-1.03.25c-2.82-1.72-6.37-2.11-10.55-1.16a.75.75 0 0 1-.33-1.46c4.57-1.04 8.49-.59 11.66 1.34.36.22.47.69.25 1.03zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.23-1.98-8.15-2.56-11.97-1.4a.94.94 0 1 1-.55-1.8c4.37-1.33 9.79-.69 13.5 1.6.44.27.58.85.31 1.29zm.13-3.4c-3.87-2.3-10.27-2.51-13.97-1.39a1.13 1.13 0 1 1-.66-2.16c4.25-1.29 11.31-1.04 15.77 1.6a1.13 1.13 0 0 1-1.14 1.95z" />
            </svg>
            Listen on Spotify
            {podcastEpisode ? ` · ${podcastEpisode}` : ""}
          </a>
        )}
        <div
          className="notes-prose text-foreground/80 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    );

    return {
      slug: front.slug,
      title: front.title,
      kicker: "Notes & Letters",
      lede: front.description,
      description: front.description,
      excerpt: front.description,
      cover: meta?.cover ?? "/library/prayer-journaling/cover.jpg",
      tags: meta?.tags ?? ["Seasons"],
      publishedAt: normalizeDate(front.date),
      readMinutes: readMinutesFrom(front.reading_time, body),
      author: front.author,
      Body,
    } satisfies LibraryArticle;
  })
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
