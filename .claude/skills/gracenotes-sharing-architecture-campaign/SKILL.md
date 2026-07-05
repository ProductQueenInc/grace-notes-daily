---
name: gracenotes-sharing-architecture-campaign
description: The executable, decision-gated campaign for building GraceNotes Daily's full PLG sharing system - four share moments, image rendering pipeline, CDN, deep links, attribution, and the growth loop. Load when implementing ANY part of the sharing architecture, choosing the renderer, building the render endpoint, wiring attribution, or planning share-related work. Triggers: sharing system, share cards, PLG build, render pipeline, image generation, deep links, attribution, growth loop, share endpoint.
---

# Sharing Architecture Campaign

> **STAGE 2 EXECUTED 2026-07-05 (PM10).** Phases 1, 2, 3 and 5 are built and live; operational truth (deployed shapes, bucket layout, constraints discovered during the build - baked story footers, resvg free(), per-type routes) lives in skill `gracenotes-sharing-architecture`. Treat the phases below as the historical plan + the still-open items (Phase 4 G4 JWT proof, Phase 6 native deep links, Phase 7 freeze/handoff).

Decision-gated runbook. Do phases in order; each gate states the expected observation and the branch if you see something else. Field names, API shape, and ownership boundary live in `gracenotes-canva-lovable-backend-contract` — this file never redefines them.

## When NOT to use this skill

- Field/endpoint definitions → `gracenotes-canva-lovable-backend-contract`
- Why the peaks are what they are → `faithapp-domain-reference`
- Proving renders correct → `gracenotes-proof-and-analysis-toolkit`

## Decisions already made (2026-07-05, with Cindy — do not re-litigate)

| Decision | Choice |
|---|---|
| Renderer | **Self-hosted Satori + resvg on a Supabase Edge Function** (ranking below) |
| Analytics | **PostHog** (new GraceNotes project) + Supabase `share_events` as source of truth |
| Deep links | **Custom Universal Links / App Links** (native is imminent, <3 months); no third-party link vendor |
| CLAUDE.md / roadmap | roadmap.md stages gate all of this; backend gates Lovable |

## Renderer decision record (ranked)

1. **CHOSEN — Satori + resvg-wasm on a Supabase Edge Function (Deno).** Satori converts JSX-like markup + CSS subset to SVG; resvg rasterizes SVG→PNG. Both are wasm/pure-JS → run where our code already runs; $0 marginal cost. Supports the hard visual requirements: background images (embed as data-URI or absolutely-positioned `<img>`), custom fonts (load Fraunces + Nunito TTFs as ArrayBuffers), gold accents, card styling. Constraints to respect: Satori supports a CSS SUBSET (flexbox yes; grid NO), fonts must be explicitly loaded (no fallback discovery), edge function memory/time budgets mean background images should be pre-sized per variant.
2. Cloudflare Browser Rendering (Puppeteer API on Workers): true HTML/CSS fidelity, but paid, slower cold-starts, and app deploys are Lovable-gated — a separate Worker complicates the deploy story. Use ONLY if Satori's CSS subset proves incapable of matching an approved Canva design (that's a Gate 2 branch, with evidence).
3. Third-party (Bannerbear/Placid/Cloudinary): fastest to first image, but $40–150/mo, template fidelity to Fraunces/Nunito + parchment aesthetic is awkward in their editors, and personalized faith content (grace notes, prayer text) flows through a third party — privacy-sensitive category. Rejected 2026-07-05.
4. FENCED OFF — client-side canvas rendering in the app: inconsistent fonts/devices, no caching, blocked by the boundary (Lovable does not generate images). Do not do this even as a "temporary" hack.

## CDN strategy

**Public buckets are blocked by workspace policy** (discovered by the devotional-covers work, 2026-07-05). Use the established pattern: PRIVATE Supabase Storage bucket `share-cards` + a public SSR proxy route `/api/public/share-card/$key` on the Worker serving with `Cache-Control: public, max-age=31536000, immutable` (exact precedent: `src/routes/api/public/devotional-cover.$date.ts`). Content-addressed keys: `{template_id}/{size}/{sha256(payload+template_version)}.png` = free idempotency + cache-busting on template change. Never signed URLs for shared assets (they expire and break previews). Branch: if Worker egress costs spike at scale, front with an external CDN later - the key scheme permits it.

