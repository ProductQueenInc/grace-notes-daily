Four scoped mobile-layout fixes across the Notes & Letters library and its article pages. Frontend/presentation only — no data, no product logic.

## 1. Breathing room around the sticky header (`src/routes/library.index.tsx`)

The sticky header currently sits flush against the top edge and the hero starts too close beneath it.

- Bump the sticky header vertical padding from `py-4` → `py-5` on mobile, `sm:py-6` on larger screens.
- Increase hero top padding: `pt-8` → `pt-10 sm:pt-14` so "Notes & Letters" eyebrow doesn't crowd the header.
- Do the same treatment on the article page (`src/components/article-shell.tsx`): header `py-5` → `py-5 sm:py-6`, hero `pt-8` → `pt-10 sm:pt-14`.

## 2. Devotional featured card → swipeable carousel of recent readings

Replace the single "Today's devotional" hero card with a horizontal snap-scroll carousel of the most recent devotionals (today first, then backwards).

- On mobile (`< sm`): full-width snap cards, one per view, showing cover image + date + title + verse ref + "Read →" CTA. Native swipe, no arrows. Same visual weight as the previous single card.
- On tablet/desktop (`sm+`): keep a single prominent "Today's devotional" card (current design) since horizontal swipe isn't a natural desktop gesture — the "Recent readings" grid lower on the page already covers browsing.
- Data source is already available: `recentDevotionals` from the loader (already fetches 8 rows). Reuse it; no new query.
- Because the carousel already surfaces recent readings on mobile, the separate "Recent readings" grid section below hides on `sm:hidden` to avoid duplication. Desktop keeps both (featured hero + grid) unchanged.

## 3. Foundations row + Free Guides alignment (`src/routes/library.index.tsx`)

Both blocks sit inside `max-w-6xl mx-auto` with `px-6`, but the section headings and card left edges don't visually align because the eyebrow labels ("FREE GUIDES", "SERIES · FOUNDATIONS") sit at different insets relative to card content padding.

- Normalize section eyebrow + heading to a shared component style: same left-inset, same eyebrow tracking, same heading size (`text-xl sm:text-2xl`).
- Ensure Foundations teaser card, Recent readings grid, and Free Guides grid all share identical horizontal padding (`px-6`) and identical inner card padding so their left/right edges line up down the page.
- Free Guides grid: on mobile stay `grid-cols-1` (current) but tighten gap to `gap-3` so the three cards feel like a set, not floating tiles.

## 4. Article page hero header alignment (`src/components/article-shell.tsx`)

On iPhone 12 Pro width, "GraceNotes Daily" wraps to two lines and the "Back Home" pill also wraps — the top row looks broken.

- Reduce brand lockup on mobile: `font-display text-2xl` → `text-lg sm:text-2xl`; dove medallion `w-10 h-10` → `w-9 h-9 sm:w-10 sm:h-10`. Add `whitespace-nowrap` to the brand text so it never wraps.
- Add `whitespace-nowrap` and `shrink-0` to the Back Home button (in `back-home-cta.tsx` if needed, otherwise inline on the wrapper) so the pill stays on one line.
- Header row uses `grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3` to guarantee the brand shrinks/truncates before the CTA gets squeezed (per the responsive-layout-patterns rule).
- Hide the "Notes & Letters" middle link at `< sm` (already the case) — no change there.

## Files touched

- `src/routes/library.index.tsx` — header padding, hero padding, replace single featured devotional card with mobile carousel + desktop-only fallback, align eyebrows/headings, hide Recent readings grid on mobile.
- `src/components/article-shell.tsx` — header padding, brand lockup sizing, Back Home wrap fix.
- `src/components/back-home-cta.tsx` — add `whitespace-nowrap shrink-0` to the button if wrapping is coming from inside.

## Out of scope

- No data or query changes.
- No new routes, no new components beyond one small inline `MobileDevotionalCarousel` block inside `library.index.tsx`.
- No changes to article body typography, share bar, or footer.
