# GraceNotes Daily — Typography & Surface Spec

Single source of truth for fonts, color, and spacing across the app. Pair with `BRAND.md` (brand voice) and `src/styles.css` (tokens).

---

## 1. Fonts (loaded in `src/routes/__root.tsx`)

| Role | Family | Notes |
|------|--------|-------|
| Display (headings, hero, pull-quotes) | **Fraunces** | `font-display`, optical-sized, soft. Used for h1/h2/h3 and any editorial flourish. |
| Body (everything else) | **Nunito** | `font-sans`. Used for paragraphs, UI chrome, buttons, labels. |

Never introduce a third family. Never use a serif for body or Nunito for headings.

---

## 2. Color tokens (defined in `src/styles.css`)

- `--grace` — primary forest green (headings on light surfaces, primary buttons)
- `--grace-deep` — deeper forest (hover state, body emphasis on parchment)
- `--gold` — single accent (h3 sub-headers inside guides, links, icons)
- `--foreground` — default body color on parchment / cards
- `--muted-foreground` — secondary metadata

**Never use raw Tailwind colors** (`text-gray-500`, `text-black`, etc.). Always semantic tokens.

---

## 3. The two surfaces

Every authenticated or marketing page uses exactly one of these:

### `.glass-on-hue` — ambient, on top of NatureBackground
- Deep forest opaque green (`--surface-haze-card`)
- Text: **white** by default (`--text-on-hue`)
- Use for: hero cards, CTAs, dashboards, anything floating over the photo background.

### `.glass-parchment` — long-form reading
- Warm cream gradient
- Text: dark forest (`--text-on-parchment`)
- Use for: article bodies, guides, devotional reader.
- Inside parchment, `text-white*` utilities are auto-remapped to dark forest tones (a11y override in `styles.css`).

**Anti-pattern (a contrast bug):** the cream `.glass` class with white text. Always pick one of the two above.

---

## 4. Heading scale

| Level | Family | Size (notes-prose) | Color on parchment | Color on hue |
|-------|--------|--------------------|--------------------|--------------|
| h1 (page title) | Fraunces | `text-4xl md:text-6xl` | `--grace-deep` | white |
| h2 (section) | Fraunces | `1.85rem` / `text-3xl` | `--grace` | white |
| h3 (sub-section) | Fraunces | `1.35rem` / `text-xl` | `--gold` | `--gold` |
| Body | Nunito | `1.0625rem`, line-height `1.8` | `--foreground` | white/90 |
| Meta / caption | Nunito | `text-sm`, `text-xs` | `--muted-foreground` | white/75 |

Guide pages (`/7-day-prayer-journal`, `/fasting-guide`, `/free-prayer-toolkit`) use h2 in `--grace-deep` Fraunces and h3 in `--gold` Fraunces. Body bolds (`<strong>`) use Nunito 600 in `--grace-deep`.

---

## 5. Spacing rhythm

- Section card padding: `p-8` (mobile) / `p-10 md:p-12` (long reads)
- Between sections inside a stack: `space-y-6` (default), `space-y-8` (guide pages)
- Between paragraphs inside `.notes-prose`: `1.15em` top margin (handled by CSS)
- Hero → first card: `pt-8 pb-6`
- CTA card → footer: `mt-12 pb-16`

---

## 6. Editorial flourishes (Notes & Letters only)

Defined in `src/styles.css` under `.notes-prose`. Applied automatically when the article body is wrapped in `<div class="notes-prose">`:

- Drop cap on first paragraph (Fraunces, gradient grace→gold)
- `<strong>` gets a gold highlight under-bar
- `<em>` becomes Fraunces italic in gold-leaning grace
- `<blockquote>` becomes a Fraunces pull-quote with gold rule + opening curly quote
- `<hr>` renders the GraceNotes dove ornament
- Inline scripture references (e.g. `Proverbs 16:3`) auto-wrap in `.scripture-ref.inline`; any paragraph that starts with one becomes a parchment-tinted verse call-out with a gold left rule + dove marker

Do not add new flourishes without updating this file.

---

## 7. Buttons

| Variant | Background | Text | Use |
|---------|------------|------|-----|
| Primary | `bg-grace hover:bg-grace-deep` | white | Main CTA on parchment ("Create your free account") |
| Accent | `bg-gold hover:bg-gold/90` | white | Welcome-back / re-engage CTA on hue ("Welcome in") |
| Ghost on parchment | `bg-transparent border-grace/30 text-grace` | grace | Secondary actions ("Keep reading") |
| Ghost on hue | `bg-white/90 text-grace` | grace | "Browse all Notes & Letters" arrow |

White text inside `.glass-parchment` is auto-remapped to dark forest by the a11y override. For buttons that need to keep white text on a green fill **inside parchment**, use inline `style={{ color: "#ffffff" }}` to escape the override.

---

## 8. Audit checklist (run before shipping a new page)

- [ ] Page uses `.glass-on-hue` OR `.glass-parchment` — never raw `.glass` with white text.
- [ ] Headings use Fraunces; body uses Nunito.
- [ ] No raw Tailwind color classes — only semantic tokens.
- [ ] Body line-height ≥ 1.7 on long-form sections.
- [ ] All CTAs meet WCAG AA contrast (white on `--grace` ✓, white on `--gold` ✓, `--grace` on cream ✓).
- [ ] Icons via `@/components/icon` (Lucide), stroke 1.75.
- [ ] No emojis in chrome.
