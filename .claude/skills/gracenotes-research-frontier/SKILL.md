---
name: gracenotes-research-frontier
description: Where GraceNotes Daily could advance beyond current faith-app conventions - opportunities with the specific GraceNotes asset, first three concrete steps in this repo, and a falsifiable milestone for each. Load for strategy sessions, "what's next" planning, differentiation questions, or evaluating a new feature idea against the frontier. Triggers: research, frontier, opportunity, differentiation, beyond, innovation, what could we build, strategy.
---

# GraceNotes Research Frontier

Rules of this file: every opportunity names (a) why current approaches fall short, (b) GraceNotes' specific asset, (c) the first three concrete steps IN THIS REPO, (d) a falsifiable milestone. Nothing here is roadmap-committed; roadmap.md governs sequencing. Entries assume the sharing system (roadmap Now) ships first.

## When NOT to use this skill

- Committed work → `roadmap.md`
- Domain fundamentals → `faithapp-domain-reference`

## 1. The devotional archive as a compounding SEO/PLG hybrid

- **Falls short today (industry):** YouVersion/Hallow lock content in-app; devotional content evaporates socially because there's no permanent, beautiful, no-login URL per piece.
- **GraceNotes asset:** already mints one public Article page per day (`/library/devotional/YYYY-MM-DD`, OG + JSON-LD, prev/next navigation) — infrastructure competitors lack.
- **First three steps:** (1) dynamic server-generated sitemap including all dated devotional URLs (flagged in CLAUDE.md as the highest-leverage SEO action; today's `public/sitemap.xml` is static with 18 URLs); (2) theme hub pages (`/library/devotional/theme/grief-and-comfort`) aggregating the weekday-theme archive; (3) `?s=` share tokens on archive traffic to measure share-driven vs organic arrivals.
- **Falsifiable milestone:** within 8 weeks of the dynamic sitemap, ≥50 dated devotional pages indexed (GSC) and devotional pages ≥25% of organic entrances.

## 2. Personalized grace-note shares on private token URLs

- **Falls short:** personal AI content is either unshareable or gets dumped onto public URLs (privacy violation). Nobody does "private ministry link" well.
- **Asset:** per-user `daily_grace_notes` already exist; owner decision on record: private, `noindex` token URLs.
- **First three steps:** (1) `shared_notes` table (token pk, note snapshot, expiry); (2) `/n/$token` route, `noindex`, no auth, soft CTA; (3) wire as the grace-note `share_url` in the render contract.
- **Milestone:** grace-note share CTR ≥ devotional share CTR within 4 weeks of launch (tests the intimacy hypothesis: personal content shares MORE, not less).

## 3. Streak calendar as "spiritual garden" (grace-based visual identity)

- **Falls short:** streak visuals industry-wide are guilt mechanics (chains, fire). Faith users churn on the first missed day.
- **Asset:** the never-resetting show-up streak + gold/silver/copper day tiers is already a differentiated data model; no competitor renders "accumulated faithfulness".
- **First three steps:** (1) the streak-calendar share card (already in the Now roadmap); (2) a Journey view rendering months as a coin-garden grid from `daily_habits`; (3) milestone moments (25/50/100 total days) triggering the share CTA at the emotional peak.
- **Milestone:** users who view the garden weekly retain ≥15% better at week 8 than matched non-viewers (PostHog cohort) — falsifiable once instrumentation lands.

## 4. Answered-prayer testimony graph

- **Falls short:** prayer apps store requests; nobody closes the loop socially on ANSWERS, which is the highest-joy moment in the data model.
- **Asset:** `prayers.answered_at` + thanksgiving text + the confetti peak already exist; "Remember When" resurfacing already ships.
- **First three steps:** (1) answered-prayer share card (Now roadmap); (2) private "testimony timeline" in Journey from answered prayers; (3) opt-in anonymized "prayers answered this month" counter on the marketing site (social proof without exposing anyone).
- **Milestone:** ≥20% of answered-prayer marks proceed to the share modal within 2 weeks of launch (tests whether testimony-sharing desire is real).

## 5. AI-visibility (AEO) for devotional search

- **Falls short:** faith content is heavily searched conversationally ("devotional about grief for a friend") but faith apps do no answer-engine optimization.
- **Asset:** `public/llms.txt` already exists (rare); daily themed Article pages with clean JSON-LD are ideal AEO feedstock.
- **First three steps:** (1) extend llms.txt with the devotional archive index; (2) FAQ schema on theme hub pages; (3) track AI-referred traffic (referrer analysis in PostHog).
- **Milestone:** GraceNotes cited/linked in answers on ≥2 major assistants for a target query set within a quarter (measurable via the searchfit AI-visibility tooling).

## 6. Push notifications as "quiet knock" (deliberately last)

- **Falls short:** faith apps over-notify and become guilt machines; notification fatigue is the top uninstall driver in the category.
- **Asset:** the rhythm model (`profiles.rhythms`) and the brand stance give permission to do radically less: one gentle knock at the user's chosen rhythm, nothing else.
- **First three steps:** (1) VAPID keys + a `send-push` edge function (cron-adjacent, fits the edge-function rule); (2) opt-in UI in Settings keyed to rhythms; (3) hard cap: one/day, silent skip if the user already showed up.
- **Milestone:** notification-enabled users show ≥10% higher week-4 show-up rate WITHOUT an elevated uninstall/opt-out rate (>5% monthly opt-out = the knock is too loud; roll back).

## Provenance and Maintenance

Written 2026-07-05. Repo assets verified (routes, tables, llms.txt, confetti, Remember When in `prayers.tsx`). Competitor characterizations are INFERENCE from market knowledge, not fresh research - re-verify before citing externally. Milestones assume PostHog instrumentation (campaign Phase 5). Revisit quarterly or when roadmap Now completes: `grep -n "### Now" roadmap.md`.
