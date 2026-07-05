## Goal

Unify the four share triggers under one coherent model:

- **Devotional** → link share (`navigator.share({ title, url })`). Public page carries the meaning.
- **Grace-note, answered-prayer, milestone** → **image file share** with **auto-copy on Share tap**. Instagram / TikTok / WhatsApp / iMessage all appear as targets. Caption lands on clipboard the moment Share is tapped; user pastes in destination app.

Also folds in the earlier asks: reframe modal copy to center the user's own walk; shrink devotional Share button to a subtle ghost icon.

## 1. Share modal — dual mode (`src/components/share-card-modal.tsx`)

Mode derived from context:

```ts
const mode = ctx.type === "devotional" ? "link" : "image";
```

### Capability probe (mount-time, SSR-safe)

```ts
const [canShareFiles, setCanShareFiles] = useState(false);
useEffect(() => {
  if (typeof navigator === "undefined" || !navigator.canShare) return;
  const probe = new File([""], "probe.png", { type: "image/png" });
  try { setCanShareFiles(navigator.canShare({ files: [probe] })); } catch {}
}, []);
```

### Link mode (devotional only)

- No caption block. No copy buttons.
- Single primary button: **Share** → `navigator.share({ title: "GraceNotes Daily", url: data.deep_link })`.
- Fallback if `navigator.share` unsupported: label swaps to **Copy link** and copies `data.deep_link`.
- Preserves CLAUDE.md §0 rule #5 invariant (no `text` alongside `url`).

### Image mode (grace-note, answered-prayer, milestone)

Layout:

```
[ 4:5 image preview ]

Your caption  ·  tap to copy    📋
[ tappable card containing the caption text ]

[  ✧  Share  ]        ← primary, gradient-gold
Caption's already copied — paste when you get there.

Maybe later
```

**One button. Just "Share".** No "Copy link". No "Share image" vs "Share link". The user doesn't need to think about payload types.

Behavior:

- **Caption block is the copy affordance.** Tapping the entire card runs `navigator.clipboard.writeText(caption)` + toast "Caption copied." Small clipboard icon (top-right of the card) as a visual hint. No separate "Copy caption" button — the block IS the button.
- **Share button — auto-copy first, then share.** On tap:
  1. `await navigator.clipboard.writeText(caption)` — silently.
  2. Fetch `image_url` → wrap as `File` (spinner state on button while fetching, ~200-500KB, same-origin, immutable-cached).
  3. `await navigator.share({ files: [file], title: "GraceNotes Daily" })` — no `url`, no `text`.
  4. On the FIRST successful share of the session, toast: *"Caption copied — paste it when you get there."* Persist `gn:share:paste-hint-seen` in localStorage so it appears once, not every share.
  5. The helper line under the Share button — *"Caption's already copied — paste when you get there."* — is always visible in image mode, so users learn the pattern without being nagged by toasts.
