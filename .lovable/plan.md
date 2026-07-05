## Rebuild the devotional page (`DevotionalView`) to match the "Light Liturgical Journal" direction

Scope: **only** `src/components/devotional-view.tsx`. Same data contract, same routes, same head/OG, same share fix, same prev/next server data. This is a presentation-layer rework.

### Structure (top → bottom, matches the picked prototype exactly)

1. **Top bar** — full-width row, bottom border `border-grace/10`, `pb-4 mb-16`, max-width 3xl.
   - Left: Library link with Lucide `Library` icon + "Library" label (Nunito, semibold, grace).
   - Right: Share icon-only button (Lucide `Share2`, grace → gold on hover) + solid grace pill "Join GraceNotes" (or "Go home" when signed in). Keeps existing auth-aware branching.

2. **Masthead** — centered block above the reading surface.
   - Eyebrow: full date, uppercase, letter-spaced, `text-grace/60` (`Sunday, July 5, 2026`).
   - `h1` "GraceNotes Daily" in Fraunces, `text-5xl md:text-6xl`, bold, grace.
   - Sub-line: two 8-wide gold rules flanking italic Fraunces "Daily Devotional".

3. **Reader surface** — `max-w-3xl`, `bg-parchment` via existing `.glass-parchment`, subtle gold-tinted border, shadow, `rounded-sm`, `p-8 md:p-16`. Faint handmade-paper texture as an absolute overlay (5% opacity, pointer-events-none). Inside:
   - **Verse hero** — centered, italic Fraunces `text-2xl md:text-3xl`, reference beneath in uppercase gold Nunito. Bottom border `border-gold/30`, `pb-12 mb-12`. Replaces the current left-rule quote block.
   - **Body** — Nunito `text-lg leading-relaxed text-grace`, paragraphs mapped from `d.body`, `mb-6` between.
   - **Related Scripture** (only when `d.related.length > 0`) — inset block: `bg-[--grace-soft]`-equivalent light card, left-border `border-gold`, uppercase eyebrow "Related Scripture", list of `ref` + optional short text. Sits mid-body, not below it.
   - **Takeaway** — kept as a soft grace-tinted pull quote after the last body paragraph.
   - **Closing panel** — centered, top border `border-gold/20`, small Lucide `Shield`/`BookOpen` circle mark, Fraunces "Walk deeper with GraceNotes", one line of copy, single outline pill CTA. Auth-aware: signed-in → "Go home"; signed-out → "Join GraceNotes Daily".
   - NIV attribution line stays at the very bottom, small, muted.

4. **Prev/Next cards** — grid `md:grid-cols-2 gap-4 mt-8`, max-w-3xl.
   - Left card: left-aligned, eyebrow "Yesterday", Fraunces title = **actual prev devotional title** (loader already returns `prev` date; wire a small fetch or extend loader — see technical note), formatted date beneath. Border-transparent → `border-gold` on hover.
   - Right card mirrors right-aligned, "Tomorrow" (or hidden when `next === null`).
   - Only render each card when a neighbour exists; keep the current graceful hide behavior.

5. **Footer wordmark line** — small centered "GraceNotes Daily" link back to `/`.

### Share button (already fixed earlier) — leave the current `onShare` logic intact.

### Empty/error state
Keep the existing "being prepared" branch when `devotional === null`, but restyle to match the new masthead + parchment reader visual (same top bar, same masthead, single parchment card with `RefreshCw` reload).

### Technical notes (for the implementer, not the user)

- File touched: **`src/components/devotional-view.tsx`** only. No route/loader/head changes; `devotionalHead` stays put and unchanged.
- Colors: use existing tokens (`text-grace`, `text-gold`, `bg-grace`, `border-gold`, `.glass-parchment`, `bg-grace-soft`, `bg-gold-soft`). Do **not** hardcode hex values from the prototype — the prototype used literals for isolation; the app must use tokens per §3 of CLAUDE.md.
- Fonts: use existing `font-display` (Fraunces) and default body (Nunito) — do not add a Google Fonts `<link>` from the prototype; both fonts already load in `__root.tsx`.
- Parchment texture overlay: use an inline SVG data URI or a tiny local asset — do **not** hotlink `transparenttextures.com` (external network dependency, breaks offline/PWA).
- Prev/Next titles: the current loader returns only `prev`/`next` **dates**. To render titles on the cards, extend `getDevotionalNeighbours` in `src/lib/devotional-archive.functions.ts` to also select `title` for each neighbour, and update the loader return types in `library.devotional.$date.tsx` and `library.devotional.index.tsx` accordingly. Titles fall back to the formatted date if missing.
- Icons: Lucide via `@/components/icon` wrapper (project rule) — `Library`, `Share2`, `BookOpen`, `RefreshCw`, `ArrowRight`, `ChevronLeft`, `ChevronRight`.
- Auth-aware CTA: continue using `useAuth()` as today; do not change any auth logic.
- Accessibility: keep `aria-label`s on icon buttons and prev/next nav; ensure the masthead uses a single `<h1>` (currently the devotional title is `<h1>`; move the page `<h1>` to the masthead's "GraceNotes Daily" and demote the devotional title to `<h2>` — better semantics for the masthead-driven layout).
- No changes to: routes, loaders (except adding neighbour titles), server functions (except the small select-title extension), head tags, sitemap, or any other page.

### Out of scope

- No changes to the library hub, archive index, or route architecture.
- No AI/prompt changes.
- No cron or DB migrations.
- No hero image or generated cover art (kept minimal per direction).
