Four items, tackled in order. QA sweep of my last shipped work first, then the polish.

## 0. QA of what I just shipped (before the polish)

Verify against the runtime signal + code before touching anything else:

- **Fix the hydration mismatch** flagged in the runtime error snapshot. `posthog.init(...)` inside `useEffect` still injects `<script src="us-assets.i.posthog.com/array/...">` into `<head>` fast enough to race React's hydration diff on `/`, so the SSR JSON-LD script and the injected PostHog script end up in the same slot on client. Defer the init to `requestIdleCallback` (fallback `setTimeout(fn, 0)`) inside the existing `useEffect`, and set `posthog.init(..., { disable_surveys: true, autocapture: false })` explicitly — belt and suspenders so hydration finishes before any DOM injection.
- Confirm `identifyUser` fires on both auth paths (hydrated `getSession` + subsequent `onAuthStateChange`), and `resetAnalytics` on `SIGNED_OUT`.
- Confirm `grace_note_responded_to` dedupe is per local day (localStorage key format `gn:analytics:responded:YYYY-MM-DD`) and doesn't fire on assistant reloads or existing-message loads.
- Confirm `deleteInferredTheme` server fn: passes `requireSupabaseAuth`, filters on `id = userId`, invalidates `daily-grace-note` query on success.
- Empty-state and loading copy in the Settings themes panel readable in dev mode; chip × button has aria-label.

## 1. Dove medallion — larger, bolder, brand-first

**File:** `src/routes/home.tsx` (grace note card header, line 124)

Current: `<DoveMark variant="medallion" className="w-8 h-8 shrink-0 drop-shadow-sm" />`

Change: bump to `w-10 h-10 sm:w-11 sm:w-11` and strengthen the shadow (`drop-shadow-md`). Matches the visual weight the Sparkles/star icons used to carry — reads as an intentional brand mark, not an inline emoji. Also add a subtle `ring-1 ring-gold/25` glow so it registers on the busy nature backgrounds (see the tiny-medallion screenshot).

## 2. Text-size QA pass — nothing under 12px in chrome

Sweep every `text-xs` and `text-[11px]/[13px]` in user-facing chrome and lift by one step where it reads as fine print in the screenshots.

Concrete edits:

- **Landing "All entries secure"** (`src/routes/index.tsx:183-185`): `text-xs` → `text-sm`, icon `w-3.5 h-3.5` → `w-4 h-4`, gap `gap-1.5` → `gap-2`. Same treatment on any other reassurance strip that uses the tiny 12px.
- **Home grace card header** (`src/routes/home.tsx:125`): `text-[13px] sm:text-[15px]` → `text-[15px] sm:text-base` (the truncated title in the screenshot is objectively small on desktop too).
- **Home grace card action pills** (share icon, verse toggle, line 172/176): `text-xs` → `text-sm`, keep the `min-h-9`.
- **Grace card info popover copy** (line 141): confirm `text-sm` — good already.
- **Settings themes panel description + empty state**: bump `text-xs` → `text-sm`; the description carries weight and shouldn't feel like a legal footnote.
- **Sidebar "Conversation resets at midnight" caption and similar micro-text**: `text-xs` → `text-sm`.

Rule I'll apply throughout: no `text-xs` for anything a user must read to understand the product. `text-xs` stays only for true metadata (timestamps, "beta" chips).

## 3. Grace card header — stop the truncation

The header stacks 5 elements: medallion, title, info button, share button, "Hide/Show Verse" pill. On mobile the pill is 90–100px wide and forces the title into an ellipsis.

**Recommendation: turn the Hide/Show Verse pill into an icon-only toggle.**
- Replaces the ~95px pill with a 36×36 icon button (Eye / EyeOff from lucide), same min-h-9 pill styling as the other two.
- Header now holds: `[medallion] Today's Grace Note [info] · · · [share] [eye]` — three uniform 36×36 pill icons on the right, and the title gets the full remaining width.
- On sm+ screens keep the pill's label as `aria-label` and add a tooltip so intent stays obvious; text isn't needed to communicate the action once the eye/eye-off convention lands.
- No medallion reduction, no title downsize, popover unchanged.

**Why this over the alternatives** (nesting share/hide inside the info popover, or dropping share): the two toggles that get most tapped are exactly Share and Verse; putting Verse behind another tap would hurt daily use. Icon-only is the smallest structural change with the biggest headline breathing room, and stays visually parallel with Info+Share which are already icon-only.

I'll keep the `Popover` info button as-is on the left of the title (it's the anchor for the personalization explanation) and the two icon toggles right-aligned.

## 4. Copy alternatives for "What we're noticing in your chats"

You're right — the word "noticing" reads observational/surveil-y. Six options, each a different frame:

1. **"Threads we're carrying with you"** — puts us alongside, not watching. Threads = themes without saying "we scanned you."
2. **"What your daily chats have shaped"** — the chats are the actor; we're just reflecting the shape.
3. **"Themes shaping your Grace Notes"** — most literal about the actual mechanic; user sees why it matters.
4. **"The season you're in right now"** — leans into the app's existing seasons/rhythms vocabulary; poetic, not clinical.
5. **"What's been on your heart lately"** — mirrors the daily chat prompt copy ("What's on your heart today?"); feels continuous with the ritual.
6. **"How your Grace Notes are learning you"** — direct about the feedback loop; may still feel too surveil-y for you — flagged.

**My pick: #3 "Themes shaping your Grace Notes"** paired with the sub-copy: "These are drawn from your daily chats. Remove any that don't fit — your next note will shape around what's left." It's honest about the mechanism, uses "themes" (soft, brand-adjacent), and centers the user's benefit (the note gets better) instead of our observation.

I'll wire whichever you pick. If you don't reply before I finish, I'll ship #3 as the default and note it in the closing message so you can swap it in one line if you'd rather have another.

## Verification

- Preview at desktop + mobile viewport, screenshot the grace card + landing hero + settings themes panel, confirm no truncation and text sizes read comfortably.
- `bunx tsgo --noEmit` clean.
- PostHog: refresh `/` and confirm no hydration error in console; check the events dashboard for `$pageview` firing.