## Deep link decision record

1. **CHOSEN — custom HTTPS deep links on gracenotesdaily.com.** Today (web): share URLs ARE the deep links; devotional target is the invariant `https://www.gracenotesdaily.com/library/devotional/YYYY-MM-DD`. When Capacitor lands (<3 months): serve `/.well-known/apple-app-site-association` + `/.well-known/assetlinks.json` from the Worker (JSON, no redirect) so the SAME URLs open the app (Universal Links / App Links); web remains the no-app fallback — already live. Deferred deep linking (attribution across the App Store install gap) via the `?s=` token: landing page stores the token; post-install first-open reclaims it (clipboard or server-side match) — Phase 6.
2. Branch.io: solves deferred deep linking out of the box, but adds an SDK, a vendor contract, and third-party flow of faith-app usage data (sensitive category); costs at scale. Reconsider ONLY if custom deferred attribution measures <60% match rate after Phase 6.
3. FENCED OFF — Firebase Dynamic Links: **shut down August 25, 2025.** Any doc or model suggesting FDL is stale. Also fenced: URL shorteners that mask gracenotesdaily.com (trust + link-preview loss).

## Platform rendering requirements (per share type)

| Platform | What it shows | Size that matters | Notes |
|---|---|---|---|
| Instagram feed/stories | The IMAGE (user posts it) | 1080x1080 / 1080x1920 | No link on organic posts — the card itself must carry `gracenotesdaily.com` visibly |
| WhatsApp | Link preview (OG) + optionally the image | 1200x630 + og tags | Preview needs og:image <600 KB ideally |
| Twitter/X | summary_large_image card | 1200x628 | `twitter:card` already set app-wide |
| iMessage | Rich link preview (OG) | 1200x630 | Uses og:image; large images can be silently dropped — keep <1 MB |

Grace-note + streak default to 1080x1920 (story-first, personal). Devotional defaults to link-share - OG does the work, and since 2026-07-05 the devotional og:image is already the per-date AI nature cover (`/api/public/devotional-cover/<date>.png`), so the devotional share card is additive, not load-bearing. Answered-prayer defaults to 1080x1080.

## Attribution design (the growth loop in data)

Source of truth: Supabase. Mirror events to PostHog for funnels.

```sql
create table share_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  template_id text not null check (template_id in ('grace-note','devotional','answered-prayer','streak-calendar')),
  size text not null,
  share_token text not null unique,        -- the ?s= value
  share_url text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);
create table share_clicks (
  id uuid primary key default gen_random_uuid(),
  share_token text not null references share_events(share_token),
  clicked_at timestamptz not null default now(),
  user_agent text, referrer text           -- no IP storage: privacy stance
);
alter table profiles add column if not exists attributed_share_token text;
```

RLS: `share_events` insert/select own rows; `share_clicks` insert via server only (anon click logging happens server-side in the route loader); no public selects. PostHog events: `share_card_created`, `share_link_opened`, `signup_attributed` (properties: template_id, size, token). Loop metric: k = invites-per-user × conversion; compute weekly from these tables (see proof toolkit).

## The campaign (numbered phases with gates)

**Phase 0 — Preconditions.** `git fetch origin && git status -sb` (expect: not behind). Confirm Stage 1 Canva approval status in roadmap.md. GATE G0: Canva deliverables approved per contract v1.1 (background banks + mockups + caption bank, delivered 2026-07-05 to `grace-notes-daily/public/` in the parent folder) AND the G-S1 gaps closed (size-variant strategy, peace-theme mapping, naming normalization - see contract skill §2). If not → STOP; only contract-draft work and the Phase 1 spike may proceed.

**Phase 1 — Renderer spike (backend only).**
1. `supabase functions new render-share-card`
2. In the function: import `npm:satori` + `npm:@resvg/resvg-wasm`; bundle Fraunces + Nunito TTF subsets; render a hard-coded devotional card at 1200x630.
3. Deploy + invoke:
```bash
supabase functions deploy render-share-card
curl -s -X POST "https://tkoebogweygaabndrsvl.supabase.co/functions/v1/render-share-card" \
  -H "Authorization: Bearer $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"template_id":"devotional","size":"1200x630","payload":{"devotional_date":"2026-07-04"},"contract_version":"1.0"}' | jq .
```
GATE G1 — expected: 200 + `image_url` of a PNG that `identify` reports as 1200x630 with Fraunces visibly rendering. If fonts fall back → TTFs not loaded as ArrayBuffers; fix before proceeding. If Satori rejects the layout → simplify to flexbox; if an APPROVED design is truly unreproducible in Satori's CSS subset, branch to renderer option 2 (Browser Rendering) and record the evidence in this file.

