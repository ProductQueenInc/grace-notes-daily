import type { ComponentType } from "react";
import * as PrayerJournaling from "@/content/library/prayer-journaling";
import * as DailyDevotional from "@/content/library/daily-devotional";
import * as ChristianJournaling from "@/content/library/christian-journaling";
import { NOTES_AND_LETTERS } from "@/content/notes-and-letters";

export type LibraryTag =
  | "Prayer"
  | "Journaling"
  | "Devotional"
  | "Habits"
  | "Beginning"
  | "Seasons"
  | "Family"
  | "Doubt"
  | "Work"
  | "Grief"
  | "Singleness"
  | "Identity"
  | "Waiting";

export const ALL_TAGS: LibraryTag[] = [
  "Prayer",
  "Journaling",
  "Devotional",
  "Habits",
  "Beginning",
  "Seasons",
  "Identity",
  "Family",
  "Work",
  "Grief",
  "Doubt",
  "Singleness",
  "Waiting",
];

export interface LibrarySeries {
  slug: string;
  title: string;
  description: string;
}

export const SERIES: Record<string, LibrarySeries> = {
  "foundations": {
    slug: "foundations",
    title: "Foundations",
    description:
      "The three quiet practices at the heart of GraceNotes Daily: prayer, devotion, and journaling.",
  },
};

export interface LibraryArticle {
  slug: string;
  title: string;
  kicker: string; // small label above hero title
  lede: string; // hero subtitle
  description: string; // SEO meta description + card excerpt fallback
  excerpt: string; // card excerpt
  cover: string; // /library/<slug>/cover.jpg
  tags: LibraryTag[];
  series?: { slug: string; order: number };
  publishedAt: string; // ISO yyyy-mm-dd
  readMinutes: number;
  author?: string; // optional personal byline; defaults to "GraceNotes Daily"
  Body: ComponentType;
  faqs?: { q: string; a: string }[];
}

export const LIBRARY: LibraryArticle[] = [
  {
    slug: "prayer-journaling",
    title: "Prayer Journaling: Writing Your Way Closer to God",
    kicker: "Prayer Journaling",
    lede: "Write your prayers. Watch God answer them.",
    description:
      "Discover how prayer journaling can deepen your faith, build a daily prayer habit, and help you see God's faithfulness over time.",
    excerpt:
      "Specific prayers, written down, become a record of God's faithfulness in your own life. A gentle on-ramp for beginners and a deeper home for seasoned writers.",
    cover: "/library/prayer-journaling/cover.jpg",
    tags: ["Prayer", "Journaling", "Beginning"],
    series: { slug: "foundations", order: 1 },
    publishedAt: "2026-06-01",
    readMinutes: 7,
    Body: PrayerJournaling.Body,
    faqs: PrayerJournaling.faqs,
  },
  {
    slug: "daily-devotional",
    title: "Daily Devotional: Showing Up Is the Practice",
    kicker: "Daily Devotional",
    lede: "The thing that orients your day, before the day gets to you.",
    description:
      "Build a daily quiet time habit that actually sticks. Why showing up matters more than getting it right, and how to begin.",
    excerpt:
      "Not a rule you follow. The thing that orients your day before the day gets to you. Ten minutes, given fully, is enough.",
    cover: "/library/daily-devotional/cover.jpg",
    tags: ["Devotional", "Habits", "Beginning"],
    series: { slug: "foundations", order: 2 },
    publishedAt: "2026-06-01",
    readMinutes: 6,
    Body: DailyDevotional.Body,
    faqs: DailyDevotional.faqs,
  },
  {
    slug: "christian-journaling",
    title: "Christian Journaling: Your Honest Conversation with God",
    kicker: "Christian Journaling",
    lede: "Tell God everything and watch what He does with it.",
    description:
      "Christian journaling deepens your faith, helps you process life honestly with God, and creates a lasting record of your spiritual journey.",
    excerpt:
      "The Psalms were a journal. Yours can be too. A private space to bring everything to God, written in your own hand.",
    cover: "/library/christian-journaling/cover.jpg",
    tags: ["Journaling", "Seasons"],
    series: { slug: "foundations", order: 3 },
    publishedAt: "2026-06-01",
    readMinutes: 7,
    Body: ChristianJournaling.Body,
    faqs: ChristianJournaling.faqs,
  },
];

export const BASE_URL = "https://www.gracenotesdaily.com";
export const DEFAULT_AUTHOR = "GraceNotes Daily";

export function getArticle(slug: string): LibraryArticle | undefined {
  return LIBRARY.find((a) => a.slug === slug);
}

export function articleUrl(slug: string): string {
  return `${BASE_URL}/library/${slug}`;
}

export function relatedArticles(slug: string, limit = 3): LibraryArticle[] {
  const current = getArticle(slug);
  if (!current) return LIBRARY.slice(0, limit);
  const others = LIBRARY.filter((a) => a.slug !== slug);
  // Same series first (ordered), then overlapping tags, then chronological fallback
  const sameSeries = current.series
    ? others
        .filter((a) => a.series?.slug === current.series!.slug)
        .sort((a, b) => (a.series!.order ?? 0) - (b.series!.order ?? 0))
    : [];
  const seen = new Set(sameSeries.map((a) => a.slug));
  const sameTags = others
    .filter((a) => !seen.has(a.slug) && a.tags.some((t) => current.tags.includes(t)))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  sameTags.forEach((a) => seen.add(a.slug));
  const rest = others
    .filter((a) => !seen.has(a.slug))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return [...sameSeries, ...sameTags, ...rest].slice(0, limit);
}
