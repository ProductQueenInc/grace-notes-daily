---
name: gracenotes-docs-and-writing
description: Maintaining GraceNotes Daily's documents of record (CLAUDE.md, roadmap.md, skills, HANDOFF.md) and applying house style plus the GraceNotes brand voice to in-app copy and share-card text. Load before editing any doc of record, writing user-facing copy, share-card text, or commit messages. Triggers: documentation, CLAUDE.md update, changelog, house style, brand voice, copy, writing, docs of record.
---

# GraceNotes Docs and Writing

## When NOT to use this skill

- Generating actual devotional/grace-note content → the `gracenotes-voice` skill (a Claude user-level skill in Cindy's environment, NOT stored in this repo; if unavailable in your session, fall back to `BRAND.md` + the essentials below)
- Change gating → `gracenotes-change-control`

## Documents of record (and their contracts)

| Doc | Role | Update rule |
|---|---|---|
| `CLAUDE.md` | Live handover + audit hook + changelog (§11) | EVERY code change reflected before push (§9). Newest §11 entries first, dated, with PM suffixes for same-day entries |
| `roadmap.md` | Stage-gated work plan; read before writing any code | Update stage status when a gate passes; never skip-stage silently |
| `.claude/skills/*` | Verified operational knowledge | Every skill ends with Provenance + re-verification commands; label inference as inference |
| `HANDOFF.md` | Paste-in bootstrap prompt for new sessions | Keep consistent with CLAUDE.md (it explicitly defers to it). `HANDOFF 2.md` is an untracked near-duplicate — candidate for deletion, ask Cindy |
| `BRAND.md`, `TYPOGRAPHY.md`, `SIDEBAR_DESIGN_SPEC.md` | Design references | Read-only unless the owner changes brand direction |

Known failure mode: **Lovable sessions never update CLAUDE.md** (34 commits on 2026-07-05 with zero doc updates). After any Lovable burst, reconcile CLAUDE.md against `git log` before trusting it.

## Changelog entry template (CLAUDE.md §11)

```markdown
### YYYY-MM-DD (PMn) — <one-line what>

<Why: the trigger/bug/decision. What changed: files + behavior. Evidence: how it was verified.
⚠️ any owner action or redeploy still required.>
```

## House style for docs

- Runbook voice, imperative mood. Tables and checklists over prose.
- Copy-pasteable commands, verified against the repo before stating.
- **No em-dashes or en-dashes in anything user-facing or brand-carrying** (hard rule; use a spaced hyphen): AI output, in-app copy, DB content (the `verses` table was scrubbed), share-card text, marketing. Engineering docs (CLAUDE.md, skills) historically DO use em-dashes; do not "fix" them, and do not let doc habits leak into content strings.
- "GraceNotes" is ONE word; the product is "GraceNotes Daily". The deploy platform is "Lovable" (repo spelling), not "Loveable".
- Label unverified claims: `INFERENCE:`.

## Brand voice essentials for in-app + share copy

(Full guidance: the `gracenotes-voice` skill. Minimum bar below.)

- Tone: soft, held, seen, welcome - never pushy. No urgency mechanics, no guilt ("don't lose your streak" is banned by product stance).
- God-voice content: first person "I", no performative empathy ("I see you" / "I hear you"), no predictions, no lists/headers inside notes.
- Share-card and share-sheet copy: recipient-first (the share is a gift, not a referral). Examples of the register: "Share it with someone." (actual toast copy in `devotional-view.tsx`); CTA after receiving, calm: "Send this to someone who needs it today."
- No emojis in chrome or share cards. Scripture: NIV only, from the `verses` table, attribution where full text appears.
- Reader's name never appears inside devotional body text (NAME RULE); first names may appear on personal share cards (`user_first_name` field) because the user is the sender.

## Writing skills (meta)

New skills go in `.claude/skills/<name>/SKILL.md` with YAML frontmatter (`name` + trigger-rich `description`), a "When NOT to use" section pointing to siblings, one home per fact (cross-reference, don't duplicate), and a Provenance and Maintenance section with one-line re-verification commands.

## Provenance and Maintenance

Written 2026-07-05. Sources: CLAUDE.md §5/§9/§11, BRAND.md existence, `devotional-view.tsx` copy, em-dash rule enforcement in `ai.functions.ts`. Re-verify:

- §9 rule still present: `grep -n "must be reflected in CLAUDE.md" CLAUDE.md`
- Voice skill available: check available-skills list for `gracenotes-voice`
- HANDOFF duplicate still around: `ls HANDOFF*`
