# CLAUDE.md — GraceNotes Daily Handover

This document hands the **backend + AI wiring** of GraceNotes Daily over to Claude Code. The frontend is intentionally complete and opinionated; please change as little of it as possible.

Last updated: 2026-05-11.

---

## 1. What this app is

GraceNotes Daily is a soft, devotional companion web app (Calm-inspired visual UX, distinctly Christian voice). Tone: *soft, held, seen, welcome — never pushy*.

- Product name: **GraceNotes Daily** (one word: "GraceNotes")
- Stack: TanStack Start v1 + Vite 7 + React 19 + Tailwind v4
- Hosting: Cloudflare Worker (edge). All server code runs in a Worker runtime — see `<server-runtime>` rules below.
- Backend: **Lovable Cloud** (Supabase under the hood). Already connected; credentials live in `.env`:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Auth helper: `src/lib/supabase.ts` exports `supabase` and `supabaseConfigured`.

---

## 2. Frontend conventions you MUST follow

These are locked in the project memory. Do not violate them when adding backend hooks.

| Rule | Where it lives |
|------|---------------|
| Two surfaces only: `.glass-on-hue` (ambient) and `.glass-parchment` (long reads) | `src/styles.css` |
| Display font: **Fraunces**. Body: **Nunito**. Loaded in `__root.tsx` | `src/routes/__root.tsx` |
| Brand greens `--grace`, `--grace-deep`, `--grace-mid`, `--grace-haze`; accent `--gold` | `src/styles.css` |
| Iconography: **Lucide only**, always through `@/components/icon` (`<Icon icon={X} size="..." />`) | `src/components/icon.tsx` |
| No emojis in chrome — only inside user-generated content | — |
| Authenticated pages use `<NatureBackground />` + a hero block or `<PageHeader />` | `src/components/nature-background.tsx`, `src/components/page-header.tsx` |
| Sidebar: collapsible-icon shadcn sidebar, expanded by default; pin preference persists at `localStorage["gn:sidebar:pinned"]` | `src/components/app-sidebar.tsx` |
| Global persistent audio player `<PlayerDock />` rendered inside `<AppShell />`; state in zustand store | `src/hooks/use-audio-player.ts`, `src/components/player-dock.tsx` |

When adding data fetching, prefer **TanStack Query** with `createServerFn`-style stubs. Do not introduce a different data layer.

---

## 3. Stubs to replace (the actual handover surface)

All AI / content stubs live in **one file**: `src/lib/ai-stubs.ts`. Replace each function's body; keep the same exported signature.

```ts
generateGraceNote(profile: Profile | null)  → { message, verse, signed }
respondToHeartNote(text, profile)           → string
respondToDailyMessage(text, profile)        → string   // conversational reply
generateDevotional(profile)                 → { title, verseOfDay, verseRef, date, body[], related[], takeaway }
```

Personalization helpers used by every stub:

```
src/lib/personalization.ts
  pickRhythmGreeting(profile, date)   // morning/midday/evening/night greeting
  pickListenRailTitle(profile, date)
  toneFromVoice(profile)              // "gentle" | "grounding" | …
  topSeason(profile)                  // first season tag
```

`Profile` shape (extended for personalization):

```ts
type Profile = {
  name: string
  email?: string
  phase?: string                       // faith phase: "exploring" | "growing" | "deepening"
  rhythms?: ("morning"|"midday"|"evening"|"night")[]
  seasons?: { tag: string; set_at: string }[]
  voice?: "gentle" | "grounding"
  timezone?: string
  translation?: string                 // bible translation pref, e.g. "NIV"
}
```

Onboarding is **5 steps** (`src/routes/onboarding.tsx`); the values it captures map 1:1 to the fields above. Do not capture additional PII without a UX change.

---

## 4. Local frontend state that you must move to Supabase

The frontend uses `localStorage` as a temporary store. Each item below should become a Supabase table + RLS policy. Keep the same hook API so the React components don't change.

### 4.1 Habits — `useHabits()` (`src/hooks/use-habits.ts`)
- Storage key: `gn:habits:YYYY-M-D`
- Shape: `{ devotional: boolean, dailyMessage: boolean, journal: boolean }`
- **Critical rule (in core memory)**: a habit is **only** marked complete by performing the underlying action — never on a circle click. Clicking a habit circle navigates the user to the action surface.
  - `devotional` → user taps "I Receive This" inside `<DevotionalModal />`
  - `dailyMessage` → user **sends** a chat message in the daily-message thread
  - `journal` → user submits a Heart Note
- Suggested table: `daily_habits (user_id uuid, date date, devotional bool, daily_message bool, journal bool, primary key (user_id, date))`

### 4.2 Daily message chat — `useDailyChat()` (`src/hooks/use-daily-chat.ts`)
- Storage key: `gn:daily-message:YYYY-M-D`
- Shape: `{ id: string; role: "user"|"assistant"; text: string; ts: number }[]`
- Thread **resets at midnight** in the user's local time.
- Suggested table: `daily_messages (id uuid pk, user_id uuid, date date, role text check (role in ('user','assistant')), text text, ts timestamptz)`
- Server function should:
  1. Insert the user message.
  2. Call the AI (whichever provider) with previous-message context + the user profile.
  3. Insert the assistant reply.
  4. Return the assistant message.

