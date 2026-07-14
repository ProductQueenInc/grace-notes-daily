
## What's consuming Lovable AI credits (audited)

Pulled the last 7 days of AI Gateway logs. **100% of usage is one model:** `google/gemini-3.1-flash-image` (devotional cover images). ~0.27 credits per successful image, ~10s each. Recent successes: 2026-07-13, 2026-07-11, 2026-07-10. A `403 client_error` on 2026-07-13 lines up with hitting the limit; the many `499 cancelled` entries are aborted fetches (Worker request timeouts / user navigations) — those don't bill, but they suggest the cover pipeline is also occasionally flaky.

**All other AI in the app already goes direct to providers** (no Lovable credits used):
- Grace notes, shared devotional, chat replies → Anthropic (`ANTHROPIC_API_KEY`)
- Heart Note AI responses → OpenAI (`OPENAI_API_KEY`)

So there is exactly one thing to move off Lovable: the cover image generator.

## The change

Switch `google/gemini-3.1-flash-image` calls from Lovable AI Gateway to Google's Gemini API directly, using a new `GOOGLE_API_KEY` secret. Visual output stays identical (same model). Zero Lovable credits used afterwards.

Two files carry the cover-image call (per the §5 three-pair sync rule) — both must change together:

1. **`src/lib/devotional-cover.server.ts`** — canonical `generateAndStoreDevotionalCover`. Today it POSTs to `https://ai.gateway.lovable.dev/v1/images/generations` with `Lovable-API-Key`. Rewrite the fetch to hit Google's `generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent` endpoint with `?key=${GOOGLE_API_KEY}`, adapt the request body to the native Gemini shape (`contents: [{ parts: [{ text: prompt }] }]`, `generationConfig.responseModalities: ["IMAGE"]`), and decode the base64 image bytes from `candidates[0].content.parts[].inlineData.data`. Keep `buildCoverPrompt`, the upload to the private `devotional-covers` bucket, and the returned proxy URL exactly the same.
2. **`supabase/functions/generate-daily-devotional/index.ts`** — inlined copy of the same call inside the nightly cron edge function. Apply the same rewrite. The edge function reads secrets via `Deno.env.get("GOOGLE_API_KEY")`.

Nothing else in the app needs to change — the storage bucket, proxy route `/api/public/devotional-cover/$date.png`, `daily_devotionals.cover_image_url`, Library/OG usage, and the backfill mode are all downstream of these two functions.

## Secrets

- **Add `GOOGLE_API_KEY`** (project runtime secret) using the add_secret flow. User creates the key at Google AI Studio (aistudio.google.com → Get API Key → Create API key in new project) and pastes it in.
- Same secret gets read by both the TanStack server function (`process.env.GOOGLE_API_KEY` inside `.handler()`) and the Supabase edge function (`Deno.env.get`). Supabase edge function secrets are set via the Supabase secrets tool.
- `LOVABLE_API_KEY` stays put — it's still used by connectors and would come back into play if we ever add a Lovable-based feature. It just won't be spent on covers.

## Verification (after build)

1. Delete the `cover_image_url` for one recent date in `daily_devotionals`, then hit that devotional in the app (or curl the edge function with `{ "backfill": true, "date": "YYYY-MM-DD" }`). Confirm a new PNG lands in the `devotional-covers` bucket and the proxy URL serves it.
2. Check `ai_gateway_logs--list_ai_gateway_requests` a day later — new image generations should be **zero**.
3. Watch worker/edge logs for any Gemini 400/403 errors (usually mean the key isn't image-enabled or the region blocks image gen — worth knowing on day 1, not day 7).

## Docs to update

Add a short entry to CLAUDE.md §11 dated today: "Moved devotional cover image generation off Lovable AI Gateway to direct Google Gemini API (`GOOGLE_API_KEY`). Both prompt-sync files updated. Lovable credits no longer consumed by the cover pipeline." Bump §5's third prompt-pair note if the code shape changes (it shouldn't — prompt text is unchanged).

## What we're deliberately NOT doing

- Not swapping the model. Same `gemini-3.1-flash-image`, same visuals.
- Not touching Anthropic/OpenAI paths — they already run off Lovable.
- Not adding a fallback to Lovable Gateway. One provider, one code path.
- Not turning covers off. They stay on.

## Rough estimate

Google's public pricing for `gemini-3.1-flash-image` is ~$0.039 per image (spec at time of writing). At ~1 image/day baseline + occasional backfills, this is well under $2/month direct-billed — orders of magnitude cheaper than the credit-equivalent, and unmetered by Lovable's monthly allowance.
