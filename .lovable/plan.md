
# GraceNotes Daily, Calm-inspired UI: finalized plan

This plan locks the design decisions, fixes the iconography question, defines the onboarding signals we will capture, and lists the exact files to touch. Frontend-only. Claude Code still owns Supabase, RLS, and AI calls.

## 1. Iconography, settled

We will use **Lucide React** as the single icon system across the entire app, no emojis in UI chrome. Lucide is open source (ISC), already installed, tree-shakable, line-style consistent, and it pairs better with our serif display than Material's geometric set. Material Symbols would force a second font load and a different visual weight; mixing Material with Lucide is what made the current screens feel inconsistent.

House rules (enforced via a wrapper):
- Stroke 1.75, size 20 default, 24 for nav, 16 for inline.
- Color: `text-white/85` on hue, `text-grace` on light, `text-gold` for active accents.
- Never put an emoji inside a button, badge, nav item, tile title, or input. Emojis are allowed only inside user-generated content (heart notes the user typed) and inside one curated "achievement" badge component.
- Replace all current emoji UI uses (`✦`, `✨`, `🥉`, `→`, etc.) with Lucide equivalents: `Sparkle`, `Sparkles`, `Medal`, `ArrowRight`.

If we ever need a glyph Lucide does not have (e.g. a specific religious mark), we will pull from **Phosphor Icons** (MIT), matched at stroke 1.5, and only via the same wrapper, so weights stay coherent. We will not mix in Material, Heroicons, or Tabler.

New file: `src/components/icon.tsx` — a thin Lucide wrapper that applies the defaults and the on-hue / on-light color logic. Every page imports from `@/components/icon`, not `lucide-react` directly.

## 2. Typography

Decision: **switch display to Fraunces**, keep Nunito for body. Fraunces is a contemporary serif with soft optical sizes; at large sizes it reads warm and devotional, at small sizes it reads modern and editorial, which is exactly Calm's tonal register without copying their geometric sans. Cormorant feels closer to a wedding invitation, which dates us.

- Display: Fraunces, optical size 144, weight 300 for h1/h2, weight 500 for tile titles, italic for verses.
- Body: Nunito 400/600.
- Loaded via `<link>` in root with `display=swap` and preconnect to fonts.googleapis.com.

Logo: when you upload the Canva file, we will place it at `src/assets/logo.svg` and use it in the sidebar header and on the marketing nav. Until then, the wordmark stays as text in Fraunces.

## 3. Surface system: green haze plus light reading mode

We adopt **both**, with a clear rule for when each applies.

Default authenticated surface: green haze (radial gradient over nature backdrop, dark glass cards, white/90 text). This is the "ambient" surface used by Home, Listen, Journey, Prayers, Settings.

Reading mode (light, soft glass): used **only inside content readers**, specifically:
- Devotional modal (already exists)
- Heart Note detail view
- Any long-form scripture passage view added later

Reading mode is not stark white. It is a **warm parchment glass**: `background: linear-gradient(180deg, oklch(0.985 0.012 90 / 0.92), oklch(0.965 0.02 85 / 0.88))`, `backdrop-filter: blur(20px)`, `border: 1px solid oklch(0.92 0.03 85 / 0.6)`, soft inner glow. The nature backdrop still shows through faintly at the edges, which keeps the app feeling like one continuous space rather than two themes. Body text in reading mode is `oklch(0.25 0.03 150)` for high legibility; verses get a left rule in gold.

New token group in `styles.css`:
- `--surface-haze`, `--surface-haze-card`, `--text-on-hue` for ambient
- `--surface-parchment`, `--surface-parchment-border`, `--text-on-parchment` for reading
- New utility classes: `.glass-on-hue` and `.glass-parchment`

## 4. Side nav, collapsed by default

Default desktop state: **56px icon rail**, expanded to 256px on hover after a 120ms delay or on explicit pin (a small pin button in the sidebar footer persists the choice to localStorage). Collapsed rail shows icon + tooltip on hover; active item gets the gold left indicator and a subtle white/8 background, so users can navigate confidently without ever expanding.

