## 1. "Today's Grace Note" header — shrink label, move flag into popover

- Mildly reduce the label size on mobile: `text-sm` → `text-[13px]` (desktop unchanged).
- Remove the standalone flag icon from the header row. Row becomes: dove · "Today's Grace Note" · (i).
- Inside the existing info (i) popover, the bottom action row now holds two items on one line:
  - **Left:** "Edit your preferences →" (unchanged gold link).
  - **Right:** small flag icon only (no copy), `text-white/40` greyed but fully clickable, opens the existing report flow.
  - Row uses `flex items-center justify-between`.

## 2. Name capitalization — first letter only

`capitalizeFirst(name)` uppercases only the first character (`hellen` → `Hellen`, `mcDonald` → `McDonald`, `JOHN` → `JOHN`).
- Apply on save in `onboarding.tsx` and `settings.tsx`.
- Apply on read in `pickRhythmGreeting`, `home.tsx`, `top-bar.tsx`, Daily Rhythms subtitle.

## 3. Prayer page

Top: filter chips `All` · `Active` · `Answered`.

Sections by filter:
- `All` → Remember When (if ≥3 answered) + Active list + Answered list
- `Active` → Active list only
- `Answered` → Answered list only (no Remember When)

**Remember When:**
- Horizontal swipe row of 3 answered prayers.
- Rotation is **daily**, deterministic seed = `localTodayISO()` + user id. Same trio all day, rotates at midnight.
- Hidden when answered count < 3.

Active and Answered lists paginate 10 at a time with a "View more" button. Existing edit/delete/mark-answered/thanksgiving flows untouched.

## 4. Notes & Letters bottom → 3 Free Guides

Replace the bottom Foundations strip on `/library` with a "Free Guides" row:
- The Effective Prayer Toolkit (`/free-prayer-toolkit`)
- 7-Day Prayer Journal Starter Kit (`/7-day-prayer-journal`)
- A Guide to Fasting (`/fasting-guide`)

Compact card visual matches the article cards.

## 5. Signed-in "Back Home" CTA

On `/library/$slug`, guide pages, foundation articles, and SEO landing pages:
- `useAuth().user` present → header top-right CTA reads **"Back Home"** with the mobile-Home sun icon, and the bottom CTA card uses signed-in copy.
- Signed-out → current "Come on in" behavior unchanged.

### Signed-in card copy (no dashes)

Article:
> **Carry this back with you.**
> Your prayer list, today's Grace Note, and your Heart Notes are waiting. Bring what stirred in you here into the quiet space you have been keeping.
> Button: ☀ Back Home

Guide:
> **Practice it in your space.**
> Open GraceNotes Daily to put this into rhythm. Your prayer list, devotional, and journal are one tap away.
> Button: ☀ Back Home

## 6. No em / en dashes anywhere

Hard rule across every string added or modified: no `—` or `–`. Use periods, commas, or spaced hyphens. Matches the existing `stripEmDashes` policy.

## Files touched

- `src/routes/home.tsx` — label size, header flag removed, popover row updated.
- `src/lib/personalization.ts` — `capitalizeFirst` + apply in greetings.
- `src/routes/onboarding.tsx`, `src/routes/settings.tsx` — capitalize on save.
- `src/components/top-bar.tsx` — capitalize on read.
- `src/routes/prayers.tsx` — filter chips, daily-seeded Remember When, pagination.
- `src/routes/library.index.tsx` — Foundations → Free Guides at bottom.
- New shared `BackHomeCTA` component used by article/guide/landing routes.

No backend changes, no migrations.
