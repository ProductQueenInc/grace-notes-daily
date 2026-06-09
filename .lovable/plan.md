## What I verified (so you can trust the edits)

Ran direct checks against the repo and live DB. Here is what's actually true vs. what CLAUDE.md currently claims:

| Claim in CLAUDE.md | Reality | Action |
|---|---|---|
| "v2 schema is applied; tables `verses`, `crisis_lines`, `user_verse_log`, `daily_grace_notes`, `chat_sessions`, `chat_flags` exist" | True — all six tables present with RLS + policies | keep |
| "RPCs `select_verse_for_user`, `increment_session_message_count` exist" | True (used by chat-reply) | keep |
| Action #1: "Seed `crisis_lines`" still pending | True — `crisis_lines` is empty (0 rows). Without it, the crisis branch of `chat-reply` has no hotline to return. | keep, sharpen wording |
| Action #2: "Schedule grace-note cron in pg_cron" still pending | True — only `process-email-queue` is scheduled in `cron.job`. `generate-daily-grace-notes` is NOT scheduled. `daily_grace_notes` has 0 rows. | keep, sharpen wording |
| Action #3: "Add PWA icons" still pending | **FALSE.** `public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `icon-source.png` all exist and are correctly referenced from both `manifest.json` and `__root.tsx`. | **remove** |
| Action #4: "Master 1024×1024 app icon" pending | Partially false — `icon-source.png` exists in `public/icons/`. Still useful to note a true 1024 master is needed for App Store/Play Store later. | reword to "verify icon-source.png is 1024×1024 before native build" |
| "Both paths use `claude-haiku-4-5`, temp 0.7" | True — verified at `ai.functions.ts:213` and `generate-daily-grace-notes/index.ts:115` | keep |
| Files in §12 quick-reference (ai.functions.ts, ai-stubs.ts, personalization.ts, badges.ts, supabase.ts, use-daily-grace-note.ts, chat-reply, generate-daily-grace-notes, seed scripts, JSON libraries, capacitor.config.ts) | All exist | keep |
| `verses` library "unseeded, currently unused" | True (0 rows; cron lets model pick its own verse) | keep |
| Listen audio uses dummy URLs (`db/002_tracks.sql`) | File exists | keep |
| Tally feedback button on all pages | `feedback-dialog.tsx` exists | keep |
| `chat_flags`, `chat_sessions`, `crisis_lines` all backed by RLS | True (policies present) | keep |

Also worth noting (NOT changing without your approval — flagging for visibility):
- `src/routes/login.tsx` uses `supabase.auth.signInWithOAuth("google", …)` directly instead of the Lovable broker (`lovable.auth.signInWithOAuth`). It works today on your domain, but the Lovable docs prefer the broker for managed OAuth. I'd leave this alone unless you hit a redirect/scope issue.

## What I'll change in CLAUDE.md

1. **TL;DR section**: drop the "PWA still needs `icon-192.png` / `icon-512.png`" line.
2. **§2 "Built but inactive"**: delete action #3 (PWA icons) entirely. Reword #4 to: "Verify `public/icons/icon-source.png` is a true 1024×1024 master before any Capacitor native build." Tighten #1 and #2 with the exact verified status ("`crisis_lines` is empty — confirmed 0 rows", "no `generate-daily-grace-notes` job in `cron.job` — confirmed").
3. **§2 "Live in production"**: append "(0 rows today — fills once cron is scheduled)" beside the `daily_grace_notes` reference so the next reader doesn't think it's broken.
4. **§11 recent changes log**: add a 2026-06-09 bullet noting the doc QA pass and what was corrected (PWA icons removed from todo; cron + seed remain).
5. **§12 quick-reference**: no changes — all entries verified.

## Out of scope
- No code changes.
- No new migrations.
- No frontend touches.
- No changes to the canonical grace-note prompt or the chat-reply safety system.

After you approve, I'll switch to build mode and make exactly the edits above — nothing else.