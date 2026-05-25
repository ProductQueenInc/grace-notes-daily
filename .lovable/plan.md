
# Mobile UI Polish Pass

Tightening the mobile experience across landing, auth, and Listen. Nothing here changes business logic — copy, layout, padding, and a few small auth-flow guards.

---

## 1. Adaptive single CTA (landing + header)

**Header (`src/routes/index.tsx` → `Header`)**
- Replace the `Sign in` + `Get started` pair with one button that adapts to session state via `useAuth()`:
  - Logged in → `Open app` → `/home` (already present)
  - Logged out → `Sign in` → `/login` (single primary white pill)
- The "Sign in" link inside that pair is removed; signup is reached from the login page's "Create an account" link (already wired).

**Hero CTA**
- Collapse `Begin your journey` + `I already have an account` into a single contextual button:
  - Logged out → `Begin your journey` → `/signup` (gold pill)
  - Logged in → `Open your space` → `/home`
- The "I already have an account" secondary link goes away; people who already have an account use the header's `Sign in` button.

**Final CTA section (`Begin gently. Stay softly.`)**
- Same treatment: single contextual button (`Begin your journey` for logged out, `Open your space` for logged in).

---

## 2. Auth page polish + post-signin bounce fix

**Visual (`src/routes/login.tsx`, `src/routes/signup.tsx`)**
- Investigate why the dove fails to render — `DoveMark` imports `@/assets/dove-green.png`, which exists. Most likely the issue is the `<NatureBackground />` haze + the dove sitting inside a glass card with low contrast on mobile. Fix by:
  - Wrapping the brand lockup in a soft circular cream chip (`bg-white/80 rounded-full p-2`) behind the dove so it stands out against the glass card on every device.
  - Verify the asset import path resolves at runtime in the published build (the dove uses a relative `@/assets/...` import, which should be fine; if the build manifest is the culprit we'll move the three doves to `public/icons/` and switch to a plain URL).
- Small layout polish for mobile: increase top padding so the card isn't pinned to the iOS status bar, tighten the form spacing, and make the "Forgot password?" link wrap below `Remember me` on narrow screens (sub-360px).

**Post-signin bounce ("signed in, then signed out again")**
- Likely cause: on mobile Safari the `useAuth` hook subscribes to `onAuthStateChange` after `getSession()` resolves, so the very first session read can race with a stale token and trigger `RequireAuth` to redirect back to `/login`. Two changes:
  1. In `src/hooks/use-auth.ts`, set up the `onAuthStateChange` listener **before** calling `getSession()` (Supabase guidance) and only flip `loading=false` after the initial session resolves.
  2. In `src/components/require-auth.tsx`, guard against the brief "session=null while loading=false" window by also waiting one tick after `loading` becomes false before redirecting, and use `navigate({ to: "/login", replace: true })` so the back stack isn't polluted.
- Add a defensive check in `withEmail` (`login.tsx`): after `signInWithPassword` succeeds, call `supabase.auth.getSession()` once and only `nav({ to: "/home" })` after a session is confirmed.

---

## 3. Listen card cleanup

`src/routes/listen.tsx`
- Remove the white circular Play overlay centered on the thumbnail.
- Remove the "VIDEO"/"AUDIO" badge in the top-left of the thumb.
- In the bottom info strip (where title + speaker live), add a small leading icon based on `m.type`:
  - `video` → `Play` (filled triangle)
  - `audio` → `Headphones`
- Icon sits on the left at `size="sm"`, tone `active` (gold), aligned with the category line. The whole card remains clickable.
- Keep the subtle dark overlay on the thumb on hover to indicate interactivity, but no centered button.

---

## 4. Feedback bubble vs. mobile menu

`src/routes/__root.tsx` (floating button) + `src/components/app-shell.tsx` (bottom nav)
- On screens with the in-app bottom nav (authenticated routes, mobile), the gold feedback bubble collides with the rightmost menu item.
- Fix:
  - Public routes (no bottom nav): keep current position `bottom-6 right-6`.
  - Authenticated mobile: lift the bubble above the bottom nav (`bottom: calc(env(safe-area-inset-bottom) + 80px)`) **and** shrink to `w-10 h-10` so it doesn't hover over content.
  - Implementation: read current route via `useRouterState`/`useLocation` and apply a different className when the path is under an auth shell, OR move the floating button into `AppShell` for auth routes only and keep a separate, public-only instance in `__root.tsx`. We'll go with the second option (cleaner — each shell owns its own bubble).

---

## 5. Hero top padding on mobile

`src/routes/index.tsx` hero section and `src/routes/home.tsx` greeting block
- Landing hero: bump `pt-16` → `pt-24` on mobile (`pt-24 md:pt-24`) and add `pb-16` to give breathing room above "You are seen."
- Home greeting ("Rest gently tonight, Friend"): the streak pill currently overlaps the greeting text on narrow screens. Stack the streak pill **above** the greeting on mobile (it sits to the right on `md+`), and reduce greeting font size on sub-380px screens via `text-3xl xs:text-4xl md:text-5xl`. Also add `pt-safe` padding so the greeting clears the iOS status bar.

---

## 6. Horizontal scrolling feature cards on mobile

`src/routes/index.tsx` features section
- Replace the `grid sm:grid-cols-2 lg:grid-cols-3` with a responsive pattern:
  - Mobile (`<sm`): horizontal snap-scroll rail — `flex overflow-x-auto snap-x snap-mandatory gap-4 px-6 -mx-6 pb-2`, each card `min-w-[78vw] snap-start`.
  - Tablet+ (`sm:`): revert to existing grid (`sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible`).
- Add a subtle "swipe →" hint chip below the section title on mobile only.
- Same treatment for the **Bible stories** section and the **Phases** grid (currently `grid-cols-2 md:grid-cols-4`, fine, but tighten card padding on mobile to `p-4`).

---

## 7. Favicon swap

Use the uploaded square-bordered gold-dove tile.
- Copy `user-uploads://GraceNotes_Daily_favicon_1.png` to `public/icons/icon-512.png` and also generate the 192px + 180px (apple-touch-icon) sizes from it.
- No code changes needed in `__root.tsx`/`manifest.json` — those already reference the existing paths.
- Verdict on the design: the deep-green tile with the gold dove + olive branch is on-brand and works well at small sizes (the rounded square + thin gold border keep it legible against both light and dark home screens). Approved unless you want a tighter crop on the dove (currently has ~12% padding all sides; could go down to 8% for more impact at 32px).

---

## Out of scope (flagging for later)

- Replacing the static feedback bubble with an in-context "tap to feedback" affordance per page — bigger UX bet.
- Reworking the bottom nav to be a true iOS-style tab bar with haptics.
- Pulling the Listen thumbnails to a real CDN with consistent aspect ratios.

---

## Technical notes

- All changes are frontend-only; no schema or server-fn changes.
- Files touched: `src/routes/index.tsx`, `src/routes/login.tsx`, `src/routes/signup.tsx`, `src/routes/home.tsx`, `src/routes/listen.tsx`, `src/routes/__root.tsx`, `src/components/app-shell.tsx`, `src/components/require-auth.tsx`, `src/hooks/use-auth.ts`, `public/icons/*`.
- No new dependencies.
