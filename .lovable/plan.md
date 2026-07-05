## Scope

Frontend-only polish of `src/components/devotional-view.tsx`. No routes, loaders, server functions, or data changes.

## Changes

### 1. Replace Shield with the GraceNotes medallion
- Import `DoveMark` from `@/components/dove-mark`.
- In the closing panel, swap the circled `Shield` icon for `<DoveMark variant="medallion" className="w-14 h-14" alt="GraceNotes Daily" />`.
- Remove the surrounding `border` ring — the medallion is already a self-contained mark.
- Drop the now-unused `Shield` import.

### 2. Add NatureBackground behind the reader
- Import `NatureBackground` from `@/components/nature-background`.
- Render `<NatureBackground />` once at the top of the returned JSX (both the happy path and the empty/error branch).
- Remove the flat `bg-[#f8faf7]` background from the outer wrapper so the nature layer shows through around the parchment card.
- Keep the parchment card (`glass-parchment`) as the reading surface — it will now float above the forest-dawn imagery with our green haze, matching the rest of the authenticated app while still feeling like a small-press devotional.
- Slightly raise the card shadow so it reads as elevated over the background.

### 3. CTA copy — "Begin Today" / "Go Home"
Both top-right (`TopBar`) and the closing panel use the same rule:
- Logged out → **Begin Today** (was "Join the Circle" top / "Join GraceNotes Daily" bottom)
- Logged in → **Go Home** (unchanged)

The closing panel headline copy stays: "Walk deeper with GraceNotes" (logged out) / "Keep walking with GraceNotes" (logged in). Only the button label changes.

## Out of scope
- Nothing else on the page changes (masthead, verse hero, body, related-scripture inset, takeaway pull quote, prev/next cards, footer, NIV notice, share behavior, head tags, auth logic, loaders).
