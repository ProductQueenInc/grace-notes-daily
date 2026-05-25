## Why
The new gold dove on deep-green medallion reads as a finished brand artifact: it has weight, a built-in ring, and works at small sizes where the thin white outline disappears. Using it consistently across every "wordmark" touchpoint is one of the cheapest wins for perceived polish.

## Asset
- Save the upload to `src/assets/dove-medallion.png`.
- Extend `DoveMark` with a new `medallion` variant (no API break — existing `white`/`gold`/`green`/`green-round` callers keep working).
- Because the medallion is self-framed, callers using it should remove the surrounding cream/white circle chip and just render the image.

## Where it goes (consistent treatment)

1. **Landing header** (`src/routes/index.tsx`) — replace `<DoveMark variant="white" className="w-9 h-9" />` with the medallion at `w-10 h-10`. Keep the hover scale.
2. **Site footer** (`src/components/site-footer.tsx`) — same swap, `w-10 h-10`.
3. **Sidebar wordmark** (`src/components/app-sidebar.tsx`) — drop the white `bg-white ring-gold/40` chip wrapper and render the medallion directly at `w-9 h-9`. The gold ring of the medallion replaces the chip; the gold halo shadow stays.
4. **Auth pages** (`src/routes/login.tsx`, `src/routes/signup.tsx`) — remove the cream `bg-white/85` chip and render the medallion centered above "GraceNotes Daily" at `w-16 h-16`. This is the spot the user circled — the medallion gives the auth card a clear, branded anchor instead of a faint icon floating in a chip.
5. **Content-page headers** (`src/routes/about.tsx`, `src/routes/faq.tsx`, `src/routes/terms.tsx`, `src/routes/privacy.tsx`, `src/routes/contact.tsx`, `src/routes/christian-journaling.tsx`, `src/routes/prayer-journaling.tsx`, `src/routes/daily-devotional.tsx`) — swap any `<DoveMark variant="white" className="w-10 h-10" />` next to the wordmark for the medallion at the same size, so every public page reads as one brand.

## Where it does NOT go
- **In-product accents** like the "Today's Grace Note" header icon (`home.tsx`) keep the simple gold outline dove — a 24px medallion would be too busy inline with text.
- **Calendar badge coins** stay as-is (they're a different system).
- **Email templates** stay on their current header image (separate render pipeline).

## Out of scope (future)
- Generating PNG variants of the medallion at 192/512 for the PWA icons + favicon. Worth doing in a follow-up so the installed-app icon matches, but the current favicon work already shipped a square gold-dove tile that's close.

## Technical details
- New file: `src/assets/dove-medallion.png` (copied from upload).
- Edit: `src/components/dove-mark.tsx` — add `medallion` to the `Variant` union and `SRC` map.
- Edit: `src/routes/index.tsx`, `src/components/site-footer.tsx`, `src/components/app-sidebar.tsx`, `src/routes/login.tsx`, `src/routes/signup.tsx`, and the listed content routes — swap variant prop and remove chip wrappers where present.
- No new dependencies, no schema changes, no behavior changes.
