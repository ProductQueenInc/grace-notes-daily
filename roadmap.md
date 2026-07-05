# GraceNotes Daily - Roadmap

Living document. **Read this before writing any code.** Any model or engineer must check current stage completion before beginning work on a later stage. Sequencing rules at the bottom are enforced, not suggested. Companion knowledge lives in `.claude/skills/` (start with `gracenotes-architecture-contract`); CLAUDE.md is the audit hook and changelog.

Last updated: 2026-07-05.

## Now - The PLG sharing system

Goal: make users the distribution channel via four emotionally resonant share moments (grace note, devotional, answered prayer, streak calendar). Full runbook: skill `gracenotes-sharing-architecture-campaign`. Contract of record: skill `gracenotes-canva-lovable-backend-contract`.

Terminology: roadmap **STAGES (1-5, gates G-S1/G-S3)** are the project-level sequence below; **Phases (0-7, gates G0-G7)** are the campaign skill's internal build steps. Stage line items cite the campaign phases they contain.

Decisions already made (2026-07-05, owner): renderer = self-hosted Satori + resvg on a Supabase Edge Function; analytics = PostHog (new GraceNotes project) with Supabase `share_events` as source of truth; deep links = custom Universal Links / App Links on gracenotesdaily.com (no third-party vendor; Firebase Dynamic Links is a dead product); native Capacitor build is imminent (<3 months), so deep links are designed native-ready from day one.

### STAGE 1 - Canva (happens outside the repo) — status: COMPLETE, G-S1 CLOSED 2026-07-05 (one owner action pending)

Delivered and verified: 62 background PNGs, all 1080x1920 (grace-note 10, streak 11, answered-prayer 10, devotional 31 across 10 theme dirs), 3 design mockups (1080x1080), confetti SVG, `share-captions.json` — in `grace-notes-daily/public/` in the PARENT folder. Deliverable format is the background-bank model per contract skill §2 (v1.1): Canva ships art + mockups + captions; the backend renders all typography. The frame list below remains as the 4 types x 4 sizes the RENDERER outputs.

**G-S1 decisions (owner-approved 2026-07-05, recorded in contract skill §2):** sizes center-cropped from the 1080x1920 art; devotional theme→dir mapping frozen with **Peace (Tue) → `trust/`**; filenames normalized in place; assets go to the private `share-templates` bucket (created).

⚠️ **One owner action:** run the one-time upload — `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/upload_share_templates.js` from the repo root. Stage 2 renderer work is unblocked now; Phase 3 (all 16 implementations) needs the upload done.

- Design all four share card templates, four size variants each (16 frames total).
- Naming convention (exact): `{template-type}-{width}x{height}.png`

```
grace-note-1080x1080.png        devotional-1080x1080.png
grace-note-1080x1920.png        devotional-1080x1920.png
grace-note-1200x628.png         devotional-1200x628.png
grace-note-1200x630.png         devotional-1200x630.png
answered-prayer-1080x1080.png   streak-calendar-1080x1080.png
answered-prayer-1080x1920.png   streak-calendar-1080x1920.png
answered-prayer-1200x628.png    streak-calendar-1200x628.png
answered-prayer-1200x630.png    streak-calendar-1200x630.png
```

- Each frame ships with a slot map (dynamic-zone bounding boxes, max characters, alignment) per contract skill §2.
- Visual constraints: Fraunces/Nunito, brand greens + gold, imagery policy, no em-dashes.
- **Approval gate G-S1:** Cindy approves all 16 frames + slot maps. Expected observation: 16 named PNGs + 16 slot maps delivered, an explicit "approved" from Cindy recorded in CLAUDE.md §11. If any frame is rejected → iterate in Canva only; do NOT start partial parameterization with the approved subset. Nothing in Stage 4 (and no renderer templating in Stage 2 beyond the spike) begins before this.

### STAGE 2 - Backend infrastructure — status: NOT STARTED

