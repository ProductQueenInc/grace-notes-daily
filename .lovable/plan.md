## Part 1 — Replace the six home preview images

Swap all six existing CDN assets used by the home page cards with the new 1200×800 (3:2) mockups. Same filenames, same import sites — only the pixels and the `.asset.json` pointers change. No layout or copy changes; `home-previews.tsx` keeps working as-is.

Mapping (uploaded → existing pointer):
- `Grace note.png` → `src/assets/home-previews/grace-notes-home.png`
- `Listen.png` → `src/assets/home-previews/listen-home.png`
- `Daily Rhythms.png` → `src/assets/home-previews/daily-rhythms-home.png`
- `Heart Notes.png` → `src/assets/home-previews/heart-notes-home.png`
- `Prayer.png` → `src/assets/home-previews/prayer-home.png`
- `Journey.png` → `src/assets/home-previews/journey-home.png`

For each: delete the old asset pointer, re-upload the new file via `lovable-assets create --file /mnt/user-uploads/<name> --filename <slug>-home.png`, overwrite the `.asset.json`. Card aspect ratio in `home-previews.tsx` is already auto (height = `h-auto`), so the new 3:2 ratio renders cleanly on both rows. No code edit required beyond the JSON pointers.

## Part 2 — Listen page reorganisation

Goal: make Listen feel curated rather than a flat grid, and bring it visually in line with the rest of the app.

Changes to `src/routes/listen.tsx`:
1. **Group by category instead of a flat grid.** Render each category (Worship, Prayer, Teaching, etc.) as its own horizontal section with a heading and a snap-scrolling row on mobile / 3-up grid on desktop. The active "All" view shows all groups stacked; selecting a category chip jumps to that one group.
2. **Featured rail at the top.** First section is "Featured today" — top 3 tracks (by `sort_order`). Larger cards (16:9 thumb, title overlay).
3. **Type filter behaviour.** Keep Audio / Video / All as a secondary filter that narrows within whatever category view is active.
4. **Tighter card.** Drop the second `Headphones/Play` icon next to the title (redundant with the thumbnail's centre play button). Keep the now-playing badge.
5. **Empty-state per group**, not just global, so a category with no matches says so in place.

No backend or audio-player changes; queue + auto-play continue to work because `play(track, filtered)` still receives the active visible list.

## Part 3 — Notes & Letters index reorganisation

Goal: make `/library` browsable rather than a single long tag-filtered grid. Currently shows hero → Foundations series → tag chips → flat grid.

Changes to `src/routes/library.index.tsx`:
1. **Latest essay — featured.** Top of grid pulls the most recent article out into a wide "Latest" card (cover left, title + lede + read time right on desktop; stacked on mobile).
2. **Browse by theme.** Replace the single flat grid with 2–3 themed sections derived from `PRIMARY_TAGS`: e.g. "Faith & Doubt", "Seasons & Identity", "Family & Relationships". Each section shows up to 3 cards + a "See all in [tag] →" link that filters the grid below.
3. **All essays grid stays at the bottom**, filtered by the active tag chip (existing behaviour). Reorders to newest-first.
4. **Series strip stays where it is** (Foundations) — already works well.
5. **Mobile**: themed sections become horizontal snap rows (same pattern as the home page's "Gentle reads"); desktop is 3-up grids.
6. **Tag chips**: keep, but move directly above the "All essays" grid (not above the themed sections), so chips control only that bottom grid and don't confuse the themed sections above.

No content/markdown changes; uses existing `LIBRARY`, `PRIMARY_TAGS`, `ArticleCard`.

## Order of execution
1. Image swaps (Part 1) — fastest, unblocks visual review.
2. Listen page (Part 2).
3. Notes & Letters index (Part 3).

Each part is independently shippable.
