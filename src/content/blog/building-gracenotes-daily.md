# How I built GraceNotes Daily. The honest, founder to founder version.

The workflow, the stack at a glance, the mistakes that cost me the most, and the product calls I refused to hand to the model. No screenshots of secrets, no copy-paste prompts. Just the choices that actually mattered.

## TL;DR

GraceNotes Daily is a soft Christian devotional companion. It opens with a short reflection written in God's first-person voice, anchored to a real NIV verse. It carries a shared daily devotional the whole community reads together. It holds a private chat that listens gently and routes anyone in crisis to a real helpline in their country. It keeps prayers, heart notes, and a quiet Journey archive that makes a person's spiritual life visible to them over time.

How long it took matters less than how I worked. The short version: pair Lovable for everything that touches the live preview, design, deploys, and routine product iteration. Pair Claude Code in a terminal for the heavier backend surgery, schema migrations, edge functions, prompt tuning, security passes. Use ChatGPT for one off branded assets. Treat them as three collaborators with different strengths, not as one interchangeable thing.

This page is what I wish someone had handed me on day one.

## The product thesis

A lot of Christian apps either shout at you with verse of the day banners and gamified streaks, or they feel like a 2007 PDF devotional booklet dressed up in a web app. I wanted something closer to what Calm did for meditation. Reverent. Soft. Held. A daily companion that meets a person where they are without performing at them.

The promise to the user is small and specific. A grace note each morning, two to four sentences, in God's voice, anchored to a verified verse. A shared devotional that rotates through seven weekday themes. A chat that knows when to listen and when to stop and route the person to safety. A Journey page that quietly remembers their week. Three habits that complete only when the person actually does the thing, never on a tap.

The voice is the product. Everything else serves it.

## The stack at a glance

TanStack Start v1 on Vite 7 for the frontend, React 19, Tailwind v4, shadcn on Radix. TanStack Query for server state, Zustand for the audio player. Lovable Cloud for the backend, which is Postgres, Auth, Edge Functions, and Storage in one place. Anthropic Claude Sonnet and Haiku for text, OpenAI GPT-4o-mini for the daily chat companion. Cloudflare Worker at the edge for hosting. Magic link auth, no passwords stored. Two Supabase Edge Functions, one for the streaming safety chat, one for the overnight cron. A small set of curated NIV verses in the database, a small set of verified crisis hotlines by country, and a sanitizer that strips em and en dashes from every AI output before it hits the UI.

The fonts are Fraunces for display and Nunito for body. Two brand greens, one gold accent, two glass surfaces. Lucide icons only. No emojis in the chrome.

## Lovable and Claude Code, the actual dance

People ask me how the two tools work together. Here is the real workflow.

Lovable is the cockpit. I write the brief, iterate on UI, scaffold routes, wire Supabase, and ship the build. The in chat agent runs on Claude under the hood and is excellent at turning product intent into shipped code. It is the right tool for components, layouts, Tailwind, shadcn, migrations, edge function deploys, and the kind of iterative polish loop where you want the change visible in the preview a few seconds later.

Claude Code in a terminal is the backend surgeon. When the work gets gnarly, prompt tuning across multiple files, dependency conflicts, a security pass, a refactor that touches eight call sites, I hand off. Claude Code can read the whole repo, run the TypeScript checker, and make patient multi file changes without the credit pressure of an interactive agent loop.

ChatGPT is the asset shop. For one off branded pieces like the gold streak medallion or a tightly art directed SVG set, I generate in ChatGPT, download, and upload as a project asset. Faster than describing the thing round after round.

The glue is a single living document at the repo root called CLAUDE.md. It carries what is shipped, what is pending, the locked decisions, the canonical prompts, and a dated changelog. Every code change updates it before push. Without that document, picking up between sessions or between Lovable and Claude Code bled hours.

## The mistakes that cost me the most

In rough order of how much they cost.

**The two Supabase project nightmare.** Early on I had Lovable Cloud, which is Supabase under the hood, and a separate Supabase project I had started before connecting Cloud. Migrations ran against one. The app pointed at another. Edge functions deployed to a third reality. Everything compiled. Nothing worked. The error messages were perfectly accurate and entirely unhelpful. The lesson is simple. Pick one backend before you write a single migration. Verify the project ref matches across `.env`, the generated client, and your migrations. Run one round trip query and watch it land in the right project's logs before you build anything that depends on it.

