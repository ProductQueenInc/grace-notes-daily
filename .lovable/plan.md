
# GraceNotes Daily — share fix + library/devotional merge

Two tasks, done in order. Task 1 is a small surgical fix. Task 2 is a routing + layout change with 301 redirects and SEO care.

---

## Task 1 — Fix the malformed share URL

**Symptom:** clicking the Share icon on `/devotional` copies
`https://www.gracenotesdaily.com/devotional/2026-07-05Psalm 138:8`
(the verse reference is glued onto the date with no separator).

**Diagnosis approach:** The visible code in `devotional-view.tsx` builds the URL from `${BASE_URL}/devotional/${date}` and passes `verseRef` only as share *text* — so on paper the URL should be clean. That means either (a) the `date` prop reaching `DevotionalView` already contains the verse ref, (b) `devotional.servedDate` (used by `/devotional/index` loader) is malformed upstream, or (c) another share path is in play. First step in build mode is to add a `console.log("[share] url =", url)` right before `navigator.share` / `clipboard.writeText`, reproduce, and pinpoint the exact source. Fix at the source, not by string-stripping downstream.

**Target URL format after fix:**
`https://www.gracenotesdaily.com/library/devotional/YYYY-MM-DD`
(the new path from Task 2 — even though the redirect from the old path won't be in place until Task 2 lands, we generate the new URL now; Task 2 makes both paths resolve).

**Files likely touched:** `src/components/devotional-view.tsx`, possibly `src/lib/ai.functions.ts` if `servedDate` is contaminated, possibly `src/routes/devotional.index.tsx` / `devotional.$date.tsx` if `date` is being polluted before it reaches the view.

**Verification:** log the URL, click each entry point (native share, Copy link) on both `/devotional` and `/devotional/YYYY-MM-DD`, confirm clipboard contains the clean URL.

---

## Task 2 — Merge devotionals into the library

### New URL map

| Path | Behaviour |
|---|---|
| `/library` | Hub (canonical unchanged) |
| `/library/devotional` | Devotional archive index — paginated list of all past devotionals (newest first) |
| `/library/devotional/YYYY-MM-DD` | Single devotional one-pager (canonical for each devotional) |
| `/devotional` | 301 → `/library/devotional` |
| `/devotional/YYYY-MM-DD` | 301 → `/library/devotional/YYYY-MM-DD` |
| `/library/$slug` | Unchanged (essays, letters, Foundations) |

Today's devotional is reached from the hub hero and from any prev/next arrow — it does not have a separate `/today` route.

### `/library` hub layout (top to bottom)

1. **Hero — Today's devotional.** Full-width card, gold "Today's devotional" eyebrow, title, verse reference, one-line lede, warm "Read today's devotional" CTA → `/library/devotional/{today}`. If today's devotional hasn't generated yet, fall back to yesterday's with a subtle "Yesterday's reflection" label (mirrors the existing fallback pattern in `getOrCreateSharedDevotional`).
2. **Foundations series.** Existing 3-part series section, unchanged.
3. **All Letters, most recent first.** Existing essays/letters, ordered by `publishedAt` desc — no filter chips at the top of this section (keep the flow calm).
4. **Recent devotionals strip.** Small horizontal strip of the last ~7 devotionals as compact cards (date + title + verse ref). The primary CTA under the strip is **"Browse all devotionals" → `/library/devotional`** (the archive index) — this is the main entry point into the archive, not the individual cards.
5. **Guides section.** The existing filter chips + full article grid stay at the bottom as the browse/filter surface for the library's evergreen writing.

Reading room feel throughout: existing tokens (`--grace`, `--gold`, `.glass-parchment`), Fraunces display, Nunito body, existing card components. No new colours, no new borders, no new patterns.

### `/library/devotional` — archive index (new page)

- Reverse-chronological list of every devotional, grouped by month heading ("July 2026", "June 2026", …). Each row: date, title, verse ref, one-line takeaway snippet. Row links to the dated one-pager.
- Pagination: ~20 rows per page (or "load more"). Not a calendar. A tiny month/year jump control in the header sidebar lets the user skip to a specific month without a full calendar UI.
- Uses `.glass-parchment` reading surface, calm typography, no chrome.
- Public, indexable, own `head()` (title "Daily Devotionals — GraceNotes Daily", description, canonical `/library/devotional`).

### `/library/devotional/YYYY-MM-DD` — the one-pager

The existing `DevotionalView` component stays exactly as-is for the reading area. We only change the shell around it.

**Top bar (new — minimal signpost):**
- GraceNotes Daily wordmark → `/`
- "Library" link → `/library`
- Right side (auth-aware):
  - Signed out: "Join GraceNotes Daily" → `/signup`
  - Signed in: "Go Home" → `/home`
- Renders signed-out state during SSR, upgrades on hydration once `useAuth` resolves. Brief flicker is acceptable and preferable to blocking SSR.

**Content area:** unchanged (`DevotionalView` verse block, title, body, related scripture, takeaway, NIV notice).

**Below content — prev/next:**
- Prev arrow: visible whenever an earlier devotional exists.
- Next arrow: visible only when viewing a past devotional AND a later one exists; hidden on today's.
- **Both arrows query the nearest existing devotional (not date-1 / date+1)**, so historical gaps and any missed cron days are handled gracefully.
- Arrows are `<Link>` to the same route with a different `date` param — TanStack re-runs the loader, swaps content, updates head/OG. This is a client-side navigation, not a hard reload.

**Below prev/next — soft closing section:**
- Signed out: *"There is more where this came from."* + `[Explore the Library]` `[Join GraceNotes Daily]`
- Signed in: *"Keep reading."* + `[Explore the Library]` `[Go Home]`
- Existing warm/unhurried tone. No marketing language.

### SEO + infra

- **301 redirects** from `/devotional` and `/devotional/YYYY-MM-DD` via TanStack `redirect({ statusCode: 301 })` in `beforeLoad` (same pattern used today by `/daily-devotional`).
- **Canonical URLs** point at the new `/library/devotional/...` path for every dated devotional; the archive index canonical is `/library/devotional`; the hub canonical stays `/library`.
- **Sitemap update** (`public/sitemap.xml`): add `/library/devotional` (weekly, 0.8); replace `/devotional` with the new path (still 0.9, daily). Dated archive URLs remain outside the sitemap for now (that's the separate follow-up already noted in CLAUDE.md §11). Old `/devotional` sitemap entries removed.
- **robots.txt:** allow `/library/devotional` and `/library/devotional/*` (currently no rule needed since Allow: / is default; just make sure no accidental Disallow blocks them).
- **Head tags** on the dated page unchanged in shape — `devotionalHead()` already emits per-devotional title, description, OG image, Article + Breadcrumb JSON-LD. We only update the `devotionalUrl()` helper to build the new path so `og:url` and canonical point at `/library/devotional/YYYY-MM-DD`.
- **Breadcrumb JSON-LD** updated: Home → Library → Devotionals → *devotional title*.
- Temporary ranking dip is expected while Google re-crawls the 301s. 301 preserves equity; no code we can write shortcuts that timeline.

### Technical notes (for the technical reader)

- **New routes:**
  - `src/routes/library.devotional.index.tsx` — archive index, public loader queries `daily_devotionals` (date desc, paginated).
  - `src/routes/library.devotional.$date.tsx` — one-pager. Loader reuses `getStoredSharedDevotional` (read-only, `notFound()` when missing — matches the PM5 policy). Wraps `DevotionalView` in the new top-bar + prev/next + soft-CTA shell.
  - `src/routes/devotional.index.tsx` — replaced body with `beforeLoad: () => throw redirect({ to: "/library/devotional", statusCode: 301 })`.
  - `src/routes/devotional.$date.tsx` — replaced body with `beforeLoad: () => throw redirect({ to: "/library/devotional/$date", params: { date }, statusCode: 301 })`.
- **Prev/next lookup:** two small server fns (public, no auth) — `getPrevDevotionalDate(date)` / `getNextDevotionalDate(date)` — each does `select date from daily_devotionals where date < $1 order by date desc limit 1` (and mirror for next). Called in the route loader; results passed as loader data. Alternative: one combined `getNeighbourDates(date)` fn to save a round-trip.
- **`devotionalUrl()` in `src/components/devotional-view.tsx`:** update to return `${BASE_URL}/library/devotional/${dateISO}`. This is what fixes Task 1's target URL once Task 1's root-cause fix is in.
- **`daily_devotionals` archive query** in the archive index loader: `select date, title, verse_ref, takeaway from daily_devotionals order by date desc limit N offset M`. Public read is already allowed by RLS (per CLAUDE.md §11 2026-06-22 migration).
- **Auth-aware CTAs:** use existing `useAuth()` hook on the client; render signed-out variant server-side; swap on hydration.
- **Sitemap** is a static file today (`public/sitemap.xml`) — one-line edits. A dynamic sitemap that includes every dated devotional URL remains a separate follow-up (already tracked).

### What we're not touching

- `DevotionalView` reading area, `.glass-parchment`, tokens, fonts, imagery policy.
- The devotional generation pipeline (`getOrCreateSharedDevotional`, cron, verse grounding).
- Library filter chips / tag system on the guides section.
- Any authenticated app routes (Home, HeartNotes, Journey, Prayers, Listen, Settings).
- The Foundations series and its existing article pages.

### Rollout order

1. Task 1 fix (share URL root cause) + log verification.
2. New routes (`library.devotional.index.tsx`, `library.devotional.$date.tsx`) + shared shell components.
3. `devotionalUrl()` swap → new path.
4. Hub redesign (`library.index.tsx`): hero, Recent devotionals strip, section reorder.
5. Old-path redirects (`devotional.index.tsx`, `devotional.$date.tsx`).
6. Sitemap update.
7. Manual verification: share URL, prev/next across a missing-day gap, redirects, signed-in vs signed-out top bar and closing section, hub hero fallback when today's devotional isn't generated yet.

