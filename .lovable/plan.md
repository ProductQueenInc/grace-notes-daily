## Findings (verified against repo + live DB)

**Migrations exist in repo but were never applied to live DB.** Files `supabase/migrations/20260529000001_gracenotes_v2_step1_schema.sql` and `20260529000002_gracenotes_v2_cron.sql` define every "missing" object:
- Tables: `verses`, `crisis_lines`, `user_verse_log`, `daily_grace_notes`, `chat_sessions`, `chat_flags`
- RPCs: `select_verse_for_user`, `increment_session_message_count`
- pg_cron schedule for `generate-daily-grace-notes`

Live DB has 15 tables, none of them from that migration pair. So both edge functions (`chat-reply`, `generate-daily-grace-notes`) and `use-daily-grace-note.ts` will fail at runtime today.

**Prompt drift confirmed.** `src/lib/ai.functions.ts:160` (the "God speaks as I" prompt with 5 worked examples + NO_EM_DASH_RULE) is the canonical version. The cron edge function ships a shorter, slightly different prompt and uses `claude-sonnet-4-6` while the fallback uses `claude-haiku-4-5`.

## Plan

### 1. Apply the missing migrations to the live DB
Run the two `20260529…` migration files as one approved migration so the live DB matches the repo. This unblocks the cron edge function, the chat-reply edge function, and `use-daily-grace-note.ts`.

After approval and apply: seed `crisis_lines` via `scripts/seed_crisis_lines.js` and `verses` via `scripts/seed_verses.js` (note in CLAUDE.md as a one-time post-migration step).

### 2. Unify the daily grace-note prompt
Make `src/lib/ai.functions.ts:160`'s `system` prompt the single source of truth. Specifically:

- Extract the full system prompt + the `NO_EM_DASH_RULE` from `src/lib/ai.functions.ts` into an exported constant, e.g. `GRACE_NOTE_SYSTEM_PROMPT(phaseDesc, seasons)`.
- Rewrite `supabase/functions/generate-daily-grace-notes/index.ts` so its `GRACE_NOTE_PROMPT` is replaced by the same text (inlined — edge function can't import from `src/`). Keep the verse already chosen by `select_verse_for_user` and pass it through; the cron prompt must still instruct the model NOT to quote it.
- Align the model: both paths use `claude-haiku-4-5` (cheap, fast, matches the fallback) unless we explicitly want Sonnet for cron — confirm with one line in CLAUDE.md.
- Both paths run through `stripEmDashes` / `sanitizeGraceNote` equivalent before returning.

### 3. Rewrite CLAUDE.md so it's a clean, truthful pickup doc

Structure:

1. **TL;DR — Where we are today** (3-5 bullets, current state of the world).
2. **What's live in production** — only what's actually deployed AND backed by DB objects. Move `chat-reply` and `generate-daily-grace-notes` out of "✅ Complete" until step 1 lands; after step 1 lands, mark them ✅.
3. **What's built but not yet active** — files/migrations/scripts that exist in the repo but need a one-time action (apply migration, run seed script, configure cron secret). Each entry names the file + the exact command.
4. **What's not started** — push notifications, listen/audio signed URLs, background image upload script, Path B Capacitor native build.
5. **Canonical references** — single-source-of-truth pointers:
   - Daily grace note prompt: `src/lib/ai.functions.ts` (the exported constant from step 2). Used by both on-demand fallback and cron.
   - Chat safety system: `supabase/functions/chat-reply/index.ts`.
   - Profile shape, habit auto-mark rule, imagery policy, frontend conventions — keep the existing §2/§3/§4.1/§8a sections; they're still accurate.
6. **Recent changes log** — keep chronological (2026-05-24, 2026-05-25, 2026-06-05, 2026-06-09 entry for this cleanup).
7. **Quick reference table** — file -> purpose, including the new shared prompt constant.

Remove or correct any claim CLAUDE.md currently makes that the codebase doesn't back up. After the rewrite, a fresh session reading CLAUDE.md alone should know exactly what runs, what's dormant, and what to do next.

## Out of scope
- No UI changes.
- No new features.
- No changes to onboarding, habits, prayers, heart-notes, or any frontend convention.