**Letting the model write Scripture.** For weeks my grace notes and devotionals had Claude writing the verse text from memory. Two problems. Translations are copyrighted and generating verse text at scale is a licensing risk. And models hallucinate references in subtle ways a non theology trained eye misses. The fix was to ground the verse from a curated database table, attribute the translation properly, and tell the model to write only the reflection around the verse. When content has a source of truth, the database holds it, not the model.

**Skipping the canonical prompt rule.** The grace note prompt lived in two files, the on demand server function and the overnight cron edge function, because edge functions cannot import from `src/`. I would update one and forget the other. Users got drift between the morning note and the on demand fallback. The fix was a header comment in both files pointing at the other, and a single source of truth section in CLAUDE.md.

**Not enforcing the no em dash rule in code.** I told the prompt not to use em dashes. The model complied most of the time. The rest shipped to users and broke the voice. The fix is a one line `stripEmDashes` sanitizer on every AI output before it touches the UI. If a style rule matters, enforce it in code. Prompts are guidance. Code is law.

**Burning credits on speculative refactors.** Early on I would ask Lovable to reimagine a section without a tight brief. Beautiful work, expensive work, often discarded work. Later I learned to ask for a plan first, approve the plan, then ask for the implementation. Or to request two or three rendered prototype directions and pick one. Plan first saves credits and prevents regressions to locked design tokens.

**Writing the imagery and tone policy too late.** I wrote the rules after I had already had to reject several rounds of generated images and AI flavored copy. The policies belong in CLAUDE.md before the first prompt runs, and they belong referenced in every prompt that could violate them.

**Almost letting habits mark complete on tap.** There was a tired moment where I considered letting the habit circles mark complete on a click. Two days later the streak would have meant nothing. I reverted. A habit completes only when the person does the thing, receives the devotional, sends a chat message, submits a heart note. That single rule is half of what makes the product feel honest.

## The two Supabase nightmare, in more detail

This one is worth its own section because it cost me the most time and the most confidence in my own debugging.

What happened. I started with a personal Supabase project. Then I enabled Lovable Cloud, which provisioned its own. The Lovable generated client pointed at Cloud. My migrations were running against the old one. Edge functions were somewhere else again. The "relation does not exist" errors were technically correct, but I kept rereading my code looking for a typo that did not exist.

How to prevent it. Pick one backend before you write any data code, Lovable Cloud or your own Supabase, not both. Open `.env` and the generated client file side by side and confirm they reference the same project ref. Run one tiny query and watch it land in the right project's logs before you build anything that depends on it. Deploy edge functions to the same project as the database. Never spin up a "second Supabase project just for testing." Use branching or RLS isolated test users instead. Write the one project ref down in CLAUDE.md so future you, or the next agent that picks the project up, has exactly one answer to the question "where does this data live."

## Product calls I refused to hand to the model

The model is great at execution. It is mediocre at taste and bad at conviction. These were the moments I had to be the human.

Cutting onboarding from five steps to two. The agent happily built whatever I asked. It was on me to look at the funnel and admit that nobody would answer five questions to read a devotional. Name and faith phase only. Everything else gets inferred from the chat over time or lives in Settings.

Killing the translation picker. Five Bible translations sounds like a feature. It was decorative. Generation only ever used NIV. I removed the picker, standardized on NIV, added the attribution notice. One translation done well beats five done shallowly.

The streak rule. Originally consecutive days. Then I realized this is a devotional app, not Duolingo. Punishing a missed day is anti pastoral. Now we count total days a person has shown up, even with gaps. That decision came from sitting with what the product means, not what was technically tidier.

The Remember When carousel. Resurfacing answered prayers as a soft, daily randomized horizontal carousel, hidden until the person has at least three answered. That came from imagining a specific user ninety days in, not from a feature request.

No "free" language anywhere. The model kept reaching for "free trial," "free guide," "sign up free." I stripped every instance. The product is dignified and the copy has to match. The model defaults to SaaS marketing tropes and you have to override them.

Magic link only auth. The audience skews older, less technical, often on Gmail's in app browser. Password forms are friction and a support burden. Magic link is one tap. That is a product call, not a technical one.

Every time I let the AI default win, I shipped something more generic. Every time I held the line, the product got more itself.

## Where Lovable shined and where I stepped in

Lovable was excellent at first pass UI from a clear brief. Routes, layouts, shadcn components, responsive grids. The iterative polish loop is where it really sings. "Make the cards smaller on mobile, the info icon glitches on tap, add more padding between title and subtitle." All handled gracefully and reliably. Supabase wiring, migrations, RLS, GRANTs, edge function deploys. Low friction once you are in Cloud. SEO scaffolding, per route head metadata, sitemap, robots, JSON-LD, OG and Twitter cards. The built in SEO review tool surfaces the gaps and the agent fixes them.