Icons (Lucide), to make collapsed nav unambiguous:
- Today: `Sun`
- Devotional: `BookOpen`
- Daily Message: `MessageCircle`
- Heart Notes: `NotebookPen`
- Prayers: `HandHeart` (Lucide has this)
- Listen: `Headphones`
- Journey: `Compass`
- Settings: `Settings`
- Sign out: `LogOut` in footer

Mobile keeps the bottom tab bar (Home, Listen, Journey, Menu) and offcanvas drawer; no rail on mobile.

## 5. Player dock, present app-wide when audio is active

A single `PlayerDock` lives at the app shell level (rendered inside `AppShell`, outside the route outlet). It is hidden when no track is loaded. When a track plays, the dock slides up from the bottom on every authenticated route, sitting:
- Desktop: bottom-left, anchored 16px above the viewport edge, width 360px, glass-on-hue, does not overlap the sidebar rail.
- Mobile: above the bottom tab bar, full-width minus 16px gutters, 64px tall.

Behavior:
- Tap the dock title or cover to expand into the full Listen player (route push to `/listen?track=<id>` with the full player overlay).
- Mini controls: play/pause, 15s skip, close. No scrubber in mini, only a thin progress line at the top of the dock.
- State lives in a tiny Zustand store `useAudioPlayer` so Home, Journey, etc. all see the same playback.

This makes the dock feel like a natural extension of the app rather than a forced overlay.

## 6. Onboarding signals, just enough to personalize without being creepy

We extend onboarding from "name + faith phase" to a short, friendly 5-step flow. Each step is optional except step 1 and step 2. We capture only signals that have a direct, visible effect on the user's content within V1, plus one or two signals reserved for V2 (recommendations, gentle product surfaces). No date of birth, no location precision beyond timezone, no contacts, no demographic profiling.

Step 1: Name and preferred greeting form (first name, what should we call you).
Step 2: Faith phase (already exists: newbie / returnee / growth / elder). Drives tone and depth of devotionals and AI replies.
Step 3: Daily rhythm: pick up to 2 from {Morning quiet time, Midday reset, Evening reflection, Before bed}. Drives notification windows (later), the greeting copy at top of Home, and which audio rail appears first (Morning Calm vs Evening Stillness).
Step 4: What you are bringing to this season: pick up to 3 from {Anxiety, Grief, Gratitude, Discernment, Hope, Rest, Discipline, Relationships, Purpose, Doubt}. Drives devotional theme tagging and the order of "Today's path" tiles. Stored as `seasons[]`, refreshable from Settings, expires after 30 days so it adapts.
Step 5: Voice preference: a 2-choice card — {Held and gentle, Direct and grounding}. Drives AI tone for Grace Notes and Heart Note replies.

Optional, asked once at the end with a clear "skip" and an "and you can change this later" note:
- Timezone (auto-detected, user confirms): drives daily reset boundary and notification windows.
- Translation preference: ESV, NIV, NKJV, KJV, MSG. Drives verse rendering.

What we are deliberately **not** asking in V1:
- Denomination (too sensitive, can be inferred later from engagement).
- Specific struggles in free text (we offer chips instead, so we capture signal without storing raw confession data).
- Marital, parental, or financial status. These come later, contextually, only when a feature needs them.

Storage shape (frontend types now, schema for Claude later):
```
profile {
  id, name, faith_phase,
  rhythms: ('morning'|'midday'|'evening'|'night')[],
  seasons: { tag, set_at }[],
  voice: 'gentle' | 'grounding',
  timezone, translation,
  onboarded: true
}
```

How content uses it (frontend wiring now, stubs return shaped data, Claude swaps the source):
- `generateGraceNote(profile)` reads `voice`, `faith_phase`, top `season` to vary tone and topic.
- Home hero greeting uses `rhythms[0]` to pick "Good Morning" vs "Welcome back this evening" copy.
- "Today's path" rail orders tiles by current rhythm window.
- Listen rail title flips between "Morning stillness" and "Evening stillness" by current time and rhythms.

This is the foundation for the life-companion feel: every user-facing surface is shaped by 5 small inputs, and we can layer ads and recommendations later by intersecting `seasons` with content tags, never by harvesting raw personal data.

## 7. File-level change list

