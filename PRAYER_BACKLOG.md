# Prayer Page — Planned but Not Yet Built

This document captures the six design directions we discussed for the `/prayers` page. Everything currently live (filters, "Remember When" carousel, pagination, edit/delete, answered celebration) is already shipped and verified at `https://gracenotesdaily.com/prayers`.

---

## 1. Categories / Tags

Add thematic tags beyond the current status filter: **Family, Health, Work, Provision, Spiritual**.
- Let users tag a prayer when creating or editing.
- Filter by category in the UI.
- Could be a multi-select chip set alongside the existing All/Active/Answered tabs.

## 2. Bento Dashboard Layout

Replace the stacked-list default with a **bento-grid dashboard** on desktop:
- **Today’s Focus** tile (top-left, largest).
- **Categories** tile (summary counts by tag).
- **Testimonies Wall** tile (recent answered prayers, auto-scrolling or masonry).
- Keeps the list view as a toggle or bottom section.

## 3. Time Buckets

Group prayers by time rather than only by status:
- **This week**
- **This month**
- **Older**
- **Long-standing** (e.g. 90+ days active)

Useful for both Active and Answered views. Gives users a sense of recency and persistence.

## 4. Focus Mode

Let the user pin **3–5 prayers** as "praying today" at the top of the page.
- Everything else collapses under a "Show all" fold.
- Daily reset or manual toggle. Designed to reduce overwhelm on long prayer lists.

## 5. Hero Testimony Wall

Upgrade the current "Remember When" carousel into a richer **testimony wall**:
- Masonry or grid of answered-prayer cards.
- Pulls from the full answered history, not just a 3-item rotation.
- Optional: share-to-social or copy-quote on each card.
- Could live as a separate tab or a prominent section on the answered view.

## 6. Answered-Date Editing

Right now "Answered" = the moment the user taps "Mark as Answered."
- Add a **date picker** so users can record the actual date the prayer was answered (e.g. "I received the job offer last Tuesday, but I only marked it today").
- Store `answered_at` separately from `marked_answered_at`.
- Powers more accurate testimony timelines and time-bucket grouping.

---

*Last updated: 2026-07-05*
