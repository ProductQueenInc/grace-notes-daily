
# Notes & Letters — Publication Hub

A single public publication page at `/library` that holds all SEO articles (current 3 + ~10 incoming), organized by **series** and **tags**, fully readable by anyone, with a soft "Create your account" CTA at the end of each article. The 3 tools (Quiet Time App, Faith Habit Tracker, Answered Prayer Tracker) stay where they are and are **not** part of Notes & Letters.

---

## 1. Name & positioning

- **Hub name:** Notes & Letters
- **Tagline:** "Slow reads on prayer, journaling, and walking with God."
- The current `/learn` route (if it exists as a hub) becomes Notes & Letters. The 3 tool pages are unaffected.

## 2. URL structure

Flat → nested move, with redirects to preserve the SEO equity already built on the 3 ranking articles.

```
/library                              → Hub index (list of all articles, filterable)
/library/series                       → All series (optional, can defer)
/library/series/$seriesSlug           → Series landing (e.g. /library/series/prayer-journaling-101)
/library/tags/$tagSlug                → Tag archive (e.g. /library/tags/prayer)
/library/$slug                        → Article reader

# 301 redirects (server route or middleware):
/prayer-journaling     → /library/prayer-journaling
/daily-devotional      → /library/daily-devotional
/christian-journaling  → /library/christian-journaling
```

Redirects matter — these 3 pages already rank. Without 301s we lose that.

## 3. End-to-end user journey

### Signed-out visitor (SEO / shared link)
1. Lands on `/library/$slug` from Google or a shared link.
2. Sees the public reader layout: hero image, title, meta (series, tags, read time, date), body, share bar, **soft CTA** at the end ("Create a free account to save reads, get a daily grace note, and track your rhythms"), plus 2-3 "Keep reading" article cards.
3. Public site chrome: top nav links to Home / Notes & Letters / About; footer surfaces the hub.
4. No paywall, no interstitial. Account creation is invitational, not blocking.

### Signed-in user
1. Sidebar gets a new nav item **"Notes & Letters"** (book/bookmark icon), sitting between **Listen** and **Settings group**.
2. Clicking it lands inside `<AppShell>` on the in-app library view — same content, app chrome (sidebar + NatureBackground + PageHeader).
3. Article reader uses `.glass-parchment` surface, full-bleed hero on mobile, max-width prose on desktop.
4. Share button generates the **public** URL (`https://www.gracenotesdaily.com/library/$slug`), not the in-app one, so recipients see the public reader.
5. No CTA shown to signed-in users — replaced with a "Save to my reads" bookmark (optional v2) and the same "Keep reading" rail.

### Shared link flow
- Signed-in user taps Share → copies public URL.
- Stranger opens it → fully public reader → soft CTA at end.
- We recommend **fully public, soft CTA** (your selection). Rationale: SEO compounding > friction-driven signups. The daily grace note + chat are the conversion magnets, not the articles.

## 4. Hub page outline (`/library`)

```text
┌─────────────────────────────────────────────────┐
│  HERO                                            │
│  Notes & Letters                                 │
│  Slow reads on prayer, journaling, and walking  │
│  with God.                                       │
├─────────────────────────────────────────────────┤
│  SERIES STRIP (horizontal scroll, 2-3 cards)    │
│  [Prayer Journaling 101] [7 Days of Stillness]  │
├─────────────────────────────────────────────────┤
│  TAG CHIPS (filter)                             │
│  All · Prayer · Journaling · Devotional ·       │
│  Fasting · Seasons · Habits                     │
├─────────────────────────────────────────────────┤
│  ARTICLE GRID (responsive: 1col mob, 2 tab, 3+) │
│  Each card: cover image, series badge (if any), │
│  title, 2-line excerpt, read time, primary tag  │
└─────────────────────────────────────────────────┘
```

## 5. Article reader outline (`/library/$slug`)

```text
[ Cover image (16:9 desktop, 4:3 mobile) ]
Series badge · Tag · 6 min read · May 2026
# Article Title
Lede paragraph in larger Fraunces.
─────────────────
Body (.glass-parchment, Nunito, max-w-prose)
Pull quotes use Fraunces italic.
─────────────────
Share bar (existing <ShareBar />)
─────────────────
[ Soft CTA block — signed-out only ]
"Walk a little slower with us."
[ Create your free account ]  [ Maybe later ]
─────────────────
Keep reading: 3 related cards (same series first, then same tag)
```

## 6. Tags & series taxonomy

**Series** (curated multi-part arcs, ordered): each has a slug, title, description, cover, and ordered list of article slugs. Examples:
- `prayer-journaling-101` (current Prayer Journaling becomes part 1)
- `daily-devotional-essentials`
- `seasons-of-faith`

**Tags** (free-form topical labels, many-to-many): Prayer, Journaling, Devotional, Fasting, Seasons, Habits, Newcomer, Returning.

Each article carries: `series` (0 or 1), `tags[]` (1-3 recommended).

## 7. Content storage

