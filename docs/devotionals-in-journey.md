# Feature spec: devotionals in Journey

**Status:** ready to build  
**Depends on:** `daily_devotionals` table (live), `generate-daily-devotional` cron (live since 2026-06-28)  
**Deferred:** date range filter (add later once base is shipped)

---

## What this does

Adds a `Devotional` entry type to the existing Journey page (`src/routes/journey.tsx`). Users can browse past shared devotionals alongside their Heart Notes and answered prayers. Each devotional card links out to the public `/library/devotional/YYYY-MM-DD` page (URL updated 2026-07-05; spec originally said `/devotional/YYYY-MM-DD`, which now 301s) — it does not expand inline.

---

## Data source

Table: `daily_devotionals`  
RLS: public select for `anon` and `authenticated` — no user_id filter needed.

Query (run alongside the existing `heartReq` and `prayerReq`):

```ts
const devotionalReq = supabase
  .from("daily_devotionals")
  .select("date, title, verse_ref, body")
  .lt("date", today)           // exclude today — today lives at /devotional
  .order("date", { ascending: false })
  .limit(60);                  // ~2 months; paginate with the rest
```

Data availability: rows exist from approximately **2026-06-22** onwards. Before the dedicated cron launched (2026-06-28), rows only exist for dates that were viewed on demand. There may be gaps in the first week — this is expected and fine.

---

## Entry type shape

Extend the existing `Entry` type in `journey.tsx`:

```ts
type Entry = {
  id: string;
  type: "heart-note" | "prayer" | "devotional";   // add "devotional"
  isoDate: string;
  date: string;
  title: string;
  body: string;
  extra?: string;
  verseRef?: string;     // new — only populated for devotionals
};
```

Map devotional rows:

```ts
for (const d of devotionals ?? []) {
  entries.push({
    id: `dv-${d.date}`,
    type: "devotional",
    isoDate: d.date as string,
    date: fmt(d.date as string),
    title: (d.title as string) || "Daily Devotional",
    body: (d.body as string) ?? "",
    verseRef: (d.verse_ref as string) || undefined,
  });
}
```

---

## Filter dropdown

Add a fourth option to the existing `<Select>`:

```tsx
<SelectItem value="devotional">Devotionals</SelectItem>
```

Update the filter type:
```ts
const [type, setType] = useState<"all" | "heart-note" | "prayer" | "devotional">("all");
```

---

## Card component

Devotional cards do not expand. Render them as a separate branch inside the existing `.map()`:

```tsx
if (e.type === "devotional") {
  return (
    <a
      key={e.id}
      href={`/devotional/${e.isoDate}`}
      className="glass rounded-2xl p-5 block no-underline"
    >
      <div className="text-xs text-gold font-semibold uppercase tracking-wider">
        Devotional · {e.date}
      </div>
      <h3 className="font-display text-xl text-foreground mt-1 mb-2">
        {e.title}
      </h3>
      {e.body && (
        <p className="text-sm text-foreground/75 line-clamp-2 mb-3">
          {e.body}
        </p>
      )}
      <div className="flex items-center justify-between">
        {e.verseRef && (
          <span className="text-xs font-semibold text-foreground/40">
            {e.verseRef}
          </span>
        )}
        <span className="flex items-center gap-1 text-xs font-bold text-grace ml-auto">
          Read in full <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </a>
  );
}
```

**Key differences from heart-note / prayer cards:**
- Rendered as `<a>` not `<div>` — the whole card is the link
- No expand/collapse
- No edit or delete controls
- `text-gold` for the type label (vs `text-grace` for heart notes and prayers)
- `ArrowRight` icon in the footer — import from lucide-react (already imported in the file)

---

## Subtitle copy update

Update the `PageHeader` subtitle to mention devotionals:

```tsx
subtitle="Find the record of your Heart Notes, answered prayers, and the devotionals written for your days."
```

---

## "Today's devotional" — do not include

The query uses `.lt("date", today)` to exclude today. Today's devotional lives at `/devotional` and is surfaced from the home screen. Journey is retrospective only.

---

## SEO note

The Journey page is behind `RequireAuth` — Google cannot read it. The SEO-facing surface for devotional archive content is a separate public route (not yet built). That is a separate task. This feature is purely for authenticated users browsing their own history.

---

## What NOT to touch

- Do not change the existing heart-note or prayer card behaviour
- Do not change `glass`, `glass-on-hue`, or any design tokens
- Do not add loading spinners beyond the existing pattern
- Do not add a date filter now — deferred

---

## Import additions needed

None beyond what is already in `journey.tsx`. `ArrowRight` may need to be added to the lucide-react import line if not already present:

```ts
import { Compass, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Pencil, Trash2, Check, X, ArrowRight } from "lucide-react";
```

---

## Acceptance criteria

- [ ] "Devotionals" appears as a filter option in the type dropdown
- [ ] Devotional cards render with `text-gold` type label, Fraunces title, verse ref, and "Read in full" link
- [ ] Clicking a devotional card navigates to `/devotional/YYYY-MM-DD`
- [ ] Today's date is excluded from results
- [ ] Existing heart-note and prayer cards are unchanged
- [ ] No errors when `daily_devotionals` returns zero rows (empty state shows "Nothing here yet")
- [ ] Pagination works correctly when devotionals are mixed with other entry types
