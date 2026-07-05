---
name: gracenotes-canva-lovable-backend-contract
description: The formal three-way contract between Canva (design), Lovable (UI/parameterization), and the backend (rendering, API, CDN, deep links, attribution) for GraceNotes Daily share cards. THE single source of truth for the tool boundary, export specs, dynamic field names/types, the render API shape, and how to change the contract safely. Load for any share-card work, any API contract question, any Canva export handling, or any Lovable integration task. Triggers: contract, boundary, Canva export, template, parameterize, render API, payload shape, size variants, who owns.
---

# The Canva / Lovable / Backend Contract

**Contract version: 1.0-draft (2026-07-05). Status: DRAFT until roadmap.md Stage 3 gate G-S3 passes (endpoint implemented, personalization proven at G4, Cindy review) - then stamped `1.0-frozen` with a CLAUDE.md §11 entry.** Once frozen, changes follow the amendment process at the bottom.

## When NOT to use this skill

- Executing the build phases → `gracenotes-sharing-architecture-campaign`
- Why the boundary exists / architecture context → `gracenotes-architecture-contract`

## 1. Ownership (hard boundary — no skill, roadmap item, or recommendation may blur it)

| Party | Owns | Explicitly does NOT |
|---|---|---|
| **Canva** | Visual design of the 4 templates × 4 sizes; static PNG exports | Dynamic data, code, naming beyond the convention below |
| **Lovable** | Share UI: modal, post-"I receive this" CTA, confetti→share transition, streak card display, native share sheet call; mapping dynamic fields to placeholder slots in app components; calling the backend API and passing the returned URL to the share sheet | Generating images; routing decisions; attribution; anything server-side |
| **Backend** | Render pipeline, this API, CDN hosting, deep links, attribution + share_events schema, server-side personalization | Share UI |

## 2. Canva export specification

- Format: PNG, exact pixel dimensions, sRGB, no transparency in the base layer.
- Naming convention (exact): `{template-type}-{width}x{height}.png`
- Template types (exact strings, used as `template_id` prefixes): `grace-note`, `devotional`, `answered-prayer`, `streak-calendar`
- Sizes (all four per template): `1080x1080` (IG/FB feed square), `1080x1920` (IG/WhatsApp stories), `1200x628` (Twitter/X summary_large_image), `1200x630` (OG: FB/iMessage/WhatsApp link previews)
- The 16 deliverables: `grace-note-1080x1080.png`, `grace-note-1080x1920.png`, `grace-note-1200x628.png`, `grace-note-1200x630.png`, `devotional-1080x1080.png`, `devotional-1080x1920.png`, `devotional-1200x628.png`, `devotional-1200x630.png`, `answered-prayer-1080x1080.png`, `answered-prayer-1080x1920.png`, `answered-prayer-1200x628.png`, `answered-prayer-1200x630.png`, `streak-calendar-1080x1080.png`, `streak-calendar-1080x1920.png`, `streak-calendar-1200x628.png`, `streak-calendar-1200x630.png`
- Each export ships with a slot map (one page of annotations): for every dynamic zone, its bounding box, max character count, and alignment. Without the slot map an export is NOT approved.
- Visual constraints (hard): Fraunces for display text, Nunito for body; brand greens + gold accents (`--grace` oklch(0.42 0.08 152), `--gold` oklch(0.78 0.14 85), gold-coin gradient `#f4cf5a → #c98f1c`); imagery policy applies (see `faithapp-domain-reference`); no em-dashes in any placeholder copy.
- Approval gate: Cindy approves all 16 frames + slot maps before ANY parameterization or renderer templating begins.

## 3. Dynamic fields (names and types are normative)

| Field | Type | Used by templates | Constraints |
|---|---|---|---|
| `user_first_name` | string ≤ 24 chars | grace-note, streak-calendar | first name only; never full name on a shareable image |
| `grace_note_text` | string ≤ 320 chars | grace-note | server-fetched from `daily_grace_notes.message`; NEVER client-supplied |
| `verse_reference` | string ≤ 40 chars | grace-note, devotional | reference only (e.g. "Psalm 34:18") — full verse text on cards raises NIV licensing exposure |
| `devotional_title` | string ≤ 80 chars | devotional | from `daily_devotionals.title` |
| `devotional_date` | `YYYY-MM-DD` | devotional | drives the deep link |
| `prayer_text` | string ≤ 200 chars | answered-prayer | user-chosen excerpt; user must confirm before a prayer's text leaves the app |
| `answered_date` | `YYYY-MM-DD` | answered-prayer | |
| `streak_count` | integer ≥ 1 | streak-calendar | total show-up days (grace-based; never "consecutive") |
| `calendar_state` | array of `{ date: YYYY-MM-DD, tier: "none"\|"copper"\|"silver"\|"gold" }`, ≤ 35 items | streak-calendar | last 28–35 days |

