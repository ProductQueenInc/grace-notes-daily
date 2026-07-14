## Frontend: inferred_themes personalization + PostHog events

### 1. Replace "What you're carrying right now" in Settings with a read-only themes panel

**File:** `src/routes/settings.tsx`

- Remove the 10-chip season picker and its save logic (stop writing `profiles.seasons`; existing values left untouched).
- Add a "What we're noticing in your chats" panel that reads `profiles.inferred_themes` (jsonb: `{ themes: [{ theme, weight, last_seen }], updated_at }`).
- Render each theme as a chip with a small × delete button. Empty state: soft copy like "Nothing yet — as you chat, gentle themes will show up here."
- Delete = server function that rewrites `inferred_themes.themes` without that entry (RLS: own row only). On success, refetch + fire `theme_deleted_by_user` with `{ theme }`.
- Copy tone stays soft/held per brand voice.

**New server fn:** `src/lib/profile-themes.functions.ts`
- `getInferredThemes()` — `.middleware([requireSupabaseAuth])`, returns `{ themes, updated_at }`.
- `deleteInferredTheme({ theme })` — filters the theme out and updates `profiles.inferred_themes`.

### 2. Refresh the grace note when Settings closes

**Files:** `src/routes/settings.tsx`, `src/hooks/use-daily-grace-note.ts` (light touch only if needed)

- On unmount of Settings (or on successful theme delete), invalidate the daily grace note query so the next visit to `/home` refetches. No visual change on the Settings page itself.

### 3. PostHog client + two events

**Setup:**
- `bun add posthog-js`
- Add `VITE_POSTHOG_KEY` (user provides — public `phc_...` key from PostHog project 449655).
- New file `src/lib/analytics.ts` — thin wrapper: `initPostHog()`, `identifyUser(user)`, `capture(event, props?)`. No-op when key is missing so dev/preview stays clean.
- Init in `src/routes/__root.tsx` (client-only, inside a `useEffect`). Identify on auth state change in `src/hooks/use-auth.ts` (`posthog.identify(user.id, { email })`); reset on sign-out.

**Events:**
- `grace_note_responded_to` — fired in `src/hooks/use-daily-chat.ts` the first time the user sends a message today. Dedupe with a `localStorage` key `gn:analytics:responded:<YYYY-MM-DD>` so it's once per user per local day. Props: `{ date }`.
- `theme_deleted_by_user` — fired in Settings on successful delete. Props: `{ theme }`.

Server-side events (share_events, share_clicks, signup_attributed via DB triggers) are untouched — they already flow into the same PostHog project.

### Explicit non-goals
- Not touching `faith_phase`, the grace-note edge function, its prompt, or `profiles.seasons` values.
- Not adding any admin UI for themes; delete is the only user-facing mutation.
- Not adding IntersectionObserver / view tracking — `grace_note_responded_to` replaces `grace_note_viewed` per your call.

### Verification
- Settings shows chips reflecting `inferred_themes.themes` when present; empty state otherwise. Delete removes the chip and it stays gone after reload.
- After deleting a theme and returning to `/home`, the grace note query refetches.
- PostHog live events view (project 449655) shows `grace_note_responded_to` once per day per test account, and `theme_deleted_by_user` on each chip delete with the correct `theme` property.

### What I still need from you
- The `VITE_POSTHOG_KEY` value (public project API key from PostHog → Project Settings). I'll open the secret input when you approve the plan.
