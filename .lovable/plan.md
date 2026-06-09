## What's wrong

1. **Tracks invisible.** The app has two Supabase projects:
   - `src/lib/supabase.ts` → `tkoebogweygaabndrsvl` (real GraceNotes backend, where you added tracks)
   - `src/lib/tracks.functions.ts` → reads `process.env.SUPABASE_URL` = `jtjizrchmmmvphkndmhs` (Lovable Cloud project; `public.tracks` doesn't exist there — confirmed via SQL)

   So `getTracks()` queries the wrong project, returns `[]`, and the page shows the empty state.

2. **Two "All" chips.** `src/routes/listen.tsx` has a Type row (`All / Audio / Video`) and a Category row (`All / Praise / Worship / …`).

## Fix

### 1. Point Listen at the correct backend
Replace the server-fn fetch with a direct call from the already-configured browser client (`@/lib/supabase`), which points to `tkoebogweygaabndrsvl` and runs as the signed-in user (RLS policy `tracks_read` allows `authenticated`).

- In `src/routes/listen.tsx`, swap `queryFn: () => getTracks()` for a direct `supabase.from('tracks').select(...).eq('published', true).order('sort_order')`.
- Keep the same `Track` mapping and the `getSignedAudioUrl` flow for audio playback (that server fn already correctly uses the tkoebo service role via `supabaseAdmin`).
- Delete `src/lib/tracks.functions.ts` (no longer used; it was pointing at the wrong project).

This is the smallest correct fix and matches how the rest of the app already reads tkoebo data from the browser client.

### 2. Drop "All" from the Type row
In `src/routes/listen.tsx`:
- Change the Type filter array from `["All", "Audio", "Video"]` to `["Audio", "Video"]`.
- Default `activeType` becomes `"Audio"` (most tracks are audio) — or keep "All" as default by making it a tri-state where neither chip is selected = all. Simpler: default to `"Audio"`, since the Category row still has its own "All" for the catch-all view.

If you'd rather the default still show everything, I'll make it a toggle pair where clicking the active chip deselects it (selected = filtered; none selected = all). Tell me your preference when you approve.

## Verification
- Reload `/listen` → tracks you added should appear, filtered by the live category set.
- Only one "All" chip visible (in the Category row).
- Play one audio track end-to-end to confirm `getSignedAudioUrl` still works.

## Push to GitHub
Lovable auto-syncs every accepted change to the connected GitHub repo, so once you approve and the edits land, they're already on `main`. No separate push step needed. (Deploy to the live site still requires Publish — separate step.)

## Files touched
- `src/routes/listen.tsx` — swap data source, trim Type filter
- `src/lib/tracks.functions.ts` — delete
