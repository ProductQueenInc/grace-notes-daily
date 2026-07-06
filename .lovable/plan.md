## Diagnosis

"Up to date" is true — the new code IS live on production. I proved it: the cover proxy now returns the new diagnostic string ("Bucket not found (diag: ...)"), which only exists in the code we just shipped.

The problem is a **secret**, not code:

- `src/integrations/supabase/admin.server.ts` (the fix) hardcodes the URL to `tkoebogweygaabndrsvl.supabase.co` and reads the key from the `TKOEBO_SERVICE_ROLE_KEY` secret.
- I connected directly to that project via psql and confirmed: the `devotional-covers` bucket exists, and `daily_devotionals` has 8 rows including 2026-07-06 "The Love That Reaches First."
- Yet the production Worker gets "Bucket not found" from that same project and `null` from `getStoredDevotional`.
- That combination means the Worker IS talking to `tkoebogweygaabndrsvl` (URL is right) but the service-role token it's presenting is either wrong-project or invalid — so Supabase silently returns "no bucket, no rows" instead of your real data.

In short: the `TKOEBO_SERVICE_ROLE_KEY` value stored in Cloud secrets is not a valid service-role key for `tkoebogweygaabndrsvl`.

## Fix (no code changes)

1. In Cloud → Secrets, open `TKOEBO_SERVICE_ROLE_KEY` and paste the **service_role** key for the `tkoebogweygaabndrsvl` project (from that project's API settings). Must start with `eyJ…` and its decoded `ref` claim must be `tkoebogweygaabndrsvl`.
2. Save. Worker picks it up on the next request — no re-publish needed.
3. Verify:
   - `curl -I https://www.gracenotesdaily.com/api/public/devotional-cover/2026-07-06.png` → `HTTP/2 200`, `content-type: image/png`.
   - `https://www.gracenotesdaily.com/library/devotional/2026-07-06` → renders "The Love That Reaches First" instead of 404.

## Why this affects more than just that one link

Everything routed through `supabaseAdmin` is currently returning empty/404:
- All shared devotional pages (`/library/devotional/*`)
- All devotional cover images (og:image + library thumbnails)
- Signed audio URLs on Listen
- Share-card CDN proxy

They will all start working the moment the secret is correct — no republish, no regeneration.

## Optional follow-up (not part of this fix)

Add a tiny `/api/public/health/admin` route that returns `{ project_ref, buckets: [...] }` so future "wrong key" incidents show themselves in one curl instead of feeling like a code bug. I can add this after you approve the secret fix.