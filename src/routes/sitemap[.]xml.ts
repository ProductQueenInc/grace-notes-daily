// Dynamic sitemap served at /sitemap.xml (replaces the old static
// public/sitemap.xml, which could never include the dated devotional pages).
//
// Two halves:
//   1. STATIC_PAGES — the hand-curated marketing/library/legal pages that used
//      to live in public/sitemap.xml. Keep this list in sync when adding a
//      new indexable page.
//   2. Every published devotional at /library/devotional/YYYY-MM-DD, read
//      live from `daily_devotionals` (public-select table). A new entry
//      appears here automatically every day when the cron writes the row —
//      no publish or manual sitemap edit needed.
//
// robots.txt already points at https://www.gracenotesdaily.com/sitemap.xml,
// so no change is needed there.

import { createFileRoute } from "@tanstack/react-router";

const ORIGIN = "https://www.gracenotesdaily.com";

// `daily_devotionals` has a public SELECT policy, so the sitemap reads it with
// the anon (publishable) key over PostgREST — no server secret needed. Same
// TKOEBO project + anon key as src/integrations/supabase/client.ts.
const SUPABASE_URL = "https://tkoebogweygaabndrsvl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrb2Vib2d3ZXlnYWFibmRyc3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NjA4MzEsImV4cCI6MjA5NDAzNjgzMX0.tFA7kj0ffcdZbnF9EXbq0sN9GRFeQHmvS4k-RHlfaTE";

type StaticPage = {
  path: string;
  lastmod: string;
  changefreq?: string;
  priority?: string;
};

// Carried over from the retired public/sitemap.xml (25 entries).
const STATIC_PAGES: StaticPage[] = [
  { path: "/", lastmod: "2026-06-09", changefreq: "weekly", priority: "1.0" },
  { path: "/library", lastmod: "2026-06-09", changefreq: "weekly", priority: "0.9" },
  { path: "/library/devotional", lastmod: "2026-07-05", changefreq: "daily", priority: "0.9" },
  { path: "/library/prayer-journaling", lastmod: "2026-06-09", changefreq: "monthly", priority: "0.9" },
  { path: "/library/daily-devotional", lastmod: "2026-06-09", changefreq: "monthly", priority: "0.9" },
  { path: "/library/christian-journaling", lastmod: "2026-06-09", changefreq: "monthly", priority: "0.9" },
  { path: "/quiet-time-app", lastmod: "2026-06-01", changefreq: "monthly", priority: "0.8" },
  { path: "/faith-habit-tracker", lastmod: "2026-06-01", changefreq: "monthly", priority: "0.8" },
  { path: "/answered-prayer-tracker", lastmod: "2026-06-01", changefreq: "monthly", priority: "0.8" },
  { path: "/free-prayer-toolkit", lastmod: "2026-06-01", changefreq: "monthly", priority: "0.8" },
  { path: "/fasting-guide", lastmod: "2026-06-01", changefreq: "monthly", priority: "0.8" },
  { path: "/7-day-prayer-journal", lastmod: "2026-06-01", changefreq: "monthly", priority: "0.8" },
  // Moved from /blog/building-gracenotes-daily on 2026-07-22 (old URL 301s here).
  { path: "/library/building-gracenotes-daily", lastmod: "2026-07-22", changefreq: "monthly", priority: "0.8" },
  { path: "/library/and-then-there-were-three", lastmod: "2026-06-10", priority: "0.7" },
  { path: "/library/i-still-believe-i-just-dont-believe-that-anymore", lastmod: "2026-06-10", priority: "0.7" },
  { path: "/library/losing-your-job-as-a-christian", lastmod: "2026-06-10", priority: "0.7" },
  { path: "/library/still-single-what-the-church-gets-wrong", lastmod: "2026-06-10", priority: "0.7" },
  { path: "/library/what-do-you-do-when-you-dont-recognise-your-life", lastmod: "2026-06-10", priority: "0.7" },
  { path: "/library/when-grief-breaks-your-theology", lastmod: "2026-06-10", priority: "0.7" },
  { path: "/library/when-the-answer-finally-comes", lastmod: "2026-06-10", priority: "0.7" },
  { path: "/faq", lastmod: "2026-06-01", changefreq: "monthly", priority: "0.6" },
  { path: "/about", lastmod: "2026-06-01", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", lastmod: "2026-06-01", changefreq: "yearly", priority: "0.4" },
  { path: "/terms", lastmod: "2026-06-01", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", lastmod: "2026-06-01", changefreq: "yearly", priority: "0.3" },
];

function urlEntry(loc: string, lastmod: string, changefreq?: string, priority?: string): string {
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

async function fetchDevotionalDates(): Promise<string[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/daily_devotionals?select=date&order=date.desc&limit=1000`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    );
    if (!res.ok) {
      console.error("[sitemap] devotional date query failed", res.status);
      return [];
    }
    const rows = (await res.json()) as { date: string }[];
    const today = new Date().toISOString().slice(0, 10);
    return rows
      .map((r) => r.date)
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today);
  } catch (err) {
    console.error("[sitemap] devotional date query threw", err);
    return [];
  }
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const devotionalDates = await fetchDevotionalDates();

        const entries: string[] = [
          ...STATIC_PAGES.map((p) =>
            urlEntry(`${ORIGIN}${p.path}`, p.lastmod, p.changefreq, p.priority),
          ),
          // Dated devotionals: lastmod is the devotional's own date (the
          // content never changes after publication).
          ...devotionalDates.map((d) =>
            urlEntry(`${ORIGIN}/library/devotional/${d}`, d, undefined, "0.7"),
          ),
        ];

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...entries,
          "</urlset>",
          "",
        ].join("\n");

        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            // Cache for an hour so crawlers see new devotionals same-day
            // without hammering the database.
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
