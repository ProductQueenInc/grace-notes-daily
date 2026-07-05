---
name: gracenotes-sharing-architecture
description: The verified runbook for GraceNotes Daily's BUILT sharing backend (roadmap Stage 2, shipped 2026-07-05) - the render-share-card edge function, background pools, caption rotation, share-cards CDN proxy, share_events/share_clicks schema, and deep links. Load when operating, debugging, extending, or consuming the sharing backend. The campaign skill (gracenotes-sharing-architecture-campaign) is the historical build plan; THIS file describes what is actually deployed and how to verify it.
---

# Sharing Architecture - Verified Runbook (Stage 2, built 2026-07-05)

Everything below was deployed and verified live on 2026-07-05. Contract of record: `gracenotes-canva-lovable-backend-contract` (v1.1-draft). Lovable consumes the API in section 2 and NOTHING else.

## 1. What is deployed

| Piece | Where | Verified |
|---|---|---|
| Render endpoint `render-share-card` (v8) | Supabase Edge Function, `verify_jwt=false`, custom auth in-handler | 16/16 template x size renders, dims exact, warm 0.5-1.5s, cold ~2.6s |
| Assets (258 files, pre-processed) | PRIVATE bucket `share-assets`: `backgrounds/{pool}/{size}/*.jpg`, `fonts/*.woff`, `icons/*`, `config/*`, `resvg/index_bg.wasm` | SQL count by prefix |
| Rendered cards | PRIVATE bucket `share-cards`, flat content-addressed keys `{template}-{WxH}-{sha256_32}.png` | idempotency: same request twice -> same key, 2nd call <1s |
| Public image URLs | SSR proxy `src/routes/api/public/share-card.$key.ts` (immutable cache headers) | code + routeTree; LIVE ONLY AFTER a Lovable publish |
| Schema | `share_events`, `share_clicks`, `profiles.attributed_share_token`, RPC `claim_share_attribution` | migration `20260705190000_plg_sharing_stage2.sql`, applied live |
| Click logging | `logShareClick` server fn (`src/lib/share.functions.ts`), fired from `/library/devotional/$date` loader on `?s=` | tsc clean; E2E at Stage 5 |

Bucket roles: `share-assets` = the renderer's processed store (pre-cropped JPEG variants, fonts, icons, config, wasm - what the function reads). `share-templates` = the raw-original archive (67 files: untouched 1080x1920 PNGs + captions, uploaded by `scripts/upload_share_templates.js`). Re-processing pipeline: originals -> center-crop 4 sizes -> JPEG q88 -> `share-assets/backgrounds/{pool}/{size}/`.

## 2. The API (what Lovable calls)

One deployed function, one route per share type:

```
POST https://tkoebogweygaabndrsvl.supabase.co/functions/v1/render-share-card/<type>
  <type> = grace-note | devotional | answered-prayer | streak-calendar
Auth: Bearer <user JWT> (grace-note, streak-calendar, answered-prayer); anon key ok for devotional
Body: { size?, date? (devotional), prayer_text + answered_date? (answered-prayer) }
Sizes: 1080x1080 | 1080x1920 | 1200x628 | 1200x630 (defaults per type in code)
200:  { image_url, storage_key, template_id, size, caption, share_url, share_token, contract_version }
Errors: { error: { code, message } } - invalid_template/invalid_size/payload_invalid 400, auth_required 401, content_not_found 404, render_failed 500
```

Lovable passes `image_url` + `caption` + `share_url` straight to the native share sheet (`{ title, url }` only - never `text`). Personalized content is ALWAYS server-fetched from the JWT (grace note text, habits); `prayer_text` is the one client-supplied field (user-confirmed, per contract).

### 2a. The Lovable adapter (Stage 3 handoff item)

Lovable's share UI (shipped 2026-07-05, `share-card-modal.tsx` + `src/lib/share.ts`) calls a MOCKED `generateShareCard({ type, context })` that returns `{ image_url, caption, deep_link }`. The real implementation is a thin adapter the backend seat writes at Stage 3: call the per-type route above with the signed-in session token (`supabase.functions.invoke("render-share-card/<type>", ...)` from the client lib, since server fns don't hold the user's session), and map `share_url` -> `deep_link`. Field names inside the modal stay as Lovable froze them; the mapping lives in ONE place (the adapter).

## 3. Content resolution (how each card gets its data)

- **grace-note**: latest `daily_grace_notes` row for the JWT user -> `grace_note` (<=320 chars), `verse_text`, `verse_reference` (rendered as `ref - NIV`). NOTE: full verse text appears on the card because the owner's Canva design includes it - NIV licensing exposure is on record (CLAUDE.md 2026-06-22); revisit before major launch.
- **devotional**: `daily_devotionals` by date (default today UTC) -> title, theme, verse_reference. Full-bleed background + gradient scrim + title/eyebrow/link overlay. No card.
- **answered-prayer**: payload text + date; white card, green header, mint panel, confetti icon, gold "Thanksgiving Submitted" pill.
- **streak-calendar**: current UTC month of `daily_habits` -> Mon-first grid; badge coins per `badges.ts` tiers (copper 1/3, silver 2/3, gold 3/3), exact `badgeColors` gradients.

