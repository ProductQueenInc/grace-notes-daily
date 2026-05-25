## 1. Heart-note reply — tone + format

Edit `src/lib/ai.functions.ts → callRespondToHeartNote`:

- Cut target length to **3–4 sentences**.
- Drop the required `"Love, your Father" / "Held, your Father"` close — make sign-off optional, one short line at most, no bolding.
- Add explicit bans to the existing `NO_OVER_FAMILIARITY` block (or a new "Heart-note-specific" addendum):
  - No bold markdown anywhere (`**name**`, `**sign-off**`).
  - No name-as-opener (the model keeps writing "**Cindy.**" as the first beat).
  - No aphoristic climbs ("X doesn't mean Y. It means Z.").
  - No rhetorical lists of "Every… Every… Every…".
  - No "I see it" / "I see you" stage direction.
  - Reply to what they actually wrote with concrete language — mirror a noun or verb from their note when natural.
- Lower `max_tokens` from 300 → 220 so the model can't pad.
- Keep the em-dash sanitizer.

Result: closer to a steady friend texting back than a poetic monologue.

## 2. Heart-note reply — remove label

Edit `src/routes/heart-notes.tsx`:

- Delete the `<p className="text-xs uppercase tracking-wider text-grace mb-2">A gentle reply</p>` line.
- Keep the gold left border + italic Fraunces styling — that visual treatment alone signals it's the reply.
- Light spacing tweak so the reply doesn't sit too tight at the top.

## 3. Journey card — kill the duplicate prayer body

Edit `src/routes/journey.tsx`:

- For `type === "prayer"` rows, the `title` already contains the truncated prayer text. When expanded, do **not** render the full `body` paragraph again — only render the gratitude block (`extra`).
- Heart-note rows continue to show title (preview) + full body on expand — they're genuinely different content.

## 4. Journey filters — remove date filter, fix dropdown padding

Edit `src/routes/journey.tsx`:

- Remove the `<input type="date">` chip and the `dateFilter` state + filtering logic entirely.
- Replace the native `<select>` with the shadcn `Select` component (matches the rest of the app, gives proper chevron + padding, themed colors). Falls back to keeping the native select with `appearance-none pr-9` and a positioned `ChevronDown` icon if shadcn Select doesn't fit the glass-on-hue look — I'll pick whichever reads cleaner.
- Add `Calendar`/`X` imports cleanup (no longer needed).

Navigation in this view is now: search + type filter + pagination (previous/next). That covers the stated fallback.

## 5. PWA install — ready to test

Already in place:
- `public/manifest.json` with name, short_name, start_url `/home`, standalone display, theme color, all icons.
- `public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` all present.
- `<link rel="manifest">` and `<link rel="apple-touch-icon">` + `theme-color` meta wired in `src/routes/__root.tsx`.

No code change needed. After publishing, on iPhone Safari: Share → Add to Home Screen. On Android Chrome: install prompt should appear, or use ⋮ → Install app. The app launches standalone (no browser chrome), opens to `/home`, and the green status bar tint matches.

If the install button doesn't show on Android, it's almost always a service-worker requirement — that's the only remaining piece for a "true" installable PWA on Chrome. Out of scope for this turn; flag it if you'd like a follow-up.

## Files touched

- `src/lib/ai.functions.ts` — heart-note prompt + token cap
- `src/routes/heart-notes.tsx` — remove label
- `src/routes/journey.tsx` — drop duplicate prayer body, remove date filter, polish dropdown

No DB changes, no new dependencies.
