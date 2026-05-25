## Goal

Make heart-note replies feel authentic across any user/entry — not just ones that happen to match the model's poetic defaults. Reduce cost/latency by reserving Sonnet for the devotional only.

## Changes (all in `src/lib/ai.functions.ts`)

### 1. Show, don't tell — add concrete example replies to the heart-note prompt

Append a `GOOD EXAMPLES` block to the `callRespondToHeartNote` system prompt with 3–4 short, varied samples covering different note types so the model has a target shape, not just a list of forbidden moves:

- **Grief / hard day** — flat, present, no climb. ~3 sentences, no sign-off.
- **Gratitude / good news** — warm but restrained, mirrors one concrete noun from the note.
- **Doubt / questioning** — steady, doesn't reassure or resolve. Ends with a short held line.
- **Milestone / launch** — acknowledges the work itself, not "the spark in your writing."

Each example will be 2–4 plain sentences, no bold, no name-as-opener, no aphoristic climb, optional one-line sign-off on only one of them — so the model sees that the sign-off really is optional.

### 2. Output guard + single retry

After the Anthropic call, run the reply text through a small validator that flags the known failure modes:

- Starts with `**Name**` or `Name.` as a standalone first beat
- Contains `**` anywhere (bold markdown)
- Contains `I see it.` / `I see you.` / `I notice` as an opener
- Contains the aphoristic pattern `…doesn't mean…. It means…`
- Contains rhetorical triplets like `Every X… Every Y… Every Z…`
- Longer than ~5 sentences

If any flag trips, re-run the call **once** with a short corrective system addendum ("Your previous reply broke rule X. Rewrite shorter, flatter, no bold, no name opener."). If the retry still fails the bold/name checks, sanitize in code (strip `**`, drop a leading `Name.` line) and return. Never loop more than once — cost + latency cap.

### 3. Lower temperature

- Heart-note reply: `0.8 → 0.6`
- Daily-message chat: `0.9 → 0.7`
- Grace note: `0.85 → 0.7`
- Devotional: `0.8 → 0.7`

Creative flourish was the wrong dial. Grounded specificity is what we want, and lower temp pushes the model toward its more literal, less performative register.

### 4. Model swap — Sonnet only where it earns its keep

| Server fn | Current | New |
|---|---|---|
| `callRespondToHeartNote` | `claude-sonnet-4-5` | `claude-haiku-4-5` |
| `callRespondToDailyMessage` | `gpt-4o-mini` (OpenAI) | unchanged — already light |
| `generateGraceNoteRaw` | `claude-haiku-4-5` | unchanged |
| `generateDevotionalRaw` | `claude-sonnet-4-5` | **unchanged** — devotional is the only place that benefits from Sonnet's depth (longer body, scripture weaving, three related verses) |

Heart-note replies are 3–4 sentences with strict constraints — a shaping problem, not a reasoning problem. Haiku 4.5 handles that well, especially with the new examples + retry guard compensating for any drop in nuance. Net effect: faster replies, lower spend, tone stays on target.

### 5. Clear today's cached row again

After deploy, run the same `DELETE FROM public.heart_notes WHERE date = CURRENT_DATE` so you can test the new prompt + model end-to-end without yesterday's cache.

## Files touched

- `src/lib/ai.functions.ts` — examples block, validator + single retry, temps lowered, model swap on heart-note fn
- One-line SQL to clear today's cache

No DB schema changes, no new dependencies, no frontend changes.

## What this does NOT do

- Doesn't add per-user style learning (would need a feedback table — separate phase)
- Doesn't A/B different models per user — single model per server fn for now
- Doesn't change the daily-message chat behavior beyond temperature