I stepped in for branded assets, the streak medallion and the six homepage preview SVGs. I generated them in ChatGPT, downloaded, uploaded as project assets. I stepped in for the voice. The model writes competent devotional content. It does not, by default, write this product's voice. The voice rules live in the prompts, in the sanitizer, and in my own code review. I stepped in to vet every background image against the imagery policy. The model suggested several that violated it. And I stepped in whenever the model confidently broke something. It occasionally hallucinated old dates into the devotional from its training data. I had to force overwrite the date server side. Trust the model. Verify with code.

## How I think about SEO for this product

The questions I asked, in order.

What is the single page someone could land on and immediately understand the product. The homepage, and the public devotional page. Both get full head metadata, OG tags, and a self referencing canonical.

What would a friend share. A devotional from a specific day. So a public, indexable, shareable archive lives at `/devotional/<date>`. Each day becomes one more indexed page. That is the flywheel.

What does Google need to understand this is a real product, not a thin AI wrapper. A proper sitemap, structured data including Article, Breadcrumb, Organization, and WebSite JSON-LD, real content guides on Christian journaling and prayer journaling and the daily devotional, and an `llms.txt` describing the app for AI crawlers.

What keywords actually convert. Long tail intent like "Christian journaling app," "daily devotional app," "answered prayer tracker." Each got its own landing route with unique title, description, OG metadata, and a soft signup CTA.

Where do canonical and og:url need to point. At the page itself. Pointing them at the homepage, which I almost did, tells crawlers to attribute every page's metadata to the root and silently breaks per page sharing.

What happens when a share preview is wrong. Crawlers cache. You have to use the platform's link preview debugger on Facebook, LinkedIn, or X to force a refresh after changing OG metadata.

Should the app shell pages be indexed. No. The authenticated app surfaces are useless to crawlers. The public surface is the landing pages, the devotional archive, and the content guides.

## The CLAUDE.md rule

CLAUDE.md is a markdown file at the repo root. It carries the TL;DR of where the project is today, what is shipped versus pending versus not started, the locked design and product decisions, the canonical prompts and where they live, the server runtime gotchas, and a dated changelog of every meaningful change.

The rule is simple. Every code change updates CLAUDE.md before push. No exceptions.

Why it matters. Every new session, whether Lovable, Claude Code, or a human collaborator, reads it first. It collapses what would be an hour of figuring out the codebase into five minutes of context. It prevents the AI from relitigating decisions that are already locked. It tells you, six weeks later, why you made a weird looking choice. If you take one thing from this whole essay, take this. Write a CLAUDE.md from day one.

## Where this is going

GraceNotes Daily is not trying to be the biggest Christian app. It is trying to be the one a specific kind of believer, someone who finds most Christian media too loud, too commercial, or too theatrical, quietly opens every morning and feels held by.

The longer arc. Phase one is now. Web app, magic link auth, daily grace note, shared devotional, chat, journal, prayers, free to use. Phase two is push notifications and a native iOS and Android build through Capacitor. Phase three is a small sustainable subscription for premium audio, guided seasons like Advent and Lent and grief, and the ability to share a private devotional to a friend through a tokenized URL. Phase four is a community surface, never a social feed, but something closer to a shared prayer wall and answered prayer testimonies, opt in and tightly moderated.

The North Star metric is not DAU. It is how many users open the app on day ninety. If the product is good that number is high. If the product is performative that number collapses.

## When the content is mostly AI generated

This is where most AI products fail. They generate something technically correct and emotionally hollow. Here is how I tried to avoid that.

Ground the model wherever there is a source of truth. The verse comes from the `verses` table. The crisis hotline comes from the `crisis_lines` table, looked up by the person's country code. The weekday theme is fixed in code. The model writes only the reflection, the soft contextual layer around hard verified facts.

Voice rules in the prompt and in code. The grace note prompt has explicit rules. Write in God's first person voice. No performative "I see you." No rule of three structures. No em dashes. No predictions. Never name the season back to the reader. Then the output passes through a sanitizer because the model occasionally breaks the rule.

Two models, picked for the job. Claude Sonnet for the overnight cron grace note generation where one call per user per day and quality matters most. Claude Haiku for the on demand fallback, daily chat, and devotional where speed and cost matter and the voice is already constrained by the prompt. OpenAI GPT-4o-mini for the daily chat companion because a different model gives a slightly different conversational rhythm and that is intentional.

