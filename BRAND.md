# GraceNotes Daily — Brand & Design System

---

## Brand Voice

**Core tone:** Soft, held, seen, welcome. Never pushy.

The voice of GraceNotes Daily is like a note left on someone's table by someone who loves them. It is not teaching, not instructing, not announcing. It is offering something true and soft enough that the reader can receive it wherever they are.

**The voice is not:**
- Preachy or instructional
- Performative warmth ("So amazing that you're here!")
- Diagnostic ("You've been feeling overwhelmed lately…")
- Chatbot-like or structured
- List-heavy or advice-driven

**The voice is:**
- Unhurried and human
- Present without being heavy
- Warm without gushing
- Steady when the user is heavy; lighter when the user is light
- Spoken, not written — every piece of copy should pass a "read it aloud" test

**Pronouns:** God's pronouns are always capitalised — He, Him, His.

**Em dashes:** Never. Stripped from all AI output in code; prompts also instruct models not to use them.

**No emojis** in any navigation chrome or UI surfaces. Emojis are permitted only inside user-generated content.

**No "free" language** anywhere — not on landing pages, not in-app.

**"Daily Rhythms"** is the canonical term for the habit system. Not "streaks," not "Divine Habit Streaks."

---

## Tone by User Segment

These segments shape AI output tone only — the label is never shown or reflected back to the user.

| Segment | Tone |
|---------|------|
| `newbie` | Gentle entry, nothing assumes prior knowledge |
| `returnee` | Warm, low barrier, no dwelling on any gap |
| `growth` | Slightly more direct, assumes some familiarity |
| `elder` | Peer tone, can hold complexity |

---

## Design System

### Typography

| Role | Font | Fallback |
|------|------|----------|
| Display / headings | Fraunces (serif) | ui-serif, Georgia, serif |
| Body / UI | Nunito (sans-serif) | ui-sans-serif, system-ui, sans-serif |

- Fraunces is used for headings, the profile initial in the sidebar, and any display text that needs gravitas.
- Nunito is used for all body copy, navigation labels, and UI elements.
- Nav labels in the sidebar are Nunito, regular weight, small size. Hidden in collapsed state.

---

### Color Tokens

All tokens are defined in `src/styles.css` and must not be changed.

#### Brand greens (primary palette)

| Token | Value (oklch) | Use |
|-------|--------------|-----|
| `--grace` | `oklch(0.42 0.08 152)` | Primary interactive colour |
| `--grace-deep` | `oklch(0.30 0.06 152)` | Sidebar background, deep surfaces |
| `--grace-mid` | `oklch(0.42 0.08 152)` | Mid-tone green (same as `--grace`) |
| `--grace-haze` | `oklch(0.55 0.09 152)` | Lighter green, haze/overlay |
| `--grace-soft` | `oklch(0.95 0.025 152)` | Very soft green tint backgrounds |

#### Accent gold

| Token | Value (oklch) | Use |
|-------|--------------|-----|
| `--gold` | `oklch(0.78 0.14 85)` | Accent — streak badge, home icon, feedback button |
| `--gold-soft` | `oklch(0.95 0.06 85)` | Soft gold tint backgrounds |
| `--gold-foreground` | `oklch(0.25 0.04 80)` | Text on gold surfaces |

#### Base / neutrals

| Token | Value (oklch) | Use |
|-------|--------------|-----|
| `--background` | `oklch(0.985 0.008 100)` | App background |
| `--foreground` | `oklch(0.22 0.03 150)` | Primary text |
| `--muted` | `oklch(0.96 0.015 130)` | Muted backgrounds |
| `--muted-foreground` | `oklch(0.5 0.02 150)` | Secondary text |
| `--radius` | `1rem` | Base border radius |

---

### Glass Surfaces

Two surface types only — do not introduce others.

| Class | Use |
|-------|-----|
| `.glass-on-hue` | Ambient surfaces, cards that sit over the nature background |
| `.glass-parchment` | Long-read surfaces — devotionals, heart notes, anything that requires sustained reading |

---

### Iconography

- **Lucide only.** No other icon libraries.
- Always rendered via the custom wrapper: `<Icon icon={X} size="..." />` from `src/components/icon.tsx`.
- Consistent thin-line stroke weight throughout.
- No emojis in chrome.