Lovable names its component props EXACTLY these names. The backend render payload uses EXACTLY these names. No synonyms.

## 4. Backend render API (the shape Lovable calls)

Endpoint (Supabase Edge Function): `POST https://tkoebogweygaabndrsvl.supabase.co/functions/v1/render-share-card`

Auth: `Authorization: Bearer <user JWT>` — required for `grace-note` and `streak-calendar` (personalized; server derives `user_id` from JWT claims, per the `chat-reply` precedent, and fetches the personal content itself). `devotional` accepts anon key (public content).

Request:

```json
{
  "template_id": "grace-note",            // one of the 4 template types
  "size": "1080x1920",                    // one of the 4 sizes
  "payload": {                             // ONLY the fields for that template (see §3)
    "devotional_date": "2026-07-04"       // example for devotional; personalized fields are server-fetched
  },
  "contract_version": "1.0"
}
```

Response 200:

```json
{
  "image_url": "https://www.gracenotesdaily.com/api/public/share-card/<sha256-of-inputs>.png",
  "template_id": "grace-note",
  "size": "1080x1920",
  "share_url": "https://www.gracenotesdaily.com/library/devotional/2026-07-04?s=<share_token>",
  "share_token": "<opaque id>",
  "contract_version": "1.0"
}
```

`share_url` rules: devotional → the canonical `/library/devotional/YYYY-MM-DD` URL (invariant); grace-note → private `noindex` token URL (planned `/n/<token>`); answered-prayer + streak → marketing landing (exact targets frozen at Stage 3). Every share_url carries `?s=<share_token>` for attribution.

Errors (JSON `{ "error": { "code", "message" } }`):

| HTTP | code | Meaning / Lovable behavior |
|---|---|---|
| 400 | `invalid_template`, `invalid_size`, `payload_invalid` | fix the call; show generic "couldn't prepare your card" toast |
| 401 | `auth_required` | re-auth |
| 404 | `content_not_found` | e.g. devotional row doesn't exist for that date |
| 429 | `rate_limited` | back off; disable button 30 s |
| 500 | `render_failed` | retry once, then toast |

`image_url` is served by a public SSR proxy over a PRIVATE storage bucket (public buckets are blocked by workspace policy; pattern precedent: `/api/public/devotional-cover/$date`). Contract simplicity guarantee: one endpoint, three top-level request fields, flat payload — a Lovable session needs zero knowledge of the rendering pipeline. Idempotent: identical inputs return the same cached `image_url`.

## 5. Amendment process (how to change the contract safely)

1. Any party's change (new Canva template rev, new field, new size) starts as a PR editing THIS file with `contract_version` bumped (minor: additive; major: breaking).
2. Backend implements + deploys BEFORE Lovable consumes (backend gates Lovable — change-control rule 3). Backend must keep accepting version N-1 payloads for one minor version.
3. New/changed Canva exports re-run the approval gate (16 frames + slot maps) and regenerate golden references (see `gracenotes-proof-and-analysis-toolkit`).
4. CLAUDE.md §11 entry records the bump.

## Provenance and Maintenance

Drafted 2026-07-05 by the backend seat. Grounded in: repo constants (`BASE_URL`, brand tokens in `src/styles.css`, `badgeColors`), the `chat-reply` JWT pattern, URL invariants (verified live), field sources (`daily_grace_notes`, `daily_devotionals`, `prayers`, `daily_habits`). The endpoint DOES NOT EXIST YET — status flips to "frozen v1.0" at roadmap Stage 3. Re-verify: endpoint live `curl -s -o /dev/null -w "%{http_code}" -X POST https://tkoebogweygaabndrsvl.supabase.co/functions/v1/render-share-card` (404 = not deployed yet); brand tokens `grep -n "\-\-gold" src/styles.css`.
