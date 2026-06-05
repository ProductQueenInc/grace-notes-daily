## Goal
Bring `CLAUDE.md` up to date with everything that's landed since the 2026-05-25 entry, so the next session opens with an accurate handover.

## What I'll add / change

**1. Bump header** — "Last updated: 2026-06-05" and a new checkpoint note ("Google OAuth live, SEO expansion shipped, chat safety + cron grace notes in production").

**2. New "Recent changes (2026-06-05)" section** covering the verified commits since 2026-05-25:

- **Auth / OAuth**
  - Google sign-in buttons added on `/login` and `/signup` (commits `df1e569`, `6053f49`, `0b14c12`, `6474982`, `ec6d89c`).
  - `src/routes/auth/callback.tsx` handles the OAuth return.
  - `use-auth.ts` profile-load adjustments (`9b1b8e0`).
  - Email-storage security fix migration `20260604231624_…sql` (`a962f81`, `54a18df`).

- **AI voice / prompts**
  - Grace note + chat-reply system prompts rewritten in God's voice (`016beeb`).
  - Heart-note examples, sign-off, and `max_tokens` adjustments (`6f04a8e`).
  - Fallback grace-note prompt aligned with new brief style (`16ab529`).

- **Daily grace-note cron**
  - New edge function `supabase/functions/generate-daily-grace-notes/index.ts` (cron-driven pre-generation, timezone-aware) — note this is the one remaining edge function alongside `chat-reply`.

- **Chat safety system** (`supabase/functions/chat-reply/index.ts`)
  - Three-tier safety: crisis keyword detection → Haiku-based SAFE/MILD/HARMFUL classifier → streaming SSE reply.
  - Crisis path looks up `crisis_lines` by `profiles.country_code`, logs to `chat_flags`, closes session with `status = 'closed_crisis'`.
  - Harmful path redirects + closes session as `closed_inappropriate`.
  - JWT validated server-side; `user_id` derived from claims, never trusted from body.
  - Document new tables: `chat_sessions`, `chat_flags`, `crisis_lines`, plus RPC `increment_session_message_count`.

- **SEO expansion** (`274fab6` + follow-ups)
  - 6 new landing routes: `/quiet-time-app`, `/faith-habit-tracker`, `/answered-prayer-tracker`, `/7-day-prayer-journal`, `/free-prayer-toolkit`, `/fasting-guide`.
  - 3 content guides under `/content/`: `christian-journaling.md`, `prayer-journaling.md`, `daily-devotional.md` + matching routes.
  - New components: `share-bar.tsx`, `download-guide-modal.tsx`, `site-footer.tsx`.
  - `public/llms.txt`, expanded `sitemap.xml`, updated `manifest.json`.
  - WCAG AA contrast fixes on SEO cards (`048e5da`).

- **UX polish**
  - Devotional card shows "received" state after completion (`9d34f29`).
  - Timezone-correct greeting, modal positioning, daily-chat silent-failure fix, grace-note date override (`3c6a95e`).

- **Docs**
  - `README.md` and `BRAND.md` added and corrected over several passes (`4e2750f`, `0cbe97a`, `c5fd1f8`, `cc01f5f`).

**3. Update §0 "Build status"**
- Move Google OAuth, SEO landing pages, chat safety system, and daily grace-note cron into ✅ Complete.
- Update "Needs Cindy" list: drop items already done (OAuth redirect URLs are configured); keep PWA icon-192/512 if still pending.
- Note that there are now **two** Supabase edge functions live (`chat-reply`, `generate-daily-grace-notes`) — the rest of the server logic remains TanStack server functions.

**4. Update §9 "Quick reference"** with the new files: `chat-reply/index.ts`, `generate-daily-grace-notes/index.ts`, `share-bar.tsx`, `download-guide-modal.tsx`, `site-footer.tsx`, `auth/callback.tsx`.

**5. Leave untouched**
- Frontend conventions (§2), imagery policy (§8a), habit auto-mark rule (§4.1), Profile shape (§3) — none of these changed.
- The "Where we are" handover line at the top stays, updated to reflect current state ("Google OAuth live; next: Path B native via Capacitor — push notifications + app icon from dove medallion").

## Out of scope
No code changes. CLAUDE.md only.
