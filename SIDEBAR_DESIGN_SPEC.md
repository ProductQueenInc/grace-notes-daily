# GraceNotes Daily — Sidebar Navigation Design Specification

> Source of truth for sidebar refinement. Lovable and Claude Code should both reference this file.
> Last updated: 2026-05-22

---

## Core Design Direction

The sidebar must embody **contemplative, premium, peaceful, elegant, and spiritually grounded** aesthetics.
Visual tone: **luxury devotional app** — not productivity tool, not social app.

Palette anchors: deep forest green (`--grace-deep`) + warm gold (`--gold`) with soft glassmorphism.

---

## Layout Principles

- Center all nav items horizontally with balanced, symmetrical padding
- Consistent vertical rhythm between items — no crowding, no gaps that feel accidental
- Clean, uncluttered appearance — negative space is intentional
- Collapsed sidebar still shows icons + streak badge; nothing disappears unexpectedly

---

## Icon Components

### Home Icon — Gold Dove Medallion
- Slightly larger than other nav icons (it is the sacred anchor of the app)
- Raised/elevated appearance with subtle gold glow
- Most visually prominent icon in the set

### Profile Icon — Dark Green Medallion
- Circular dark green background with a thin elegant gold ring border
- Centered user initial in elegant serif font (Fraunces)
- Soft minimal glow — quieter than Home icon
- Personal and refined; not loud

### All Other Icons
- Mathematically perfect circular containers
- Thin-line Lucide icon style, consistent stroke weight
- Softer shadows, cleaner edges, subtle depth
- Balanced glow intensity — no icon should overpower another

---

## States

### Default (resting)
- Icon in white/70 opacity on dark green sidebar
- No background fill on the container

### Hover
- Soft glow increase on the icon
- Gentle elevation (subtle `translateY(-1px)` or shadow lift)
- Container gets a very subtle white/8–10 background fill
- Animation: smooth, calm — 200ms ease

### Active (current page)
- Subtle illuminated background behind the icon (white/12–15, not a chunky pill)
- Soft gold accent — thin left border OR gentle gold glow, not both
- Icon opacity goes to 100%
- No oversized markers, no bold pills — refined and minimal

### Collapsed sidebar
- Icons remain visible and centred
- Streak badge (compact gold pill + flame) remains visible
- Tooltips appear on hover showing route label
- Collapse/expand affordance appears on hover, not permanently visible

---

## Streak Counter Badge

- Compact gold pill beside the flame icon
- Must elegantly support 1-digit, 2-digit, and 3-digit numbers without breaking layout
- Remains visible in both expanded and collapsed states
- Scales with text — do not use a fixed width

---

## Animation & Interaction

- All transitions: `ease` or `ease-out`, 150–200ms
- Collapse/expand: smooth slide, not a jump
- Hover glow: gradual increase, not instant flash
- No bouncy or springy animations — calm and intentional pacing throughout

---

## Typography

- Serif (Fraunces) reserved for the Profile initial only
- All nav labels: Nunito, regular weight, small size
- Labels hidden in collapsed state; icon + badge remain

---

## What NOT to do

- No chunky pill active indicators
- No oversized active markers that compete with content
- No heavy drop shadows
- No emojis in navigation chrome
- Do not use any icon library other than Lucide
- Do not change the sidebar's existing collapse/expand logic — only refine the visual layer