---

### Sidebar

The sidebar is a collapsible-icon shadcn sidebar, expanded by default. Pin preference persists at `localStorage["gn:sidebar:pinned"]`.

**Visual direction:** Contemplative, premium, peaceful, elegant, spiritually grounded. Luxury devotional app — not a productivity tool.

**Palette:** Deep forest green (`--grace-deep`) background + warm gold (`--gold`) accents with soft glassmorphism.

**Icon states:**

| State | Treatment |
|-------|-----------|
| Default | Icon at white/70 opacity, no container fill |
| Hover | Soft glow increase, gentle lift (`translateY(-1px)`), white/8–10 container fill, 200ms ease |
| Active | White/12–15 illuminated background, thin gold left border OR gentle gold glow (not both), icon at 100% opacity — no chunky pills |
| Collapsed | Icons + streak badge remain visible; tooltips on hover; collapse affordance only visible on hover |

**Special icons:**
- Home — gold dove medallion, slightly larger than others, most prominent
- Profile — circular dark green background, thin gold ring border, centered user initial in Fraunces, soft quiet glow

**Streak badge:** Compact gold pill beside flame icon. Supports 1-, 2-, and 3-digit numbers without breaking. Visible in both expanded and collapsed states. Uses text-scaled width — not fixed.

**Animations:** All `ease` or `ease-out`, 150–200ms. No bouncy or springy transitions. Collapse/expand is a smooth slide.

---

### Nature Backgrounds

Authenticated pages use `<NatureBackground />` as the full-bleed ambient layer.

Background image categories: `nightsky`, `ocean`, `sunrise`, `vegetation`, `weather` — 25 images total.

**Imagery rules (locked):**
- Never: alcohol, smoking, drugs, gambling, suggestive imagery, violence, brand logos, memes, religious symbols from other faiths used decoratively, identifiable real people
- Always: forests, mountains, dawn light, mist, still water, open fields, soft skies, hands, candles, open books, simple natural textures
- Vet every image URL before adding to `nature-background.tsx` and keep the comment block in sync

---

### Page Structure

| Context | Pattern |
|---------|---------|
| Authenticated pages | `<NatureBackground />` + hero block or `<PageHeader />` |
| Long-read content | `.glass-parchment` surface |
| Ambient cards / widgets | `.glass-on-hue` surface |

---

## UX Principles

- **Action-gated habits.** Tapping a habit circle navigates to the feature surface. Habits only complete by performing the action — devotional received, message sent, heart note submitted. Never on circle click. This is locked.
- **Midnight reset.** Daily chat and habits reset at midnight in the user's local timezone.
- **No diagnostic copy.** Do not tell the user what they are feeling or have been through. If they named a feeling, reflect it gently. Do not diagnose.
- **AI output is never raw.** All Claude and OpenAI output passes through an em-dash/en-dash sanitizer (`src/lib/ai.functions.ts`) before returning to the user.
- **Streaming chat.** The chat reply endpoint uses SSE streaming — users see the first word within ~300ms.
- **Crisis handling is present but quiet.** The safety system operates invisibly unless triggered. When triggered, the response is warm and human, not clinical.

---

## Onboarding Personalization Contract

These are the five data points captured in onboarding. They drive all AI personalization and must not be changed without a UX change.

| Field | Values |
|-------|--------|
| `name` | Free text |
| `phase` (faith phase) | `exploring`, `growing`, `deepening` |
| `rhythms` | `morning`, `midday`, `evening`, `night` (multi-select) |
| `seasons` | Array of `{ tag, set_at }` — emotional/life seasons |
| `voice` | `gentle`, `grounding` |

`timezone` and `translation` (Bible translation preference, e.g. NIV) are also stored on the profile.

---

## What Must Not Change Without Owner Approval

- `src/styles.css` — all design tokens
- Locked components: `app-sidebar.tsx`, `app-shell.tsx`, `nature-background.tsx`, `page-header.tsx`, `player-dock.tsx`, `icon.tsx`
- `src/components/ui/*` — shadcn components
- Onboarding step structure and field set
- Habit auto-complete rule
- Translation / voice / season options