**Phase 2 — Storage + idempotency.** Create PRIVATE `share-cards` bucket + the `/api/public/share-card/$key` proxy route (copy the devotional-cover proxy); upload with content-addressed key; return cached proxy URL on repeat calls. GATE G2: same request twice → same `image_url`, second call <300 ms; `curl -sI <image_url>` shows `cache-control: ... immutable`. NOTE: the proxy route ships with app code → it goes live only on a Lovable publish; coordinate the publish before testing the public URL.

**Phase 3 — All 16 template×size implementations.** Satori composites typography + data over the delivered background banks, matching the `share-assets/` mockups (glass card, gold-bar verse callout, gracenotesdaily.com footer). Non-1080x1920 sizes center-crop the background art unless G-S1 decided otherwise. Background choice is deterministic per share event (hash of user+date+type → index into the bank; devotional uses its theme dir). Build with max-length fixtures. GATE G3: golden-image suite green (≤1% pixel diff, all 16) — harness in `gracenotes-proof-and-analysis-toolkit`. Branch: any template needing >2 retries to match design → review the slot map with Cindy rather than eyeballing further.

**Phase 4 — Personalization + auth.** grace-note/streak paths: derive user from JWT, server-fetch `daily_grace_notes.message` / streak + `calendar_state`; devotional path: verify `daily_devotionals` row exists (else 404 `content_not_found`); answered-prayer: accept user-confirmed `prayer_text` from payload. GATE G4: valid JWT → personalized card; missing/foreign JWT → 401; nonexistent devotional date → 404. Verify with three curls.

**Phase 5 — Attribution schema + endpoints.** Apply the SQL above (via migration + live apply); render endpoint writes `share_events` + mints `share_token`; devotional route loader logs `?s=` clicks server-side (fire-and-forget); signup flow persists `attributed_share_token` from landing → onboarding. PostHog project created; server-side event mirror. GATE G5: the scripted E2E (create → click → signup) yields exactly 1/≥1/1 rows by SQL (acceptance threshold in `gracenotes-validation-and-qa`).

**Phase 6 — Deep-link upgrade for native (runs with the Capacitor build).** Serve AASA + assetlinks from the Worker; Capacitor URL handling to in-app devotional view; deferred-attribution reclaim of `?s=`. GATE G6: the deep-link matrix in `gracenotes-validation-and-qa` passes on one iOS + one Android device.

**Phase 7 — Contract freeze + Lovable handoff.** Bump contract to frozen v1.0; Lovable builds all four share UIs against it (its scope per the contract §1). Backend does NOT build UI. GATE G7: Lovable's calls observed in logs match the contract byte-for-byte; Stage 5 validation protocol green.

## Known wrong paths (fenced off, with reasons)

- Firebase Dynamic Links (dead product), URL shorteners (trust/preview loss), client-side rendering (boundary + fidelity), share-time content passed from the client for personalized cards (spoofable — server-fetch it), full verse text on cards (NIV exposure — reference only), public indexable grace-note pages (private noindex token URLs only), rebuilding the share UI in backend code (boundary), blind upserts anywhere in this pipeline (archaeology #2), and "temporary" endpoints outside `render-share-card` (contract simplicity guarantee).

## Validation protocol (success, measured)

Per share type: golden-image pass; correct `share_url` target (devotional → library invariant URL); OG scrape correct on FB debugger + one real iMessage; p95 render <2.5 s; attribution E2E green. Full matrix + thresholds: `gracenotes-validation-and-qa`.

## Provenance and Maintenance

Written 2026-07-05. Decisions taken with Cindy same day (renderer, PostHog, custom deep links, native <3 months). Satori/resvg capability claims and the FDL shutdown date are from general knowledge — INFERENCE until the Phase 1 spike verifies them in this stack; G1 exists precisely to convert them to ground truth. Re-verify: endpoint deployed `supabase functions list`; bucket exists (Storage dashboard); schema applied `select count(*) from share_events;`.
