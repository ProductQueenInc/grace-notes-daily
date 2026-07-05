# Share UI — four emotional peaks (frontend only)

Version A confirmed: `navigator.share({ title, url })` only. The backend sets `og:image` on the deep link so unfurls show the share card. No blob/file work.

## Scope

Four triggers, one shared modal, one mocked API.

1. **Grace Note** — share icon in the grace-note card header. Always available.
2. **Post-receive Devotional** — after "I Receive This" is tapped in the devotional modal, replace the CTA area with a share prompt. One-shot per devotional date (persisted).
3. **Answered Prayer** — refactor the existing "mark as answered" flow. Same modal is repurposed: user marks it answered, modal morphs into the share prompt. One-shot per submission.
4. **Milestone Celebration** — auto-open on 1st gold day, then 5 / 10 / 30 / 60 / 100. Never twice for same tier. Persisted in localStorage.

## New files

- `src/lib/share.functions.ts` — mocked `generateShareCard({ type, context })` server fn. Returns `{ image_url, caption, deep_link }`. Backend swaps the body later; the contract is frozen.
- `src/hooks/use-share-card.ts` — TanStack Query wrapper (staleTime infinity, retry once).
- `src/components/share-card-modal.tsx` — the shared modal (skeleton → image + caption + copy + native share + dismiss). Handles all six states.
- `src/lib/share-dismissals.ts` — tiny localStorage helpers keyed by trigger + id (date / prayer id / milestone tier).
- `src/lib/milestones.ts` — pure helper `nextMilestoneTier(streakDays)` returning `1 | 5 | 10 | 30 | 60 | 100 | null` and `shouldCelebrate(streakDays)` that combines with dismissal state.

## Edits

- `src/components/grace-note-card.tsx` (or wherever the header lives) — add Lucide `Share2` icon, opens modal with `type: 'grace_note'`, context `{ note_id, theme }`.
- `src/components/devotional-modal.tsx` — after `markComplete('devotional')` fires, swap the CTA row for the share prompt (inline share card modal state, `type: 'devotional'`, context `{ date, theme }`). Dismissal keyed by devotional date.
- `src/routes/prayers.tsx` (or the answered-prayer entry) — the "mark as answered" action opens the shared modal in `type: 'answered_prayer'` mode; the modal shows a short "Praise God" heading + the share card.
- `src/routes/home.tsx` — mount a `<MilestoneWatcher />` that reads streak, computes `shouldCelebrate`, and opens the modal once.

## Modal states (all four triggers reuse)

| State | UI |
|---|---|
| Loading | rounded skeleton (image ratio 4:5) + shimmer caption lines |
| Ready | image, caption in editable textarea, Share button, Copy caption, Maybe later |
| Shared | modal closes; toast "Shared" |
| Dismissed | modal closes; dismissal persisted |
| Error | small error line + Retry button (re-runs the query) |

Share button always sends `{ title: appTitle, url: deep_link }` only. Edited caption is used for the Copy button only — never sent to `navigator.share`.

## Frozen contract (matches backend)

```ts
type ShareType = 'grace_note' | 'devotional' | 'answered_prayer' | 'milestone';
type ShareContext =
  | { note_id: string; theme?: string }                 // grace_note
  | { date: string; theme?: string }                    // devotional (weekday theme)
  | { prayer_id: string }                               // answered_prayer
  | { tier: 1 | 5 | 10 | 30 | 60 | 100; streak: number }; // milestone

type ShareCard = { image_url: string; caption: string; deep_link: string };
```

`generateShareCard` mock returns placeholder image (existing OG png) + a caption seeded from templates so the UI feels alive during dev.

## Out of scope (per your direction)

- No `files:` share, no clipboard image copy.
- No analytics wiring (comes with backend).
- No content-safety edits to captions (user edits their own copy only).
- Backend rendering (Satori/Canva pipeline) — untouched.

## Risks / notes

- The devotional modal edit is the most invasive change; will preserve the existing "Received" label path when dismissed.
- Milestone auto-open must not race with the daily devotional modal. Watcher only opens if no other modal is open (checks a lightweight `useModalStack` or just `document.querySelector('[role=dialog]')`).
- `pickDailyPromise` and existing `share-bar.tsx` are untouched.