- **Clipboard write failures are silent.** In-app browsers (Instagram's own, Facebook's, LinkedIn's) can block programmatic clipboard writes. If it throws, we fall through to the share — the caption block is still tappable for manual copy.
- **Desktop / no canShareFiles:** primary button swaps to **Download image** (anchor with `download` attribute pointing at `image_url`, filename per §2 below). Caption block stays as-is. No Copy link — per your ask.
- **Errors:**
  - Image fetch fails → toast "Couldn't prepare the image" + swap primary to Download.
  - `navigator.share` cancel (AbortError) → silent.
  - `navigator.share` other error → toast "Couldn't open share sheet" + reveal Download.

### Cleanup

- Remove the editable `<textarea>` and `caption` state — caption is read-only from `data.caption`.
- Remove the "Copy caption" button — the caption block replaces it.
- Remove the "Copy link" button entirely from image mode.

## 2. Filename convention for File / Download

Deterministic per share (idempotent re-shares):

- `gracenotes-grace-note-<YYYY-MM-DD>.png`
- `gracenotes-answered-prayer-<prayer_id>.png`
- `gracenotes-<tier>-day-rhythm.png`

Devotional never downloads — link mode.

## 3. Reframe modal copy (all four call sites)

Rewrite `heading` props to center the user's walk, not the recipient. No "someone in your life", no "share it forward":

| Trigger | File | Eyebrow | Title | Subtitle |
|---|---|---|---|---|
| Devotional | `src/components/devotional-modal.tsx` | Today's devotional | Keep this one close | A quiet way to remember what stirred in you today. |
| Grace note | `src/routes/home.tsx` | Today's grace note | Hold onto this | Save it where you'll see it again. |
| Answered prayer | `src/routes/prayers.tsx` | Prayer answered | Mark the moment | A small record of what He did. |
| Milestone | `src/components/milestone-watcher.tsx` | `${tier}-day rhythm` | `${tier} days of showing up` | A marker for your own walk. |

Drafts — flag any wording you want changed before I ship.

## 4. Shrink the devotional Share button (`src/components/devotional-modal.tsx`)

The received-state row: replace the second pill with a subtle ghost icon.

- Keep **Received today** pill as the emotional anchor.
- Replace outlined Share pill with 36×36 ghost icon: `Share2` at `size="sm"`, `text-grace/70`, `hover:bg-grace-soft`, `aria-label="Share"`, tooltip "Share".
- No Share button in the pre-receive state.

Spot-check grace-note trigger in `home.tsx` and answered-prayer trigger in `prayers.tsx` — align to the same ghost-icon treatment.

## 5. QA sweep

- **iOS Safari (current)**: image mode → Instagram, WhatsApp, TikTok, iMessage all appear. Auto-copy toast shows once per install. Devotional → link with OG preview.
- **Android Chrome (current)**: same.
- **Desktop Chrome / Safari / Firefox**: `canShareFiles` false → Download image visible; devotional Share works or falls back to Copy link.
- 375 / 768 / 1280 viewports: caption block wraps cleanly, no overflow; devotional received-row fits on one line at 375px.
- Milestone auto-open still doesn't race the daily devotional modal.

## Out of scope

- No changes to `src/lib/share.ts` — backend contract already returns `image_url`, `caption`, `deep_link`. No edits needed.
- No analytics, no dismissal-key changes.
- No caption refresh button (deferred).
- No changes to `share-bar.tsx` (SEO landing surface).

## Downsides — the honest list

1. **Two gestures on Instagram / TikTok.** Auto-copy softens it; user still long-presses-paste in the destination app. Ceiling set by Meta/ByteDance.
2. **Clipboard silently overwrites whatever the user had.** Standard for every creator tool, but worth naming.
3. **Clipboard write can fail in some in-app browsers.** Instagram's own webview, Facebook's, LinkedIn's — programmatic writes may be blocked. We fall through: caption block stays tappable.
4. **The "Caption copied" first-share toast is a one-shot teach moment.** Miss it and the user might not know why we copied. Always-visible helper line mitigates but doesn't fully replace it.
5. **In-app browsers may lack `navigator.share` entirely.** Traffic from inside Instagram/Facebook browsers hits desktop fallback (Download image). Nothing we can do — those webviews strip the API.
6. **No signal back from destinations.** We can't tell if the paste happened. Standard for all web-share flows.
7. **Caption is fixed per session — no refresh yet.** Backend rotates 10 sequentially, but a user who doesn't love this one has no in-modal option to swap. Small follow-up if you want it.
8. **File fetch adds a brief network round-trip before the sheet opens.** ~300ms cold, instant warm. Button spinner covers it.
9. **The CLAUDE.md invariant stays intact.** Fork B never passes `text`+`url` together, so the 2026-07-05 concatenation bug can't recur. Good.
10. **Removing "Copy caption" as an explicit button means the caption block must be discoverable as tappable.** We handle this with the clipboard icon + "tap to copy" hint, but it's less obvious than a labeled button. Trade-off for cleaner layout.