## 4. Backgrounds, captions, theme tagging

- Pools in `share-assets/backgrounds/`: `grace-note` (10), `answered-prayer` (10), `streak-calendar` (11), `devotional/{theme}` (10 themes x 3-4). Each in 4 pre-cropped JPEG size variants (center-crop of the 1080x1920 original, produced offline - the renderer never resizes).
- `config/backgrounds-manifest.json` lists pools + `theme_map`. **Devotional selection is by the devotional's `theme` column** (weekday rotation), lowercased through theme_map. **Peace has no folder -> maps to `trust`** (owner decision, G-S1; edit theme_map in config/backgrounds-manifest.json to change). Unknown theme -> `hope`. (The original brief said "faith phase"; the delivered folders are theme-named, which matches the domain - devotionals are shared per-day, not per-user.)
- Selection is DETERMINISTIC-random: FNV-1a hash of (template|user-or-date|content) mod pool size - random across users/days, stable for identical inputs (required for content-addressed caching), and the same background across all 4 sizes of one share.
- Captions: `config/share-captions.json` (copy committed at `public/share-captions.json`). Sequential rotation: index = count of the user's prior `share_events` for that template mod list length (global count for anon devotional shares). **To edit captions:** update BOTH the repo copy and the storage copy (Dashboard -> Storage -> share-assets -> config -> replace); no redeploy needed (cached per isolate; refreshes on next cold start).

## 5. Hard-won constraints (do not relearn these)

1. **The 1080x1920 background exports carry the footer ("... yours at: www.gracenotesdaily.com") BAKED INTO THE ARTWORK.** The renderer must never draw a footer at that size (see `frame()`); the other three sizes are center-crops that removed it, so the renderer draws a two-tone row footer for them. Symptom if regressed: doubled/garbled footer text on story renders only. This was chased as a satori/resvg bug for six deploy cycles before the artwork was inspected - inspect source assets FIRST next time.
2. resvg-wasm render objects are `free()`d after every render (hygiene against wasm memory growth).
3. Satori needs fonts as explicit ArrayBuffers (woff ok, woff2 NOT); CSS grid unsupported - flexbox only; `render-test?svg=1` returns satori's raw SVG for separating render bugs from rasterize bugs.
4. Edge functions cannot import from `src/` - the function is fully self-contained. If card layout changes, bump `TEMPLATE_VERSION` (busts the content-addressed cache).

## 6. Attribution + deep links

- Every render mints a `share_token` (32-hex) + `share_events` row (user_id nullable for anon devotional shares - documented deviation from the campaign draft SQL).
- `share_url`: devotional -> `https://www.gracenotesdaily.com/library/devotional/YYYY-MM-DD?s=<token>` (the live invariant); other types -> `https://www.gracenotesdaily.com/?s=<token>` (FROZEN by owner 2026-07-05; grace-note private token pages remain a Later item).
- `?s=` clicks on the devotional page are logged server-side into `share_clicks` (fire-and-forget; invalid tokens rejected by regex + FK).
- Signup attribution: Lovable persists the landing token and calls `claim_share_attribution(p_token)` (SECURITY DEFINER, authenticated) after onboarding - sets `profiles.attributed_share_token` once. "Share resulted in signup" = join profiles.attributed_share_token -> share_events.
- PostHog mirror: DB triggers (migration 20260705210000) on share_events / share_clicks / profiles fire share_card_created / share_link_opened / signup_attributed via pg_net to us.i.posthog.com. Key lives in VAULT secret `posthog_project_api_key` (edge-function secrets are unreadable from Postgres); no-op until that secret exists. Analytics failures can never break writes (exception-swallowing).

## 7. Ops

- **Redeploy**: source of truth `supabase/functions/render-share-card/index.ts` (repo == deployed v8). Deploy via Supabase MCP or CLI.
- **Asset updates**: `POST .../render-share-card/admin/upload?path=<bucket-path>` with `Authorization: Bearer <service-role key>` and raw file body. Or Supabase Dashboard Storage UI.
- **Fixture testing**: `POST .../render-share-card/admin/render-test?nonce=<ADMIN_NONCE from index.ts>` body `{template_id,size}` -> PNG (add `&svg=1` for SVG). No DB/storage writes; safe.
- **Verify quickly**: the devotional curl from section 2 twice -> same `storage_key`, <1s second call; `select count(*) from share_events`.
- **image_url returns 404 until the app is published via Lovable** (the proxy route ships with app code). Everything else works before publish.

## Provenance and Maintenance

Built + verified 2026-07-05 (CLAUDE.md section 11 PM10). Re-verify: `supabase functions list` shows render-share-card ACTIVE; the two curls in section 7; `select count(*) from storage.objects where bucket_id='share-assets'` = 258.