Two viable shapes — recommending **MDX in repo** for now, migrate to DB later if/when non-devs author.

- **MDX files in `content/library/`** with frontmatter (title, slug, description, cover, ogImage, series, seriesOrder, tags, publishedAt, readTime, author). Loaded by a tiny build-time index. Pros: zero DB cost, version-controlled, easy preview, works offline. Cons: requires deploy to publish.
- **Future:** Supabase `articles` + `series` tables with the same shape if non-tech editors join. Not needed today.

Existing 3 articles (`content/prayer-journaling.md`, `daily-devotional.md`, `christian-journaling.md`) get migrated into `content/library/` with frontmatter added.

## 8. SEO surface (per article)

- `head()` per leaf: title, description, og:title, og:description, og:url, og:type=article, og:image (cover), twitter:card=summary_large_image.
- JSON-LD `Article` schema (headline, image, datePublished, author, mainEntityOfPage).
- JSON-LD `BreadcrumbList` (Home → Notes & Letters → Series? → Article).
- Canonical = `https://www.gracenotesdaily.com/library/$slug` (leaf only, never in `__root.tsx`).
- `sitemap.xml` extended with every `/library/...` URL — hub, series, tag archives, articles.
- `robots.txt` unchanged.
- 301 redirects on the 3 legacy URLs preserve link equity.
- `llms.txt` updated to point at the hub.

## 9. Navigation placement

**Signed-in (desktop sidebar + mobile bottom nav):**
- New sidebar entry: **Notes & Letters** (BookOpen icon, between Listen and the profile group).
- Mobile: same sidebar (collapsible drawer). No bottom-tab change needed — sidebar is the single nav.

**Signed-out (public chrome):**
- Top nav: add "Notes & Letters" between About and Contact.
- Footer (`site-footer.tsx`): "Read" column with hub + featured articles.

**Visual treatment in-app:** Notes & Letters uses `<NatureBackground />` + `<PageHeader />` like every other authenticated page; article reader uses `.glass-parchment` for long-form readability. Consistent with existing rules.

## 10. Mobile UX & native impact

- **Web mobile:** Single column. Cover image full-bleed. Sticky mini-header (back + share) on scroll. Tag chips horizontally scrollable.
- **Capacitor (future native):** No structural impact — same routes work inside the WebView. Two things to plan:
  1. **Share sheet:** swap `navigator.share` for `@capacitor/share` when running native (already a pattern in `share-bar.tsx`).
  2. **Deep links:** register Universal Links for `gracenotesdaily.com/library/*` so a tap from iMessage opens the app directly if installed, else the public web reader. Adds polish; not blocking for v1.
- No change to onboarding, sidebar pin behavior, or PlayerDock. Reader respects the persistent player dock height with bottom padding.

## 11. Build phases

**Phase 1 — Hub + reader + migration (ship-ready MVP)**
- New routes: `/library`, `/library/$slug`.
- MDX content pipeline + `content/library/` directory.
- Migrate 3 existing articles into frontmatter MDX.
- 301 redirects on the 3 legacy URLs.
- Article cards, hero, tag chips (filter only, no archive pages yet).
- Soft CTA block (signed-out only — detect via `useAuth`).
- Sidebar + footer + top nav entries.
- Sitemap + JSON-LD + Article meta.
- "Keep reading" rail (same tag fallback).

**Phase 2 — Series + tag archives**
- `/library/series/$seriesSlug` and `/library/tags/$tagSlug`.
- Series progress indicator on article reader ("Part 2 of 5").
- "Next in series" CTA replaces generic Keep Reading when applicable.

**Phase 3 — Polish**
- Save-to-reads bookmark (signed-in).
- Reading progress bar.
- RSS feed at `/library/rss.xml`.
- Newsletter capture inline (if you start a newsletter).

## 12. Technical notes

- TanStack routes: `src/routes/library.tsx` (hub, with `<Outlet />`), `src/routes/library.index.tsx`, `src/routes/library.$slug.tsx`. Series/tag pages added in phase 2.
- MDX loader: `vite-plugin-mdx` or a tiny build-time JSON index of frontmatter (preferred — keeps bundle lean; only the selected article's MDX is fetched).
- Redirects: server route handlers at `src/routes/prayer-journaling.tsx` etc. return `Response.redirect(newUrl, 301)` from a loader-level redirect. Existing files swap from page content to redirect-only.
- Cover/OG images: store under `public/library/<slug>/cover.jpg`. Required field in frontmatter; build fails if missing (prevents shipping naked articles).
- `useAuth()` for CTA gating — render-time check; SSR-safe because `head()` doesn't depend on auth.
- No new DB tables required for Phase 1.

## 13. Open questions to confirm before build

1. Cover images: do you have art for the 3 existing articles, or should I generate placeholders using `imagegen` matching the imagery policy?
2. Author byline: single house byline ("GraceNotes Daily") or your name on the founder-voice pieces?
3. Newsletter capture in the CTA block — yes/no/later?