Anti repetition is structural, not prompted. The grace note generator pulls the last fourteen days of verse references for that user and bans them in the prompt. Temperature is raised to 0.9 for variety. The verse rotation function enforces a sixty day no repeat at the database level. Three layers of defense against the model getting stuck on Lamentations 3:22.

Date and identity are server truth, never model output. The model hallucinated dates from its training data. I force overwrite the date server side after generation. The reader's name is never injected into the devotional body. The model started writing in the third person about the user by name, "Tatiana stands at," and it was unsettling. Identity stays in the chrome, not in the AI content.

Safety runs before the model. The chat reply edge function has three tiers, in order. First, keyword detection for suicide and self harm. A hit looks up the country specific helpline, logs the flag, closes the session, returns the helpline reply. The main model never runs. Second, a small safety classifier returning SAFE, MILD, or HARMFUL. HARMFUL closes the session. MILD lets the reply through with a gentle redirect instruction. Third, the streaming reply from the main model. You do not put the safety check after the generative call. You put it before.

## Security posture

Non negotiable. Here is the actual checklist I worked through.

Row Level Security on every user content table, scoped to `user_id = auth.uid()` for select, insert, update, and delete. Without RLS, any authenticated user can read everyone else's data. Lovable Cloud does not enable RLS by default. You have to write the policies.

Explicit GRANTs on every public schema table. PostgREST does not grant default privileges. Without the GRANT, RLS is not even reached and the request errors at the permissions layer.

Roles in a separate `user_roles` table with a `has_role()` security definer function. Never store roles on the profile table. That is a privilege escalation waiting to happen.

Service role key stays server side, always. Never exposed via `VITE_*`, never in client code, never logged.

JWT validated server side in every edge function. The `user_id` is derived from claims, never trusted from the request body.

Prompt injection defenses on conversation history. The chat reply function sanitizes the history and whitelists roles before feeding it back to the model. Without this, a user can paste "ignore previous instructions" and break the safety system.

Webhook signatures verified before processing. Every public API endpoint that mutates data verifies an HMAC signature with a timing safe comparison.

Magic link auth, no passwords stored. Smaller attack surface.

Email PII hardening. The email column on the profiles table is protected by an RLS policy that only lets the owner read their own.

No secrets in `.env` checked into git, only the publishable anon key. Everything else lives in Supabase secrets and Lovable environment variables.

Regular dependency scans. Patched a handful of transitive vulnerabilities using `package.json` overrides after a security scan flagged them.

Imagery and content policies enforced in code review, not just in prompts. The model will generate something inappropriate eventually. Catch it before it ships.

Run the security scanner before publishing. Lovable has one built in. Read the findings. Fix the critical ones. Do not publish over an open critical.

Reverify safety data, the crisis hotlines, every six months. Numbers change. A wrong helpline is worse than no helpline.

## What I would do differently next Monday

Write CLAUDE.md and the locked decisions list before the first feature. Voice, imagery, design tokens, auth method, backend choice. Five minutes upfront saves five hours of reverting.

Pick one backend. Lovable Cloud or your own Supabase. Never both. Verify the project ref matches across `.env`, the generated client, and the migrations.

Ask Lovable for a plan before any large change. Plan first, then implement after approval. This single habit cuts credit burn and prevents regressions.

Use rendered prototype options for design exploration. Lovable can generate two or three visual directions to pick from. Pick once, then build.

Hand off to Claude Code for backend surgery. Migrations, edge functions, dependency conflicts, security hardening, prompt tuning across multiple files. Lovable can do it. Claude Code does it with more patience and a wider view.

Ground every AI output that has a source of truth. Verses, legal text, medical info, dates, identity. The model writes the reflection. The database holds the facts.

Enforce style rules in code, not just in prompts. Sanitizers are a one line investment with a forever payoff.

Run the security scanner before every publish. Read the findings. Do not ship over a critical.

Use ChatGPT for one off branded assets. Faster than twelve rounds of "make the medallion more gold."

Treat AI defaults as suggestions to override. "Free trial," generic SaaS gradients, performative empathy, inappropriate imagery, rhetorical triplets. The model will reach for them. You have to reach back.

Write the changelog as you go. Dated entries in CLAUDE.md. Future you, and every future session, will thank you.

## Closing

GraceNotes Daily is live at [gracenotesdaily.com](https://www.gracenotesdaily.com). If you want to talk about product, AI integration, or building something like this for yourself, find me at [product-queen.com](https://product-queen.com).
