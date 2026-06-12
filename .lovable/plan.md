# Mobile Navigation & Homepage Copy Refresh

## 1. Mobile bottom tab bar — swap Journey for Prayers
- Update `MOBILE_TABS` in `app-shell.tsx` so the primary bottom tab becomes **Prayers** (icon: `HandHeart`) instead of Journey.
- Move **Journey** (icon: `Compass`) into the mobile drawer as a top-section item.
- Remove Prayers from the drawer since it's now a primary tab.
- New drawer top-section order: Heart Notes → Journey → Notes & Letters.

## 2. Mobile drawer — pin Settings + Sign out to the bottom
- Remove Settings from the main `DRAWER_ITEMS` list.
- Wrap main drawer items in a `flex-1` container.
- Add a bottom section (thin divider above it) with Settings, then Sign out.

## 3. Notes & Letters page — "Open app" → "Home" (logged-in)
- In `src/routes/library.index.tsx`, change the logged-in CTA button label from "Open app" to "Home". This applies to all viewports because the destination is `/home` for every signed-in user.

## 4. Homepage CTA — "Begin your journey" / "Get started" → "Come on in, get started"
- Update the non-logged-in CTA label in three places in `src/routes/index.tsx`:
  1. Hero section button.
  2. Final CTA section button.
  3. Header nav button (remove the mobile/desktop split so the same text appears on both).
- The logged-in "Open your space →" text stays unchanged.

**Files:** `src/components/app-shell.tsx`, `src/routes/library.index.tsx`, `src/routes/index.tsx`
**No backend or design-token changes.**