New:
1. `src/components/icon.tsx` — Lucide wrapper, default props, on-hue/on-light variants.
2. `src/components/app-sidebar.tsx` — shadcn Sidebar, collapsed-by-default rail, hover-expand, pin toggle.
3. `src/components/top-bar.tsx` — search, streak chip, avatar menu, glass-on-hue.
4. `src/components/scene-tile.tsx` — Calm-style image tile.
5. `src/components/rail.tsx` — horizontal snap-scroll section.
6. `src/components/player-dock.tsx` — global mini player.
7. `src/hooks/use-audio-player.ts` — Zustand store: `track`, `isPlaying`, `position`, `play`, `pause`, `seek`, `close`.
8. `src/components/reading-surface.tsx` — parchment-glass wrapper used by devotional modal and long-form reads.
9. `src/lib/scene-images.ts` — curated forest-dawn image map by category.
10. `src/lib/personalization.ts` — pure helpers: `pickRhythmGreeting`, `orderTodayTiles`, `pickListenRail`, `toneFromVoice`.
11. `src/routes/onboarding.tsx` — extend to 5 steps (replace current single screen).
12. `src/assets/logo.svg` — placeholder until you upload the Canva logo.

Edited:
13. `src/styles.css` — Fraunces import, new tokens (`--surface-haze*`, `--surface-parchment*`, `--text-on-hue`, `--text-on-parchment`), `.glass-on-hue`, `.glass-parchment`, new type scale.
14. `src/components/nature-background.tsx` — radial green-haze overlay, subtle grain, forest-dawn image set.
15. `src/components/app-shell.tsx` — replace top nav with `SidebarProvider` + `AppSidebar` + `TopBar`, mount `PlayerDock`, keep mobile bottom tabs and drawer.
16. `src/components/page-header.tsx` — switch authenticated styling to `.glass-on-hue`, remove eyebrow emoji, use `Sparkles` icon component.
17. `src/components/devotional-modal.tsx` — wrap content in `ReadingSurface` (parchment glass), drop emoji glyphs.
18. `src/routes/__root.tsx` — Fraunces + Nunito link tags, default head meta.
19. `src/routes/home.tsx` — restructure: hero with verse + habit ring, Rail 1 "Today's path", Rail 2 "Continue listening", Rail 3 "From your journey", footer band. Remove emoji glyphs.
20. `src/routes/listen.tsx` — integrate with `useAudioPlayer`; full-player view when expanded.
21. `src/routes/heart-notes.tsx`, `src/routes/prayers.tsx`, `src/routes/journey.tsx`, `src/routes/settings.tsx` — adopt `SceneTile`, `Rail`, new type scale, icon wrapper.
22. `src/hooks/use-auth.ts` and `Profile` type — extend with `rhythms`, `seasons`, `voice`, `timezone`, `translation`. Stub reads from localStorage until Claude wires Supabase.
23. `src/lib/ai-stubs.ts` — accept full `profile` input, vary stub copy by `voice` and top `season`.

## 8. Handoff notes for Claude Code

Append to `mem://index.md`:
- Iconography: Lucide only, via `@/components/icon`. No emojis in chrome.
- Display font: Fraunces. Body: Nunito. Loaded from Google Fonts in root.
- Two surfaces only: `glass-on-hue` for ambient screens, `glass-parchment` for long-form reading. Do not introduce other surface styles.
- Sidebar default state is collapsed rail; expanded width preference persists in `localStorage` key `gn:sidebar:pinned`.
- Player state lives in `useAudioPlayer`. Backend swaps track URLs only.
- Profile shape extends to `rhythms`, `seasons[{tag,set_at}]`, `voice`, `timezone`, `translation`. Build the Supabase `profiles` table to match. Add `season_tags` table for content tagging.
- Personalization helpers in `src/lib/personalization.ts` are the single source of truth for content ordering. Backend should feed them, not bypass them.
- Habit auto-mark rule unchanged: real action only.

## 9. Out of scope for this pass

- Notifications wiring (collect rhythm, do not schedule yet).
- Real audio streaming (use a few open-licensed sample tracks for now).
- Recommendation engine and ad surfaces (V2, but the data we collect supports them).
- Stripe or any paid tier surface.

Ready to implement when you approve. The logo upload can come after the first build; the wordmark renders cleanly in Fraunces until then.
