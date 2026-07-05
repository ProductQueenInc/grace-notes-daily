---
name: faithapp-domain-reference
description: Domain knowledge for building a faith/devotional app that a mid-level engineer lacks - retention mechanics, streak psychology, what makes devotional content shareable, PLG in values-driven products, the emotional-peak model, and the content constraints (NIV licensing, imagery policy, brand voice). Load before designing any user-facing feature, growth mechanic, content surface, or share moment. Triggers: retention, streak psychology, devotional, faith app, PLG, growth loop, emotional peak, why would users share, NIV, imagery.
---

# Faith App Domain Reference

## When NOT to use this skill

- Implementation of the sharing system → `gracenotes-sharing-architecture-campaign`
- Brand voice for actual copy → the `gracenotes-voice` skill (installed separately) + `gracenotes-docs-and-writing`

## The core product stance (why GraceNotes is shaped this way)

Tone contract: *soft, held, seen, welcome — never pushy.* Calm-inspired visuals, distinctly Christian voice, AI speaking in God's first person ("I"), with hard bans on performative empathy ("I see you"), predictions, em-dashes, lists/headers in notes. Every design decision below serves one goal: the app must feel like grace, not homework.

## Streak psychology: grace-based, not guilt-based

- Industry default (Duolingo-style consecutive streaks) drives retention via loss-aversion — and churns users at the first miss. For a faith app this is theologically and emotionally wrong: missing a quiet time must not feel like sin-debt.
- GraceNotes therefore counts **total days shown up, never resetting** (`use-streak.ts` — a deliberate product decision, documented in the architecture contract). Daily badge tiers (copper/silver/gold for 1/2/3 habits) reward depth-per-day instead of unbroken chains.
- Implication for the streak share card: celebrate accumulation ("47 days of showing up") and gold-day density, not "don't break the chain". A calendar of gold coins IS the visual language (`badgeColors` gold gradient `#f4cf5a → #c98f1c`).
- Habit auto-mark rule (locked): habits complete only via the real action (receive devotional / send chat / submit heart note) — never via a checkbox click. Rationale: a tappable checkbox turns devotion into task-theater.

## The emotional-peak model (why these four share moments)

People share at emotional peaks, and faith content is shared as *ministry to a specific person* ("this made me think of you"), not broadcast self-presentation. The four peaks and their emotional signatures:

| Peak | Emotion | Recipient's frame |
|---|---|---|
| Grace note | "This was written for me" intimacy | "someone thought of me" |
| Devotional | Resonance with a theme (weekday themes: Mon Hope … Sun Purpose) | "this speaks to what I'm going through" |
| Answered prayer | Joy/testimony (confetti moment, `generousAnsweredConfetti`) | witnessing a testimony |
| Streak calendar | Quiet pride in faithfulness | inspiration, gentle aspiration |

Design consequences: share CTAs appear AFTER the peak (after "I receive this", after confetti), calmly, never interrupting it; devotional share text leans on the verse reference (universally meaningful) not the app name; grace-note shares are personal content → private, `noindex` token URLs (owner decision on record), never public indexable pages.

## What makes devotional content shareable (observed in this codebase)

- One canonical public page per day (`/library/devotional/YYYY-MM-DD`, no sign-in) — the share IS the product sample. This is the SEO flywheel: every day mints an indexable Article page with OG + JSON-LD.
- Generalized but deep: written to be sendable to someone in the reader's life going through that theme (the prompt is explicitly built for this).
- Weekday theme rotation makes shares situationally targetable (grief content on Wednesdays finds grieving recipients).

## PLG in values-driven apps (what transfers, what doesn't)

PLG (product-led growth): the product itself, via its users, is the distribution channel. In faith apps:

- The share is an act of ministry — optimize for the RECIPIENT's experience (beautiful card, instant no-login devotional page, soft CTA) over conversion aggression. A pushy landing page poisons the gesture.
- Referral incentives ("give $10 get $10") read as commodifying faith — avoid. The reward is relational.
- Privacy bar is HIGHER: prayer contents, faith phase, and crisis flags are sensitive-category data. Attribution design must minimize third-party data sharing (a reason the custom deep-link/attribution path was preferred over Branch-style vendors — see campaign skill).
- Benchmarks to hold loosely: a healthy k-factor for niche community apps is 0.15–0.4; devotional apps live on daily-open habit (DAU/MAU 40%+ for the committed core). Measure before targeting.

## Content constraints (hard gates, not preferences)

1. **NIV licensing:** Scripture is NIV, © Biblica. Verses come ONLY from the curated `verses` table (123 active, verbatim-verified). Gratis use limit ≈500 verses / <25% of the work; app-scale distribution needs Biblica permission before major launch pushes (flagged in CLAUDE.md; not legal advice). Share cards that quote a full verse inherit this constraint — a card with only a reference (Psalm 34:18) does not.
2. **Imagery policy (locked):** never alcohol/smoking/gambling, suggestive imagery, violence/weapons, logos, memes, other faiths' symbols used decoratively, or AI images of identifiable real people. Prefer: forests, mountains, dawn light, mist, still water, hands, candles, open books. Applies to SHARE CARDS and their Canva templates exactly as to app imagery.
3. **No em-dashes anywhere.** Brand-wide hard rule, enforced in code.
4. **Crisis safety:** chat has a 3-tier safety system with country-specific crisis lines. Any new surface that accepts free text about a user's life must route through equivalent care.

## Provenance and Maintenance

Written 2026-07-05. Sources: CLAUDE.md (§1, §4, §6, §10b, §11 2026-06-22), `use-streak.ts`, `badges.ts`, `confetti.ts`, prompt code in `ai.functions.ts`. Domain claims beyond this repo (k-factor ranges, DAU/MAU norms) are INFERENCE from industry experience — labeled as such; validate against GraceNotes' own PostHog data once instrumentation lands. Re-verify: streak semantics `sed -n 1,15p src/hooks/use-streak.ts`; imagery policy `grep -A6 "Imagery policy" CLAUDE.md`.
