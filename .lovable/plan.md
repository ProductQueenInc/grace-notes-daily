## Plan: Direct Google Gemini for devotional covers

`GEMINI_API_KEY` is now saved. Ready to build.

### Changes

**1. `src/lib/devotional-cover.server.ts`**
- Swap endpoint: `https://ai.gateway.lovable.dev/v1/images/generations` → `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${GEMINI_API_KEY}`
- Swap request body from Gateway shape → native Gemini shape:
  ```
  { contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["IMAGE"] } }
  ```
- Swap response parse: `data.data[0].b64_json` → `data.candidates[0].content.parts[].inlineData.data`
- Read `process.env.GEMINI_API_KEY` inside the handler (not module scope)
- Everything else unchanged: prompt, bucket, storage path, proxy URL, cache headers, error handling

**2. `supabase/functions/generate-daily-devotional/index.ts`**
- Identical rewrite in the inlined cover-generation block
- Read `Deno.env.get("GEMINI_API_KEY")`
- Preserves CLAUDE.md §5 three-pair sync rule (prompt text itself unchanged)

**3. Redeploy `generate-daily-devotional` edge function**
- Required for cron to use the new code path. Deploy via supabase tool after editing.

**4. CLAUDE.md §11 entry**
- Log the transport change, note key naming, note that cost now bills directly to Google AI Studio "GraceNotes Daily" project instead of Lovable credits.

### Verification (after build)
- Delete `cover_image_url` for one test date in `daily_devotionals`, hit the proxy URL, confirm a fresh PNG lands in the `devotional-covers` bucket.
- After next cron run (09:00 UTC), confirm 2026-07-16's row has a cover.
- Check Lovable AI Gateway logs the following day → zero `google/gemini-3.1-flash-image` calls.
- Check Google AI Studio → GraceNotes Daily → Spend shows the traffic.

### Explicitly NOT doing
- Not swapping the model (staying on `gemini-3.1-flash-image`)
- Not adding a Lovable Gateway fallback (owner wants clean cutover)
- Not touching Anthropic/OpenAI paths (grace notes, devotional text, chat safety stay on Lovable/Claude)
- Not touching the prompt text — this is a pure transport swap