- Renderer spike deployed and proven (campaign Phase 1, gate G1) - may run before G-S1 with placeholder design.
- `share-cards` PRIVATE storage bucket + public SSR proxy route + content-addressed caching (Phase 2, gate G2). Public buckets are blocked by workspace policy; pattern precedent is the devotional-covers proxy (`/api/public/devotional-cover/$date`, shipped 2026-07-05).
- All 16 template implementations matching approved exports; golden-image suite green (Phase 3, gate G3). Requires G-S1.
- Database schema for `share_events`, `share_clicks`, `profiles.attributed_share_token` (Phase 5 SQL), applied AND committed as a migration.
- Deep link infrastructure: share URLs resolve to `https://www.gracenotesdaily.com/library/devotional/YYYY-MM-DD` (already-live invariant); `?s=` token click logging.
- Server-side 301 verification: `curl -sI https://www.gracenotesdaily.com/devotional/2026-07-04` returns HTTP 301 + location on the first hop. VERIFIED 2026-07-05 (SSR-level; re-run after any router/SSR change - see skill `gracenotes-validation-and-qa`).

### STAGE 3 - API contract finalization — status: DRAFT EXISTS

- All four share types + all four sizes specced in `gracenotes-canva-lovable-backend-contract` (v1.0-draft).
- Endpoint implemented, personalization auth proven (campaign Phase 4, gate G4).
- **Freeze gate G-S3:** contract reviewed with Cindy, version stamped `1.0-frozen`, CLAUDE.md §11 entry. No Lovable work before this.

### STAGE 4 - Lovable UI implementation — status: BLOCKED by G-S1 + G-S3

- Parameterized templates built from approved Canva exports (field names exactly per contract §3).
- Share modals + CTAs for all four peak moments (post-"I receive this", post-confetti, streak view, grace-note view).
- Native share sheet integration calling `render-share-card` and passing the returned URL. Share sheet rule: `{ title, url }` ONLY - never `text` (the malformed-URL trap, skill `gracenotes-debugging-playbook`).

### STAGE 5 - Validation and testing — status: BLOCKED by Stage 4

- 16/16 golden-image tests pass; OG scrape checks per platform; p95 render < 2.5 s.
- Deep links tested on iOS + Android (matrix in `gracenotes-validation-and-qa`).
- PLG attribution E2E verified by SQL (exactly 1 share event / ≥1 click / 1 attributed signup on the scripted journey).
- App Store submission readiness check (Capacitor packages installed, icons downscaled from 1254×1254 master, AASA + assetlinks served).

## Next (discovered in Phase 1 audit, priority order)

1. **Dynamic server-generated sitemap** including all `/library/devotional/YYYY-MM-DD` pages - flagged in CLAUDE.md as the highest-leverage SEO action; static sitemap.xml has only 18 URLs today.
2. **Capacitor native build** (imminent per owner): install `@capacitor/*`, `cap add ios/android`, wire Universal Links (overlaps campaign Phase 6). Skill: `gracenotes-build-and-env`.
3. **PostHog baseline instrumentation** beyond share events (DAU/MAU, habit completion funnels) - prerequisite for the frontier milestones.
4. **CI on GitHub Actions**: at minimum `tsc --noEmit` + lint on push; future `npm run build && npx wrangler deploy` goal noted in CLAUDE.md.
5. **Listen favourites** (heart a track, filter, auto-play within favourites) - next logical Listen feature per CLAUDE.md.
6. **Background image upload script** (`background_images` table exists; URLs still hard-coded in `nature-background.tsx`).
7. Housekeeping: delete dead `src/lib/tracks.functions.ts`; resolve `HANDOFF 2.md` duplicate; regenerate Supabase types.

## Later

- Push notifications as "quiet knock" (deliberately last - see skill `gracenotes-research-frontier` #6; requires Stage 5 complete and PostHog baselines).
- PLG instrumentation maturity: weekly k-factor reporting, reconciliation dashboards (skill `gracenotes-proof-and-analysis-toolkit`).
- Research frontier items 1-5 (theme hubs, private grace-note share URLs, spiritual garden, testimony graph, AEO) - each gated on its named prerequisite.
- NIV licensing confirmation with Biblica before major launch pushes (open risk on record).

## Sequencing rules (enforced, not suggested)

1. **Backend gates Lovable.** No Lovable implementation for a feature until its API contract is finalized (G-S3) and documented in `gracenotes-canva-lovable-backend-contract`.
2. **Canva gates Lovable parameterization.** No template parameterization until Canva exports are approved (G-S1).
3. **Stage completion is checked, not assumed.** Before starting Stage N work, verify Stage N-1 gates with the commands in the skills (not by reading status labels alone - update the status labels here when gates pass).
4. **The tool boundary is inviolable** (Canva designs, Lovable UIs, backend renders/tracks/links). Any recommendation that blurs it is out of order.
5. Every stage transition gets a CLAUDE.md §11 entry.
