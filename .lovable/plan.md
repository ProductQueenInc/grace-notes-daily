## What I got wrong last turn

- I added a **second** streak pill above the Home greeting. The floating "🔥 0 days" chip you circled already exists globally in `AppShell` (mobile-only, top-right). One streak indicator is enough.
- I only padded the Home hero. You asked for the same fix on every page with a hero.

## What you actually want

Push hero content (eyebrow + headline + subtitle) **down** on mobile so the headline's baseline sits **below** the floating streak chip. The chip should never overlap the title — today "Friend", "a held heart", "Your Journey" all collide with it.

## Plan

### 1. Remove the duplicate streak pill from Home
`src/routes/home.tsx` — delete the mobile-only streak pill I added above the greeting. Keep the extra hero top padding.

### 2. Add hero top padding on every page with a hero
The floating chip sits roughly 56–64px tall including `env(safe-area-inset-top)`. To clear it cleanly on mobile, the hero needs ~`pt-20` (80px) on mobile, reverting to existing desktop padding at `sm:` and up.

Files to touch:
- `src/routes/home.tsx` — already padded, just verify it clears
- `src/routes/listen.tsx` — pad hero so "Soundscapes for a held heart" clears chip
- `src/routes/journey.tsx` — pad hero so "Your Journey" clears chip
- `src/routes/prayers.tsx` — same treatment
- Any other authenticated route using a `PageHeader` or inline hero block (I'll scan and apply consistently — likely also `heart-notes.tsx`, `settings.tsx`)

Cleanest implementation: apply `pt-20 sm:pt-{existing}` to the hero block on each page. If `PageHeader` is the shared primitive on most, I'll add the mobile padding inside `PageHeader` itself so the fix is one place, and only inline-patch the routes that hand-roll their hero (Home).

### 3. No changes to
- The floating chip itself (size, position, safe-area handling stays as-is)
- Desktop layout (changes are mobile-only via `sm:` reset)
- Streak logic, content, or any backend

## What this will NOT do
- Will not move, resize, or restyle the streak chip
- Will not add any new chrome
- Will not touch sidebar, nav, or any non-hero content

Want me to proceed exactly as above?