### 4.3 Heart Notes — `src/routes/heart-notes.tsx`
- Currently in component state. Move to a `heart_notes (id, user_id, body, mood?, created_at)` table.

### 4.4 Prayers — `src/routes/prayers.tsx`
- Same pattern. Table `prayers (id, user_id, body, answered bool default false, answered_at timestamptz, created_at)`.

### 4.5 Sidebar streak (`<AppSidebar />`) and home progress
- The frontend currently hardcodes `streak = 1`. Compute it server-side from `daily_habits` (consecutive days with all 3 habits complete = gold streak; partial days break it).
- Badges (`src/lib/badges.ts`): `none → copper (1/3) → silver (2/3) → gold (3/3)`. Used in the home progress card and the calendar coin. Don't move this enum; just feed it real counts.

---

## 5. User roles & RLS

Follow the standard Lovable pattern (separate `user_roles` table + `has_role()` security-definer function). **Never** store roles on a profile/users table.

Default policies:
- Every habit/journal/prayer/message row: `user_id = auth.uid()` for both `select` and `insert/update`.
- No public read on any user-content table.

---

## 6. Server runtime gotchas (Cloudflare Worker)

You're not on Node. nodejs_compat is enabled but some things are stubbed/missing.

- **Safe**: `fs`, `path`, `crypto`, `Buffer`, `stream`, `url`, `http`, `https`, `zlib`, `fetch`
- **Unsafe** (don't use in server functions): `child_process`, `sharp`, `canvas`, `puppeteer`, `fs.watch`, full `os.*`
- All npm packages must be fully bundled at build time; no runtime module resolution.
- Never set `ssr.external` in `vite.config.ts`.
- Server functions must live in client-safe paths (e.g. `src/lib/*.functions.ts`) — do not put them under `src/server/`.
- Read `process.env.X` **inside** the `.handler()`, not at module scope.
- Auth-protected server functions only work in components or under `_authenticated/` routes — never in a public route's `loader` (prerender will 401).

See the canonical example in the `<server-function-authoring>` section of the system prompt.

---

## 7. Recommended migration order

1. **Auth + profile**: confirm `useAuth` returns a `Profile` matching section 3. Add a `profiles` table mirroring that shape, plus a trigger on `auth.users` to insert a default row.
2. **Onboarding writes**: wire `src/routes/onboarding.tsx` to update `profiles`.
3. **Daily habits + streak**: replace `useHabits` storage with Supabase; expose a `useStreak()` server fn.
4. **Daily message chat**: replace `useDailyChat` + `respondToDailyMessage`. This is the biggest stub.
5. **Heart notes** and **prayers** tables.
6. **Devotional**: replace `generateDevotional` with a real source (curated or AI). Cache per `(user_id, date)`.
7. **Listen / audio**: swap the dummy URLs in `useAudioPlayer` for signed Supabase Storage URLs.

---

## 8. Things to NOT touch

- `src/styles.css` (design tokens are locked)
- `src/components/app-sidebar.tsx`, `app-shell.tsx`, `nature-background.tsx`, `page-header.tsx`, `player-dock.tsx`, `icon.tsx`
- `src/components/ui/*` (shadcn)
- Onboarding step structure
- Habit auto-mark rule (section 4.1)
- Translation/voice/season options — these are the personalization contract

If you need to change any of the above, open a question for the human owner first.

---

## 8a. Imagery policy (locked)

GraceNotes Daily is a Christian devotional product. Every image (background, hero, illustration, audio cover art, marketing) must feel reverent and safe.

**Never allow:** alcohol (beer, wine, spirits, bars, drinking glasses), smoking, vaping, drugs, gambling; suggestive or revealing imagery; violence, weapons, blood; brand logos or commercial products; memes or flippant visuals; religious symbols from other faiths used decoratively; AI-generated images of identifiable real people.

**Prefer:** forests, mountains, dawn light, mist, still water, open fields, soft skies; hands, candles, open books, simple natural textures when relevant.

The ambient background list lives in `src/components/nature-background.tsx`. Vet every URL before adding it and keep the comment block at the top of that file in sync. The same rule applies to any storage-backed cover art wired up for the Listen feature later.

---

## 9. Quick reference

| Need | File |
|------|------|
| AI stubs | `src/lib/ai-stubs.ts` |
| Personalization | `src/lib/personalization.ts` |
| Badges | `src/lib/badges.ts` |
| Supabase client | `src/lib/supabase.ts` |
| Auth hook | `src/hooks/use-auth.ts` |
| Habits | `src/hooks/use-habits.ts` |
| Daily chat | `src/hooks/use-daily-chat.ts` |
| Audio player | `src/hooks/use-audio-player.ts` |
| Routes | `src/routes/*.tsx` |
